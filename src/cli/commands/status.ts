/**
 * Status Command - Display system status and health
 *
 * Shows comprehensive system information including:
 * - Project and configuration info
 * - Directory structure and existence
 * - Provider availability and health
 * - Workspace statistics
 * - Memory system status
 */

import type { CommandModule } from 'yargs';
import { Router } from '../../core/router.js';
import { PathResolver } from '../../core/path-resolver.js';
import { ClaudeProvider } from '../../providers/claude-provider.js';
import { GeminiProvider } from '../../providers/gemini-provider.js';
import { OpenAIProvider } from '../../providers/openai-provider.js';
import { loadConfig } from '../../core/config.js';
import { logger } from '../../utils/logger.js';
import chalk from 'chalk';
import { existsSync, statSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { createRequire } from 'module';
import os from 'os';
import { printError } from '../../utils/error-formatter.js';

// Read version from package.json using require (works in both dev and installed)
const require = createRequire(import.meta.url);
let VERSION = '5.0.1'; // Fallback version
try {
  const packageJson = require('../../../package.json');
  VERSION = packageJson.version;
} catch (err) {
  // If package.json not found (installed globally), use fallback
  logger.debug('Using fallback version');
}

interface StatusOptions {
  verbose?: boolean;
  json?: boolean;
}

export const statusCommand: CommandModule<Record<string, unknown>, StatusOptions> = {
  command: 'status',
  describe: 'Display system status and health',

  builder: (yargs) => {
    return yargs
      .option('verbose', {
        describe: 'Verbose output with detailed statistics',
        type: 'boolean',
        default: false
      })
      .option('json', {
        describe: 'Output as JSON',
        type: 'boolean',
        default: false
      });
  },

  handler: async (argv) => {
    try {
      const startTime = Date.now();
      const config = await loadConfig(process.cwd());
      const projectDir = process.cwd();

      // Initialize path resolver
      const pathResolver = new PathResolver({
        projectDir,
        workingDir: process.cwd(),
        agentWorkspace: join(projectDir, '.automatosx', 'workspaces')
      });

      // Detect project root
      const detectedProjectDir = await pathResolver.detectProjectRoot();

      // Check directories
      const automatosxDir = join(detectedProjectDir, '.automatosx');
      const agentsDir = join(automatosxDir, 'agents');
      const abilitiesDir = join(automatosxDir, 'abilities');
      const memoryDir = join(automatosxDir, 'memory');
      const workspacesDir = join(automatosxDir, 'workspaces');

      // Initialize providers
      const providers = [];

      if (config.providers['claude-code']?.enabled) {
        providers.push(new ClaudeProvider({
          name: 'claude-code',
          enabled: true,
          priority: config.providers['claude-code'].priority,
          timeout: config.providers['claude-code'].timeout,
          command: config.providers['claude-code'].command
        }));
      }

      if (config.providers['gemini-cli']?.enabled) {
        providers.push(new GeminiProvider({
          name: 'gemini-cli',
          enabled: true,
          priority: config.providers['gemini-cli'].priority,
          timeout: config.providers['gemini-cli'].timeout,
          command: config.providers['gemini-cli'].command
        }));
      }

      if (config.providers['openai']?.enabled) {
        providers.push(new OpenAIProvider({
          name: 'openai',
          enabled: true,
          priority: config.providers['openai'].priority,
          timeout: config.providers['openai'].timeout,
          command: config.providers['openai'].command
        }));
      }

      const router = new Router({
        providers,
        fallbackEnabled: true
      });

      // Get provider health
      const availableProviders = await router.getAvailableProviders();
      const providerHealth = await Promise.all(
        providers.map(async (p) => ({
          name: p.name,
          available: await p.isAvailable(),
          health: await p.getHealth(),
          priority: p.priority
        }))
      );

      // Collect workspace statistics
      const workspaceStats = await getWorkspaceStatistics(workspacesDir);

      // Collect memory statistics
      const memoryStats = await getMemoryStatistics(memoryDir);

      // Collect agent and ability counts
      const agentCount = await countFiles(agentsDir, ['.yaml', '.yml']);
      const abilityCount = await countFiles(abilitiesDir, ['.md']);

      // Get project info
      const projectInfo = await getProjectInfo(detectedProjectDir);

      // Build status object
      const status = {
        system: {
          version: VERSION,
          nodeVersion: process.version,
          platform: `${os.platform()} ${os.arch()}`,
          uptime: Math.floor(process.uptime()),
          projectDir: detectedProjectDir,
          workingDir: process.cwd()
        },
        project: projectInfo,
        configuration: {
          configFile: join(detectedProjectDir, 'automatosx.config.json'),
          configExists: existsSync(join(detectedProjectDir, 'automatosx.config.json')),
          logLevel: config.logging.level,
          memoryMaxEntries: config.memory.maxEntries,
          memoryRetentionDays: config.memory.cleanupDays
        },
        directories: {
          automatosx: { path: automatosxDir, exists: existsSync(automatosxDir) },
          agents: { path: agentsDir, exists: existsSync(agentsDir), count: agentCount },
          abilities: { path: abilitiesDir, exists: existsSync(abilitiesDir), count: abilityCount },
          memory: { path: memoryDir, exists: existsSync(memoryDir), ...memoryStats },
          workspaces: { path: workspacesDir, exists: existsSync(workspacesDir), ...workspaceStats }
        },
        providers: providerHealth,
        router: {
          totalProviders: providers.length,
          availableProviders: availableProviders.length,
          fallbackEnabled: true
        },
        performance: {
          statusCheckMs: Date.now() - startTime
        }
      };

      // Output
      if (argv.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(chalk.blue.bold('\n📊 AutomatosX Status\n'));

        // System
        console.log(chalk.cyan('System:'));
        console.log(`  Version: ${chalk.white(status.system.version)}`);
        console.log(`  Node: ${chalk.white(status.system.nodeVersion)}`);
        console.log(`  Platform: ${chalk.white(status.system.platform)}`);
        if (argv.verbose) {
          console.log(`  Process Uptime: ${chalk.white(formatUptime(status.system.uptime))}`);
        }
        console.log();

        // Project Info
        if (status.project.name || argv.verbose) {
          console.log(chalk.cyan('Project:'));
          if (status.project.name) {
            console.log(`  Name: ${chalk.white(status.project.name)}`);
          }
          if (status.project.type) {
            console.log(`  Type: ${chalk.white(status.project.type)}`);
          }
          console.log(`  Directory: ${chalk.white(status.system.projectDir)}`);
          if (status.system.workingDir !== status.system.projectDir) {
            console.log(`  Working Dir: ${chalk.white(status.system.workingDir)}`);
          }
          console.log();
        }

        // Configuration
        console.log(chalk.cyan('Configuration:'));
        const configIcon = status.configuration.configExists ? chalk.green('✓') : chalk.yellow('⚠');
        const configText = status.configuration.configExists ? 'found' : 'using defaults';
        console.log(`  ${configIcon} Config: ${configText}`);
        if (argv.verbose && status.configuration.configExists) {
          console.log(chalk.gray(`     ${status.configuration.configFile}`));
        }
        console.log(`  Log Level: ${chalk.white(status.configuration.logLevel)}`);
        console.log(`  Memory Limit: ${chalk.white(status.configuration.memoryMaxEntries.toLocaleString())} entries`);
        console.log(`  Retention: ${chalk.white(status.configuration.memoryRetentionDays)} days`);
        console.log();

        // Directories
        console.log(chalk.cyan('Resources:'));
        for (const [name, dir] of Object.entries(status.directories)) {
          const statusIcon = dir.exists ? chalk.green('✓') : chalk.red('✗');

          let info = '';
          if (name === 'agents' && 'count' in dir) {
            const agentDir = dir as { count: number };
            info = ` (${agentDir.count} ${agentDir.count === 1 ? 'agent' : 'agents'})`;
          } else if (name === 'abilities' && 'count' in dir) {
            const abilityDir = dir as { count: number };
            info = ` (${abilityDir.count} ${abilityDir.count === 1 ? 'ability' : 'abilities'})`;
          } else if (name === 'memory' && 'files' in dir) {
            const memDir = dir as { files: number; sizeBytes: number };
            info = ` (${memDir.files} ${memDir.files === 1 ? 'file' : 'files'}, ${formatBytes(memDir.sizeBytes || 0)})`;
          } else if (name === 'workspaces' && 'workspaces' in dir) {
            const wsDir = dir as { workspaces: number; totalSizeBytes: number };
            info = ` (${wsDir.workspaces} ${wsDir.workspaces === 1 ? 'workspace' : 'workspaces'}, ${formatBytes(wsDir.totalSizeBytes || 0)})`;
          }

          console.log(`  ${statusIcon} ${name}${info}`);
          if (argv.verbose) {
            console.log(chalk.gray(`     ${dir.path}`));
          }
        }
        console.log();

        // Providers
        console.log(chalk.cyan('Providers:'));
        for (const provider of status.providers) {
          const statusIcon = provider.available ? chalk.green('✓') : chalk.red('✗');
          const statusText = provider.available ? chalk.green('available') : chalk.red('unavailable');
          console.log(`  ${statusIcon} ${provider.name}: ${statusText} (priority: ${provider.priority})`);

          if (argv.verbose) {
            console.log(chalk.gray(`     Failures: ${provider.health.consecutiveFailures}`));
            console.log(chalk.gray(`     Latency: ${provider.health.latencyMs}ms`));
            console.log(chalk.gray(`     Error rate: ${(provider.health.errorRate * 100).toFixed(2)}%`));
          }
        }
        console.log();

        // Router
        console.log(chalk.cyan('Router:'));
        console.log(`  Total providers: ${chalk.white(status.router.totalProviders)}`);
        console.log(`  Available: ${chalk.white(status.router.availableProviders)}`);
        console.log(`  Fallback: ${chalk.white(status.router.fallbackEnabled ? 'enabled' : 'disabled')}`);
        console.log();

        // Performance (verbose only)
        if (argv.verbose) {
          console.log(chalk.cyan('Performance:'));
          console.log(`  Status check: ${chalk.white(status.performance.statusCheckMs)}ms`);
          console.log();
        }

        // Overall status
        const allDirsExist = Object.values(status.directories).every(d => d.exists);
        const hasAvailableProviders = status.router.availableProviders > 0;
        const isHealthy = allDirsExist && hasAvailableProviders;

        if (isHealthy) {
          console.log(chalk.green.bold('✅ System is healthy\n'));
        } else {
          console.log(chalk.yellow.bold('⚠️  System has issues\n'));
          if (!allDirsExist) {
            console.log(chalk.yellow('  Some directories are missing. Run `automatosx init` to initialize.'));
          }
          if (!hasAvailableProviders) {
            console.log(chalk.yellow('  No providers available. Check provider configuration.'));
          }
          console.log();
        }
      }

    } catch (error) {
      printError(error, {
        verbose: argv.verbose,
        showCode: true,
        showSuggestions: true,
        colors: true
      });
      logger.error('Status check failed', { error: (error as Error).message });
      process.exit(1);
    }
  }
};

/**
 * Helper Functions
 */

/**
 * Get workspace statistics
 */
async function getWorkspaceStatistics(workspacesDir: string): Promise<{
  workspaces: number;
  totalSizeBytes: number;
  files: number;
}> {
  if (!existsSync(workspacesDir)) {
    return { workspaces: 0, totalSizeBytes: 0, files: 0 };
  }

  try {
    const entries = await readdir(workspacesDir, { withFileTypes: true });
    const workspaces = entries.filter(e => e.isDirectory());

    let totalSizeBytes = 0;
    let files = 0;

    for (const workspace of workspaces) {
      const workspacePath = join(workspacesDir, workspace.name);
      const stats = await getDirectoryStats(workspacePath);
      totalSizeBytes += stats.size;
      files += stats.files;
    }

    return {
      workspaces: workspaces.length,
      totalSizeBytes,
      files
    };
  } catch (error) {
    logger.warn('Failed to get workspace statistics', { error: (error as Error).message });
    return { workspaces: 0, totalSizeBytes: 0, files: 0 };
  }
}

/**
 * Get memory statistics
 */
async function getMemoryStatistics(memoryDir: string): Promise<{
  files: number;
  sizeBytes: number;
}> {
  if (!existsSync(memoryDir)) {
    return { files: 0, sizeBytes: 0 };
  }

  try {
    const stats = await getDirectoryStats(memoryDir);
    return {
      files: stats.files,
      sizeBytes: stats.size
    };
  } catch (error) {
    logger.warn('Failed to get memory statistics', { error: (error as Error).message });
    return { files: 0, sizeBytes: 0 };
  }
}

/**
 * Get directory statistics recursively
 */
async function getDirectoryStats(dirPath: string): Promise<{ size: number; files: number }> {
  let totalSize = 0;
  let totalFiles = 0;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subStats = await getDirectoryStats(fullPath);
        totalSize += subStats.size;
        totalFiles += subStats.files;
      } else if (entry.isFile()) {
        const stats = await stat(fullPath);
        totalSize += stats.size;
        totalFiles++;
      }
    }
  } catch (error) {
    // Silently ignore errors (permission denied, etc.)
  }

  return { size: totalSize, files: totalFiles };
}

/**
 * Count files with specific extensions in a directory
 */
async function countFiles(dirPath: string, extensions: string[]): Promise<number> {
  if (!existsSync(dirPath)) {
    return 0;
  }

  try {
    const files = await readdir(dirPath);
    return files.filter(f => extensions.some(ext => f.endsWith(ext))).length;
  } catch (error) {
    logger.warn('Failed to count files', { dirPath, error: (error as Error).message });
    return 0;
  }
}

/**
 * Get project information from package.json
 */
async function getProjectInfo(projectDir: string): Promise<{
  name?: string;
  version?: string;
  type?: string;
}> {
  const packageJsonPath = join(projectDir, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return {};
  }

  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    return {
      name: pkg.name,
      version: pkg.version,
      type: pkg.type || 'commonjs'
    };
  } catch (error) {
    logger.warn('Failed to read package.json', { error: (error as Error).message });
    return {};
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format uptime to human-readable string
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
