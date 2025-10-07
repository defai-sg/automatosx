# Our Coding Standards - AutomatosX v4

> Project-specific coding standards for AutomatosX

## TypeScript Standards

### Type Safety (Strict Mode)

**Always use strict TypeScript:**
```typescript
// tsconfig.json enforces:
// - strict: true
// - noUncheckedIndexedAccess: true
// - noImplicitOverride: true
// - noFallthroughCasesInSwitch: true
```

**Type annotations:**
```typescript
// ✅ Good: Explicit types for public APIs
export function loadProfile(name: string): Promise<AgentProfile> {
  // ...
}

// ✅ Good: Type parameters
export class TTLCache<T> {
  get(key: string): T | undefined { }
}

// ❌ Bad: Any types
function process(data: any) { } // Never use any!
```

### Error Handling

**Use custom error classes:**
```typescript
// ✅ Good: Typed errors from utils/errors.ts
import { AgentValidationError, PathError } from '../utils/errors.js';

if (!profile.name) {
  throw new AgentValidationError('Missing required field: name');
}

if (path.includes('..')) {
  throw PathError.traversal(path);
}

// ❌ Bad: Generic Error
throw new Error('Something went wrong'); // Too vague
```

**Error context:**
```typescript
// ✅ Good: Include context
try {
  await executeTask();
} catch (error) {
  logger.error('Task execution failed', {
    task: taskName,
    agent: agentName,
    error: (error as Error).message
  });
  throw error;
}
```

### Module System

**ESM with .js extensions:**
```typescript
// ✅ Good: .js extension in imports (required for ESM)
import { PathResolver } from '../core/path-resolver.js';
import type { AgentProfile } from '../types/agent.js';

// ❌ Bad: No extension
import { PathResolver } from '../core/path-resolver'; // Won't work
```

### File Organization

**Directory structure:**
```
src/
├── core/           # Core modules (Router, PathResolver, MemoryManager)
├── agents/         # Agent system (ProfileLoader, AbilitiesManager, ContextManager)
├── providers/      # Provider implementations (Claude, Gemini, OpenAI)
├── cli/            # CLI commands
├── types/          # TypeScript type definitions
└── utils/          # Utilities (logger, errors, formatters)
```

**File naming:**
- Use kebab-case: `path-resolver.ts`, `memory-manager.ts`
- Types: `agent.ts`, `provider.ts` (no -types suffix)
- Tests: `path-resolver.test.ts` (co-located with source)

## Code Quality Standards

### Function Size

**Keep functions small (<50 lines):**
```typescript
// ✅ Good: Small, focused function
private buildPrompt(context: ExecutionContext): string {
  let prompt = '';

  if (context.abilities) {
    prompt += `# Your Abilities\n\n${context.abilities}\n\n`;
  }

  if (context.agent.stages) {
    prompt += this.buildStagesSection(context.agent.stages);
  }

  prompt += `# Task\n\n${context.task}`;
  return prompt;
}

// Break down large functions into smaller helpers
private buildStagesSection(stages: Stage[]): string {
  // ...
}
```

### Naming Conventions

**Variables and functions:**
```typescript
// ✅ Good: Descriptive names
const profilePath = join(profilesDir, `${name}.yaml`);
async function resolveAgentName(input: string): Promise<string> { }

// ❌ Bad: Vague names
const p = join(dir, `${n}.yaml`);
async function resolve(x: string): Promise<string> { }
```

**Classes:**
```typescript
// ✅ Good: PascalCase, descriptive
export class PathResolver { }
export class MemoryManager { }

// ❌ Bad: Abbreviations
export class PathRes { }  // Too short
export class PM { }      // Unclear
```

### Comments and Documentation

**JSDoc for public APIs:**
```typescript
/**
 * Load agent profile from YAML file
 *
 * @param name - Agent name (e.g., "coder", "reviewer")
 * @returns Validated AgentProfile
 * @throws AgentNotFoundError if profile doesn't exist
 * @throws AgentValidationError if profile is invalid
 */
async loadProfile(name: string): Promise<AgentProfile> {
  // ...
}
```

**Inline comments for complex logic:**
```typescript
// Security: Validate path to prevent traversal attacks
const resolvedPath = resolve(userPath);
if (!resolvedPath.startsWith(projectRoot)) {
  throw PathError.traversal(userPath);
}
```

## Security Standards

### Path Validation

**Always use PathResolver:**
```typescript
// ✅ Good: Use PathResolver for all file access
import { PathResolver } from '../core/path-resolver.js';

