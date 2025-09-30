/**
 * Agent Performance Metrics System
 * Developed with Anna (Business Analyst) for comprehensive system analytics
 * Provides data-driven insights into agent performance and system optimization
 */

export class AgentPerformanceMetrics {
    constructor() {
        this.metrics = new Map();
        this.sessionData = new Map();
        this.aggregatedStats = {
            totalTasks: 0,
            totalTime: 0,
            successRate: 0,
            averageResponseTime: 0,
            topPerformers: [],
            taskTypeDistribution: new Map(),
            hourlyUsage: new Array(24).fill(0)
        };
        this.metricHistory = [];
        this.alertThresholds = {
            responseTime: 180000, // 3 minutes
            errorRate: 0.1, // 10%
            utilizationRate: 0.8 // 80%
        };
    }

    /**
     * Record task execution metrics
     */
    recordTaskExecution(agentRole, task, execution) {
        const timestamp = Date.now();
        const hour = new Date(timestamp).getHours();

        const record = {
            timestamp,
            agentRole,
            taskType: this.classifyTaskType(task),
            duration: execution.duration,
            success: execution.success,
            provider: execution.provider,
            tokenUsage: execution.tokenUsage || 0,
            errorType: execution.errorType || null,
            responseQuality: execution.responseQuality || null
        };

        // Store individual record
        if (!this.metrics.has(agentRole)) {
            this.metrics.set(agentRole, []);
        }
        this.metrics.get(agentRole).push(record);

        // Update aggregated statistics
        this.updateAggregatedStats(record, hour);

        // Store in history for trend analysis
        this.metricHistory.push(record);

        // Trim history if it gets too large (keep last 10,000 records)
        if (this.metricHistory.length > 10000) {
            this.metricHistory.shift();
        }

        return record;
    }

    /**
     * Classify task type for analytics
     */
    classifyTaskType(task) {
        const taskLower = task.toLowerCase();

        const classifications = {
            'analysis': ['analyze', 'research', 'investigate', 'study', 'examine'],
            'implementation': ['implement', 'build', 'create', 'develop', 'code'],
            'review': ['review', 'audit', 'check', 'validate', 'inspect'],
            'documentation': ['document', 'write', 'explain', 'describe', 'guide'],
            'optimization': ['optimize', 'improve', 'enhance', 'refactor', 'upgrade'],
            'planning': ['plan', 'design', 'strategy', 'roadmap', 'organize'],
            'troubleshooting': ['debug', 'fix', 'solve', 'troubleshoot', 'repair']
        };

        for (const [type, keywords] of Object.entries(classifications)) {
            if (keywords.some(keyword => taskLower.includes(keyword))) {
                return type;
            }
        }

        return 'general';
    }

    /**
     * Update aggregated statistics
     */
    updateAggregatedStats(record, hour) {
        this.aggregatedStats.totalTasks++;
        this.aggregatedStats.totalTime += record.duration;
        this.aggregatedStats.averageResponseTime = this.aggregatedStats.totalTime / this.aggregatedStats.totalTasks;

        // Update hourly usage
        this.aggregatedStats.hourlyUsage[hour]++;

        // Update task type distribution
        const currentCount = this.aggregatedStats.taskTypeDistribution.get(record.taskType) || 0;
        this.aggregatedStats.taskTypeDistribution.set(record.taskType, currentCount + 1);

        // Recalculate success rate
        const successfulTasks = this.metricHistory.filter(r => r.success).length;
        this.aggregatedStats.successRate = successfulTasks / this.aggregatedStats.totalTasks;

        // Update top performers
        this.updateTopPerformers();
    }

    /**
     * Update top performing agents
     */
    updateTopPerformers() {
        const agentStats = new Map();

        this.metrics.forEach((records, agentRole) => {
            const recentRecords = records.filter(r =>
                (Date.now() - r.timestamp) < (7 * 24 * 60 * 60 * 1000) // Last 7 days
            );

            if (recentRecords.length > 0) {
                const successCount = recentRecords.filter(r => r.success).length;
                const avgResponseTime = recentRecords.reduce((sum, r) => sum + r.duration, 0) / recentRecords.length;
                const taskCount = recentRecords.length;

                agentStats.set(agentRole, {
                    successRate: successCount / taskCount,
                    averageResponseTime: avgResponseTime,
                    taskCount,
                    performanceScore: (successCount / taskCount) * (1 - Math.min(avgResponseTime / 300000, 0.5))
                });
            }
        });

        this.aggregatedStats.topPerformers = Array.from(agentStats.entries())
            .sort((a, b) => b[1].performanceScore - a[1].performanceScore)
            .slice(0, 5)
            .map(([agent, stats]) => ({ agent, ...stats }));
    }

