/**
 * Memory Manager - Export for backwards compatibility
 *
 * This file re-exports MemoryManagerVec as the default MemoryManager.
 * The HNSW-based implementation has been deprecated and moved to memory-manager.deprecated.ts
 *
 * @since 4.0.0-alpha.1
 */

export { MemoryManagerVec as MemoryManager } from './memory-manager-vec.js';
export type { IMemoryManager } from '../types/memory.js';
