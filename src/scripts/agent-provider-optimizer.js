#!/usr/bin/env node

/**
 * AutomatosX Agent-Provider Optimization Script
 *
 * Optimizes the assignment of AI providers (Claude, Codex, Gemini) to 15+ agent roles
 * based on accuracy, capabilities, cost, and speed factors.
 *
 * Authors: Bob (Backend), Tony (CTO), Adrian (Architect)
 * Created: 2025-09-27
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import yaml from 'yaml';

class AgentProviderOptimizer {
    constructor() {
        this.providers = this.initializeProviders();
        this.agents = [];
        this.optimizationConfig = this.loadOptimizationConfig();
        this.workspacePath = './.defai/workspaces/optimization';
    }

    /**
     * Initialize provider characteristics based on industry benchmarks and practical usage
     */
    initializeProviders() {
        return {
            'claude-code': {
                name: 'Claude Code',
                accuracy: 9.2,          // High accuracy for coding and analysis
                capability_breadth: 9.0, // Excellent across many domains
                cost: 0,                // Zero cost (CLI)
                speed: 8.5,             // Good speed
                strengths: ['coding', 'analysis', 'reasoning', 'architecture', 'security'],
                weaknesses: ['real-time-data', 'image-generation'],
                best_for: ['backend', 'frontend', 'security', 'architect', 'quality'],
                token_limits: { opus: 200000, sonnet: 200000, haiku: 200000 },
                models: ['opus', 'sonnet', 'haiku']
            },
            'codex': {
                name: 'OpenAI Codex',
                accuracy: 8.8,          // Very good for coding
                capability_breadth: 8.5, // Strong coding, weaker on business
                cost: 7,                // Medium cost
                speed: 9.0,             // Fast response
                strengths: ['coding', 'debugging', 'code-generation', 'algorithms'],
                weaknesses: ['strategic-thinking', 'business-analysis'],
                best_for: ['backend', 'frontend', 'devops', 'quality'],
                token_limits: { 'gpt-4': 128000, 'gpt-3.5-turbo': 16000 },
                models: ['gpt-4', 'gpt-3.5-turbo']
            },
            'gemini': {
                name: 'Google Gemini',
                accuracy: 8.6,          // Good overall accuracy
                capability_breadth: 9.2, // Excellent breadth, especially multimodal
                cost: 6,                // Lower cost
                speed: 9.2,             // Very fast
                strengths: ['multimodal', 'data-analysis', 'research', 'integration'],
                weaknesses: ['code-generation', 'detailed-architecture'],
                best_for: ['data', 'analyst', 'docs', 'ceo', 'design'],
                token_limits: { 'gemini-pro': 32000, 'gemini-pro-vision': 16000 },
                models: ['gemini-pro', 'gemini-pro-vision']
            }
        };
    }

    /**
     * Load optimization configuration and weights
     */
    loadOptimizationConfig() {
        return {
            weights: {
                accuracy: 0.35,      // High priority on accuracy
                capability: 0.30,    // Important for role fit
                cost: 0.20,          // Cost efficiency matters
                speed: 0.15          // Speed is good but not critical
            },
            task_complexity_factors: {
                simple: { accuracy_boost: 0, cost_weight: 0.3 },
                moderate: { accuracy_boost: 0.1, cost_weight: 0.2 },
                complex: { accuracy_boost: 0.2, cost_weight: 0.1 },
                critical: { accuracy_boost: 0.3, cost_weight: 0.05 }
            },
            role_priorities: {
                // Technical roles prioritize accuracy and capability
                technical: ['backend', 'frontend', 'devops', 'security', 'architect', 'quality'],
                // Business roles balance all factors
                business: ['ceo', 'cto', 'cfo', 'legal', 'prd'],
                // Creative roles prioritize capability and speed
                creative: ['design', 'docs'],
                // Analytical roles prioritize accuracy and capability
                analytical: ['data', 'analyst']
            }
        };
    }

    /**
     * Load all agent profiles from the profiles directory
     */
    async loadAgentProfiles() {
        const profilesDir = './profiles';
        const files = await fs.readdir(profilesDir);

        this.agents = [];

        for (const file of files) {
            if (file.endsWith('.yaml')) {
                const filePath = path.join(profilesDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const profile = yaml.load(content);

                if (profile && profile.role) {
                    this.agents.push({
                        ...profile,
                        current_models: profile.models || {}
                    });
                }
            }
        }

        console.log(chalk.green(`✅ Loaded ${this.agents.length} agent profiles`));
        return this.agents;
    }

    /**
     * Calculate optimization score for agent-provider combination
     */
    calculateOptimizationScore(agent, provider, taskComplexity = 'moderate') {
        const providerData = this.providers[provider];
        const config = this.optimizationConfig;
        const complexityFactor = config.task_complexity_factors[taskComplexity];

        // Base scores
        let accuracy = providerData.accuracy + complexityFactor.accuracy_boost;
        let capability = providerData.capability_breadth;
        let cost = 10 - providerData.cost; // Invert cost (lower cost = higher score)
        let speed = providerData.speed;

        // Role-specific adjustments
        const roleCategory = this.getRoleCategory(agent.role);

        switch (roleCategory) {
            case 'technical':
                accuracy *= 1.2;
                capability *= 1.1;
                break;
            case 'business':
                // Balanced approach
                break;
            case 'creative':
                capability *= 1.2;
                speed *= 1.1;
                break;
            case 'analytical':
                accuracy *= 1.15;
                capability *= 1.15;
                break;
        }

        // Strength/weakness adjustments
        const agentSpecializations = agent.personality?.specializations || [];
        const hasStrengthMatch = providerData.strengths.some(strength =>
            agentSpecializations.some(spec => spec.toLowerCase().includes(strength))
        );

        if (hasStrengthMatch) {
            accuracy *= 1.1;
            capability *= 1.1;
        }

        // Calculate weighted score
        const weights = config.weights;
        const totalScore = (
            accuracy * weights.accuracy +
            capability * weights.capability +
            cost * weights.cost +
            speed * weights.speed
        );

        return {
            total: totalScore,
            breakdown: { accuracy, capability, cost, speed },
            metadata: {
                roleCategory,
                hasStrengthMatch,
                complexityFactor: taskComplexity
            }
        };
    }

    /**
     * Get role category for optimization logic
     */
    getRoleCategory(role) {
        const config = this.optimizationConfig.role_priorities;

        if (config.technical.includes(role)) return 'technical';
        if (config.business.includes(role)) return 'business';
        if (config.creative.includes(role)) return 'creative';
        if (config.analytical.includes(role)) return 'analytical';

        return 'business'; // Default category
    }

    /**
     * Generate optimal provider configuration for an agent
     */
    generateOptimalConfig(agent) {
        const providers = Object.keys(this.providers);
        const complexities = ['simple', 'moderate', 'complex', 'critical'];

        // Calculate scores for all provider-complexity combinations
        const scores = {};

        providers.forEach(provider => {
            scores[provider] = {};
            complexities.forEach(complexity => {
                scores[provider][complexity] = this.calculateOptimizationScore(
                    agent, provider, complexity
                );
            });
        });

        // Find optimal primary provider (best for complex tasks)
        const primaryScores = providers.map(provider => ({
            provider,
            score: scores[provider]['complex'].total,
            breakdown: scores[provider]['complex']
        })).sort((a, b) => b.score - a.score);

        const primary = primaryScores[0];
        const fallback = primaryScores[1];
        const fallback2 = primaryScores[2];

        // Generate stage-specific configurations
        const stageConfigs = {};
        const stages = agent.stages || [];

        stages.forEach(stage => {
            const stageComplexity = this.determineStageComplexity(stage, agent.role);
            const stageScores = providers.map(provider => ({
                provider,
                score: scores[provider][stageComplexity].total,
                breakdown: scores[provider][stageComplexity]
            })).sort((a, b) => b.score - a.score);

            stageConfigs[stage] = {
                provider: stageScores[0].provider,
                fallback: stageScores[1].provider,
                complexity: stageComplexity,
                score: stageScores[0].score
            };
        });

        return {
            agent: agent.role,
            name: agent.name,
            optimization: {
                primary: primary.provider,
                fallback: fallback.provider,
                fallback2: fallback2.provider,
                scores: {
                    primary: primary.score,
                    fallback: fallback.score,
                    fallback2: fallback2.score
                },
                confidence: primary.score - fallback.score // Higher = more confident in choice
            },
            stageConfigs,
            recommendations: this.generateRecommendations(agent, scores, stageConfigs)
        };
    }

    /**
     * Determine complexity level for a specific stage
     */
    determineStageComplexity(stage, role) {
        const complexityMap = {
            // Critical stages that need highest accuracy
            critical: [
                'security_integration_design', 'security_architecture', 'architecture_design',
                'system_analysis', 'performance_optimization', 'service_architecture_planning'
            ],
            // Complex stages requiring deep thinking
            complex: [
                'technology_strategy_formulation', 'innovation_roadmap_development',
                'database_schema_design', 'scalability_planning', 'integration_design'
            ],
            // Moderate complexity stages
            moderate: [
                'api_requirements_analysis', 'deployment_configuration', 'team_capability_assessment',
                'technology_evaluation', 'monitoring_implementation'
            ],
            // Simple stages
            simple: [
                'documentation', 'basic_configuration', 'standard_implementation'
            ]
        };

        for (const [complexity, stages] of Object.entries(complexityMap)) {
            if (stages.includes(stage)) return complexity;
        }

        // Default based on role
        const technicalRoles = ['backend', 'frontend', 'security', 'architect'];
        return technicalRoles.includes(role) ? 'complex' : 'moderate';
    }

    /**
     * Generate recommendations based on optimization analysis
     */
    generateRecommendations(agent, scores, stageConfigs) {
        const recommendations = [];
        const role = agent.role;

        // Check if current configuration is optimal
        const currentPrimary = agent.current_models?.primary?.provider;
        const optimalPrimary = Object.keys(scores).reduce((best, provider) =>
            scores[provider]['complex'].total > scores[best]['complex'].total ? provider : best
        );

        if (currentPrimary && currentPrimary !== optimalPrimary) {
            recommendations.push({
                type: 'provider_change',
                priority: 'high',
                message: `Consider changing primary provider from ${currentPrimary} to ${optimalPrimary}`,
                impact: `Potential ${((scores[optimalPrimary]['complex'].total / scores[currentPrimary]['complex'].total - 1) * 100).toFixed(1)}% improvement`
            });
        }

        // Check for cost optimization opportunities
        const costEfficientProvider = Object.keys(scores).reduce((best, provider) =>
            this.providers[provider].cost < this.providers[best].cost ? provider : best
        );

        if (this.providers[costEfficientProvider].cost === 0 && optimalPrimary !== costEfficientProvider) {
            const costScore = scores[costEfficientProvider]['complex'].total;
            const optimalScore = scores[optimalPrimary]['complex'].total;

            if (costScore / optimalScore > 0.85) { // Less than 15% performance loss
                recommendations.push({
                    type: 'cost_optimization',
                    priority: 'medium',
                    message: `${costEfficientProvider} offers 85%+ performance at zero cost`,
                    impact: 'Significant cost savings with minimal performance impact'
                });
            }
        }

        // Stage-specific recommendations
        const stageProviders = Object.values(stageConfigs).map(config => config.provider);
        const uniqueProviders = [...new Set(stageProviders)];

        if (uniqueProviders.length > 2) {
            recommendations.push({
                type: 'complexity_warning',
                priority: 'low',
                message: `Using ${uniqueProviders.length} different providers across stages may increase complexity`,
                impact: 'Consider consolidating to 1-2 providers for easier management'
            });
        }

        return recommendations;
    }

    /**
     * Run optimization analysis for all agents
     */
    async runOptimization() {
        console.log(chalk.blue('🔍 Starting Agent-Provider Optimization Analysis...'));
        console.log(chalk.gray('Authors: Bob (Backend), Tony (CTO), Adrian (Architect)\n'));

        await this.loadAgentProfiles();

        const results = [];

        for (const agent of this.agents) {
            console.log(chalk.yellow(`Optimizing ${agent.role} (${agent.name})...`));
            const config = this.generateOptimalConfig(agent);
            results.push(config);
        }

        return results;
    }

    /**
     * Generate summary report
     */
    generateSummaryReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            total_agents: results.length,
            optimization_summary: {
                provider_distribution: {},
                average_confidence: 0,
                high_confidence_count: 0,
                cost_savings_opportunities: 0
            },
            recommendations: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            results
        };

        // Calculate summary statistics
        let totalConfidence = 0;

        results.forEach(result => {
            const primary = result.optimization.primary;
            report.optimization_summary.provider_distribution[primary] =
                (report.optimization_summary.provider_distribution[primary] || 0) + 1;

            totalConfidence += result.optimization.confidence;

            if (result.optimization.confidence > 1.0) {
                report.optimization_summary.high_confidence_count++;
            }

            // Count cost savings opportunities
            const costSavings = result.recommendations.filter(rec => rec.type === 'cost_optimization');
            report.optimization_summary.cost_savings_opportunities += costSavings.length;

            // Count recommendations by priority
            result.recommendations.forEach(rec => {
                report.recommendations[rec.priority]++;
            });
        });

        report.optimization_summary.average_confidence = totalConfidence / results.length;

        return report;
    }

    /**
     * Save optimization results to files
     */
    async saveResults(results, report) {
        await fs.ensureDir(this.workspacePath);

        // Save detailed results
        await fs.writeJson(
            path.join(this.workspacePath, 'optimization-results.json'),
            results,
            { spaces: 2 }
        );

        // Save summary report
        await fs.writeJson(
            path.join(this.workspacePath, 'optimization-report.json'),
            report,
            { spaces: 2 }
        );

        // Generate human-readable report
        await this.generateReadableReport(results, report);

        console.log(chalk.green(`\n✅ Results saved to ${this.workspacePath}/`));
    }

    /**
     * Generate human-readable markdown report
     */
    async generateReadableReport(results, report) {
        let markdown = `# AutomatosX Agent-Provider Optimization Report

**Generated:** ${new Date().toLocaleString()}
**Authors:** Bob (Backend Engineer), Tony (CTO), Adrian (Software Architect)

## Executive Summary

- **Total Agents Analyzed:** ${report.total_agents}
- **Average Confidence Score:** ${report.optimization_summary.average_confidence.toFixed(2)}
- **High Confidence Optimizations:** ${report.optimization_summary.high_confidence_count}
- **Cost Savings Opportunities:** ${report.optimization_summary.cost_savings_opportunities}

## Provider Distribution

`;

        Object.entries(report.optimization_summary.provider_distribution).forEach(([provider, count]) => {
            const percentage = ((count / report.total_agents) * 100).toFixed(1);
            markdown += `- **${provider}:** ${count} agents (${percentage}%)\n`;
        });

        markdown += `
## Recommendations Summary

- **Critical:** ${report.recommendations.critical}
- **High Priority:** ${report.recommendations.high}
- **Medium Priority:** ${report.recommendations.medium}
- **Low Priority:** ${report.recommendations.low}

## Detailed Agent Configurations

`;

        results.forEach(result => {
            markdown += `### ${result.name} (${result.agent})

**Optimal Configuration:**
- **Primary:** ${result.optimization.primary} (Score: ${result.optimization.scores.primary.toFixed(2)})
- **Fallback:** ${result.optimization.fallback} (Score: ${result.optimization.scores.fallback.toFixed(2)})
- **Confidence:** ${result.optimization.confidence.toFixed(2)}

`;

            if (result.recommendations.length > 0) {
                markdown += `**Recommendations:**\n`;
                result.recommendations.forEach(rec => {
                    markdown += `- **${rec.priority.toUpperCase()}:** ${rec.message}\n`;
                    if (rec.impact) {
                        markdown += `  - *Impact:* ${rec.impact}\n`;
                    }
                });
                markdown += '\n';
            }
        });

        markdown += `
## Implementation Guidelines

### Immediate Actions
1. Review high-priority recommendations for critical performance improvements
2. Implement cost optimization opportunities for zero-cost providers
3. Update agent configurations with optimal provider assignments

### Gradual Migration
1. Test new configurations in development environment
2. Monitor performance metrics during transition
3. Maintain fallback configurations for stability

### Monitoring
1. Track response times and accuracy metrics
2. Monitor cost implications of provider changes
3. Collect user feedback on agent performance

---
*Generated by AutomatosX Agent-Provider Optimizer*
`;

        await fs.writeFile(
            path.join(this.workspacePath, 'optimization-report.md'),
            markdown
        );
    }

    /**
     * Apply optimizations to agent configuration files
     */
    async applyOptimizations(results, dryRun = true) {
        console.log(chalk.blue(`\n${dryRun ? '🔍 DRY RUN:' : '⚙️  APPLYING:'} Configuration Updates...\n`));

        for (const result of results) {
            const profilePath = `./src/agents/${result.agent}/profile.yaml`;

            if (await fs.pathExists(profilePath)) {
                const content = await fs.readFile(profilePath, 'utf8');
                const profile = yaml.load(content);

                // Update primary model configuration
                if (!profile.models) profile.models = {};

                const primaryProvider = result.optimization.primary;
                const fallbackProvider = result.optimization.fallback;
                const fallback2Provider = result.optimization.fallback2;

                // Update general configurations
                profile.models.primary.provider = primaryProvider;
                profile.models.fallback.provider = fallbackProvider;
                profile.models.fallback2.provider = fallback2Provider;

                // Update stage-specific configurations
                Object.entries(result.stageConfigs).forEach(([stage, config]) => {
                    if (profile.models[stage]) {
                        profile.models[stage].provider = config.provider;
                    }
                    if (profile.models[`${stage}_fallback`]) {
                        profile.models[`${stage}_fallback`].provider = config.fallback;
                    }
                });

                if (dryRun) {
                    console.log(chalk.yellow(`Would update ${result.agent}:`));
                    console.log(chalk.gray(`  Primary: ${primaryProvider}`));
                    console.log(chalk.gray(`  Fallback: ${fallbackProvider}`));
                    console.log(chalk.gray(`  Fallback2: ${fallback2Provider}`));
                } else {
                    // Backup original file
                    await fs.copy(profilePath, `${profilePath}.backup`);

                    // Write updated configuration
                    const updatedYaml = yaml.dump(profile, {
                        lineWidth: 120,
                        noRefs: true
                    });
                    await fs.writeFile(profilePath, updatedYaml);

                    console.log(chalk.green(`✅ Updated ${result.agent} configuration`));
                }
            }
        }

        if (dryRun) {
            console.log(chalk.blue('\n💡 Run with --apply flag to implement changes'));
        } else {
            console.log(chalk.green('\n✅ All configurations updated successfully'));
            console.log(chalk.yellow('📋 Backup files created with .backup extension'));
        }
    }
}

