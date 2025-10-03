#!/usr/bin/env node

/**
 * AutomatosX Uninstall System
 * Bob's implementation for complete system removal
 * Let's build this rock-solid.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, exec } from 'child_process';
import chalk from 'chalk';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UninstallSystem {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.packageJson = null;

        // Paths to clean up
        this.cleanupPaths = {
            // Project directories - only what should be cleaned
            defaiWorkspaces: path.join(projectPath, '.defai/workspaces'),
            backup: path.join(projectPath, 'backup'),

            // Global Claude Code integration directories - only ax subdirs for commands and mcp
            globalClaude: path.join(process.env.HOME || process.env.USERPROFILE, '.claude'),
            claudeCommandsAx: path.join(process.env.HOME || process.env.USERPROFILE, '.claude/commands/ax'),
            claudeMcpAx: path.join(process.env.HOME || process.env.USERPROFILE, '.claude/mcp/ax'),

            // Keep these for backward compatibility but don't use in main cleanup
            defaiData: path.join(projectPath, '.defai'),
            claudeData: path.join(projectPath, '.claude'),

            // Configuration files
            configs: [
                path.join(projectPath, 'automatosx.config.yaml'),
                path.join(projectPath, 'automatosx.config.js'),
                path.join(projectPath, 'src/config/providers.json')
            ],

            // Dependencies
            nodeModules: path.join(projectPath, 'node_modules'),
            packageLock: path.join(projectPath, 'package-lock.json'),

            // Logs and cache
            logs: [
                path.join(projectPath, 'logs'),
                path.join(projectPath, '*.log')
            ]
        };
    }

    async loadPackageInfo() {
        try {
            const packagePath = path.join(this.projectPath, 'package.json');
            if (await fs.pathExists(packagePath)) {
                this.packageJson = await fs.readJson(packagePath);
            }
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not read package.json'), error.message);
        }
    }

    async uninstallComplete() {
        console.log(chalk.red('🗑️  Bob: Removing AutomatosX Claude Code integration...'));
        console.log(chalk.gray('💭 "Only cleaning Claude integration, keeping your project intact."'));

        const results = {
            claudeCleanup: false,
            errors: []
        };

        // Clean up all Claude Code integration directories (global and project-level)
        try {
            await this.cleanupClaudeIntegration();
            await this.cleanupProjectClaudeDirectories();
            results.claudeCleanup = true;
            console.log(chalk.green('✅ Claude Code integration removed (global and project-level)'));
        } catch (error) {
            results.errors.push(`Claude cleanup failed: ${error.message}`);
            console.warn(chalk.yellow('⚠️  Claude cleanup failed:'), error.message);
        }

        return results;
    }

    async createUninstallBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.projectPath, 'backup', `uninstall-backup-${timestamp}`);

        await fs.ensureDir(backupDir);

        // Backup important files
        const filesToBackup = [
            'package.json',
            'automatosx.config.yaml',
            'automatosx.config.js',
            'src/config/providers.json'
        ];

        for (const file of filesToBackup) {
            const filePath = path.join(this.projectPath, file);
            if (await fs.pathExists(filePath)) {
                const backupPath = path.join(backupDir, file);
                await fs.ensureDir(path.dirname(backupPath));
                await fs.copy(filePath, backupPath);
            }
        }

        // Backup workspace structure info
        const workspaceInfo = await this.gatherWorkspaceInfo();
        await fs.outputJson(path.join(backupDir, 'workspace-info.json'), workspaceInfo, { spaces: 2 });

        console.log(chalk.cyan(`💾 Uninstall backup created: ${backupDir}`));
        return backupDir;
    }

    async gatherWorkspaceInfo() {
        const info = {
            timestamp: new Date().toISOString(),
            projectPath: this.projectPath,
            packageInfo: this.packageJson,
            directories: {},
            files: {}
        };

        // Gather directory info
        for (const [name, dirPath] of Object.entries(this.cleanupPaths)) {
            if (typeof dirPath === 'string' && await fs.pathExists(dirPath)) {
                const stat = await fs.stat(dirPath);
                info.directories[name] = {
                    path: dirPath,
                    size: stat.size,
                    modified: stat.mtime
                };
            }
        }

        return info;
    }

    async uninstallGlobal() {
        await this.loadPackageInfo();

        if (this.packageJson && this.packageJson.name) {
            const packageName = this.packageJson.name;

            try {
                // Check if globally installed
                const { stdout } = await execAsync(`npm list -g ${packageName} --depth=0`, { encoding: 'utf8' });
                if (stdout.includes(packageName)) {
                    console.log(chalk.blue(`🔄 Uninstalling global package: ${packageName}`));
                    execSync(`npm uninstall -g ${packageName}`, { stdio: 'inherit' });
                    console.log(chalk.green(`✅ Global package ${packageName} uninstalled`));
                } else {
                    console.log(chalk.gray(`📝 Package ${packageName} was not globally installed`));
                }
            } catch (error) {
                // Package might not be globally installed, which is fine
                console.log(chalk.gray(`📝 Package was not globally installed or already removed`));
            }
        }

        // Also try to uninstall with common package names
        const possibleNames = ['automatosx', 'defai-ax'];
        for (const name of possibleNames) {
            try {
                const { stdout } = await execAsync(`npm list -g ${name} --depth=0`, { encoding: 'utf8' });
                if (stdout.includes(name)) {
                    execSync(`npm uninstall -g ${name}`, { stdio: 'inherit' });
                    console.log(chalk.green(`✅ Global package ${name} uninstalled`));
                }
            } catch (error) {
                // Ignore errors - package might not exist
            }
        }
    }

    async stopAllProcesses() {
        console.log(chalk.blue('🔄 Stopping AutomatosX processes...'));

        try {
            // Stop memory server processes
            try {
                const memoryServerProcesses = execSync('ps aux | grep "memory-server\\|http-memory-server" | grep -v grep', { encoding: 'utf8' });
                if (memoryServerProcesses.trim()) {
                    console.log(chalk.gray('   🔍 Found memory server processes'));
                    execSync('pkill -f "memory-server\\|http-memory-server"', { encoding: 'utf8' });
                    console.log(chalk.gray('   🔪 Terminated memory server processes'));
                }
            } catch (error) {
                // No processes found, which is fine
            }

            // Stop AutomatosX main processes
            try {
                const automatosxProcesses = execSync('ps aux | grep "automatosx\\|defai-ax" | grep -v grep', { encoding: 'utf8' });
                if (automatosxProcesses.trim()) {
                    console.log(chalk.gray('   🔍 Found AutomatosX processes'));
                    execSync('pkill -f "automatosx\\|defai-ax"', { encoding: 'utf8' });
                    console.log(chalk.gray('   🔪 Terminated AutomatosX processes'));
                }
            } catch (error) {
                // No processes found, which is fine
            }

            // Stop Node.js processes running AutomatosX
            try {
                const nodeProcesses = execSync('ps aux | grep "node.*src/index.js\\|node.*src/enhanced-index.js" | grep -v grep', { encoding: 'utf8' });
                if (nodeProcesses.trim()) {
                    console.log(chalk.gray('   🔍 Found Node.js AutomatosX processes'));
                    execSync('pkill -f "node.*src/index.js\\|node.*src/enhanced-index.js"', { encoding: 'utf8' });
                    console.log(chalk.gray('   🔪 Terminated Node.js processes'));
                }
            } catch (error) {
                // No processes found, which is fine
            }

            // Wait for processes to terminate
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Clean up any port files
            const portFile = path.join(this.projectPath, '.defai/memory/server.port');
            if (await fs.pathExists(portFile)) {
                await fs.remove(portFile);
                console.log(chalk.gray('   🧹 Removed server port file'));
            }

        } catch (error) {
            throw new Error(`Failed to stop processes: ${error.message}`);
        }
    }

    async cleanupData() {
        console.log(chalk.blue('🔄 Cleaning up AutomatosX data directories...'));

        // Remove entire .defai directory
        const defaiDir = this.cleanupPaths.defaiData;
        if (await fs.pathExists(defaiDir)) {
            try {
                await fs.remove(defaiDir);
                console.log(chalk.gray(`   🗂️  Removed .defai/`));
            } catch (error) {
                console.warn(chalk.yellow(`   ⚠️  Could not remove .defai: ${error.message}`));
            }
        }

        // Clean up project-level Claude directories (.claude/*/ax)
        await this.cleanupProjectClaudeDirectories();

        // Global Claude Code integration directories
        await this.cleanupClaudeIntegration();
    }

    async cleanupClaudeIntegration() {
        console.log(chalk.blue('🔄 Cleaning up Claude Code integration directories...'));

        // Only clean the specific directories requested: commands/ax and mcp/ax
        const claudeDirs = [
            { path: this.cleanupPaths.claudeCommandsAx, name: '.claude/commands/ax' },
            { path: this.cleanupPaths.claudeMcpAx, name: '.claude/mcp/ax' }
        ];

        for (const { path: dirPath, name } of claudeDirs) {
            if (await fs.pathExists(dirPath)) {
                try {
                    await fs.remove(dirPath);
                    console.log(chalk.gray(`   🔌 Removed ${name}/`));
                } catch (error) {
                    console.warn(chalk.yellow(`   ⚠️  Could not remove ${name}: ${error.message}`));
                }
            }
        }

        console.log(chalk.gray('   ✅ Preserved other Claude Code integrations'));
    }

    async cleanupProjectClaudeDirectories() {
        console.log(chalk.blue('🔄 Cleaning up project-level Claude directories...'));

        // Clean up project-level .claude/*/ax directories
        const projectClaudeDir = path.join(this.projectPath, '.claude');

        if (!await fs.pathExists(projectClaudeDir)) {
            console.log(chalk.gray('   ✅ No project-level .claude directory found'));
            return;
        }

        const subDirs = ['commands', 'mcp', 'styles'];
        for (const subDir of subDirs) {
            const axPath = path.join(projectClaudeDir, subDir, 'ax');
            if (await fs.pathExists(axPath)) {
                try {
                    await fs.remove(axPath);
                    console.log(chalk.gray(`   🔌 Removed .claude/${subDir}/ax/`));
                } catch (error) {
                    console.warn(chalk.yellow(`   ⚠️  Could not remove .claude/${subDir}/ax: ${error.message}`));
                }
            }
        }

        console.log(chalk.gray('   ✅ Project-level Claude directories cleaned'));
    }

    async cleanupConfig() {
        // Remove individual config files
        for (const configPath of this.cleanupPaths.configs) {
            if (await fs.pathExists(configPath)) {
                await fs.remove(configPath);
                console.log(chalk.gray(`   📝 Removed ${path.basename(configPath)}`));
            }
        }

        // Remove config directory if empty
        const configDir = path.join(this.projectPath, 'config');
        if (await fs.pathExists(configDir)) {
            const files = await fs.readdir(configDir);
            if (files.length === 0) {
                await fs.remove(configDir);
                console.log(chalk.gray(`   📁 Removed empty config/`));
            }
        }
    }

    async cleanupDependencies() {
        // Remove node_modules
        if (await fs.pathExists(this.cleanupPaths.nodeModules)) {
            console.log(chalk.blue('🔄 Removing node_modules (this may take a moment)...'));
            await fs.remove(this.cleanupPaths.nodeModules);
            console.log(chalk.gray('   📦 Removed node_modules/'));
        }

        // Remove package-lock.json
        if (await fs.pathExists(this.cleanupPaths.packageLock)) {
            await fs.remove(this.cleanupPaths.packageLock);
            console.log(chalk.gray('   🔒 Removed package-lock.json'));
        }
    }

    async cleanupSpecific(type) {
        console.log(chalk.blue(`🗑️  Bob: Cleaning up ${type}...`));

        switch (type.toLowerCase()) {
            case 'global':
                await this.uninstallGlobal();
                console.log(chalk.green('✅ Global package uninstalled'));
                break;
            case 'data':
                await this.cleanupData();
                console.log(chalk.green('✅ Data directories cleaned'));
                break;
            case 'claude':
                await this.cleanupClaudeIntegration();
                await this.cleanupProjectClaudeDirectories();
                console.log(chalk.green('✅ Claude Code integration cleaned'));
                break;
            case 'config':
                await this.cleanupConfig();
                console.log(chalk.green('✅ Configuration files cleaned'));
                break;
            case 'dependencies':
                await this.cleanupDependencies();
                console.log(chalk.green('✅ Dependencies cleaned'));
                break;
            case 'backup':
                await this.createUninstallBackup();
                console.log(chalk.green('✅ Backup created'));
                break;
            default:
                throw new Error(`Unknown cleanup type: ${type}`);
        }
    }

    async showUninstallStatus() {
        console.log(chalk.red('\n🗑️  AutomatosX Uninstall Status'));
        console.log(chalk.gray('━'.repeat(50)));

        await this.loadPackageInfo();

        // Check global installation
        let globalInstalled = false;
        if (this.packageJson) {
            try {
                const { stdout } = await execAsync(`npm list -g ${this.packageJson.name} --depth=0`, { encoding: 'utf8' });
                globalInstalled = stdout.includes(this.packageJson.name);
            } catch (error) {
                // Not installed globally
            }
        }

        console.log(`${globalInstalled ? chalk.red('🟥 INSTALLED') : chalk.green('✅ NOT INSTALLED')} Global Package`);

        // Check data directories - show complete .defai directory
        const checks = [
            { name: 'DEFAI Directory', path: this.cleanupPaths.defaiData },
            { name: 'Global Claude Commands/AX', path: this.cleanupPaths.claudeCommandsAx },
            { name: 'Global Claude MCP/AX', path: this.cleanupPaths.claudeMcpAx },
            { name: 'Project .claude/commands/ax', path: path.join(this.projectPath, '.claude/commands/ax') },
            { name: 'Project .claude/mcp/ax', path: path.join(this.projectPath, '.claude/mcp/ax') },
            { name: 'Project .claude/styles/ax', path: path.join(this.projectPath, '.claude/styles/ax') },
            { name: 'Node Modules', path: this.cleanupPaths.nodeModules }
        ];

        for (const check of checks) {
            const exists = await fs.pathExists(check.path);
            const status = exists ? chalk.red('🟥 EXISTS') : chalk.green('✅ CLEAN');
            console.log(`${status} ${check.name}: ${check.path}`);
        }

        // Check config files
        for (const configPath of this.cleanupPaths.configs) {
            const exists = await fs.pathExists(configPath);
            const status = exists ? chalk.red('🟥 EXISTS') : chalk.green('✅ CLEAN');
            const fileName = path.basename(configPath);
            console.log(`${status} Config: ${fileName}`);
        }
    }

    async confirmUninstall() {
        console.log(chalk.yellow('\n⚠️  WARNING: This will remove AutomatosX Claude Code integration!'));
        console.log(chalk.yellow('The following will be removed:'));
        console.log(chalk.yellow('  • .claude/commands/ax directory'));
        console.log(chalk.yellow('  • .claude/mcp/ax directory'));
        console.log(chalk.cyan('\n✅ Your project files and dependencies will remain intact.'));

        // Note: In a real CLI, you might want to add interactive confirmation
        // For this implementation, we'll add a safety check
        return true;
    }
}

