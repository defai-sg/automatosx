/**
 * Chat Command - Interactive multi-turn conversation mode
 */

import type { CommandModule } from 'yargs';
import type { ExecutionContext } from '../../types/agent.js';
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
import inquirer from 'inquirer';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { printError } from '../../utils/error-formatter.js';

interface ChatOptions {
  agent: string;
  provider?: string;
  model?: string;
  memory?: boolean;
  saveSession?: boolean;
  loadSession?: string;
  verbose?: boolean;
}

interface ChatSession {
  id: string;
  agent: string;
  started: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}

export const chatCommand: CommandModule<Record<string, unknown>, ChatOptions> = {
  command: 'chat <agent>',
  describe: 'Start interactive conversation with an agent',

  builder: (yargs): any => {
    return yargs
      .positional('agent', {
        describe: 'Agent name',
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
      .option('save-session', {
        describe: 'Save conversation to file',
        type: 'boolean',
        default: false
      })
      .option('load-session', {
        describe: 'Load previous session from file',
        type: 'string'
      })
      .option('verbose', {
        alias: 'v',
        describe: 'Verbose output',
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

    console.log(chalk.blue.bold(`\n💬 AutomatosX Chat - ${argv.agent}\n`));

    let context: ExecutionContext | undefined;

    try {
      // 1. Load configuration
      const config = await loadConfig(process.cwd());
      const projectDir = process.cwd();

      // 2. Initialize components and validate agent profile FIRST
      const profileLoader = new ProfileLoader(
        join(projectDir, '.automatosx', 'agents')
      );

      // 2.1 Validate agent profile exists BEFORE checking TTY
      try {
        await profileLoader.loadProfile(argv.agent);
      } catch (error) {
        console.log(chalk.red.bold(`\n❌ Error: Agent profile not found: ${argv.agent}\n`));
        console.log(chalk.gray(`   Profile should be at: ${join(projectDir, '.automatosx', 'agents', argv.agent + '.yaml')}\n`));
        console.log(chalk.gray('   Create agent profile first or check agent name.\n'));
        process.exit(1);
      }

      // 2.2 Check for TTY - required for interactive chat
      console.log(chalk.gray('Type "exit", "quit", or press Ctrl+D to end conversation\n'));

      if (!process.stdin.isTTY) {
        console.log(chalk.yellow('\n⚠️  Chat command requires an interactive terminal (TTY)'));
        console.log(chalk.gray('   Use the "run" command for non-interactive execution:\n'));
        console.log(chalk.cyan(`   automatosx run ${argv.agent} "your message here"\n`));
        process.exit(1);
      }
      const abilitiesManager = new AbilitiesManager(
        join(projectDir, '.automatosx', 'abilities')
      );

      // Initialize memory manager
      let memoryManager;
      try {
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
          if (argv.verbose && argv.memory) {
            console.log(chalk.yellow('⚠ Memory disabled: OPENAI_API_KEY not set\n'));
          }
          argv.memory = false;
        }
      } catch (error) {
        if (argv.verbose) {
          console.log(chalk.yellow(`⚠ Memory initialization failed: ${(error as Error).message}\n`));
        }
        argv.memory = false;
      }

      const pathResolver = new PathResolver({
        projectDir,
        workingDir: process.cwd(),
        agentWorkspace: join(projectDir, '.automatosx', 'workspaces')
      });

      // 3. Initialize providers from config
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

      const router = new Router({
        providers,
        fallbackEnabled: true
      });

      // 4. Create context manager
      if (!memoryManager) {
        memoryManager = await MemoryManagerVec.create({
          dbPath: join(projectDir, '.automatosx', 'memory', 'memory.db')
        });
      }

      const contextManager = new ContextManager({
        profileLoader,
        abilitiesManager,
        memoryManager,
        router,
        pathResolver
      });

      // 5. Create session
      const session: ChatSession = {
        id: Date.now().toString(),
        agent: argv.agent,
        started: Date.now(),
        messages: []
      };

      // 6. Load previous session if requested
      if (argv.loadSession) {
        const sessionPath = join(projectDir, '.automatosx', 'sessions', argv.loadSession);
        if (existsSync(sessionPath)) {
          try {
            const loadedSession = JSON.parse(readFileSync(sessionPath, 'utf-8')) as ChatSession;
            session.messages = loadedSession.messages;
            console.log(chalk.green(`✅ Loaded session with ${session.messages.length} messages\n`));
          } catch (error) {
            console.log(chalk.yellow(`⚠ Failed to load session: ${(error as Error).message}\n`));
          }
        } else {
          console.log(chalk.yellow(`⚠ Session file not found: ${sessionPath}\n`));
        }
      }

      // 7. Setup graceful exit handlers
      let running = true;
      let cleanupInProgress = false;

      const gracefulExit = async (signal?: string) => {
        if (cleanupInProgress) return;
        cleanupInProgress = true;

        console.log(chalk.yellow(`\n\n⚠ ${signal || 'Exit'} received, cleaning up...\n`));
        running = false;

        // Cleanup resources
        if (memoryManager) {
          await memoryManager.close();
        }
        if (context) {
          await contextManager.cleanup(context);
        }

        // Save session if requested
        if (argv.saveSession && session.messages.length > 0) {
          try {
            const sessionsDir = join(projectDir, '.automatosx', 'sessions');
            await mkdir(sessionsDir, { recursive: true });
            const sessionFile = join(sessionsDir, `${session.id}.json`);
            writeFileSync(sessionFile, JSON.stringify(session, null, 2));
            console.log(chalk.green(`✅ Session saved to: ${sessionFile}\n`));
          } catch (error) {
            console.log(chalk.yellow(`⚠ Failed to save session: ${(error as Error).message}\n`));
          }
        }

        process.exit(0);
      };

      // Register signal handlers
      process.on('SIGINT', () => gracefulExit('SIGINT'));
      process.on('SIGTERM', () => gracefulExit('SIGTERM'));

      // 8. Main conversation loop
      while (running) {
        const { input } = await inquirer.prompt<{ input: string }>({
          type: 'input',
          name: 'input',
          message: chalk.green('You:'),
          validate: (value: string) => {
            if (value.trim() === '') {
              return 'Please enter a message (or type "exit" to quit)';
            }
            return true;
          }
        });

        const trimmedInput = input.trim();

        // Check for exit commands
        if (trimmedInput === 'exit' || trimmedInput === 'quit') {
          await gracefulExit('User exit');
          break;
        }

        // Add user message to session
        session.messages.push({
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now()
        });

        try {
          // Create execution context
          context = await contextManager.createContext(
            argv.agent,
            trimmedInput,
            {
              provider: argv.provider,
              model: argv.model,
              skipMemory: !argv.memory
            }
          );

          // Execute via agent executor
          const executor = new AgentExecutor();
          const result = await executor.execute(context, {
            verbose: false,
            showProgress: true
          });

          // Display response
          console.log(chalk.cyan('Agent: ') + result.response.content);
          console.log();

          // Add assistant message to session
          session.messages.push({
            role: 'assistant',
            content: result.response.content,
            timestamp: Date.now()
          });

          // Cleanup context
          await contextManager.cleanup(context);
          context = undefined;

        } catch (error) {
          printError(error, {
            verbose: argv.verbose,
            showCode: true,
            showSuggestions: true,
            colors: true
          });
        }
      }

      // 9. Final cleanup and session save
      if (!cleanupInProgress) {
        // Save session if requested
        if (argv.saveSession && session.messages.length > 0) {
          try {
            const sessionsDir = join(projectDir, '.automatosx', 'sessions');
            await mkdir(sessionsDir, { recursive: true });
            const sessionFile = join(sessionsDir, `${session.id}.json`);
            writeFileSync(sessionFile, JSON.stringify(session, null, 2));
            console.log(chalk.green(`\n✅ Session saved to: ${sessionFile}`));
          } catch (error) {
            console.log(chalk.yellow(`⚠ Failed to save session: ${(error as Error).message}`));
          }
        }

        console.log(chalk.green.bold('\n✅ Chat session ended\n'));
        console.log(chalk.gray(`Messages: ${session.messages.length}`));
        console.log(chalk.gray(`Duration: ${Math.round((Date.now() - session.started) / 1000)}s\n`));

        // Cleanup resources
        if (memoryManager) {
          await memoryManager.close();
        }
      }

    } catch (error) {
      const err = error as Error;
      const executor = new AgentExecutor();

      // Display error
      executor.displayError(err, argv.agent, { verbose: argv.verbose });

      // Log error
      logger.error('Chat session failed', {
        error: err.message,
        agent: argv.agent,
        stack: err.stack
      });

      // Cleanup if context was created
      if (context) {
        try {
          const contextManager = new ContextManager({
            profileLoader: new ProfileLoader(join(process.cwd(), '.automatosx', 'agents')),
            abilitiesManager: new AbilitiesManager(join(process.cwd(), '.automatosx', 'abilities')),
            memoryManager: await MemoryManagerVec.create({
              dbPath: join(process.cwd(), '.automatosx', 'memory', 'memory.db')
            }),
            router: new Router({ providers: [], fallbackEnabled: false }),
            pathResolver: new PathResolver({
              projectDir: process.cwd(),
              workingDir: process.cwd(),
              agentWorkspace: join(process.cwd(), '.automatosx', 'workspaces')
            })
          });
          await contextManager.cleanup(context);
        } catch {
          // Ignore cleanup errors
        }
      }

      process.exit(1);
    }
  }
};