    /**
     * Get comprehensive agent performance report
     */
    getAgentPerformanceReport(agentRole, timeframe = 7) {
        const records = this.metrics.get(agentRole) || [];
        const cutoff = Date.now() - (timeframe * 24 * 60 * 60 * 1000);
        const relevantRecords = records.filter(r => r.timestamp > cutoff);

        if (relevantRecords.length === 0) {
            return {
                agent: agentRole,
                noData: true,
                message: `No data available for ${agentRole} in the last ${timeframe} days`
            };
        }

        const successfulTasks = relevantRecords.filter(r => r.success);
        const totalDuration = relevantRecords.reduce((sum, r) => sum + r.duration, 0);
        const taskTypes = this.groupByTaskType(relevantRecords);
        const providerUsage = this.groupByProvider(relevantRecords);
        const dailyUsage = this.getDailyUsage(relevantRecords, timeframe);

        return {
            agent: agentRole,
            timeframe: `${timeframe} days`,
            summary: {
                totalTasks: relevantRecords.length,
                successfulTasks: successfulTasks.length,
                successRate: successfulTasks.length / relevantRecords.length,
                averageResponseTime: totalDuration / relevantRecords.length,
                totalTime: totalDuration
            },
            taskTypeBreakdown: taskTypes,
            providerUsage,
            dailyUsage,
            trends: this.calculateTrends(relevantRecords),
            recommendations: this.generateRecommendations(relevantRecords, agentRole)
        };
    }

    /**
     * Group records by task type
     */
    groupByTaskType(records) {
        const groups = new Map();
        records.forEach(record => {
            if (!groups.has(record.taskType)) {
                groups.set(record.taskType, { count: 0, totalTime: 0, successCount: 0 });
            }
            const group = groups.get(record.taskType);
            group.count++;
            group.totalTime += record.duration;
            if (record.success) group.successCount++;
        });

        return Array.from(groups.entries()).map(([type, stats]) => ({
            taskType: type,
            count: stats.count,
            averageTime: stats.totalTime / stats.count,
            successRate: stats.successCount / stats.count,
            percentage: (stats.count / records.length) * 100
        }));
    }

    /**
     * Group records by provider
     */
    groupByProvider(records) {
        const groups = new Map();
        records.forEach(record => {
            if (!groups.has(record.provider)) {
                groups.set(record.provider, { count: 0, totalTime: 0, successCount: 0 });
            }
            const group = groups.get(record.provider);
            group.count++;
            group.totalTime += record.duration;
            if (record.success) group.successCount++;
        });

        return Array.from(groups.entries()).map(([provider, stats]) => ({
            provider,
            count: stats.count,
            averageTime: stats.totalTime / stats.count,
            successRate: stats.successCount / stats.count,
            percentage: (stats.count / records.length) * 100
        }));
    }

    /**
     * Get daily usage patterns
     */
    getDailyUsage(records, days) {
        const usage = new Array(days).fill(0);
        const now = Date.now();

        records.forEach(record => {
            const dayIndex = Math.floor((now - record.timestamp) / (24 * 60 * 60 * 1000));
            if (dayIndex < days) {
                usage[days - 1 - dayIndex]++;
            }
        });

        return usage.map((count, index) => ({
            day: index - days + 1, // Negative for past days, 0 for today
            taskCount: count
        }));
    }

    /**
     * Calculate performance trends
     */
    calculateTrends(records) {
        if (records.length < 10) return null;

        const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
        const midpoint = Math.floor(sortedRecords.length / 2);

        const firstHalf = sortedRecords.slice(0, midpoint);
        const secondHalf = sortedRecords.slice(midpoint);

        const firstHalfSuccess = firstHalf.filter(r => r.success).length / firstHalf.length;
        const secondHalfSuccess = secondHalf.filter(r => r.success).length / secondHalf.length;

        const firstHalfTime = firstHalf.reduce((sum, r) => sum + r.duration, 0) / firstHalf.length;
        const secondHalfTime = secondHalf.reduce((sum, r) => sum + r.duration, 0) / secondHalf.length;

        return {
            successRateTrend: secondHalfSuccess - firstHalfSuccess,
            responseTimeTrend: secondHalfTime - firstHalfTime,
            interpretation: {
                successRate: secondHalfSuccess > firstHalfSuccess ? 'improving' : 'declining',
                responseTime: secondHalfTime < firstHalfTime ? 'improving' : 'declining'
            }
        };
    }

