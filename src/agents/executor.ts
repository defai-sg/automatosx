/**
 * Agent Executor - Orchestrates agent execution workflow
 *
 * Responsibilities:
 * - Execute agents with progress tracking
 * - Handle streaming responses
 * - Manage execution lifecycle
 * - Provide detailed error reporting
 */

import type { ExecutionContext } from '../types/agent.js';
import type { ExecutionResponse } from '../types/provider.js';
import { formatError } from '../utils/error-formatter.js';
import chalk from 'chalk';
import ora from 'ora';

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export interface ExecutionOptions {
  verbose?: boolean;
  showProgress?: boolean;
  streaming?: boolean;
  retry?: RetryConfig;
  timeout?: number;
}

export interface ExecutionResult {
  response: ExecutionResponse;
  duration: number;
  context: ExecutionContext;
}

/**
 * Agent Executor
 *
 * Executes agents with progress tracking, streaming output, and comprehensive error handling.
 */
export class AgentExecutor {
  /**
   * Default retry configuration
   */
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
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

  /**
   * Execute an agent with the given context
   */
  async execute(
    context: ExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
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
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...options.retry };
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

    const executionPromise = options.retry
      ? this.executeWithRetry(context, { ...options, timeout: undefined }) // Remove timeout from retry
      : this.executeInternal(context, options);

    return Promise.race([
      executionPromise,
      new Promise<ExecutionResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Internal execution (actual implementation)
   */
  private async executeInternal(
    context: ExecutionContext,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const { verbose = false, showProgress = true, streaming = false } = options;

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

      // Execute via provider
      const startTime = Date.now();
      let response;

      if (streaming) {
        // Stop spinner before streaming
        if (spinner) {
          spinner.stop();
        }

        // Stream output
        console.log(chalk.cyan('\n📝 Streaming response:\n'));

        let fullContent = '';
        const streamGenerator = context.provider.stream({
          prompt,
          systemPrompt: context.agent.systemPrompt,
          model: context.agent.model,
          temperature: context.agent.temperature,
          maxTokens: context.agent.maxTokens
        });

        for await (const chunk of streamGenerator) {
          process.stdout.write(chunk);
          fullContent += chunk;
        }

        console.log('\n'); // New line after streaming

        const duration = Date.now() - startTime;

        // Build response object from streamed content
        response = {
          content: fullContent,
          tokensUsed: {
            prompt: 0,
            completion: 0,
            total: 0
          }, // Streaming doesn't provide token count immediately
          latencyMs: duration,
          model: context.agent.model || 'unknown',
          finishReason: 'stop' as const
        };

        return {
          response,
          duration,
          context
        };
      } else {
        // Normal execution
        response = await context.provider.execute({
          prompt,
          systemPrompt: context.agent.systemPrompt,
          model: context.agent.model,
          temperature: context.agent.temperature,
          maxTokens: context.agent.maxTokens
        });
        const duration = Date.now() - startTime;

        // Stop spinner
        if (spinner) {
          spinner.succeed('Execution complete');
        }

        return {
          response,
          duration,
          context
        };
      }

    } catch (error) {
      // Stop spinner with failure
      if (spinner) {
        spinner.fail('Execution failed');
      }

      throw this.enhanceError(error as Error, context);
    }
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

    // Add memory (relevant context)
    if (context.memory.length > 0) {
      prompt += `# Relevant Context from Memory\n\n`;
      context.memory.forEach((entry, i) => {
        const score = entry.score !== undefined ? ` (relevance: ${(entry.score * 100).toFixed(1)}%)` : '';
        prompt += `## Memory ${i + 1}${score}\n${entry.content}\n\n`;
      });
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
    const patterns = retryableErrors || this.DEFAULT_RETRY_CONFIG.retryableErrors!;

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
}
