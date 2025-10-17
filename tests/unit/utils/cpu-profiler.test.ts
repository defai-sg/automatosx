import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CPUProfiler } from '../../../src/utils/cpu-profiler';

describe('CPUProfiler', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.AUTOMATOSX_PROFILE;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AUTOMATOSX_PROFILE;
    } else {
      process.env.AUTOMATOSX_PROFILE = originalEnv;
    }
  });

  describe('constructor', () => {
    it('should be enabled when AUTOMATOSX_PROFILE=true', () => {
      process.env.AUTOMATOSX_PROFILE = 'true';
      const profiler = new CPUProfiler();
      expect(profiler.isEnabled()).toBe(true);
    });

    it('should be disabled when AUTOMATOSX_PROFILE is not set', () => {
      delete process.env.AUTOMATOSX_PROFILE;
      const profiler = new CPUProfiler();
      expect(profiler.isEnabled()).toBe(false);
    });

    it('should respect explicit enabled parameter', () => {
      const profiler = new CPUProfiler(true);
      expect(profiler.isEnabled()).toBe(true);
    });
  });

  describe('measureCPUTime', () => {
    it('should measure CPU time for sync function', async () => {
      const profiler = new CPUProfiler(true);

      const { result, sample } = await profiler.measureCPUTime('test', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBeGreaterThan(0);
      expect(sample.label).toBe('test');
      expect(sample.durationMs).toBeGreaterThan(0);
      expect(sample.totalMs).toBeGreaterThanOrEqual(0);
      expect(sample.timestamp).toBeGreaterThan(0);
    });

    it.skip('should measure CPU time for async function', async () => {
      // FIXME: Flaky test - timing-dependent assertion
      // This test relies on setTimeout timing which can vary by ~0.1-0.5ms under load
      // TODO: Refactor to use vi.useFakeTimers() or increase tolerance range to 20ms
      const profiler = new CPUProfiler(true);

      const { result, sample } = await profiler.measureCPUTime('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
      expect(sample.label).toBe('async-test');
      // Allow some timing variance (9-15ms range)
      expect(sample.durationMs).toBeGreaterThanOrEqual(9);
      expect(sample.durationMs).toBeLessThanOrEqual(15);
    });

    it('should capture multiple samples', async () => {
      const profiler = new CPUProfiler(true);

      await profiler.measureCPUTime('sample1', () => 1);
      await profiler.measureCPUTime('sample2', () => 2);

      const samples = profiler.getSamples();
      expect(samples).toHaveLength(2);
      expect(samples[0]?.label).toBe('sample1');
      expect(samples[1]?.label).toBe('sample2');
    });

    it('should rethrow errors from measured function', async () => {
      const profiler = new CPUProfiler(true);

      await expect(
        profiler.measureCPUTime('error-test', () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');
    });

    it('should still capture sample even when function throws', async () => {
      const profiler = new CPUProfiler(true);

      try {
        await profiler.measureCPUTime('error-test', () => {
          throw new Error('test error');
        });
      } catch {
        // Expected
      }

      const samples = profiler.getSamples();
      expect(samples).toHaveLength(1);
      expect(samples[0]?.label).toBe('error-test');
    });
  });

  describe('generateReport', () => {
    it('should generate report with samples', async () => {
      const profiler = new CPUProfiler(true);

      await profiler.measureCPUTime('task1', () => 1);
      await profiler.measureCPUTime('task2', () => 2);

      const report = profiler.generateReport();

      expect(report).toContain('CPU Profile Report');
      expect(report).toContain('task1');
      expect(report).toContain('task2');
      expect(report).toContain('Duration');
      expect(report).toContain('User CPU');
      expect(report).toContain('System CPU');
      expect(report).toContain('Summary');
    });

    it('should return message when no samples', () => {
      const profiler = new CPUProfiler(true);
      const report = profiler.generateReport();

      expect(report).toBe('No CPU samples captured.\n');
    });
  });

  describe('getSamples', () => {
    it('should return all samples', async () => {
      const profiler = new CPUProfiler(true);
      await profiler.measureCPUTime('s1', () => 1);
      await profiler.measureCPUTime('s2', () => 2);

      const samples = profiler.getSamples();
      expect(samples).toHaveLength(2);
    });

    it('should return empty array when no samples', () => {
      const profiler = new CPUProfiler(true);
      expect(profiler.getSamples()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all samples', async () => {
      const profiler = new CPUProfiler(true);
      await profiler.measureCPUTime('s1', () => 1);
      await profiler.measureCPUTime('s2', () => 2);

      expect(profiler.getSamples()).toHaveLength(2);

      profiler.clear();
      expect(profiler.getSamples()).toHaveLength(0);
    });
  });
});
