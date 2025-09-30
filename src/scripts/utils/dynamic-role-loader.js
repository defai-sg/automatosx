#!/usr/bin/env node

/**
 * AutomatosX Dynamic Role Loader
 * Bob's high-performance role loading with smart caching
 *
 * Copyright 2025 DEFAI Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { globalConfigCache } from './performance-utils.js';
import { LoggerFactory } from './logging-utils.js';
import { DefaiError, InputValidator } from './security-utils.js';

const logger = LoggerFactory.getLogger('dynamic-role-loader');

/**
 * Agent name aliases mapping human names to role names
 * This allows users to use either human names or role names
 */
const AGENT_NAME_ALIASES = {
    // Leadership Team
    'leo': 'ceo',
    'tony': 'cto',
    'flora': 'cfo',
    'louis': 'legal',

    // Development Team
    'bob': 'backend',
    'frank': 'frontend',
    'david': 'devops',
    'adrian': 'architect',
    'queenie': 'quality',
    'steve': 'security',

    // Creative Team
    'debbee': 'design',
    'paris': 'product',
    'doris': 'docs',

    // Data & Research
    'daisy': 'data',
    'anna': 'analyst',

    // Specialized Team
    'maggie': 'marketer',
    'alex': 'algorithm',
    'quian': 'quantum',
    'emily': 'edge',
    'nicolas': 'network',

    // Legacy aliases for backward compatibility
    'alice': 'frontend',
    'sarah': 'devops',
    'luna': 'design',
    'maya': 'docs'
};

/**
 * Dynamic Role Loader with intelligent caching and fallback
 */
export class DynamicRoleLoader {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.enableCaching = options.enableCaching !== false;
        this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
        this.validateOnLoad = options.validateOnLoad !== false;

        // Role data sources in priority order
        this.dataSources = [
            {
                name: 'user-profiles',
                path: path.join(this.projectRoot, '.defai/agents'),
                pattern: '*/profile.yaml',
                type: 'yaml',
                priority: 1
            },
            {
                name: 'base-profiles',
                path: path.join(this.projectRoot, 'src/agents'),
                pattern: '*/profile.yaml',
                type: 'yaml',
                priority: 2
            },
            {
                name: 'agent-profiles',
                path: path.join(this.projectRoot, 'src/agents/agent-profiles.js'),
                type: 'js',
                priority: 3
            }
        ];

