/**
 * Config Show Command - Display configuration
 * @since v5.0.0
 */

import type { CommandModule } from 'yargs';
import chalk from 'chalk';
import type { AutomatosXConfig } from '../../../types/config.js';
import { loadConfigFile } from '../../../core/config.js';
import { printError } from '../../../utils/error-formatter.js';
import { formatKeyValue } from '../../../utils/message-formatter.js';
import { resolveConfigPath, checkExists } from './utils.js';

interface ShowOptions {
  verbose?: boolean;
}

export const showCommand: CommandModule<{}, ShowOptions> = {
  command: 'show',
  describe: 'Show current configuration',

  builder: (yargs) => {
    return yargs
      .option('verbose', {
        describe: 'Show detailed output',
        type: 'boolean',
        alias: 'v',
        default: false
      });
  },

  handler: async (argv) => {
    try {
      // Get config from global yargs context
      const configPath = resolveConfigPath((argv as any).config || (argv as any).c);

      // Check if config exists
      const exists = await checkExists(configPath);
      if (!exists) {
        console.log(chalk.yellow('⚠️  Configuration file not found'));
        console.log(chalk.gray(`   Searched at: ${configPath}`));
        console.log(chalk.gray('   Run "ax init" to create configuration\n'));
        process.exit(1);
      }

      // Load config
      const config = await loadConfigFile(configPath);

      // Display config
      displayConfig(config, configPath, argv.verbose || false);

    } catch (error) {
      printError(error, {
        verbose: argv.verbose || false,
        showCode: true,
        showSuggestions: true,
        colors: true
      });
      process.exit(1);
    }
  }
};

/**
 * Display configuration in formatted output
 */
function displayConfig(
  config: AutomatosXConfig,
  configPath: string,
  verbose: boolean
): void {
  console.log(chalk.bold.cyan('\n📋 AutomatosX Configuration\n'));
  console.log(chalk.gray(`   File: ${configPath}\n`));

  // Providers Section
  console.log(chalk.bold.white('┌─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('│ ') + chalk.bold.cyan('Providers'));
  console.log(chalk.bold.white('└─────────────────────────────────────────────────────\n'));

  const providers = Object.entries(config.providers);
  const maxNameLength = Math.max(...providers.map(([name]) => name.length));

  providers.forEach(([name, provider]) => {
    const status = provider.enabled ? chalk.green('✓ Enabled ') : chalk.gray('✗ Disabled');
    const paddedName = name.padEnd(maxNameLength + 2);
    console.log(`  ${chalk.bold(paddedName)} ${status}`);

    if (verbose) {
      console.log(chalk.gray(`  │ Priority: ${provider.priority.toString().padStart(2)} │ Timeout: ${provider.timeout}ms`));
      console.log(chalk.gray(`  │ Command:  ${provider.command}`));
      console.log(chalk.gray('  └─────────────────────────────────────────────────'));
    }
  });

  // Memory Section
  console.log(chalk.bold.white('\n┌─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('│ ') + chalk.bold.cyan('Memory'));
  console.log(chalk.bold.white('└─────────────────────────────────────────────────────\n'));

  console.log(formatKeyValue('  Max Entries    ', chalk.yellow(config.memory.maxEntries.toString())));
  console.log(formatKeyValue('  Persist Path   ', chalk.blue(config.memory.persistPath)));

  if (verbose) {
    console.log(formatKeyValue('  Auto Cleanup   ', config.memory.autoCleanup ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled')));
    console.log(formatKeyValue('  Cleanup Days   ', chalk.yellow(config.memory.cleanupDays.toString())));
  }

  // Workspace Section
  console.log(chalk.bold.white('\n┌─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('│ ') + chalk.bold.cyan('Workspace'));
  console.log(chalk.bold.white('└─────────────────────────────────────────────────────\n'));

  console.log(formatKeyValue('  Base Path      ', chalk.blue(config.workspace.basePath)));
  console.log(formatKeyValue('  Auto Cleanup   ', config.workspace.autoCleanup ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled')));

  if (verbose) {
    console.log(formatKeyValue('  Cleanup Days   ', chalk.yellow(config.workspace.cleanupDays.toString())));
    console.log(formatKeyValue('  Max Files      ', chalk.yellow(config.workspace.maxFiles.toString())));
  }

  // Logging Section
  console.log(chalk.bold.white('\n┌─────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('│ ') + chalk.bold.cyan('Logging'));
  console.log(chalk.bold.white('└─────────────────────────────────────────────────────\n'));

  const levelColor = getLevelColor(config.logging.level);
  console.log(formatKeyValue('  Level          ', levelColor(config.logging.level)));
  console.log(formatKeyValue('  Path           ', chalk.blue(config.logging.path)));

  if (verbose) {
    console.log(formatKeyValue('  Console        ', config.logging.console ? chalk.green('✓ Enabled') : chalk.gray('✗ Disabled')));
  }

  console.log();
}

/**
 * Get color for log level
 */
function getLevelColor(level: string): (text: string) => string {
  switch (level) {
    case 'debug':
      return chalk.magenta;
    case 'info':
      return chalk.cyan;
    case 'warn':
      return chalk.yellow;
    case 'error':
      return chalk.red;
    default:
      return chalk.white;
  }
}
