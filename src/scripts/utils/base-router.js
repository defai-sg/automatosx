#!/usr/bin/env node

/**
 * AutomatosX Base Router
 * Bob's unified router foundation for agent and role routing
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
import crypto from 'crypto';
import { DefaiError, InputValidator, CommandSecurity, FileSecurity } from './security-utils.js';
import { globalPerformanceTracker, globalConfigCache } from './performance-utils.js';
import { LoggerFactory, OperationLogger } from './logging-utils.js';

/**
 * Base router class with common functionality
 */
export class BaseRouter {
    constructor(routerType, options = {}) {
        this.routerType = routerType;
        this.logger = LoggerFactory.getLogger(`${routerType}-router`);
        this.workspaceBase = options.workspaceBase || path.join(process.cwd(), '.defai', 'workspaces');
        this.taskHistoryLimit = options.taskHistoryLimit || 100;
        this.enablePerformanceTracking = options.enablePerformanceTracking !== false;
        this.enableCaching = options.enableCaching !== false;
    }

    /**
     * Validate and sanitize input arguments
     * @param {string[]} args - Command line arguments
     * @returns {Object} - Validated arguments
     */
    validateArguments(args) {
        if (args.length < 2) {
            throw new DefaiError(
                'Insufficient arguments provided',
                'INSUFFICIENT_ARGS',
                { required: 2, provided: args.length }
            );
        }

        const targetName = InputValidator.validateAgentName(args[0]);
        const task = InputValidator.validateTask(args.slice(1).join(' '));

        return { targetName, task };
    }

    /**
     * Get configuration for a target (agent/role)
     * @param {string} targetName - Target identifier
     * @param {Object} configMap - Configuration mapping
     * @returns {Object} - Target configuration
     */
    getTargetConfig(targetName, configMap) {
        const cacheKey = `config_${this.routerType}_${targetName}`;

        if (this.enableCaching) {
            const cached = globalConfigCache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // Resolve agent name if using dynamic loader
        let resolvedName = targetName;
        if (this.roleLoader && typeof this.roleLoader.resolveAgentName === 'function') {
            resolvedName = this.roleLoader.resolveAgentName(targetName);
        }

        // Try both original name and resolved name
        let config = configMap[targetName] || configMap[resolvedName];

        if (!config) {
            throw new DefaiError(
                `Unknown ${this.routerType}: ${targetName}`,
                'UNKNOWN_TARGET',
                { targetName, availableTargets: Object.keys(configMap) }
            );
        }

        if (this.enableCaching) {
            globalConfigCache.set(cacheKey, config, 300000); // 5 minutes cache
        }

        return config;
    }

    /**
     * Create workspace directories for a target
     * @param {string} targetName - Target identifier
     * @returns {string} - Workspace directory path
     */
    async createWorkspace(targetName) {
        const workspaceDir = path.join(this.workspaceBase, `${this.routerType}s`, targetName);

        const directories = ['outputs', 'logs', 'tasks', 'context', 'artifacts'];

        for (const dir of directories) {
            const dirPath = path.join(workspaceDir, dir);
            const validatedPath = await FileSecurity.ensureSecureDir(dirPath, this.workspaceBase);
            await fs.ensureDir(validatedPath);
        }

        await this.logger.debug(`Workspace created for ${this.routerType}: ${targetName}`, {
            workspaceDir,
            directories
        });

        return workspaceDir;
    }

    /**
     * Generate secure task file name
     * @param {string} task - Task description
     * @returns {string} - Secure file name
     */
    generateTaskFileName(task) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const slug = CommandSecurity.generateSecureSlug(task);
        return `${timestamp}_${slug}.md`;
    }

    /**
     * Save task to file
     * @param {string} workspaceDir - Workspace directory
     * @param {string} task - Task description
     * @param {Object} targetConfig - Target configuration
     * @param {Object} metadata - Additional metadata
     * @returns {string} - Task file path
     */
    async saveTask(workspaceDir, task, targetConfig, metadata = {}) {
        const fileName = this.generateTaskFileName(task);
        const taskFile = path.join(workspaceDir, 'tasks', fileName);

        // Validate file path and extension
        const validatedPath = InputValidator.validatePath(taskFile, this.workspaceBase);
        FileSecurity.validateFileExtension(validatedPath, ['.md']);

        const taskContent = this.generateTaskContent(task, targetConfig, metadata);

        await fs.writeFile(validatedPath, taskContent);

        await this.logger.info(`Task saved`, {
            targetType: this.routerType,
            targetName: targetConfig?.name || targetConfig?.title,
            taskFile: fileName,
            taskLength: task.length
        });

        return validatedPath;
    }

