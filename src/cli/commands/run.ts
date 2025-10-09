/**
 * Run Command - Execute an agent with a specific task
 */

import type { CommandModule } from 'yargs';
import { ContextManager } from '../../agents/context-manager.js';
import { ProfileLoader } from '../../agents/profile-loader.js';
import { AbilitiesManager } from '../../agents/abilities-manager.js';
import { AgentExecutor } from '../../agents/executor.js';
import { StageExecutor } from '../../agents/stage-executor.js';
import { AdvancedStageExecutor } from '../../agents/advanced-stage-executor.js';
import type { MultiStageExecutionResult } from '../../agents/stage-executor.js';
import type { Stage } from '../../types/agent.js';
import { AgentNotFoundError } from '../../types/agent.js';
import { MemoryManager } from '../../core/memory-manager.js';
import { Router } from '../../core/router.js';
import { PathResolver } from '../../core/path-resolver.js';
import { SessionManager } from '../../core/session-manager.js';
import { WorkspaceManager } from '../../core/workspace-manager.js';
import { TeamManager } from '../../core/team-manager.js';
import { ClaudeProvider } from '../../providers/claude-provider.js';
import { GeminiProvider } from '../../providers/gemini-provider.js';
import { OpenAIProvider } from '../../providers/openai-provider.js';
import { loadConfig } from '../../core/config.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import boxen from 'boxen';
import type { ExecutionResult } from '../../agents/executor.js';
import { formatOutput, formatForSave } from '../../utils/output-formatter.js';

interface RunOptions {
  provider?: string;
  model?: string;
  memory?: boolean;
  saveMemory?: boolean;
  verbose?: boolean;
  format?: 'text' | 'json' | 'markdown';
  save?: string;
  timeout?: number;
  session?: string;
}

