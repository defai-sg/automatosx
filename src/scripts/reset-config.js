#!/usr/bin/env node

/**
 * AutomatosX Configuration Reset System
 * Bob's implementation for resetting system to default configuration
 * Let's build this rock-solid.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigResetSystem {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.configPaths = {
            // Main config files
            mainConfig: path.join(projectPath, 'automatosx.config.yaml'),
            mainConfigJs: path.join(projectPath, 'automatosx.config.js'),
            packageConfig: path.join(projectPath, 'package.json'),

            // Provider configurations
            providersConfig: path.join(projectPath, 'src/config/providers.json'),

            // User data directories
            userWorkspace: path.join(projectPath, '.defai/workspaces'),
            defaiData: path.join(projectPath, '.defai'),
            claudeData: path.join(projectPath, '.claude'),

            // Cache and temporary files
            nodeModules: path.join(projectPath, 'node_modules'),
            packageLock: path.join(projectPath, 'package-lock.json')
        };

        this.defaultConfigs = {
            providers: {
                "claude-code": {
                    "enabled": true,
                    "priority": 1,
                    "timeout": 120000
                },
                "gemini-cli": {
                    "enabled": true,
                    "priority": 2,
                    "timeout": 180000
                },
                "openai-cli": {
                    "enabled": false,
                    "priority": 3,
                    "timeout": 180000
                }
            },
            automatosxConfig: `# AutomatosX Configuration
# Default configuration for AI agent orchestration platform

providers:
  claude-code:
    enabled: true
    priority: 1
    timeout: 120000
  gemini-cli:
    enabled: true
    priority: 2
    timeout: 180000
  openai-cli:
    enabled: false
    priority: 3
    timeout: 180000

memory:
  type: "hybrid"
  milvus:
    enabled: true
    fallback: true
  sqlite:
    enabled: true
    file: ".defai/memory/chat-history.db"

workspace:
  directory: "./.defai/workspaces"
  cleanup:
    enabled: true
    maxAge: 7 # days
    maxFiles: 100

logging:
  level: "info"
  file: "./.defai/workspaces/logs/automatosx.log"
  console: true
`
        };
    }

    async resetAll() {
        console.log(chalk.blue('🔄 Bob: Starting complete configuration reset...'));
        console.log(chalk.gray('💭 "Let\'s build this rock-solid."'));

        const results = {
            config: false,
            providers: false,
            workspace: false,
            cache: false,
            memory: false,
            errors: []
        };

        // Reset main configuration
        try {
            await this.resetMainConfig();
            results.config = true;
            console.log(chalk.green('✅ Main configuration reset'));
        } catch (error) {
            results.errors.push(`Main config reset failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Main config reset failed:'), error.message);
        }

        // Reset provider configuration
        try {
            await this.resetProviderConfig();
            results.providers = true;
            console.log(chalk.green('✅ Provider configuration reset'));
        } catch (error) {
            results.errors.push(`Provider config reset failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Provider config reset failed:'), error.message);
        }

        // Reset workspace
        try {
            await this.resetWorkspace();
            results.workspace = true;
            console.log(chalk.green('✅ Workspace reset'));
        } catch (error) {
            results.errors.push(`Workspace reset failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Workspace reset failed:'), error.message);
        }

        // Reset memory systems
        try {
            await this.resetMemoryData();
            results.memory = true;
            console.log(chalk.green('✅ Memory data reset'));
        } catch (error) {
            results.errors.push(`Memory reset failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Memory reset failed:'), error.message);
        }

        // Reset cache
        try {
            await this.resetCache();
            results.cache = true;
            console.log(chalk.green('✅ Cache reset'));
        } catch (error) {
            results.errors.push(`Cache reset failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Cache reset failed:'), error.message);
        }

        return results;
    }

    async resetMainConfig() {
        // Remove existing config files
        await fs.remove(this.configPaths.mainConfig);
        await fs.remove(this.configPaths.mainConfigJs);

        // Create default YAML config
        await fs.outputFile(this.configPaths.mainConfig, this.defaultConfigs.automatosxConfig);

        console.log(chalk.cyan('📝 Created default automatosx.config.yaml'));
    }

    async resetProviderConfig() {
        // Ensure config directory exists
        await fs.ensureDir(path.dirname(this.configPaths.providersConfig));

        // Write default provider configuration
        await fs.outputJson(this.configPaths.providersConfig, this.defaultConfigs.providers, { spaces: 2 });

        console.log(chalk.cyan('📝 Created default providers.json'));
    }

    async resetWorkspace() {
        // Clean workspace directories but preserve structure
        if (await fs.pathExists(this.configPaths.userWorkspace)) {
            const subdirs = ['agents', 'logs', 'outputs', 'tasks'];

            for (const subdir of subdirs) {
                const subdirPath = path.join(this.configPaths.userWorkspace, subdir);
                if (await fs.pathExists(subdirPath)) {
                    await fs.emptyDir(subdirPath);
                    console.log(chalk.gray(`   🗂️  Cleaned ${subdir}/`));
                }
            }
        }

        // Recreate workspace structure
        await this.createWorkspaceStructure();
    }

    async resetMemoryData() {
        // Clean memory data directories
        const memoryPaths = [
            this.configPaths.defaiData,
            path.join(this.configPaths.claudeData, 'memory')
        ];

        for (const memoryPath of memoryPaths) {
            if (await fs.pathExists(memoryPath)) {
                await fs.remove(memoryPath);
                console.log(chalk.gray(`   🧠 Removed ${path.basename(memoryPath)}`));
            }
        }
    }

    async resetCache() {
        // Note: We don't remove node_modules by default as it's expensive to reinstall
        // Users can manually run `npm install --force` if needed
        console.log(chalk.gray('   💡 Note: Run `npm install --force` to reset node_modules if needed'));
    }

    async createWorkspaceStructure() {
        const workspaceDirs = [
            '.defai/workspaces/agents',
            '.defai/workspaces/logs',
            '.defai/workspaces/outputs',
            '.defai/workspaces/tasks',
            '.defai/memory',
            '.defai/chat-history',
            '.defai/hybrid-memory',
            '.defai/enhanced-memory'
        ];

        for (const dir of workspaceDirs) {
            await fs.ensureDir(path.join(this.projectPath, dir));
        }

        // Create .gitkeep files to preserve structure
        for (const dir of workspaceDirs) {
            const gitkeepPath = path.join(this.projectPath, dir, '.gitkeep');
            await fs.outputFile(gitkeepPath, '# Keep this directory in git\n');
        }

        console.log(chalk.cyan('📁 Recreated workspace structure'));
    }

    async resetSpecific(type) {
        console.log(chalk.blue(`🔄 Bob: Resetting ${type} configuration...`));

        switch (type.toLowerCase()) {
            case 'config':
                await this.resetMainConfig();
                console.log(chalk.green('✅ Main configuration reset'));
                break;
            case 'providers':
                await this.resetProviderConfig();
                console.log(chalk.green('✅ Provider configuration reset'));
                break;
            case 'workspace':
                await this.resetWorkspace();
                console.log(chalk.green('✅ Workspace reset'));
                break;
            case 'memory':
                await this.resetMemoryData();
                console.log(chalk.green('✅ Memory data reset'));
                break;
            case 'cache':
                await this.resetCache();
                console.log(chalk.green('✅ Cache reset'));
                break;
            default:
                throw new Error(`Unknown reset type: ${type}`);
        }
    }

    async showStatus() {
        console.log(chalk.blue('\n📊 Bob: Configuration Status'));
        console.log(chalk.gray('━'.repeat(50)));

        const checks = [
            { name: 'Main Config', path: this.configPaths.mainConfig },
            { name: 'Providers Config', path: this.configPaths.providersConfig },
            { name: 'Workspace Dir', path: this.configPaths.userWorkspace },
            { name: 'Memory Data', path: this.configPaths.defaiData }
        ];

        for (const check of checks) {
            const exists = await fs.pathExists(check.path);
            const status = exists ? chalk.green('✅ EXISTS') : chalk.red('❌ MISSING');
            console.log(`${status} ${check.name}: ${check.path}`);
        }
    }

    async backupCurrentConfig() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.projectPath, 'backup', `config-backup-${timestamp}`);

        await fs.ensureDir(backupDir);

        const filesToBackup = [
            this.configPaths.mainConfig,
            this.configPaths.mainConfigJs,
            this.configPaths.providersConfig
        ];

        for (const filePath of filesToBackup) {
            if (await fs.pathExists(filePath)) {
                const fileName = path.basename(filePath);
                await fs.copy(filePath, path.join(backupDir, fileName));
            }
        }

        console.log(chalk.cyan(`💾 Configuration backed up to: ${backupDir}`));
        return backupDir;
    }
}

// CLI execution
async function main() {
    try {
        const resetSystem = new ConfigResetSystem();
        const args = process.argv.slice(2);

        if (args.length === 0 || args[0] === 'all') {
            // Backup before reset
            await resetSystem.backupCurrentConfig();

            if (args[0] === 'all') {
                console.log(chalk.red('🚨 WARNING: This will reset ALL configuration to defaults!'));
                const results = await resetSystem.resetAll();

                if (results.errors.length > 0) {
                    console.log(chalk.red('\n❌ Some operations failed:'));
                    results.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
                } else {
                    console.log(chalk.green('\n🎉 All configurations reset successfully!'));
                }

                console.log(chalk.cyan('\n🎭 Bob: "Configuration reset rock-solid!"'));
            } else {
                await resetSystem.showStatus();
            }
        } else if (args[0] === 'type' && args[1]) {
            const type = args[1];

            if (!['config', 'providers', 'workspace', 'memory', 'cache'].includes(type)) {
                console.log(chalk.red(`❌ Invalid type: ${type}`));
                console.log('Usage: node reset-config.js type <config|providers|workspace|memory|cache>');
                process.exit(1);
            }

            await resetSystem.resetSpecific(type);
            console.log(chalk.cyan(`\n🎭 Bob: "${type} configuration reset rock-solid!"`));
        } else if (args[0] === 'status') {
            await resetSystem.showStatus();
        } else if (args[0] === 'backup') {
            await resetSystem.backupCurrentConfig();
        } else {
            console.log(chalk.blue('🔄 AutomatosX Configuration Reset'));
            console.log(chalk.gray('Usage:'));
            console.log('  node reset-config.js            # Show configuration status');
            console.log('  node reset-config.js all         # Reset all configuration');
            console.log('  node reset-config.js type config # Reset specific type');
            console.log('  node reset-config.js status      # Show configuration status');
            console.log('  node reset-config.js backup      # Backup current configuration');
            console.log('\nAvailable types: config, providers, workspace, memory, cache');
        }
    } catch (error) {
        console.error(chalk.red('❌ Configuration reset failed:'), error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Export for use as module
export { ConfigResetSystem };

// Run if called directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('reset-config.js'))) {
    main();
}
