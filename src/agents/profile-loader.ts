/**
 * Profile Loader - Load and validate agent profiles from YAML
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { load } from 'js-yaml';
import type { AgentProfile } from '../types/agent.js';
import { AgentValidationError, AgentNotFoundError } from '../types/agent.js';
import { logger } from '../utils/logger.js';
import { TTLCache } from '../core/cache.js';

/**
 * Profile Loader - Load and validate agent profiles
 */
export class ProfileLoader {
  private profilesDir: string;
  private cache: TTLCache<AgentProfile>;
  private displayNameMap: Map<string, string> = new Map();
  private mapInitialized: boolean = false;

  constructor(profilesDir: string) {
    this.profilesDir = profilesDir;
    // Use TTLCache with 5 minute TTL for profile caching
    this.cache = new TTLCache<AgentProfile>({
      maxEntries: 20,
      ttl: 300000, // 5 minutes
      cleanupInterval: 60000, // Cleanup every minute
      debug: false
    });
  }

  /**
   * Build displayName → name mapping table
   * This is called lazily on first agent lookup
   */
  private async buildDisplayNameMap(): Promise<void> {
    if (this.mapInitialized) {
      return;
    }

    logger.debug('Building displayName mapping table');
    this.displayNameMap.clear();

    try {
      const profiles = await this.listProfiles();

      for (const name of profiles) {
        try {
          const profile = await this.loadProfile(name);
          if (profile.displayName) {
            // Store case-insensitive mapping
            this.displayNameMap.set(profile.displayName.toLowerCase(), name);
            logger.debug('Mapped displayName to agent', {
              displayName: profile.displayName,
              name
            });
          }
        } catch (error) {
          // Skip profiles that fail to load
          logger.warn('Failed to load profile for mapping', { name, error });
        }
      }

      this.mapInitialized = true;
      logger.info('DisplayName mapping built', {
        mappings: this.displayNameMap.size
      });
    } catch (error) {
      logger.error('Failed to build displayName mapping', { error });
      // Don't throw - allow fallback to direct name lookup
    }
  }

  /**
   * Resolve agent identifier (name or displayName) to actual profile name
   */
  async resolveAgentName(identifier: string): Promise<string> {
    // Build map on first use
    await this.buildDisplayNameMap();

    // Try case-insensitive displayName lookup
    const resolved = this.displayNameMap.get(identifier.toLowerCase());
    if (resolved) {
      logger.debug('Resolved displayName to agent name', {
        displayName: identifier,
        name: resolved
      });
      return resolved;
    }

    // Return as-is (assume it's a direct profile name)
    logger.debug('Using identifier as profile name', { identifier });
    return identifier;
  }

  /**
   * Load a specific agent profile
   */
  async loadProfile(name: string): Promise<AgentProfile> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached) {
      logger.debug('Profile loaded from cache', { name });
      return cached;
    }

    // Load from file
    const profilePath = this.getProfilePath(name);

    try {
      const content = await readFile(profilePath, 'utf-8');

      // Security: Limit file size to prevent DoS (max 100KB for profile)
      if (content.length > 100 * 1024) {
        throw new AgentValidationError('Profile file too large (max 100KB)');
      }

      // Security: Use safe YAML parsing (default safe schema)
      // Note: js-yaml's load() already uses safe schema by default
      const data = load(content) as any;

      // Validate and build profile
      const profile = this.buildProfile(data, name);

      // Cache it
      this.cache.set(name, profile);

      logger.info('Profile loaded', { name, path: profilePath });
      return profile;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AgentNotFoundError(name);
      }
      throw error;
    }
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<string[]> {
    try {
      const files = await readdir(this.profilesDir);

      const profiles = files
        .filter(file => extname(file) === '.yaml' || extname(file) === '.yml')
        .map(file => basename(file, extname(file)));

      return profiles.sort();

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Validate profile structure
   */
  validateProfile(profile: AgentProfile): boolean {
    const required = ['name', 'role', 'description', 'systemPrompt'];

    for (const field of required) {
      if (!profile[field as keyof AgentProfile]) {
        throw new AgentValidationError(`Missing required field: ${field}`);
      }
    }

    // Validate types
    if (typeof profile.name !== 'string') {
      throw new AgentValidationError('name must be a string');
    }

    if (typeof profile.role !== 'string') {
      throw new AgentValidationError('role must be a string');
    }

    if (typeof profile.description !== 'string') {
      throw new AgentValidationError('description must be a string');
    }

    if (typeof profile.systemPrompt !== 'string') {
      throw new AgentValidationError('systemPrompt must be a string');
    }

    // Validate optional fields
    if (profile.abilities && !Array.isArray(profile.abilities)) {
      throw new AgentValidationError('abilities must be an array');
    }

    if (profile.temperature !== undefined) {
      if (typeof profile.temperature !== 'number' || profile.temperature < 0 || profile.temperature > 1) {
        throw new AgentValidationError('temperature must be a number between 0 and 1');
      }
    }

    if (profile.maxTokens !== undefined) {
      if (typeof profile.maxTokens !== 'number' || profile.maxTokens < 1) {
        throw new AgentValidationError('maxTokens must be a positive number');
      }
    }

    return true;
  }

  /**
   * Get profile path (with path traversal protection)
   */
  getProfilePath(name: string): string {
    // Security: Prevent path traversal attacks
    // Only allow alphanumeric, dash, underscore in profile names
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new AgentValidationError(`Invalid profile name: ${name}. Only alphanumeric characters, dashes, and underscores are allowed.`);
    }

    // Try .yaml first, then .yml
    return join(this.profilesDir, `${name}.yaml`);
  }

  /**
   * Clear cache and displayName mapping
   */
  clearCache(): void {
    this.cache.clear();
    this.displayNameMap.clear();
    this.mapInitialized = false;
    logger.debug('Cache and displayName mapping cleared');
  }

  /**
   * Build profile from raw data with defaults
   */
  private buildProfile(data: any, name: string): AgentProfile {
    const profile: AgentProfile = {
      name: data.name || name,
      displayName: data.displayName,
      role: data.role,
      description: data.description,
      systemPrompt: data.systemPrompt,
      abilities: data.abilities || [],
      provider: data.provider,
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      tags: data.tags,
      version: data.version
    };

    // Validate
    this.validateProfile(profile);

    return profile;
  }
}