    /**
     * Generate task content (to be overridden by subclasses)
     * @param {string} task - Task description
     * @param {Object} targetConfig - Target configuration
     * @param {Object} metadata - Additional metadata
     * @returns {string} - Task content
     */
    generateTaskContent(task, targetConfig, metadata) {
        const timestamp = new Date().toISOString();

        return `# ${this.routerType.charAt(0).toUpperCase() + this.routerType.slice(1)} Task: ${task}

## Task Information
- **Timestamp**: ${timestamp}
- **Target**: ${targetConfig?.name || targetConfig?.title}
- **Type**: ${this.routerType}
- **Task**: ${task}

## Configuration
\`\`\`json
${JSON.stringify(targetConfig, null, 2)}
\`\`\`

## Metadata
\`\`\`json
${JSON.stringify(metadata, null, 2)}
\`\`\`

## Status
🔄 **Ready for Processing**

This task has been logged and is ready for processing by the AutomatosX system.
`;
    }

    /**
     * Create log entry
     * @param {string} workspaceDir - Workspace directory
     * @param {string} targetName - Target name
     * @param {string} task - Task description
     * @param {Object} targetConfig - Target configuration
     * @param {string} taskFile - Task file path
     * @returns {string} - Log file path
     */
    async createLogEntry(workspaceDir, targetName, task, targetConfig, taskFile) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const logFile = path.join(workspaceDir, 'logs', `${timestamp}_task_log.json`);

        const logEntry = {
            timestamp: new Date().toISOString(),
            routerType: this.routerType,
            targetName,
            targetConfig: {
                name: targetConfig?.name || targetConfig?.title,
                type: this.routerType,
                ...(targetConfig?.role && { role: targetConfig.role }),
                ...(targetConfig?.specialties && { specialties: targetConfig.specialties }),
                ...(targetConfig?.expertise && { expertise: targetConfig.expertise })
            },
            task: {
                description: task,
                length: task.length,
                wordCount: task.split(' ').length
            },
            files: {
                taskFile: path.basename(taskFile),
                logFile: path.basename(logFile)
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            status: 'logged'
        };

        const validatedLogPath = InputValidator.validatePath(logFile, this.workspaceBase);
        await fs.writeFile(validatedLogPath, JSON.stringify(logEntry, null, 2));

        return validatedLogPath;
    }

    /**
     * Clean old task files to maintain history limit
     * @param {string} workspaceDir - Workspace directory
     */
    async cleanOldTasks(workspaceDir) {
        try {
            const tasksDir = path.join(workspaceDir, 'tasks');
            const files = await fs.readdir(tasksDir);

            if (files.length <= this.taskHistoryLimit) {
                return;
            }

            // Sort by creation time (filename contains timestamp)
            const sortedFiles = files
                .filter(f => f.endsWith('.md'))
                .sort()
                .slice(0, files.length - this.taskHistoryLimit);

            for (const file of sortedFiles) {
                const filePath = path.join(tasksDir, file);
                await fs.remove(filePath);
            }

            await this.logger.debug(`Cleaned ${sortedFiles.length} old task files`, {
                workspaceDir,
                filesRemoved: sortedFiles.length,
                historyLimit: this.taskHistoryLimit
            });

        } catch (error) {
            await this.logger.warn('Failed to clean old tasks', {
                error: error.message,
                workspaceDir
            });
        }
    }

    /**
     * Display usage information
     * @param {Object} configMap - Configuration mapping
     * @param {Object} examples - Usage examples
     */
    displayUsage(configMap, examples = {}) {
        console.log(`🎭 **AutomatosX ${this.routerType.charAt(0).toUpperCase() + this.routerType.slice(1)} Router**\n`);

        console.log('📝 **Usage Format:**');
        console.log(`  node ${this.routerType}-router.js <target_name> <task>\n`);

        if (examples.basic) {
            console.log('💡 **Usage Examples:**');
            examples.basic.forEach(example => {
                console.log(`  ${example}`);
            });
            console.log();
        }

        console.log(`👥 **Available ${Object.keys(configMap).length} ${this.routerType}:**\n`);

        // Group targets by category if available
        this.displayTargetsByCategory(configMap);

        console.log('\n🚀 **Key Features:**');
        console.log('✅ Secure input validation and sanitization');
        console.log('✅ Performance tracking and caching');
        console.log('✅ Complete workspace management');
        console.log('✅ Task history and artifact preservation');
        console.log('✅ Unified logging and error handling');
    }

