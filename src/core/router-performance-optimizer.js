/**
 * Router Performance Optimizer for AutomatosX v3.1.1
 * Developed in collaboration with Tony (CTO) for enhanced system performance
 * Provides intelligent caching, request optimization, and performance analytics
 */

export class RouterPerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.metrics = {
            requestCount: 0,
            cacheHits: 0,
            averageResponseTime: 0,
            providerUsage: new Map(),
            errorRate: 0
        };
        this.requestHistory = [];
        this.maxHistorySize = 1000;
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Optimize routing decision based on historical performance
     */
    optimizeRouting(agentRole, task, providers) {
        const routingKey = this.generateRoutingKey(agentRole, task);

        // Check cache for previous optimization
        const cached = this.getCachedOptimization(routingKey);
        if (cached) {
            this.metrics.cacheHits++;
            return cached;
        }

        // Analyze provider performance for this agent/task type
        const optimization = this.analyzeProviderPerformance(agentRole, task, providers);

        // Cache the optimization
        this.setCachedOptimization(routingKey, optimization);

        return optimization;
    }

    /**
     * Generate cache key for routing optimization
     */
    generateRoutingKey(agentRole, task) {
        const taskType = this.classifyTask(task);
        return `${agentRole}:${taskType}`;
    }

    /**
     * Classify task type for optimization purposes
     */
    classifyTask(task) {
        const taskLower = task.toLowerCase();

        if (taskLower.includes('analyze') || taskLower.includes('research')) {
            return 'analysis';
        } else if (taskLower.includes('implement') || taskLower.includes('build') || taskLower.includes('create')) {
            return 'implementation';
        } else if (taskLower.includes('review') || taskLower.includes('audit') || taskLower.includes('test')) {
            return 'review';
        } else if (taskLower.includes('document') || taskLower.includes('write') || taskLower.includes('explain')) {
            return 'documentation';
        } else if (taskLower.includes('optimize') || taskLower.includes('improve') || taskLower.includes('enhance')) {
            return 'optimization';
        } else {
            return 'general';
        }
    }

    /**
     * Analyze provider performance for specific agent/task combinations
     */
    analyzeProviderPerformance(agentRole, task, providers) {
        const taskType = this.classifyTask(task);
        const recommendations = {
            primary: providers[0],
            fallback: providers[1] || providers[0],
            reasoning: 'Default routing',
            confidence: 0.5
        };

        // Get historical performance data
        const history = this.getRelevantHistory(agentRole, taskType);

        if (history.length > 0) {
            const performance = this.calculateProviderPerformance(history);
            recommendations.primary = this.selectBestProvider(performance, providers);
            recommendations.fallback = this.selectFallbackProvider(performance, providers, recommendations.primary);
            recommendations.reasoning = `Based on ${history.length} historical requests`;
            recommendations.confidence = Math.min(0.9, 0.5 + (history.length * 0.1));
        }

        // Task-specific optimizations
        recommendations.optimizations = this.getTaskOptimizations(taskType, agentRole);

        return recommendations;
    }

    /**
     * Get task-specific optimizations
     */
    getTaskOptimizations(taskType, agentRole) {
        const optimizations = {
            timeout: 120000, // Default 2 minutes
            retries: 2,
            useCache: true,
            priority: 'normal'
        };

        // Task type optimizations
        switch (taskType) {
            case 'analysis':
                optimizations.timeout = 180000; // 3 minutes for analysis
                optimizations.priority = 'high';
                break;
            case 'implementation':
                optimizations.timeout = 300000; // 5 minutes for implementation
                optimizations.retries = 3;
                break;
            case 'review':
                optimizations.timeout = 60000; // 1 minute for reviews
                optimizations.useCache = false; // Fresh reviews
                break;
            case 'documentation':
                optimizations.timeout = 90000; // 1.5 minutes for docs
                break;
        }

        // Role-specific optimizations
        if (agentRole === 'security' || agentRole === 'legal') {
            optimizations.timeout *= 1.5; // More time for compliance work
            optimizations.useCache = false; // Always fresh for compliance
        } else if (agentRole === 'frontend' || agentRole === 'design') {
            optimizations.priority = 'high'; // Fast iteration for UI work
        }

        return optimizations;
    }

    /**
     * Record request metrics for performance analysis
     */
    recordRequest(agentRole, task, provider, responseTime, success, errorType = null) {
        const request = {
            timestamp: Date.now(),
            agentRole,
            taskType: this.classifyTask(task),
            provider,
            responseTime,
            success,
            errorType
        };

        this.requestHistory.push(request);
        this.metrics.requestCount++;

        // Update metrics
        this.updateMetrics(request);

        // Trim history if needed
        if (this.requestHistory.length > this.maxHistorySize) {
            this.requestHistory.shift();
        }
    }

    /**
     * Update performance metrics
     */
    updateMetrics(request) {
        // Update average response time
        const totalTime = this.metrics.averageResponseTime * (this.metrics.requestCount - 1);
        this.metrics.averageResponseTime = (totalTime + request.responseTime) / this.metrics.requestCount;

        // Update provider usage
        const providerCount = this.metrics.providerUsage.get(request.provider) || 0;
        this.metrics.providerUsage.set(request.provider, providerCount + 1);

        // Update error rate
        if (!request.success) {
            const errorCount = this.requestHistory.filter(r => !r.success).length;
            this.metrics.errorRate = errorCount / this.requestHistory.length;
        }
    }

    /**
     * Get cached optimization if available and not expired
     */
    getCachedOptimization(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.optimization;
        }
        return null;
    }

    /**
     * Cache optimization result
     */
    setCachedOptimization(key, optimization) {
        this.cache.set(key, {
            optimization,
            timestamp: Date.now()
        });
    }

    /**
     * Get relevant historical data for performance analysis
     */
    getRelevantHistory(agentRole, taskType) {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days
        return this.requestHistory.filter(request =>
            request.agentRole === agentRole &&
            request.taskType === taskType &&
            request.timestamp > cutoff
        );
    }

    /**
     * Calculate provider performance metrics
     */
    calculateProviderPerformance(history) {
        const performance = new Map();

        history.forEach(request => {
            if (!performance.has(request.provider)) {
                performance.set(request.provider, {
                    totalRequests: 0,
                    successCount: 0,
                    totalResponseTime: 0,
                    errorCount: 0
                });
            }

            const stats = performance.get(request.provider);
            stats.totalRequests++;
            stats.totalResponseTime += request.responseTime;

            if (request.success) {
                stats.successCount++;
            } else {
                stats.errorCount++;
            }
        });

        // Calculate derived metrics
        performance.forEach((stats, provider) => {
            stats.successRate = stats.successCount / stats.totalRequests;
            stats.averageResponseTime = stats.totalResponseTime / stats.totalRequests;
            stats.reliability = stats.successRate * (1 - Math.min(stats.averageResponseTime / 60000, 0.5));
        });

        return performance;
    }

    /**
     * Select best provider based on performance metrics
     */
    selectBestProvider(performance, availableProviders) {
        let bestProvider = availableProviders[0];
        let bestScore = 0;

        availableProviders.forEach(provider => {
            const stats = performance.get(provider);
            if (stats) {
                if (stats.reliability > bestScore) {
                    bestScore = stats.reliability;
                    bestProvider = provider;
                }
            }
        });

        return bestProvider;
    }

    /**
     * Select fallback provider (avoid same as primary)
     */
    selectFallbackProvider(performance, availableProviders, primaryProvider) {
        const fallbackCandidates = availableProviders.filter(p => p !== primaryProvider);
        if (fallbackCandidates.length === 0) return primaryProvider;

        return this.selectBestProvider(performance, fallbackCandidates);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const recentRequests = this.requestHistory.filter(
            r => (Date.now() - r.timestamp) < (60 * 60 * 1000) // Last hour
        );

        return {
            ...this.metrics,
            recentRequestCount: recentRequests.length,
            recentErrorRate: recentRequests.length > 0 ?
                recentRequests.filter(r => !r.success).length / recentRequests.length : 0,
            cacheHitRate: this.metrics.requestCount > 0 ?
                this.metrics.cacheHits / this.metrics.requestCount : 0,
            topProviders: Array.from(this.metrics.providerUsage.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
        };
    }

    /**
     * Clear cache and reset metrics (for testing/development)
     */
    reset() {
        this.cache.clear();
        this.requestHistory = [];
        this.metrics = {
            requestCount: 0,
            cacheHits: 0,
            averageResponseTime: 0,
            providerUsage: new Map(),
            errorRate: 0
        };
    }
}
