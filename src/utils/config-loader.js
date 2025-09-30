/**
 * Configuration loader for Enhanced AutomatosX
 * Loads configuration from various sources
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

/**
 * Load configuration from project directory
 * Searches for config files in order of preference
 */
export async function loadConfig(projectPath = process.cwd()) {
    const configFiles = [
        'defai-ax.config.js',
        'defai-ax.config.json',
        'defai-ax.config.yaml',
        'defai-ax.config.yml',
        '.defai-ax.json',
        '.defai-ax.yaml'
    ];

    // Default configuration
    const defaultConfig = {
        providers: {
            'claude-code': {
                enabled: true,
                priority: 1
            },
            'gemini-cli': {
                enabled: true,
                priority: 2
            },
            'openai-cli': {
                enabled: true,
                priority: 3
            }
        },
        memory: {
            chatHistory: true,
            vectorSearch: true
        },
        workspace: {
            baseDir: 'workspaces',
            createSubdirs: true
        },
        logging: {
            level: 'info',
            file: '.defai/logs/defai-ax.log'
        }
    };

    // Try to load config from files
    for (const configFile of configFiles) {
        const configPath = path.join(projectPath, configFile);

        if (await fs.pathExists(configPath)) {
            try {
                const config = await loadConfigFile(configPath);
                console.log(`📁 Loaded configuration from ${configFile}`);

                // Merge with default config
                return mergeConfig(defaultConfig, config);

            } catch (error) {
                console.warn(`⚠️  Failed to load config from ${configFile}: ${error.message}`);
            }
        }
    }

    // No config file found, use defaults
    console.log('📁 Using default configuration');
    return defaultConfig;
}

/**
 * Load configuration from a specific file
 */
async function loadConfigFile(configPath) {
    const ext = path.extname(configPath).toLowerCase();

    switch (ext) {
        case '.js':
            // Dynamic import for ES modules
            const module = await import(path.resolve(configPath));
            return module.default || module;

        case '.json':
            return await fs.readJson(configPath);

        case '.yaml':
        case '.yml':
            const yamlContent = await fs.readFile(configPath, 'utf8');
            return yaml.parse(yamlContent);

        default:
            throw new Error(`Unsupported config file format: ${ext}`);
    }
}

/**
 * Merge user config with default config
 */
function mergeConfig(defaultConfig, userConfig) {
    return {
        ...defaultConfig,
        ...userConfig,
        providers: {
            ...defaultConfig.providers,
            ...userConfig.providers
        },
        memory: {
            ...defaultConfig.memory,
            ...userConfig.memory
        },
        workspace: {
            ...defaultConfig.workspace,
            ...userConfig.workspace
        },
        logging: {
            ...defaultConfig.logging,
            ...userConfig.logging
        }
    };
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
    const errors = [];

    // Validate providers
    if (!config.providers || Object.keys(config.providers).length === 0) {
        errors.push('At least one provider must be configured');
    }

    // Check if Claude Code is available (required)
    if (!config.providers['claude-code']?.enabled) {
        console.warn('⚠️  Claude Code provider should be enabled as primary provider');
    }

    // Validate workspace configuration
    if (config.workspace && !config.workspace.baseDir) {
        errors.push('Workspace baseDir is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Save configuration to project directory
 */
export async function saveConfig(projectPath, config, format = 'yaml') {
    const configFiles = {
        yaml: 'defai-ax.config.yaml',
        json: 'defai-ax.config.json',
        js: 'defai-ax.config.js'
    };

    const configPath = path.join(projectPath, configFiles[format]);

    switch (format) {
        case 'yaml':
            const yamlContent = yaml.stringify(config, {
                indent: 2,
                lineWidth: -1,
                noRefs: true
            });
            await fs.writeFile(configPath, yamlContent);
            break;

        case 'json':
            await fs.writeJson(configPath, config, { spaces: 2 });
            break;

        case 'js':
            const jsContent = `export default ${JSON.stringify(config, null, 2)};`;
            await fs.writeFile(configPath, jsContent);
            break;

        default:
            throw new Error(`Unsupported format: ${format}`);
    }

    console.log(`✅ Configuration saved to ${configFiles[format]}`);
}