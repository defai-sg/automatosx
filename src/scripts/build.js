#!/usr/bin/env node

/**
 * AutomatosX Enhanced Build Script
 * Bob's rock-solid build system with parallel execution and performance tracking
 *
 * Copyright 2025 DEFAI Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { DefaiError, CommandSecurity } from './utils/security-utils.js';
import { globalPerformanceTracker, AsyncUtils } from './utils/performance-utils.js';
import { LoggerFactory, OperationLogger } from './utils/logging-utils.js';

const logger = LoggerFactory.getLogger('build-system');

/**
 * Enhanced command runner with security and timeout
 */
async function runCommand(command, args = [], options = {}) {
    const fullCommand = `${command} ${args.join(' ')}`;

    // Validate command security
    CommandSecurity.validateCommand(fullCommand, 'test_commands');

    const timeout = options.timeout || 300000; // 5 minutes default
    const controller = new AbortController();

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            controller.abort();
            reject(new DefaiError(
                `Command timed out after ${timeout}ms`,
                'COMMAND_TIMEOUT',
                { command: fullCommand, timeout }
            ));
        }, timeout);

        const process = spawn(command, args, {
            stdio: options.silent ? 'pipe' : 'inherit',
            signal: controller.signal,
            ...options
        });

        let stdout = '';
        let stderr = '';

        if (options.silent) {
            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
        }

        process.on('close', (code) => {
            clearTimeout(timeoutId);

            if (code === 0) {
                resolve({ stdout, stderr, code });
            } else {
                reject(new DefaiError(
                    `Command failed with exit code ${code}`,
                    'COMMAND_FAILED',
                    { command: fullCommand, code, stdout, stderr }
                ));
            }
        });

        process.on('error', (error) => {
            clearTimeout(timeoutId);
            reject(new DefaiError(
                `Command execution error: ${error.message}`,
                'COMMAND_ERROR',
                { command: fullCommand, originalError: error.message }
            ));
        });
    });
}

/**
 * Build step definition
 */
class BuildStep {
    constructor(id, name, command, args = [], options = {}) {
        this.id = id;
        this.name = name;
        this.command = command;
        this.args = args;
        this.options = options;
        this.canRunInParallel = options.parallel || false;
        this.dependencies = options.dependencies || [];
        this.optional = options.optional || false;
    }

    async execute() {
        const stepLogger = logger.child(this.id);

        try {
            await stepLogger.info(`Starting: ${this.name}`);

            const result = await globalPerformanceTracker.track(
                `build-step-${this.id}`,
                () => runCommand(this.command, this.args, this.options),
                this.name
            );

            await stepLogger.info(`Completed: ${this.name}`, {
                exitCode: result.code,
                hasOutput: !!(result.stdout || result.stderr)
            });

            return result;

        } catch (error) {
            if (this.optional) {
                await stepLogger.warn(`Optional step failed: ${this.name}`, {
                    error: error.message
                });
                return { code: 0, stdout: '', stderr: '', skipped: true };
            }

            await stepLogger.error(`Failed: ${this.name}`, {
                error: error.message,
                code: error.context?.code
            });

            throw error;
        }
    }
}

/**
 * Enhanced build system with parallel execution
 */
