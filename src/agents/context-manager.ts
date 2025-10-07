/**
 * Context Manager - Create and manage execution contexts for agents
 */

import { mkdir, chmod } from 'fs/promises';
import { join, resolve } from 'path';
import type {
  ExecutionContext,
  AgentProfile,
  ContextOptions
} from '../types/agent.js';
import type { Provider } from '../types/provider.js';
import type { MemoryEntry } from '../types/memory.js';
import { ProfileLoader } from './profile-loader.js';
import { AbilitiesManager } from './abilities-manager.js';
import type { IMemoryManager } from '../types/memory.js';
import { Router } from '../core/router.js';
import { PathResolver } from '../core/path-resolver.js';
import { logger } from '../utils/logger.js';
import { PathError, ProviderError } from '../utils/errors.js';

export interface ContextManagerConfig {
  profileLoader: ProfileLoader;
  abilitiesManager: AbilitiesManager;
  memoryManager: IMemoryManager;
  router: Router;
  pathResolver: PathResolver;
}

/**
 * Context Manager - Create and manage execution contexts
 */
export class ContextManager {
  private config: ContextManagerConfig;

  constructor(config: ContextManagerConfig) {
    this.config = config;
  }

  /**
   * Create execution context for an agent task
   */
  async createContext(
    agentName: string,
    task: string,
    options?: ContextOptions
  ): Promise<ExecutionContext> {
    logger.info('Creating execution context', { agentName, task });

    // 1. Resolve agent name (supports displayName)
    const resolvedName = await this.config.profileLoader.resolveAgentName(agentName);
    logger.debug('Agent name resolved', {
      input: agentName,
      resolved: resolvedName
    });

    // 2. Load agent profile
    const agent = await this.config.profileLoader.loadProfile(resolvedName);

    // 3. Load abilities
    const abilities = await this.config.abilitiesManager.getAbilitiesText(
      agent.abilities || []
    );

    // 4. Select provider
    const provider = await this.selectProvider(
      options?.provider || agent.provider
    );

    // 5. Get paths
    const projectDir = await this.config.pathResolver.detectProjectRoot();
    const workingDir = process.cwd();

    // Security: Sanitize agent name for directory (prevent path traversal)
    const agentDirName = agent.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const agentWorkspace = join(projectDir, '.automatosx', 'workspaces', agentDirName);

    // Security: Verify workspace is within project boundary
    const resolvedWorkspace = resolve(agentWorkspace);
    const resolvedProject = resolve(projectDir);
    if (!resolvedWorkspace.startsWith(resolvedProject)) {
      throw PathError.traversal(agentWorkspace);
    }

    // 6. Create workspace with restricted permissions
    await mkdir(agentWorkspace, { recursive: true });

    // Security: Set restrictive permissions on Unix (700 = owner only)
    if (process.platform !== 'win32') {
      await chmod(agentWorkspace, 0o700);
    }

    logger.debug('Agent workspace created', { workspace: agentWorkspace });

    // 7. Create context
    const context: ExecutionContext = {
      agent,
      task,
      memory: [],
      projectDir,
      workingDir,
      agentWorkspace,
      provider,
      abilities,
      createdAt: new Date()
    };

    // 7. Inject memory (if not skipped)
    if (!options?.skipMemory) {
      await this.injectMemory(
        context,
        task,
        options?.memoryLimit
      );
    }

    logger.info('Execution context created', {
      agent: agent.name,
      provider: provider.name,
      memoryEntries: context.memory.length,
      hasAbilities: abilities.length > 0
    });

    return context;
  }

  /**
   * Inject memory into context (search by task)
   */
  async injectMemory(
    context: ExecutionContext,
    query?: string,
    limit: number = 5
  ): Promise<void> {
    const searchQuery = query || context.task;

    try {
      const results = await this.config.memoryManager.search({
        text: searchQuery,
        limit
      });

      context.memory = results.map(r => r.entry);

      logger.debug('Memory injected', {
        query: searchQuery,
        count: context.memory.length
      });

    } catch (error) {
      logger.warn('Failed to inject memory', {
        error: (error as Error).message
      });
      // Continue without memory
      context.memory = [];
    }
  }

  /**
   * Select provider (from agent preference or router)
   */
  async selectProvider(preferredProvider?: string): Promise<Provider> {
    if (preferredProvider) {
      // Try to find preferred provider
      const availableProviders = await this.config.router.getAvailableProviders();
      const provider = availableProviders.find(p => p.name === preferredProvider);

      if (provider) {
        logger.debug('Using preferred provider', { provider: preferredProvider });
        return provider;
      }

      logger.warn('Preferred provider not available, using router', {
        preferred: preferredProvider
      });
    }

    // Use router to select best provider
    const provider = await this.config.router.selectProvider();

    if (!provider) {
      throw ProviderError.noAvailableProviders();
    }

    logger.debug('Provider selected by router', { provider: provider.name });
    return provider;
  }

  /**
   * Cleanup context (delete workspace if needed)
   */
  async cleanup(context: ExecutionContext): Promise<void> {
    // For now, keep workspace for debugging
    // In future, add option to auto-cleanup
    logger.debug('Context cleanup', {
      agent: context.agent.name,
      workspace: context.agentWorkspace
    });
  }
}
