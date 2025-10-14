/**
 * Agent Executor - Orchestrates agent execution workflow
 *
 * Responsibilities:
 * - Execute agents with progress tracking
 * - Manage execution lifecycle
 * - Provide detailed error reporting
 * - Handle agent-to-agent delegation (v4.7.0+)
 */

import type { ExecutionContext } from '../types/agent.js';
import type { ExecutionResponse } from '../types/provider.js';
import type { DelegationRequest, DelegationResult } from '../types/orchestration.js';
import type { RetryConfig, AutomatosXConfig } from '../types/config.js';
import { DelegationError } from '../types/orchestration.js';
import type { SessionManager } from '../core/session-manager.js';
import type { WorkspaceManager } from '../core/workspace-manager.js';
import type { ContextManager } from './context-manager.js';
import type { ProfileLoader } from './profile-loader.js';
import { DelegationParser } from './delegation-parser.js';
import { TimeoutManager } from '../core/timeout-manager.js';
import { validateAndBuildTimeoutConfig } from '../utils/timeout-validator.js';
import { formatError } from '../utils/error-formatter.js';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import ora from 'ora';

export interface ExecutionOptions {
  verbose?: boolean;
  showProgress?: boolean;
  retry?: RetryConfig;
  timeout?: number;
  signal?: AbortSignal;
  streaming?: {
    enabled: boolean;
    onToken?: (token: string) => void;
    onProgress?: (progress: number) => void;
  };
}

export interface ExecutionResult {
  response: ExecutionResponse;
  duration: number;
  context: ExecutionContext;
}

/**
 * Agent Executor Configuration
 */
export interface AgentExecutorConfig {
  sessionManager?: SessionManager;
  workspaceManager?: WorkspaceManager;
  contextManager?: ContextManager;
  profileLoader?: ProfileLoader;
  /** Default retry configuration (v5.0+) */
  defaultRetryConfig?: RetryConfig;
  /** Configuration for timeout management (v5.4.0+) */
  config?: AutomatosXConfig;
}

/**
 * Agent Executor
 *
 * Executes agents with progress tracking and comprehensive error handling.
 * Supports agent-to-agent delegation for multi-agent workflows (v4.7.0+).
 */
export class AgentExecutor {
  private sessionManager?: SessionManager;
  private workspaceManager?: WorkspaceManager;
  private contextManager?: ContextManager;
  private profileLoader?: ProfileLoader;
  private delegationParser: DelegationParser;

  /**
   * Default retry configuration (v5.0: from config instead of hardcoded)
   */
  private readonly defaultRetryConfig: RetryConfig;

  /**
   * Timeout manager for layered timeout configuration (v5.4.0+)
   */
  private readonly timeoutManager?: TimeoutManager;

  /**
   * Configuration (v5.4.0+)
   */
  private readonly config?: AutomatosXConfig;

  /**
   * Create AgentExecutor with optional delegation support
   *
   * @param config - Optional configuration for delegation features
   */
  constructor(config?: AgentExecutorConfig) {
    this.sessionManager = config?.sessionManager;
    this.workspaceManager = config?.workspaceManager;
    this.contextManager = config?.contextManager;
    this.profileLoader = config?.profileLoader;
    this.delegationParser = new DelegationParser(config?.profileLoader);
    this.config = config?.config;

    // v5.0: Use config value instead of hardcoded constant
    this.defaultRetryConfig = config?.defaultRetryConfig ?? {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryableErrors: [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate_limit',
        'overloaded',
        'timeout'
      ]
    };

    // v5.4.0: Initialize TimeoutManager if config provided
    if (this.config?.execution) {
      try {
        const timeoutConfig = validateAndBuildTimeoutConfig(this.config.execution);
        if (Object.keys(timeoutConfig).length > 0) {
          this.timeoutManager = new TimeoutManager(timeoutConfig);
          logger.debug('TimeoutManager initialized', { timeoutConfig });
        }
      } catch (error) {
        logger.warn('Failed to initialize TimeoutManager', {
          error: (error as Error).message
        });
        // Continue without TimeoutManager (backward compatible)
      }
    }
  }