async function buildSystem() {
    const operationId = 'build-system';
    const opLogger = new OperationLogger(operationId, logger);

    try {
        await opLogger.logStep('initialization', 'Starting AutomatosX build process');

        console.log(chalk.blue('🏗️  AutomatosX Enhanced Build Process'));
        console.log(chalk.blue('====================================\n'));

        // Start resource monitoring
        if (process.env.NODE_ENV !== 'production') {
            const { globalResourceMonitor } = await import('./utils/performance-utils.js');
            globalResourceMonitor.start();
        }

        // Define build steps
        const buildSteps = [
            new BuildStep(
                'validate-profiles',
                'Validating agent profiles',
                'node',
                ['src/index.js', 'validate'],
                { parallel: true }
            ),
            new BuildStep(
                'validate-architecture',
                'Validating system architecture',
                'node',
                ['src/scripts/validate-architecture.js'],
                { parallel: true }
            ),
            new BuildStep(
                'test-system',
                'Running system tests',
                'npm',
                ['test'],
                { dependencies: ['validate-profiles'], timeout: 180000 }
            ),
            new BuildStep(
                'check-providers',
                'Checking provider connectivity',
                'node',
                ['src/index.js', 'status'],
                { dependencies: ['validate-profiles'], timeout: 60000 }
            ),
            new BuildStep(
                'security-audit',
                'Running security audit',
                'npm',
                ['audit', '--audit-level', 'moderate'],
                { optional: true, parallel: true, silent: true }
            )
        ];

        await opLogger.logStep('step-analysis', 'Analyzing build step dependencies');

        // Group steps by execution phase
        const parallelSteps = buildSteps.filter(step =>
            step.canRunInParallel && step.dependencies.length === 0
        );

        const sequentialSteps = buildSteps.filter(step =>
            !step.canRunInParallel || step.dependencies.length > 0
        );

        // Phase 1: Execute parallel steps
        if (parallelSteps.length > 0) {
            await opLogger.logStep('parallel-execution', `Executing ${parallelSteps.length} parallel steps`);

            console.log(chalk.yellow('⚡ Phase 1: Parallel validation and checks...'));

            const parallelResults = await globalPerformanceTracker.track(
                'parallel-phase',
                () => AsyncUtils.processWithConcurrency(
                    parallelSteps,
                    step => step.execute(),
                    3 // Max 3 concurrent operations
                ),
                'Parallel build steps'
            );

            // Check for failures in parallel steps
            const failures = parallelResults
                .map((result, index) => ({ result, step: parallelSteps[index] }))
                .filter(({ result, step }) => result instanceof Error && !step.optional);

            if (failures.length > 0) {
                throw new DefaiError(
                    `${failures.length} parallel steps failed`,
                    'PARALLEL_STEPS_FAILED',
                    { failures: failures.map(f => f.step.name) }
                );
            }

            console.log(chalk.green(`✅ Parallel phase completed (${parallelSteps.length} steps)\n`));
        }

        // Phase 2: Execute sequential steps
        if (sequentialSteps.length > 0) {
            await opLogger.logStep('sequential-execution', `Executing ${sequentialSteps.length} sequential steps`);

            console.log(chalk.yellow('🔄 Phase 2: Sequential operations...'));

            for (const step of sequentialSteps) {
                console.log(chalk.yellow(`📋 ${step.name}...`));

                await step.execute();

                console.log(chalk.green(`✅ ${step.name} completed\n`));
            }
        }

        // Generate build report
        await opLogger.logStep('reporting', 'Generating build report');

        const performanceReport = globalPerformanceTracker.generateReport();
        const memoryUsage = process.memoryUsage();

        console.log(chalk.green('🎉 Build completed successfully!'));
        console.log(chalk.blue('\n📦 System is ready for deployment'));

        console.log(chalk.blue('\n📊 Build Summary:'));
        console.log(chalk.gray(`   Total Steps: ${buildSteps.length}`));
        console.log(chalk.gray(`   Parallel Steps: ${parallelSteps.length}`));
        console.log(chalk.gray(`   Sequential Steps: ${sequentialSteps.length}`));
        console.log(chalk.gray(`   Memory Usage: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`));

        // Stop resource monitoring
        if (process.env.NODE_ENV !== 'production') {
            const { globalResourceMonitor } = await import('./utils/performance-utils.js');
            globalResourceMonitor.stop();

            const summary = globalResourceMonitor.getSummary();
            console.log(chalk.gray(`   Avg Memory: ${summary.memory?.average || 'N/A'}MB`));
        }

        // Save performance report to file
        const reportsDir = path.join('workspaces', 'logs', 'build-reports');
        await fs.ensureDir(reportsDir);

        const reportFile = path.join(reportsDir, `build-${Date.now()}.txt`);
        await fs.writeFile(reportFile, performanceReport);

        console.log(chalk.gray(`   Performance Report: ${reportFile}`));

        await opLogger.complete('success', {
            totalSteps: buildSteps.length,
            parallelSteps: parallelSteps.length,
            memoryUsage: Math.round(memoryUsage.rss / 1024 / 1024),
            reportFile
        });

    } catch (error) {
        await opLogger.fail(error);

        console.error(chalk.red('❌ Build failed:'), error.message);

        if (error.context) {
            console.error(chalk.gray('Context:'), JSON.stringify(error.context, null, 2));
        }

        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    buildSystem().catch(console.error);
}

export { buildSystem, runCommand, BuildStep };
