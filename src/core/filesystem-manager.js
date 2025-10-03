#!/usr/bin/env node

/**
 * AutomatosX Filesystem Manager
 * Manages files based on the filesystem mapping for safe operations
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { glob } from 'glob';

export class FilesystemManager {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.mapPath = path.join(projectRoot, '.defai/filesystem-map.json');
        this.map = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            this.map = await fs.readJson(this.mapPath);
            this.initialized = true;
            console.log(chalk.green(`✅ Filesystem map loaded (v${this.map.version})`));
        } catch (error) {
            throw new Error(`Failed to load filesystem map: ${error.message}`);
        }
    }

    /**
     * Get all files matching a category
     */
    async getFilesByCategory(categoryName) {
        await this.initialize();

        const category = this.map.categories[categoryName];
        if (!category) {
            throw new Error(`Unknown category: ${categoryName}`);
        }

        let allFiles = [];

        for (const pattern of category.patterns) {
            const files = await glob(pattern, {
                cwd: this.projectRoot,
                absolute: true,
                ignore: category.exceptions || []
            });
            allFiles = allFiles.concat(files);
        }

        return allFiles;
    }

    /**
     * Factory reset - remove all AutomatosX files except user data
     */
    async factoryReset(options = {}) {
        await this.initialize();

        console.log(chalk.yellow('🏭 Starting Factory Reset...'));

        const { dryRun = false, backupFirst = true } = options;
        const operations = this.map.operations.factory_reset;

        // Step 1: Backup user data
        if (backupFirst) {
            await this.backupUserData();
        }

        // Step 2: Collect files to remove based on operation categories
        const filesToRemove = [];

        for (const category of operations.remove_categories) {
            const files = await this.getFilesByCategory(category);
            filesToRemove.push(...files);
        }

        console.log(chalk.cyan(`📋 Found ${filesToRemove.length} files to remove`));

        if (dryRun) {
            console.log(chalk.yellow('🔍 DRY RUN - Files that would be removed:'));
            filesToRemove.forEach(file => {
                const relativePath = path.relative(this.projectRoot, file);
                console.log(chalk.gray(`  - ${relativePath}`));
            });
            return;
        }

        // Actually remove files
        let removedCount = 0;
        for (const file of filesToRemove) {
            try {
                if (await fs.pathExists(file)) {
                    await fs.remove(file);
                    removedCount++;
                }
            } catch (error) {
                console.log(chalk.red(`❌ Failed to remove ${file}: ${error.message}`));
            }
        }

        // Step 3: Remove specified directories
        for (const dir of this.map.directories.remove_on_factory_reset) {
            const dirPath = path.join(this.projectRoot, dir);
            try {
                if (await fs.pathExists(dirPath)) {
                    await fs.remove(dirPath);
                    console.log(chalk.gray(`📁 Removed directory: ${dir}`));
                }
            } catch (error) {
                console.log(chalk.red(`❌ Failed to remove directory ${dir}: ${error.message}`));
            }
        }

        console.log(chalk.green(`✅ Factory reset completed: ${removedCount} files removed`));
        console.log(chalk.blue('💡 Run /ax:init to reinitialize the system'));
    }

    /**
     * Safe upgrade - preserve user data and configurations
     */
    async safeUpgrade(newVersion, options = {}) {
        await this.initialize();

        console.log(chalk.yellow(`🔄 Starting Safe Upgrade to v${newVersion}...`));

        const { dryRun = false } = options;

        // Step 1: Backup user configuration and data
        const backupDir = await this.backupUserData();
        const configBackupDir = await this.backupUserConfiguration();

        console.log(chalk.green(`📦 Backups created:`));
        console.log(chalk.gray(`  - User data: ${backupDir}`));
        console.log(chalk.gray(`  - Configuration: ${configBackupDir}`));

        // Step 2: Identify files that need migration
        const migrationRules = this.getMigrationRules(this.map.version, newVersion);

        if (migrationRules) {
            console.log(chalk.cyan('🔧 Migration rules found, will apply during upgrade'));

            if (dryRun) {
                console.log(chalk.yellow('🔍 DRY RUN - Migration actions:'));
                this.showMigrationPlan(migrationRules);
                return;
            }

            await this.applyMigrationRules(migrationRules);
        }

        console.log(chalk.green('✅ Safe upgrade preparation completed'));
        console.log(chalk.blue('💡 Update system files and run /ax:init to complete upgrade'));
    }

    /**
     * Backup user data
     */
    async backupUserData() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.projectRoot, '.defai/backups', `user-data-${timestamp}`);

        await fs.ensureDir(backupDir);

        const userDataFiles = await this.getFilesByCategory('user_data');
        const userConfigFiles = await this.getFilesByCategory('user_configuration');

        const allUserFiles = [...userDataFiles, ...userConfigFiles];

        for (const file of allUserFiles) {
            if (await fs.pathExists(file)) {
                const relativePath = path.relative(this.projectRoot, file);
                const backupPath = path.join(backupDir, relativePath);

                await fs.ensureDir(path.dirname(backupPath));
                await fs.copy(file, backupPath);
            }
        }

        console.log(chalk.green(`📦 User data backed up to: ${path.relative(this.projectRoot, backupDir)}`));
        return backupDir;
    }

    /**
     * Backup user configuration
     */
    async backupUserConfiguration() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.projectRoot, '.defai/backups', `config-${timestamp}`);

        await fs.ensureDir(backupDir);

        const configFiles = await this.getFilesByCategory('user_configuration');

        for (const file of configFiles) {
            if (await fs.pathExists(file)) {
                const relativePath = path.relative(this.projectRoot, file);
                const backupPath = path.join(backupDir, relativePath);

                await fs.ensureDir(path.dirname(backupPath));
                await fs.copy(file, backupPath);
            }
        }

        console.log(chalk.green(`⚙️ Configuration backed up to: ${path.relative(this.projectRoot, backupDir)}`));
        return backupDir;
    }

    /**
     * Get migration rules between versions
     */
    getMigrationRules(fromVersion, toVersion) {
        const migrationKey = `v${fromVersion.split('.')[0]}_to_v${toVersion.split('.')[0]}`;
        return this.map.migration_rules[migrationKey];
    }

    /**
     * Apply migration rules
     */
    async applyMigrationRules(rules) {
        console.log(chalk.cyan('🔧 Applying migration rules...'));

        // Apply file moves
        if (rules.file_moves) {
            for (const [from, to] of Object.entries(rules.file_moves)) {
                const fromFiles = await glob(from, { cwd: this.projectRoot });

                for (const file of fromFiles) {
                    const fromPath = path.join(this.projectRoot, file);
                    const toPath = path.join(this.projectRoot, to, path.basename(file));

                    if (await fs.pathExists(fromPath)) {
                        await fs.ensureDir(path.dirname(toPath));
                        await fs.move(fromPath, toPath);
                        console.log(chalk.gray(`📁 Moved: ${file} → ${to}`));
                    }
                }
            }
        }

        // Remove deprecated files
        if (rules.deprecated_files) {
            for (const file of rules.deprecated_files) {
                const filePath = path.join(this.projectRoot, file);
                if (await fs.pathExists(filePath)) {
                    await fs.remove(filePath);
                    console.log(chalk.gray(`🗑️ Removed deprecated: ${file}`));
                }
            }
        }
    }

    /**
     * Show migration plan for dry run
     */
    showMigrationPlan(rules) {
        if (rules.file_moves) {
            console.log(chalk.yellow('📁 File moves:'));
            for (const [from, to] of Object.entries(rules.file_moves)) {
                console.log(chalk.gray(`  ${from} → ${to}`));
            }
        }

        if (rules.deprecated_files) {
            console.log(chalk.yellow('🗑️ Files to remove:'));
            rules.deprecated_files.forEach(file => {
                console.log(chalk.gray(`  - ${file}`));
            });
        }
    }

    /**
     * Validate system integrity
     */
    async validateSystemIntegrity() {
        await this.initialize();

        console.log(chalk.cyan('🔍 Validating system integrity...'));

        const validation = this.map.validation;
        let allValid = true;

        // Check required files
        for (const file of validation.required_files) {
            const filePath = path.join(this.projectRoot, file);
            if (!await fs.pathExists(filePath)) {
                console.log(chalk.red(`❌ Missing required file: ${file}`));
                allValid = false;
            } else {
                console.log(chalk.green(`✅ Required file present: ${file}`));
            }
        }

        return allValid;
    }

    /**
     * Create required directory structure
     */
    async createDirectoryStructure() {
        await this.initialize();

        console.log(chalk.cyan('📁 Creating directory structure...'));

        for (const dir of this.map.directories.create_on_init) {
            const dirPath = path.join(this.projectRoot, dir);
            await fs.ensureDir(dirPath);
            console.log(chalk.gray(`📁 Created: ${dir}`));
        }

        console.log(chalk.green('✅ Directory structure created'));
    }

    /**
     * Get system statistics
     */
    async getSystemStatistics() {
        await this.initialize();

        const stats = {
            version: this.map.version,
            categories: {},
            totalFiles: 0
        };

        for (const [categoryName, category] of Object.entries(this.map.categories)) {
            const files = await this.getFilesByCategory(categoryName);
            stats.categories[categoryName] = {
                count: files.length,
                description: category.description
            };
            stats.totalFiles += files.length;
        }

        return stats;
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const [,, command, ...args] = process.argv;
    const manager = new FilesystemManager();

    try {
        switch (command) {
            case 'factory-reset':
                await manager.factoryReset({
                    dryRun: args.includes('--dry-run'),
                    backupFirst: !args.includes('--no-backup')
                });
                break;

            case 'safe-upgrade':
                const version = args[0];
                if (!version) throw new Error('Version required for safe-upgrade');
                await manager.safeUpgrade(version, {
                    dryRun: args.includes('--dry-run')
                });
                break;

            case 'validate':
                const isValid = await manager.validateSystemIntegrity();
                process.exit(isValid ? 0 : 1);
                break;

            case 'stats':
                const stats = await manager.getSystemStatistics();
                console.log(JSON.stringify(stats, null, 2));
                break;

            case 'backup':
                await manager.backupUserData();
                break;

            default:
                console.log(chalk.yellow('Usage: node filesystem-manager.js <command>'));
                console.log(chalk.gray('Commands:'));
                console.log(chalk.gray('  factory-reset [--dry-run] [--no-backup]'));
                console.log(chalk.gray('  safe-upgrade <version> [--dry-run]'));
                console.log(chalk.gray('  validate'));
                console.log(chalk.gray('  stats'));
                console.log(chalk.gray('  backup'));
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}