/**
 * YAML Inheritance and Template System for AutomatosX v3.1.1
 * Provides hierarchical configuration inheritance to reduce duplication
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

// Deep merge utility to replace lodash-es
const merge = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (target && source && typeof target === 'object' && typeof source === 'object') {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    return sources.length ? merge(target, ...sources) : target;
};

export class YamlInheritanceManager {
    constructor(configPath = process.cwd()) {
        this.configPath = configPath;
        this.cache = new Map();
        this.loadedConfigs = new Map();

        // Define search paths for configuration files
        this.searchPaths = [
            path.join(configPath, 'config'),
            path.join(configPath, 'profiles'),
            path.join(configPath, 'templates')
        ];
    }

    /**
     * Load a configuration file with inheritance support
     * @param {string} configName - Name of the configuration file (without .yaml)
     * @returns {Object} Merged configuration object
     */
    async loadConfig(configName) {
        // Check cache first
        const cacheKey = configName;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const config = await this._loadConfigRecursive(configName, new Set());
            this.cache.set(cacheKey, config);
            return config;
        } catch (error) {
            throw new Error(`Failed to load config '${configName}': ${error.message}`);
        }
    }

    /**
     * Recursively load and merge configurations with inheritance
     * @private
     */
    async _loadConfigRecursive(configName, visited) {
        // Prevent circular dependencies
        if (visited.has(configName)) {
            throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${configName}`);
        }
        visited.add(configName);

        // Load the base configuration file
        const configFile = await this._findConfigFile(configName);
        if (!configFile) {
            throw new Error(`Configuration file not found: ${configName}.yaml`);
        }

        const rawConfig = await this._loadYamlFile(configFile);
        let mergedConfig = { ...rawConfig };

        // Handle inheritance via 'extends' property
        if (rawConfig.extends) {
            const parentConfigs = Array.isArray(rawConfig.extends)
                ? rawConfig.extends
                : [rawConfig.extends];

            let parentConfig = {};

            // Load and merge parent configurations in order
            for (const parentName of parentConfigs) {
                const parent = await this._loadConfigRecursive(parentName, new Set(visited));
                parentConfig = merge(parentConfig, parent);
            }

            // Merge parent config with current config (current takes precedence)
            mergedConfig = merge(parentConfig, rawConfig);

            // Remove the extends property from final config
            delete mergedConfig.extends;
        }

        // Process dynamic model configurations
        mergedConfig = this._processModelInheritance(mergedConfig);

        // Process memory configuration inheritance
        mergedConfig = this._processMemoryInheritance(mergedConfig);

        // Process workspace configuration
        mergedConfig = this._processWorkspaceInheritance(mergedConfig);

        visited.delete(configName);
        return mergedConfig;
    }

    /**
     * Process model configuration with automatic fallback generation
     * @private
     */
    _processModelInheritance(config) {
        if (!config.stages || !config.default_models) {
            return config;
        }

        // Ensure models object exists
        if (!config.models) {
            config.models = {};
        }

        // Generate model configurations for each stage if not explicitly defined
        for (const stage of config.stages) {
            if (!config.models[stage]) {
                config.models[stage] = config.default_models.primary;
            }

            if (!config.models[`${stage}_fallback`]) {
                config.models[`${stage}_fallback`] = config.default_models.fallback;
            }

            if (!config.models[`${stage}_fallback_2`]) {
                config.models[`${stage}_fallback_2`] = config.default_models.fallback_2;
            }

            // Add secondary fallback models for enhanced reliability
            if (config.secondary_fallback_models) {
                if (!config.models[`${stage}_secondary_claude`]) {
                    config.models[`${stage}_secondary_claude`] = config.secondary_fallback_models.claude_secondary;
                }

                if (!config.models[`${stage}_secondary_gemini`]) {
                    config.models[`${stage}_secondary_gemini`] = config.secondary_fallback_models.gemini_secondary;
                }

                if (!config.models[`${stage}_secondary_openai`]) {
                    config.models[`${stage}_secondary_openai`] = config.secondary_fallback_models.openai_secondary;
                }
            }
        }

        return config;
    }

    /**
     * Process memory configuration inheritance
     * @private
     */
    _processMemoryInheritance(config) {
        if (!config.default_memory) {
            return config;
        }

        // Merge default memory settings with role-specific settings
        if (!config.memory) {
            config.memory = {};
        }

        // Merge with defaults, keeping role-specific settings
        config.memory = merge({}, config.default_memory, config.memory);

        // Ensure role is included in scopes if not present
        if (config.role && config.memory.scopes && !config.memory.scopes.includes(config.role)) {
            config.memory.scopes.push(config.role);
        }

        return config;
    }

    /**
     * Process workspace configuration inheritance
     * @private
     */
    _processWorkspaceInheritance(config) {
        if (!config.default_workspace || !config.role) {
            return config;
        }

        // Set up workspace configuration
        if (!config.workspace) {
            config.workspace = {};
        }

        // Set base directory if not specified
        if (!config.workspace.base_directory) {
            config.workspace.base_directory = `.defai/workspaces/${config.role}`;
        }

        // Merge workspace settings
        config.workspace = merge({}, config.default_workspace, config.workspace);

        return config;
    }

    /**
     * Find configuration file in search paths
     * @private
     */
    async _findConfigFile(configName) {
        const fileName = configName.endsWith('.yaml') ? configName : `${configName}.yaml`;

        for (const searchPath of this.searchPaths) {
            const fullPath = path.join(searchPath, fileName);
            if (await fs.pathExists(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }

    /**
     * Load and parse YAML file
     * @private
     */
    async _loadYamlFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return yaml.parse(content) || {};
        } catch (error) {
            throw new Error(`Failed to parse YAML file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Generate a simplified profile using templates
     * @param {string} role - The role identifier
     * @param {Object} overrides - Role-specific overrides
     * @returns {Object} Complete profile configuration
     */
    async generateSimplifiedProfile(role, overrides = {}) {
        try {
            // Load role templates to determine which template to use
            const roleTemplates = await this.loadConfig('role-templates');
            const templateName = roleTemplates.role_template_mapping?.[role] || 'developer_template';

            // Create a temporary config object that extends the appropriate template
            const profileConfig = {
                extends: templateName,
                role: role,
                ...overrides
            };

            // Process the configuration through inheritance
            return await this._processConfigObject(profileConfig);
        } catch (error) {
            throw new Error(`Failed to generate simplified profile for role '${role}': ${error.message}`);
        }
    }

    /**
     * Process a configuration object through inheritance without file I/O
     * @private
     */
    async _processConfigObject(configObj) {
        if (!configObj.extends) {
            return configObj;
        }

        const parentConfigs = Array.isArray(configObj.extends)
            ? configObj.extends
            : [configObj.extends];

        let mergedConfig = {};

        // Load and merge parent configurations
        for (const parentName of parentConfigs) {
            const parent = await this.loadConfig(parentName);
            mergedConfig = merge(mergedConfig, parent);
        }

        // Merge with current config
        const finalConfig = merge(mergedConfig, configObj);
        delete finalConfig.extends;

        // Process inheritance
        return this._processModelInheritance(
            this._processMemoryInheritance(
                this._processWorkspaceInheritance(finalConfig)
            )
        );
    }

    /**
     * Save a simplified profile to file
     * @param {string} role - The role identifier
     * @param {Object} config - Configuration object
     * @param {string} outputPath - Output file path
     */
    async saveSimplifiedProfile(role, config, outputPath = null) {
        if (!outputPath) {
            outputPath = path.join(this.configPath, 'profiles', `${role}.yaml`);
        }

        // Create a minimal profile that extends templates
        const roleTemplates = await this.loadConfig('role-templates');
        const templateName = roleTemplates.role_template_mapping?.[role] || 'developer_template';

        const simplifiedConfig = {
            extends: templateName,
            role: config.role || role,
            name: config.name,
            title: config.title,
            description: config.description
        };

        // Add personality if present
        if (config.personality) {
            simplifiedConfig.personality = config.personality;
        }

        // Add role-specific overrides only (not inherited values)
        if (config.stages && !this._isArrayEqual(config.stages, await this._getTemplateStages(templateName))) {
            simplifiedConfig.stages = config.stages;
        }

        // Add custom memory scopes if different from template
        if (config.memory && config.memory.scopes) {
            const templateConfig = await this.loadConfig(templateName);
            if (!this._isArrayEqual(config.memory.scopes, templateConfig.memory?.scopes || [])) {
                simplifiedConfig.memory = {
                    scopes: config.memory.scopes
                };
            }
        }

        // Add metadata
        if (config.metadata) {
            simplifiedConfig.metadata = {
                last_updated: new Date().toISOString().split('T')[0],
                capability_score: config.metadata.capability_score || 8
            };
        }

        // Write to file
        const yamlContent = this._generateYamlComment(role, config) + yaml.stringify(simplifiedConfig, {
            indent: 2,
            lineWidth: 120,
            noRefs: true
        });

        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, yamlContent);
    }

    /**
     * Generate YAML file header comment
     * @private
     */
    _generateYamlComment(role, config) {
        return `# ${config.title || `${role} Agent`} Configuration
# ${config.name || role} - Simplified profile using template inheritance
# Generated: ${new Date().toISOString().split('T')[0]}

`;
    }

    /**
     * Get template stages for comparison
     * @private
     */
    async _getTemplateStages(templateName) {
        try {
            const template = await this.loadConfig(templateName);
            return template.stages || [];
        } catch {
            return [];
        }
    }

    /**
     * Compare arrays for equality
     * @private
     */
    _isArrayEqual(arr1, arr2) {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
        if (arr1.length !== arr2.length) return false;
        return arr1.every((val, index) => val === arr2[index]);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.loadedConfigs.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cached_configs: this.cache.size,
            cache_keys: Array.from(this.cache.keys())
        };
    }
}

export default YamlInheritanceManager;
