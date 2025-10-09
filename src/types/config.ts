/**
 * Configuration types
 */

import type { LogLevel } from './logger.js';

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  command: string;
}

export interface MemoryConfig {
  maxEntries: number;
  persistPath: string;
  autoCleanup: boolean;
  cleanupDays: number;
}

export interface WorkspaceConfig {
  basePath: string;
  autoCleanup: boolean;
  cleanupDays: number;
  maxFiles: number;
}

export interface LoggingConfig {
  level: LogLevel;
  path: string;
  console: boolean;
}

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
}

export interface AutomatosXConfig {
  $schema?: string;
  version?: string;
  providers: Record<string, ProviderConfig>;
  memory: MemoryConfig;
  workspace: WorkspaceConfig;
  logging: LoggingConfig;
  openai?: OpenAIConfig;
}

export const DEFAULT_CONFIG: AutomatosXConfig = {
  providers: {
    'claude-code': {
      enabled: true,
      priority: 3,
      timeout: 900000,
      command: 'claude'
    },
    'gemini-cli': {
      enabled: true,
      priority: 2,
      timeout: 900000,
      command: 'gemini'
    },
    'openai': {
      enabled: true,
      priority: 1,
      timeout: 900000,
      command: 'codex'
    }
  },
  memory: {
    maxEntries: 10000,
    persistPath: '.automatosx/memory',
    autoCleanup: true,
    cleanupDays: 30
  },
  workspace: {
    basePath: '.automatosx/workspaces',
    autoCleanup: true,
    cleanupDays: 7,
    maxFiles: 100
  },
  logging: {
    level: 'info',
    path: '.automatosx/logs',
    console: true
  }
};
