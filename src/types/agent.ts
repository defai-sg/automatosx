/**
 * Agent Types - Agent Profile and Execution Context
 */

import type { Provider } from './provider.js';
import type { MemoryEntry } from './memory.js';
import type { OrchestrationConfig, OrchestrationMetadata, Session } from './orchestration.js';

/**
 * Stage - A step in the agent's workflow
 */
export interface Stage {
  name: string;
  description: string;
  key_questions?: string[];
  outputs?: string[];

  /**
   * @deprecated Model and temperature are now configured at team level.
   * These fields are ignored. Configure provider behavior via CLI config files:
   * - Claude: Claude Code settings
   * - Gemini: ~/.config/gemini/settings.json
   * - Codex: ~/.codex/config.toml
   */
  model?: string;
  temperature?: number;

  // Phase 3: Advanced stage features
  dependencies?: string[];  // Stage names this stage depends on
  condition?: string;        // Conditional execution (e.g., "previous.success")
  parallel?: boolean;        // Can this stage run in parallel with others?
  streaming?: boolean;       // Enable streaming output for this stage
  saveToMemory?: boolean;    // Persist this stage's results to memory
}

/**
 * Personality - Defines agent's character and behavior
 */
export interface Personality {
  traits?: string[];
  catchphrase?: string;
  communication_style?: string;
  decision_making?: string;
}

/**
 * Ability Selection Strategy - How to select abilities for different tasks
 */
export interface AbilitySelection {
  // Core abilities always loaded
  core?: string[];
  // Task-based ability mapping (keyword -> abilities)
  taskBased?: Record<string, string[]>;
  // Load all abilities (default behavior)
  loadAll?: boolean;
}

/**
 * Agent Profile - Loaded from YAML
 */
export interface AgentProfile {
  // Metadata
  name: string;
  displayName?: string; // Human-friendly name (e.g., "Bob", "Eric")
  role: string;
  description: string;

  // v4.10.0+ Team-based configuration
  team?: string;  // Team name (e.g., "core", "engineering", "business", "design")
                  // Agents inherit provider config from their team

  // Behavior
  systemPrompt: string;
  abilities: string[];  // List of ability file names (agent-specific, added to team's sharedAbilities)

  // Enhanced v4.1+ features
  stages?: Stage[];              // Workflow stages
  personality?: Personality;     // Character traits
  thinking_patterns?: string[];  // Guiding principles
  abilitySelection?: AbilitySelection; // Smart ability loading

  /**
   * @deprecated v4.10.0+ Provider configuration moved to team level.
   * Use the `team` field instead. These fields are kept for backward compatibility only.
   *
   * New approach:
   * 1. Assign agent to a team via `team: "engineering"`
   * 2. Configure provider at team level in .automatosx/teams/<team>.yaml
   * 3. Configure provider behavior via CLI config files (not per-agent):
   *    - Claude: Claude Code settings
   *    - Gemini: ~/.config/gemini/settings.json
   *    - Codex: ~/.codex/config.toml
   */
  provider?: string;         // @deprecated Use team.provider
  fallbackProvider?: string; // @deprecated Use team.provider.fallback
  model?: string;            // @deprecated Configure in provider CLI config
  temperature?: number;      // @deprecated Configure in provider CLI config
  maxTokens?: number;        // @deprecated Configure in provider CLI config

  // Optional
  tags?: string[];
  version?: string;
  metadata?: Record<string, any>;

  // v4.7.0+ Orchestration
  orchestration?: OrchestrationConfig;  // Agent collaboration capabilities
}

/**
 * Execution Context - Everything needed to execute an agent
 */
export interface ExecutionContext {
  // Agent info
  agent: AgentProfile;
  task: string;

  // Memory (injected from MemoryManager)
  memory: MemoryEntry[];

  // Paths (from PathResolver)
  projectDir: string;
  workingDir: string;
  agentWorkspace: string;

  // Provider (selected from Router)
  provider: Provider;

  // Abilities (from AbilitiesManager)
  abilities: string;

  // Timestamp
  createdAt: Date;

  // v4.7.0+ Orchestration
  orchestration?: OrchestrationMetadata;  // Runtime orchestration info
  session?: Session;  // Current session (if part of multi-agent workflow)
}

/**
 * Context creation options
 */
export interface ContextOptions {
  provider?: string;      // Override provider
  model?: string;         // Override model
  skipMemory?: boolean;   // Skip memory injection
  memoryLimit?: number;   // Limit memory entries

  // v4.7.0+ Orchestration options
  sessionId?: string;           // Session ID for multi-agent workflows
  delegationChain?: string[];   // Current delegation chain (for cycle detection)
  sharedData?: Record<string, any>;  // Shared data from delegating agent
}

/**
 * Agent validation error
 */
export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

/**
 * Agent not found error
 */
export class AgentNotFoundError extends Error {
  constructor(agentName: string) {
    super(`Agent not found: ${agentName}`);
    this.name = 'AgentNotFoundError';
  }
}
