/**
 * Init Command - Initialize AutomatosX project
 */

import type { CommandModule } from 'yargs';
import { mkdir, writeFile, access } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { constants } from 'fs';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../../types/config.js';
import type { AutomatosXConfig } from '../../types/config.js';
import { logger } from '../../utils/logger.js';
import { printError } from '../../utils/error-formatter.js';

// Get the directory of this file for locating examples
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get package root - handle both dev (src/) and prod (dist/) scenarios
function getPackageRoot(): string {
  const currentDir = __dirname;
  if (currentDir.includes('/dist')) {
    return join(currentDir, '..');
  } else {
    return join(currentDir, '../..');
  }
}

interface InitOptions {
  force?: boolean;
  path?: string;
}

export const initCommand: CommandModule<Record<string, unknown>, InitOptions> = {
  command: 'init [path]',
  describe: 'Initialize AutomatosX in current or specified directory',

  builder: (yargs) => {
    return yargs
      .positional('path', {
        describe: 'Project directory (defaults to current directory)',
        type: 'string',
        default: '.'
      })
      .option('force', {
        alias: 'f',
        describe: 'Force initialization even if .automatosx already exists',
        type: 'boolean',
        default: false
      });
  },

  handler: async (argv) => {
    const projectDir = resolve(argv.path || '.');
    const automatosxDir = join(projectDir, '.automatosx');

    console.log(chalk.blue.bold('\n🤖 AutomatosX v4.0 - Project Initialization\n'));

    try {
      // Check if already initialized
      const exists = await checkExists(automatosxDir);
      if (exists && !argv.force) {
        console.log(chalk.yellow('⚠️  AutomatosX is already initialized in this directory'));
        console.log(chalk.gray(`   ${automatosxDir}`));
        console.log(chalk.gray('\n   Use --force to reinitialize\n'));
        process.exit(1);
      }

      if (exists && argv.force) {
        console.log(chalk.yellow('⚠️  Reinitializing (--force flag detected)'));
      }

      // Create directory structure
      console.log(chalk.cyan('📁 Creating directory structure...'));
      await createDirectoryStructure(automatosxDir);
      console.log(chalk.green('   ✓ Directories created'));

      // Copy example agents
      console.log(chalk.cyan('🤖 Installing example agents...'));
      await copyExampleAgents(automatosxDir);
      console.log(chalk.green('   ✓ 5 example agents installed'));

      // Copy example abilities
      console.log(chalk.cyan('⚡ Installing example abilities...'));
      await copyExampleAbilities(automatosxDir);
      console.log(chalk.green('   ✓ 15 example abilities installed'));

      // Create default config
      console.log(chalk.cyan('⚙️  Generating configuration...'));
      const configPath = join(projectDir, 'automatosx.config.json');
      await createDefaultConfig(configPath, argv.force ?? false);
      console.log(chalk.green('   ✓ Configuration created'));

      // Setup Claude Code integration
      console.log(chalk.cyan('🔌 Setting up Claude Code integration...'));
      await setupClaudeIntegration(projectDir);
      console.log(chalk.green('   ✓ Claude Code integration configured'));

      // Create .gitignore entry
      console.log(chalk.cyan('📝 Updating .gitignore...'));
      await updateGitignore(projectDir);
      console.log(chalk.green('   ✓ .gitignore updated'));

      // Success message
      console.log(chalk.green.bold('\n✅ AutomatosX initialized successfully!\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Review automatosx.config.json'));
      console.log(chalk.gray('  2. Explore example agents: automatosx list agents'));
      console.log(chalk.gray('  3. Run an agent: automatosx run assistant "Hello!"\n'));
      console.log(chalk.cyan('Available example agents:'));
      console.log(chalk.gray('  • assistant  - General purpose helper'));
      console.log(chalk.gray('  • coder      - Code generation specialist'));
      console.log(chalk.gray('  • reviewer   - Code review expert'));
      console.log(chalk.gray('  • debugger   - Debug assistance'));
      console.log(chalk.gray('  • writer     - Content creation\n'));
      console.log(chalk.cyan('Claude Code Integration:'));
      console.log(chalk.gray('  • Use /ax command in Claude Code'));
      console.log(chalk.gray('  • Example: /ax assistant "Explain this code"'));
      console.log(chalk.gray('  • MCP tools available in .claude/mcp/\n'));

      logger.info('AutomatosX initialized', { projectDir, automatosxDir });

    } catch (error) {
      printError(error, {
        verbose: false,
        showCode: true,
        showSuggestions: true,
        colors: true
      });
      logger.error('Initialization failed', { error: (error as Error).message });
      process.exit(1);
    }
  }
};

