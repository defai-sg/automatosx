/**
 * AutomatosX v2.0 Core Router
 * Revolutionary multi-provider AI routing with intelligent fallbacks
 * Integrated with Claude Code ecosystem
 */

import chalk from 'chalk';
import { ClaudeCodeProvider } from '../providers/claude-code.js';
import { OpenAICLIProvider } from '../providers/openai-cli.js';
import { GeminiCLIProvider } from '../providers/gemini-cli.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { ProjectMemory } from './memory.js';
import { getAgentByRole } from '../agents/agent-profiles.js';

export class AutomatosXRouter {
    constructor(projectPath = process.cwd(), config = {}) {
        this.projectPath = projectPath;
        this.config = config;

        // Initialize providers based on configuration
        this.providers = {
            'claude-code': new ClaudeCodeProvider(), // Always available - required
            'openai-cli': new OpenAICLIProvider(config.openai || {}), // Optional
            'gemini-cli': new GeminiCLIProvider(config.gemini || {}) // Optional
        };

        // Initialize circuit breakers for each provider
        this.circuitBreakers = {
            'claude-code': new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
            'openai-cli': new CircuitBreaker({ failureThreshold: 5, resetTimeout: 300000 }),
            'gemini-cli': new CircuitBreaker({ failureThreshold: 5, resetTimeout: 300000 })
        };

        this.memory = new ProjectMemory(projectPath);
        this.lastUsedProvider = null;
        this.lastRequestCost = 0;
    }

    /**
     * Detect project context and technology stack
     */
    async detectProjectContext() {
        const fs = await import('fs-extra');
        const path = await import('path');

        const context = {
            projectName: path.basename(this.projectPath),
            projectType: 'generic',
            techStack: [],
            framework: null,
            architecture: 'unknown',
            database: null,
            hasTests: false,
            hasCI: false
        };

        try {
            // Detect Node.js projects
            if (await fs.pathExists(path.join(this.projectPath, 'package.json'))) {
                const pkg = await fs.readJson(path.join(this.projectPath, 'package.json'));
                context.projectType = 'nodejs';
                context.projectName = pkg.name || context.projectName;

                // Detect frameworks
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                if (deps.react) context.framework = 'react';
                else if (deps.vue) context.framework = 'vue';
                else if (deps.angular) context.framework = 'angular';
                else if (deps.svelte) context.framework = 'svelte';
                else if (deps.express) context.framework = 'express';
                else if (deps.fastify) context.framework = 'fastify';

                context.techStack = Object.keys(deps);
                context.hasTests = !!deps.jest || !!deps.mocha || !!deps.vitest;
            }

            // Detect Python projects
            if (await fs.pathExists(path.join(this.projectPath, 'pyproject.toml')) ||
                await fs.pathExists(path.join(this.projectPath, 'requirements.txt'))) {
                context.projectType = 'python';

                // Detect Python frameworks
                const reqExists = await fs.pathExists(path.join(this.projectPath, 'requirements.txt'));
                if (reqExists) {
                    const reqs = await fs.readFile(path.join(this.projectPath, 'requirements.txt'), 'utf8');
                    if (reqs.includes('django')) context.framework = 'django';
                    else if (reqs.includes('flask')) context.framework = 'flask';
                    else if (reqs.includes('fastapi')) context.framework = 'fastapi';

                    context.hasTests = reqs.includes('pytest') || reqs.includes('unittest');
                }
            }

            // Detect architecture patterns
            const srcExists = await fs.pathExists(path.join(this.projectPath, 'src'));
            const appExists = await fs.pathExists(path.join(this.projectPath, 'app'));

            if (srcExists && appExists) context.architecture = 'monorepo';
            else if (srcExists) context.architecture = 'src-based';
            else if (appExists) context.architecture = 'app-based';

            // Detect CI/CD
            context.hasCI = await fs.pathExists(path.join(this.projectPath, '.github/workflows')) ||
                           await fs.pathExists(path.join(this.projectPath, '.gitlab-ci.yml'));

        } catch (error) {
            console.warn(chalk.yellow(`Warning: Could not fully detect project context: ${error.message}`));
        }

        return context;
    }