const resolver = new PathResolver({ projectRoot });
const safePath = await resolver.resolve(userInput);

// ❌ Bad: Direct path manipulation
const path = join(projectRoot, userInput); // Unsafe!
```

### Input Sanitization

**Sanitize user inputs:**
```typescript
// ✅ Good: Sanitize before using in file system
const agentDirName = agentName
  .replace(/[^a-zA-Z0-9-]/g, '-')
  .toLowerCase();

const workspace = join(projectRoot, '.automatosx', 'workspaces', agentDirName);
```

**File size limits:**
```typescript
// ✅ Good: Prevent DoS with size limits
if (content.length > 100 * 1024) {
  throw new AgentValidationError('Profile file too large (max 100KB)');
}
```

### Permissions

**Restrictive permissions on Unix:**
```typescript
// ✅ Good: Restrict workspace permissions
if (process.platform !== 'win32') {
  await chmod(agentWorkspace, 0o700); // Owner only
}
```

## Testing Standards

### Test Structure

**Use Vitest with describe/it:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('PathResolver', () => {
  let resolver: PathResolver;

  beforeEach(() => {
    resolver = new PathResolver({ projectRoot: '/test' });
  });

  it('should resolve relative paths', async () => {
    const result = await resolver.resolve('./file.txt');
    expect(result).toBe('/test/file.txt');
  });

  it('should reject path traversal', async () => {
    await expect(
      resolver.resolve('../../../etc/passwd')
    ).rejects.toThrow(PathError);
  });
});
```

### Coverage Targets

- **Overall:** 70%+ (currently 84%)
- **Core modules:** 85%+
- **CLI commands:** 70%+
- **Utils:** 90%+

## Logging Standards

### Use Structured Logging

**Always use logger from utils/logger:**
```typescript
import { logger } from '../utils/logger.js';

// ✅ Good: Structured logging with context
logger.info('Profile loaded', {
  name: profileName,
  path: profilePath
});

logger.error('Execution failed', {
  agent: agentName,
  task: taskSummary,
  error: (error as Error).message
});

// ❌ Bad: Console.log
console.log('Profile loaded'); // No structure, no context
```

### Log Levels

- **debug:** Development details
- **info:** Normal operations
- **warn:** Recoverable issues
- **error:** Failures requiring attention

## Performance Standards

### Lazy Loading

**Defer expensive operations:**
```typescript
// ✅ Good: Lazy load heavy dependencies
async executeTask() {
  const { spawn } = await import('child_process'); // Load when needed
  // ...
}
```

### Caching

**Use TTLCache for expensive operations:**
```typescript
// ✅ Good: Cache profiles with TTL
this.cache = new TTLCache<AgentProfile>({
  maxEntries: 20,
  ttl: 300000, // 5 minutes
  cleanupInterval: 60000
});
```

### Bundle Size

**Target: <250KB**
- Current: 205KB ✅
- Avoid large dependencies
- Use tree-shaking friendly imports

## Git Commit Standards

### Conventional Commits

**Format:** `type(scope): message`

```bash
# Types
feat(agents): add stage injection to executor
fix(memory): resolve vector search timeout
docs(readme): update installation instructions
test(router): add retry logic tests
refactor(cli): simplify command parsing
perf(cache): optimize TTL cleanup interval
```

### Commit Messages

```bash
# ✅ Good: Clear, specific
feat(stages): inject workflow stages into prompt

- Add Stage and Personality interfaces to types
- Update ProfileLoader to parse stages from YAML
- Modify Executor to include stages in prompt
- Add ~560 tokens per request for structured workflow

# ❌ Bad: Vague
fix: bug fix
update: changes
```

## Code Review Checklist

When reviewing code:

- [ ] Type safety: No `any` types, all public APIs typed
- [ ] Error handling: Custom errors with context
- [ ] Security: Path validation, input sanitization
- [ ] Testing: Tests added, coverage maintained
- [ ] Performance: No obvious bottlenecks
- [ ] Logging: Structured logs with context
- [ ] Documentation: JSDoc for public APIs
- [ ] Bundle size: No large dependencies added

---

**Last Updated:** 2025-10-07
**For:** AutomatosX v4.0+
