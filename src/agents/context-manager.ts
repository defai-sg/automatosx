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
import type { OrchestrationMetadata, Session } from '../types/orchestration.js';
import { ProfileLoader } from './profile-loader.js';
import { AbilitiesManager } from './abilities-manager.js';
import type { IMemoryManager } from '../types/memory.js';
import type { SessionManager } from '../core/session-manager.js';
import type { WorkspaceManager } from '../core/workspace-manager.js';
import { Router } from '../core/router.js';
import { PathResolver } from '../core/path-resolver.js';
import { logger } from '../utils/logger.js';
import { PathError, ProviderError } from '../utils/errors.js';

export interface ContextManagerConfig {
  profileLoader: ProfileLoader;
  abilitiesManager: AbilitiesManager;
  memoryManager: IMemoryManager | null;
  router: Router;
  pathResolver: PathResolver;
  sessionManager?: SessionManager;
  workspaceManager?: WorkspaceManager;
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

    // 3. Load abilities (smart selection based on task)
    const selectedAbilities = this.selectAbilities(agent, task);
    const abilities = await this.config.abilitiesManager.getAbilitiesText(
      selectedAbilities
    );

    logger.debug('Abilities selected', {
      total: agent.abilities.length,
      selected: selectedAbilities.length,
      abilities: selectedAbilities
    });

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

    // 7. Handle session (if sessionId provided)
    let session: Session | undefined;
    if (options?.sessionId && this.config.sessionManager) {
      const foundSession = await this.config.sessionManager.getSession(options.sessionId);
      if (!foundSession) {
        logger.warn('Session not found', { sessionId: options.sessionId });
      } else {
        session = foundSession;
      }
    }

    // 8. Build orchestration metadata (if agent has orchestration config)
    let orchestration: OrchestrationMetadata | undefined;
    if (agent.orchestration?.canDelegate && this.config.workspaceManager) {
      // Get list of available agents for delegation
      const allAgents = await this.config.profileLoader.listProfiles();
      const canDelegateTo = agent.orchestration.canDelegateTo || [];

      // Filter available agents based on whitelist
      const availableAgents = allAgents.filter(a => canDelegateTo.includes(a));

      // Get shared workspace path
      const sharedWorkspace = session
        ? join(projectDir, '.automatosx', 'workspaces', 'shared', 'sessions', session.id)
        : join(projectDir, '.automatosx', 'workspaces', 'shared', 'persistent');

      orchestration = {
        canDelegate: true,
        availableAgents,
        sharedWorkspace,
        delegationChain: options?.delegationChain || []
      };

      logger.debug('Orchestration metadata built', {
        availableAgents,
        sharedWorkspace,
        delegationChain: orchestration.delegationChain
      });
    }

    // 9. Create context
    const context: ExecutionContext = {
      agent,
      task,
      memory: [],
      projectDir,
      workingDir,
      agentWorkspace,
      provider,
      abilities,
      createdAt: new Date(),
      orchestration,
      session
    };

    // 10. Inject memory (if not skipped)
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
    // Skip if no memory manager available
    if (!this.config.memoryManager) {
      logger.debug('Memory injection skipped: no memory manager available');
      context.memory = [];
      return;
    }

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
   * Select abilities based on task keywords (smart selection)
   */
  private selectAbilities(agent: AgentProfile, task: string): string[] {
    // If no abilitySelection config, load all abilities (backward compatible)
    if (!agent.abilitySelection || agent.abilitySelection.loadAll) {
      return agent.abilities || [];
    }

    const taskLower = task.toLowerCase();
    const selectedAbilities = new Set<string>();
    const availableAbilities = new Set(agent.abilities || []);

    // Always load core abilities
    if (agent.abilitySelection.core) {
      agent.abilitySelection.core.forEach(a => {
        if (availableAbilities.has(a)) {
          selectedAbilities.add(a);
        } else {
          logger.warn('Core ability not found in agent abilities list', {
            ability: a,
            agent: agent.name
          });
        }
      });
    }

    // Task-based selection
    if (agent.abilitySelection.taskBased) {
      for (const [keyword, abilities] of Object.entries(agent.abilitySelection.taskBased)) {
        if (taskLower.includes(keyword.toLowerCase())) {
          abilities.forEach(a => {
            if (availableAbilities.has(a)) {
              selectedAbilities.add(a);
            } else {
              logger.warn('Task-based ability not found in agent abilities list', {
                ability: a,
                keyword,
                agent: agent.name
              });
            }
          });
          logger.debug('Task keyword matched', { keyword, abilities: abilities.filter(a => availableAbilities.has(a)) });
        }
      }
    }

    // If no task-based matches, return core abilities only
    const selected = Array.from(selectedAbilities);

    // Fallback: if no abilities selected, load core or first 2 abilities
    if (selected.length === 0) {
      logger.debug('No task-based matches, using fallback');
      return agent.abilities.slice(0, 2);
    }

    return selected;
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
