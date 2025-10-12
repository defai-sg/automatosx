/**
 * Init Command - Initialize AutomatosX project
 */

import type { CommandModule } from 'yargs';
import { mkdir, writeFile, access, readdir, copyFile, rm, stat } from 'fs/promises';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { constants, existsSync } from 'fs';
import chalk from 'chalk';
import { DEFAULT_CONFIG } from '../../types/config.js';
import type { AutomatosXConfig } from '../../types/config.js';
import { logger } from '../../utils/logger.js';
import { printError } from '../../utils/error-formatter.js';

// Get the directory of this file for locating examples
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get package root using filesystem checks instead of string matching
 * This is more reliable and works with any directory structure
 */
function getPackageRoot(): string {
  let current = __dirname;
  const root = '/';

  while (current !== root) {
    // Check if package.json exists at this level
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    current = dirname(current);
  }

  throw new Error('Could not find package root (no package.json found)');
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
    const configPath = join(projectDir, 'automatosx.config.json');

    // Get version from package.json dynamically
    const packageRoot = getPackageRoot();
    let version = '5.1.2'; // fallback
    try {
      const packageJson = JSON.parse(
        await import('fs/promises').then(fs => fs.readFile(join(packageRoot, 'package.json'), 'utf-8'))
      );
      version = packageJson.version;
    } catch {
      // Use fallback version
    }

    console.log(chalk.blue.bold(`\n🤖 AutomatosX v${version} - Project Initialization\n`));

    // Track created resources for rollback
    const createdResources: string[] = [];
    let shouldRollback = false;

    try {
      // Pre-flight validation
      console.log(chalk.cyan('🔍 Validating environment...'));
      await validateEnvironment(packageRoot);
      console.log(chalk.green('   ✓ Environment validation passed'));

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
      createdResources.push(automatosxDir);
      console.log(chalk.green('   ✓ Directories created'));

      // Copy example teams (NEW - Fix P0-1)
      console.log(chalk.cyan('👥 Installing team configurations...'));
      const teamCount = await copyExampleTeams(automatosxDir, packageRoot);
      console.log(chalk.green(`   ✓ ${teamCount} team configurations installed`));

      // Copy example agents
      console.log(chalk.cyan('🤖 Installing example agents...'));
      const agentCount = await copyExampleAgents(automatosxDir, packageRoot);
      console.log(chalk.green(`   ✓ ${agentCount} example agents installed`));

      // Copy example abilities
      console.log(chalk.cyan('⚡ Installing example abilities...'));
      const abilityCount = await copyExampleAbilities(automatosxDir, packageRoot);
      console.log(chalk.green(`   ✓ ${abilityCount} example abilities installed`));

      // Copy agent templates (v5.0+)
      console.log(chalk.cyan('📋 Installing agent templates...'));
      const templateCount = await copyExampleTemplates(automatosxDir, packageRoot);
      console.log(chalk.green(`   ✓ ${templateCount} agent templates installed`));

      // Create default config
      console.log(chalk.cyan('⚙️  Generating configuration...'));
      await createDefaultConfig(configPath, argv.force ?? false);
      createdResources.push(configPath);
      console.log(chalk.green('   ✓ Configuration created'));

      // Setup Claude Code integration
      console.log(chalk.cyan('🔌 Setting up Claude Code integration...'));
      await setupClaudeIntegration(projectDir, packageRoot);
      createdResources.push(join(projectDir, '.claude'));
      console.log(chalk.green('   ✓ Claude Code integration configured'));

      // Create .gitignore entry
      console.log(chalk.cyan('📝 Updating .gitignore...'));
      await updateGitignore(projectDir);
      console.log(chalk.green('   ✓ .gitignore updated'));

      // Success message
      console.log(chalk.green.bold('\n✅ AutomatosX initialized successfully!\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Review automatosx.config.json'));
      console.log(chalk.gray('  2. List agents: automatosx list agents'));
      console.log(chalk.gray('  3. Run an agent: automatosx run backend "Hello!"\n'));
      console.log(chalk.cyan('Available example agents:'));
      console.log(chalk.gray('  • backend    - Backend engineer'));
      console.log(chalk.gray('  • frontend   - Frontend engineer'));
      console.log(chalk.gray('  • devops     - DevOps specialist'));
      console.log(chalk.gray('  • security   - Security analyst'));
      console.log(chalk.gray('  • quality    - QA specialist'));
      console.log(chalk.gray('  • data       - Data scientist'));
      console.log(chalk.gray('  • design     - Product designer'));
      console.log(chalk.gray('  • writer     - Technical writer'));
      console.log(chalk.gray('  • product    - Product manager'));
      console.log(chalk.gray('  • ceo        - Executive advisor'));
      console.log(chalk.gray('  • cto        - Technology strategist'));
      console.log(chalk.gray('  • researcher - Research analyst\n'));
      console.log(chalk.cyan('Claude Code Integration:'));
      console.log(chalk.gray('  • Use /ax command in Claude Code'));
      console.log(chalk.gray('  • Example: /ax assistant "Explain this code"'));
      console.log(chalk.gray('  • MCP tools available in .claude/mcp/\n'));

      logger.info('AutomatosX initialized', {
        projectDir,
        automatosxDir,
        counts: { teams: teamCount, agents: agentCount, abilities: abilityCount, templates: templateCount }
      });

    } catch (error) {
      shouldRollback = true;

      // Rollback mechanism (Fix P0-2)
      if (createdResources.length > 0 && !argv.force) {
        console.log(chalk.yellow('\n⚠️  Initialization failed. Rolling back changes...'));
        await rollbackCreatedResources(createdResources);
        console.log(chalk.green('   ✓ Rollback completed'));
      }

      printError(error, {
        verbose: false,
        showCode: true,
        showSuggestions: true,
        colors: true
      });
      logger.error('Initialization failed', {
        error: (error as Error).message,
        rolledBack: shouldRollback && createdResources.length > 0
      });
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
    join(baseDir, 'teams'),
    join(baseDir, 'abilities'),
    join(baseDir, 'templates'),      // v5.0: Agent templates
    join(baseDir, 'memory'),
    join(baseDir, 'memory/exports'), // v5.1: MCP memory export directory
    join(baseDir, 'sessions'),       // v5.1: Session persistence
    // v5.2: Removed 'workspaces' - automatosx/PRD and automatosx/tmp created on-demand
    join(baseDir, 'logs')
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Validate environment before initialization (Fix P2-7)
 */
async function validateEnvironment(packageRoot: string): Promise<void> {
  const requiredDirs = [
    'examples/agents',
    'examples/abilities',
    'examples/templates',
    'examples/teams'
  ];

  const errors: string[] = [];

  for (const dir of requiredDirs) {
    const fullPath = join(packageRoot, dir);
    try {
      await stat(fullPath);
    } catch {
      errors.push(`Missing required directory: ${dir}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map(e => `  • ${e}`).join('\n')}\n\n` +
      'This usually means the package is corrupted. Try reinstalling:\n' +
      '  npm uninstall -g @defai.digital/automatosx\n' +
      '  npm install -g @defai.digital/automatosx'
    );
  }
}

/**
 * Rollback created resources on failure (Fix P0-2)
 */
async function rollbackCreatedResources(resources: string[]): Promise<void> {
  for (const resource of resources.reverse()) {
    try {
      await rm(resource, { recursive: true, force: true });
      logger.info('Rolled back resource', { resource });
    } catch (error) {
      logger.warn('Failed to rollback resource', {
        resource,
        error: (error as Error).message
      });
    }
  }
}

/**
 * Copy example teams to user's .automatosx directory (Fix P0-1)
 */
async function copyExampleTeams(baseDir: string, packageRoot: string): Promise<number> {
  const examplesDir = join(packageRoot, 'examples/teams');
  const targetDir = join(baseDir, 'teams');

  const files = await readdir(examplesDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.yaml')) {
      await copyFile(join(examplesDir, file), join(targetDir, file));
      count++;
    }
  }

  if (count === 0) {
    throw new Error(`No team configuration files found in ${examplesDir}`);
  }

  return count;
}

/**
 * Copy example agents to user's .automatosx directory (Fix P0-3: Fatal errors)
 */
async function copyExampleAgents(baseDir: string, packageRoot: string): Promise<number> {
  const examplesDir = join(packageRoot, 'examples/agents');
  const targetDir = join(baseDir, 'agents');

  const files = await readdir(examplesDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.yaml')) {
      await copyFile(join(examplesDir, file), join(targetDir, file));
      count++;
    }
  }

  if (count === 0) {
    throw new Error(`No agent files found in ${examplesDir}`);
  }

  return count;
}

/**
 * Copy example abilities to user's .automatosx directory (Fix P0-3: Fatal errors)
 */
async function copyExampleAbilities(baseDir: string, packageRoot: string): Promise<number> {
  const examplesDir = join(packageRoot, 'examples/abilities');
  const targetDir = join(baseDir, 'abilities');

  const files = await readdir(examplesDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.md')) {
      await copyFile(join(examplesDir, file), join(targetDir, file));
      count++;
    }
  }

  if (count === 0) {
    throw new Error(`No ability files found in ${examplesDir}`);
  }

  return count;
}

