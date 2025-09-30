/**
 * Enhanced AutomatosX Router v3.1.1
 * Integrates Agent Platform-style profiles with chat history tracking
 * Combines YAML-driven configuration with CLI-first architecture
 */

import chalk from 'chalk';
import { ProfileManager } from './profile-manager.js';
import { ChatHistoryManager } from './chat-history.js';
import { getAgentAbilities } from './abilities.js';
import { ClaudeCodeProvider } from '../providers/claude-code.js';
import { OpenAICLIProvider } from '../providers/openai-cli.js';
import { GeminiCLIProvider } from '../providers/gemini-cli.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { WorkflowRouter } from './workflow-router.js';
import fs from 'fs-extra';
import path from 'path';

export class EnhancedAutomatosXRouter {
    constructor(projectPath = process.cwd(), config = {}) {
        this.projectPath = projectPath;
        this.config = config;

        // Initialize profile and chat history managers
        this.profileManager = new ProfileManager();
        this.chatHistory = new ChatHistoryManager(projectPath);
        this.abilities = null; // Will be initialized lazily

        // Will be initialized with provider config in initialize()
        this.providers = {};

        // Circuit breakers for reliability
        this.circuitBreakers = {
            'claude-code': new CircuitBreaker({ failureThreshold: 3, resetTimeout: 60000 }),
            'openai-cli': new CircuitBreaker({ failureThreshold: 5, resetTimeout: 300000 }),
            'gemini-cli': new CircuitBreaker({ failureThreshold: 5, resetTimeout: 300000 })
        };

        // Initialize workflow router for multi-agent orchestration
        this.workflowRouter = new WorkflowRouter(projectPath);

        this.initialized = false;
    }

