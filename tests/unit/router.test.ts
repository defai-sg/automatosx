/**
 * Router Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Router } from '../../src/core/router.js';
import type { Provider, ExecutionRequest, ExecutionResponse } from '../../src/types/provider.js';
import { ProviderError } from '../../src/utils/errors.js';

describe('Router', () => {
  let router: Router;
  let mockProvider1: Provider;
  let mockProvider2: Provider;
  let mockRequest: ExecutionRequest;

  beforeEach(() => {
    // Mock provider 1 (higher priority)
    mockProvider1 = {
      name: 'provider1',
      version: '1.0.0',
      priority: 1,
      capabilities: {
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsVision: false,
        maxContextTokens: 4096,
        supportedModels: ['model1']
      },
      execute: vi.fn().mockResolvedValue({
        content: 'Response from provider1',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 100,
        model: 'model1',
        finishReason: 'stop'
      } as ExecutionResponse),
      stream: vi.fn(),
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      isAvailable: vi.fn().mockResolvedValue(true),
      getHealth: vi.fn().mockResolvedValue({
        available: true,
        latencyMs: 100,
        errorRate: 0,
        consecutiveFailures: 0
      }),
      checkRateLimit: vi.fn().mockResolvedValue({
        hasCapacity: true,
        requestsRemaining: 100,
        tokensRemaining: 10000,
        resetAtMs: Date.now() + 60000
      }),
      waitForCapacity: vi.fn().mockResolvedValue(undefined),
      estimateCost: vi.fn().mockResolvedValue({
        estimatedUsd: 0.01,
        tokensUsed: 30
      }),
      getUsageStats: vi.fn().mockResolvedValue({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatencyMs: 0,
        errorCount: 0
      }),
      shouldRetry: vi.fn().mockReturnValue(false),
      getRetryDelay: vi.fn().mockReturnValue(1000)
    } as Provider;

    // Mock provider 2 (lower priority)
    mockProvider2 = {
      name: 'provider2',
      version: '1.0.0',
      priority: 2,
      capabilities: {
        supportsStreaming: true,
        supportsEmbedding: false,
        supportsVision: false,
        maxContextTokens: 4096,
        supportedModels: ['model2']
      },
      execute: vi.fn().mockResolvedValue({
        content: 'Response from provider2',
        tokensUsed: { prompt: 10, completion: 20, total: 30 },
        latencyMs: 150,
        model: 'model2',
        finishReason: 'stop'
      } as ExecutionResponse),
      stream: vi.fn(),
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      isAvailable: vi.fn().mockResolvedValue(true),
      getHealth: vi.fn().mockResolvedValue({
        available: true,
        latencyMs: 150,
        errorRate: 0,
        consecutiveFailures: 0
      }),
      checkRateLimit: vi.fn().mockResolvedValue({
        hasCapacity: true,
        requestsRemaining: 100,
        tokensRemaining: 10000,
        resetAtMs: Date.now() + 60000
      }),
      waitForCapacity: vi.fn().mockResolvedValue(undefined),
      estimateCost: vi.fn().mockResolvedValue({
        estimatedUsd: 0.01,
        tokensUsed: 30
      }),
      getUsageStats: vi.fn().mockResolvedValue({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatencyMs: 0,
        errorCount: 0
      }),
      shouldRetry: vi.fn().mockReturnValue(false),
      getRetryDelay: vi.fn().mockReturnValue(1000)
    } as Provider;

    mockRequest = {
      prompt: 'Test prompt',
      systemPrompt: 'Test system prompt',
      model: 'test-model',
      temperature: 0.7
    };

    router = new Router({
      providers: [mockProvider2, mockProvider1], // Intentionally unsorted
      fallbackEnabled: true
    });
  });

  afterEach(() => {
    router.destroy();
  });

  describe('constructor', () => {
    it('should sort providers by priority', async () => {
      const providers = await router.getAvailableProviders();
      expect(providers[0]?.name).toBe('provider1'); // Priority 1
      expect(providers[1]?.name).toBe('provider2'); // Priority 2
    });
  });

  describe('execute', () => {
    it('should execute with first available provider', async () => {
      const response = await router.execute(mockRequest);

      expect(response.model).toBe('model1');
      expect(mockProvider1.execute).toHaveBeenCalledWith(mockRequest);
      expect(mockProvider2.execute).not.toHaveBeenCalled();
    });

    it('should throw error when no providers available', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);
      mockProvider2.isAvailable = vi.fn().mockResolvedValue(false);

      await expect(router.execute(mockRequest)).rejects.toThrow(ProviderError);
      await expect(router.execute(mockRequest)).rejects.toThrow('No AI providers are available');
    });

    it('should fallback to next provider on failure', async () => {
      mockProvider1.execute = vi.fn().mockRejectedValue(new Error('Provider1 failed'));

      const response = await router.execute(mockRequest);

      expect(response.model).toBe('model2');
      expect(mockProvider1.execute).toHaveBeenCalled();
      expect(mockProvider2.execute).toHaveBeenCalled();
    });

    it('should throw error when fallback disabled and provider fails', async () => {
      const routerNoFallback = new Router({
        providers: [mockProvider1],
        fallbackEnabled: false
      });

      mockProvider1.execute = vi.fn().mockRejectedValue(new Error('Provider failed'));

      await expect(routerNoFallback.execute(mockRequest)).rejects.toThrow('Provider failed');

      routerNoFallback.destroy();
    });

    it('should throw ProviderError when all providers fail', async () => {
      mockProvider1.execute = vi.fn().mockRejectedValue(new Error('Provider1 failed'));
      mockProvider2.execute = vi.fn().mockRejectedValue(new Error('Provider2 failed'));

      await expect(router.execute(mockRequest)).rejects.toThrow(ProviderError);
      await expect(router.execute(mockRequest)).rejects.toThrow('All providers failed');
    });

    it('should include last error in ProviderError when all fail', async () => {
      const lastError = new Error('Provider2 specific error');
      mockProvider1.execute = vi.fn().mockRejectedValue(new Error('Provider1 failed'));
      mockProvider2.execute = vi.fn().mockRejectedValue(lastError);

      try {
        await router.execute(mockRequest);
      } catch (error: any) {
        expect(error.message).toContain('Provider2 specific error');
        expect(error.context?.lastError).toBe('Provider2 specific error');
      }
    });
  });

  describe('stream', () => {
    it('should stream from first available provider', async () => {
      const mockStream = async function* () {
        yield 'chunk1';
        yield 'chunk2';
      };
      mockProvider1.stream = vi.fn().mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of router.stream(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1', 'chunk2']);
      expect(mockProvider1.stream).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw error when no providers available for streaming', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);
      mockProvider2.isAvailable = vi.fn().mockResolvedValue(false);

      const streamGen = router.stream(mockRequest);

      await expect(streamGen.next()).rejects.toThrow(ProviderError);
    });

    it('should fallback to next provider on streaming failure', async () => {
      mockProvider1.stream = vi.fn().mockImplementation(() => {
        throw new Error('Provider1 streaming failed');
      });

      const mockStream = async function* () {
        yield 'chunk from provider2';
      };
      mockProvider2.stream = vi.fn().mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of router.stream(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk from provider2']);
      expect(mockProvider2.stream).toHaveBeenCalled();
    });

    it('should throw error when fallback disabled and streaming fails', async () => {
      const routerNoFallback = new Router({
        providers: [mockProvider1],
        fallbackEnabled: false
      });

      mockProvider1.stream = vi.fn().mockImplementation(() => {
        throw new Error('Streaming failed');
      });

      const streamGen = routerNoFallback.stream(mockRequest);

      await expect(streamGen.next()).rejects.toThrow('Streaming failed');

      routerNoFallback.destroy();
    });

    it('should throw ProviderError when all streaming attempts fail', async () => {
      mockProvider1.stream = vi.fn().mockImplementation(() => {
        throw new Error('Provider1 streaming failed');
      });
      mockProvider2.stream = vi.fn().mockImplementation(() => {
        throw new Error('Provider2 streaming failed');
      });

      const streamGen = router.stream(mockRequest);

      await expect(streamGen.next()).rejects.toThrow(ProviderError);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available providers sorted by priority', async () => {
      const providers = await router.getAvailableProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0]?.name).toBe('provider1');
      expect(providers[1]?.name).toBe('provider2');
    });

    it('should filter out unavailable providers', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);

      const providers = await router.getAvailableProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0]?.name).toBe('provider2');
    });

    it('should return empty array when no providers available', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);
      mockProvider2.isAvailable = vi.fn().mockResolvedValue(false);

      const providers = await router.getAvailableProviders();

      expect(providers).toHaveLength(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status of all providers', async () => {
      const healthMap = await router.getHealthStatus();

      expect(healthMap.size).toBe(2);
      expect(healthMap.get('provider1')).toBeDefined();
      expect(healthMap.get('provider1')?.available).toBe(true);
      expect(healthMap.get('provider2')).toBeDefined();
      expect(healthMap.get('provider2')?.available).toBe(true);
    });

    it('should include unavailable providers in health status', async () => {
      mockProvider1.getHealth = vi.fn().mockResolvedValue({
        available: false,
        latencyMs: 0,
        lastCheck: new Date(),
        consecutiveFailures: 3
      });

      const healthMap = await router.getHealthStatus();

      expect(healthMap.get('provider1')?.available).toBe(false);
      expect(healthMap.get('provider1')?.consecutiveFailures).toBe(3);
    });
  });

  describe('selectProvider', () => {
    it('should select first available provider by priority', async () => {
      const provider = await router.selectProvider();

      expect(provider).toBeDefined();
      expect(provider?.name).toBe('provider1');
    });

    it('should return null when no providers available', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);
      mockProvider2.isAvailable = vi.fn().mockResolvedValue(false);

      const provider = await router.selectProvider();

      expect(provider).toBeNull();
    });

    it('should skip unavailable providers', async () => {
      mockProvider1.isAvailable = vi.fn().mockResolvedValue(false);

      const provider = await router.selectProvider();

      expect(provider?.name).toBe('provider2');
    });
  });

  describe('health checks', () => {
    it('should perform periodic health checks when interval provided', async () => {
      const routerWithHealthCheck = new Router({
        providers: [mockProvider1],
        fallbackEnabled: true,
        healthCheckInterval: 100
      });

      // Wait for at least one health check
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockProvider1.getHealth).toHaveBeenCalled();

      routerWithHealthCheck.destroy();
    });

    it('should stop health checks when destroyed', async () => {
      const routerWithHealthCheck = new Router({
        providers: [mockProvider1],
        fallbackEnabled: true,
        healthCheckInterval: 100
      });

      routerWithHealthCheck.destroy();

      const callCount = (mockProvider1.getHealth as any).mock.calls.length;

      // Wait to ensure no more calls happen
      await new Promise(resolve => setTimeout(resolve, 150));

      expect((mockProvider1.getHealth as any).mock.calls.length).toBe(callCount);
    });
  });
});
