#!/usr/bin/env node

/**
 * AutomatosX Performance Utilities
 * Bob's performance optimization toolkit
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

import chalk from 'chalk';
import { DefaiError } from './security-utils.js';

/**
 * Performance tracking utilities
 */
export class PerformanceTracker {
    constructor() {
        this.metrics = new Map();
        this.startTimes = new Map();
    }

    /**
     * Start tracking an operation
     * @param {string} operationId - Unique identifier for the operation
     * @param {string} description - Human readable description
     */
    start(operationId, description = '') {
        this.startTimes.set(operationId, {
            startTime: performance.now(),
            startMemory: process.memoryUsage(),
            description
        });
    }

    /**
     * End tracking and record metrics
     * @param {string} operationId - Operation identifier
     * @returns {Object} - Performance metrics
     */
    end(operationId) {
        const startData = this.startTimes.get(operationId);

        if (!startData) {
            throw new DefaiError(`No start time found for operation: ${operationId}`, 'OPERATION_NOT_STARTED');
        }

        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        const metrics = {
            operationId,
            description: startData.description,
            duration: endTime - startData.startTime,
            memoryDelta: {
                rss: endMemory.rss - startData.startMemory.rss,
                heapUsed: endMemory.heapUsed - startData.startMemory.heapUsed,
                heapTotal: endMemory.heapTotal - startData.startMemory.heapTotal,
                external: endMemory.external - startData.startMemory.external
            },
            timestamp: new Date().toISOString()
        };

        this.metrics.set(operationId, metrics);
        this.startTimes.delete(operationId);

        return metrics;
    }

    /**
     * Track a function execution
     * @param {string} operationId - Operation identifier
     * @param {Function} fn - Function to execute
     * @param {string} description - Operation description
     * @returns {any} - Function result
     */
    async track(operationId, fn, description = '') {
        this.start(operationId, description);

        try {
            const result = await fn();
            const metrics = this.end(operationId);

            console.log(chalk.gray(`⏱️  ${operationId}: ${metrics.duration.toFixed(2)}ms`));

            return result;
        } catch (error) {
            this.end(operationId); // Still record the metrics
            throw error;
        }
    }

    /**
     * Get metrics for an operation
     * @param {string} operationId - Operation identifier
     * @returns {Object|null} - Metrics or null if not found
     */
    getMetrics(operationId) {
        return this.metrics.get(operationId) || null;
    }

    /**
     * Get all recorded metrics
     * @returns {Array} - Array of all metrics
     */
    getAllMetrics() {
        return Array.from(this.metrics.values());
    }

    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
        this.startTimes.clear();
    }

    /**
     * Log memory usage with a label
     * @param {string} label - Label for the memory log
     */
    logMemoryUsage(label) {
        const usage = process.memoryUsage();
        console.log(chalk.blue(`📊 ${label}:`));
        console.log(chalk.gray(`   RSS: ${Math.round(usage.rss / 1024 / 1024)}MB`));
        console.log(chalk.gray(`   Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`));
        console.log(chalk.gray(`   Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)}MB`));
        console.log(chalk.gray(`   External: ${Math.round(usage.external / 1024 / 1024)}MB`));
    }

    /**
     * Generate performance report
     * @returns {string} - Formatted performance report
     */
    generateReport() {
        const metrics = this.getAllMetrics();

        if (metrics.length === 0) {
            return 'No performance metrics recorded.';
        }

        let report = chalk.blue('\n📊 Performance Report\n');
        report += chalk.blue('===================\n\n');

        metrics.forEach(metric => {
            report += chalk.yellow(`🔍 ${metric.operationId}`);
            if (metric.description) {
                report += chalk.gray(` - ${metric.description}`);
            }
            report += '\n';

            report += chalk.gray(`   Duration: ${metric.duration.toFixed(2)}ms\n`);
            report += chalk.gray(`   Memory Delta: ${Math.round(metric.memoryDelta.rss / 1024)}KB RSS\n`);
            report += chalk.gray(`   Timestamp: ${metric.timestamp}\n\n`);
        });

        // Summary statistics
        const durations = metrics.map(m => m.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);

        report += chalk.green('📈 Summary:\n');
        report += chalk.gray(`   Total Operations: ${metrics.length}\n`);
        report += chalk.gray(`   Average Duration: ${avgDuration.toFixed(2)}ms\n`);
        report += chalk.gray(`   Max Duration: ${maxDuration.toFixed(2)}ms\n`);
        report += chalk.gray(`   Min Duration: ${minDuration.toFixed(2)}ms\n`);

        return report;
    }
}

