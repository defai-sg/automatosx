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

  // Behavior
  systemPrompt: string;
  abilities: string[];  // List of ability file names

  // Enhanced v4.1+ features
  stages?: Stage[];              // Workflow stages
  personality?: Personality;     // Character traits
  thinking_patterns?: string[];  // Guiding principles
  abilitySelection?: AbilitySelection; // Smart ability loading

  // Provider preferences
  provider?: string;         // Primary provider (claude, gemini, openai)
  fallbackProvider?: string; // Fallback provider if primary fails
  model?: string;            // Preferred model
  temperature?: number;      // Temperature (0-1)
  maxTokens?: number;        // Max response tokens

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
