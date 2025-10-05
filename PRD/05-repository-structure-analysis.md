# AutomatosX Repository Structure & Installation Analysis

## Repository File Structure Analysis

### Root Level Structure

```
automatosx.old/
├── .claude/                    # Claude Code integration (project-level)
├── .defai/                     # Runtime data directory (gitignored)
├── .example-memory/            # Example memory structure
├── .test-concurrent-*/         # Test directories (gitignored)
├── backup/                     # Configuration backups
├── config/                     # Configuration templates
├── docs/                       # Documentation
├── src/                        # Source code
├── tmp/                        # Temporary files
├── workspaces/                 # Agent workspaces
├── package.json                # NPM package definition
├── package-lock.json           # NPM lock file
├── automatosx.config.yaml      # User configuration
├── README.md                   # Main documentation
├── CLAUDE.md                   # Claude Code guidance
├── GEMINI.md                   # Gemini CLI guidance
├── AGENTS.md                   # Agent descriptions
├── CONTRIBUTING.md             # Contribution guidelines
├── SECURITY.md                 # Security policies
├── RELEASE.md                  # Release notes
├── LICENSE                     # Apache 2.0 license
├── .gitignore                  # Git ignore rules
├── .npmignore                  # NPM ignore rules
├── .markdownlint.json          # Markdown linting config
└── .markdownlintignore         # Markdown linting ignore
```

### Source Directory Structure

```
src/
├── __tests__/                  # Test suites
│   ├── integration-examples/   # Integration tests
│   ├── concurrent-memory-test.js
│   └── enhanced-system-test.js
├── agents/                     # Agent profiles and abilities
│   ├── _global/               # Shared abilities for all agents
│   │   └── abilities/         # Global markdown ability files
│   ├── [role]/                # Individual agent directories
│   │   ├── profile.yaml       # Agent YAML configuration
│   │   └── abilities/         # Role-specific abilities
│   └── agent-profiles.js      # Auto-generated agent personalities
├── bin/                       # CLI executables
│   └── automatosx.js          # Global CLI entry point
├── commands/                  # CLI command handlers
│   ├── abilities.js
│   ├── agent.js
│   └── memory.js
├── config/                    # Configuration files
│   ├── agent-provider-matrix.json
│   ├── model-templates.yaml
│   ├── optimized-memory.yaml
│   └── providers.json
├── core/                      # Core orchestration engine
│   ├── enhanced-router.js         # Main orchestration
│   ├── router.js                  # Basic router
│   ├── workflow-router.js         # Multi-agent workflows
│   ├── profile-manager.js         # Agent profile loading
│   ├── chat-history.js            # Memory integration
│   ├── circuit-breaker.js         # Provider reliability
│   ├── agent-manager.js           # Agent lifecycle
│   ├── abilities.js               # Abilities loader
│   ├── enhanced-abilities-manager.js
│   ├── memory.js                  # Memory abstraction
│   ├── filesystem-manager.js      # Safe file operations
│   ├── workspace-manager.js       # Workspace isolation
│   ├── security-validator.js      # Input validation
│   ├── provider-connection-pool.js
│   └── router-performance-optimizer.js
├── memory/                    # Memory system implementations
│   ├── sqlite-vector-store.js     # SQLite + vec integration
│   ├── embedded-vector-db.js      # Vector database abstraction
│   ├── hybrid-memory-system.js    # Multi-layer memory
│   ├── practical-memory-system.js # Production memory
│   ├── write-queue-manager.js     # Concurrent write coordination
│   ├── memory-server-client.js    # HTTP client
│   ├── enhanced-memory-manager.js
│   └── enhanced-memory-config.js
├── providers/                 # Provider implementations
│   ├── claude-code.js            # Claude CLI provider
│   ├── gemini-cli.js             # Gemini CLI provider
│   ├── openai-cli.js             # OpenAI CLI provider
│   └── provider-manager.js       # Provider coordination
├── scripts/                   # Operational scripts
│   ├── post-install.js           # NPM postinstall hook
│   ├── uninstall.js              # Uninstall cleanup
│   ├── build.js                  # Build agent profiles
│   ├── reset-config.js           # Reset operations
│   ├── memory-clear.js           # Clear memory
│   ├── system-health.js          # Health checks
│   ├── upgrade-manager.js        # Version upgrades
│   ├── agent-provider-optimizer.js
│   ├── start-memory-server.js
│   ├── test-memory-server.js
│   └── utils/                    # Script utilities
├── shared/                    # Shared resources
│   ├── analysis/                 # Analysis tools
│   ├── components/               # Reusable components
│   └── templates/                # Templates
├── utils/                     # Utility functions
│   ├── config-loader.js
│   ├── yaml-inheritance.js
│   ├── model-template-resolver.js
│   ├── style-loader.js
│   ├── create-role.js
│   └── remove-role.js
└── index.js                   # Main entry point
```

