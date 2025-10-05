# Path Resolution Strategy

**Document Version**: 1.0
**Created**: 2025-10-04
**Status**: Draft - Phase 0 Validation

---

## Overview

This document defines the path resolution strategy for AutomatosX v4.0, addressing how the system handles three distinct directory contexts:

1. **User's Project Directory** - Where the user's code lives
2. **Working Directory** - Where commands are executed
3. **Agent Workspace** - Where agents perform isolated work

---

## Problem Statement

### Current Gap in PRD

The original v4.0 PRD defined agent workspace isolation but did not address:
- How agents access user's project files
- How to detect the user's project root
- How to resolve relative paths in user commands
- How to prevent path traversal attacks across directory boundaries

### Real-World Usage Scenarios

```bash
# Scenario 1: User in project root
cd /path/to/my-app
automatosx run backend "analyze this codebase"
# Agent needs to know: /path/to/my-app is the project root

# Scenario 2: User in subdirectory
cd /path/to/my-app/src/components
automatosx run frontend "refactor this component"
# Agent needs to find: /path/to/my-app (not /path/to/my-app/src/components)

# Scenario 3: User with relative paths
cd /path/to/my-app
automatosx run backend "analyze ./src/api/**/*.ts"
# Agent needs to resolve: ./src/api relative to /path/to/my-app
```

---

## Architecture

### Three Directory Contexts

```typescript
interface ExecutionContext {
  // User's project root (auto-detected)
  projectDir: string;      // e.g., /path/to/my-app

  // Command execution location
  workingDir: string;      // e.g., /path/to/my-app/src (process.cwd())

  // Agent's isolated workspace
  agentWorkspace: string;  // e.g., /path/to/my-app/.automatosx/workspaces/backend
}
```

### Directory Responsibility Matrix

| Directory Type | Path Example | Purpose | Owner | Git Tracked | Access Rules |
|---------------|--------------|---------|-------|-------------|--------------|
| **Project Directory** | `/path/to/my-app` | User's project root | User | ✅ User's repo | Read-only for agents |
| **Working Directory** | `process.cwd()` | Command execution location | User | ✅ User's repo | Read-only for agents |
| **Agent Workspace** | `.automatosx/workspaces/backend` | Agent's temporary files | AutomatosX | ❌ .gitignore | Read/Write for agents |

---

## Project Root Detection Strategy

### Detection Algorithm (Priority Order)

```typescript
async function detectProjectRoot(startDir: string = process.cwd()): Promise<string> {
  // Priority 1: Find .git directory (most reliable for git projects)
  const gitRoot = await findGitRoot(startDir);
  if (gitRoot) return gitRoot;

  // Priority 2: Find package.json (Node.js projects)
  const packageRoot = await findPackageJsonRoot(startDir);
  if (packageRoot) return packageRoot;

  // Priority 3: Find other project markers
  const markerRoot = await findProjectMarker(startDir, [
    'pyproject.toml',  // Python
    'Cargo.toml',      // Rust
    'go.mod',          // Go
    'pom.xml',         // Java/Maven
    'build.gradle',    // Java/Gradle
    '.automatosx'      // AutomatosX project marker
  ]);
  if (markerRoot) return markerRoot;

  // Priority 4: Fallback to working directory
  return startDir;
}
```

### Implementation with find-up

```typescript
import { findUp } from 'find-up';
import { resolve, dirname } from 'path';

async function findGitRoot(startDir: string): Promise<string | null> {
  const gitDir = await findUp('.git', {
    cwd: startDir,
    type: 'directory'
  });
  return gitDir ? dirname(gitDir) : null;
}

async function findPackageJsonRoot(startDir: string): Promise<string | null> {
  const pkgJson = await findUp('package.json', {
    cwd: startDir
  });
  return pkgJson ? dirname(pkgJson) : null;
}

async function findProjectMarker(
  startDir: string,
  markers: string[]
): Promise<string | null> {
  for (const marker of markers) {
    const found = await findUp(marker, { cwd: startDir });
    if (found) return dirname(found);
  }
  return null;
}
```