export const runCommand: CommandModule<Record<string, unknown>, RunOptions> = {
  command: 'run <agent> <task>',
  describe: 'Run an agent with a specific task',

  builder: (yargs) => {
    return yargs
      .positional('agent', {
        describe: 'Agent name',
        type: 'string',
        demandOption: true
      })
      .positional('task', {
        describe: 'Task to execute',
        type: 'string',
        demandOption: true
      })
      .option('provider', {
        describe: 'Override provider (claude, gemini, openai)',
        type: 'string'
      })
      .option('model', {
        describe: 'Override model',
        type: 'string'
      })
      .option('memory', {
        describe: 'Inject memory',
        type: 'boolean',
        default: true
      })
      .option('save-memory', {
        describe: 'Save result to memory',
        type: 'boolean',
        default: true
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Verbose output',
        type: 'boolean',
        default: false
      })
      .option('format', {
        describe: 'Output format',
        type: 'string',
        choices: ['text', 'json', 'markdown'],
        default: 'text'
      })
      .option('save', {
        describe: 'Save result to file',
        type: 'string'
      })
      .option('timeout', {
        describe: 'Execution timeout in seconds',
        type: 'number'
      })
      .option('session', {
        describe: 'Join existing multi-agent session',
        type: 'string'
      })
  },

  handler: async (argv) => {
    // Validate inputs
    if (!argv.agent || typeof argv.agent !== 'string') {
      console.log(chalk.red.bold('\n❌ Error: Agent name is required\n'));
      process.exit(1);
    }

    if (!argv.task || typeof argv.task !== 'string') {
      console.log(chalk.red.bold('\n❌ Error: Task is required\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold(`\n🤖 AutomatosX - Running ${argv.agent}\n`));

    // Declare resources in outer scope for cleanup
    let memoryManager: MemoryManager | undefined;
    let router: Router | undefined;
    let contextManager: ContextManager | undefined;
    let context: any;

    try {
      // 1. Load configuration
      const config = await loadConfig(process.cwd());

      // 2. Detect project directory
      const projectDir = process.cwd(); // Use cwd for now

      if (argv.verbose) {
        console.log(chalk.gray(`Project: ${projectDir}`));
        console.log(chalk.gray(`Working directory: ${process.cwd()}`));
        console.log();
      }

      // 3. Initialize components
      // v4.10.0+: Initialize TeamManager for team-based configuration
      const teamManager = new TeamManager(
        join(projectDir, '.automatosx', 'teams')
      );

      const profileLoader = new ProfileLoader(
        join(projectDir, '.automatosx', 'agents'),
        undefined, // fallbackProfilesDir (uses default)
        teamManager
      );

      const abilitiesManager = new AbilitiesManager(
        join(projectDir, '.automatosx', 'abilities')
      );

      // Initialize memory manager (v4.11.0: No embedding provider required)
      try {
        if (argv.memory) {
          // v4.11.0: Memory uses FTS5, no embedding provider needed
          memoryManager = await MemoryManager.create({
            dbPath: join(projectDir, '.automatosx', 'memory', 'memory.db')
          });

          if (argv.verbose) {
            console.log(chalk.green('✓ Memory system initialized (FTS5 full-text search)\n'));
          }
        }
      } catch (error) {
        // Graceful fallback if memory initialization fails
        const errMsg = error instanceof Error ? error.message : String(error);
        if (argv.verbose) {
          console.log(chalk.yellow(`⚠ Memory features disabled: ${errMsg}\n`));
        }
        argv.memory = false;
        argv.saveMemory = false;
      }

      const pathResolver = new PathResolver({
        projectDir,
        workingDir: process.cwd(),
        agentWorkspace: join(projectDir, '.automatosx', 'workspaces')
      });

      // 4. Initialize providers from config
      const providers = [];

      if (config.providers['claude-code']?.enabled) {
        providers.push(new ClaudeProvider({
          name: 'claude',
          enabled: true,
          priority: config.providers['claude-code'].priority,
          timeout: config.providers['claude-code'].timeout,
          command: config.providers['claude-code'].command
        }));
      }

      if (config.providers['gemini-cli']?.enabled) {
        providers.push(new GeminiProvider({
          name: 'gemini',
          enabled: true,
          priority: config.providers['gemini-cli'].priority,
          timeout: config.providers['gemini-cli'].timeout,
          command: config.providers['gemini-cli'].command
        }));
      }

      if (config.providers['openai']?.enabled) {
        providers.push(new OpenAIProvider({
          name: 'codex',
          enabled: true,
          priority: config.providers['openai'].priority,
          timeout: config.providers['openai'].timeout,
          command: config.providers['openai'].command
        }));
      }

      router = new Router({
        providers,
        fallbackEnabled: true
      });

      // 5. Initialize orchestration managers
      // v4.7.8+: Always initialize for delegation support (all agents can delegate)
      let sessionManager: SessionManager | undefined;
      let workspaceManager: WorkspaceManager | undefined;

      // Initialize SessionManager
      sessionManager = new SessionManager({
        persistencePath: join(projectDir, '.automatosx', 'sessions', 'sessions.json')
      });
      await sessionManager.initialize();

      // Initialize WorkspaceManager
      workspaceManager = new WorkspaceManager(projectDir);
      await workspaceManager.initialize();

      // If session ID provided, verify and join it
      if (argv.session) {
        // Verify session exists
        const session = await sessionManager.getSession(argv.session);
        if (!session) {
          console.log(chalk.red.bold(`\n✗ Session not found: ${argv.session}\n`));
          process.exit(1);
        }

        // Add this agent to the session
        await sessionManager.addAgent(argv.session, argv.agent as string);

        if (argv.verbose) {
          console.log(chalk.cyan(`\n🔗 Joined session: ${argv.session}`));
          console.log(chalk.gray(`Session task: ${session.task}`));
          console.log(chalk.gray(`Agents in session: ${session.agents.join(', ')}\n`));
        }
      }

      // 6. Create context manager
      contextManager = new ContextManager({
        profileLoader,
        abilitiesManager,
        memoryManager: memoryManager || null,
        router,
        pathResolver,
        sessionManager,
        workspaceManager
      });

      // 7. Create execution context
      if (argv.verbose) {
        console.log(chalk.gray('Creating execution context...'));
        console.log();
      }

      try {
        context = await contextManager.createContext(
          argv.agent as string,
          argv.task as string,
          {
            provider: argv.provider,
            model: argv.model,
            skipMemory: !argv.memory,
            sessionId: argv.session
          }
        );
      } catch (error) {
        // Handle agent not found error with suggestions
        if (error instanceof AgentNotFoundError) {
          const agentName = argv.agent as string;
          console.log(chalk.red.bold(`\n❌ Agent not found: ${agentName}\n`));

          // Find similar agents (loads profiles silently from cache or disk)
          const suggestions = await profileLoader.findSimilarAgents(agentName, 3);

          if (suggestions.length > 0) {
            // Filter to only very similar agents (distance <= 3)
            const closeSuggestions = suggestions.filter(s => s.distance <= 3);

            if (closeSuggestions.length > 0) {
              console.log(chalk.yellow('💡 Did you mean:\n'));
              closeSuggestions.forEach((s, i) => {
                const displayInfo = s.displayName ? `${s.displayName} (${s.name})` : s.name;
                const roleInfo = s.role ? ` - ${s.role}` : '';
                console.log(chalk.cyan(`  ${i + 1}. ${displayInfo}${roleInfo}`));
              });

              console.log(chalk.gray('\nTo use one of these agents:'));
              console.log(chalk.gray(`  automatosx run ${closeSuggestions[0]!.name} "${argv.task}"`));
              console.log();
            } else {
              // No close matches, show all available agents
              console.log(chalk.yellow('💡 Available agents:\n'));
              const allAgents = await profileLoader.listProfiles();
              allAgents.slice(0, 10).forEach(name => {
                console.log(chalk.cyan(`  • ${name}`));
              });
              if (allAgents.length > 10) {
                console.log(chalk.gray(`  ... and ${allAgents.length - 10} more`));
              }
              console.log(chalk.gray('\nRun "automatosx list agents" to see all agents\n'));
            }
          }

          process.exit(1);
        }
        // Re-throw other errors
        throw error;
      }

      // 8. Detect if agent has multi-stage workflow
      const hasStages = context.agent.stages && context.agent.stages.length > 0;

      if (hasStages) {
        const stages = context.agent.stages;

        // Check if any stages have advanced features (dependencies, parallel, conditions)
        const hasAdvancedFeatures = stages.filter((s: Stage | undefined): s is Stage => s !== undefined).some((s: Stage) =>
          (s.dependencies && s.dependencies.length > 0) ||
          s.parallel ||
          s.condition
        );

        // Use StageExecutor for multi-stage execution
        if (argv.verbose) {
          console.log(chalk.cyan(`\n📋 Multi-stage execution detected (${context.agent.stages.length} stages)\n`));

          if (hasAdvancedFeatures) {
            console.log(chalk.cyan('✨ Advanced features enabled (dependencies/parallel/conditions)\n'));
          }
        }

        let multiStageResult: MultiStageExecutionResult;

        if (hasAdvancedFeatures) {
          // Use AdvancedStageExecutor for Phase 3 features
          const advancedExecutor = new AdvancedStageExecutor();

          // Show dependency graph if verbose
          if (argv.verbose) {
            console.log(advancedExecutor.visualizeDependencyGraph(stages));
          }

          multiStageResult = await advancedExecutor.executeAdvanced(context, {
            verbose: argv.verbose,
            showProgress: !argv.verbose,
            continueOnFailure: false,
            saveToMemory: argv.saveMemory,
            memoryManager: memoryManager || null
          });

          // Display multi-stage result
          advancedExecutor.displayResult(multiStageResult, argv.verbose || false);
        } else {
          // Use regular StageExecutor for simple multi-stage
          const stageExecutor = new StageExecutor();
          multiStageResult = await stageExecutor.executeStages(context, {
            verbose: argv.verbose,
            showProgress: !argv.verbose,
            continueOnFailure: false,
            saveToMemory: argv.saveMemory,
            memoryManager: memoryManager || null
          });

          // Display multi-stage result
          stageExecutor.displayResult(multiStageResult, argv.verbose || false);
        }

        // Save multi-stage result to file if requested
        if (argv.save) {
          try {
            const savePath = argv.save;
            const saveDir = join(savePath, '..');
            await mkdir(saveDir, { recursive: true });

            let outputData: string;
            if (argv.format === 'json') {
              outputData = JSON.stringify({
                agent: argv.agent,
                task: argv.task,
                stages: multiStageResult.stages.map(s => ({
                  name: s.stageName,
                  index: s.stageIndex,
                  success: s.success,
                  output: s.output,
                  duration: s.duration,
                  tokensUsed: s.tokensUsed,
                  model: s.model,
                  error: s.error?.message // Include error message if stage failed
                })),
                totalDuration: multiStageResult.totalDuration,
                totalTokens: multiStageResult.totalTokens,
                success: multiStageResult.success,
                failedStage: multiStageResult.failedStage,
                timestamp: new Date().toISOString()
              }, null, 2);
            } else {
              outputData = multiStageResult.finalOutput;
            }

            writeFileSync(savePath, outputData, 'utf-8');
            console.log(chalk.green(`\n✅ Result saved to: ${savePath}\n`));
          } catch (error) {
            console.log(chalk.yellow(`⚠ Failed to save result: ${(error as Error).message}\n`));
          }
        }

      } else {
        // Use regular AgentExecutor for single-stage execution
        // Configure with orchestration support if managers are available
        const executor = new AgentExecutor({
          sessionManager,
          workspaceManager,
          contextManager,
          profileLoader
        });
        let result: ExecutionResult;

        if (argv.timeout) {
          const timeoutMs = argv.timeout * 1000;
          const controller = new AbortController();

          const timeoutId = setTimeout(() => {
            controller.abort();
          }, timeoutMs);

          try {
            result = await executor.execute(context, {
              verbose: argv.verbose,
              showProgress: !argv.verbose,
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeoutId);
          }

          // Check if execution was aborted
          if (controller.signal.aborted) {
            throw new Error(`Execution timeout after ${argv.timeout} seconds`);
          }
        } else {
          result = await executor.execute(context, {
            verbose: argv.verbose,
            showProgress: !argv.verbose
          });
        }

        // 9. Format and display result
        const formattedOutput = formatOutput(result, argv.format || 'text', argv.verbose || false);
        console.log(formattedOutput);

        // 10. Save result to file
        if (argv.save) {
          try {
            const savePath = argv.save;
            const saveDir = join(savePath, '..');
            await mkdir(saveDir, { recursive: true });

            const outputData = formatForSave(result, argv.format || 'text', {
              agent: argv.agent,
              task: argv.task
            });

            writeFileSync(savePath, outputData, 'utf-8');
            console.log(chalk.green(`\n✅ Result saved to: ${savePath}\n`));
          } catch (error) {
            console.log(chalk.yellow(`⚠ Failed to save result: ${(error as Error).message}\n`));
          }
        }
      }

      // 11. Save to memory (requires embedding provider - skipped for MVP)
      if (argv.saveMemory && argv.verbose) {
        console.log(chalk.gray('⚠ Memory saving skipped (embedding provider not configured)'));
      }

      // 12. Cleanup resources
      await contextManager.cleanup(context);

      // Clean up memory manager (close database connections)
      if (memoryManager) {
        await memoryManager.close();
      }

      // Clean up router (stop health checks)
      if (router) {
        router.destroy();
      }

      // Ensure event loop completes all pending operations
      await new Promise(resolve => setImmediate(resolve));

      console.log(chalk.green.bold('✅ Complete\n'));

      // Explicitly exit process to prevent hanging
      // (Required for integration tests and clean process termination)
      process.exit(0);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const executor = new AgentExecutor();

      // Display error with helpful suggestions
      executor.displayError(err, argv.agent as string, { verbose: argv.verbose });

      // Log error
      logger.error('Agent execution failed', {
        error: err.message,
        agent: argv.agent,
        task: argv.task,
        provider: argv.provider,
        stack: err.stack
      });

      // Cleanup resources even on error
      try {
        if (memoryManager) {
          await memoryManager.close();
        }
        if (router) {
          router.destroy();
        }
        // Clean up context (workspace, temp files)
        if (contextManager && context) {
          await contextManager.cleanup(context).catch(cleanupErr => {
            const errMsg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
            logger.debug('Context cleanup error', { error: errMsg });
          });
        }
        // Ensure event loop completes all pending operations
        await new Promise(resolve => setImmediate(resolve));
      } catch (cleanupError) {
        const errMsg = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
        logger.debug('Cleanup error ignored', { error: errMsg });
      }

      process.exit(1);
    }
  }
};
