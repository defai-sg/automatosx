/**
 * Memory Manager Export Tests
 *
 * Tests the re-export wrapper that provides backwards compatibility
 */

import { describe, it, expect } from 'vitest';
import { MemoryManager } from '../../src/core/memory-manager.js';
import { MemoryManagerVec } from '../../src/core/memory-manager-vec.js';
import type { IMemoryManager } from '../../src/types/memory.js';

describe('Memory Manager Re-export', () => {
  it('should export MemoryManagerVec as MemoryManager', () => {
    expect(MemoryManager).toBe(MemoryManagerVec);
  });

  it('should export IMemoryManager interface type', () => {
    // Type check - if this compiles, the type is exported correctly
    const checkType = (manager: IMemoryManager) => manager;
    expect(checkType).toBeDefined();
  });

  it('should be the same class reference', () => {
    expect(MemoryManager.name).toBe('MemoryManagerVec');
  });
});
