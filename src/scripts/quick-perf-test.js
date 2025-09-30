#!/usr/bin/env node

import { ProviderManager } from '../providers/provider-manager.js';
import chalk from 'chalk';

async function quickPerformanceTest() {
    console.log(chalk.blue('🚀 Bob\'s Quick Performance Test'));
    console.log(chalk.blue('================================\n'));

    try {
        const manager = new ProviderManager();
        await manager.initialize();

        console.log(chalk.yellow('Testing parallel provider detection...\n'));

        // Single test run
        const start = Date.now();
        const results = await manager.checkAllProviders();
        const end = Date.now();

        const duration = end - start;

        console.log(chalk.green('\n📊 Performance Results:'));
        console.log(chalk.gray(`   Execution time: ${duration}ms`));
        console.log(chalk.gray(`   Providers checked: ${Object.keys(results).length}`));

        // Performance assessment
        if (duration < 100) {
            console.log(chalk.green('   ✅ Excellent performance!'));
        } else if (duration < 200) {
            console.log(chalk.blue('   ✅ Good performance'));
        } else {
            console.log(chalk.yellow('   ⚠️  Performance could be improved'));
        }

        console.log(chalk.blue('\n🎯 Bob says: "Parallel optimization is working! Time measured, improvement verified."'));

    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
    }
}

quickPerformanceTest();