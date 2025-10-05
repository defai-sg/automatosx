/**
 * Configuration Management
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { AutomatosXConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { ConfigError, ErrorCode } from '../utils/errors.js';

/**
 * Load configuration from file
 * Priority: project config > user config > default config
 */
export async function loadConfig(projectDir: string): Promise<AutomatosXConfig> {
  // Try project config
  const projectConfig = resolve(projectDir, 'automatosx.config.json');
  if (existsSync(projectConfig)) {
    return await loadConfigFile(projectConfig);
  }

  // Try user home config
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const userConfig = resolve(homeDir, '.automatosx', 'config.json');
  if (existsSync(userConfig)) {
    return await loadConfigFile(userConfig);
  }

  // Default config
  return DEFAULT_CONFIG;
}

/**
 * Load and parse config file
 */
async function loadConfigFile(path: string): Promise<AutomatosXConfig> {
  try {
    const content = await readFile(path, 'utf-8');

    let userConfig: any;
    try {
      userConfig = JSON.parse(content);
    } catch (parseError) {
      throw ConfigError.parseError(parseError as Error, path);
    }

    // Merge with defaults (deep merge)
    const config = mergeConfig(DEFAULT_CONFIG, userConfig);

    // Validate merged config
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      throw ConfigError.invalid(
        validationErrors.join('; '),
        { path, errors: validationErrors }
      );
    }

    return config;
  } catch (error) {
    // Re-throw ConfigError as-is
    if (error instanceof ConfigError) {
      throw error;
    }

    // Handle file system errors
    if ((error as any).code === 'ENOENT') {
      throw ConfigError.notFound(path);
    }

    if ((error as any).code === 'EACCES') {
      throw new ConfigError(
        `Permission denied reading config: ${path}`,
        ErrorCode.CONFIG_PARSE_ERROR,
        [
          'Check file permissions',
          'Run with appropriate user privileges',
          'Verify the file is accessible'
        ],
        { path, error: (error as Error).message }
      );
    }

    // Unknown error
    throw new ConfigError(
      `Failed to load config: ${(error as Error).message}`,
      ErrorCode.CONFIG_PARSE_ERROR,
      ['Check file format and permissions'],
      { path, originalError: (error as Error).message }
    );
  }
}

/**
 * Deep merge configs
 */
function mergeConfig(
  defaults: AutomatosXConfig,
  user: Partial<AutomatosXConfig>
): AutomatosXConfig {
  return {
    providers: { ...defaults.providers, ...user.providers },
    memory: { ...defaults.memory, ...user.memory },
    workspace: { ...defaults.workspace, ...user.workspace },
    logging: { ...defaults.logging, ...user.logging }
  };
}

/**
 * Validate config
 */
export function validateConfig(config: AutomatosXConfig): string[] {
  const errors: string[] = [];

  // Validate providers
  for (const [name, provider] of Object.entries(config.providers)) {
    if (!provider.command) {
      errors.push(`Provider ${name}: command is required`);
    }
    if (provider.priority < 1) {
      errors.push(`Provider ${name}: priority must be >= 1`);
    }
    if (provider.timeout < 1000) {
      errors.push(`Provider ${name}: timeout must be >= 1000ms`);
    }
  }

  // Validate memory
  if (config.memory.maxEntries < 1) {
    errors.push('Memory: maxEntries must be >= 1');
  }
  if (config.memory.cleanupDays < 1) {
    errors.push('Memory: cleanupDays must be >= 1');
  }

  // Validate workspace
  if (config.workspace.cleanupDays < 1) {
    errors.push('Workspace: cleanupDays must be >= 1');
  }
  if (config.workspace.maxFiles < 1) {
    errors.push('Workspace: maxFiles must be >= 1');
  }

  return errors;
}
