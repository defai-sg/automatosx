# Our Project Structure - AutomatosX v4

> AutomatosX project organization and file structure conventions

## Directory Structure

```
automatosx/
├── src/                      # Source code (TypeScript)
│   ├── core/                 # Core modules
│   │   ├── config.ts         # Configuration management
│   │   ├── path-resolver.ts  # Path resolution & security
│   │   ├── router.ts         # Provider routing
│   │   ├── memory-manager.ts # SQLite persistence
│   │   ├── memory-manager-vec.ts # Vector search (sqlite-vec)
│   │   ├── cache.ts          # TTL-based LRU caching
│   │   └── lazy-loader.ts    # Lazy module loading
│   │
│   ├── agents/               # Agent system
│   │   ├── profile-loader.ts    # YAML profile loading
│   │   ├── abilities-manager.ts # Markdown abilities
│   │   ├── context-manager.ts   # Execution context
│   │   └── executor.ts          # Agent execution
│   │
│   ├── providers/            # Provider implementations
│   │   ├── base-provider.ts  # Provider interface
│   │   ├── claude-provider.ts # Claude integration
│   │   ├── gemini-provider.ts # Gemini integration
│   │   └── openai-embedding-provider.ts # OpenAI embeddings
│   │
│   ├── cli/                  # CLI interface
│   │   ├── index.ts          # CLI entry point
│   │   └── commands/         # Command implementations
│   │       ├── init.ts       # Project initialization
│   │       ├── config.ts     # Configuration management
│   │       ├── status.ts     # System status
│   │       ├── list.ts       # List agents/abilities
│   │       ├── run.ts        # Execute agent
│   │       ├── chat.ts       # Interactive chat
│   │       └── memory.ts     # Memory operations
│   │
│   ├── types/                # TypeScript types
│   │   ├── config.ts         # Configuration types
│   │   ├── logger.ts         # Logger types
│   │   ├── path.ts           # Path types
│   │   ├── agent.ts          # Agent types (Profile, Stage, etc.)
│   │   ├── provider.ts       # Provider types
│   │   ├── memory.ts         # Memory types
│   │   └── migration.ts      # Migration types
│   │
│   └── utils/                # Utilities
│       ├── logger.ts         # Logger implementation
│       ├── errors.ts         # Custom error classes
│       ├── error-formatter.ts # Error formatting
│       └── performance.ts    # Performance tracking
│
├── tests/                    # Test suites (841 tests)
│   ├── unit/                 # Unit tests (677 tests)
│   │   ├── path-resolver.test.ts
│   │   ├── memory-manager.test.ts
│   │   ├── router.test.ts
│   │   └── ...
│   ├── integration/          # Integration tests (78 tests)
│   │   ├── cli-config.test.ts
│   │   ├── cli-memory.test.ts
│   │   └── ...
│   ├── e2e/                  # End-to-end tests (17 tests)
│   │   ├── complete-workflow.test.ts
│   │   └── ...
│   └── fixtures/             # Test fixtures and helpers
│       ├── test-helpers.ts
│       └── mock-providers.ts
│
├── examples/                 # Example configurations
│   ├── agents/               # Example agent profiles (YAML)
│   │   ├── coder.yaml        # Charlie - Software Engineer
│   │   ├── reviewer.yaml     # Code reviewer
│   │   ├── assistant.yaml    # General assistant
│   │   ├── backend.yaml      # Backend specialist
│   │   ├── frontend.yaml     # Frontend specialist
│   │   └── ...
│   │
│   └── abilities/            # Example abilities (Markdown)
│       ├── code-generation.md
│       ├── best-practices.md
│       ├── refactoring.md
│       ├── testing.md
│       ├── documentation.md
│       ├── our-coding-standards.md      # ← Project-specific
│       ├── our-project-structure.md     # ← Project-specific
│       ├── our-architecture-decisions.md # ← Project-specific
│       └── our-code-review-checklist.md # ← Project-specific
│
├── PRD/                      # Product Requirements & Design
│   ├── 00-executive-summary.md
│   ├── 03-technical-specification.md
│   ├── 16-path-resolution-strategy.md
│   └── archive/              # Development history
│
├── scripts/                  # Utility scripts
│   ├── check-release.js      # Pre-release validation
│   ├── smoke-test.sh         # Quick functionality tests
│   └── real-provider-test.sh # Production API tests
│
├── dist/                     # Build output (gitignored)
│   ├── index.js              # Bundled CLI (205KB)
│   ├── index.js.map          # Source map
│   └── index.d.ts            # Type definitions
│
├── .automatosx/              # User project directory (created by init)
│   ├── config.json           # User configuration
│   ├── agents/               # User's custom agents
│   │   ├── coder.yaml
│   │   └── ...
│   ├── abilities/            # User's custom abilities
│   │   └── ...
│   ├── memory/               # Memory storage
│   │   └── memory.db         # SQLite + vec database
│   └── workspaces/           # Agent workspaces (isolated)
│       ├── coder/            # Charlie's workspace
│       ├── reviewer/
│       └── ...
│
├── tmp/                      # Temporary files (gitignored)
│   ├── work-logs/            # Development logs
│   ├── analysis/             # Analysis documents
│   └── ...
│
├── package.json              # NPM package config
├── tsconfig.json             # TypeScript config
├── vitest.config.ts          # Testing config
├── tsup.config.ts            # Build config
├── README.md                 # Project README
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT License
└── .gitignore                # Git ignore rules
```

