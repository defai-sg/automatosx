/**
 * Profile Manager for AutomatosX v3.1.1
 * Loads and manages YAML-based agent profiles with inheritance system
 * Integrates with simplified profiles and enhanced agent personalities
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { AGENT_PROFILES, buildAgentPrompt } from '../agents/agent-profiles.js';
import { getModelTemplateResolver } from '../utils/model-template-resolver.js';

export class ProfileManager {
    constructor(profilesPath = null) {
        const projectRoot = process.cwd();
        this.baseAgentsPath = profilesPath || path.join(projectRoot, 'src/agents');
        this.userAgentsPath = path.join(projectRoot, '.defai/agents');
        this.profiles = new Map();
        this.loaded = false;
        this.templateResolver = getModelTemplateResolver();
    }

    /**
     * Load all YAML profiles from the profiles directory
     */
    async loadProfiles() {
        if (this.loaded) return;

        try {
            // Load model templates first
            await this.templateResolver.loadTemplates();

            await fs.ensureDir(this.baseAgentsPath);
            await fs.ensureDir(this.userAgentsPath).catch(() => {});

            const roles = await this.discoverRoles();

            console.log(`📂 Loading ${roles.length} agent profiles...`);

            for (const role of roles) {
                const profileData = await this.loadProfileForRole(role);

                if (profileData) {
                    this.profiles.set(role, profileData);
                }
            }

            this.loaded = true;
            console.log(`✅ Loaded ${this.profiles.size} agent profiles with template support`);

        } catch (error) {
            console.error('❌ Failed to load profiles:', error.message);
            throw error;
        }
    }

    /**
     * Discover roles available in base and user directories
     */
    async discoverRoles() {
        const roles = new Set();

        const collectRoles = async (rootPath) => {
            if (!await fs.pathExists(rootPath)) return;
            const entries = await fs.readdir(rootPath);
            for (const entry of entries) {
                if (entry.startsWith('_') || entry.endsWith('.js')) continue;
                const entryPath = path.join(rootPath, entry);
                try {
                    const stats = await fs.stat(entryPath);
                    if (!stats.isDirectory()) continue;
                    const profilePath = path.join(entryPath, 'profile.yaml');
                    if (await fs.pathExists(profilePath)) {
                        roles.add(entry);
                    }
                } catch (error) {
                    // Ignore inaccessible entries
                }
            }
        };

        await collectRoles(this.baseAgentsPath);
        await collectRoles(this.userAgentsPath);

        return Array.from(roles).sort();
    }

    /**
     * Load a single profile for the specified role
     */
    async loadProfileForRole(role) {
        const overridePath = path.join(this.userAgentsPath, role, 'profile.yaml');
        const basePath = path.join(this.baseAgentsPath, role, 'profile.yaml');

        let profilePath = null;

        if (await fs.pathExists(overridePath)) {
            profilePath = overridePath;
        } else if (await fs.pathExists(basePath)) {
            profilePath = basePath;
        } else {
            console.warn(`⚠️  Profile not found for role ${role}`);
            return null;
        }

        try {
            const rawContent = await fs.readFile(profilePath, 'utf8');
            const profile = yaml.parse(rawContent) || {};

            // Ensure required role field
            profile.role = profile.role || role;

            // Validate required fields
            if (!profile.role || !profile.description) {
                console.warn(`⚠️  Invalid profile structure in ${profilePath}`);
                return null;
            }

            // Validate new standardized fields
            if (!profile.expertise_areas) {
                console.warn(`⚠️  Profile ${profile.role} missing expertise_areas`);
            }
            if (!profile.thinking_patterns) {
                console.warn(`⚠️  Profile ${profile.role} missing thinking_patterns`);
            }

            // Add file path for reference
            profile.filePath = profilePath;
            profile.isOverride = profilePath === overridePath;
            profile.isStandardized = true;

            // Validate template configuration if using template system
            if (profile.models && profile.models.template) {
                const templateValidation = this.templateResolver.validateTemplate(profile.models.template);
                if (!templateValidation.valid) {
                    console.warn(`⚠️  Profile ${profile.role} template validation failed:`, templateValidation.errors);
                }
            }

            return profile;
        } catch (error) {
            console.warn(`⚠️  Failed to load profile ${profilePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get profile by role name
     * @param {string} role - The role name (e.g., 'backend', 'frontend', 'ceo')
     */
    getProfile(role) {
        if (!this.loaded) {
            throw new Error('Profiles not loaded. Call loadProfiles() first.');
        }

        return this.profiles.get(role);
    }


    /**
     * Get all available roles
     */
    getAvailableRoles() {
        if (!this.loaded) {
            throw new Error('Profiles not loaded. Call loadProfiles() first.');
        }

        return Array.from(this.profiles.keys());
    }

    /**
     * Get enhanced profile with personality data
     * Combines YAML profile with agent-profiles.js personality data
     */
    getEnhancedProfile(role) {
        const yamlProfile = this.getProfile(role);
        if (!yamlProfile) return null;

        // Find matching agent personality from agent-profiles.js
        const agentPersonality = Object.values(AGENT_PROFILES).find(
            agent => agent.role === role
        );

        return {
            ...yamlProfile,
            personality: agentPersonality || null,
            hasPersonality: !!agentPersonality
        };
    }

    /**
     * Resolve agent name to role (e.g., "bob" -> "backend", "alice" -> "frontend")
     * @param {string} nameOrRole - Agent name or role
     * @returns {string} - The role name
     */
    resolveNameToRole(nameOrRole) {
        // First, try as role name directly
        if (this.profiles.has(nameOrRole)) {
            return nameOrRole;
        }

        // Then try to find by agent name in AGENT_PROFILES
        const agentEntry = Object.values(AGENT_PROFILES).find(
            agent => agent.name && agent.name.toLowerCase() === nameOrRole.toLowerCase()
        );

        if (agentEntry) {
            return agentEntry.role;
        }

        // Return original if no match found
        return nameOrRole;
    }

    /**
     * Get enhanced profile by name or role (supports both "bob" and "backend")
     * @param {string} nameOrRole - Agent name or role
     */
    getEnhancedProfileByNameOrRole(nameOrRole) {
        const role = this.resolveNameToRole(nameOrRole);
        return this.getEnhancedProfile(role);
    }

    /**
     * Build agent prompt combining YAML profile, personality, and abilities
     * @param {string} role - Agent role
     * @param {string} task - User task
     * @param {string} basePrompt - Base system prompt
     * @param {Array} abilities - Relevant abilities for this task
     */
    buildAgentPrompt(role, task, basePrompt = '', abilities = []) {
        const profile = this.getEnhancedProfileByNameOrRole(role);
        if (!profile) {
            throw new Error(`Profile not found for role: ${role}`);
        }

        let prompt = basePrompt;

        // Add YAML profile context
        prompt += `\n\n**Role Profile**: ${profile.description}`;

        if (profile.stages && profile.stages.length > 0) {
            prompt += `\n**Workflow Stages**: ${profile.stages.join(' → ')}`;
        }

        // Add expertise areas if available
        if (profile.expertise_areas) {
            if (profile.expertise_areas.primary) {
                prompt += `\n**Primary Expertise**: ${profile.expertise_areas.primary.join(', ')}`;
            }
            if (profile.expertise_areas.secondary) {
                prompt += `\n**Secondary Expertise**: ${profile.expertise_areas.secondary.join(', ')}`;
            }
        }

        // Add thinking patterns if available
        if (profile.thinking_patterns && profile.thinking_patterns.length > 0) {
            prompt += `\n**Thinking Patterns**: ${profile.thinking_patterns.join('; ')}`;
        }

        // Add abilities if available
        if (abilities && abilities.length > 0) {
            prompt += '\n\n**Available Abilities and Knowledge**:';
            abilities.forEach((ability, index) => {
                prompt += `\n\n### ${ability.filename || `Ability ${index + 1}`}`;
                if (ability.relevance) {
                    prompt += ` (Relevance: ${(ability.relevance * 100).toFixed(0)}%)`;
                }
                // Use preview if available, otherwise truncate content
                const content = ability.preview || ability.content;
                if (content) {
                    const truncated = content.length > 800 ? content.substring(0, 800) + '...' : content;
                    prompt += `\n${truncated}`;
                }
            });
        }

        // Add personality if available
        if (profile.hasPersonality && profile.personality) {
            const agentName = Object.keys(AGENT_PROFILES).find(
                name => AGENT_PROFILES[name].role === role
            );

            if (agentName) {
                prompt = buildAgentPrompt(agentName, task, prompt);
            }
        }

        return prompt;
    }

    /**
     * Get model configuration for a specific stage
     * @param {string} role - Agent role
     * @param {string} stage - Workflow stage
     */
    getModelForStage(role, stage) {
        const profile = this.getProfile(role);
        if (!profile || !profile.models) {
            // Use tier-based default if no models configuration
            const tier = this.templateResolver.getTierForRole(role);
            return this.templateResolver.getTemplateConfig(tier);
        }

        // Use template resolver for new format with role context
        return this.templateResolver.resolveModelForStage(profile.models, stage, role);
    }

    /**
     * Get memory configuration for role
     * @param {string} role - Agent role
     */
    getMemoryConfig(role) {
        const profile = this.getProfile(role);
        if (!profile || !profile.memory) return null;

        return {
            scopes: profile.memory.scopes || ['global'],
            k: profile.memory.k || 6,
            chatHistory: profile.memory.chat_history || false
        };
    }

    /**
     * Get workspace path for role
     * @param {string} role - Agent role
     */
    getWorkspacePath(role) {
        const profile = this.getProfile(role);
        if (!profile || !profile.workspace) return null;

        return profile.workspace;
    }

    /**
     * Validate profile completeness
     * @param {string} role - Agent role to validate
     */
    validateProfile(role) {
        const profile = this.getProfile(role);
        if (!profile) {
            return { valid: false, errors: [`Profile not found: ${role}`] };
        }

        const errors = [];
        const warnings = [];

        // Required fields
        if (!profile.description) errors.push('Missing description');
        if (!profile.stages || profile.stages.length === 0) {
            errors.push('Missing or empty stages');
        }
        if (!profile.models) errors.push('Missing models configuration');

        // Model configuration validation
        if (profile.stages && profile.models) {
            // Check if using template system
            if (profile.models.template || profile.models.stage_mapping) {
                // Validate template exists
                if (profile.models.template) {
                    const templateExists = this.templateResolver.getTemplateConfig(profile.models.template);
                    if (!templateExists) {
                        warnings.push(`Template '${profile.models.template}' not found`);
                    }
                }
                // Validate stage mappings
                if (profile.models.stage_mapping) {
                    Object.values(profile.models.stage_mapping).forEach(templateName => {
                        const templateExists = this.templateResolver.getTemplateConfig(templateName);
                        if (!templateExists) {
                            warnings.push(`Template '${templateName}' not found in stage mapping`);
                        }
                    });
                }
                // Template system is valid, no need to check individual stages
            } else if (profile.models.primary || profile.models.fallback) {
                // New explicit primary/fallback format
                if (!profile.models.primary) {
                    warnings.push('Missing primary model configuration');
                }
                if (!profile.models.fallback) {
                    warnings.push('Missing fallback model configuration');
                }
            } else {
                // Traditional validation for legacy profiles
                profile.stages.forEach(stage => {
                    if (!profile.models[stage]) {
                        warnings.push(`Missing primary model for stage: ${stage}`);
                    }
                    if (!profile.models[`${stage}_fallback`]) {
                        warnings.push(`Missing fallback model for stage: ${stage}`);
                    }
                });
            }
        }

        // Memory configuration validation
        if (!profile.memory) {
            warnings.push('Missing memory configuration');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get profile statistics
     */
    getStats() {
        if (!this.loaded) return null;

        const stats = {
            totalProfiles: this.profiles.size,
            roleTypes: {},
            memoryConfigs: {},
            modelProviders: new Set(),
            averageStages: 0
        };

        let totalStages = 0;

        this.profiles.forEach(profile => {
            // Count stages
            if (profile.stages) {
                totalStages += profile.stages.length;
            }

            // Memory scopes
            if (profile.memory && profile.memory.scopes) {
                profile.memory.scopes.forEach(scope => {
                    stats.memoryConfigs[scope] = (stats.memoryConfigs[scope] || 0) + 1;
                });
            }

            // Model providers
            if (profile.models) {
                const addProvider = modelEntry => {
                    if (!modelEntry) return;

                    if (typeof modelEntry === 'string') {
                        if (modelEntry.includes(':')) {
                            const provider = modelEntry.split(':')[0];
                            if (provider) {
                                stats.modelProviders.add(provider);
                            }
                        }
                        return;
                    }

                    if (typeof modelEntry === 'object') {
                        if (Array.isArray(modelEntry)) {
                            modelEntry.forEach(inner => addProvider(inner));
                            return;
                        }

                        if (modelEntry.provider) {
                            stats.modelProviders.add(modelEntry.provider);
                        }

                        if (modelEntry.primary || modelEntry.fallback || modelEntry.fallback2) {
                            addProvider(modelEntry.primary);
                            addProvider(modelEntry.fallback);
                            addProvider(modelEntry.fallback2);
                        }
                    }
                };

                if (profile.models.template || profile.models.stage_mapping) {
                    const stages = Array.isArray(profile.stages) ? profile.stages : [];
                    stages.forEach(stage => {
                        try {
                            const resolved = this.templateResolver.resolveModelForStage(
                                profile.models,
                                stage,
                                profile.role
                            );
                            addProvider(resolved);
                        } catch (error) {
                            // Ignore resolution errors in stats gathering
                        }
                    });

                    // Also include template-level providers to catch roles without explicit stages
                    addProvider(this.templateResolver.getTemplateConfig(profile.models.template));

                    if (profile.models.stage_mapping) {
                        Object.values(profile.models.stage_mapping).forEach(templateName => {
                            addProvider(this.templateResolver.getTemplateConfig(templateName));
                        });
                    }

                } else if (profile.models.primary || profile.models.fallback) {
                    addProvider(profile.models.primary);
                    addProvider(profile.models.fallback);
                } else {
                    Object.values(profile.models).forEach(modelEntry => addProvider(modelEntry));
                }
            }
        });

        stats.averageStages = Math.round(totalStages / this.profiles.size);
        stats.modelProviders = Array.from(stats.modelProviders);

        return stats;
    }

    /**
     * Reload profiles (useful for development)
     */
    async reloadProfiles() {
        this.profiles.clear();
        this.loaded = false;
        await this.loadProfiles();
    }

    /**
     * Check if profiles are loaded
     */
    isLoaded() {
        return this.loaded;
    }
}

// Singleton instance
let profileManagerInstance = null;

/**
 * Get the global profile manager instance
 */
export function getProfileManager() {
    if (!profileManagerInstance) {
        profileManagerInstance = new ProfileManager();
    }
    return profileManagerInstance;
}