---

## Path Resolution Rules

### 1. Absolute Paths

```typescript
// User provides absolute path
const userPath = '/absolute/path/to/file.ts';

// Resolution: Use as-is after validation
const resolved = validateAndResolve(userPath);
```

**Rules**:
- ✅ Accept if within project directory
- ❌ Reject if outside project directory (security)
- ⚠️ Warn if accessing system files

### 2. Relative Paths (`./ or ../`)

```typescript
// User provides relative path
const userPath = './src/api/handler.ts';

// Resolution: Relative to working directory
const resolved = resolve(context.workingDir, userPath);
```

**Rules**:
- Resolve relative to `workingDir` (where command was run)
- Validate result is within `projectDir`
- Reject path traversal attempts (`../../../etc/passwd`)

### 3. Glob Patterns

```typescript
// User provides glob pattern
const userPattern = 'src/**/*.ts';

// Resolution: Relative to project root
const baseDir = context.projectDir;
const matches = await glob(userPattern, { cwd: baseDir });
```

**Rules**:
- Glob patterns always relative to project root
- Apply same boundary validation to matches
- Respect `.gitignore` and `.automatosxignore`

### 4. Agent Workspace Paths

```typescript
// Agent writes to workspace
const agentFile = 'analysis-results.json';

// Resolution: Always within agent workspace
const resolved = resolve(context.agentWorkspace, agentFile);
```

**Rules**:
- Agent can read/write freely within workspace
- Agent reads user files (read-only, validated)
- Agent cannot write to user's project directory

---

## Security Considerations

### Path Traversal Prevention

```typescript
function validatePath(path: string, baseDir: string): boolean {
  const normalized = resolve(path);
  const base = resolve(baseDir);

  // Check if path starts with baseDir
  if (!normalized.startsWith(base)) {
    throw new SecurityError('Path traversal detected', {
      path: normalized,
      allowed: base
    });
  }

  return true;
}
```

### Dangerous Path Patterns

**Reject**:
- `../../../etc/passwd` - System file access
- `~/.ssh/id_rsa` - User credentials
- `/proc/self/environ` - Process environment
- `\\?\C:\Windows\System32` - Windows system (if on Windows)

**Allow with Warning**:
- Paths to common config files (`.env`, `config.json`)
- Should require explicit user confirmation

### Boundary Validation

```typescript
interface PathBoundaries {
  projectDir: string;      // User's project
  agentWorkspace: string;  // Agent's workspace
  systemDirs: string[];    // System directories (read-only, restricted)
}

function checkBoundaries(path: string, boundaries: PathBoundaries): PathType {
  const normalized = resolve(path);

  // Check if in agent workspace (full access)
  if (normalized.startsWith(boundaries.agentWorkspace)) {
    return 'agent_workspace';
  }

  // Check if in project directory (read-only)
  if (normalized.startsWith(boundaries.projectDir)) {
    return 'user_project';
  }

  // Check if system directory (restricted)
  for (const sysDir of boundaries.systemDirs) {
    if (normalized.startsWith(sysDir)) {
      return 'system_restricted';
    }
  }

  // Outside all boundaries (deny)
  return 'outside_boundaries';
}
```

---

## API Design

### PathResolver Class