## Module Import Hierarchy

**Dependency flow (imports only from lower layers):**

```
Layer 1 (Foundation):
  types/              → No dependencies

Layer 2 (Utilities):
  utils/logger        → types/logger
  utils/errors        → (standalone)
  utils/error-formatter → (standalone)

Layer 3 (Core):
  core/config         → types/config, utils/logger
  core/path-resolver  → types/path, utils/logger, utils/errors
  core/cache          → utils/logger
  core/lazy-loader    → utils/logger
  core/memory-manager → types/memory, utils/logger
  core/router         → types/provider, utils/logger

Layer 4 (Providers):
  providers/base      → types/provider
  providers/claude    → types/provider, core/router
  providers/gemini    → types/provider, core/router
  providers/openai    → types/provider

Layer 5 (Agents):
  agents/profile-loader    → types/agent, core/cache, utils/logger
  agents/abilities-manager → utils/logger
  agents/context-manager   → types/agent, core/*, agents/profile-loader
  agents/executor          → types/agent, types/provider, utils/*

Layer 6 (CLI):
  cli/commands/*      → All of the above
  cli/index           → cli/commands/*
```

**Rule:** Higher layers can import from lower layers, never vice versa.

## File Naming Conventions

### TypeScript Files

**Format:** `kebab-case.ts`

```
✅ Good:
  path-resolver.ts
  memory-manager.ts
  claude-provider.ts

❌ Bad:
  PathResolver.ts    # PascalCase (wrong)
  path_resolver.ts   # snake_case (wrong)
  pathResolver.ts    # camelCase (wrong)
```

### Test Files

**Format:** `{module-name}.test.ts`

```
✅ Good:
  path-resolver.test.ts       # Co-located with source
  memory-manager.test.ts
  cli-config.test.ts

❌ Bad:
  path-resolver.spec.ts       # .spec not used
  test-path-resolver.ts       # Prefix not used
  path-resolver-test.ts       # Wrong suffix position
```

### Type Files

**Format:** `{concept}.ts` (no -types suffix)

```
✅ Good:
  types/agent.ts
  types/provider.ts
  types/memory.ts

❌ Bad:
  types/agent-types.ts        # Redundant -types
  types/AgentTypes.ts         # PascalCase (wrong)
```

### Configuration Files

**YAML for agents:**
```
examples/agents/coder.yaml
examples/agents/reviewer.yaml
.automatosx/agents/my-custom-agent.yaml
```

**Markdown for abilities:**
```
examples/abilities/code-generation.md
examples/abilities/our-coding-standards.md
.automatosx/abilities/my-custom-ability.md
```

**JSON for config:**
```
.automatosx/config.json
package.json
```

## Import Patterns

### ESM Imports (Always use .js extension)

```typescript
// ✅ Good: Full path with .js
import { PathResolver } from '../core/path-resolver.js';
import { AgentProfile } from '../types/agent.js';
import { logger } from '../utils/logger.js';

// ❌ Bad: Missing .js extension
import { PathResolver } from '../core/path-resolver';
```

### Type-only Imports

```typescript
// ✅ Good: type-only imports
import type { AgentProfile } from '../types/agent.js';
import type { Provider } from '../types/provider.js';

// Use when importing only for types (enables better tree-shaking)
```

