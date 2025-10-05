/**
 * Abilities Manager - Load and inject agent abilities from markdown files
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { logger } from '../utils/logger.js';
import { TTLCache } from '../core/cache.js';

/**
 * Abilities Manager - Load and manage agent abilities
 */
export class AbilitiesManager {
  private abilitiesDir: string;
  private cache: TTLCache<string>;

  constructor(abilitiesDir: string) {
    this.abilitiesDir = abilitiesDir;
    // Use TTLCache with 10 minute TTL for abilities (they change less frequently)
    this.cache = new TTLCache<string>({
      maxEntries: 50,
      ttl: 600000, // 10 minutes
      maxSize: 5 * 1024 * 1024, // 5MB total cache size
      cleanupInterval: 120000, // Cleanup every 2 minutes
      debug: false
    });
  }

  /**
   * Load a single ability by name
   */
  async loadAbility(name: string): Promise<string> {
    // Security: Validate ability name to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      logger.warn('Invalid ability name rejected', { name });
      throw new Error(`Invalid ability name: ${name}. Only alphanumeric characters, dashes, and underscores are allowed.`);
    }

    // Check cache first
    const cached = this.cache.get(name);
    if (cached) {
      logger.debug('Ability loaded from cache', { name });
      return cached;
    }

    // Load from file
    const abilityPath = join(this.abilitiesDir, `${name}.md`);

    try {
      const content = await readFile(abilityPath, 'utf-8');

      // Security: Limit file size to prevent DoS (max 500KB for ability)
      if (content.length > 500 * 1024) {
        throw new Error('Ability file too large (max 500KB)');
      }

      // Cache it
      this.cache.set(name, content);

      logger.info('Ability loaded', { name, path: abilityPath });
      return content;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn('Ability not found', { name, path: abilityPath });
        return ''; // Return empty string for missing abilities
      }
      throw error;
    }
  }

  /**
   * Load multiple abilities
   */
  async loadAbilities(names: string[]): Promise<Map<string, string>> {
    const abilities = new Map<string, string>();

    for (const name of names) {
      const content = await this.loadAbility(name);
      if (content) {
        abilities.set(name, content);
      }
    }

    return abilities;
  }

  /**
   * Get concatenated abilities text
   */
  async getAbilitiesText(names: string[]): Promise<string> {
    const abilities = await this.loadAbilities(names);

    if (abilities.size === 0) {
      return '';
    }

    // Concatenate all abilities with section headers
    const sections: string[] = [];

    for (const [name, content] of abilities.entries()) {
      sections.push(`## Ability: ${name}\n\n${content}`);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * List all available abilities
   */
  async listAbilities(): Promise<string[]> {
    try {
      const files = await readdir(this.abilitiesDir);

      const abilities = files
        .filter(file => extname(file) === '.md')
        .map(file => basename(file, extname(file)));

      return abilities.sort();

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
