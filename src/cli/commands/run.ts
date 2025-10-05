/**
 * Run Command - Execute an agent with a specific task
 */

import type { CommandModule } from 'yargs';
import { ContextManager } from '../../agents/context-manager.js';
import { ProfileLoader } from '../../agents/profile-loader.js';
import { AbilitiesManager } from '../../agents/abilities-manager.js';
import { AgentExecutor } from '../../agents/executor.js';
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
import inquirer from 'inquirer';
import boxen from 'boxen';
import type { ExecutionResult } from '../../agents/executor.js';
import { formatOutput, formatForSave } from '../../utils/output-formatter.js';
import { confirm } from '../../utils/interactive.js';

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
  interactive?: boolean;
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
        describe: 'Enable streaming output',
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
      .option('interactive', {
        alias: 'i',
        describe: 'Interactive mode (confirm before execution)',
        type: 'boolean',
        default: false
      });
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
            console.log(chalk.yellow('⚠ Memory disabled: OPENAI_API_KEY not set'));
          }
          argv.memory = false;
          argv.saveMemory = false;
        }
      } catch (error) {
        // Graceful fallback if memory initialization fails
        if (argv.verbose) {
          console.log(chalk.yellow(`⚠ Memory initialization failed: ${(error as Error).message}`));
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
      // Create dummy memory manager if not initialized
      if (!memoryManager) {
        memoryManager = await MemoryManagerVec.create({
          dbPath: join(projectDir, '.automatosx', 'memory', 'memory.db')
          // No embedding provider = search will fail with clear error
        });
      }

      const contextManager = new ContextManager({
        profileLoader,
        abilitiesManager,
        memoryManager,
        router,
        pathResolver
      });

      // 6. Interactive confirmation
      if (argv.interactive) {
        console.log(boxen(
          chalk.bold('Execution Preview\n\n') +
          `${chalk.cyan('Agent:')} ${argv.agent}\n` +
          `${chalk.cyan('Task:')} ${argv.task}\n` +
          `${chalk.cyan('Provider:')} ${argv.provider || 'auto'}\n` +
          `${chalk.cyan('Memory:')} ${argv.memory ? 'enabled' : 'disabled'}`,
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'blue'
          }
        ));

        const proceed = await confirm({
          message: 'Proceed with execution?',
          default: true
        });

        if (!proceed) {
          console.log(chalk.yellow('\n⚠ Execution cancelled by user\n'));

          // Cleanup
          if (memoryManager) await memoryManager.close();
          router.destroy();

          process.exit(0);
        }
      }

      // 7. Create execution context
      if (argv.verbose) {
        console.log(chalk.gray('Creating execution context...'));
        console.log();
      }

      const context = await contextManager.createContext(
        argv.agent as string,
        argv.task as string,
        {
          provider: argv.provider,
          model: argv.model,
          skipMemory: !argv.memory
        }
      );

      // 8. Execute with timeout handling
      const executor = new AgentExecutor();
      let result: ExecutionResult;

      if (argv.timeout) {
        const timeoutMs = argv.timeout * 1000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Execution timeout after ${argv.timeout} seconds`));
          }, timeoutMs);
        });

        result = await Promise.race([
          executor.execute(context, {
            verbose: argv.verbose,
            showProgress: !argv.verbose,
            streaming: argv.stream || false
          }),
          timeoutPromise
        ]);
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
      router.destroy();

      console.log(chalk.green.bold('✅ Complete\n'));

      // Explicitly exit process to prevent hanging
      // (Required for integration tests and clean process termination)
      process.exit(0);

    } catch (error) {
      const err = error as Error;
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
      } catch (cleanupError) {
        logger.debug('Cleanup error ignored', { error: (cleanupError as Error).message });
      }

      process.exit(1);
    }
  }
};
