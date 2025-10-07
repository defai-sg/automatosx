/**
 * Profile Loader - Load and validate agent profiles from YAML
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';
import type { AgentProfile } from '../types/agent.js';
import { AgentValidationError, AgentNotFoundError } from '../types/agent.js';
import { logger } from '../utils/logger.js';
import { TTLCache } from '../core/cache.js';

// Get the directory of this file for locating built-in agents
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get package root - handle both dev (src/) and prod (dist/) scenarios
function getPackageRoot(): string {
  // In production, __dirname will be dist/
  // In development, __dirname will be src/agents/
  const currentDir = __dirname;

  // If we're in dist/, go up one level to package root
  // If we're in src/agents/, go up two levels to package root
  if (currentDir.includes('/dist')) {
    return join(currentDir, '..');
  } else {
    return join(currentDir, '../..');
  }
}

/**
 * Profile Loader - Load and validate agent profiles
 */
export class ProfileLoader {
  private profilesDir: string;
  private fallbackProfilesDir: string;
  private cache: TTLCache<AgentProfile>;
  private displayNameMap: Map<string, string> = new Map();
  private mapInitialized: boolean = false;

  constructor(profilesDir: string, fallbackProfilesDir?: string) {
    this.profilesDir = profilesDir;
    // Default fallback to built-in examples/agents
    // This should work in both dev and production environments
    this.fallbackProfilesDir = fallbackProfilesDir || join(getPackageRoot(), 'examples/agents');
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
   * Optimized: Try direct load first, only build full mapping if needed
   */
  async resolveAgentName(identifier: string): Promise<string> {
    // Optimization: Try direct profile load first (most common case)
    // This avoids loading all profiles when using profile names directly
    try {
      await this.loadProfile(identifier);
      // If load succeeds, identifier is a valid profile name
      logger.debug('Using identifier as profile name (direct match)', { identifier });
      return identifier;
    } catch (error) {
      // Profile not found directly, might be a displayName
      // Only now build the displayName mapping if not already done
      if ((error as any).name === 'AgentNotFoundError') {
        logger.debug('Direct profile load failed, trying displayName lookup', { identifier });

        // Build map lazily if not already built
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

        // Still not found, throw the original error
        throw error;
      }

      // Other errors (validation, etc.) should be propagated
      throw error;
    }
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

    // Get possible paths (primary and fallback)
    const profilePaths = this.getProfilePath(name);

    // Try each path in order
    let lastError: Error | null = null;
    for (const profilePath of profilePaths) {
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
          // File not found, try next path
          lastError = error as Error;
          continue;
        }
        // Other errors should be thrown immediately
        throw error;
      }
    }

    // If we've tried all paths and none worked, throw AgentNotFoundError
    throw new AgentNotFoundError(name);
  }

  /**
   * List all available profiles
   */
  async listProfiles(): Promise<string[]> {
    const profileSet = new Set<string>();

    // Try to load from primary directory
    try {
      const files = await readdir(this.profilesDir);
      const profiles = files
        .filter(file => extname(file) === '.yaml' || extname(file) === '.yml')
        .map(file => basename(file, extname(file)));

      profiles.forEach(p => profileSet.add(p));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, will fallback to built-in agents
    }

    // Also load from fallback directory (built-in agents)
    try {
      const files = await readdir(this.fallbackProfilesDir);
      const profiles = files
        .filter(file => extname(file) === '.yaml' || extname(file) === '.yml')
        .map(file => basename(file, extname(file)));

      profiles.forEach(p => profileSet.add(p));
    } catch (error) {
      // Fallback directory doesn't exist - this is OK
      logger.debug('Fallback profiles directory not found', {
        dir: this.fallbackProfilesDir
      });
    }

    return Array.from(profileSet).sort();
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

    // Validate v4.1+ enhanced fields
    if (profile.stages !== undefined) {
      if (!Array.isArray(profile.stages)) {
        throw new AgentValidationError('stages must be an array');
      }

      profile.stages.forEach((stage, i) => {
        if (!stage.name || typeof stage.name !== 'string') {
          throw new AgentValidationError(`stages[${i}].name is required and must be a string`);
        }
        if (!stage.description || typeof stage.description !== 'string') {
          throw new AgentValidationError(`stages[${i}].description is required and must be a string`);
        }
        if (stage.key_questions !== undefined && !Array.isArray(stage.key_questions)) {
          throw new AgentValidationError(`stages[${i}].key_questions must be an array`);
        }
        if (stage.outputs !== undefined && !Array.isArray(stage.outputs)) {
          throw new AgentValidationError(`stages[${i}].outputs must be an array`);
        }
        if (stage.model !== undefined && typeof stage.model !== 'string') {
          throw new AgentValidationError(`stages[${i}].model must be a string`);
        }
        if (stage.temperature !== undefined) {
          if (typeof stage.temperature !== 'number' || stage.temperature < 0 || stage.temperature > 1) {
            throw new AgentValidationError(`stages[${i}].temperature must be a number between 0 and 1`);
          }
        }
      });
    }

    if (profile.personality !== undefined) {
      if (typeof profile.personality !== 'object' || profile.personality === null || Array.isArray(profile.personality)) {
        throw new AgentValidationError('personality must be an object');
      }
      // Validate personality fields if present
      const p = profile.personality;
      if (p.traits !== undefined && !Array.isArray(p.traits)) {
        throw new AgentValidationError('personality.traits must be an array');
      }
      if (p.catchphrase !== undefined && typeof p.catchphrase !== 'string') {
        throw new AgentValidationError('personality.catchphrase must be a string');
      }
      if (p.communication_style !== undefined && typeof p.communication_style !== 'string') {
        throw new AgentValidationError('personality.communication_style must be a string');
      }
      if (p.decision_making !== undefined && typeof p.decision_making !== 'string') {
        throw new AgentValidationError('personality.decision_making must be a string');
      }
    }

    if (profile.thinking_patterns !== undefined) {
      if (!Array.isArray(profile.thinking_patterns)) {
        throw new AgentValidationError('thinking_patterns must be an array');
      }
    }

    return true;
  }

  /**
   * Get profile path (with path traversal protection)
   * Returns an array of possible paths to try (primary first, then fallback)
   */
  getProfilePath(name: string): string[] {
    // Security: Prevent path traversal attacks
    // Only allow alphanumeric, dash, underscore in profile names
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new AgentValidationError(`Invalid profile name: ${name}. Only alphanumeric characters, dashes, and underscores are allowed.`);
    }

    // Return paths to try in order: primary directory, then fallback
    return [
      join(this.profilesDir, `${name}.yaml`),
      join(this.fallbackProfilesDir, `${name}.yaml`)
    ];
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
      // Enhanced v4.1+ features
      stages: data.stages,
      personality: data.personality,
      thinking_patterns: data.thinking_patterns,
      // Provider preferences
      provider: data.provider,
      model: data.model,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      // Optional
      tags: data.tags,
      version: data.version,
      metadata: data.metadata
    };

    // Validate
    this.validateProfile(profile);

    return profile;
  }
}