    /**
     * Display targets grouped by category
     * @param {Object} configMap - Configuration mapping
     */
    displayTargetsByCategory(configMap) {
        // Simple alphabetical listing if no categories are detected
        Object.entries(configMap).forEach(([name, config]) => {
            const title = config?.name || config?.title || name;
            const description = config?.catchphrase || config?.description || config?.approach || '';
            console.log(`  • ${name.padEnd(12)} - ${title}`);
            if (description) {
                console.log(`    ${description}`);
            }
        });
    }

    /**
     * Execute main router logic
     * @param {string[]} args - Command line arguments
     * @param {Object} configMap - Configuration mapping
     * @param {Object} options - Execution options
     * @returns {Object} - Execution result
     */
    async execute(args, configMap, options = {}) {
        const operationId = crypto.randomUUID();
        const opLogger = new OperationLogger(operationId, this.logger);

        try {
            // Start performance tracking
            if (this.enablePerformanceTracking) {
                globalPerformanceTracker.start(operationId, 'Router execution');
            }

            await opLogger.logStep('validation', 'Validating input arguments');

            // Validate arguments
            const { targetName, task } = this.validateArguments(args);

            await opLogger.logStep('config-lookup', 'Looking up target configuration');

            // Get target configuration
            const targetConfig = this.getTargetConfig(targetName, configMap);

            await opLogger.logStep('workspace-setup', 'Setting up workspace');

            // Create workspace
            const workspaceDir = await this.createWorkspace(targetName);

            await opLogger.logStep('task-save', 'Saving task to workspace');

            // Save task
            const taskFile = await this.saveTask(workspaceDir, task, targetConfig, {
                operationId,
                targetName,
                routerType: this.routerType
            });

            await opLogger.logStep('log-creation', 'Creating log entry');

            // Create log entry
            const logFile = await this.createLogEntry(workspaceDir, targetName, task, targetConfig, taskFile);

            await opLogger.logStep('cleanup', 'Cleaning old tasks');

            // Clean old tasks
            await this.cleanOldTasks(workspaceDir);

            // End performance tracking
            if (this.enablePerformanceTracking) {
                const metrics = globalPerformanceTracker.end(operationId);
                await opLogger.logStep('performance', 'Recording performance metrics', {
                    duration: metrics.duration,
                    memoryDelta: metrics.memoryDelta
                });
            }

            const result = {
                success: true,
                operationId,
                targetName,
                task,
                workspaceDir,
                files: {
                    taskFile: path.basename(taskFile),
                    logFile: path.basename(logFile)
                },
                targetConfig: {
                    name: targetConfig?.name || targetConfig?.title,
                    type: this.routerType
                }
            };

            await opLogger.complete('success', result);

            return result;

        } catch (error) {
            await opLogger.fail(error);

            // End performance tracking even on error
            if (this.enablePerformanceTracking && globalPerformanceTracker.startTimes.has(operationId)) {
                globalPerformanceTracker.end(operationId);
            }

            throw error;
        }
    }

    /**
     * Display execution result
     * @param {Object} result - Execution result
     * @param {Object} targetConfig - Target configuration
     */
    displayResult(result, targetConfig) {
        const targetInfo = targetConfig?.name || targetConfig?.title || result.targetName;
        const catchphrase = targetConfig?.catchphrase || '';

        console.log(`🎭 **${targetInfo}** is taking on your task...`);
        if (targetConfig?.title) {
            console.log(`💼 ${targetConfig.title}`);
        }
        if (catchphrase) {
            console.log(`💭 "${catchphrase}"`);
        }
        console.log(`🎯 Type: ${this.routerType}`);
        console.log(`📋 Task: ${result.task}\n`);

        console.log(`✅ **Task Successfully Logged**`);
        console.log(`📁 Workspace: ${result.workspaceDir}`);
        console.log(`📋 Task file: ${result.files.taskFile}`);
        console.log(`📊 Log entry: ${result.files.logFile}`);

        console.log(`\n🚀 **Ready for AI-powered execution!**`);
        console.log(`\n💡 **Next Steps:**`);
        console.log(`1. Task logged in ${targetInfo}'s workspace`);
        console.log(`2. AI routing system will process with specialized expertise`);
        console.log(`3. Results will be saved in workspace outputs directory`);
        console.log(`4. Check workspace status with monitoring commands`);
    }
}

export default BaseRouter;
