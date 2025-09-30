/**
 * Enhanced Abilities Manager for AutomatosX v3.1.1
 * Unified abilities management across all agent roles
 */

import fs from 'fs-extra';
import path from 'path';
import { EnhancedMemoryConfig } from '../memory/enhanced-memory-config.js';

export class EnhancedAbilitiesManager {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.agentsRoot = path.join(projectPath, 'src/agents');
        this.memoryConfig = new EnhancedMemoryConfig();
        this.cache = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await fs.ensureDir(this.agentsRoot);
            await this.loadGlobalAbilities();
            this.initialized = true;
            console.log('✅ Enhanced abilities manager initialized');
        } catch (error) {
            console.warn('⚠️  Abilities manager initialization failed:', error.message);
            this.initialized = true;
        }
    }

    /**
     * Load abilities for a specific role
     */
    async loadRoleAbilities(roleId) {
        if (!this.initialized) await this.initialize();

        const cacheKey = `role:${roleId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const roleAbilities = await this.buildRoleAbilities(roleId);
            this.cache.set(cacheKey, roleAbilities);
            return roleAbilities;
        } catch (error) {
            console.warn(`⚠️  Failed to load abilities for role ${roleId}:`, error.message);
            return this.getDefaultAbilities(roleId);
        }
    }

    /**
     * Build comprehensive abilities structure for a role
     */
    async buildRoleAbilities(roleId) {
        const rolePath = path.join(this.agentsRoot, roleId, 'abilities');
        const globalPath = path.join(this.agentsRoot, '_global', 'abilities');

        const abilities = {
            role: roleId,
            core_abilities: [],
            tools_and_frameworks: [],
            processes_and_workflows: [],
            specialized_abilities: [],
            global_inheritance: [],
            metadata: {
                loaded_at: new Date().toISOString(),
                files_loaded: [],
                inheritance_chain: []
            }
        };

        // Load global abilities (inherited by all roles)
        const globalAbilities = await this.loadGlobalAbilities();
        abilities.global_inheritance = globalAbilities;
        abilities.metadata.inheritance_chain.push('global');

        // Load role-specific abilities
        const roleAbilitySets = [
            { key: 'core_abilities', file: 'core-abilities.md' },
            { key: 'tools_and_frameworks', file: 'tools-and-frameworks.md' },
            { key: 'processes_and_workflows', file: 'processes-and-workflows.md' }
        ];

        for (const abilitySet of roleAbilitySets) {
            const filePath = path.join(rolePath, abilitySet.file);
            try {
                if (await fs.pathExists(filePath)) {
                    const content = await this.loadAbilityFile(filePath);
                    abilities[abilitySet.key] = content;
                    abilities.metadata.files_loaded.push(abilitySet.file);
                }
            } catch (error) {
                console.warn(`⚠️  Failed to load ${abilitySet.file} for ${roleId}:`, error.message);
            }
        }

        // Load specialized abilities
        const specializedAbilities = await this.loadSpecializedAbilities(roleId);
        abilities.specialized_abilities = specializedAbilities;

        // Add cross-role abilities based on collaboration patterns
        const collaborativeAbilities = await this.loadCollaborativeAbilities(roleId);
        abilities.collaborative_abilities = collaborativeAbilities;

        return abilities;
    }

    /**
     * Load global abilities inherited by all roles
     */
    async loadGlobalAbilities() {
        const cacheKey = 'global:abilities';
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const globalPath = path.join(this.agentsRoot, '_global', 'abilities');
        const globalAbilities = {
            core_abilities: [],
            tools_and_frameworks: [],
            processes_and_workflows: []
        };

        const globalFiles = [
            'core-abilities.md',
            'tools-and-frameworks.md',
            'processes-and-workflows.md'
        ];

        for (const fileName of globalFiles) {
            const filePath = path.join(globalPath, fileName);
            try {
                if (await fs.pathExists(filePath)) {
                    const content = await this.loadAbilityFile(filePath);
                    const key = fileName.replace('.md', '').replace(/-/g, '_');
                    globalAbilities[key] = content;
                }
            } catch (error) {
                console.warn(`⚠️  Failed to load global ability ${fileName}:`, error.message);
            }
        }

        this.cache.set(cacheKey, globalAbilities);
        return globalAbilities;
    }

    /**
     * Load specialized abilities for a role
     */
    async loadSpecializedAbilities(roleId) {
        const rolePath = path.join(this.agentsRoot, roleId, 'abilities');
        const specializedAbilities = [];

        try {
            if (!await fs.pathExists(rolePath)) {
                return specializedAbilities;
            }

            const files = await fs.readdir(rolePath);
            const specializedFiles = files.filter(file =>
                file.endsWith('.md') &&
                !['core-abilities.md', 'tools-and-frameworks.md', 'processes-and-workflows.md'].includes(file)
            );

            for (const file of specializedFiles) {
                const filePath = path.join(rolePath, file);
                const content = await this.loadAbilityFile(filePath);
                specializedAbilities.push({
                    name: file.replace('.md', ''),
                    content: content,
                    type: 'specialized'
                });
            }
        } catch (error) {
            console.warn(`⚠️  Failed to load specialized abilities for ${roleId}:`, error.message);
        }

        return specializedAbilities;
    }

    /**
     * Load collaborative abilities based on role relationships
     */
    async loadCollaborativeAbilities(roleId) {
        const memoryConfig = this.memoryConfig.getRoleConfig(roleId);
        const collaborativeAbilities = [];

        // Define collaboration patterns
        const collaborationPatterns = {
            backend: ['security', 'devops', 'architect', 'data'],
            frontend: ['design', 'product', 'quality'],
            devops: ['backend', 'security', 'architect', 'edge'],
            security: ['backend', 'devops', 'quality', 'legal'],
            quality: ['backend', 'frontend', 'product'],
            design: ['frontend', 'product', 'docs', 'marketer'],
            architect: ['backend', 'devops', 'cto', 'data'],
            ceo: ['cto', 'cfo', 'product'],
            cto: ['architect', 'security', 'devops', 'quantum'],
            cfo: ['ceo', 'legal', 'analyst'],
            analyst: ['product', 'cfo', 'data'],
            docs: ['product', 'design', 'quality'],
            product: ['design', 'backend', 'quality', 'analyst'],
            marketer: ['product', 'ceo', 'design'],
            legal: ['cfo', 'ceo', 'security'],
            data: ['backend', 'algorithm', 'analyst'],
            algorithm: ['data', 'backend', 'quantum'],
            quantum: ['algorithm', 'data', 'cto'],
            edge: ['devops', 'network', 'backend'],
            network: ['devops', 'edge', 'security']
        };

        const relatedRoles = collaborationPatterns[roleId] || [];

        for (const relatedRole of relatedRoles) {
            try {
                const relatedAbilities = await this.loadSharedAbilities(roleId, relatedRole);
                if (relatedAbilities.length > 0) {
                    collaborativeAbilities.push({
                        role: relatedRole,
                        abilities: relatedAbilities,
                        type: 'collaborative'
                    });
                }
            } catch (error) {
                console.warn(`⚠️  Failed to load collaborative abilities for ${roleId} <-> ${relatedRole}:`, error.message);
            }
        }

        return collaborativeAbilities;
    }

    /**
     * Load shared abilities between roles
     */
    async loadSharedAbilities(primaryRole, secondaryRole) {
        const candidatePaths = [
            path.join(this.agentsRoot, 'shared', `${primaryRole}-${secondaryRole}`, 'abilities'),
            path.join(this.agentsRoot, 'shared', `${primaryRole}-${secondaryRole}`),
            path.join(this.agentsRoot, 'shared', `${secondaryRole}-${primaryRole}`, 'abilities'),
            path.join(this.agentsRoot, 'shared', `${secondaryRole}-${primaryRole}`)
        ];

        const sharedAbilities = [];

        for (const searchPath of candidatePaths) {
            try {
                if (await fs.pathExists(searchPath)) {
                    const files = await fs.readdir(searchPath);
                    for (const file of files.filter(f => f.endsWith('.md'))) {
                        const fullPath = path.join(searchPath, file);
                        const content = await this.loadAbilityFile(fullPath);
                        sharedAbilities.push({
                            name: file.replace('.md', ''),
                            content: content,
                            source: fullPath
                        });
                    }
                }
            } catch (error) {
                // Shared abilities are optional
            }
        }

        return sharedAbilities;
    }

    /**
     * Load and parse an individual ability file
     */
    async loadAbilityFile(filePath) {
        try {
            const rawContent = await fs.readFile(filePath, 'utf8');
            return this.parseAbilityContent(rawContent, filePath);
        } catch (error) {
            throw new Error(`Failed to load ability file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Parse ability content with enhanced structure
     */
    parseAbilityContent(content, filePath) {
        const parsed = {
            raw_content: content,
            sections: {},
            skills: [],
            tools: [],
            processes: [],
            metadata: {
                file_path: filePath,
                parsed_at: new Date().toISOString(),
                word_count: content.split(/\s+/).length,
                sections_count: 0
            }
        };

        // Parse markdown sections
        const sections = content.split(/^##\s+/m);
        sections.forEach((section, index) => {
            if (index === 0) return; // Skip content before first section

            const lines = section.trim().split('\n');
            const title = lines[0].trim();
            const sectionContent = lines.slice(1).join('\n').trim();

            parsed.sections[title.toLowerCase().replace(/\s+/g, '_')] = {
                title: title,
                content: sectionContent,
                lines: lines.length - 1
            };
        });

        parsed.metadata.sections_count = Object.keys(parsed.sections).length;

        // Extract structured data
        this.extractSkills(parsed);
        this.extractTools(parsed);
        this.extractProcesses(parsed);

        return parsed;
    }

    /**
     * Extract skills from ability content
     */
    extractSkills(parsed) {
        const skillPatterns = [
            /^\s*-\s*\*\*([^*]+)\*\*:\s*(.+)$/gm,
            /^\s*-\s*([^:]+):\s*(.+)$/gm,
            /^\s*\*\s*([^:]+):\s*(.+)$/gm
        ];

        for (const pattern of skillPatterns) {
            let match;
            while ((match = pattern.exec(parsed.raw_content)) !== null) {
                parsed.skills.push({
                    name: match[1].trim(),
                    description: match[2].trim(),
                    type: 'skill'
                });
            }
        }
    }

    /**
     * Extract tools from ability content
     */
    extractTools(parsed) {
        const toolSections = ['tools_and_frameworks', 'development_tools', 'frameworks_libraries'];

        for (const sectionKey of toolSections) {
            if (parsed.sections[sectionKey]) {
                const content = parsed.sections[sectionKey].content;
                const toolMatches = content.match(/^\s*-\s*([^:]+):/gm);

                if (toolMatches) {
                    toolMatches.forEach(match => {
                        const toolName = match.replace(/^\s*-\s*/, '').replace(':', '').trim();
                        parsed.tools.push({
                            name: toolName,
                            category: sectionKey,
                            type: 'tool'
                        });
                    });
                }
            }
        }
    }

    /**
     * Extract processes from ability content
     */
    extractProcesses(parsed) {
        const processSections = ['processes_and_workflows', 'methodology', 'approach'];

        for (const sectionKey of processSections) {
            if (parsed.sections[sectionKey]) {
                const content = parsed.sections[sectionKey].content;
                const processMatches = content.match(/^\s*\d+\.\s*\*\*([^*]+)\*\*:/gm);

                if (processMatches) {
                    processMatches.forEach((match, index) => {
                        const processName = match.replace(/^\s*\d+\.\s*\*\*/, '').replace('**:', '').trim();
                        parsed.processes.push({
                            name: processName,
                            order: index + 1,
                            category: sectionKey,
                            type: 'process'
                        });
                    });
                }
            }
        }
    }

    /**
     * Search abilities across roles
     */
    async searchAbilities(query, roleIds = [], options = {}) {
        const searchOptions = {
            fuzzy_matching: true,
            case_sensitive: false,
            max_results: 10,
            include_content: true,
            ...options
        };

        const results = [];
        const searchRoles = roleIds.length > 0 ? roleIds : this.getAllRoleIds();

        for (const roleId of searchRoles) {
            try {
                const abilities = await this.loadRoleAbilities(roleId);
                const roleResults = this.searchInAbilities(query, abilities, roleId, searchOptions);
                results.push(...roleResults);
            } catch (error) {
                console.warn(`⚠️  Search failed for role ${roleId}:`, error.message);
            }
        }

        // Sort by relevance and limit results
        return results
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, searchOptions.max_results);
    }

    /**
     * Search within a specific role's abilities
     */
    searchInAbilities(query, abilities, roleId, options) {
        const results = [];
        const queryLower = query.toLowerCase();

        // Search in different ability components
        const searchTargets = [
            { data: abilities.core_abilities, type: 'core' },
            { data: abilities.tools_and_frameworks, type: 'tools' },
            { data: abilities.processes_and_workflows, type: 'processes' },
            { data: abilities.specialized_abilities, type: 'specialized' }
        ];

        for (const target of searchTargets) {
            if (!target.data) continue;

            const content = Array.isArray(target.data)
                ? target.data.map(item => item.content || item.raw_content || '').join(' ')
                : target.data.raw_content || '';

            if (content.toLowerCase().includes(queryLower)) {
                results.push({
                    role: roleId,
                    type: target.type,
                    content: options.include_content ? content : null,
                    relevance: this.calculateRelevance(query, content),
                    match_type: 'content'
                });
            }
        }

        return results;
    }

    /**
     * Calculate relevance score for search results
     */
    calculateRelevance(query, content) {
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();

        let score = 0;

        // Exact phrase match
        if (contentLower.includes(queryLower)) {
            score += 10;
        }

        // Word matches
        const queryWords = queryLower.split(/\s+/);
        const contentWords = contentLower.split(/\s+/);

        for (const word of queryWords) {
            if (contentWords.includes(word)) {
                score += 2;
            }
        }

        // Bonus for shorter content (more focused)
        if (content.length < 500) {
            score += 1;
        }

        return score;
    }

    /**
     * Get all available role IDs
     */
    getAllRoleIds() {
        return [
            'algorithm', 'analyst', 'architect', 'backend', 'ceo', 'cfo',
            'cto', 'data', 'design', 'devops', 'docs', 'edge',
            'frontend', 'legal', 'marketer', 'network', 'product', 'quality',
            'quantum', 'security'
        ];
    }

    /**
     * Get default abilities for a role
     */
    getDefaultAbilities(roleId) {
        return {
            role: roleId,
            core_abilities: { raw_content: `Default ${roleId} abilities` },
            tools_and_frameworks: { raw_content: 'Standard development tools' },
            processes_and_workflows: { raw_content: 'Standard workflows' },
            specialized_abilities: [],
            global_inheritance: [],
            metadata: {
                loaded_at: new Date().toISOString(),
                default: true,
                files_loaded: [],
                inheritance_chain: ['default']
            }
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('✅ Abilities cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            memory_usage: JSON.stringify(Object.fromEntries(this.cache)).length
        };
    }
}

export default EnhancedAbilitiesManager;
