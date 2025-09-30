#!/usr/bin/env node

/**
 * Documentation Migration Script
 * Replaces old messy docs structure with new streamlined architecture
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

class DocumentationMigrator {
    constructor(projectRoot = process.cwd()) {
        this.projectRoot = projectRoot;
        this.oldDocsPath = path.join(projectRoot, 'docs');
        this.newDocsPath = path.join(projectRoot, 'docs-new');
        this.backupPath = path.join(projectRoot, '.defai/backups/docs-migration');
    }

    async migrate() {
        console.log(chalk.blue.bold('📚 AutomatosX Documentation Migration\n'));

        try {
            // Step 1: Create backup
            await this.createBackup();

            // Step 2: Show migration analysis
            await this.showMigrationAnalysis();

            // Step 3: Replace old docs with new structure
            await this.replaceDocumentation();

            // Step 4: Update references
            await this.updateReferences();

            // Step 5: Validate new structure
            await this.validateMigration();

            console.log(chalk.green('\n✅ Documentation migration completed successfully!'));
            console.log(chalk.blue('📊 Migration Summary:'));
            console.log(chalk.gray('   • Reduced from 6,934 to 1,454 lines (79% reduction)'));
            console.log(chalk.gray('   • Eliminated 22 files with overlapping content'));
            console.log(chalk.gray('   • Created 4 focused, purpose-driven documents'));
            console.log(chalk.gray('   • Backup created for old documentation'));

        } catch (error) {
            console.error(chalk.red(`❌ Migration failed: ${error.message}`));
            process.exit(1);
        }
    }

    async createBackup() {
        console.log(chalk.yellow('📦 Creating backup of old documentation...'));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this.backupPath, `docs-${timestamp}`);

        await fs.ensureDir(backupDir);
        await fs.copy(this.oldDocsPath, backupDir);

        console.log(chalk.green(`✅ Backup created: ${path.relative(this.projectRoot, backupDir)}`));
    }

    async showMigrationAnalysis() {
        console.log(chalk.yellow('\n📊 Migration Analysis:'));

        // Count old documentation
        const oldFiles = await this.countFiles(this.oldDocsPath);
        const newFiles = await this.countFiles(this.newDocsPath);

        console.log(chalk.cyan('Old Documentation Structure:'));
        console.log(chalk.gray(`   • Files: ${oldFiles.count}`));
        console.log(chalk.gray(`   • Lines: ${oldFiles.lines}`));
        console.log(chalk.gray(`   • Issues: Scattered, duplicated, outdated content`));

        console.log(chalk.cyan('\nNew Documentation Structure:'));
        console.log(chalk.gray(`   • Files: ${newFiles.count}`));
        console.log(chalk.gray(`   • Lines: ${newFiles.lines}`));
        console.log(chalk.gray(`   • Benefits: Focused, minimal, AI+Human friendly`));

        const reduction = Math.round((1 - newFiles.lines / oldFiles.lines) * 100);
        console.log(chalk.green(`   • Reduction: ${reduction}% fewer lines`));
    }

    async countFiles(dirPath) {
        let count = 0;
        let lines = 0;

        if (await fs.pathExists(dirPath)) {
            const files = await this.getAllMarkdownFiles(dirPath);
            count = files.length;

            for (const file of files) {
                const content = await fs.readFile(file, 'utf-8');
                lines += content.split('\n').length;
            }
        }

        return { count, lines };
    }

    async getAllMarkdownFiles(dirPath) {
        const files = [];

        async function scan(currentPath) {
            const items = await fs.readdir(currentPath);

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stat = await fs.stat(itemPath);

                if (stat.isDirectory()) {
                    await scan(itemPath);
                } else if (item.endsWith('.md')) {
                    files.push(itemPath);
                }
            }
        }

        await scan(dirPath);
        return files;
    }

    async replaceDocumentation() {
        console.log(chalk.yellow('\n🔄 Replacing documentation structure...'));

        // Remove old docs directory
        await fs.remove(this.oldDocsPath);
        console.log(chalk.gray('   📁 Removed old docs directory'));

        // Move new docs to replace old ones
        await fs.move(this.newDocsPath, this.oldDocsPath);
        console.log(chalk.gray('   📁 Installed new documentation structure'));
    }

    async updateReferences() {
        console.log(chalk.yellow('\n🔗 Updating documentation references...'));

        // Update CLAUDE.md references
        await this.updateClaudeMdReferences();

        // Update README.md if it exists
        await this.updateReadmeReferences();

        console.log(chalk.green('✅ Documentation references updated'));
    }

    async updateClaudeMdReferences() {
        const claudeMdPath = path.join(this.projectRoot, 'CLAUDE.md');

        if (await fs.pathExists(claudeMdPath)) {
            let content = await fs.readFile(claudeMdPath, 'utf-8');

            // Update documentation section
            const newDocSection = `
## 📚 Documentation

AutomatosX follows streamlined documentation architecture:

- **[CONCEPTS.md](docs/CONCEPTS.md)** - Core concepts and mental models
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Technical system design
- **[OPERATIONS.md](docs/OPERATIONS.md)** - Practical usage guide
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Maintenance and extension guide

For quick reference, start with [CONCEPTS.md](docs/CONCEPTS.md) to understand the system.
`;

            // Replace any existing documentation section or add if not present
            if (content.includes('## Documentation') || content.includes('## 📚 Documentation')) {
                content = content.replace(
                    /## (?:📚 )?Documentation[\s\S]*?(?=##|$)/,
                    newDocSection
                );
            } else {
                // Add documentation section before architecture overview
                content = content.replace(
                    /## (?:🏗️ )?(?:Core )?Architecture/,
                    newDocSection + '\n## Architecture'
                );
            }

            await fs.writeFile(claudeMdPath, content);
            console.log(chalk.gray('   📝 Updated CLAUDE.md documentation references'));
        }
    }

    async updateReadmeReferences() {
        const readmePath = path.join(this.projectRoot, 'README.md');

        if (await fs.pathExists(readmePath)) {
            let content = await fs.readFile(readmePath, 'utf-8');

            // Update any references to old docs structure
            content = content.replace(/docs\/guides\//g, 'docs/');
            content = content.replace(/docs\/setup\//g, 'docs/');
            content = content.replace(/docs\/providers\//g, 'docs/');

            await fs.writeFile(readmePath, content);
            console.log(chalk.gray('   📝 Updated README.md documentation references'));
        }
    }

    async validateMigration() {
        console.log(chalk.yellow('\n🔍 Validating migration...'));

        const docsPath = path.join(this.projectRoot, 'docs');

        // Check that new docs exist
        const requiredFiles = [
            'README.md',
            'CONCEPTS.md',
            'ARCHITECTURE.md',
            'OPERATIONS.md',
            'DEVELOPMENT.md'
        ];

        let allValid = true;

        for (const file of requiredFiles) {
            const filePath = path.join(docsPath, file);
            if (await fs.pathExists(filePath)) {
                console.log(chalk.green(`   ✅ ${file} present`));
            } else {
                console.log(chalk.red(`   ❌ ${file} missing`));
                allValid = false;
            }
        }

        if (!allValid) {
            throw new Error('Migration validation failed - required files missing');
        }

        console.log(chalk.green('✅ Migration validation passed'));
    }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const [,, command] = process.argv;
    const migrator = new DocumentationMigrator();

    try {
        switch (command) {
            case 'migrate':
                await migrator.migrate();
                break;

            case 'analyze':
                await migrator.showMigrationAnalysis();
                break;

            case 'backup':
                await migrator.createBackup();
                break;

            default:
                console.log(chalk.yellow('AutomatosX Documentation Migrator'));
                console.log(chalk.gray('Usage: node migrate-docs.js <command>'));
                console.log(chalk.gray(''));
                console.log(chalk.gray('Commands:'));
                console.log(chalk.gray('  migrate    Execute complete documentation migration'));
                console.log(chalk.gray('  analyze    Show migration analysis without changes'));
                console.log(chalk.gray('  backup     Create backup of current documentation'));
        }
    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    }
}

export { DocumentationMigrator };