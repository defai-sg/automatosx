/**
 * Configuration Management - v5.0+
 *
 * Supports both YAML and JSON configuration files.
 * Priority: .automatosx/config.yaml > automatosx.config.yaml >
 *           .automatosx/config.json > automatosx.config.json >
 *           ~/.automatosx/config.yaml > ~/.automatosx/config.json >
 *           DEFAULT_CONFIG
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve, join, extname } from 'path';
import { existsSync } from 'fs';
import { load as loadYaml, dump as dumpYaml } from 'js-yaml';
import type {
  AutomatosXConfig,
  MemorySearchConfig,
  LoggingRetentionConfig
} from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';
import { ConfigError, ErrorCode } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { deepMerge } from '../utils/deep-merge.js';
import {
  VALIDATION_LIMITS,
  isValidRelativePath,
  isValidCommand,
  isValidName,
  isValidExtension,
  isPositiveInteger,
  isNonNegativeInteger,
  inRange
} from './validation-limits.js';
import { TTLCache } from './cache.js';

/**
 * Configuration cache (process-level)
 *
 * Caches loaded configurations by project directory to avoid
 * repeated file system access and parsing on every execution.
 *
 * TTL: 60 seconds (config rarely changes during execution)
 * Max entries: 10 (one per project directory)
 */
const configCache = new TTLCache<AutomatosXConfig>({
  ttl: 60000,      // 60 seconds
  maxEntries: 10   // Support multiple project directories
});

/**
 * Clear configuration cache
 *
 * Useful for testing to ensure fresh config loading.
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Load configuration from file with caching
 *
 * Checks cache first to avoid repeated file system access and parsing.
 * Cache TTL: 60 seconds.
 *
 * Priority:
 *   1. .automatosx/config.yaml (highest)
 *   2. .automatosx/config.json
 *   3. automatosx.config.yaml
 *   4. automatosx.config.json
 *   5. ~/.automatosx/config.yaml
 *   6. ~/.automatosx/config.json
 *   7. DEFAULT_CONFIG (fallback)
 */
export async function loadConfig(projectDir: string): Promise<AutomatosXConfig> {
  // Check cache first
  const cached = configCache.get(projectDir);
  if (cached) {
    logger.debug('Config loaded from cache', { projectDir });
    return cached;
  }

  // Load from file system
  const config = await loadConfigUncached(projectDir);

  // Cache the result
  configCache.set(projectDir, config);
  logger.debug('Config cached', { projectDir, ttl: 60000 });

  return config;
}

/**
 * Load configuration from file without caching
 *
 * Internal function used by loadConfig(). Do not call directly unless
 * you specifically need to bypass the cache.
 */
async function loadConfigUncached(projectDir: string): Promise<AutomatosXConfig> {
  // Try project configs in priority order
  const projectConfigs = [
    resolve(projectDir, '.automatosx', 'config.yaml'),
    resolve(projectDir, '.automatosx', 'config.json'),
    resolve(projectDir, 'automatosx.config.yaml'),
    resolve(projectDir, 'automatosx.config.json')
  ];

  for (const configPath of projectConfigs) {
    if (existsSync(configPath)) {
      logger.debug('Loading config from path', { path: configPath });
      return await loadConfigFile(configPath);
    }
  }

  // Try user home config
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const userConfigs = [
    resolve(homeDir, '.automatosx', 'config.yaml'),
    resolve(homeDir, '.automatosx', 'config.json')
  ];

  for (const configPath of userConfigs) {
    if (existsSync(configPath)) {
      logger.debug('Loading config from path', { path: configPath });
      return await loadConfigFile(configPath);
    }
  }

  // Default config
  logger.debug('Using DEFAULT_CONFIG');
  return DEFAULT_CONFIG;
}

/**
 * Load and parse config file (supports both YAML and JSON)
 *
 * @param path - Path to config file
 * @returns Parsed and validated configuration
 *
 * @throws {ConfigError} If file not found, parse fails, or validation fails
 */
