/**
 * Agent Manager - Unified Management for Profiles and Abilities
 * Provides a single interface to manage agent profiles and their abilities
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ProfileManager } from './profile-manager.js';
import { getAgentAbilities } from './abilities.js';
import { AGENT_PROFILES } from '../agents/agent-profiles.js';

export class AgentManager {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.profileManager = new ProfileManager();
        this.abilities = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        await this.profileManager.loadProfiles();
        this.abilities = await getAgentAbilities();
        this.initialized = true;
    }

    /**
     * Get complete agent information including profile, abilities, and personality
     */
    async getAgentInfo(role) {
        await this.initialize();

        const profile = this.profileManager.getEnhancedProfile(role);
        const abilities = await this.abilities.loadAbilities([role]);
        const personality = AGENT_PROFILES[Object.keys(AGENT_PROFILES).find(
            name => AGENT_PROFILES[name].role === role
        )];

        return {
            role,
            profile: profile || null,
            abilities: abilities[role] || [],
            personality: personality || null,
            files: {
                profile: profile ? path.join(this.projectPath, 'profiles', `${role}.yaml`) : null,
                abilities: abilities[role] ? abilities[role].map(a => a.source) : [],
                personality: path.join(this.projectPath, 'src/agents/agent-profiles.js')
            }
        };
    }

    /**
     * List all available agents with their configuration status
     */
    async listAgents() {
        await this.initialize();

        const roles = this.profileManager.getAvailableRoles();
        const agentList = [];

        for (const role of roles) {
            const info = await this.getAgentInfo(role);
            agentList.push({
                role,
                hasProfile: !!info.profile,
                hasAbilities: info.abilities.length > 0,
                hasPersonality: !!info.personality,
                abilityCount: info.abilities.length,
                status: this.getAgentStatus(info)
            });
        }

        return agentList.sort((a, b) => a.role.localeCompare(b.role));
    }

    /**
     * Get agent configuration status
     */
    getAgentStatus(agentInfo) {
        const hasProfile = !!agentInfo.profile;
        const hasAbilities = agentInfo.abilities.length > 0;
        const hasPersonality = !!agentInfo.personality;

        if (hasProfile && hasAbilities && hasPersonality) return 'complete';
        if (hasProfile && hasAbilities) return 'ready';
        if (hasProfile || hasAbilities) return 'partial';
        return 'missing';
    }

    /**
     * Create a comprehensive agent reference guide
     */
    async generateAgentGuide(role) {
        const info = await this.getAgentInfo(role);

        let guide = `# ${role.toUpperCase()} Agent Reference Guide\n\n`;

        // Agent Overview
        guide += `## Agent Overview\n\n`;

        if (info.personality) {
            guide += `**Name**: ${info.personality.name}\n`;
            guide += `**Title**: ${info.personality.title}\n`;
            guide += `**Personality**: ${info.personality.personality}\n`;
            guide += `**Catchphrase**: "${info.personality.catchphrase}"\n\n`;

            guide += `**Specializations**:\n`;
            info.personality.specializations.forEach(spec => {
                guide += `- ${spec}\n`;
            });
            guide += '\n';
        }

        // Profile Configuration
        if (info.profile) {
            guide += `## Profile Configuration\n\n`;
            guide += `**Description**: ${info.profile.description}\n\n`;

            if (info.profile.stages) {
                guide += `**Workflow Stages**: ${info.profile.stages.join(' → ')}\n\n`;
            }

            if (info.profile.models) {
                guide += `**Model Configuration**:\n`;
                Object.entries(info.profile.models).forEach(([stage, model]) => {
                    guide += `- ${stage}: ${JSON.stringify(model)}\n`;
                });
                guide += '\n';
            }
        }

        // Abilities
        if (info.abilities.length > 0) {
            guide += `## Available Abilities\n\n`;
            info.abilities.forEach((ability, index) => {
                guide += `### ${index + 1}. ${ability.filename}\n`;
                guide += `**File**: \`${ability.source}\`\n\n`;

                // Show first section of ability
                const lines = ability.content.split('\n');
                const firstSection = lines.slice(0, 10).join('\n');
                guide += `\`\`\`markdown\n${firstSection}\n...\n\`\`\`\n\n`;
            });
        }

        // File Locations
        guide += `## File Locations\n\n`;
        guide += `### Configuration Files\n`;
        if (info.files.profile) {
            guide += `- **Profile**: \`${info.files.profile}\`\n`;
        }
        guide += `- **Personality**: \`${info.files.personality}\`\n\n`;

        guide += `### Ability Files\n`;
        info.files.abilities.forEach(file => {
            guide += `- \`${file}\`\n`;
        });

        // Customization Instructions
        guide += `\n## Customization Guide\n\n`;
        guide += `### Editing Profile (YAML)\n`;
        guide += `Edit \`${info.files.profile}\` to modify:\n`;
        guide += `- Workflow stages and model assignments\n`;
        guide += `- Memory scopes and retrieval settings\n`;
        guide += `- Fallback strategies\n\n`;

        guide += `### Editing Abilities (Markdown)\n`;
        guide += `Edit files in \`abilities/${role}/\` to modify:\n`;
        guide += `- Core technical skills and approaches\n`;
        guide += `- Tools and frameworks knowledge\n`;
        guide += `- Processes and workflows\n\n`;

        guide += `### Editing Personality (JavaScript)\n`;
        guide += `Edit \`${info.files.personality}\` to modify:\n`;
        guide += `- Agent name and title\n`;
        guide += `- Personality traits and working style\n`;
        guide += `- Specializations and catchphrase\n\n`;

        return guide;
    }

    /**
     * Get agent file locations for direct editing
     */
    async getAgentFiles(role) {
        const info = await this.getAgentInfo(role);

        return {
            role,
            files: {
                profile: info.files.profile,
                abilities: info.files.abilities,
                personality: info.files.personality
            },
            summary: `Agent ${role} files:
- Profile: ${info.files.profile || 'Not found'}
- Abilities: ${info.files.abilities.length} files in abilities/${role}/
- Personality: ${info.files.personality}

Edit these files directly to modify the agent configuration.`
        };
    }

    /**
     * Validate agent configuration completeness
     */
    async validateAgent(role) {
        const info = await this.getAgentInfo(role);
        const validation = {
            role,
            status: this.getAgentStatus(info),
            issues: [],
            suggestions: []
        };

        // Check profile
        if (!info.profile) {
            validation.issues.push('Missing profile configuration');
            validation.suggestions.push(`Create src/agents/${role}/profile.yaml`);
        }

        // Check abilities
        if (info.abilities.length === 0) {
            validation.issues.push('No ability files found');
            validation.suggestions.push(`Create abilities in src/agents/${role}/abilities/`);
        } else if (info.abilities.length < 3) {
            validation.suggestions.push('Consider adding more ability files for comprehensive knowledge');
        }

        // Check personality
        if (!info.personality) {
            validation.issues.push('No personality configuration');
            validation.suggestions.push('Add agent to src/agents/agent-profiles.js');
        }

        // Validate file contents
        for (const ability of info.abilities) {
            if (ability.content.length < 100) {
                validation.issues.push(`Ability file ${ability.filename} is too short`);
            }
        }

        return validation;
    }

    /**
     * Search across all agent configurations
     */
    async searchAgents(query, includeAbilities = true) {
        await this.initialize();

        const results = [];
        const roles = this.profileManager.getAvailableRoles();

        for (const role of roles) {
            const info = await this.getAgentInfo(role);
            let relevance = 0;
            const matches = [];

            // Search in role name
            if (role.toLowerCase().includes(query.toLowerCase())) {
                relevance += 2;
                matches.push('role name');
            }

            // Search in personality
            if (info.personality) {
                const personalityText = JSON.stringify(info.personality).toLowerCase();
                if (personalityText.includes(query.toLowerCase())) {
                    relevance += 1.5;
                    matches.push('personality');
                }
            }

            // Search in profile description
            if (info.profile && info.profile.description.toLowerCase().includes(query.toLowerCase())) {
                relevance += 1;
                matches.push('profile description');
            }

            // Search in abilities
            if (includeAbilities) {
                for (const ability of info.abilities) {
                    if (ability.content.toLowerCase().includes(query.toLowerCase())) {
                        relevance += 0.5;
                        matches.push(`ability: ${ability.filename}`);
                    }
                }
            }

            if (relevance > 0) {
                results.push({
                    role,
                    relevance,
                    matches,
                    info
                });
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }
}

// Global instance
let _agentManager = null;

export async function getAgentManager() {
    if (!_agentManager) {
        _agentManager = new AgentManager();
        await _agentManager.initialize();
    }
    return _agentManager;
}
