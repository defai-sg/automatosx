/**
 * Configuration types for AutomatosX v5.0+
 *
 * Complete configuration system with YAML support.
 * All hardcoded values moved to configuration.
 */

import type { LogLevel } from './logger.js';

// ========================================
// Provider Configuration
// ========================================

export interface ProviderHealthCheckConfig {
  enabled: boolean;
  interval: number;  // milliseconds
  timeout: number;   // milliseconds
}

/**
 * Provider default model parameters (v5.0+)
 */
export interface ProviderDefaultsConfig {
  maxTokens?: number;      // Default max output tokens
  temperature?: number;    // Default temperature (0-1)
  topP?: number;           // Default top_p (0-1)
}

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  command: string;
  healthCheck?: ProviderHealthCheckConfig;
  defaults?: ProviderDefaultsConfig;  // v5.0: Default model parameters
}

// ========================================
// Execution Configuration
// ========================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;      // milliseconds
  maxDelay: number;          // milliseconds
  backoffFactor: number;     // exponential backoff multiplier
  retryableErrors?: string[]; // error codes/messages that trigger retry (optional, has defaults)
}

export interface ExecutionProviderConfig {
  maxWaitMs: number;      // max wait time for provider response
  fallbackDelay?: number; // v5.0: delay before trying fallback provider (ms)
}

export interface ExecutionConfig {
  defaultTimeout: number;  // default execution timeout (ms)
  retry: RetryConfig;
  provider: ExecutionProviderConfig;
}

// ========================================
// Orchestration Configuration
// ========================================

export interface SessionConfig {
  maxSessions: number;         // max sessions in memory
  maxMetadataSize: number;     // max metadata size (bytes)
  saveDebounce: number;        // save debounce delay (ms)
  cleanupAfterDays: number;    // cleanup old sessions after N days
  maxUuidAttempts: number;     // max UUID generation attempts
  persistPath: string;         // session persistence path
}

export interface DelegationConfig {
  maxDepth: number;            // max delegation chain depth
  timeout: number;             // delegation timeout (ms)
  enableCycleDetection: boolean;
}

/**
 * Workspace System Configuration (v5.2.0 - Simplified)
 *
 * Manages automatosx/ directory structure:
 * - PRD/: Planning documents (permanent)
 * - tmp/: Temporary files (auto-cleanup)
 */
// v5.2: WorkspaceSystemConfig removed - workspace moved to root level
// Use WorkspaceConfig instead (defined below in Legacy section)

export interface OrchestrationConfigSystem {
  session: SessionConfig;
  delegation: DelegationConfig;
  // v5.2: workspace moved to root level of AutomatosXConfig
}

// ========================================
// Memory Configuration
// ========================================

export interface MemorySearchConfig {
  defaultLimit: number;  // default search result limit
  maxLimit: number;      // max search result limit
  timeout: number;       // search timeout (ms)
}

export interface MemoryConfig {
  maxEntries: number;
  persistPath: string;
  autoCleanup: boolean;
  cleanupDays: number;
  search?: MemorySearchConfig;  // Optional for backward compatibility
}

// ========================================
// Abilities Configuration
// ========================================

export interface AbilitiesCacheConfig {
  enabled: boolean;
  maxEntries: number;
  ttl: number;           // time to live (ms)
  maxSize: number;       // max cache size (bytes)
  cleanupInterval: number; // cleanup interval (ms)
}

export interface AbilitiesLimitsConfig {
  maxFileSize: number;   // max ability file size (bytes)
}

export interface AbilitiesConfig {
  basePath: string;
  fallbackPath: string;
  cache: AbilitiesCacheConfig;
  limits: AbilitiesLimitsConfig;
}

// ========================================
// Logging Configuration
// ========================================

export interface LoggingRetentionConfig {
  maxSizeBytes: number;
  maxAgeDays: number;
  compress: boolean;
}

export interface LoggingConfig {
  level: LogLevel;
  path: string;
  console: boolean;
  retention?: LoggingRetentionConfig;  // Optional for backward compatibility
}

// ========================================
// Performance Configuration
// ========================================

export interface CacheConfig {
  enabled: boolean;
  maxEntries: number;
  ttl: number;           // time to live (ms)
  cleanupInterval: number; // cleanup interval (ms)
}

