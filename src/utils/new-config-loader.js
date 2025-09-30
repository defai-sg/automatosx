/**
 * New Agent Configuration Loader for Reorganized Structure
 * Supports the new agents/ directory structure
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

export class NewConfigLoader {
    constructor(agentsPath = 'agents') {
        this.agentsPath = agentsPath;
        this.templatesPath = path.join(agentsPath, '_templates');
        this.sharedPath = path.join(agentsPath, '_shared');
    }

    /**
     * Load complete agent configuration
     */
    async loadAgent(agentName) {
        const agentPath = path.join(this.agentsPath, agentName);

        // Check if agent directory exists
        try {
            await fs.access(agentPath);
        } catch (error) {
            throw new Error(`Agent "${agentName}" not found in ${agentPath}`);
        }

        // Load profile configuration
        const profilePath = path.join(agentPath, 'profile.yaml');
        const profile = await this.loadProfile(profilePath);

        // Load personality
        const personalityPath = path.join(agentPath, 'personality.js');
        const personality = await this.loadPersonality(personalityPath);

        // Load abilities
        const abilitiesPath = path.join(agentPath, 'abilities');
        const abilities = await this.loadAbilities(abilitiesPath);

        // Load memory
        const memoryPath = path.join(agentPath, 'memory');
        const memory = await this.loadMemory(memoryPath);

        return {
            name: agentName,
            profile,
            personality,
            abilities,
            memory,
            paths: {
                agent: agentPath,
                profile: profilePath,
                personality: personalityPath,
                abilities: abilitiesPath,
                memory: memoryPath
            }
        };
    }

    /**
     * Load and resolve profile with template inheritance
     */
    async loadProfile(profilePath) {
        try {
            const profileContent = await fs.readFile(profilePath, 'utf8');
            const profile = yaml.parse(profileContent);

            // Handle template inheritance
            if (profile.extends) {
                const templatePath = path.resolve(path.dirname(profilePath), profile.extends);
                const template = await this.loadProfile(templatePath);

                // Merge template with profile (profile overrides template)
                return this.mergeConfig(template, profile);
            }

            return profile;
        } catch (error) {
            throw new Error(`Failed to load profile from ${profilePath}: ${error.message}`);
        }
    }

    /**
     * Load personality definition
     */
    async loadPersonality(personalityPath) {
        try {
            // Dynamic import for ES modules
            const personalityModule = await import(path.resolve(personalityPath));
            return personalityModule.personality;
        } catch (error) {
            console.warn(`Failed to load personality from ${personalityPath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Load all abilities from abilities directory
     */
    async loadAbilities(abilitiesPath) {
        try {
            const abilities = {};
            const files = await fs.readdir(abilitiesPath);

            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(abilitiesPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const abilityName = file.replace('.md', '');
                    abilities[abilityName] = content;
                }
            }

            return abilities;
        } catch (error) {
            console.warn(`Failed to load abilities from ${abilitiesPath}: ${error.message}`);
            return {};
        }
    }

    /**
     * Load all memory files from memory directory
     */
    async loadMemory(memoryPath) {
        try {
            const memory = {};
            const files = await fs.readdir(memoryPath);

            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(memoryPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const memoryName = file.replace('.md', '');
                    memory[memoryName] = content;
                }
            }

            return memory;
        } catch (error) {
            console.warn(`Failed to load memory from ${memoryPath}: ${error.message}`);
            return {};
        }
    }

    /**
     * List all available agents
     */
    async listAgents() {
        try {
            const entries = await fs.readdir(this.agentsPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
                .map(entry => entry.name);
        } catch (error) {
            throw new Error(`Failed to list agents: ${error.message}`);
        }
    }

    /**
     * Load shared resources
     */
    async loadShared() {
        const sharedAbilities = await this.loadAbilities(path.join(this.sharedPath, 'abilities'));
        const sharedMemory = await this.loadMemory(path.join(this.sharedPath, 'memory'));

        return {
            abilities: sharedAbilities,
            memory: sharedMemory
        };
    }

    /**
     * Merge configuration objects (deep merge)
     */
    mergeConfig(template, override) {
        if (!template) return override;
        if (!override) return template;

        const result = { ...template };

        for (const key in override) {
            if (key === 'extends') continue; // Skip extends property

            if (typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
                result[key] = this.mergeConfig(result[key], override[key]);
            } else {
                result[key] = override[key];
            }
        }

        return result;
    }

    /**
     * Validate agent configuration
     */
    async validateAgent(agentName) {
        try {
            const agent = await this.loadAgent(agentName);
            const errors = [];

            // Check required fields
            if (!agent.profile.role) errors.push('Missing role in profile');
            if (!agent.profile.name) errors.push('Missing name in profile');
            if (!agent.personality) errors.push('Missing personality definition');

            // Check abilities
            if (Object.keys(agent.abilities).length === 0) {
                errors.push('No abilities found');
            }

            return {
                valid: errors.length === 0,
                errors,
                agent
            };
        } catch (error) {
            return {
                valid: false,
                errors: [error.message],
                agent: null
            };
        }
    }
}

// Default instance
export const configLoader = new NewConfigLoader();