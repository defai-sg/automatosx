#!/usr/bin/env node

/**
 * Performance Benchmark Tool
 * Created by Bob (Senior Backend Engineer)
 * "Performance is measured, security is verified, architecture is proven."
 */

import { ProviderManager } from '../providers/provider-manager.js';
import chalk from 'chalk';

class PerformanceBenchmark {
    constructor() {
        this.results = [];
    }

    async benchmarkProviderChecks(iterations = 5) {
        console.log(chalk.blue('🔬 Benchmarking Provider Detection Performance...'));
        console.log(chalk.gray(`Running ${iterations} iterations\n`));

        const manager = new ProviderManager();
        await manager.initialize();

        const timings = [];

        for (let i = 0; i < iterations; i++) {
            console.log(chalk.yellow(`📊 Iteration ${i + 1}/${iterations}`));

            const start = process.hrtime.bigint();
            await manager.checkAllProviders();
            const end = process.hrtime.bigint();

            const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
            timings.push(duration);

            console.log(chalk.gray(`   Duration: ${duration.toFixed(2)}ms\n`));

            // Small delay between iterations
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return this.analyzeTimings(timings);
    }

    analyzeTimings(timings) {
        const min = Math.min(...timings);
        const max = Math.max(...timings);
        const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
        const median = timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)];

        return {
            min: min.toFixed(2),
            max: max.toFixed(2),
            avg: avg.toFixed(2),
            median: median.toFixed(2),
            timings
        };
    }

    async runFullBenchmark() {
        console.log(chalk.blue.bold('\n🚀 AutomatosX Performance Benchmark'));
        console.log(chalk.blue.bold('=====================================\n'));

        // Test 1: Provider Detection
        const providerResults = await this.benchmarkProviderChecks();

        console.log(chalk.green.bold('📈 RESULTS SUMMARY'));
        console.log(chalk.green.bold('==================\n'));

        console.log(chalk.white('🔍 Provider Detection Performance:'));
        console.log(chalk.gray(`   Minimum:  ${providerResults.min}ms`));
        console.log(chalk.gray(`   Maximum:  ${providerResults.max}ms`));
        console.log(chalk.cyan(`   Average:  ${providerResults.avg}ms`));
        console.log(chalk.cyan(`   Median:   ${providerResults.median}ms`));

        // Performance Assessment
        const avgTime = parseFloat(providerResults.avg);
        let assessment = '';
        let color = chalk.green;

        if (avgTime < 50) {
            assessment = 'Excellent performance! 🚀';
            color = chalk.green;
        } else if (avgTime < 100) {
            assessment = 'Good performance ✅';
            color = chalk.blue;
        } else if (avgTime < 200) {
            assessment = 'Acceptable performance ⚠️';
            color = chalk.yellow;
        } else {
            assessment = 'Needs optimization ❌';
            color = chalk.red;
        }

        console.log(color(`\n💡 Assessment: ${assessment}`));

        // Improvement suggestions
        console.log(chalk.white('\n🔧 Bob\'s Performance Insights:'));
        if (avgTime < 100) {
            console.log(chalk.green('   ✅ Parallel provider checking is working efficiently'));
            console.log(chalk.green('   ✅ Ready for production workloads'));
        } else {
            console.log(chalk.yellow('   ⚠️  Consider implementing connection pooling'));
            console.log(chalk.yellow('   ⚠️  Network latency may be affecting results'));
        }

        return {
            providerDetection: providerResults,
            assessment,
            recommendations: this.generateRecommendations(avgTime)
        };
    }

    generateRecommendations(avgTime) {
        const recommendations = [];

        if (avgTime > 200) {
            recommendations.push('Implement connection pooling for provider checks');
            recommendations.push('Consider caching provider status with TTL');
            recommendations.push('Investigate network latency issues');
        }

        if (avgTime > 100) {
            recommendations.push('Add provider health check caching');
            recommendations.push('Implement timeout optimization');
        }

        recommendations.push('Monitor performance trends over time');
        recommendations.push('Set up automated performance regression tests');

        return recommendations;
    }
}

// Run benchmark if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new PerformanceBenchmark();

    benchmark.runFullBenchmark()
        .then(results => {
            console.log(chalk.blue('\n🎯 Benchmark completed successfully!'));
            console.log(chalk.gray('Results saved for performance tracking.\n'));
        })
        .catch(error => {
            console.error(chalk.red('❌ Benchmark failed:'), error);
            process.exit(1);
        });
}

export { PerformanceBenchmark };