// CLI execution
async function main() {
    try {
        const uninstallSystem = new UninstallSystem();
        const args = process.argv.slice(2);

        if (args.length === 0 || args[0] === 'status') {
            await uninstallSystem.showUninstallStatus();
        } else if (args[0] === 'all') {
            const confirmed = await uninstallSystem.confirmUninstall();
            if (confirmed) {
                console.log(chalk.red('🚨 Starting complete uninstall...'));
                const results = await uninstallSystem.uninstallComplete();

                if (results.errors.length > 0) {
                    console.log(chalk.red('\n❌ Some operations failed:'));
                    results.errors.forEach(error => console.log(chalk.red(`  • ${error}`)));
                } else {
                    console.log(chalk.green('\n🎉 AutomatosX Claude Code integration removed!'));
                }

                console.log(chalk.cyan('\n🎭 Bob: "Claude integration removed rock-solid!"'));
            } else {
                console.log(chalk.gray('❌ Uninstall cancelled'));
            }
        } else if (args[0] === 'type' && args[1]) {
            const type = args[1];

            if (!['global', 'data', 'claude', 'config', 'dependencies', 'backup'].includes(type)) {
                console.log(chalk.red(`❌ Invalid type: ${type}`));
                console.log('Usage: node uninstall.js type <global|data|claude|config|dependencies|backup>');
                process.exit(1);
            }

            await uninstallSystem.cleanupSpecific(type);
            console.log(chalk.cyan(`\n🎭 Bob: "${type} cleanup completed rock-solid!"`));
        } else if (args[0] === 'backup') {
            await uninstallSystem.createUninstallBackup();
        } else {
            console.log(chalk.red('🗑️  AutomatosX Uninstall System'));
            console.log(chalk.gray('Usage:'));
            console.log('  node uninstall.js               # Show uninstall status');
            console.log('  node uninstall.js status        # Show uninstall status');
            console.log('  node uninstall.js all           # Complete uninstall');
            console.log('  node uninstall.js type global   # Uninstall specific type');
            console.log('  node uninstall.js backup        # Create backup only');
            console.log('\nAvailable types: global, data, claude, config, dependencies, backup');
            console.log('  • global       - Remove global npm package');
            console.log('  • data         - Remove local data directories (.defai)');
            console.log('  • claude       - Remove Claude Code integration (~/.claude/*/ax)');
            console.log('  • config       - Remove configuration files');
            console.log('  • dependencies - Remove node_modules and package-lock.json');
            console.log('  • backup       - Create backup only');
            console.log(chalk.yellow('\n⚠️  WARNING: "all" will completely remove AutomatosX!'));
        }
    } catch (error) {
        console.error(chalk.red('❌ Uninstall failed:'), error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Export for use as module
export { UninstallSystem };

// Run if called directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('uninstall.js'))) {
    main();
}