/**
 * Configuration caching system
 */
export class ConfigCache {
    constructor(defaultTTL = 300000) { // 5 minutes default TTL
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Set a value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, value, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, {
            value,
            expiry,
            created: Date.now()
        });
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if expired/not found
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Check if a key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} - Whether key exists
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all expired entries
     */
    clearExpired() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStats() {
        this.clearExpired(); // Clean up first

        const entries = Array.from(this.cache.values());
        const now = Date.now();

        return {
            totalEntries: entries.length,
            avgAge: entries.length > 0 ?
                entries.reduce((sum, item) => sum + (now - item.created), 0) / entries.length : 0,
            oldestEntry: entries.length > 0 ?
                Math.min(...entries.map(item => item.created)) : null,
            newestEntry: entries.length > 0 ?
                Math.max(...entries.map(item => item.created)) : null
        };
    }
}

/**
 * Async operation utilities
 */
export class AsyncUtils {
    /**
     * Execute promises with controlled concurrency
     * @param {Array} items - Items to process
     * @param {Function} processor - Async function to process each item
     * @param {number} concurrency - Maximum concurrent operations
     * @returns {Array} - Results array
     */
    static async processWithConcurrency(items, processor, concurrency = 3) {
        const results = [];
        const executing = [];

        for (const item of items) {
            const promise = processor(item).then(result => {
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });

            results.push(promise);
            executing.push(promise);

            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }

        return Promise.all(results);
    }

    /**
     * Retry an async operation with exponential backoff
     * @param {Function} operation - Async operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {any} - Operation result
     */
    static async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries) {
                    break;
                }

                const delay = baseDelay * Math.pow(2, attempt);
                console.log(chalk.yellow(`⚠️  Attempt ${attempt + 1} failed, retrying in ${delay}ms...`));
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new DefaiError(
            `Operation failed after ${maxRetries + 1} attempts`,
            'MAX_RETRIES_EXCEEDED',
            { lastError: lastError.message, maxRetries }
        );
    }

    /**
     * Add timeout to a promise
     * @param {Promise} promise - Promise to add timeout to
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} timeoutMessage - Custom timeout message
     * @returns {Promise} - Promise with timeout
     */
    static withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new DefaiError(timeoutMessage, 'TIMEOUT', { timeoutMs }));
                }, timeoutMs);
            })
        ]);
    }
}

/**
 * Resource monitor for tracking system resources
 */
export class ResourceMonitor {
    constructor(intervalMs = 5000) {
        this.intervalMs = intervalMs;
        this.isMonitoring = false;
        this.interval = null;
        this.samples = [];
        this.maxSamples = 100; // Keep last 100 samples
    }

    /**
     * Start monitoring system resources
     */
    start() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.interval = setInterval(() => {
            const sample = {
                timestamp: Date.now(),
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                cpuUsage: process.cpuUsage()
            };

            this.samples.push(sample);

            // Keep only the last maxSamples
            if (this.samples.length > this.maxSamples) {
                this.samples.shift();
            }
        }, this.intervalMs);

        console.log(chalk.blue('📊 Resource monitoring started'));
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isMonitoring = false;
        console.log(chalk.blue('📊 Resource monitoring stopped'));
    }

    /**
     * Get current resource usage
     * @returns {Object} - Current resource usage
     */
    getCurrentUsage() {
        return {
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage()
        };
    }

    /**
     * Get monitoring summary
     * @returns {Object} - Monitoring summary
     */
    getSummary() {
        if (this.samples.length === 0) {
            return { message: 'No monitoring data available' };
        }

        const memoryUsages = this.samples.map(s => s.memory.rss);
        const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
        const maxMemory = Math.max(...memoryUsages);
        const minMemory = Math.min(...memoryUsages);

        return {
            samplesCount: this.samples.length,
            timespan: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
            memory: {
                average: Math.round(avgMemory / 1024 / 1024),
                max: Math.round(maxMemory / 1024 / 1024),
                min: Math.round(minMemory / 1024 / 1024),
                unit: 'MB'
            },
            uptime: process.uptime()
        };
    }
}

// Global instances
export const globalPerformanceTracker = new PerformanceTracker();
export const globalConfigCache = new ConfigCache();
export const globalResourceMonitor = new ResourceMonitor();

export default {
    PerformanceTracker,
    ConfigCache,
    AsyncUtils,
    ResourceMonitor,
    globalPerformanceTracker,
    globalConfigCache,
    globalResourceMonitor
};