```typescript
interface PathResolverConfig {
  projectDir: string;
  workingDir: string;
  agentWorkspace: string;
  allowSystemAccess?: boolean;
}

class PathResolver {
  constructor(private config: PathResolverConfig) {}

  // Resolve user-provided path
  resolveUserPath(userPath: string): string {
    // Handle absolute vs relative
    const resolved = this.resolvePath(userPath, this.config.workingDir);

    // Validate within project boundaries
    this.validateInProject(resolved);

    return resolved;
  }

  // Resolve agent workspace path
  resolveWorkspacePath(agentPath: string): string {
    return resolve(this.config.agentWorkspace, agentPath);
  }

  // Resolve glob pattern
  async resolveGlobPattern(pattern: string): Promise<string[]> {
    const baseDir = this.config.projectDir;
    return await glob(pattern, {
      cwd: baseDir,
      ignore: await this.getIgnorePatterns()
    });
  }

  // Validate path safety
  private validateInProject(path: string): void {
    if (!path.startsWith(this.config.projectDir)) {
      throw new PathError('Path outside project directory', {
        path,
        projectDir: this.config.projectDir
      });
    }
  }

  // Get ignore patterns (.gitignore + .automatosxignore)
  private async getIgnorePatterns(): Promise<string[]> {
    return [
      'node_modules/**',
      '.git/**',
      '.automatosx/**',
      ...(await this.readGitignore()),
      ...(await this.readAutomatosxIgnore())
    ];
  }
}
```

### Usage Examples

```typescript
// Initialize resolver
const resolver = new PathResolver({
  projectDir: '/path/to/my-app',
  workingDir: '/path/to/my-app/src',
  agentWorkspace: '/path/to/my-app/.automatosx/workspaces/backend'
});

// Example 1: User provides relative path
const userFile = resolver.resolveUserPath('./api/handler.ts');
// Result: /path/to/my-app/src/api/handler.ts

// Example 2: User provides glob pattern
const tsFiles = await resolver.resolveGlobPattern('src/**/*.ts');
// Result: ['/path/to/my-app/src/index.ts', '/path/to/my-app/src/api/handler.ts', ...]

// Example 3: Agent writes to workspace
const agentFile = resolver.resolveWorkspacePath('analysis.json');
// Result: /path/to/my-app/.automatosx/workspaces/backend/analysis.json
```

---

## Integration with ExecutionContext

```typescript
class ContextManager {
  async createContext(
    agent: string,
    task: string,
    options?: ContextOptions
  ): Promise<ExecutionContext> {
    // Detect project root
    const projectDir = options?.projectDir ||
      await this.detectProjectRoot(options?.workingDir);

    const workingDir = options?.workingDir || process.cwd();
    const agentWorkspace = resolve(projectDir, '.automatosx/workspaces', agent);

    // Create workspace if not exists
    await fs.mkdir(agentWorkspace, { recursive: true });

    // Create path resolver
    const pathResolver = new PathResolver({
      projectDir,
      workingDir,
      agentWorkspace
    });

    return {
      agent: await this.loadAgent(agent),
      task,
      memory: await this.loadMemory(agent),
      projectDir,
      workingDir,
      agentWorkspace,
      pathResolver,  // NEW: Expose path resolver
      config: await this.loadConfig()
    };
  }

  private async detectProjectRoot(startDir?: string): Promise<string> {
    // Implementation from "Project Root Detection Strategy"
    return detectProjectRoot(startDir || process.cwd());
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('PathResolver', () => {
  let resolver: PathResolver;

  beforeEach(() => {
    resolver = new PathResolver({
      projectDir: '/project',
      workingDir: '/project/src',
      agentWorkspace: '/project/.automatosx/workspaces/test'
    });
  });

  describe('resolveUserPath', () => {
    it('should resolve relative paths from working directory', () => {
      expect(resolver.resolveUserPath('./file.ts'))
        .toBe('/project/src/file.ts');
    });

    it('should reject path traversal attempts', () => {
      expect(() => resolver.resolveUserPath('../../../etc/passwd'))
        .toThrow(PathError);
    });

    it('should accept absolute paths within project', () => {
      expect(resolver.resolveUserPath('/project/src/file.ts'))
        .toBe('/project/src/file.ts');
    });

    it('should reject absolute paths outside project', () => {
      expect(() => resolver.resolveUserPath('/etc/passwd'))
        .toThrow(PathError);
    });
  });

  describe('resolveWorkspacePath', () => {
    it('should resolve paths within agent workspace', () => {
      expect(resolver.resolveWorkspacePath('output.json'))
        .toBe('/project/.automatosx/workspaces/test/output.json');
    });

    it('should handle nested paths', () => {
      expect(resolver.resolveWorkspacePath('analysis/report.md'))
        .toBe('/project/.automatosx/workspaces/test/analysis/report.md');
    });
  });
});
```