    /**
     * Generate recommendations based on performance data
     */
    generateRecommendations(records, agentRole) {
        const recommendations = [];
        const successRate = records.filter(r => r.success).length / records.length;
        const avgResponseTime = records.reduce((sum, r) => sum + r.duration, 0) / records.length;

        // Success rate recommendations
        if (successRate < 0.9) {
            recommendations.push({
                type: 'quality',
                priority: 'high',
                message: `Success rate (${(successRate * 100).toFixed(1)}%) is below optimal. Consider reviewing task complexity or provider configuration.`
            });
        }

        // Response time recommendations
        if (avgResponseTime > this.alertThresholds.responseTime) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Average response time (${(avgResponseTime / 1000).toFixed(1)}s) exceeds threshold. Consider optimizing model configuration.`
            });
        }

        // Task type specific recommendations
        const taskTypes = this.groupByTaskType(records);
        const problematicTypes = taskTypes.filter(t => t.successRate < 0.8);

        if (problematicTypes.length > 0) {
            recommendations.push({
                type: 'task-specific',
                priority: 'medium',
                message: `Poor performance on ${problematicTypes.map(t => t.taskType).join(', ')} tasks. Consider specialized optimization.`
            });
        }

        return recommendations;
    }

    /**
     * Get system-wide analytics dashboard data
     */
    getSystemDashboard() {
        return {
            overview: this.aggregatedStats,
            recentActivity: this.getRecentActivity(),
            alerts: this.getActiveAlerts(),
            agentComparison: this.getAgentComparison(),
            usagePatterns: this.getUsagePatterns()
        };
    }

    /**
     * Get recent system activity
     */
    getRecentActivity(limit = 10) {
        return this.metricHistory
            .slice(-limit)
            .reverse()
            .map(record => ({
                timestamp: record.timestamp,
                agent: record.agentRole,
                taskType: record.taskType,
                duration: record.duration,
                success: record.success,
                provider: record.provider
            }));
    }

    /**
     * Get active system alerts
     */
    getActiveAlerts() {
        const alerts = [];
        const recentRecords = this.metricHistory.filter(r =>
            (Date.now() - r.timestamp) < (60 * 60 * 1000) // Last hour
        );

        if (recentRecords.length > 0) {
            const errorRate = recentRecords.filter(r => !r.success).length / recentRecords.length;
            const avgResponseTime = recentRecords.reduce((sum, r) => sum + r.duration, 0) / recentRecords.length;

            if (errorRate > this.alertThresholds.errorRate) {
                alerts.push({
                    type: 'error_rate',
                    severity: 'high',
                    message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
                    value: errorRate
                });
            }

            if (avgResponseTime > this.alertThresholds.responseTime) {
                alerts.push({
                    type: 'response_time',
                    severity: 'medium',
                    message: `Slow response times detected: ${(avgResponseTime / 1000).toFixed(1)}s average`,
                    value: avgResponseTime
                });
            }
        }

        return alerts;
    }

    /**
     * Get agent comparison metrics
     */
    getAgentComparison() {
        const comparison = [];

        this.metrics.forEach((records, agentRole) => {
            const recentRecords = records.filter(r =>
                (Date.now() - r.timestamp) < (24 * 60 * 60 * 1000) // Last 24 hours
            );

            if (recentRecords.length > 0) {
                const successRate = recentRecords.filter(r => r.success).length / recentRecords.length;
                const avgResponseTime = recentRecords.reduce((sum, r) => sum + r.duration, 0) / recentRecords.length;

                comparison.push({
                    agent: agentRole,
                    taskCount: recentRecords.length,
                    successRate,
                    averageResponseTime: avgResponseTime,
                    efficiency: successRate * (1 - Math.min(avgResponseTime / 300000, 0.5))
                });
            }
        });

        return comparison.sort((a, b) => b.efficiency - a.efficiency);
    }

    /**
     * Get usage patterns analysis
     */
    getUsagePatterns() {
        return {
            hourlyDistribution: this.aggregatedStats.hourlyUsage,
            taskTypeDistribution: Array.from(this.aggregatedStats.taskTypeDistribution.entries())
                .map(([type, count]) => ({ type, count, percentage: (count / this.aggregatedStats.totalTasks) * 100 }))
                .sort((a, b) => b.count - a.count),
            peakHours: this.getPeakUsageHours(),
            weekdayPatterns: this.getWeekdayPatterns()
        };
    }

    /**
     * Get peak usage hours
     */
    getPeakUsageHours() {
        const hourlyUsage = this.aggregatedStats.hourlyUsage;
        const maxUsage = Math.max(...hourlyUsage);

        return hourlyUsage
            .map((usage, hour) => ({ hour, usage }))
            .filter(h => h.usage > maxUsage * 0.8)
            .sort((a, b) => b.usage - a.usage);
    }

    /**
     * Get weekday usage patterns
     */
    getWeekdayPatterns() {
        const weekdays = new Array(7).fill(0); // 0 = Sunday

        this.metricHistory.forEach(record => {
            const day = new Date(record.timestamp).getDay();
            weekdays[day]++;
        });

        return weekdays.map((count, day) => ({
            day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
            count,
            percentage: this.metricHistory.length > 0 ? (count / this.metricHistory.length) * 100 : 0
        }));
    }

    /**
     * Export metrics data for external analysis
     */
    exportMetrics(format = 'json', agentRole = null, timeframe = 30) {
        const cutoff = Date.now() - (timeframe * 24 * 60 * 60 * 1000);
        let data = this.metricHistory.filter(r => r.timestamp > cutoff);

        if (agentRole) {
            data = data.filter(r => r.agentRole === agentRole);
        }

        if (format === 'csv') {
            const headers = 'timestamp,agentRole,taskType,duration,success,provider,tokenUsage,errorType\n';
            const rows = data.map(r =>
                `${r.timestamp},${r.agentRole},${r.taskType},${r.duration},${r.success},${r.provider},${r.tokenUsage || 0},${r.errorType || ''}`
            ).join('\n');
            return headers + rows;
        }

        return JSON.stringify(data, null, 2);
    }
}