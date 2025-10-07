# Our Architecture Decisions - AutomatosX v4

> Key architectural decisions and rationale for AutomatosX

## ADR-001: SQLite + vec Over Milvus

**Decision:** Use SQLite with sqlite-vec extension instead of Milvus

**Context:**
- v3.1 used Milvus (300MB bundle, complex setup)
- Need vector search for memory system
- Bundle size is critical (target <50MB)

**Decision:**
- SQLite with sqlite-vec/vss extension
- HNSW index for approximate nearest neighbor search
- better-sqlite3 for Node.js bindings

**Consequences:**
- ✅ Bundle: 340MB → 46MB (87% reduction)
- ✅ Simple setup (no external services)
- ✅ Fast vector search (45ms → 0.72ms, 62x faster)
- ❌ Limited to single-node (acceptable for CLI tool)

## ADR-002: ESM Over CommonJS

**Decision:** Use ES Modules (ESM) for entire codebase

**Context:**
- Node.js 20+ has first-class ESM support
- Better tree-shaking and bundle optimization
- Modern TypeScript supports ESM well

**Decision:**
- `"type": "module"` in package.json
- `.js` extensions in all imports
- `import`/`export` syntax throughout

**Consequences:**
- ✅ Better tree-shaking (smaller bundle)
- ✅ Modern standards compliance
- ✅ Future-proof
- ⚠️ Requires `.js` in imports (slight inconvenience)

## ADR-003: TypeScript Strict Mode

**Decision:** Enable all strict TypeScript checks

**Context:**
- Type safety prevents runtime errors
- Strict mode catches more bugs at compile time

**Decision:**
```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true
}
```

**Consequences:**
- ✅ Fewer runtime errors
- ✅ Better IDE support
- ✅ Safer refactoring
- ⚠️ More initial development time (worth it)

## ADR-004: Three-Layer Security Model

**Decision:** Implement path validation, workspace isolation, and input sanitization

**Context:**
- CLI tools need file system access
- Agents should be isolated from each other
- Prevent malicious inputs

**Decision:**
1. **Path Resolution:** All file access through PathResolver
2. **Workspace Isolation:** Agent-specific workspaces with restricted permissions
3. **Input Validation:** Sanitize all user inputs

**Consequences:**
- ✅ Prevents path traversal attacks
- ✅ Agent isolation (security)
- ✅ No privilege escalation
- ⚠️ Slightly more complex file operations

## ADR-005: Profile + Abilities = Agent

**Decision:** Separate agent profile (YAML) from abilities (Markdown)

**Context:**
- Profiles define WHO the agent is
- Abilities define WHAT the agent knows
- Reusability and composition

**Decision:**
- Profile: YAML with metadata, systemPrompt, abilities references
- Abilities: Markdown files with domain knowledge
- Agent = Profile + loaded Abilities

**Consequences:**
- ✅ Reusable abilities across agents
- ✅ Easy to add new knowledge
- ✅ Clear separation of concerns
- ✅ User can customize both independently

## ADR-006: Stage-Based Workflow (v4.1+)

**Decision:** Support structured multi-stage workflows for complex tasks

**Context:**
- Complex tasks benefit from structured approach
- Need to guide AI through systematic process
- v3 had stages, v4.0 removed them, v4.1 adds back

**Decision:**
- Profiles can define stages with key_questions and expected_outputs
- Executor injects stages into prompt
- Future: Multi-stage execution with stage-specific models

**Consequences:**
- ✅ Structured, predictable workflows
- ✅ Completeness guarantees (via expected outputs)
- ✅ Cost optimization potential (Haiku for review stages)
- ⚠️ +560 tokens per request (~$0.002 cost increase)

## ADR-007: Lazy Loading for Performance

**Decision:** Defer expensive imports until needed

**Context:**
- CLI startup time matters
- Not all features used in every invocation
- Bundle size vs. runtime performance trade-off

**Decision:**
- Heavy modules use dynamic import: `await import('module')`
- Core modules use static imports
- LazyLoader utility for caching

**Consequences:**
- ✅ Faster CLI startup (~200ms)
- ✅ Smaller initial memory footprint
- ✅ Pay for what you use
- ⚠️ Slightly more complex code

## ADR-008: Vitest Over Jest

**Decision:** Use Vitest as testing framework

**Context:**
- Modern test runner with native ESM support
- Fast execution with watch mode
- Compatible with Vite ecosystem

**Decision:**
- Vitest for all tests (unit, integration, E2E)
- Coverage with v8 provider
- Test structure: describe/it/expect

**Consequences:**
- ✅ Fast test execution
- ✅ Native ESM support (no transform)
- ✅ Great developer experience
- ✅ 841 tests in ~10 seconds

## ADR-009: TTL Cache for Profiles

**Decision:** Cache loaded profiles with 5-minute TTL

**Context:**
- Profile loading involves file I/O and YAML parsing
- Same profiles often loaded multiple times
- Balance freshness vs. performance

**Decision:**
- TTLCache with 5-minute TTL
- Max 20 entries (LRU eviction)
- Cleanup every 60 seconds

**Consequences:**
- ✅ Faster repeated executions
- ✅ Reduced file I/O
- ✅ Automatic cache invalidation
- ⚠️ 5-minute delay for profile updates (acceptable)

## ADR-010: Provider Router Pattern

**Decision:** Use Router to abstract provider selection

**Context:**
- Multiple providers (Claude, Gemini, OpenAI)
- Need fallback and retry logic
- Provider availability varies

**Decision:**
- Router manages provider selection
- Retry with exponential backoff
- Fallback to alternative providers

**Consequences:**
- ✅ Provider flexibility
- ✅ Resilience to provider failures
- ✅ Easy to add new providers
- ⚠️ Slightly more complex execution flow

---

**Last Updated:** 2025-10-07
**For:** AutomatosX v4.0+
