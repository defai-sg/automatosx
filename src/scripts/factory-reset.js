#!/usr/bin/env node

/**
 * AutomatosX Factory Reset Script
 * Simplified interface for factory reset operations
 */

import { FilesystemManager } from '../core/filesystem-manager.js';
import chalk from 'chalk';

async function factoryReset() {
    console.log(chalk.blue.bold('🏭 AutomatosX Factory Reset\n'));

    try {
        const manager = new FilesystemManager();

        // Show what would be removed
        console.log(chalk.yellow('🔍 Analyzing system files...'));
        await manager.factoryReset({ dryRun: true, backupFirst: false });

        console.log(chalk.cyan('\n🤔 This will:'));
        console.log(chalk.yellow('  ✅ Preserve your workspace data (.defai/workspaces)'));
        console.log(chalk.yellow('  ✅ Preserve your memory/chat history'));
        console.log(chalk.yellow('  ✅ Preserve your configuration files'));
        console.log(chalk.yellow('  🗑️  Remove all system files'));
        console.log(chalk.yellow('  🗑️  Remove generated/cached files'));
        console.log(chalk.yellow('  📦 Create backup before proceeding'));

        // For now, just show the plan - actual execution would need user confirmation
        console.log(chalk.green('\n✅ Factory reset analysis completed'));
        console.log(chalk.blue('💡 To execute: node src/core/filesystem-manager.js factory-reset'));
        console.log(chalk.gray('💡 To preview only: node src/core/filesystem-manager.js factory-reset --dry-run'));

    } catch (error) {
        console.error(chalk.red(`❌ Factory reset failed: ${error.message}`));
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    factoryReset().catch(console.error);
}

export { factoryReset };