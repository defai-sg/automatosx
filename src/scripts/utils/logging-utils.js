#!/usr/bin/env node

/**
 * AutomatosX Logging System
 * Bob's comprehensive logging implementation
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
import chalk from 'chalk';
import { DefaiError } from './security-utils.js';

/**
 * Log levels enum
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
};

/**
 * Log level names
 */
export const LogLevelNames = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL'
};

/**
 * DEFAI Logger class
 */
export class DefaiLogger {
    constructor(module, options = {}) {
        this.module = module;
        this.level = options.level || this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO;
        this.logDir = options.logDir || path.join(process.cwd(), '.defai', 'workspaces', 'logs');
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile !== false;
        this.enableJson = options.enableJson || false;
        this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles || 5;

        // Ensure log directory exists
        this.ensureLogDir();
    }

    /**
     * Parse log level from string
     * @param {string} levelStr - Log level string
     * @returns {number} - Log level number
     */
    parseLogLevel(levelStr) {
        if (!levelStr) return null;

        const upperLevel = levelStr.toUpperCase();
        for (const [level, name] of Object.entries(LogLevelNames)) {
            if (name === upperLevel) {
                return parseInt(level);
            }
        }
        return null;
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDir() {
        try {
            await fs.ensureDir(this.logDir);
        } catch (error) {
            console.error(chalk.red('Failed to create log directory:'), error.message);
        }
    }

    /**
     * Format log message
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     * @returns {Object} - Formatted log entry
     */
    formatMessage(level, message, metadata = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: LogLevelNames[level],
            module: this.module,
            message,
            metadata,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Get console color for log level
     * @param {number} level - Log level
     * @returns {Function} - Chalk color function
     */
    getConsoleColor(level) {
        switch (level) {
            case LogLevel.DEBUG: return chalk.gray;
            case LogLevel.INFO: return chalk.blue;
            case LogLevel.WARN: return chalk.yellow;
            case LogLevel.ERROR: return chalk.red;
            case LogLevel.FATAL: return chalk.magenta;
            default: return chalk.white;
        }
    }

    /**
     * Get log level icon
     * @param {number} level - Log level
     * @returns {string} - Log level icon
     */
    getLevelIcon(level) {
        switch (level) {
            case LogLevel.DEBUG: return '🔍';
            case LogLevel.INFO: return 'ℹ️';
            case LogLevel.WARN: return '⚠️';
            case LogLevel.ERROR: return '❌';
            case LogLevel.FATAL: return '💀';
            default: return '📝';
        }
    }

    /**
     * Write to console
     * @param {Object} logEntry - Formatted log entry
     */
    writeToConsole(logEntry) {
        if (!this.enableConsole) return;

        const color = this.getConsoleColor(logEntry.level);
        const icon = this.getLevelIcon(logEntry.level);

        let output = `${icon} ${color(`[${logEntry.level}]`)} ${chalk.gray(`[${logEntry.module}]`)} ${logEntry.message}`;

        if (Object.keys(logEntry.metadata).length > 0) {
            output += chalk.gray(` | ${JSON.stringify(logEntry.metadata)}`);
        }

        console.log(output);
    }

    /**
     * Write to file
     * @param {Object} logEntry - Formatted log entry
     */
    async writeToFile(logEntry) {
        if (!this.enableFile) return;

        try {
            const filename = `${this.module}.log`;
            const filepath = path.join(this.logDir, filename);

            // Check file size and rotate if necessary
            await this.rotateFileIfNeeded(filepath);

            const logLine = this.enableJson ?
                JSON.stringify(logEntry) + '\n' :
                `${logEntry.timestamp} [${logEntry.level}] [${logEntry.module}] ${logEntry.message} ${JSON.stringify(logEntry.metadata)}\n`;

            await fs.appendFile(filepath, logLine);
        } catch (error) {
            console.error(chalk.red('Failed to write to log file:'), error.message);
        }
    }

    /**
     * Rotate log file if it exceeds max size
     * @param {string} filepath - Log file path
     */
    async rotateFileIfNeeded(filepath) {
        try {
            const stats = await fs.stat(filepath);
            if (stats.size >= this.maxFileSize) {
                await this.rotateLogFile(filepath);
            }
        } catch (error) {
            // File doesn't exist, which is fine
            if (error.code !== 'ENOENT') {
                console.error(chalk.red('Error checking log file size:'), error.message);
            }
        }
    }

    /**
     * Rotate log files
     * @param {string} filepath - Current log file path
     */
    async rotateLogFile(filepath) {
        const dir = path.dirname(filepath);
        const ext = path.extname(filepath);
        const basename = path.basename(filepath, ext);

        // Remove oldest file if we have too many
        const oldestFile = path.join(dir, `${basename}.${this.maxFiles}${ext}`);
        if (await fs.pathExists(oldestFile)) {
            await fs.remove(oldestFile);
        }

        // Rotate existing files
        for (let i = this.maxFiles - 1; i >= 1; i--) {
            const currentFile = path.join(dir, `${basename}.${i}${ext}`);
            const nextFile = path.join(dir, `${basename}.${i + 1}${ext}`);

            if (await fs.pathExists(currentFile)) {
                await fs.move(currentFile, nextFile);
            }
        }

        // Move current file to .1
        const firstRotated = path.join(dir, `${basename}.1${ext}`);
        await fs.move(filepath, firstRotated);
    }

    /**
     * Log a message
     * @param {number} level - Log level
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async log(level, message, metadata = {}) {
        if (level < this.level) return;

        const logEntry = this.formatMessage(level, message, metadata);

        this.writeToConsole(logEntry);
        await this.writeToFile(logEntry);
    }

    /**
     * Debug level logging
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async debug(message, metadata = {}) {
        await this.log(LogLevel.DEBUG, message, metadata);
    }

    /**
     * Info level logging
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async info(message, metadata = {}) {
        await this.log(LogLevel.INFO, message, metadata);
    }

    /**
     * Warning level logging
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async warn(message, metadata = {}) {
        await this.log(LogLevel.WARN, message, metadata);
    }

    /**
     * Error level logging
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async error(message, metadata = {}) {
        await this.log(LogLevel.ERROR, message, metadata);
    }

    /**
     * Fatal level logging
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async fatal(message, metadata = {}) {
        await this.log(LogLevel.FATAL, message, metadata);
    }

    /**
     * Log with performance timing
     * @param {string} operationName - Name of the operation
     * @param {Function} operation - Async operation to execute
     * @param {Object} metadata - Additional metadata
     * @returns {any} - Operation result
     */
    async timeOperation(operationName, operation, metadata = {}) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        await this.debug(`Starting operation: ${operationName}`, metadata);

        try {
            const result = await operation();
            const duration = performance.now() - startTime;
            const endMemory = process.memoryUsage();

            await this.info(`Operation completed: ${operationName}`, {
                ...metadata,
                duration: `${duration.toFixed(2)}ms`,
                memoryDelta: {
                    rss: endMemory.rss - startMemory.rss,
                    heapUsed: endMemory.heapUsed - startMemory.heapUsed
                }
            });

            return result;
        } catch (error) {
            const duration = performance.now() - startTime;

            await this.error(`Operation failed: ${operationName}`, {
                ...metadata,
                duration: `${duration.toFixed(2)}ms`,
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    /**
     * Create a child logger with additional context
     * @param {string} childModule - Child module name
     * @param {Object} additionalContext - Additional context for all logs
     * @returns {DefaiLogger} - Child logger
     */
    child(childModule, additionalContext = {}) {
        const childLogger = new DefaiLogger(`${this.module}:${childModule}`, {
            level: this.level,
            logDir: this.logDir,
            enableConsole: this.enableConsole,
            enableFile: this.enableFile,
            enableJson: this.enableJson
        });

        // Override log method to include additional context
        const originalLog = childLogger.log.bind(childLogger);
        childLogger.log = async (level, message, metadata = {}) => {
            const combinedMetadata = { ...additionalContext, ...metadata };
            return originalLog(level, message, combinedMetadata);
        };

        return childLogger;
    }
}

/**
 * Logger factory
 */
export class LoggerFactory {
    static loggers = new Map();

    /**
     * Get or create a logger for a module
     * @param {string} module - Module name
     * @param {Object} options - Logger options
     * @returns {DefaiLogger} - Logger instance
     */
    static getLogger(module, options = {}) {
        const key = `${module}:${JSON.stringify(options)}`;

        if (!this.loggers.has(key)) {
            this.loggers.set(key, new DefaiLogger(module, options));
        }

        return this.loggers.get(key);
    }

    /**
     * Set global log level for all loggers
     * @param {number} level - Log level
     */
    static setGlobalLevel(level) {
        for (const logger of this.loggers.values()) {
            logger.level = level;
        }
    }

    /**
     * Get all active loggers
     * @returns {DefaiLogger[]} - Array of loggers
     */
    static getAllLoggers() {
        return Array.from(this.loggers.values());
    }
}

/**
 * Request/Operation logger with correlation IDs
 */
export class OperationLogger {
    constructor(operationId, baseLogger) {
        this.operationId = operationId;
        this.baseLogger = baseLogger;
        this.startTime = Date.now();
        this.steps = [];
    }

    /**
     * Log a step in the operation
     * @param {string} step - Step name
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     */
    async logStep(step, message, metadata = {}) {
        const stepData = {
            step,
            timestamp: Date.now(),
            duration: Date.now() - this.startTime,
            message,
            metadata
        };

        this.steps.push(stepData);

        await this.baseLogger.info(`[${this.operationId}] ${step}: ${message}`, {
            operationId: this.operationId,
            step,
            operationDuration: stepData.duration,
            ...metadata
        });
    }

    /**
     * Complete the operation and log summary
     * @param {string} result - Operation result
     * @param {Object} metadata - Additional metadata
     */
    async complete(result = 'success', metadata = {}) {
        const totalDuration = Date.now() - this.startTime;

        await this.baseLogger.info(`[${this.operationId}] Operation completed`, {
            operationId: this.operationId,
            result,
            totalDuration,
            stepCount: this.steps.length,
            steps: this.steps.map(s => ({ step: s.step, duration: s.duration })),
            ...metadata
        });
    }

    /**
     * Log operation failure
     * @param {Error} error - Error that occurred
     * @param {Object} metadata - Additional metadata
     */
    async fail(error, metadata = {}) {
        const totalDuration = Date.now() - this.startTime;

        await this.baseLogger.error(`[${this.operationId}] Operation failed`, {
            operationId: this.operationId,
            error: error.message,
            stack: error.stack,
            totalDuration,
            stepCount: this.steps.length,
            steps: this.steps.map(s => ({ step: s.step, duration: s.duration })),
            ...metadata
        });
    }
}

// Default logger instance
export const defaultLogger = LoggerFactory.getLogger('defai-ax');

export default {
    LogLevel,
    LogLevelNames,
    DefaiLogger,
    LoggerFactory,
    OperationLogger,
    defaultLogger
};
