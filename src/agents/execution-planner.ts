import { logger } from '../utils/logger.js';
import type { DependencyGraph } from './dependency-graph.js';

export interface ExecutionLevel {
  level: number;
  agents: string[];
  parallelBatches: string[][];
  executionMode: 'parallel' | 'sequential';
}

export interface ExecutionPlan {
  levels: ExecutionLevel[];
  totalAgents: number;
  maxConcurrency: number;
  estimatedDuration?: number;
}

export interface ExecutionPlannerOptions {
  maxConcurrentAgents?: number;
}

export class ExecutionPlanner {
  constructor(private readonly defaults: ExecutionPlannerOptions = {}) {}

  createExecutionPlan(
    graph: DependencyGraph,
    options: ExecutionPlannerOptions = {}
  ): ExecutionPlan {
    const mergedOptions = { ...this.defaults, ...options };
    const maxConcurrency = this.resolveMaxConcurrency(mergedOptions);

    const plan: ExecutionPlan = {
      levels: [],
      totalAgents: graph.nodes.size,
      maxConcurrency
    };

    if (graph.nodes.size === 0) {
      return plan;
    }

    for (let level = 0; level <= graph.maxLevel; level++) {
      const agentNames = [...(graph.levels.get(level) ?? [])];
      if (agentNames.length === 0) {
        continue;
      }

      const canRunParallel = agentNames.every(name => {
        const node = graph.nodes.get(name);
        return node ? node.agent.parallel !== false : true;
      });

      const batches: string[][] = [];

      if (canRunParallel) {
        for (let i = 0; i < agentNames.length; i += maxConcurrency) {
          batches.push(agentNames.slice(i, i + maxConcurrency));
        }
      } else {
        for (const name of agentNames) {
          batches.push([name]);
        }
      }

      plan.levels.push({
        level,
        agents: agentNames,
        parallelBatches: batches,
        executionMode: canRunParallel ? 'parallel' : 'sequential'
      });
    }

    return plan;
  }

  private resolveMaxConcurrency(options: ExecutionPlannerOptions): number {
    const value = options.maxConcurrentAgents ?? 4;

    if (!Number.isInteger(value) || value < 1) {
      logger.warn('Invalid maxConcurrentAgents supplied, falling back to 1', {
        requested: value
      });
      return 1;
    }

    return value;
  }
}