export async function loadConfigFile(path: string): Promise<AutomatosXConfig> {
  try {
    const content = await readFile(path, 'utf-8');

    // Security: File size limit (prevent DoS)
    if (content.length > VALIDATION_LIMITS.MAX_CONFIG_FILE_SIZE) {
      throw ConfigError.parseError(
        new Error(`Config file too large (max ${VALIDATION_LIMITS.MAX_CONFIG_FILE_SIZE / 1024}KB, got ${Math.ceil(content.length / 1024)}KB)`),
        path
      );
    }

    const ext = extname(path).toLowerCase();

    let userConfig: any;
    try {
      if (ext === '.yaml' || ext === '.yml') {
        // Parse YAML
        userConfig = loadYaml(content);
      } else {
        // Parse JSON
        userConfig = JSON.parse(content);
      }
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

    logger.info('Config loaded successfully', { path, format: ext });
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
 * Deep merge configs (handles all v5.0+ config sections)
 *
 * Uses generic deepMerge utility for consistent, type-safe merging.
 *
 * Merge behavior:
 * - null = explicitly disable feature
 * - undefined = use default value
 * - objects = recursively merge
 * - arrays/primitives = replace
 */
function mergeConfig(
  defaults: AutomatosXConfig,
  user: Partial<AutomatosXConfig>
): AutomatosXConfig {
  return deepMerge(defaults, user);
}

/**
 * Validate config (comprehensive validation for v5.0+)
 *
 * Validates all configuration values with:
 * - Security checks (path traversal, command injection, name injection)
 * - Resource limits (prevent DoS attacks)
 * - Type validation (prevent type confusion)
 * - Range validation (min/max values)
 */
export function validateConfig(config: AutomatosXConfig): string[] {
  const errors: string[] = [];

  // Validate providers
  for (const [name, provider] of Object.entries(config.providers)) {
    // NEW: Validate provider name (prevent name injection)
    if (!isValidName(name)) {
      errors.push(`Provider "${name}": name invalid (use alphanumeric, dash, underscore only, max 50 chars)`);
    }

    // NEW: Validate command (prevent command injection)
    if (!provider.command) {
      errors.push(`Provider ${name}: command is required`);
    } else if (!isValidCommand(provider.command)) {
      errors.push(`Provider ${name}: command invalid (alphanumeric, dash, underscore only, max 100 chars, no shell metacharacters)`);
    }

    // Existing: Min validation + NEW: Max validation
    if (!isPositiveInteger(provider.priority)) {
      errors.push(`Provider ${name}: priority must be a positive integer`);
    }

    if (!isPositiveInteger(provider.timeout)) {
      errors.push(`Provider ${name}: timeout must be a positive integer`);
    } else {
      if (provider.timeout < VALIDATION_LIMITS.MIN_TIMEOUT) {
        errors.push(`Provider ${name}: timeout must be >= ${VALIDATION_LIMITS.MIN_TIMEOUT}ms`);
      }
      if (provider.timeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Provider ${name}: timeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms (1 hour max)`);
      }
    }

    if (provider.healthCheck) {
      if (!isPositiveInteger(provider.healthCheck.interval)) {
        errors.push(`Provider ${name}: healthCheck.interval must be a positive integer`);
      } else {
        if (provider.healthCheck.interval < VALIDATION_LIMITS.MIN_INTERVAL) {
          errors.push(`Provider ${name}: healthCheck.interval must be >= ${VALIDATION_LIMITS.MIN_INTERVAL}ms`);
        }
        if (provider.healthCheck.interval > VALIDATION_LIMITS.MAX_TIMEOUT) {
          errors.push(`Provider ${name}: healthCheck.interval must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
        }
      }

      if (!isPositiveInteger(provider.healthCheck.timeout)) {
        errors.push(`Provider ${name}: healthCheck.timeout must be a positive integer`);
      } else {
        if (provider.healthCheck.timeout < 100) {
          errors.push(`Provider ${name}: healthCheck.timeout must be >= 100ms`);
        }
        if (provider.healthCheck.timeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
          errors.push(`Provider ${name}: healthCheck.timeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
        }
      }
    }
  }

  // Validate execution
  if (config.execution) {
    // defaultTimeout
    if (!isPositiveInteger(config.execution.defaultTimeout)) {
      errors.push('Execution: defaultTimeout must be a positive integer');
    } else {
      if (config.execution.defaultTimeout < VALIDATION_LIMITS.MIN_TIMEOUT) {
        errors.push(`Execution: defaultTimeout must be >= ${VALIDATION_LIMITS.MIN_TIMEOUT}ms`);
      }
      if (config.execution.defaultTimeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Execution: defaultTimeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms (1 hour max)`);
      }
    }

    // retry.maxAttempts
    if (!isPositiveInteger(config.execution.retry.maxAttempts)) {
      errors.push('Execution: retry.maxAttempts must be a positive integer');
    } else if (config.execution.retry.maxAttempts > 10) {
      errors.push('Execution: retry.maxAttempts must be <= 10 (reasonable retry limit)');
    }

    // retry.initialDelay
    if (!isNonNegativeInteger(config.execution.retry.initialDelay)) {
      errors.push('Execution: retry.initialDelay must be a non-negative integer');
    } else if (config.execution.retry.initialDelay > VALIDATION_LIMITS.MAX_TIMEOUT) {
      errors.push(`Execution: retry.initialDelay must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
    }

    // retry.maxDelay
    if (!isPositiveInteger(config.execution.retry.maxDelay)) {
      errors.push('Execution: retry.maxDelay must be a positive integer');
    } else {
      if (config.execution.retry.maxDelay < config.execution.retry.initialDelay) {
        errors.push('Execution: retry.maxDelay must be >= initialDelay');
      }
      if (config.execution.retry.maxDelay > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Execution: retry.maxDelay must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
      }
    }

    // retry.backoffFactor
    if (typeof config.execution.retry.backoffFactor !== 'number' || config.execution.retry.backoffFactor < VALIDATION_LIMITS.MIN_BACKOFF_FACTOR) {
      errors.push(`Execution: retry.backoffFactor must be >= ${VALIDATION_LIMITS.MIN_BACKOFF_FACTOR}`);
    } else if (config.execution.retry.backoffFactor > VALIDATION_LIMITS.MAX_BACKOFF_FACTOR) {
      errors.push(`Execution: retry.backoffFactor must be <= ${VALIDATION_LIMITS.MAX_BACKOFF_FACTOR}`);
    }

    // provider.maxWaitMs
    if (!isPositiveInteger(config.execution.provider.maxWaitMs)) {
      errors.push('Execution: provider.maxWaitMs must be a positive integer');
    } else {
      if (config.execution.provider.maxWaitMs < VALIDATION_LIMITS.MIN_TIMEOUT) {
        errors.push(`Execution: provider.maxWaitMs must be >= ${VALIDATION_LIMITS.MIN_TIMEOUT}ms`);
      }
      if (config.execution.provider.maxWaitMs > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Execution: provider.maxWaitMs must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
      }
    }
  }

  // Validate orchestration
  if (config.orchestration) {
    // session.maxSessions
    if (!isPositiveInteger(config.orchestration.session.maxSessions)) {
      errors.push('Orchestration: session.maxSessions must be a positive integer');
    } else {
      if (config.orchestration.session.maxSessions > VALIDATION_LIMITS.MAX_SESSIONS) {
        errors.push(`Orchestration: session.maxSessions must be <= ${VALIDATION_LIMITS.MAX_SESSIONS}`);
      }
    }

    // session.maxMetadataSize
    if (!isPositiveInteger(config.orchestration.session.maxMetadataSize)) {
      errors.push('Orchestration: session.maxMetadataSize must be a positive integer');
    } else {
      if (config.orchestration.session.maxMetadataSize < VALIDATION_LIMITS.MIN_BYTES) {
        errors.push(`Orchestration: session.maxMetadataSize must be >= ${VALIDATION_LIMITS.MIN_BYTES} bytes`);
      }
      if (config.orchestration.session.maxMetadataSize > VALIDATION_LIMITS.MAX_FILE_SIZE) {
        errors.push(`Orchestration: session.maxMetadataSize must be <= ${VALIDATION_LIMITS.MAX_FILE_SIZE} bytes`);
      }
    }

    // session.saveDebounce
    if (!isNonNegativeInteger(config.orchestration.session.saveDebounce)) {
      errors.push('Orchestration: session.saveDebounce must be a non-negative integer');
    } else if (config.orchestration.session.saveDebounce > VALIDATION_LIMITS.MAX_TIMEOUT) {
      errors.push(`Orchestration: session.saveDebounce must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
    }

    // session.cleanupAfterDays
    if (!isPositiveInteger(config.orchestration.session.cleanupAfterDays)) {
      errors.push('Orchestration: session.cleanupAfterDays must be a positive integer');
    } else if (config.orchestration.session.cleanupAfterDays > 365) {
      errors.push('Orchestration: session.cleanupAfterDays must be <= 365 days');
    }

    // session.maxUuidAttempts
    if (!isPositiveInteger(config.orchestration.session.maxUuidAttempts)) {
      errors.push('Orchestration: session.maxUuidAttempts must be a positive integer');
    } else if (config.orchestration.session.maxUuidAttempts > 1000) {
      errors.push('Orchestration: session.maxUuidAttempts must be <= 1000');
    }

    // delegation.maxDepth
    if (!isPositiveInteger(config.orchestration.delegation.maxDepth)) {
      errors.push('Orchestration: delegation.maxDepth must be a positive integer');
    } else if (config.orchestration.delegation.maxDepth > 5) {
      errors.push('Orchestration: delegation.maxDepth must be <= 5 (prevent deep chains)');
    }

    // delegation.timeout
    if (!isPositiveInteger(config.orchestration.delegation.timeout)) {
      errors.push('Orchestration: delegation.timeout must be a positive integer');
    } else {
      if (config.orchestration.delegation.timeout < VALIDATION_LIMITS.MIN_TIMEOUT) {
        errors.push(`Orchestration: delegation.timeout must be >= ${VALIDATION_LIMITS.MIN_TIMEOUT}ms`);
      }
      if (config.orchestration.delegation.timeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Orchestration: delegation.timeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
      }
    }

    // workspace.maxFileSize
    if (!isPositiveInteger(config.orchestration.workspace.maxFileSize)) {
      errors.push('Orchestration: workspace.maxFileSize must be a positive integer');
    } else {
      if (config.orchestration.workspace.maxFileSize < VALIDATION_LIMITS.MIN_FILE_SIZE) {
        errors.push(`Orchestration: workspace.maxFileSize must be >= ${VALIDATION_LIMITS.MIN_FILE_SIZE} bytes`);
      }
      if (config.orchestration.workspace.maxFileSize > VALIDATION_LIMITS.MAX_FILE_SIZE) {
        errors.push(`Orchestration: workspace.maxFileSize must be <= ${VALIDATION_LIMITS.MAX_FILE_SIZE} bytes (100MB max)`);
      }
    }

    // workspace.maxFiles
    if (!isPositiveInteger(config.orchestration.workspace.maxFiles)) {
      errors.push('Orchestration: workspace.maxFiles must be a positive integer');
    } else if (config.orchestration.workspace.maxFiles > 10000) {
      errors.push('Orchestration: workspace.maxFiles must be <= 10000');
    }

    // workspace.cleanupAfterDays
    if (!isPositiveInteger(config.orchestration.workspace.cleanupAfterDays)) {
      errors.push('Orchestration: workspace.cleanupAfterDays must be a positive integer');
    } else if (config.orchestration.workspace.cleanupAfterDays > 365) {
      errors.push('Orchestration: workspace.cleanupAfterDays must be <= 365 days');
    }
  }

  // Validate memory
  if (!isPositiveInteger(config.memory.maxEntries)) {
    errors.push('Memory: maxEntries must be a positive integer');
  } else {
    if (config.memory.maxEntries > VALIDATION_LIMITS.MAX_ENTRIES) {
      errors.push(`Memory: maxEntries must be <= ${VALIDATION_LIMITS.MAX_ENTRIES} (1 million max)`);
    }
  }

  if (!isPositiveInteger(config.memory.cleanupDays)) {
    errors.push('Memory: cleanupDays must be a positive integer');
  } else if (config.memory.cleanupDays > 365) {
    errors.push('Memory: cleanupDays must be <= 365 days');
  }

  if (config.memory.search) {
    if (!isPositiveInteger(config.memory.search.defaultLimit)) {
      errors.push('Memory: search.defaultLimit must be a positive integer');
    } else if (config.memory.search.defaultLimit > 1000) {
      errors.push('Memory: search.defaultLimit must be <= 1000');
    }

    if (!isPositiveInteger(config.memory.search.maxLimit)) {
      errors.push('Memory: search.maxLimit must be a positive integer');
    } else {
      if (config.memory.search.maxLimit < config.memory.search.defaultLimit) {
        errors.push('Memory: search.maxLimit must be >= defaultLimit');
      }
      if (config.memory.search.maxLimit > 10000) {
        errors.push('Memory: search.maxLimit must be <= 10000');
      }
    }

    if (!isPositiveInteger(config.memory.search.timeout)) {
      errors.push('Memory: search.timeout must be a positive integer');
    } else {
      if (config.memory.search.timeout < 100) {
        errors.push('Memory: search.timeout must be >= 100ms');
      }
      if (config.memory.search.timeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
        errors.push(`Memory: search.timeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
      }
    }
  }

  // Validate abilities
  if (config.abilities) {
    if (!isPositiveInteger(config.abilities.cache.maxEntries)) {
      errors.push('Abilities: cache.maxEntries must be a positive integer');
    } else if (config.abilities.cache.maxEntries > 1000) {
      errors.push('Abilities: cache.maxEntries must be <= 1000');
    }

    if (!isPositiveInteger(config.abilities.cache.ttl)) {
      errors.push('Abilities: cache.ttl must be a positive integer');
    } else {
      if (config.abilities.cache.ttl < VALIDATION_LIMITS.MIN_INTERVAL) {
        errors.push(`Abilities: cache.ttl must be >= ${VALIDATION_LIMITS.MIN_INTERVAL}ms`);
      }
      if (config.abilities.cache.ttl > VALIDATION_LIMITS.MAX_TTL) {
        errors.push(`Abilities: cache.ttl must be <= ${VALIDATION_LIMITS.MAX_TTL}ms (24 hours max)`);
      }
    }

    if (!isPositiveInteger(config.abilities.cache.maxSize)) {
      errors.push('Abilities: cache.maxSize must be a positive integer');
    } else {
      if (config.abilities.cache.maxSize < VALIDATION_LIMITS.MIN_BYTES) {
        errors.push(`Abilities: cache.maxSize must be >= ${VALIDATION_LIMITS.MIN_BYTES} bytes`);
      }
      if (config.abilities.cache.maxSize > VALIDATION_LIMITS.MAX_CACHE_SIZE) {
        errors.push(`Abilities: cache.maxSize must be <= ${VALIDATION_LIMITS.MAX_CACHE_SIZE} bytes (500MB max)`);
      }
    }

    if (!isPositiveInteger(config.abilities.limits.maxFileSize)) {
      errors.push('Abilities: limits.maxFileSize must be a positive integer');
    } else {
      if (config.abilities.limits.maxFileSize < VALIDATION_LIMITS.MIN_FILE_SIZE) {
        errors.push(`Abilities: limits.maxFileSize must be >= ${VALIDATION_LIMITS.MIN_FILE_SIZE} bytes`);
      }
      if (config.abilities.limits.maxFileSize > VALIDATION_LIMITS.MAX_FILE_SIZE) {
        errors.push(`Abilities: limits.maxFileSize must be <= ${VALIDATION_LIMITS.MAX_FILE_SIZE} bytes (100MB max)`);
      }
    }
  }

  // Validate workspace (legacy)
  if (!isPositiveInteger(config.workspace.cleanupDays)) {
    errors.push('Workspace: cleanupDays must be a positive integer');
  } else if (config.workspace.cleanupDays > 365) {
    errors.push('Workspace: cleanupDays must be <= 365 days');
  }

  if (!isPositiveInteger(config.workspace.maxFiles)) {
    errors.push('Workspace: maxFiles must be a positive integer');
  } else if (config.workspace.maxFiles > 10000) {
    errors.push('Workspace: maxFiles must be <= 10000');
  }

  // Validate logging
  if (config.logging?.retention) {
    if (!isPositiveInteger(config.logging.retention.maxSizeBytes)) {
      errors.push('Logging: retention.maxSizeBytes must be a positive integer');
    } else {
      if (config.logging.retention.maxSizeBytes < VALIDATION_LIMITS.MIN_BYTES) {
        errors.push(`Logging: retention.maxSizeBytes must be >= ${VALIDATION_LIMITS.MIN_BYTES} bytes`);
      }
      if (config.logging.retention.maxSizeBytes > VALIDATION_LIMITS.MAX_FILE_SIZE * 10) {
        errors.push('Logging: retention.maxSizeBytes must be <= 1GB');
      }
    }

    if (!isPositiveInteger(config.logging.retention.maxAgeDays)) {
      errors.push('Logging: retention.maxAgeDays must be a positive integer');
    } else if (config.logging.retention.maxAgeDays > 365) {
      errors.push('Logging: retention.maxAgeDays must be <= 365 days');
    }
  }

  // Validate performance
  if (config.performance) {
    const validateCache = (name: string, cache: any) => {
      if (!isPositiveInteger(cache.maxEntries)) {
        errors.push(`Performance: ${name}.maxEntries must be a positive integer`);
      } else if (cache.maxEntries > 10000) {
        errors.push(`Performance: ${name}.maxEntries must be <= 10000`);
      }

      if (!isPositiveInteger(cache.ttl)) {
        errors.push(`Performance: ${name}.ttl must be a positive integer`);
      } else {
        if (cache.ttl < VALIDATION_LIMITS.MIN_INTERVAL) {
          errors.push(`Performance: ${name}.ttl must be >= ${VALIDATION_LIMITS.MIN_INTERVAL}ms`);
        }
        if (cache.ttl > VALIDATION_LIMITS.MAX_TTL) {
          errors.push(`Performance: ${name}.ttl must be <= ${VALIDATION_LIMITS.MAX_TTL}ms (24 hours max)`);
        }
      }

      if (!isPositiveInteger(cache.cleanupInterval)) {
        errors.push(`Performance: ${name}.cleanupInterval must be a positive integer`);
      } else {
        if (cache.cleanupInterval < VALIDATION_LIMITS.MIN_INTERVAL) {
          errors.push(`Performance: ${name}.cleanupInterval must be >= ${VALIDATION_LIMITS.MIN_INTERVAL}ms`);
        }
        if (cache.cleanupInterval > VALIDATION_LIMITS.MAX_TIMEOUT) {
          errors.push(`Performance: ${name}.cleanupInterval must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
        }
      }
    };

    validateCache('profileCache', config.performance.profileCache);
    validateCache('teamCache', config.performance.teamCache);
    validateCache('providerCache', config.performance.providerCache);

    if (config.performance.rateLimit.enabled) {
      if (!isPositiveInteger(config.performance.rateLimit.requestsPerMinute)) {
        errors.push('Performance: rateLimit.requestsPerMinute must be a positive integer');
      } else if (config.performance.rateLimit.requestsPerMinute > 1000) {
        errors.push('Performance: rateLimit.requestsPerMinute must be <= 1000');
      }

      if (!isPositiveInteger(config.performance.rateLimit.burstSize)) {
        errors.push('Performance: rateLimit.burstSize must be a positive integer');
      } else if (config.performance.rateLimit.burstSize > 100) {
        errors.push('Performance: rateLimit.burstSize must be <= 100');
      }
    }
  }

  // Validate advanced
  if (config.advanced) {
    if (config.advanced.embedding) {
      if (!isPositiveInteger(config.advanced.embedding.timeout)) {
        errors.push('Advanced: embedding.timeout must be a positive integer');
      } else {
        if (config.advanced.embedding.timeout < VALIDATION_LIMITS.MIN_TIMEOUT) {
          errors.push(`Advanced: embedding.timeout must be >= ${VALIDATION_LIMITS.MIN_TIMEOUT}ms`);
        }
        if (config.advanced.embedding.timeout > VALIDATION_LIMITS.MAX_TIMEOUT) {
          errors.push(`Advanced: embedding.timeout must be <= ${VALIDATION_LIMITS.MAX_TIMEOUT}ms`);
        }
      }

      if (!isPositiveInteger(config.advanced.embedding.dimensions)) {
        errors.push('Advanced: embedding.dimensions must be a positive integer');
      } else if (config.advanced.embedding.dimensions > 10000) {
        errors.push('Advanced: embedding.dimensions must be <= 10000');
      }

      if (!isNonNegativeInteger(config.advanced.embedding.maxRetries)) {
        errors.push('Advanced: embedding.maxRetries must be a non-negative integer');
      } else if (config.advanced.embedding.maxRetries > 10) {
        errors.push('Advanced: embedding.maxRetries must be <= 10');
      }
    }
  }

  // Validate integration
  if (config.integration) {
    if (config.integration.vscode.enabled) {
      if (config.integration.vscode.apiPort < VALIDATION_LIMITS.MIN_PORT || config.integration.vscode.apiPort > VALIDATION_LIMITS.MAX_PORT) {
        errors.push(`Integration: vscode.apiPort must be between ${VALIDATION_LIMITS.MIN_PORT} and ${VALIDATION_LIMITS.MAX_PORT}`);
      }
    }
  }

  // NEW: Validate all path fields (prevent path traversal)
  const pathFields = [
    { name: 'Memory: persistPath', value: config.memory.persistPath },
    { name: 'Logging: path', value: config.logging.path },
    { name: 'Abilities: basePath', value: config.abilities?.basePath },
    { name: 'Abilities: fallbackPath', value: config.abilities?.fallbackPath },
    { name: 'Orchestration: session.persistPath', value: config.orchestration?.session.persistPath },
    { name: 'Orchestration: workspace.basePath', value: config.orchestration?.workspace.basePath },
    { name: 'Workspace: basePath', value: config.workspace.basePath }
  ];

  for (const { name, value } of pathFields) {
    if (value && typeof value === 'string' && !isValidRelativePath(value)) {
      errors.push(`${name} must be a relative path within project (no ../, no absolute paths)`);
    }
  }

  // NEW: Validate security.allowedExtensions
  if (config.advanced?.security?.allowedExtensions) {
    if (!Array.isArray(config.advanced.security.allowedExtensions)) {
      errors.push('Security: allowedExtensions must be an array');
    } else {
      if (config.advanced.security.allowedExtensions.length > VALIDATION_LIMITS.MAX_ARRAY_LENGTH) {
        errors.push(`Security: allowedExtensions too many items (max ${VALIDATION_LIMITS.MAX_ARRAY_LENGTH})`);
      }

      for (const ext of config.advanced.security.allowedExtensions) {
        if (typeof ext !== 'string') {
          errors.push(`Security: allowedExtensions must contain only strings`);
          break;
        }
        if (!isValidExtension(ext)) {
          errors.push(`Security: invalid extension "${ext}" (must be alphanumeric with leading dot, max 10 chars)`);
        }
      }
    }
  }

  // NEW: Validate execution.retry.retryableErrors (type and length)
  if (config.execution?.retry?.retryableErrors) {
    if (!Array.isArray(config.execution.retry.retryableErrors)) {
      errors.push('Execution: retry.retryableErrors must be an array');
    } else if (config.execution.retry.retryableErrors.length > VALIDATION_LIMITS.MAX_ARRAY_LENGTH) {
      errors.push(`Execution: retry.retryableErrors too many items (max ${VALIDATION_LIMITS.MAX_ARRAY_LENGTH})`);
    }
  }

  return errors;
}

/**
 * Save configuration to file (supports both YAML and JSON)
 *
 * Format is auto-detected from file extension:
 * - .yaml or .yml → YAML format
 * - .json or other → JSON format
 *
 * @param path - Path to config file
 * @param config - Configuration object to save
 *
 * @throws {ConfigError} If validation fails or write fails
 */
export async function saveConfigFile(
  path: string,
  config: AutomatosXConfig
): Promise<void> {
  try {
    // Validate config before saving
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      throw ConfigError.invalid(
        validationErrors.join('; '),
        { path, errors: validationErrors }
      );
    }

    const ext = extname(path).toLowerCase();
    let content: string;

    if (ext === '.yaml' || ext === '.yml') {
      // Serialize to YAML with comments
      content = dumpYaml(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
    } else {
      // Serialize to JSON with indentation
      content = JSON.stringify(config, null, 2);
    }

    // Write to file
    await writeFile(path, content, 'utf-8');

    logger.info('Config saved successfully', { path, format: ext });
  } catch (error) {
    // Re-throw ConfigError as-is
    if (error instanceof ConfigError) {
      throw error;
    }

    // Handle file system errors
    if ((error as any).code === 'EACCES') {
      throw new ConfigError(
        `Permission denied writing config: ${path}`,
        ErrorCode.CONFIG_PARSE_ERROR,
        [
          'Check file permissions',
          'Run with appropriate user privileges',
          'Verify the directory is writable'
        ],
        { path, error: (error as Error).message }
      );
    }

    // Unknown error
    throw new ConfigError(
      `Failed to save config: ${(error as Error).message}`,
      ErrorCode.CONFIG_PARSE_ERROR,
      ['Check file path and permissions'],
      { path, originalError: (error as Error).message }
    );
  }
}