/**
 * CLI Interface
 */
async function main() {
    const args = process.argv.slice(2);
    const optimizer = new AgentProviderOptimizer();

    try {
        if (args.includes('--help') || args.includes('-h')) {
            console.log(`
AutomatosX Agent-Provider Optimizer

Usage:
  node src/scripts/agent-provider-optimizer.js [options]

Options:
  --apply           Apply optimizations to configuration files
  --dry-run         Show what would be changed (default)
  --report-only     Generate report without showing configurations
  --help, -h        Show this help message

Examples:
  node src/scripts/agent-provider-optimizer.js                    # Analyze and generate report
  node src/scripts/agent-provider-optimizer.js --dry-run          # Show proposed changes
  node src/scripts/agent-provider-optimizer.js --apply            # Apply optimizations
  node src/scripts/agent-provider-optimizer.js --report-only      # Quick summary report

Authors: Bob (Backend), Tony (CTO), Adrian (Architect)
`);
            return;
        }

        const results = await optimizer.runOptimization();
        const report = optimizer.generateSummaryReport(results);

        // Save results
        await optimizer.saveResults(results, report);

        // Display summary
        console.log(chalk.blue('\n📊 Optimization Summary:'));
        console.log(chalk.white(`- Agents Analyzed: ${report.total_agents}`));
        console.log(chalk.white(`- Average Confidence: ${report.optimization_summary.average_confidence.toFixed(2)}`));
        console.log(chalk.white(`- High Confidence: ${report.optimization_summary.high_confidence_count}`));
        console.log(chalk.white(`- Cost Savings Opportunities: ${report.optimization_summary.cost_savings_opportunities}`));

        // Show provider distribution
        console.log(chalk.blue('\n🎯 Recommended Provider Distribution:'));
        Object.entries(report.optimization_summary.provider_distribution).forEach(([provider, count]) => {
            const percentage = ((count / report.total_agents) * 100).toFixed(1);
            console.log(chalk.white(`- ${provider}: ${count} agents (${percentage}%)`));
        });

        if (!args.includes('--report-only')) {
            // Apply or dry-run configurations
            const shouldApply = args.includes('--apply');
            await optimizer.applyOptimizations(results, !shouldApply);
        }

    } catch (error) {
        console.error(chalk.red('❌ Optimization failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { AgentProviderOptimizer };
