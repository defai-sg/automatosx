/**
 * Update Command - Check for updates and upgrade AutomatosX
 */

import type { CommandModule } from 'yargs';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';
import { printError } from '../../utils/error-formatter.js';

const execAsync = promisify(exec);

interface UpdateOptions {
  check?: boolean;
  yes?: boolean;
}

export const updateCommand: CommandModule<Record<string, unknown>, UpdateOptions> = {
  command: 'update',
  describe: 'Check for updates and upgrade AutomatosX to the latest version',

  builder: (yargs) => {
    return yargs
      .option('check', {
        describe: 'Only check for updates without installing',
        type: 'boolean',
        default: false
      })
      .option('yes', {
        alias: 'y',
        describe: 'Skip confirmation prompt',
        type: 'boolean',
        default: false
      })
      .example('automatosx update', 'Check and install latest version')
      .example('automatosx update --check', 'Only check for updates')
      .example('automatosx update --yes', 'Update without confirmation');
  },

  handler: async (argv) => {
    console.log(chalk.blue.bold('\n🔄 AutomatosX Update Checker\n'));

    try {
      // Get current version
      const currentVersion = await getCurrentVersion();
      console.log(chalk.gray(`Current version: ${currentVersion}`));

      // Check for latest version
      console.log(chalk.cyan('Checking for updates...'));
      const latestVersion = await getLatestVersion();
      console.log(chalk.gray(`Latest version:  ${latestVersion}\n`));

      // Compare versions
      if (currentVersion === latestVersion) {
        console.log(chalk.green('✅ You are already running the latest version!\n'));
        return;
      }

      if (isNewer(latestVersion, currentVersion)) {
        console.log(chalk.yellow(`📦 New version available: ${currentVersion} → ${latestVersion}\n`));

        // Show changelog
        await showChangelog(currentVersion, latestVersion);

        // If only checking, exit here
        if (argv.check) {
          console.log(chalk.gray('\nTo install the update, run:'));
          console.log(chalk.cyan(`  npm install -g @defai.sg/automatosx@${latestVersion}\n`));
          return;
        }

        // Confirm update
        if (!argv.yes) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(chalk.yellow('Would you like to update now? (y/N) '), resolve);
          });
          rl.close();

          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log(chalk.gray('\nUpdate cancelled.\n'));
            return;
          }
        }

        // Perform update
        console.log(chalk.cyan('\n📥 Installing update...\n'));
        await installUpdate(latestVersion);

        console.log(chalk.green.bold('\n✅ AutomatosX updated successfully!\n'));
        console.log(chalk.gray('New version:'), chalk.cyan(latestVersion));
        console.log(chalk.gray('\nRun'), chalk.cyan('automatosx --version'), chalk.gray('to verify.\n'));

        logger.info('AutomatosX updated', { from: currentVersion, to: latestVersion });

      } else {
        console.log(chalk.yellow(`⚠️  Your version (${currentVersion}) is newer than the published version (${latestVersion})\n`));
        console.log(chalk.gray('This might happen if you are running a development version.\n'));
      }

    } catch (error) {
      printError(error, {
        verbose: false,
        showCode: true,
        showSuggestions: true,
        colors: true
      });
      logger.error('Update check failed', { error: (error as Error).message });
      process.exit(1);
    }
  }
};

/**
 * Get current installed version
 */
async function getCurrentVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync('npm list -g @defai.sg/automatosx --depth=0 --json');
    const result = JSON.parse(stdout);
    return result.dependencies['@defai.sg/automatosx']?.version || 'unknown';
  } catch (error) {
    // Fallback to package.json
    const { readFile } = await import('fs/promises');
    const { dirname, join } = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = join(__dirname, '../../../package.json');

    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  }
}

/**
 * Get latest version from npm registry
 */
async function getLatestVersion(): Promise<string> {
  const { stdout } = await execAsync('npm view @defai.sg/automatosx version');
  return stdout.trim();
}

/**
 * Check if version a is newer than version b
 */
function isNewer(a: string, b: string): boolean {
  const parseVersion = (v: string) => v.split('.').map(Number);
  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor > bMajor;
  if (aMinor !== bMinor) return aMinor > bMinor;
  return aPatch > bPatch;
}

/**
 * Show changelog between versions
 */
async function showChangelog(from: string, to: string): Promise<void> {
  try {
    console.log(chalk.cyan('What\'s new:\n'));

    // Fetch changelog from GitHub
    const { stdout } = await execAsync(
      `curl -s https://api.github.com/repos/defai-sg/automatosx/releases/tags/v${to}`
    );

    const release = JSON.parse(stdout);

    if (release.body) {
      // Parse and display first few lines of changelog
      const lines = release.body.split('\n').slice(0, 10);
      lines.forEach((line: string) => {
        if (line.startsWith('#')) {
          console.log(chalk.bold(line));
        } else if (line.trim()) {
          console.log(chalk.gray(line));
        }
      });
      console.log(chalk.gray('\n...'));
      console.log(chalk.gray(`Full changelog: https://github.com/defai-sg/automatosx/releases/tag/v${to}`));
    }
  } catch (error) {
    // If changelog fetch fails, continue silently
    logger.debug('Could not fetch changelog', { error: (error as Error).message });
  }
}

/**
 * Install update using npm
 */
async function installUpdate(version: string): Promise<void> {
  try {
    const { stdout, stderr } = await execAsync(
      `npm install -g @defai.sg/automatosx@${version}`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    if (stderr && !stderr.includes('npm warn')) {
      logger.warn('Update installation warnings', { stderr });
    }

    logger.debug('Update installation output', { stdout });
  } catch (error) {
    throw new Error(`Failed to install update: ${(error as Error).message}`);
  }
}