export interface ProfileCacheConfig extends CacheConfig {}

export interface TeamCacheConfig extends CacheConfig {}

export interface ProviderCacheConfig extends CacheConfig {}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstSize: number;
}

export interface PerformanceConfig {
  profileCache: ProfileCacheConfig;
  teamCache: TeamCacheConfig;
  providerCache: ProviderCacheConfig;
  rateLimit: RateLimitConfig;
}

// ========================================
// Advanced Configuration
// ========================================

export interface EmbeddingConfig {
  timeout: number;
  retryDelay: number;
  dimensions: number;
  maxRetries: number;
}

export interface SecurityConfig {
  enablePathValidation: boolean;
  allowedExtensions: string[];
}

export interface DevelopmentConfig {
  mockProviders: boolean;
  profileMode: boolean;
}

export interface AdvancedConfig {
  embedding?: EmbeddingConfig;
  security: SecurityConfig;
  development: DevelopmentConfig;
}

// ========================================
// Integration Configuration (v5.5+ VS Code)
// ========================================

export interface VSCodeIntegrationConfig {
  enabled: boolean;
  apiPort: number;
  autoStart: boolean;
  outputPanel: boolean;
  notifications: boolean;
}

export interface IntegrationConfig {
  vscode: VSCodeIntegrationConfig;
}

// ========================================
// CLI Configuration (Optional)
// ========================================

export interface CLIRunConfig {
  defaultMemory: boolean;
  defaultSaveMemory: boolean;
  defaultFormat: 'text' | 'json' | 'markdown';
  defaultVerbose: boolean;
}

export interface CLISessionConfig {
  defaultShowAgents: boolean;
}

export interface CLIMemoryConfig {
  defaultLimit: number;
}

export interface CLIConfig {
  run: CLIRunConfig;
  session: CLISessionConfig;
  memory: CLIMemoryConfig;
}

// ========================================
// Legacy (for backward compatibility)
// ========================================

export interface WorkspaceConfig {
  prdPath: string;        // v5.2: Path to PRD directory
  tmpPath: string;        // v5.2: Path to tmp directory
  autoCleanupTmp: boolean;  // v5.2: Auto-cleanup temporary files
  tmpCleanupDays: number;   // v5.2: Cleanup tmp files older than N days
}

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
}

// ========================================
// Main Configuration
// ========================================

export interface AutomatosXConfig {
  $schema?: string;
  version?: string;
  providers: Record<string, ProviderConfig>;
  execution?: ExecutionConfig;
  orchestration?: OrchestrationConfigSystem;
  memory: MemoryConfig;
  abilities?: AbilitiesConfig;
  workspace: WorkspaceConfig;  // legacy, kept for backward compatibility
  logging: LoggingConfig;
  performance?: PerformanceConfig;
  advanced?: AdvancedConfig;
  integration?: IntegrationConfig;
  cli?: CLIConfig;
  openai?: OpenAIConfig;  // legacy
}

// ========================================
// Default Configuration
// ========================================