### Claude Code Integration Structure

```
.claude/                       # Project-level Claude integration
├── commands/                  # Slash commands
│   └── ax/                   # AutomatosX commands namespace
│       ├── agent.md          # /ax:agent command definition
│       ├── agent-wrapper.js  # Command execution wrapper
│       ├── init.md           # /ax:init command
│       ├── clear.md          # /ax:clear command
│       ├── help.md           # /ax:help command
│       └── mcp.md            # /ax:mcp command
├── mcp/                      # MCP server configuration
│   └── ax/                   # AutomatosX MCP namespace
│       ├── automatosx.json   # MCP server config
│       └── http-memory-server.js  # Memory server
├── metrics/                  # Usage metrics (empty)
├── styles/                   # Custom styles
│   └── ax/                   # AutomatosX styles namespace
└── settings.local.json       # Local settings
```

### Runtime Data Structure (.defai)

```
.defai/                        # Runtime directory (gitignored)
├── backups/                   # Automatic backups
│   └── user-data-[timestamp]/
│       ├── automatosx.config.yaml
│       └── src/               # Source backups
├── src/                       # Runtime copy of source code
│   ├── agents/               # All agent profiles
│   ├── bin/
│   ├── commands/
│   ├── config/
│   ├── core/
│   ├── index.js
│   ├── memory/
│   ├── providers/
│   ├── scripts/
│   ├── shared/
│   └── utils/
├── memory/                    # Memory storage
│   ├── chat-history.db       # SQLite with vec extension
│   ├── vectors.db            # Vector embeddings storage
│   ├── server.port           # Memory server port file
│   └── *.json                # JSON memory backups
├── workspaces/                # Agent execution workspaces
│   └── [agent-name]/         # Isolated workspace per agent
└── filesystem-map.json        # File system mapping metadata
```

## Installation Process Analysis

### NPM Package Installation Flow

#### 1. Global Installation (`npm install -g automatosx`)

**Process**:
```bash
npm install -g automatosx
  ↓
Downloads package from npm registry
  ↓
Installs to global node_modules
  ↓
Creates global bin symlink: automatosx → src/bin/automatosx.js
  ↓
Runs postinstall script (does NOT run for global installs)
```

**Global Installation Path**:
- macOS/Linux: `/usr/local/lib/node_modules/automatosx/`
- Windows: `%AppData%\npm\node_modules\automatosx\`

**Issue**: Global installations do NOT trigger `postinstall` script, so `.defai` and `.claude` directories are not created globally.

#### 2. Project-Level Installation (`npm install automatosx`)

**Process**:
```bash
npm install automatosx
  ↓
Downloads package to local node_modules
  ↓
Runs postinstall script (src/scripts/post-install.js)
  ↓
