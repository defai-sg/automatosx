/**
 * Model Template Resolver for AutomatosX v3.1.1
 * Resolves model configurations from templates to reduce YAML redundancy
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

export class ModelTemplateResolver {
    constructor(templatesPath = null) {
        this.templatesPath = templatesPath || path.join(process.cwd(), 'src', 'config', 'model-templates.yaml');
        this.templates = null;
        this.loaded = false;
    }

    /**
     * Load model templates configuration
     */
    async loadTemplates() {
        if (this.loaded) return;

        try {
            if (!await fs.pathExists(this.templatesPath)) {
                console.warn(`⚠️ Model templates not found at ${this.templatesPath}, using defaults`);
                this.templates = this.getDefaultTemplates();
                this.loaded = true;
                return;
            }

            const templateContent = await fs.readFile(this.templatesPath, 'utf8');
            const templateData = yaml.parse(templateContent);

            this.templates = templateData;
            this.loaded = true;
            console.log('✅ Loaded model templates configuration');

        } catch (error) {
            console.warn(`⚠️ Failed to load model templates: ${error.message}`);
            this.templates = this.getDefaultTemplates();
            this.loaded = true;
        }
    }

    /**
     * Get default templates if file is not available
     */
    getDefaultTemplates() {
        return {
            model_templates: {
                // Tier-based templates (new strategy)
                tier1_strategic: {
                    primary: {
                        provider: 'claude-code',
                        model: 'opus',
                        temperature: 0.3,
                        max_tokens: 14336  // 14K tokens
                    },
                    fallback: {
                        provider: 'gemini-cli',
                        model: 'gemini-2.5-pro',
                        temperature: 0.4,
                        max_tokens: 11264  // 11K tokens
                    }
                },
                tier2_technical: {
                    primary: {
                        provider: 'claude-code',
                        model: 'opus',
                        temperature: 0.2,
                        max_tokens: 9216   // 9K tokens
                    },
                    fallback: {
                        provider: 'openai-cli',
                        model: 'gpt-5-codex',
                        temperature: 0.3,
                        max_tokens: 7168   // 7K tokens
                    }
                },
                tier3_creative: {
                    primary: {
                        provider: 'gemini-cli',
                        model: 'gemini-2.5-pro',
                        temperature: 0.35,
                        max_tokens: 7168   // 7K tokens
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'opus',
                        temperature: 0.45,
                        max_tokens: 5632   // 5.5K tokens
                    }
                },
                tier4_specialized: {
                    primary: {
                        provider: 'claude-code',
                        model: 'opus',
                        temperature: 0.25,
                        max_tokens: 7168   // 7K tokens
                    },
                    fallback: {
                        provider: 'openai-cli',
                        model: 'gpt-5-codex',
                        temperature: 0.35,
                        max_tokens: 5632   // 5.5K tokens
                    }
                },

                // Legacy templates (maintained for backward compatibility)
                simple: {
                    primary: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.3,
                        max_tokens: 4096
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'haiku',
                        temperature: 0.4,
                        max_tokens: 3072
                    }
                },
                complex: {
                    primary: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.2,
                        max_tokens: 8192
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.3,
                        max_tokens: 6144
                    }
                },
                precision: {
                    primary: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.1,
                        max_tokens: 4096
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'haiku',
                        temperature: 0.2,
                        max_tokens: 3072
                    }
                },
                creative: {
                    primary: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.5,
                        max_tokens: 4096
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'haiku',
                        temperature: 0.6,
                        max_tokens: 3072
                    }
                },
                large_context: {
                    primary: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.2,
                        max_tokens: 16384
                    },
                    fallback: {
                        provider: 'claude-code',
                        model: 'sonnet',
                        temperature: 0.3,
                        max_tokens: 12288
                    }
                }
            },
            stage_model_mapping: {
                analysis: 'precision',
                design: 'complex',
                implementation: 'complex',
                testing: 'simple',
                documentation: 'simple',
                review: 'simple',
                strategy: 'creative',
                planning: 'complex',
                optimization: 'precision',
                validation: 'simple'
            }
        };
    }

    /**
     * Resolve model configuration from template or stage mapping
     * @param {Object} modelConfig - The models configuration from profile
     * @param {string} stage - The workflow stage
     * @param {string} role - The agent role (optional)
     */
    resolveModelForStage(modelConfig, stage, role = null) {
        if (!this.loaded) {
            throw new Error('Templates not loaded. Call loadTemplates() first.');
        }

        // If using template system
        if (modelConfig.template || modelConfig.stage_mapping) {
            const templateName = this.getTemplateForStage(modelConfig, stage, role);
            return this.getTemplateConfig(templateName);
        }

        // If using traditional model configuration
        return {
            primary: modelConfig[stage],
            fallback: modelConfig[`${stage}_fallback`],
            fallback2: modelConfig[`${stage}_fallback2`]
        };
    }

    /**
     * Get template name for a specific stage or role
     */
    getTemplateForStage(modelConfig, stage, role = null) {
        // Direct stage mapping takes precedence
        if (modelConfig.stage_mapping && modelConfig.stage_mapping[stage]) {
            return modelConfig.stage_mapping[stage];
        }

        // If role is provided, try to get tier-based template
        if (role && this.templates.agent_tier_mapping) {
            const tier = this.getTierForRole(role);
            if (tier && this.templates.model_templates[tier]) {
                return tier;
            }
        }

        // Check if stage matches any pattern in stage_model_mapping
        if (this.templates.stage_model_mapping) {
            for (const [pattern, template] of Object.entries(this.templates.stage_model_mapping)) {
                if (stage.includes(pattern)) {
                    return template;
                }
            }
        }

        // Fallback to default template
        return modelConfig.template || 'tier_creative_communication';
    }

    /**
     * Get template configuration by name
     */
    getTemplateConfig(templateName) {
        if (!this.templates || !this.templates.model_templates) {
            return null;
        }

        const template = this.templates.model_templates[templateName];
        if (!template) {
            console.warn(`⚠️ Template '${templateName}' not found, using 'simple'`);
            return this.templates.model_templates.simple || null;
        }

        return template;
    }

    /**
     * Get all available templates
     */
    getAvailableTemplates() {
        if (!this.templates || !this.templates.model_templates) {
            return [];
        }

        return Object.keys(this.templates.model_templates);
    }

    /**
     * Validate template configuration
     */
    validateTemplate(templateName) {
        const template = this.getTemplateConfig(templateName);
        if (!template) {
            return { valid: false, errors: [`Template '${templateName}' not found`] };
        }

        const errors = [];

        // Check required fields
        if (!template.primary) {
            errors.push('Missing primary model configuration');
        } else {
            if (!template.primary.provider) errors.push('Missing provider in primary config');
            if (!template.primary.model) errors.push('Missing model in primary config');
        }

        if (!template.fallback) {
            errors.push('Missing fallback model configuration');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get tier for agent role based on agent_tier_mapping
     * @param {string} role - Agent role
     */
    getTierForRole(role) {
        if (!this.templates || !this.templates.agent_tier_mapping) {
            return 'tier_creative_communication'; // Default tier
        }

        const mapping = this.templates.agent_tier_mapping;
        for (const [tierName, roles] of Object.entries(mapping)) {
            if (roles.includes(role)) {
                return tierName;
            }
        }

        return 'tier_creative_communication'; // Default tier
    }

    /**
     * Get agent classification statistics
     */
    getAgentClassificationStats() {
        if (!this.templates || !this.templates.agent_tier_mapping) {
            return null;
        }

        const stats = {
            totalTiers: Object.keys(this.templates.agent_tier_mapping).length,
            tierDistribution: {},
            totalAgents: 0,
            tokenDistribution: {}
        };

        Object.entries(this.templates.agent_tier_mapping).forEach(([tier, roles]) => {
            stats.tierDistribution[tier] = roles.length;
            stats.totalAgents += roles.length;

            // Get token allocation for this tier
            const template = this.getTemplateConfig(tier);
            if (template && template.primary) {
                stats.tokenDistribution[tier] = template.primary.max_tokens;
            }
        });

        return stats;
    }

    /**
     * Get template statistics
     */
    getStats() {
        if (!this.loaded) return null;

        return {
            totalTemplates: this.getAvailableTemplates().length,
            stageMappings: Object.keys(this.templates.stage_model_mapping || {}).length,
            templates: this.getAvailableTemplates(),
            agentClassification: this.getAgentClassificationStats()
        };
    }
}

// Singleton instance
let templateResolverInstance = null;

/**
 * Get the global template resolver instance
 */
export function getModelTemplateResolver() {
    if (!templateResolverInstance) {
        templateResolverInstance = new ModelTemplateResolver();
    }
    return templateResolverInstance;
}