### Integration Tests

```typescript
describe('Project Root Detection', () => {
  it('should detect git root', async () => {
    const tmpDir = await createTempGitRepo();
    const subDir = join(tmpDir, 'src/components');
    await fs.mkdir(subDir, { recursive: true });

    const root = await detectProjectRoot(subDir);
    expect(root).toBe(tmpDir);
  });

  it('should detect package.json root', async () => {
    const tmpDir = await createTempDir();
    await fs.writeFile(join(tmpDir, 'package.json'), '{}');
    const subDir = join(tmpDir, 'src');
    await fs.mkdir(subDir);

    const root = await detectProjectRoot(subDir);
    expect(root).toBe(tmpDir);
  });

  it('should fallback to cwd if no markers found', async () => {
    const tmpDir = await createTempDir();
    const root = await detectProjectRoot(tmpDir);
    expect(root).toBe(tmpDir);
  });
});
```

---

## Phase 0 Validation Tasks

### Week 1: Prototype Implementation

1. ✅ Implement `detectProjectRoot()` with find-up
2. ✅ Implement `PathResolver` class
3. ✅ Write unit tests for path resolution
4. ✅ Write integration tests for project detection

### Week 2: Real-World Testing

1. ✅ Test on various project types:
   - Node.js projects (package.json)
   - Git repositories (.git)
   - Python projects (pyproject.toml)
   - Monorepos (multiple package.json)
2. ✅ Test edge cases:
   - Symlinks
   - Network drives (if applicable)
   - Case-sensitive vs case-insensitive filesystems

### Week 3-4: Security Validation

1. ✅ Penetration testing for path traversal
2. ✅ Boundary validation testing
3. ✅ Performance testing (path resolution overhead)

---

## Migration from v3.x

### v3.x Behavior (Unknown)

Need to investigate:
- How does v3.x handle user project paths?
- Does v3.x auto-detect project root?
- What path resolution strategy does v3.x use?

**Action**: Review v3.x codebase in `/Users/akiralam/Desktop/defai/automatosx.old/`

### Compatibility Considerations

If v3.x users expect certain path behaviors:
- Document any breaking changes
- Provide compatibility flags if needed
- Migration guide for path-related configurations

---

## Future Enhancements

### v4.1+: Advanced Features

1. **Multi-Project Support**
   - Support monorepos with multiple projects
   - Workspace-based project detection (similar to VS Code)

2. **Custom Project Markers**
   - Allow users to define custom project root markers
   - Configuration: `automatosx.config.json`
     ```json
     {
       "projectMarkers": [".myproject", "PROJECT.toml"]
     }
     ```

3. **Remote Filesystem Support**
   - Network drives
   - Cloud storage (when mounted)

4. **Path Resolution Plugins**
   - Allow custom path resolution strategies
   - Useful for non-standard project structures

---

## References

### Industry Standards

- **Git**: Working tree vs .git directory separation
- **npm**: Project root detection (package.json)
- **VS Code**: Workspace folder resolution
- **Docker**: Volume mounting and path mapping
- **find-up**: Node.js library for finding files upwards in directory tree

### Security Best Practices

- OWASP: Path Traversal Prevention
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory
- Node.js Security Best Practices: File System Access

---

**Last Updated**: 2025-10-04
**Status**: Draft - Awaiting Phase 0 validation
**Next Steps**: Implement prototype in `/tmp/phase0-prototypes/03-path-resolution-poc.ts`
