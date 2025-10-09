/**
 * Agent Remove Command - Remove an agent
 * @since v5.0.0
 */

import type { CommandModule } from 'yargs';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import * as readline from 'readline';

interface RemoveOptions {
  agent: string;
  confirm?: boolean;
}

export const removeCommand: CommandModule<{}, RemoveOptions> = {
  command: 'remove <agent>',
  describe: 'Remove an agent',
  aliases: ['rm', 'delete'],

  builder: (yargs) => {
    return yargs
      .positional('agent', {
        describe: 'Agent name',
        type: 'string',
        demandOption: true
      })
      .option('confirm', {
        describe: 'Skip confirmation prompt',
        type: 'boolean',
        alias: 'y'
      });
  },

  handler: async (argv) => {
    try {
      const projectDir = process.cwd();
      const agentsDir = join(projectDir, '.automatosx', 'agents');
      const agentFile = join(agentsDir, `${argv.agent}.yaml`);

      // Check if agent exists
      if (!existsSync(agentFile)) {
        console.log(chalk.red.bold(`\n✗ Agent not found: ${argv.agent}\n`));
        console.log(chalk.gray('Run "ax agent list" to see available agents.\n'));
        process.exit(1);
      }

      // Confirm deletion
      if (!argv.confirm) {
        const confirmed = await askConfirmation(
          `Are you sure you want to remove agent '${chalk.cyan(argv.agent)}'?`
        );

        if (!confirmed) {
          console.log(chalk.yellow('\nCancelled.\n'));
          process.exit(0);
        }
      }

      // Remove file
      await unlink(agentFile);

      console.log(chalk.green.bold(`\n✓ Agent '${argv.agent}' removed successfully\n`));
      console.log(chalk.gray(`Deleted: ${agentFile}\n`));

    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error removing agent\n'));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  }
};

/**
 * Ask for user confirmation
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(chalk.yellow(`\n${question} (y/N): `), answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