┌─────────────────────────────────────────────────┐
│ Post-Install Script Execution                   │
├─────────────────────────────────────────────────┤
│ 1. Copy src/ to .defai/src/                    │
│    - Excludes __tests__, node_modules           │
│    - Excludes *.test.js files                   │
│                                                  │
│ 2. Create .defai directories                    │
│    - .defai/                                    │
│    - .defai/workspaces/                         │
│    - .defai/memory/                             │
│                                                  │
│ 3. Create filesystem-map.json                   │
│    - File categorization                        │
│    - Operation rules (reset, upgrade, etc.)     │
│                                                  │
│ 4. Create .claude integration directories       │
│    - .claude/commands/ax/                       │
│    - .claude/mcp/ax/                            │
│    - .claude/styles/ax/                         │
│                                                  │
│ 5. Generate Claude Code integration files       │
│    - MCP config (automatosx.json)              │
│    - Memory server (http-memory-server.js)     │
│    - Slash commands (*.md)                     │
│    - Command wrapper (agent-wrapper.js)        │
└─────────────────────────────────────────────────┘
```

### Post-Install Script Deep Dive

**File**: `src/scripts/post-install.js`

**Key Operations**:

1. **Source Code Duplication**
   ```javascript
   // Copies entire src/ to .defai/src/
   await fs.copy('src/', '.defai/src/', {
     filter: (src) => {
       return !src.includes('__tests__') &&
              !src.includes('node_modules') &&
              !src.endsWith('.test.js');
     }
   });
   ```

   **Why?**: Execution happens from `.defai/src/` to keep runtime code separate from installed package

2. **Directory Creation**
   ```javascript
   await fs.ensureDir('.defai/');
   await fs.ensureDir('.defai/workspaces/');
   await fs.ensureDir('.defai/memory/');
   await fs.ensureDir('.claude/commands/ax/');
   await fs.ensureDir('.claude/mcp/ax/');
   await fs.ensureDir('.claude/styles/ax/');
   ```

3. **Filesystem Map Creation**
   - Categorizes all files into:
     - `system_core` - Original src/ files
     - `defai_runtime` - .defai/src/ copy
     - `user_configuration` - Config files
     - `user_data` - Memory and workspaces
     - `claude_integration` - Claude Code files
     - `runtime_generated` - Generated files
     - `documentation` - Docs and README

   - Defines operations:
     - `factory_reset` - What to backup/remove/preserve
     - `safe_upgrade` - Migration rules
     - `uninstall` - Cleanup rules

4. **Claude Code Integration Files**

   **a. MCP Configuration** (`.claude/mcp/ax/automatosx.json`):
   ```json
   {
     "mcpServers": {
       "automatosx-memory": {
         "command": "node",
         "args": [".claude/mcp/ax/http-memory-server.js"],
         "env": {
           "PROJECT_ROOT": "/path/to/project",
           "DEFAI_ROOT": "/path/to/project/.defai"
         }
       }
     }
   }
   ```

   **b. HTTP Memory Server** (`.claude/mcp/ax/http-memory-server.js`):
   - Lightweight HTTP server for memory coordination
   - Runs on port 3001 (auto-increments if busy)
   - Endpoints: `/health`, `/stats`
   - Saves port to `.defai/memory/server.port`

   **c. Slash Commands** (`.claude/commands/ax/*.md`):
   - `/ax:agent` - Execute agent tasks
   - `/ax:init` - Factory reset
   - `/ax:clear` - Clear memory
   - `/ax:help` - Show help
   - `/ax:mcp` - MCP server control

   **d. Command Wrapper** (`.claude/commands/ax/agent-wrapper.js`):
   ```javascript
   // Executes from .defai/src/index.js
   const projectRoot = path.resolve(__dirname, '../../..');
   const defaiRoot = path.join(projectRoot, '.defai');

   process.env.DEFAI_ROOT = defaiRoot;
   process.env.PROJECT_ROOT = projectRoot;

   await import(path.join(defaiRoot, 'src/index.js'));
   ```

## File Categorization Strategy

### Categories from filesystem-map.json

1. **system_core** - Never Modified by Users
   - `src/**/*.js` (except tests and install scripts)
   - Exceptions: `src/config/automatosx.config.template.yaml`

2. **defai_runtime** - Generated from src/
   - `.defai/src/**/*.js`
   - Regenerated on upgrade

3. **user_configuration** - User-Editable
   - `automatosx.config.yaml`
   - `.defai/config/**`
   - `src/config/providers.json`

4. **user_data** - User-Generated
   - `.defai/memory/**`
   - `.defai/workspaces/**`
   - Backed up on operations

5. **claude_integration** - Claude Code Files
   - `.claude/commands/ax/**`
   - `.claude/mcp/ax/**`
   - `.claude/styles/ax/**`

6. **runtime_generated** - Runtime Files
   - `.defai/agents/**`
   - `.defai/memory/server.port`
   - `workspaces/**`

7. **documentation** - Docs
   - `docs/**/*.md`
   - `*.md`
   - `LICENSE`

## Git Ignore Strategy

### .gitignore Analysis

**Ignored**:
- `.defai/` - All runtime data
- `.claude/` - All Claude integration files
- `memory/` - Memory databases
- `workspaces/` - Execution workspaces
- `automatosx.config.yaml` - User config
- `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` - Generated docs
- `.test-concurrent-*` - Test directories
- `.example-memory` - Example files
- `backup/` - Backups

**Tracked**:
- `src/` - All source code
- `docs/` - Documentation
- `config/` - Template configs
- `package.json`, `package-lock.json`
- `README.md`, `LICENSE`, etc.

**Rationale**:
- Keep source code and templates in Git
- Keep all runtime, user data, and generated files out of Git
- Allows clean repository with reproducible builds

### .npmignore Analysis

**Excluded from NPM Package**:
- `.git/`, `.github/` - Version control
- `__tests__/`, `*.test.js` - Test files
- `.defai/`, `.claude/` - Runtime directories
- `backup/`, `tmp/` - Temporary files
- `.vscode/`, `.idea/` - IDE configs
- `*.log`, `logs/` - Log files
- Development-only files

**Included in NPM Package**:
- `src/` - All source code
- `docs/` - Documentation
- `README.md`, `LICENSE` - Essential docs
- `package.json` - Package definition
- Config templates

**Result**: Clean package distribution (~5-10MB vs ~200MB with node_modules)

## Critical Issues Identified

### 1. Source Code Duplication

**Problem**: Post-install copies entire `src/` to `.defai/src/`

**Why It's Bad**:
- Doubles disk usage
- Sync issues between original and copy
- Updates require rebuilding
- Confusing for developers

**Better Approach**:
- Execute directly from `node_modules/automatosx/src/`
- Or use symlinks instead of copying

### 2. Global vs Local Installation Confusion

**Problem**: Different behavior for global vs local install

**Global Install**:
- No postinstall script execution
- No `.defai` or `.claude` directories created
- Manual setup required

**Local Install**:
- Full postinstall execution
- Project-level integration
- Works out of box

**Better Approach**:
- Clear documentation on recommended installation
- Single installation method (either global OR local, not both)

### 3. Complex File Categorization

**Problem**: filesystem-map.json adds complexity

**Current State**:
- 7 file categories
- Complex operation rules
- Manual maintenance required

**Better Approach**:
- Simpler structure with clear conventions
- Standard npm/node.js patterns
- Less custom tooling

### 4. .gitignore Excludes Critical Files

**Problem**: CLAUDE.md, GEMINI.md, AGENTS.md gitignored

**Impact**:
- These are helpful documentation files
- Should be tracked in Git
- Currently generated and excluded

**Better Approach**:
- Include in Git as documentation
- Remove from .gitignore

## Recommendations for v4.0

### 1. Simplified Installation

**Remove**:
- Source code duplication (`.defai/src/`)
- Complex filesystem-map.json
- Separate runtime directory

**Keep**:
- `.automatosx/` directory for runtime data only
  - `memory/` - Memory storage
  - `workspaces/` - Agent workspaces
  - `logs/` - Log files
  - `cache/` - Cached data

**Execute From**:
- `node_modules/automatosx/dist/` (bundled code)
- Or global installation location

### 2. Unified Installation Method

**Recommendation**: Local installation only

```bash
npm install automatosx
npx automatosx init
npx automatosx run backend "Hello"
```

**Why**:
- Consistent behavior
- Project-level dependencies
- Version control per project
- No global pollution

**Alternative**: Provide standalone binary for global use

### 3. Simplified Directory Structure

**v4.0 Structure**:
```
project/
├── node_modules/
│   └── automatosx/          # NPM package
│       ├── dist/            # Bundled code
│       ├── agents/          # Agent profiles
│       └── package.json
├── .automatosx/             # Runtime data only
│   ├── memory/
│   ├── workspaces/
│   ├── logs/
│   └── cache/
├── automatosx.config.json   # Optional user config
└── package.json
```

**Benefits**:
- Standard npm package structure
- No source code duplication
- Clear separation of concerns
- Easier to understand and maintain

### 4. Claude Code Integration

**Current**: Project-level `.claude/` directory

**v4.0**: Global Claude Code configuration

**Location**: `~/.claude/mcp-servers/automatosx.json`

**Why**:
- Single configuration works for all projects
- No per-project setup needed
- Standard MCP server pattern

### 5. Configuration Strategy

**Single Config File**: `automatosx.config.json`

**Location**: Project root (optional)

**Schema**:
```json
{
  "providers": { ... },
  "memory": { ... },
  "workspace": { ... },
  "logging": { ... }
}
```

**Defaults**: Built-in sensible defaults

**Override**: Environment variables (`AUTOMATOSX_*`)

## Summary

### Current Issues

1. ❌ Source code duplicated in `.defai/src/`
2. ❌ Complex file categorization system
3. ❌ Different behavior for global vs local install
4. ❌ Project-level Claude Code integration
5. ❌ Multiple runtime directories
6. ❌ Generated docs excluded from Git

### v4.0 Improvements

1. ✅ No source code duplication
2. ✅ Simple, standard npm structure
3. ✅ Single installation method (local + npx)
4. ✅ Global Claude Code integration
5. ✅ Single runtime directory (`.automatosx/`)
6. ✅ Clean Git tracking

### Migration Impact

**Breaking Changes**:
- Installation process changes
- Directory structure changes
- Configuration file changes

**Migration Path**:
- Automatic config migration
- Memory data preservation
- Clear upgrade guide
- Compatibility warnings