    /**
     * Initialize the router - load profiles and setup systems
     */
    async initializeProviders() {
        // Load provider configuration from src/config/providers.json
        const configPath = path.join(this.projectPath, 'src/config/providers.json');
        let providerConfig = {};

        try {
            if (await fs.pathExists(configPath)) {
                providerConfig = await fs.readJson(configPath);
            }
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not load provider config, using defaults'));
        }

        // Initialize providers with loaded config
        this.providers = {
            'claude-code': new ClaudeCodeProvider(providerConfig['claude-code'] || {}),
            'openai-cli': new OpenAICLIProvider(providerConfig['openai-cli'] || {}),
            'gemini-cli': new GeminiCLIProvider(providerConfig['gemini-cli'] || {})
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log(chalk.blue('🚀 Initializing Enhanced AutomatosX Router...'));

        try {
            // Initialize providers with config
            await this.initializeProviders();

            // Load agent profiles
            await this.profileManager.loadProfiles();

            // Initialize chat history system
            await this.chatHistory.initialize();

            // Initialize abilities system
            this.abilities = await getAgentAbilities();

            // Initialize workflow router
            await this.workflowRouter.initialize();

            // Test provider availability
            await this.testProviders();

            this.initialized = true;
            console.log(chalk.green('✅ Enhanced AutomatosX Router initialized successfully'));

        } catch (error) {
            console.error(chalk.red('❌ Failed to initialize router:'), error.message);
            throw error;
        }
    }

    /**
     * Route a task to an appropriate agent
     * @param {string} role - Agent role (backend, frontend, ceo, etc.)
     * @param {string} task - User task/prompt
     * @param {Object} options - Additional options
     */
    async routeTask(roleOrName, task, options = {}) {
        await this.initialize();

        const startTime = Date.now();

        try {
            // Resolve agent name to role for consistency
            const role = this.profileManager.resolveNameToRole(roleOrName);

            // Get enhanced profile (YAML + personality)
            const profile = this.profileManager.getEnhancedProfile(role);
            if (!profile) {
                throw new Error(`Unknown agent role: ${role}`);
            }

            console.log(chalk.blue(`🎯 Routing task to ${chalk.bold(role)} agent...`));

            // Get relevant abilities for the role
            const relevantAbilities = await this.getRelevantAbilities(role, task);

            // Build enhanced agent prompt with abilities
            const agentPrompt = this.profileManager.buildAgentPrompt(
                role,
                task,
                options.basePrompt || '',
                relevantAbilities
            );

            // Determine stage and model
            const stage = options.stage || profile.stages?.[0] || 'default';
            const modelConfig = this.profileManager.getModelForStage(role, stage);

            // Route to appropriate provider
            const result = await this.executeWithFallback(modelConfig, agentPrompt, {
                role,
                stage,
                task,
                ...options
            });

            // Record conversation in chat history
            const responseTime = Date.now() - startTime;
            await this.chatHistory.recordConversation(role, task, result.content, {
                provider: result.provider,
                model: result.model,
                responseTime,
                tokensUsed: result.tokensUsed || 0,
                stage: stage
            });

            console.log(chalk.green(`✅ Task completed by ${role} agent`),
                       chalk.gray(`(${responseTime}ms)`));

            return {
                role,
                stage,
                content: result.content,
                provider: result.provider,
                model: result.model,
                responseTime,
                tokensUsed: result.tokensUsed
            };

        } catch (error) {
            const errorTime = Date.now() - startTime;
            console.error(chalk.red(`❌ Task failed for ${role} agent:`), error.message);

            // Record error in chat history
            await this.chatHistory.recordConversation(role, task, `Error: ${error.message}`, {
                provider: 'error',
                model: 'error',
                responseTime: errorTime,
                error: true
            });

            throw error;
        }
    }

    /**
     * Execute with intelligent fallback across providers
     */
    async executeWithFallback(providerConfig, prompt, context = {}) {
        // Use provider priority order instead of model specifications
        const providers = [
            providerConfig?.primary || 'claude-code',
            providerConfig?.fallback || 'gemini-cli',
            providerConfig?.fallback2 || 'openai-cli',
            'claude-code' // Ultimate fallback to primary provider
        ].filter(Boolean);

        let lastError;

        for (const provider of providers) {
            try {
                // Check circuit breaker
                const circuitBreaker = this.circuitBreakers[provider];
                if (circuitBreaker && !circuitBreaker.canExecute()) {
                    console.log(chalk.yellow(`⚠️  Circuit breaker open for ${provider}, skipping...`));
                    continue;
                }

                // Check if provider is available
                if (!this.providers[provider]) {
                    console.log(chalk.yellow(`⚠️  Provider ${provider} not available, skipping...`));
                    continue;
                }

                // Execute request with provider's default model
                const result = await this.providers[provider].call({
                    prompt,
                    context
                });

                // Record success in circuit breaker
                if (circuitBreaker) {
                    circuitBreaker.recordSuccess();
                }

                return {
                    content: result.content || result,
                    provider,
                    model: modelName,
                    tokensUsed: result.tokensUsed || 0
                };

            } catch (error) {
                lastError = error;
                console.log(chalk.yellow(`⚠️  ${typeof model === 'string' ? model : `${model.provider}:${model.model}`} failed: ${error.message}, trying fallback...`));

                // Record failure in circuit breaker
                let provider;
                if (typeof model === 'string') {
                    provider = model.split(':')[0];
                } else if (typeof model === 'object' && model.provider) {
                    provider = model.provider;
                }
                const circuitBreaker = this.circuitBreakers[provider];
                if (circuitBreaker) {
                    circuitBreaker.recordFailure();
                }
            }
        }

        throw new Error(`All providers failed. Last error: ${lastError?.message}`);
    }

    /**
     * Get available agent roles
     */
    getAvailableRoles() {
        return this.profileManager.getAvailableRoles();
    }

    /**
     * Get agent information
     */
    getAgentInfo(role) {
        const profile = this.profileManager.getEnhancedProfileByNameOrRole(role);
        if (!profile) return null;

        return {
            role: profile.role,
            description: profile.description,
            stages: profile.stages || [],
            hasPersonality: profile.hasPersonality,
            personality: profile.personality ? {
                name: profile.personality.name,
                title: profile.personality.title,
                personality: profile.personality.personality,
                specializations: profile.personality.specializations,
                catchphrase: profile.personality.catchphrase
            } : null
        };
    }

    /**
     * Get relevant abilities for a role and task
     */
    async getRelevantAbilities(role, task) {
        if (!this.abilities) {
            this.abilities = await getAgentAbilities();
        }

        try {
            // Search for relevant abilities based on the task
            const relevantAbilities = await this.abilities.searchAbilities(task, [role], 3);

            if (relevantAbilities.length > 0) {
                console.log(chalk.cyan(`📚 Found ${relevantAbilities.length} relevant abilities for ${role}`));

                // Format abilities for inclusion in prompt
                return relevantAbilities.map(ability => ({
                    filename: ability.filename,
                    content: ability.content,
                    relevance: ability.relevance,
                    preview: ability.preview
                }));
            }

            // Fallback: load all abilities for the role
            const allAbilities = await this.abilities.loadAbilities([role]);
            const roleAbilities = allAbilities[role] || [];

            if (roleAbilities.length > 0) {
                console.log(chalk.cyan(`📚 Using ${roleAbilities.length} general abilities for ${role}`));
                return roleAbilities.slice(0, 3); // Limit to top 3
            }

            return [];
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Failed to load abilities for ${role}:`, error.message));
            return [];
        }
    }

    /**
     * Search abilities across roles
     */
    async searchAbilities(query, roles = [], limit = 5) {
        if (!this.abilities) {
            this.abilities = await getAgentAbilities();
        }
        return await this.abilities.searchAbilities(query, roles, limit);
    }

    /**
     * Get abilities summary
     */
    async getAbilitiesSummary(roles = []) {
        if (!this.abilities) {
            this.abilities = await getAgentAbilities();
        }
        return await this.abilities.getAbilitiesSummary(roles);
    }

    /**
     * Search chat history
     */
    async searchHistory(query, role = null, limit = 10) {
        return await this.chatHistory.searchHistory(query, role, limit);
    }

    /**
     * Get conversation stats
     */
    async getStats() {
        const chatStats = await this.chatHistory.getAgentStats();
        const profileStats = this.profileManager.getStats();

        return {
            profiles: profileStats,
            conversations: chatStats,
            providers: Object.keys(this.providers),
            initialized: this.initialized
        };
    }

    /**
     * Test all providers
     */
    async testProviders() {
        const results = {};

        for (const [name, provider] of Object.entries(this.providers)) {
            try {
                await provider.testConnection();
                results[name] = { status: 'available', error: null };
                console.log(chalk.green(`✅ ${name} provider available`));
            } catch (error) {
                results[name] = { status: 'unavailable', error: error.message };
                console.log(chalk.yellow(`⚠️  ${name} provider unavailable: ${error.message}`));
            }
        }

        return results;
    }

    /**
     * Start a new chat session
     */
    startNewSession() {
        return this.chatHistory.startNewSession();
    }

    /**
     * Get current session ID
     */
    getCurrentSession() {
        return this.chatHistory.getCurrentSessionId();
    }

    /**
     * Validate profile configuration
     */
    validateProfile(role) {
        return this.profileManager.validateProfile(role);
    }

    /**
     * Multi-stage workflow execution
     * Execute multiple stages in sequence for complex tasks
     */
    async executeWorkflow(roleOrName, task, stages = null) {
        await this.initialize();

        // Resolve agent name to role for consistency
        const role = this.profileManager.resolveNameToRole(roleOrName);

        const profile = this.profileManager.getEnhancedProfile(role);
        if (!profile) {
            throw new Error(`Unknown agent role: ${role}`);
        }

        const workflowStages = stages || profile.stages || ['default'];
        const results = [];

        console.log(chalk.blue(`🔄 Starting workflow for ${role} with ${workflowStages.length} stages...`));

        for (const stage of workflowStages) {
            console.log(chalk.cyan(`  📍 Executing stage: ${stage}`));

            const stageResult = await this.routeTask(role, task, { stage });
            results.push(stageResult);

            // Use previous stage result as context for next stage
            task = `Previous stage output: ${stageResult.content}\n\nContinue with next stage: ${task}`;
        }

        console.log(chalk.green(`✅ Workflow completed for ${role}`));

        return {
            role,
            stages: workflowStages,
            results,
            finalResult: results[results.length - 1]?.content
        };
    }

    /**
     * Execute a multi-agent workflow
     * Implements Tony's vision: security → backend → quality orchestration
     */
    async executeWorkflow(workflowType, target, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        console.log(chalk.blue(`🔗 Starting workflow: ${workflowType}`));
        console.log(chalk.gray(`   Target: ${target}`));

        try {
            const result = await this.workflowRouter.executeWorkflow(workflowType, target, options);

            // Store workflow completion in chat history
            await this.chatHistory.storeConversation({
                role: 'workflow',
                message: `Completed workflow ${workflowType} for ${target}`,
                context: {
                    workflowId: result.workflowId,
                    target,
                    duration: result.duration,
                    status: result.status
                }
            });

            return result;

        } catch (error) {
            console.error(chalk.red(`❌ Workflow failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Get available workflow patterns
     */
    getWorkflowPatterns() {
        return this.workflowRouter.listWorkflowPatterns();
    }

    /**
     * Get workflow status
     */
    getWorkflowStatus(workflowId) {
        return this.workflowRouter.getWorkflowStatus(workflowId);
    }

    /**
     * Quick method for security-fix workflow (Tony's example)
     */
    async securityFixWorkflow(system) {
        console.log(chalk.blue('🔐 Executing Security Fix Workflow'));
        console.log(chalk.gray('   Flow: Security Analysis → Backend Implementation → Quality Verification'));

        return await this.executeWorkflow('security-fix', system);
    }

    /**
     * Quick method for feature development workflow
     */
    async featureDevelopmentWorkflow(feature) {
        console.log(chalk.blue('🚀 Executing Feature Development Workflow'));
        console.log(chalk.gray('   Flow: PRD → Architecture → Backend → Frontend → Quality'));

        return await this.executeWorkflow('feature-development', feature);
    }
}

// Singleton instance
let routerInstance = null;

/**
 * Get the global router instance
 */
export function getRouter(projectPath, config) {
    if (!routerInstance) {
        routerInstance = new EnhancedAutomatosXRouter(projectPath, config);
    }
    return routerInstance;
}