    /**
     * Route task to optimal provider chain based on task type
     */
    getProviderChain(taskType, role) {
        const routes = {
            // Code Path: Claude Code (required) → OpenAI CLI (optional) → Gemini CLI (optional)
            coding: ['claude-code:sonnet', 'openai-cli:gpt-4', 'gemini-cli:2.5-pro'],

            // QA / Analysis Path: OpenAI CLI (optional) → Gemini CLI (optional) → Claude Code (required)
            qa: ['openai-cli:gpt-4', 'gemini-cli:2.5-pro', 'claude-code:sonnet'],

            // Creative / Strategy Path: Gemini CLI (optional) → Claude Code (required) → OpenAI CLI (optional)
            creative: ['gemini-cli:2.5-pro', 'claude-code:sonnet', 'openai-cli:gpt-4']
        };

        // Role-based task categorization
        const roleCategories = {
            algorithm: 'coding',
            analyst: 'qa',
            architect: 'coding',
            backend: 'coding',
            ceo: 'creative',
            cfo: 'qa',
            cto: 'coding',
            data: 'coding',
            design: 'creative',
            devops: 'coding',
            docs: 'creative',
            edge: 'coding',
            frontend: 'coding',
            legal: 'qa',
            marketer: 'creative',
            network: 'coding',
            product: 'creative',
            quality: 'qa',
            quantum: 'coding',
            security: 'qa'
        };

        const category = roleCategories[role] || this.categorizeTaskByContent(taskType);
        const resolvedCategory = routes[category] ? category : 'coding';
        const fullChain = routes[resolvedCategory];

        // Filter out unavailable providers
        return fullChain.filter(providerSpec => {
            const [providerName] = providerSpec.split(':');
            const provider = this.providers[providerName];
            return provider && provider.available;
        });
    }

    /**
     * Execute task with automatic failover
     */
    async executeWithFailover(role, task, context = {}) {
        const providerChain = this.getProviderChain(task, role);
        const projectContext = context.projectContext || await this.detectProjectContext();
        const relevantMemory = await this.memory.retrieveRelevantContext(role, task);

        console.log(chalk.blue(`🎯 Routing ${role} task through: ${providerChain.join(' → ')}`));

        for (let i = 0; i < providerChain.length; i++) {
            const providerSpec = providerChain[i];
            const [providerName, model] = providerSpec.split(':');

            // Check if provider is available and circuit breaker allows it
            const provider = this.providers[providerName];
            if (!provider || !provider.available) {
                console.log(chalk.yellow(`⚠️  Provider ${providerName} not available, skipping`));
                continue;
            }

            const circuitBreaker = this.circuitBreakers[providerName];
            if (circuitBreaker.state === 'OPEN') {
                console.log(chalk.yellow(`⚠️  Provider ${providerSpec} circuit breaker open, skipping`));
                continue;
            }

            try {
                console.log(chalk.green(`🔄 Attempting with ${providerSpec} (${i + 1}/${providerChain.length})`));

                const provider = this.providers[providerName];
                const prompt = this.buildRolePrompt(role, task, projectContext, relevantMemory);

                const startTime = Date.now();

                // Use circuit breaker to execute with timeout protection
                const result = await circuitBreaker.call(async () => {
                    return await provider.execute(prompt, {
                        model: model,
                        role: role,
                        maxTokens: this.getMaxTokensForRole(role),
                        temperature: this.getTemperatureForRole(role)
                    });
                });

                const duration = Date.now() - startTime;
                this.lastUsedProvider = providerSpec;
                this.lastRequestCost = await this.estimateCost(providerSpec, prompt, result);

                // Store successful interaction in memory
                await this.memory.storeInteraction(role, task, result, {
                    provider: providerSpec,
                    duration: duration,
                    cost: this.lastRequestCost,
                    context: projectContext
                });

                console.log(chalk.green(`✅ Success with ${providerSpec} (${duration}ms, $${this.lastRequestCost.toFixed(4)})`));

                return {
                    result: result,
                    metadata: {
                        provider: providerSpec,
                        duration: duration,
                        cost: this.lastRequestCost,
                        fallbacksUsed: i,
                        context: projectContext.projectName
                    }
                };

            } catch (error) {
                console.log(chalk.red(`❌ Provider ${providerSpec} failed: ${error.message}`));

                if (i === providerChain.length - 1) {
                    throw new Error(`All providers in chain failed. Last error: ${error.message}`);
                }
            }
        }

        throw new Error('No providers available in circuit breaker');
    }