/**
 * Copy agent templates to user's .automatosx directory (Fix P0-3: Fatal errors)
 */
async function copyExampleTemplates(baseDir: string, packageRoot: string): Promise<number> {
  const examplesDir = join(packageRoot, 'examples/templates');
  const targetDir = join(baseDir, 'templates');

  const files = await readdir(examplesDir);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.yaml')) {
      await copyFile(join(examplesDir, file), join(targetDir, file));
      count++;
    }
  }

  if (count === 0) {
    throw new Error(`No template files found in ${examplesDir}`);
  }

  return count;
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
    $schema: './schema/config.json',
    version: '5.0.0'
  };

  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, 'utf-8');
}

/**
 * Setup Claude Code integration files
 */
async function setupClaudeIntegration(projectDir: string, packageRoot: string): Promise<void> {
  const examplesBaseDir = join(packageRoot, 'examples/claude');

  // Create .claude directory structure
  const claudeDir = join(projectDir, '.claude');
  const commandsDir = join(claudeDir, 'commands');
  const mcpDir = join(claudeDir, 'mcp');

  await mkdir(commandsDir, { recursive: true });
  await mkdir(mcpDir, { recursive: true });

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
    '.automatosx/logs/',
    'automatosx/tmp/  # v5.2: Temporary files',
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
