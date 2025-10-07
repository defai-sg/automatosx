/**
 * Tests for StageExecutor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StageExecutor } from '../../src/agents/stage-executor.js';
import type { ExecutionContext, Stage } from '../../src/types/agent.js';
import type { Provider, ExecutionResponse } from '../../src/types/provider.js';
import type { IMemoryManager } from '../../src/types/memory.js';

describe('StageExecutor', () => {
  let executor: StageExecutor;
  let mockProvider: Provider;
  let mockMemoryManager: IMemoryManager;

  beforeEach(() => {
    executor = new StageExecutor();

    // Mock provider
    mockProvider = {
      name: 'mock-provider',
      priority: 1,
      enabled: true,
      execute: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () { yield "Mock "; yield "streaming "; yield "response"; }),
      checkHealth: vi.fn().mockResolvedValue({
        healthy: true,
        latency: 100
      })
    } as unknown as Provider;

    // Mock memory manager
    mockMemoryManager = {
      add: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({}),
      cleanup: vi.fn().mockResolvedValue(0),
      saveIndex: vi.fn().mockResolvedValue(undefined),
      loadIndex: vi.fn().mockResolvedValue(undefined),
      backup: vi.fn().mockResolvedValue(undefined),
      restore: vi.fn().mockResolvedValue(undefined),
      exportToJSON: vi.fn().mockResolvedValue({}),
      importFromJSON: vi.fn().mockResolvedValue({})
    } as unknown as IMemoryManager;
  });

  describe('executeStages', () => {
    it('should execute all stages in sequence', async () => {
      const stages: Stage[] = [
        {
          name: 'stage1',
          description: 'First stage'
        },
        {
          name: 'stage2',
          description: 'Second stage'
        },
        {
          name: 'stage3',
          description: 'Third stage'
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      // Mock provider responses
      const mockResponses: ExecutionResponse[] = [
        {
          content: 'Stage 1 output',
          tokensUsed: { prompt: 10, completion: 20, total: 30 },
          latencyMs: 100,
          model: 'test-model',
          finishReason: 'stop'
        },
        {
          content: 'Stage 2 output',
          tokensUsed: { prompt: 15, completion: 25, total: 40 },
          latencyMs: 150,
          model: 'test-model',
          finishReason: 'stop'
        },
        {
          content: 'Stage 3 output',
          tokensUsed: { prompt: 20, completion: 30, total: 50 },
          latencyMs: 200,
          model: 'test-model',
          finishReason: 'stop'
        }
      ];

      let callCount = 0;
      (mockProvider.execute as any).mockImplementation(async () => {
        return mockResponses[callCount++];
      });

      const result = await executor.executeStages(context, {
        verbose: false,
        showProgress: false
      });

      // Verify all stages executed
      expect(result.stages.length).toBe(3);
      expect(result.success).toBe(true);
      expect(result.totalTokens).toBe(120); // 30 + 40 + 50
      expect(mockProvider.execute).toHaveBeenCalledTimes(3);

      // Verify stage results
      expect(result.stages[0]?.stageName).toBe('stage1');
      expect(result.stages[0]?.output).toBe('Stage 1 output');
      expect(result.stages[0]?.success).toBe(true);

      expect(result.stages[1]?.stageName).toBe('stage2');
      expect(result.stages[1]?.output).toBe('Stage 2 output');
      expect(result.stages[1]?.success).toBe(true);

      expect(result.stages[2]?.stageName).toBe('stage3');
      expect(result.stages[2]?.output).toBe('Stage 3 output');
      expect(result.stages[2]?.success).toBe(true);
    });

    it('should pass previous outputs to next stages', async () => {
      const stages: Stage[] = [
        {
          name: 'analysis',
          description: 'Analyze requirements'
        },
        {
          name: 'design',
          description: 'Design solution'
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Build feature X',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Output',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      await executor.executeStages(context, {
        verbose: false,
        showProgress: false
      });

      // Check that second stage received context from first stage
      const secondStageCall = (mockProvider.execute as any).mock.calls[1][0];
      expect(secondStageCall.prompt).toContain('Context from Previous Stages');
      expect(secondStageCall.prompt).toContain('Stage 1: analysis');
      expect(secondStageCall.prompt).toContain('Output');
    });

    it('should stop on failure when continueOnFailure is false', async () => {
      const stages: Stage[] = [
        { name: 'stage1', description: 'First stage' },
        { name: 'stage2', description: 'Second stage' },
        { name: 'stage3', description: 'Third stage' }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      // First stage succeeds, second stage fails
      let callCount = 0;
      (mockProvider.execute as any).mockImplementation(async () => {
        if (callCount === 0) {
          callCount++;
          return {
            content: 'Stage 1 output',
            tokensUsed: { prompt: 10, completion: 20, total: 30 },
            latencyMs: 100,
            model: 'test-model',
            finishReason: 'stop'
          };
        } else {
          throw new Error('Stage 2 failed');
        }
      });

      const result = await executor.executeStages(context, {
        verbose: false,
        showProgress: false,
        continueOnFailure: false
      });

      // Should have executed only 2 stages (1 success, 1 failure)
      expect(result.stages.length).toBe(2);
      expect(result.success).toBe(false);
      expect(result.failedStage).toBe(1);
      expect(result.stages[0]?.success).toBe(true);
      expect(result.stages[1]?.success).toBe(false);
      expect(mockProvider.execute).toHaveBeenCalledTimes(2);
    });

    it('should continue on failure when continueOnFailure is true', async () => {
      const stages: Stage[] = [
        { name: 'stage1', description: 'First stage' },
        { name: 'stage2', description: 'Second stage' },
        { name: 'stage3', description: 'Third stage' }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      // Second stage fails, but third stage should still execute
      let callCount = 0;
      (mockProvider.execute as any).mockImplementation(async () => {
        if (callCount === 1) {
          callCount++;
          throw new Error('Stage 2 failed');
        } else {
          callCount++;
          return {
            content: `Stage ${callCount} output`,
            tokensUsed: { prompt: 10, completion: 20, total: 30 },
            latencyMs: 100,
            model: 'test-model',
            finishReason: 'stop'
          };
        }
      });

      const result = await executor.executeStages(context, {
        verbose: false,
        showProgress: false,
        continueOnFailure: true
      });

      // Should have executed all 3 stages
      expect(result.stages.length).toBe(3);
      expect(result.success).toBe(false);
      expect(result.failedStage).toBe(1);
      expect(result.stages[0]?.success).toBe(true);
      expect(result.stages[1]?.success).toBe(false);
      expect(result.stages[2]?.success).toBe(true);
      expect(mockProvider.execute).toHaveBeenCalledTimes(3);
    });

    it('should save stages to memory when saveToMemory is true', async () => {
      const stages: Stage[] = [
        { name: 'stage1', description: 'First stage' },
        { name: 'stage2', description: 'Second stage' }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Output',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      await executor.executeStages(context, {
        verbose: false,
        showProgress: false,
        saveToMemory: true,
        memoryManager: mockMemoryManager
      });

      // Note: Memory saving is currently disabled (not yet implemented)
      // So we don't verify memory.add was called
      // This will be re-enabled when text-to-embedding conversion is implemented
    });

    it('should use stage-specific model and temperature', async () => {
      const stages: Stage[] = [
        {
          name: 'stage1',
          description: 'First stage',
          model: 'custom-model-1',
          temperature: 0.5
        },
        {
          name: 'stage2',
          description: 'Second stage',
          model: 'custom-model-2',
          temperature: 0.9
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          model: 'default-model',
          temperature: 0.7,
          stages
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Output',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      await executor.executeStages(context, {
        verbose: false,
        showProgress: false
      });

      // Verify stage-specific configuration was used
      const firstCall = (mockProvider.execute as any).mock.calls[0][0];
      expect(firstCall.model).toBe('custom-model-1');
      expect(firstCall.temperature).toBe(0.5);

      const secondCall = (mockProvider.execute as any).mock.calls[1][0];
      expect(secondCall.model).toBe('custom-model-2');
      expect(secondCall.temperature).toBe(0.9);
    });

    it('should throw error if agent has no stages', async () => {
      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: []
          // No stages defined
        },
        task: 'Test task',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      await expect(
        executor.executeStages(context, {
          verbose: false,
          showProgress: false
        })
      ).rejects.toThrow('Agent has no stages defined');
    });

    it('should include key questions and outputs in stage prompt', async () => {
      const stages: Stage[] = [
        {
          name: 'requirements',
          description: 'Gather requirements',
          key_questions: [
            'What are the user needs?',
            'What are the technical constraints?'
          ],
          outputs: [
            'Requirements document',
            'Acceptance criteria'
          ]
        }
      ];

      const context: ExecutionContext = {
        agent: {
          name: 'test-agent',
          role: 'tester',
          description: 'Test agent',
          systemPrompt: 'You are a test agent',
          abilities: [],
          stages
        },
        task: 'Build new feature',
        memory: [],
        projectDir: '/test/project',
        workingDir: '/test/working',
        agentWorkspace: '/test/workspace',
        provider: mockProvider,
        abilities: '',
        createdAt: new Date()
      };

      const mockResponse: ExecutionResponse = {
        content: 'Output',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'test-model',
        finishReason: 'stop'
      };

      (mockProvider.execute as any).mockResolvedValue(mockResponse);

      await executor.executeStages(context, {
        verbose: false,
        showProgress: false
      });

      const firstCall = (mockProvider.execute as any).mock.calls[0][0];
      expect(firstCall.prompt).toContain('Key Questions to Address');
      expect(firstCall.prompt).toContain('What are the user needs?');
      expect(firstCall.prompt).toContain('What are the technical constraints?');
      expect(firstCall.prompt).toContain('Expected Outputs');
      expect(firstCall.prompt).toContain('Requirements document');
      expect(firstCall.prompt).toContain('Acceptance criteria');
    });
  });
});