        // No static fallback data - pure dynamic loading only
    }

    /**
     * Resolve agent name to role name using aliases
     * @param {string} name - Agent name (could be human name or role name)
     * @returns {string} - Resolved role name
     */
    resolveAgentName(name) {
        const lowerName = name.toLowerCase();

        // Check if it's an alias (human name)
        if (AGENT_NAME_ALIASES[lowerName]) {
            return AGENT_NAME_ALIASES[lowerName];
        }

        // Return as-is (assuming it's already a role name)
        return lowerName;
    }

    /**
     * Get available agent aliases
     * @returns {Object} - All available aliases and roles
     */
    getAvailableNames() {
        return {
            aliases: Object.keys(AGENT_NAME_ALIASES),
            roles: Object.values(AGENT_NAME_ALIASES),
            mapping: AGENT_NAME_ALIASES
        };
    }

    /**
     * Load roles dynamically with caching
     * @param {boolean} forceReload - Force reload bypassing cache
     * @returns {Object} - Merged role data
     */
    async loadRoles(forceReload = false) {
        const cacheKey = 'dynamic-roles-complete';

        // Try cache first for performance
        if (this.enableCaching && !forceReload) {
            const cached = globalConfigCache.get(cacheKey);
            if (cached) {
                logger.debug('Roles loaded from cache');
                return cached;
            }
        }

        try {
            const startTime = performance.now();
            logger.debug('Starting dynamic role loading');

            // Load from multiple sources in parallel for speed
            const loadPromises = this.dataSources.map(source =>
                this.loadFromSource(source).catch(error => {
                    logger.warn(`Failed to load from ${source.name}`, { error: error.message });
                    return null;
                })
            );

            const results = await Promise.all(loadPromises);
            const mergedRoles = this.mergeRoleData(results.filter(r => r !== null));

            // Validate and enrich the merged data
            const enrichedRoles = this.enrichRoleData(mergedRoles);

            // Performance logging
            const duration = performance.now() - startTime;
            logger.info('Dynamic role loading completed', {
                duration: `${duration.toFixed(2)}ms`,
                sourceCount: this.dataSources.length,
                roleCount: Object.keys(enrichedRoles).length
            });

            // Cache the result
            if (this.enableCaching) {
                globalConfigCache.set(cacheKey, enrichedRoles, this.cacheTimeout);
            }

            return enrichedRoles;

        } catch (error) {
            logger.error('Dynamic role loading failed', { error: error.message });
            throw new DefaiError(
                'Failed to load roles from any source',
                'ROLE_LOADING_FAILED',
                { originalError: error.message, sources: this.dataSources.length }
            );
        }
    }

    /**
     * Load roles from a specific source
     * @param {Object} source - Source configuration
     * @returns {Object} - Loaded role data
     */
    async loadFromSource(source) {
        switch (source.type) {
            case 'yaml':
                return this.loadYamlSource(source);
            case 'js':
                return this.loadJsSource(source);
            default:
                throw new DefaiError(`Unknown source type: ${source.type}`, 'UNKNOWN_SOURCE_TYPE');
        }
    }

    /**
     * Load YAML source files
     * @param {Object} source - Source configuration
     * @returns {Object} - Parsed role data
     */
    async loadYamlSource(source) {
        const sourcePath = source.path;

        if (!await fs.pathExists(sourcePath)) {
            throw new DefaiError(`Source path not found: ${sourcePath}`, 'SOURCE_PATH_NOT_FOUND');
        }

        const roles = {};

        if (source.pattern.includes('*/')) {
            // Load from subdirectories (agents/*/profile.yaml)
            const dirs = await fs.readdir(sourcePath);

            for (const dir of dirs) {
                const dirPath = path.join(sourcePath, dir);
                const stat = await fs.stat(dirPath);

                if (stat.isDirectory()) {
                    const profilePath = path.join(dirPath, 'profile.yaml');
                    if (await fs.pathExists(profilePath)) {
                        try {
                            const content = await fs.readFile(profilePath, 'utf8');
                            const parsed = yaml.parse(content);
                            if (parsed && typeof parsed === 'object') {
                                roles[dir] = { ...parsed, role: dir };
                            }
                        } catch (error) {
                            logger.warn(`Failed to parse ${profilePath}`, { error: error.message });
                        }
                    }
                }
            }
        } else {
            // Load from direct files (legacy fallback)
            const files = await fs.readdir(sourcePath);
            const yamlFiles = files.filter(f => f.endsWith('.yaml'));

            for (const file of yamlFiles) {
                const filePath = path.join(sourcePath, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const parsed = yaml.parse(content);
                    if (parsed && typeof parsed === 'object') {
                        const roleName = path.basename(file, '.yaml');
                        roles[roleName] = { ...parsed, role: roleName };
                    }
                } catch (error) {
                    logger.warn(`Failed to parse ${filePath}`, { error: error.message });
                }
            }
        }

        return { source: source.name, data: roles };
    }

    /**
     * Load JavaScript source file
     * @param {Object} source - Source configuration
     * @returns {Object} - Loaded role data
     */
    async loadJsSource(source) {
        try {
            const module = await import(source.path);
            const profiles = module.AGENT_PROFILES || {};

            // Convert to consistent format
            const roles = {};
            Object.entries(profiles).forEach(([name, profile]) => {
                const roleName = profile.role || name.toLowerCase();
                roles[roleName] = {
                    ...profile,
                    name: profile.name || name,
                    role: roleName
                };
            });

            return { source: source.name, data: roles };

        } catch (error) {
            throw new DefaiError(
                `Failed to load JS source: ${error.message}`,
                'JS_SOURCE_LOAD_FAILED',
                { sourcePath: source.path, originalError: error.message }
            );
        }
    }

    /**
     * Merge role data from multiple sources
     * @param {Array} sourceResults - Results from each source
     * @returns {Object} - Merged role data
     */
    mergeRoleData(sourceResults) {
        const merged = {};

        // Sort by priority (lower number = higher priority)
        const sortedResults = sourceResults.sort((a, b) => {
            const aPriority = this.dataSources.find(s => s.name === a.source)?.priority || 999;
            const bPriority = this.dataSources.find(s => s.name === b.source)?.priority || 999;
            return aPriority - bPriority;
        });

        // Merge data with priority override
        for (const result of sortedResults) {
            Object.entries(result.data).forEach(([roleName, roleData]) => {
                if (!merged[roleName]) {
                    merged[roleName] = { ...roleData };
                } else {
                    // Merge with higher priority data taking precedence
                    merged[roleName] = {
                        ...merged[roleName],
                        ...roleData
                    };
                }
            });
        }

        return merged;
    }

    /**
     * Enrich role data with defaults and validation
     * @param {Object} roles - Raw role data
     * @returns {Object} - Enriched role data
     */
    enrichRoleData(roles) {
        const enriched = {};

        Object.entries(roles).forEach(([roleName, roleData]) => {
            try {
                // Validate role name
                const validatedName = InputValidator.validateAgentName(roleName);

                // Enrich with defaults
                enriched[validatedName] = {
                    name: roleData.name || this.generateDefaultName(validatedName),
                    role: validatedName,
                    title: roleData.title || this.generateDefaultTitle(validatedName),
                    catchphrase: roleData.catchphrase || 'Ready to help!',
                    style: roleData.style || 'professional and efficient approach',
                    specialties: roleData.specialties || ['General assistance'],
                    category: roleData.category || this.inferCategory(validatedName),
                    // Include original data
                    ...roleData
                };

            } catch (error) {
                logger.warn(`Skipping invalid role: ${roleName}`, { error: error.message });
            }
        });

        return enriched;
    }

    /**
     * Generate default name from role
     * @param {string} role - Role name
     * @returns {string} - Generated name
     */
    generateDefaultName(role) {
        const names = {
            backend: 'Bob',
            frontend: 'Frank',
            devops: 'Oliver',
            security: 'Steve',
            architect: 'Adrian',
            design: 'Debbee',
            cfo: 'Flora',
            product: 'Paris',
            qa: 'Qing',
            qc: 'Claire',
            network: 'Nicolas',
            algorithm: 'Alex',
            marketer: 'Maggie',
            edge: 'Emily',
            legal: 'Louis',
            quantum: 'Quian',
            ceo: 'Eric',
            cto: 'Tony',
            data: 'Daisy',
            docs: 'Doris',
            analyst: 'Anna',
            quality: 'Queenie'
        };
        return names[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    /**
     * Generate default title from role
     * @param {string} role - Role name
     * @returns {string} - Generated title
     */
    generateDefaultTitle(role) {
        const titles = {
            backend: 'Backend Developer',
            frontend: 'Frontend Developer',
            devops: 'DevOps Engineer',
            security: 'Security Engineer',
            architect: 'Software Architect',
            design: 'UX Designer',
            qa: 'QA Engineer',
            qc: 'Quality Control Specialist'
        };
        return titles[role] || `${role.charAt(0).toUpperCase() + role.slice(1)} Specialist`;
    }

    /**
     * Infer category from role
     * @param {string} role - Role name
     * @returns {string} - Inferred category
     */
    inferCategory(role) {
        const categories = {
            backend: 'development',
            frontend: 'development',
            devops: 'development',
            architect: 'development',
            qa: 'development',
            qc: 'development',
            security: 'security',
            design: 'creative',
            product: 'creative',
            ceo: 'leadership',
            cto: 'leadership',
            pm: 'leadership',
            docs: 'research',
            research: 'research',
            ds: 'data',
            de: 'data'
        };
        return categories[role] || 'general';
    }

    /**
     * Get specific role data
     * @param {string} roleName - Role name to get
     * @returns {Object} - Role data
     */
    async getRole(roleName) {
        const roles = await this.loadRoles();
        const validatedName = InputValidator.validateAgentName(roleName);

        if (!roles[validatedName]) {
            throw new DefaiError(
                `Role not found: ${validatedName}`,
                'ROLE_NOT_FOUND',
                { requestedRole: validatedName, availableRoles: Object.keys(roles) }
            );
        }

        return roles[validatedName];
    }

    /**
     * Get all available role names
     * @returns {Array} - Array of role names
     */
    async getRoleNames() {
        const roles = await this.loadRoles();
        return Object.keys(roles).sort();
    }

    /**
     * Validate role synchronization across sources
     * @returns {Object} - Validation report
     */
    async validateSynchronization() {
        const report = {
            sources: {},
            mismatches: [],
            recommendations: []
        };

        try {
            // Load from each source separately
            for (const source of this.dataSources) {
                try {
                    const result = await this.loadFromSource(source);
                    report.sources[source.name] = {
                        status: 'success',
                        roleCount: Object.keys(result.data).length,
                        roles: Object.keys(result.data).sort()
                    };
                } catch (error) {
                    report.sources[source.name] = {
                        status: 'error',
                        error: error.message,
                        roleCount: 0,
                        roles: []
                    };
                }
            }

            // Find mismatches
            const allRoles = new Set();
            Object.values(report.sources).forEach(source => {
                if (source.roles) {
                    source.roles.forEach(role => allRoles.add(role));
                }
            });

            allRoles.forEach(role => {
                const sourcesWith = [];
                const sourcesWithout = [];

                Object.entries(report.sources).forEach(([sourceName, sourceData]) => {
                    if (sourceData.roles && sourceData.roles.includes(role)) {
                        sourcesWith.push(sourceName);
                    } else {
                        sourcesWithout.push(sourceName);
                    }
                });

                if (sourcesWith.length > 0 && sourcesWithout.length > 0) {
                    report.mismatches.push({
                        role,
                        presentIn: sourcesWith,
                        missingFrom: sourcesWithout
                    });
                }
            });

            // Generate recommendations
            if (report.mismatches.length > 0) {
                report.recommendations.push('Consider synchronizing role definitions across all sources');
                report.recommendations.push('Use dynamic loading with fallback to ensure consistency');
            }

        } catch (error) {
            report.error = error.message;
        }

        return report;
    }

    /**
     * Clear role cache
     */
    clearCache() {
        if (this.enableCaching) {
            globalConfigCache.delete('dynamic-roles-complete');
            logger.debug('Role cache cleared');
        }
    }
}

// Global instance for shared use
export const globalRoleLoader = new DynamicRoleLoader({
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    validateOnLoad: true
});

export default DynamicRoleLoader;