    /**
     * Build role-specific prompt with context
     */
    buildRolePrompt(role, task, projectContext, relevantMemory) {
        const agentProfile = getAgentByRole(role);
        const specialization = agentProfile?.specializations?.slice?.(0, 3).join(', ');
        const roleDesc = agentProfile
            ? `You are ${agentProfile.name || 'a'} ${agentProfile.title} specializing in ${specialization || role} domains.`
            : `You are a specialized ${role} expert.`;

        return `${roleDesc}

Project Context:
- Project: ${projectContext.projectName} (${projectContext.projectType})
- Tech Stack: ${projectContext.techStack.slice(0, 5).join(', ')}${projectContext.techStack.length > 5 ? '...' : ''}
- Framework: ${projectContext.framework || 'N/A'}
- Architecture: ${projectContext.architecture}

${relevantMemory.length > 0 ? `Relevant Previous Work:
${relevantMemory.slice(0, 3).map(m => `- ${m.task}: ${m.summary || m.result.substring(0, 100)}`).join('\n')}

` : ''}Current Task: ${task}

Please provide a comprehensive solution following the project's established patterns and best practices. Focus on practical implementation details and maintainable code.`;
    }

    categorizeTaskByContent(task) {
        const taskLower = task.toLowerCase();

        if (taskLower.includes('implement') || taskLower.includes('code') || taskLower.includes('develop') || taskLower.includes('build')) {
            return 'coding';
        } else if (taskLower.includes('test') || taskLower.includes('review') || taskLower.includes('validate') || taskLower.includes('check')) {
            return 'qa';
        } else {
            return 'creative';
        }
    }

    getMaxTokensForRole(role) {
        const tokenLimits = {
            architect: 4000,
            cto: 3500,
            ceo: 3200,
            security: 3200,
            analyst: 3000,
            cfo: 3000,
            backend: 2500,
            frontend: 2500,
            devops: 2500,
            data: 2500,
            algorithm: 2500,
            quantum: 2500,
            product: 2400,
            design: 2400,
            docs: 2200,
            marketer: 2200,
            quality: 2200,
            edge: 2200,
            network: 2200,
            legal: 2200,
            default: 2000
        };
        return tokenLimits[role] || tokenLimits.default;
    }

    getTemperatureForRole(role) {
        const temperatures = {
            backend: 0.1,
            frontend: 0.2,
            devops: 0.1,
            data: 0.15,
            algorithm: 0.1,
            quantum: 0.15,
            edge: 0.15,
            network: 0.15,
            security: 0.1,
            quality: 0.15,
            analyst: 0.2,
            cfo: 0.2,
            legal: 0.2,
            architect: 0.25,
            cto: 0.25,
            ceo: 0.4,
            product: 0.35,
            design: 0.6,
            docs: 0.4,
            marketer: 0.6,
            default: 0.3
        };
        return temperatures[role] || temperatures.default;
    }

    async estimateCost(providerSpec, prompt, result) {
        // Simplified cost estimation - in real implementation would use actual token counts
        const baseCosts = {
            'claude-code': 0, // Free with Claude Code subscription
            'openai': 0.03,   // Approximate per 1K tokens
            'gemini': 0.001   // Approximate per 1K tokens
        };

        const provider = providerSpec.split(':')[0];
        const baseCost = baseCosts[provider] || 0.01;
        const estimatedTokens = (prompt.length + (result?.length || 0)) / 4; // Rough estimation

        return (estimatedTokens / 1000) * baseCost;
    }
}