  /**
   * Execute an agent with the given context
   */
  async execute(
    context: ExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    // v5.4.0: Resolve timeout using TimeoutManager if not explicitly provided
    if (!options.timeout && this.timeoutManager) {
      try {
        const resolved = this.timeoutManager.resolve({
          agentName: context.agent.name,
          teamName: context.agent.team || 'unknown',
          runtimeTimeout: options.timeout,
        });

        // Use resolved timeout
        options = { ...options, timeout: resolved.value };

        logger.debug('Timeout resolved', {
          agent: context.agent.name,
          team: context.agent.team,
          timeout: resolved.value,
          source: resolved.source,
        });

        // Start monitoring for warnings
        this.timeoutManager.startMonitoring(resolved, {
          agentName: context.agent.name,
          taskDescription: context.task,
        });
      } catch (error) {
        logger.warn('Failed to resolve timeout', {
          error: (error as Error).message,
        });
        // Continue with default timeout
      }
    }

    // If both retry and timeout are enabled
    if (options.retry && options.timeout) {
      return this.executeWithTimeout(context, {
        ...options,
        // Wrap retry logic inside timeout
        retry: options.retry
      });
    }

    // If only retry is enabled
    if (options.retry) {
      return this.executeWithRetry(context, options);
    }

    // If only timeout is enabled
    if (options.timeout) {
      return this.executeWithTimeout(context, options);
    }

    // Otherwise, execute normally
    return this.executeInternal(context, options);
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry(
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const retryConfig = { ...this.defaultRetryConfig, ...options.retry };
    const { maxAttempts, initialDelay, maxDelay, backoffFactor, retryableErrors } = retryConfig;
    const { verbose = false } = options;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        if (verbose && attempt > 1) {
          console.log(chalk.yellow(`\nRetry attempt ${attempt}/${maxAttempts}...`));
        }

        return await this.executeInternal(context, options);
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error, retryableErrors);

        if (!isRetryable || attempt >= maxAttempts) {
          throw error;
        }

        // Calculate backoff delay
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        if (verbose) {
          console.log(chalk.yellow(`Retryable error occurred: ${error.message}`));
          console.log(chalk.gray(`Waiting ${delay}ms before retry...`));
        }

        await this.sleep(delay);
      }
    }

    // Should not reach here, but throw last error if we do
    throw lastError || new Error('Execution failed after retries');
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const timeout = options.timeout!;
    const { verbose = false } = options;

    // Create an AbortController for cancellation
    const controller = new AbortController();
    const executionOptions = {
      ...options,
      signal: controller.signal,
      timeout: undefined // Remove timeout from nested execution
    };

    const executionPromise = options.retry
      ? this.executeWithRetry(context, executionOptions)
      : this.executeInternal(context, executionOptions);

    const timeoutPromise = new Promise<ExecutionResult>((_, reject) => {
      setTimeout(() => {
        controller.abort(); // Cancel the execution
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      // Ensure abortion on error
      controller.abort();
      throw error;
    }
  }

  /**
   * Internal execution (actual implementation)
   */
  private async executeInternal(
    context: ExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const { verbose = false, showProgress = true } = options;

    // Display execution info
    if (verbose) {
      this.displayExecutionInfo(context);
    }

    // Create progress spinner
    const spinner = showProgress
      ? ora({
          text: 'Executing agent...',
          spinner: 'dots'
        }).start()
      : null;

    try {
      // Build prompt
      const prompt = this.buildPrompt(context);

      // Update spinner
      if (spinner) {
        spinner.text = `Executing with ${context.provider.name}...`;
      }

      // Execute via provider (with streaming support)
      const startTime = Date.now();

      const request = {
        prompt,
        systemPrompt: context.agent.systemPrompt,
        model: context.agent.model,
        temperature: context.agent.temperature,
        maxTokens: context.agent.maxTokens,
        signal: options.signal  // v5.0.7: Pass abort signal for cancellation
      };

      let response;

      // Use streaming if enabled
      if (options.streaming?.enabled && context.provider.executeStreaming) {
        // Try streaming execution (works for both native and synthetic)
        response = await context.provider.executeStreaming(request, {
          enabled: true,
          onToken: options.streaming.onToken,
          onProgress: options.streaming.onProgress
        });
      } else {
        // Regular execution (streaming not enabled or not available)
        response = await context.provider.execute(request);
      }

      const duration = Date.now() - startTime;

      // Check for delegation requests in response (v4.7.2+)
      if (context.orchestration) {
        const delegations = await this.delegationParser.parse(response.content, context.agent.name);

        if (delegations.length > 0) {
          if (verbose) {
            console.log(chalk.cyan(`\n🔗 Found ${delegations.length} delegation request(s)`));
          }

          // Update spinner
          if (spinner) {
            spinner.text = 'Processing delegations...';
          }

          // Execute all delegations
          const delegationResults = await this.executeDelegations(delegations, context, options);

          // Append delegation results to response
          let delegationSummary = '\n\n---\n\n## Delegation Results\n\n';
          delegationResults.forEach((result, index) => {
            delegationSummary += `### Delegation ${index + 1}: ${result.toAgent}\n\n`;
            delegationSummary += result.response.content + '\n\n';
          });

          // Modify response to include delegation results
          response.content += delegationSummary;

          if (verbose) {
            console.log(chalk.green(`✅ All delegations completed`));
          }
        }
      }

      // Stop spinner
      if (spinner) {
        spinner.succeed('Execution complete');
      }

      return {
        response,
        duration,
        context
      };

    } catch (error) {
      // Stop spinner with failure
      if (spinner) {
        spinner.fail('Execution failed');
      }

      throw this.enhanceError(error as Error, context);
    }
  }


  /**
   * Execute delegation requests parsed from agent response
   *
   * This is called automatically when an agent's response contains
   * delegation instructions (e.g., "DELEGATE TO frontend: Create UI")
   */
  private async executeDelegations(
    delegations: Array<{ toAgent: string; task: string }>,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<DelegationResult[]> {
    const results: DelegationResult[] = [];
    const { verbose = false } = options;

    for (const { toAgent, task } of delegations) {
      if (verbose) {
        console.log(chalk.cyan(`\n📤 Delegating to ${toAgent}...`));
        console.log(chalk.gray(`   Task: ${task.substring(0, 100)}${task.length > 100 ? '...' : ''}`));
      }

      try {
        const request: DelegationRequest = {
          fromAgent: context.agent.name,
          toAgent,
          task,
          context: {
            sessionId: context.session?.id,
            delegationChain: context.orchestration?.delegationChain || []
          }
        };

        const result = await this.delegateToAgent(request);
        results.push(result);

        if (verbose) {
          console.log(chalk.green(`✅ Delegation to ${toAgent} completed`));
        }
      } catch (error) {
        const err = error as Error;
        logger.error('Delegation failed', {
          fromAgent: context.agent.name,
          toAgent,
          error: err.message
        });

        if (verbose) {
          console.log(chalk.red(`❌ Delegation to ${toAgent} failed: ${err.message}`));
        }

        // Store error as failed delegation result
        results.push({
          delegationId: randomUUID(),
          fromAgent: context.agent.name,
          toAgent,
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          status: 'failure',
          response: {
            content: `Delegation failed: ${err.message}`,
            model: 'error',
            tokensUsed: { prompt: 0, completion: 0, total: 0 },
            latencyMs: 0,
            finishReason: 'error'
          },
          outputs: {
            files: [],
            memoryIds: [],
            workspacePath: ''
          }
        } as DelegationResult);
      }
    }

    return results;
  }

  /**
   * Display execution information
   */
  private displayExecutionInfo(context: ExecutionContext): void {
    console.log(chalk.gray('Execution Details:'));
    console.log(chalk.gray(`  Agent: ${context.agent.name}`));
    console.log(chalk.gray(`  Provider: ${context.provider.name}`));
    console.log(chalk.gray(`  Model: ${context.agent.model || 'default'}`));
    console.log(chalk.gray(`  Abilities: ${context.agent.abilities.length}`));
    console.log(chalk.gray(`  Memory entries: ${context.memory.length}`));
    console.log();
  }

  /**
   * Build prompt from execution context
   */
  private buildPrompt(context: ExecutionContext): string {
    let prompt = '';

    // Add abilities
    if (context.abilities) {
      prompt += `# Your Abilities\n\n${context.abilities}\n\n`;
    }

    // Add stages workflow (v4.1+ enhanced profiles)
    if (context.agent.stages && context.agent.stages.length > 0) {
      prompt += `# Your Workflow Stages\n\n`;
      prompt += `You MUST follow these stages explicitly for every task:\n\n`;

      context.agent.stages.forEach((stage, i) => {
        prompt += `## Stage ${i + 1}: ${stage.name}\n\n`;
        prompt += `${stage.description}\n\n`;

        if (stage.key_questions && stage.key_questions.length > 0) {
          prompt += `**Key Questions:**\n`;
          stage.key_questions.forEach(q => {
            prompt += `- ${q}\n`;
          });
          prompt += `\n`;
        }

        if (stage.outputs && stage.outputs.length > 0) {
          prompt += `**Expected Outputs:**\n`;
          stage.outputs.forEach(o => {
            prompt += `- ${o}\n`;
          });
          prompt += `\n`;
        }
      });

      prompt += `**Important:** Announce each stage as you work through it (e.g., "## Stage 1: requirement_analysis").\n\n`;
    }

    // Add memory (relevant context)
    if (context.memory.length > 0) {
      prompt += `# Relevant Context from Memory\n\n`;
      context.memory.forEach((entry, i) => {
        const score = entry.score !== undefined ? ` (relevance: ${(entry.score * 100).toFixed(1)}%)` : '';
        prompt += `## Memory ${i + 1}${score}\n${entry.content}\n\n`;
      });
    }

    // Add orchestration capabilities (v4.7.0+, Enhanced v4.11.0+)
    if (context.orchestration) {
      prompt += `# Multi-Agent Orchestration Capabilities\n\n`;
      prompt += `**IMPORTANT - Task Evaluation Strategy:**\n`;
      prompt += `1. **First, evaluate if YOU can complete the task** using your abilities and expertise\n`;
      prompt += `2. **If you CAN do it**, complete the task yourself without delegation\n`;
      prompt += `3. **If you CANNOT do it** (lacks expertise, tools, or authority), then delegate to a specialized agent\n`;
      prompt += `4. **Max delegation depth: ${context.orchestration.maxDelegationDepth} levels** - use delegation wisely\n\n`;
      prompt += `Only delegate when the task genuinely requires specialized expertise you don't have.\n\n`;

      // Limit agent list to avoid overly long prompts
      const MAX_AGENTS_TO_SHOW = 10;
      const availableAgents = context.orchestration.availableAgents;

      if (availableAgents.length > 0) {
        prompt += `**Available agents for delegation:**\n`;

        const agentsToShow = availableAgents.slice(0, MAX_AGENTS_TO_SHOW);
        agentsToShow.forEach(agent => {
          prompt += `- ${agent}\n`;
        });

        if (availableAgents.length > MAX_AGENTS_TO_SHOW) {
          const remaining = availableAgents.length - MAX_AGENTS_TO_SHOW;
          prompt += `... and ${remaining} more agents\n`;
          prompt += `\nNote: You can delegate to ANY agent by name, not just those listed above.\n`;
        }
        prompt += `\n`;
      }

      if (context.session) {
        prompt += `**Current session:** ${context.session.id}\n`;
        prompt += `**Session task:** ${context.session.task}\n`;
        prompt += `**Collaborating agents:** ${context.session.agents.join(', ')}\n\n`;
      }

      prompt += `**Shared workspace:** ${context.orchestration.sharedWorkspace}\n\n`;

      if (context.orchestration.delegationChain.length > 0) {
        prompt += `**Delegation chain:** ${context.orchestration.delegationChain.join(' → ')} → YOU\n`;
        prompt += `**Current depth:** ${context.orchestration.delegationChain.length}/${context.orchestration.maxDelegationDepth}\n\n`;
      }

      prompt += `**How to delegate:**\n`;
      prompt += `You can delegate using any of these natural syntaxes:\n`;
      prompt += `1. "DELEGATE TO frontend: Create login UI"\n`;
      prompt += `2. "@frontend Create login UI"\n`;
      prompt += `3. "Please ask backend to implement auth API"\n`;
      prompt += `4. "I need frontend to handle the UI"\n`;
      prompt += `5. "請 frontend 建立登入 UI" (Chinese support)\n\n`;
      prompt += `Example: "@frontend Create a responsive login UI with email and password fields"\n\n`;
    }

    // Add task
    prompt += `# Task\n\n${context.task}`;

    return prompt;
  }

  /**
   * Enhance error with context-specific details
   */
  private enhanceError(error: Error, context: ExecutionContext): Error {
    const enhanced = new Error(error.message);
    enhanced.stack = error.stack;

    // Add context to error
    (enhanced as any).context = {
      agent: context.agent.name,
      provider: context.provider.name,
      model: context.agent.model,
      task: context.task.substring(0, 100) + (context.task.length > 100 ? '...' : '')
    };

    return enhanced;
  }

  /**
   * Display execution result
   */
  displayResult(result: ExecutionResult, options: ExecutionOptions = {}): void {
    const { verbose = false } = options;

    // Display response
    console.log(chalk.cyan('Response:'));
    console.log(result.response.content);
    console.log();

    // Display metrics if verbose
    if (verbose) {
      console.log(chalk.gray('Execution Metrics:'));
      console.log(chalk.gray(`  Duration: ${result.duration}ms`));
      console.log(chalk.gray(`  Tokens used: ${result.response.tokensUsed.total}`));
      console.log(chalk.gray(`    Prompt: ${result.response.tokensUsed.prompt}`));
      console.log(chalk.gray(`    Completion: ${result.response.tokensUsed.completion}`));
      console.log();
    }
  }

  /**
   * Display execution error with helpful suggestions
   */
  displayError(error: Error, agentName: string, options: ExecutionOptions = {}): void {
    const { verbose = false } = options;

    // Use structured error formatter
    console.error(formatError(error, {
      verbose,
      showCode: true,
      showSuggestions: true,
      colors: true
    }));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any, retryableErrors?: string[]): boolean {
    const patterns = retryableErrors || this.defaultRetryConfig.retryableErrors!;

    const errorString = (error.message || error.code || '').toLowerCase();

    return patterns.some(pattern =>
      errorString.includes(pattern.toLowerCase())
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Delegate a task to another agent
   *
   * This method enables agent-to-agent delegation with proper permission checks,
   * cycle detection, and session management.
   *
   * @param request - Delegation request
   * @returns Delegation result with structured outputs
   * @throws {DelegationError} If delegation fails
   *
   * @example
   * ```typescript
   * const result = await executor.delegateToAgent({
   *   fromAgent: 'backend',
   *   toAgent: 'frontend',
   *   task: 'Create login UI component',
   *   context: {
   *     sessionId: 'auth-feature-123',
   *     requirements: ['Email/password fields'],
   *     delegationChain: ['backend']
   *   }
   * });
   *
   * console.log('Files created:', result.outputs.files);
   * ```
   */
  async delegateToAgent(request: DelegationRequest): Promise<DelegationResult> {
    // Verify minimum required components for delegation
    // Note: SessionManager and WorkspaceManager are optional (for text-only delegation)
    if (!this.contextManager || !this.profileLoader) {
      throw new DelegationError(
        'Delegation not configured - missing required managers (contextManager, profileLoader)',
        request.fromAgent,
        request.toAgent,
        'execution_failed'
      );
    }

    const delegationId = randomUUID();
    const startTime = new Date();

    logger.info('Delegation started', {
      delegationId,
      fromAgent: request.fromAgent,
      toAgent: request.toAgent,
      task: request.task.substring(0, 100)
    });

    try {
      // 1. Load agent profiles
      const fromAgentProfile = await this.profileLoader.loadProfile(request.fromAgent);
      const toAgentProfile = await this.profileLoader.loadProfile(request.toAgent);

      // 2. v4.7.8+: All agents can delegate by default
      // Permission check removed - autonomous agent collaboration enabled
      // Safety ensured by:
      // - Cycle detection (below)
      // - Max depth limit (below)
      // - Timeout enforcement

      // 3. Cycle detection: check delegation chain
      const delegationChain = request.context?.delegationChain || [];
      if (delegationChain.includes(request.toAgent)) {
        throw new DelegationError(
          `Delegation cycle detected: ${[...delegationChain, request.toAgent].join(' -> ')}`,
          request.fromAgent,
          request.toAgent,
          'cycle'
        );
      }

      // 4. Max depth check
      // delegationChain contains agents that have already delegated
      // If chain = ['A', 'B'], this means A→B has happened, and B is now delegating (3rd delegation)
      // maxDepth = 2 allows up to 2 delegations: A→B (1st), B→C (2nd)
      // So we reject when delegationChain.length >= maxDepth (3rd delegation attempt)
      // v4.11.0+: Default to 2 (agents evaluate capability first, delegate only when needed)
      // v5.3.4: Check initiator's depth, not current agent's depth
      //         This allows coordinators (CTO, DevOps) to orchestrate deeper delegation chains
      const initiatorName = delegationChain.length > 0 ? (delegationChain[0] ?? request.fromAgent) : request.fromAgent;
      const initiatorProfile = await this.profileLoader.loadProfile(initiatorName);
      const maxDepth = initiatorProfile.orchestration?.maxDelegationDepth ?? 2;
      if (delegationChain.length >= maxDepth) {
        throw new DelegationError(
          `Max delegation depth (${maxDepth}) exceeded. Chain: ${delegationChain.join(' -> ')} (length ${delegationChain.length})`,
          request.fromAgent,
          request.toAgent,
          'max_depth'
        );
      }

      // 5. Session management (optional - only if SessionManager is available)
      let sessionId = request.context?.sessionId;
      let session;

      if (this.sessionManager && this.workspaceManager) {
        // Session/Workspace managers available - use full collaboration features
        if (sessionId) {
          // Join existing session
          session = await this.sessionManager.getSession(sessionId);
          if (!session) {
            throw new DelegationError(
              `Session not found: ${sessionId}`,
              request.fromAgent,
              request.toAgent,
              'execution_failed'
            );
          }

          // Validate session is active
          if (session.status !== 'active') {
            throw new DelegationError(
              `Cannot delegate to ${session.status} session: ${sessionId}`,
              request.fromAgent,
              request.toAgent,
              'execution_failed'
            );
          }

          // Add toAgent to session
          await this.sessionManager.addAgent(sessionId, request.toAgent);
        } else {
          // Create new session
          session = await this.sessionManager.createSession(request.task, request.fromAgent);
          sessionId = session.id;

          // Add toAgent to session
          await this.sessionManager.addAgent(sessionId, request.toAgent);

          // v5.2: Session workspace no longer created
          // WorkspaceManager now manages automatosx/PRD and automatosx/tmp instead
        }
      } else {
        // Simple text-only delegation mode (no persistent session/workspace)
        logger.debug('Text-only delegation mode (no SessionManager/WorkspaceManager)', {
          fromAgent: request.fromAgent,
          toAgent: request.toAgent
        });
        sessionId = undefined;
      }

      // 6. Create execution context for delegated agent
      const context = await this.contextManager.createContext(
        request.toAgent,
        request.task,
        {
          sessionId,
          delegationChain: [...delegationChain, request.fromAgent],
          sharedData: request.context?.sharedData
        }
      );

      // 7. Execute delegated agent
      const executionResult = await this.execute(context, {
        timeout: request.options?.timeout,
        verbose: false,
        showProgress: true
      });

      // v5.2: Session workspace outputs collection removed
      // WorkspaceManager now uses automatosx/PRD and automatosx/tmp
      // Files are managed directly by agents, not through session workspaces
      const files: string[] = [];

      // 9. Memory IDs collection
      // NOTE: Reserved for future enhancement - automatic memory saving from delegation results
      // Currently returns empty array as memory saving is handled separately via MemoryManager
      const memoryIds: number[] = [];

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      logger.info('Delegation completed', {
        delegationId,
        fromAgent: request.fromAgent,
        toAgent: request.toAgent,
        duration: `${(duration / 1000).toFixed(1)}s`,
        filesCreated: files.length
      });

      // 10. Return structured result
      return {
        delegationId,
        fromAgent: request.fromAgent,
        toAgent: request.toAgent,
        status: 'success',
        response: executionResult.response,
        duration,
        outputs: {
          files,
          memoryIds,
          workspacePath: `sessions/${sessionId}/outputs/${request.toAgent}`
        },
        startTime,
        endTime
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // If it's already a DelegationError, re-throw it
      if (error instanceof DelegationError) {
        logger.error('Delegation failed', {
          delegationId,
          fromAgent: request.fromAgent,
          toAgent: request.toAgent,
          reason: error.reason,
          error: error.message
        });
        throw error;
      }

      // Otherwise, wrap it in a DelegationError
      const delegationError = new DelegationError(
        `Delegation execution failed: ${(error as Error).message}`,
        request.fromAgent,
        request.toAgent,
        'execution_failed'
      );

      logger.error('Delegation failed', {
        delegationId,
        fromAgent: request.fromAgent,
        toAgent: request.toAgent,
        error: (error as Error).message
      });

      throw delegationError;
    }
  }
}