### Relative vs Absolute

**Use relative imports within same module:**
```typescript
// In src/agents/executor.ts
import { ContextManager } from './context-manager.js';  // Same directory
import { ProfileLoader } from './profile-loader.js';    // Same directory
```

**Use relative imports to other modules:**
```typescript
// In src/agents/executor.ts
import { PathResolver } from '../core/path-resolver.js';  // Different module
import type { Provider } from '../types/provider.js';     // Different module
```

## Configuration Files Location

### User Configuration

**Location:** `.automatosx/config.json`

```json
{
  "providers": {
    "claude": { "apiKey": "..." },
    "gemini": { "apiKey": "..." }
  },
  "defaults": {
    "provider": "claude",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### Agent Profiles

**Built-in:** `examples/agents/*.yaml`
**User custom:** `.automatosx/agents/*.yaml`

**Search order:**
1. `.automatosx/agents/{name}.yaml` (user custom)
2. `examples/agents/{name}.yaml` (built-in)

### Abilities

**Built-in:** `examples/abilities/*.md`
**User custom:** `.automatosx/abilities/*.md`

**Search order:**
1. `.automatosx/abilities/{name}.md` (user custom)
2. `examples/abilities/{name}.md` (built-in)

## Build Output

### Distribution Files

**Location:** `dist/`

```
dist/
├── index.js         # Bundled CLI (ESM, 205KB)
├── index.js.map     # Source map for debugging
└── index.d.ts       # Type definitions (minimal)
```

**Entry point:** `dist/index.js`

**Bundle target:**
- Format: ESM
- Target: Node 20+
- Size: <250KB (currently 205KB)
- Tree-shaking: Enabled

## Workspace Structure

### Agent Workspaces

**Location:** `.automatosx/workspaces/{agent-name}/`

**Purpose:** Isolated workspace for agent file operations

**Permissions:**
- Unix: 700 (owner only)
- Windows: User only

**Example:**
```
.automatosx/workspaces/
├── coder/              # Charlie's workspace
│   ├── output.ts
│   ├── test.ts
│   └── ...
├── reviewer/
└── ...
```

### Memory Storage

**Location:** `.automatosx/memory/memory.db`

**Format:** SQLite database with sqlite-vec extension

**Tables:**
- `memories` - Memory entries with embeddings
- `vec_memories` - Vector index (HNSW)

## Path Resolution Rules

### Project Root Detection

**Search order:**
1. `.git` directory → Use git root
2. `package.json` → Use package root
3. Fallback → Use current directory

### Security Boundaries

**Allowed reads:**
- `{projectRoot}/**/*` (validated by PathResolver)

**Allowed writes:**
- `.automatosx/workspaces/{agent-name}/**/*` only

**Forbidden:**
- Path traversal (`../../../etc/passwd`)
- Symbolic links outside project
- Writing outside workspace

## Testing Structure

### Test Organization

**Unit tests:** `tests/unit/{module-name}.test.ts`
- Test individual modules in isolation
- Mock external dependencies
- Fast execution (<1s per suite)

**Integration tests:** `tests/integration/cli-{command}.test.ts`
- Test CLI command integration
- Use real file system (in temp dir)
- Mock providers (AUTOMATOSX_MOCK_PROVIDERS=true)

**E2E tests:** `tests/e2e/{workflow}.test.ts`
- Test complete user workflows
- Real file system, real config
- Mock providers

### Test Fixtures

**Location:** `tests/fixtures/`

```typescript
// test-helpers.ts
export function createTestContext() { }
export function cleanupTestDir() { }

// mock-providers.ts
export class MockClaudeProvider implements Provider { }
```

## NPM Package Structure

### Published Files

**Included in npm package:**
```
dist/           # Build output
examples/       # Example agents & abilities
README.md
LICENSE
CHANGELOG.md
package.json
```

**Excluded from npm package:**
```
src/            # Source (not needed in package)
tests/          # Tests (not needed in package)
PRD/            # Docs (not needed in package)
tmp/            # Temporary files
.automatosx/    # User data (never published)
```

### Package.json Main Fields

```json
{
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "automatosx": "./dist/index.js",
    "ax": "./dist/index.js"
  },
  "files": [
    "dist",
    "examples",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ]
}
```

---

**Last Updated:** 2025-10-07
**For:** AutomatosX v4.0+