export const DEFAULT_CONFIG: AutomatosXConfig = {
  providers: {
    'claude-code': {
      enabled: true,
      priority: 3,
      timeout: 1500000,  // 25 minutes (v5.1.0: increased from 15 min based on user feedback)
      command: 'claude',
      healthCheck: {
        enabled: true,
        interval: 300000,  // 5 minutes (v5.0: reduced frequency from 1 min)
        timeout: 5000      // 5 seconds
      }
      // v5.0.5: Removed defaults - let provider CLI use optimal defaults
      // Users can still set provider.defaults in config for specific needs
    },
    'gemini-cli': {
      enabled: true,
      priority: 2,
      timeout: 1500000,  // 25 minutes (v5.1.0: increased from 15 min based on user feedback)
      command: 'gemini',
      healthCheck: {
        enabled: true,
        interval: 300000,  // 5 minutes (v5.0: reduced frequency)
        timeout: 5000
      }
      // v5.0.5: Removed defaults - let provider CLI use optimal defaults
    },
    'openai': {
      enabled: true,
      priority: 1,
      timeout: 1500000,  // 25 minutes (v5.1.0: increased from 15 min based on user feedback)
      command: 'codex',
      healthCheck: {
        enabled: true,
        interval: 300000,  // 5 minutes (v5.0: reduced frequency)
        timeout: 5000
      }
      // v5.0.5: Removed defaults - let provider CLI use optimal defaults
    }
  },

  execution: {
    defaultTimeout: 1500000,  // 25 minutes (v5.1.0: increased from 15 min based on user feedback)
    retry: {
      maxAttempts: 3,
      initialDelay: 1000,    // 1 second
      maxDelay: 10000,       // 10 seconds
      backoffFactor: 2,
      retryableErrors: [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate_limit',
        'overloaded',
        'timeout'
      ]
    },
    provider: {
      maxWaitMs: 60000,      // 1 minute
      fallbackDelay: 5000    // v5.0: Wait 5s before trying fallback provider
    }
  },

  orchestration: {
    session: {
      maxSessions: 100,
      maxMetadataSize: 10240,     // 10 KB
      saveDebounce: 1000,         // 1 second (v5.0: increased from 100ms to reduce I/O)
      cleanupAfterDays: 7,
      maxUuidAttempts: 100,
      persistPath: '.automatosx/sessions'
    },
    delegation: {
      maxDepth: 2,
      timeout: 1500000,  // 25 minutes (v5.1.0: increased from 15 min based on user feedback)
      enableCycleDetection: true
    }
    // v5.2: workspace moved to root level
  },

  memory: {
    maxEntries: 10000,
    persistPath: '.automatosx/memory',
    autoCleanup: true,
    cleanupDays: 30,
    search: {
      defaultLimit: 10,
      maxLimit: 100,
      timeout: 5000  // 5 seconds
    }
  },

  abilities: {
    basePath: '.automatosx/abilities',
    fallbackPath: 'examples/abilities',
    cache: {
      enabled: true,
      maxEntries: 50,
      ttl: 600000,         // 10 minutes
      maxSize: 5242880,    // 5 MB
      cleanupInterval: 120000  // 2 minutes
    },
    limits: {
      maxFileSize: 524288  // 500 KB
    }
  },

  workspace: {
    prdPath: 'automatosx/PRD',
    tmpPath: 'automatosx/tmp',
    autoCleanupTmp: true,
    tmpCleanupDays: 7
  },

  logging: {
    level: 'info',
    path: '.automatosx/logs',
    console: true,
    retention: {
      maxSizeBytes: 104857600,  // 100 MB
      maxAgeDays: 30,
      compress: true
    }
  },

  performance: {
    profileCache: {
      enabled: true,
      maxEntries: 20,
      ttl: 600000,         // 10 minutes (v5.0: standardized from 5 min)
      cleanupInterval: 120000  // 2 minutes (v5.0: standardized)
    },
    teamCache: {
      enabled: true,
      maxEntries: 10,
      ttl: 600000,         // 10 minutes
      cleanupInterval: 120000  // 2 minutes
    },
    providerCache: {
      enabled: true,       // v5.0: enabled by default (safe for deterministic responses)
      maxEntries: 100,
      ttl: 600000,         // 10 minutes (v5.0: reduced from 1 hour)
      cleanupInterval: 120000  // 2 minutes (v5.0: standardized)
    },
    rateLimit: {
      enabled: false,      // Keep disabled by default (opt-in)
      requestsPerMinute: 60,
      burstSize: 10
    }
  },

  advanced: {
    embedding: {
      timeout: 30000,
      retryDelay: 1000,
      dimensions: 1536,
      maxRetries: 3
    },
    security: {
      enablePathValidation: true,
      allowedExtensions: [
        '.ts', '.js', '.tsx', '.jsx',
        '.py', '.go', '.rs', '.java',
        '.yaml', '.yml', '.json', '.toml',
        '.md', '.txt', '.csv'
      ]
    },
    development: {
      mockProviders: false,
      profileMode: false
    }
  },

  integration: {
    vscode: {
      enabled: false,  // v5.5+ will enable
      apiPort: 3000,
      autoStart: true,
      outputPanel: true,
      notifications: true
    }
  },

  cli: {
    run: {
      defaultMemory: true,
      defaultSaveMemory: true,
      defaultFormat: 'text',
      defaultVerbose: false
    },
    session: {
      defaultShowAgents: true
    },
    memory: {
      defaultLimit: 10
    }
  }
};
