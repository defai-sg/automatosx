/**
 * Provider Connection Pool Management for AutomatosX
 * Efficient connection pooling and resource management for AI providers
 * Implements Bob's recommendations for enterprise-grade connection handling
 */

import chalk from 'chalk';
import { EventEmitter } from 'events';

export class ProviderConnectionPool extends EventEmitter {
    constructor(options = {}) {
        super();

        this.pools = new Map();
        this.config = {
            maxConnections: options.maxConnections || 10,
            connectionTimeout: options.connectionTimeout || 30000,
            idleTimeout: options.idleTimeout || 300000, // 5 minutes
            retryInterval: options.retryInterval || 1000,
            maxRetries: options.maxRetries || 3,
            healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
            warmupConnections: options.warmupConnections || 2
        };

        this.statistics = {
            totalAcquired: 0,
            totalReleased: 0,
            totalTimeouts: 0,
            totalErrors: 0,
            currentActive: 0
        };

        // Start health check interval
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);

        console.log(chalk.blue(`🏊 Connection pool initialized with max ${this.config.maxConnections} connections per provider`));
    }

    /**
     * Get connection from pool with intelligent management
     */
    async getConnection(provider, options = {}) {
        try {
            if (!this.pools.has(provider)) {
                await this.initializePool(provider);
            }

            const pool = this.pools.get(provider);
            const connection = await this.acquireConnection(pool, provider, options);

            this.statistics.totalAcquired++;
            this.statistics.currentActive++;

            this.emit('connectionAcquired', { provider, connectionId: connection.id });

            console.log(chalk.green(`🔗 Acquired connection for ${provider} (${pool.active}/${this.config.maxConnections} active)`));

            return connection;

        } catch (error) {
            this.statistics.totalErrors++;
            console.error(chalk.red(`❌ Failed to acquire connection for ${provider}: ${error.message}`));
            throw error;
        }
    }

    /**
     * Initialize connection pool for a provider
     */
    async initializePool(provider) {
        const pool = {
            provider,
            active: 0,
            queue: [],
            connections: new Map(),
            lastActivity: Date.now(),
            healthStatus: 'unknown',
            statistics: {
                totalConnections: 0,
                totalSuccess: 0,
                totalFailures: 0,
                avgResponseTime: 0
            }
        };

        this.pools.set(provider, pool);

        // Warm up connections
        if (this.config.warmupConnections > 0) {
            await this.warmupPool(provider, this.config.warmupConnections);
        }

        console.log(chalk.cyan(`🚀 Initialized connection pool for ${provider}`));
    }

    /**
     * Warm up connection pool with initial connections
     */
    async warmupPool(provider, count) {
        const pool = this.pools.get(provider);
        const warmupPromises = [];

        for (let i = 0; i < count; i++) {
            warmupPromises.push(this.createConnection(provider, { warmup: true }));
        }

        try {
            const connections = await Promise.allSettled(warmupPromises);
            const successful = connections.filter(result => result.status === 'fulfilled').length;

            console.log(chalk.green(`🔥 Warmed up ${successful}/${count} connections for ${provider}`));

            // Store warmup connections in pool for reuse
            connections.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const connection = result.value;
                    connection.isWarmup = true;
                    connection.lastUsed = Date.now();
                    pool.connections.set(connection.id, connection);
                }
            });

        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Warmup failed for ${provider}: ${error.message}`));
        }
    }

    /**
     * Acquire connection from pool with queuing and timeout
     */
    async acquireConnection(pool, provider, options = {}) {
        const timeout = options.timeout || this.config.connectionTimeout;

        // Check for available warm connections first
        for (const [id, connection] of pool.connections.entries()) {
            if (connection.isAvailable && connection.isWarmup) {
                connection.isAvailable = false;
                connection.lastUsed = Date.now();
                pool.active++;
                return connection;
            }
        }

        // If under max connections, create new one
        if (pool.active < this.config.maxConnections) {
            const connection = await this.createConnection(provider, options);
            pool.active++;
            pool.connections.set(connection.id, connection);
            return connection;
        }

        // Queue for available connection
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // Remove from queue
                const index = pool.queue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    pool.queue.splice(index, 1);
                }

                this.statistics.totalTimeouts++;
                reject(new Error(`Connection timeout for ${provider} after ${timeout}ms`));
            }, timeout);

            pool.queue.push({
                resolve,
                reject,
                timeoutId,
                provider,
                options,
                queueTime: Date.now()
            });

            console.log(chalk.yellow(`⏳ Queued connection request for ${provider} (${pool.queue.length} in queue)`));
        });
    }

    /**
     * Create new connection for provider
     */
    async createConnection(provider, options = {}) {
        const connectionId = this.generateConnectionId(provider);
        const startTime = Date.now();

        try {
            const connection = new ProviderConnection(provider, connectionId, {
                timeout: options.timeout || this.config.connectionTimeout,
                onRelease: () => this.releaseConnection(provider, connectionId),
                onError: (error) => this.handleConnectionError(provider, connectionId, error)
            });

            await connection.initialize();

            const connectionTime = Date.now() - startTime;
            const pool = this.pools.get(provider);

            // Update pool statistics
            pool.statistics.totalConnections++;
            pool.statistics.totalSuccess++;
            pool.statistics.avgResponseTime = (
                (pool.statistics.avgResponseTime * (pool.statistics.totalConnections - 1) + connectionTime) /
                pool.statistics.totalConnections
            );

            console.log(chalk.green(`✨ Created new connection ${connectionId} for ${provider} (${connectionTime}ms)`));

            return connection;

        } catch (error) {
            const pool = this.pools.get(provider);
            if (pool) {
                pool.statistics.totalFailures++;
            }

            console.error(chalk.red(`❌ Failed to create connection for ${provider}: ${error.message}`));
            throw error;
        }
    }

    /**
     * Release connection back to pool
     */
    releaseConnection(provider, connectionId) {
        const pool = this.pools.get(provider);
        if (!pool) return;

        const connection = pool.connections.get(connectionId);
        if (!connection) return;

        pool.active--;
        this.statistics.totalReleased++;
        this.statistics.currentActive--;

        // Mark connection as available for reuse
        connection.isAvailable = true;
        connection.lastUsed = Date.now();

        // Process queued requests
        if (pool.queue.length > 0) {
            const queuedRequest = pool.queue.shift();
            clearTimeout(queuedRequest.timeoutId);

            // Reuse this connection
            connection.isAvailable = false;
            pool.active++;
            this.statistics.currentActive++;

            const queueTime = Date.now() - queuedRequest.queueTime;
            console.log(chalk.cyan(`🔄 Reused connection for ${provider} (queued ${queueTime}ms)`));

            queuedRequest.resolve(connection);
        }

        this.emit('connectionReleased', { provider, connectionId });

        console.log(chalk.gray(`🔓 Released connection ${connectionId} for ${provider} (${pool.active} active, ${pool.queue.length} queued)`));
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(provider, connectionId, error) {
        const pool = this.pools.get(provider);
        if (!pool) return;

        const connection = pool.connections.get(connectionId);
        if (connection && connection.isActive) {
            pool.active--;
            this.statistics.currentActive--;
        }

        // Remove failed connection
        pool.connections.delete(connectionId);
        pool.statistics.totalFailures++;

        console.error(chalk.red(`💥 Connection error for ${provider}:${connectionId}: ${error.message}`));

        this.emit('connectionError', { provider, connectionId, error });

        // Update health status
        const errorRate = pool.statistics.totalFailures / (pool.statistics.totalFailures + pool.statistics.totalSuccess);
        if (errorRate > 0.5) {
            pool.healthStatus = 'unhealthy';
        } else if (errorRate > 0.2) {
            pool.healthStatus = 'degraded';
        }
    }

    /**
     * Perform health check on all pools
     */
    async performHealthCheck() {
        console.log(chalk.blue('🏥 Performing connection pool health check...'));

        for (const [provider, pool] of this.pools.entries()) {
            try {
                await this.checkPoolHealth(provider, pool);
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Health check failed for ${provider}: ${error.message}`));
            }
        }
    }

    /**
     * Check health of specific pool
     */
    async checkPoolHealth(provider, pool) {
        const now = Date.now();

        // Clean up idle connections
        for (const [id, connection] of pool.connections.entries()) {
            const idleTime = now - connection.lastUsed;

            if (connection.isAvailable && idleTime > this.config.idleTimeout) {
                pool.connections.delete(id);
                await connection.destroy();
                console.log(chalk.gray(`🧹 Cleaned up idle connection ${id} for ${provider}`));
            }
        }

        // Update health status based on recent performance
        const recentWindow = 300000; // 5 minutes
        const recentFailures = pool.connections.size > 0 ?
            Array.from(pool.connections.values())
                .filter(conn => conn.lastError && (now - conn.lastError) < recentWindow).length : 0;

        const errorRate = pool.connections.size > 0 ? recentFailures / pool.connections.size : 0;

        if (errorRate > 0.5) {
            pool.healthStatus = 'critical';
        } else if (errorRate > 0.2) {
            pool.healthStatus = 'unhealthy';
        } else if (errorRate > 0.1) {
            pool.healthStatus = 'degraded';
        } else {
            pool.healthStatus = 'healthy';
        }

        // Update last activity
        pool.lastActivity = now;
    }

    /**
     * Get pool statistics and status
     */
    getPoolStatistics() {
        const stats = {
            global: this.statistics,
            pools: {},
            totalPools: this.pools.size
        };

        for (const [provider, pool] of this.pools.entries()) {
            stats.pools[provider] = {
                active: pool.active,
                queued: pool.queue.length,
                totalConnections: pool.connections.size,
                healthStatus: pool.healthStatus,
                lastActivity: new Date(pool.lastActivity).toISOString(),
                statistics: pool.statistics,
                averageQueueTime: this.calculateAverageQueueTime(pool),
                connectionUtilization: (pool.active / this.config.maxConnections * 100).toFixed(1)
            };
        }

        return stats;
    }

    /**
     * Calculate average queue time for pool
     */
    calculateAverageQueueTime(pool) {
        if (pool.queue.length === 0) return 0;

        const now = Date.now();
        const totalQueueTime = pool.queue.reduce((sum, item) => sum + (now - item.queueTime), 0);
        return Math.round(totalQueueTime / pool.queue.length);
    }

    /**
     * Generate unique connection ID
     */
    generateConnectionId(provider) {
        return `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Drain all connections from a provider pool
     */
    async drainPool(provider) {
        const pool = this.pools.get(provider);
        if (!pool) return;

        console.log(chalk.yellow(`🚰 Draining pool for ${provider}...`));

        // Reject all queued requests
        for (const queuedRequest of pool.queue) {
            clearTimeout(queuedRequest.timeoutId);
            queuedRequest.reject(new Error(`Pool draining for ${provider}`));
        }
        pool.queue = [];

        // Close all connections
        for (const [id, connection] of pool.connections.entries()) {
            try {
                await connection.destroy();
            } catch (error) {
                console.warn(chalk.yellow(`⚠️  Error destroying connection ${id}: ${error.message}`));
            }
        }

        pool.connections.clear();
        pool.active = 0;

        console.log(chalk.green(`✅ Drained pool for ${provider}`));
    }

    /**
     * Close connection pool and cleanup resources
     */
    async destroy() {
        console.log(chalk.blue('🚪 Shutting down connection pools...'));

        // Clear health check timer
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        // Drain all pools
        const drainPromises = Array.from(this.pools.keys()).map(provider =>
            this.drainPool(provider)
        );

        await Promise.allSettled(drainPromises);

        this.pools.clear();

        console.log(chalk.green('✅ Connection pools shut down successfully'));
    }
}

/**
 * Individual Provider Connection
 */
class ProviderConnection {
    constructor(provider, id, options = {}) {
        this.provider = provider;
        this.id = id;
        this.isActive = false;
        this.isAvailable = false;
        this.createdAt = Date.now();
        this.lastUsed = Date.now();
        this.lastError = null;
        this.usageCount = 0;

        this.config = {
            timeout: options.timeout || 30000,
            maxUsage: options.maxUsage || 1000
        };

        this.onRelease = options.onRelease || (() => {});
        this.onError = options.onError || (() => {});
    }

    /**
     * Initialize the connection
     */
    async initialize() {
        try {
            // Simulate connection setup time
            await this.delay(Math.random() * 100 + 50);

            this.isActive = true;
            this.isAvailable = false;

            console.log(chalk.green(`🔗 Connection ${this.id} initialized for ${this.provider}`));

        } catch (error) {
            this.lastError = Date.now();
            this.onError(error);
            throw error;
        }
    }

    /**
     * Use the connection for a request
     */
    async use(request) {
        if (!this.isActive) {
            throw new Error(`Connection ${this.id} is not active`);
        }

        this.usageCount++;
        this.lastUsed = Date.now();

        try {
            // Simulate request processing
            const processingTime = Math.random() * 2000 + 500;
            await this.delay(processingTime);

            // Check if connection should be recycled
            if (this.usageCount >= this.config.maxUsage) {
                console.log(chalk.yellow(`♻️  Connection ${this.id} reached max usage, recycling...`));
                await this.destroy();
                return;
            }

            return `Response from ${this.provider} via connection ${this.id}`;

        } catch (error) {
            this.lastError = Date.now();
            this.onError(error);
            throw error;
        }
    }

    /**
     * Release the connection back to pool
     */
    release() {
        if (this.isActive) {
            this.onRelease();
        }
    }

    /**
     * Destroy the connection
     */
    async destroy() {
        this.isActive = false;
        this.isAvailable = false;

        // Simulate cleanup time
        await this.delay(50);

        console.log(chalk.gray(`💀 Connection ${this.id} destroyed for ${this.provider}`));
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            id: this.id,
            provider: this.provider,
            isActive: this.isActive,
            isAvailable: this.isAvailable,
            usageCount: this.usageCount,
            age: Date.now() - this.createdAt,
            lastUsed: new Date(this.lastUsed).toISOString(),
            lastError: this.lastError ? new Date(this.lastError).toISOString() : null
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}