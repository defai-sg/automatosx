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
import { MemoryManagerVec } from '../../core/memory-manager-vec.js';
import { Router } from '../../core/router.js';
import { PathResolver } from '../../core/path-resolver.js';
import { ClaudeProvider } from '../../providers/claude-provider.js';
import { GeminiProvider } from '../../providers/gemini-provider.js';
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
  stream?: boolean;
  format?: 'text' | 'json' | 'markdown';
  save?: string;
  timeout?: number;
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
        describe: 'Override provider (claude, gemini)',
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
      .option('stream', {
        describe: 'Enable streaming output (enabled by default, use --no-stream to disable)',
        type: 'boolean',
        default: true
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
    let memoryManager: MemoryManagerVec | undefined;
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
      const profileLoader = new ProfileLoader(
        join(projectDir, '.automatosx', 'agents')
      );
      const abilitiesManager = new AbilitiesManager(
        join(projectDir, '.automatosx', 'abilities')
      );

      // Initialize memory manager with embedding provider
      try {
        // Only initialize if API key is available
        const hasOpenAI = process.env.OPENAI_API_KEY || config.openai?.apiKey;

        if (hasOpenAI && argv.memory) {
          const { OpenAIEmbeddingProvider } = await import('../../providers/openai-embedding-provider.js');
          const embeddingProvider = new OpenAIEmbeddingProvider({
            provider: 'openai',
            apiKey: process.env.OPENAI_API_KEY || config.openai?.apiKey || '',
            model: 'text-embedding-3-small'
          });

          memoryManager = await MemoryManagerVec.create({
            dbPath: join(projectDir, '.automatosx', 'memory', 'memory.db'),
            embeddingProvider
          });
        } else {
          // Skip memory if no API key
          if (argv.verbose && argv.memory) {
            console.log(chalk.yellow('⚠ Memory features disabled: OPENAI_API_KEY not set\n'));
          }
          argv.memory = false;
          argv.saveMemory = false;
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

      router = new Router({
        providers,
        fallbackEnabled: true
      });

      // 5. Create context manager
      contextManager = new ContextManager({
        profileLoader,
        abilitiesManager,
        memoryManager: memoryManager || null,
        router,
        pathResolver
      });

      // 6. Create execution context
      if (argv.verbose) {
        console.log(chalk.gray('Creating execution context...'));
        console.log();
      }

      context = await contextManager.createContext(
        argv.agent as string,
        argv.task as string,
        {
          provider: argv.provider,
          model: argv.model,
          skipMemory: !argv.memory
        }
      );

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
        const executor = new AgentExecutor();
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
              streaming: argv.stream || false,
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
            showProgress: !argv.verbose,
            streaming: argv.stream || false
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
