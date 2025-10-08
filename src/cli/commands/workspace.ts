/**
 * Workspace Command - Manage agent workspaces
 *
 * @since v4.7.0
 */

import type { CommandModule } from 'yargs';
import { WorkspaceManager } from '../../core/workspace-manager.js';
import { SessionManager } from '../../core/session-manager.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';
import Table from 'cli-table3';

interface WorkspaceListOptions {
  session?: string;
  json?: boolean;
}

interface WorkspaceStatsOptions {
  json?: boolean;
}

interface WorkspaceCleanupOptions {
  olderThan?: number;
  confirm?: boolean;
}

/**
 * Workspace List Command
 */
const listCommand: CommandModule<Record<string, unknown>, WorkspaceListOptions> = {
  command: 'list',
  describe: 'List workspace files',

  builder: (yargs) => {
    return yargs
      .option('session', {
        describe: 'Session ID to list files for',
        type: 'string'
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false
      });
  },

  handler: async (argv) => {
    try {
      const { detectProjectRoot } = await import('../../core/path-resolver.js');
      const projectDir = await detectProjectRoot(process.cwd());
      const workspaceManager = new WorkspaceManager(projectDir);

      if (argv.session) {
        const sessionManager = new SessionManager();
        const session = await sessionManager.getSession(argv.session);

        if (!session) {
          console.log(chalk.red.bold(`\n✗ Session not found: ${argv.session}\n`));
          process.exit(1);
        }

        console.log(chalk.blue.bold(`\n📁 Session Workspace Files\n`));
        console.log(chalk.gray(`Session: ${argv.session}`));
        console.log(chalk.gray(`Task: ${session.task}\n`));

        for (const agentName of session.agents) {
          const files = await workspaceManager.listSessionFiles(argv.session, agentName);

          if (files.length > 0) {
            console.log(chalk.cyan(`\n${agentName}:`));
            files.forEach(file => {
              console.log(chalk.gray(`  - ${file}`));
            });
          }
        }

        console.log();
      } else {
        const stats = await workspaceManager.getStats();

        if (argv.json) {
          console.log(JSON.stringify(stats, null, 2));
          process.exit(0);
        }

        console.log(chalk.blue.bold('\n📊 Workspace Statistics\n'));
        console.log(chalk.gray(`Session workspaces: ${chalk.white(stats.totalSessions)}`));
        console.log(chalk.gray(`Agent workspaces: ${chalk.white(stats.agentWorkspaces)}`));
        console.log();
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Failed to list workspaces\n'));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Workspace Stats Command
 */
const statsCommand: CommandModule<Record<string, unknown>, WorkspaceStatsOptions> = {
  command: 'stats',
  describe: 'Show workspace statistics',

  builder: (yargs) => {
    return yargs.option('json', {
      describe: 'Output as JSON',
      type: 'boolean',
      default: false
    });
  },

  handler: async (argv) => {
    try {
      const { detectProjectRoot } = await import('../../core/path-resolver.js');
      const projectDir = await detectProjectRoot(process.cwd());
      const workspaceManager = new WorkspaceManager(projectDir);

      const stats = await workspaceManager.getStats();

      if (argv.json) {
        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
      }

      console.log(chalk.blue.bold('\n📊 Workspace Statistics\n'));
      console.log(chalk.gray(`Session workspaces: ${chalk.white(stats.totalSessions)}`));
      console.log(chalk.gray(`Agent workspaces: ${chalk.white(stats.agentWorkspaces)}`));
      console.log(chalk.gray(`Total size: ${chalk.white((stats.totalSizeBytes / 1024 / 1024).toFixed(2))} MB`));
      console.log();

      process.exit(0);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Failed to get workspace stats\n'));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Workspace Cleanup Command
 */
const cleanupCommand: CommandModule<Record<string, unknown>, WorkspaceCleanupOptions> = {
  command: 'cleanup',
  describe: 'Clean up old session workspaces',

  builder: (yargs) => {
    return yargs
      .option('older-than', {
        describe: 'Clean up sessions older than N days',
        type: 'number',
        default: 7
      })
      .option('confirm', {
        describe: 'Skip confirmation prompt',
        type: 'boolean',
        default: false
      });
  },

  handler: async (argv) => {
    try {
      const { detectProjectRoot } = await import('../../core/path-resolver.js');
      const projectDir = await detectProjectRoot(process.cwd());
      const workspaceManager = new WorkspaceManager(projectDir);
      const sessionManager = new SessionManager();

      // Get active sessions
      const activeSessions = await sessionManager.getActiveSessions();
      const activeIds = activeSessions.map(s => s.id);

      if (!argv.confirm) {
        console.log(chalk.yellow(`\n⚠ This will remove workspace files for inactive sessions`));
        console.log(chalk.gray(`Active sessions (${activeIds.length}) will be kept\n`));
        console.log(chalk.gray('Run with --confirm to proceed\n'));
        process.exit(0);
      }

      const removed = await workspaceManager.cleanupSessions(activeIds);

      console.log(chalk.green.bold(`\n✓ Cleanup complete\n`));
      console.log(chalk.gray(`Removed ${removed} session workspace(s)\n`));

      process.exit(0);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Failed to cleanup workspaces\n'));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Main Workspace Command
 */
export const workspaceCommand: CommandModule = {
  command: 'workspace <command>',
  describe: 'Manage agent workspaces',

  builder: (yargs) => {
    return yargs
      .command(listCommand)
      .command(statsCommand)
      .command(cleanupCommand)
      .demandCommand(1, 'You must specify a workspace command')
      .help();
  },

  handler: () => {
    // Parent command handler (not used, subcommands handle everything)
  }
};