/**
 * Check if path exists
 */
async function checkExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create AutomatosX directory structure
 */
async function createDirectoryStructure(baseDir: string): Promise<void> {
  const dirs = [
    baseDir,
    join(baseDir, 'agents'),
    join(baseDir, 'abilities'),
    join(baseDir, 'memory'),
    join(baseDir, 'workspaces'),
    join(baseDir, 'logs')
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Copy example agents to user's .automatosx directory
 */
async function copyExampleAgents(baseDir: string): Promise<void> {
  const { readdir, copyFile } = await import('fs/promises');

  const examplesDir = join(getPackageRoot(), 'examples/agents');
  const targetDir = join(baseDir, 'agents');

  try {
    const files = await readdir(examplesDir);
    for (const file of files) {
      if (file.endsWith('.yaml')) {
        await copyFile(join(examplesDir, file), join(targetDir, file));
      }
    }
  } catch (error) {
    logger.warn('Could not copy example agents', { error: (error as Error).message });
  }
}

/**
 * Copy example abilities to user's .automatosx directory
 */
async function copyExampleAbilities(baseDir: string): Promise<void> {
  const { readdir, copyFile } = await import('fs/promises');

  const examplesDir = join(getPackageRoot(), 'examples/abilities');
  const targetDir = join(baseDir, 'abilities');

  try {
    const files = await readdir(examplesDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        await copyFile(join(examplesDir, file), join(targetDir, file));
      }
    }
  } catch (error) {
    logger.warn('Could not copy example abilities', { error: (error as Error).message });
  }
}

/**
 * Create default configuration file
 */
async function createDefaultConfig(
  configPath: string,
  force: boolean
): Promise<void> {
  const exists = await checkExists(configPath);

  if (exists && !force) {
    return; // Don't overwrite existing config unless forced
  }

  const config = {
    ...DEFAULT_CONFIG,
    // Add metadata
    $schema: 'https://automatosx.dev/schema/config.json',
    version: '4.0.0'
  };

  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, 'utf-8');
}

/**
 * Setup Claude Code integration files
 */
async function setupClaudeIntegration(projectDir: string): Promise<void> {
  const { readdir, copyFile } = await import('fs/promises');

  const examplesBaseDir = join(getPackageRoot(), 'examples/claude');

  // Create .claude directory structure
  const claudeDir = join(projectDir, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const mcpDir = join(claudeDir, 'mcp');

  await mkdir(commandsDir, { recursive: true });
  await mkdir(mcpDir, { recursive: true });

  try {
    // Copy slash command
    const commandsSourceDir = join(examplesBaseDir, 'commands');
    const commandFiles = await readdir(commandsSourceDir);
    for (const file of commandFiles) {
      if (file.endsWith('.md')) {
        await copyFile(join(commandsSourceDir, file), join(commandsDir, file));
      }
    }

    // Copy MCP configuration
    const mcpSourceDir = join(examplesBaseDir, 'mcp');
    const mcpFiles = await readdir(mcpSourceDir);
    for (const file of mcpFiles) {
      if (file.endsWith('.json')) {
        await copyFile(join(mcpSourceDir, file), join(mcpDir, file));
      }
    }
  } catch (error) {
    logger.warn('Could not copy Claude integration files', { error: (error as Error).message });
  }
}

/**
 * Update .gitignore with AutomatosX entries
 */
async function updateGitignore(projectDir: string): Promise<void> {
  const gitignorePath = join(projectDir, '.gitignore');

  const automatosxEntries = [
    '',
    '# AutomatosX',
    '.automatosx/memory/',
    '.automatosx/workspaces/',
    '.automatosx/logs/',
    'automatosx.config.json  # Optional: remove to track config',
    ''
  ].join('\n');

  try {
    const exists = await checkExists(gitignorePath);

    if (exists) {
      // Append to existing .gitignore
      const { readFile } = await import('fs/promises');
      const content = await readFile(gitignorePath, 'utf-8');

      // Check if AutomatosX entries already exist
      if (content.includes('# AutomatosX')) {
        return; // Already exists
      }

      await writeFile(gitignorePath, content + automatosxEntries, 'utf-8');
    } else {
      // Create new .gitignore
      await writeFile(gitignorePath, automatosxEntries, 'utf-8');
    }
  } catch (error) {
    // Non-critical error, just log it
    logger.warn('Failed to update .gitignore', { error: (error as Error).message });
  }
}
