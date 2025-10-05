# AutomatosX v4.0 Installation & Uninstallation Plan

## Overview

This document defines the complete installation and uninstallation strategy for AutomatosX v4.0, addressing the issues identified in the v3.x approach and providing a clean, user-friendly experience.

## Design Principles

### Installation Principles

1. **Zero-Config Start** - Works immediately after installation with sensible defaults
2. **Single Method** - One clear installation method to avoid confusion
3. **No Duplication** - No unnecessary file copying or duplication
4. **Standard Patterns** - Follow npm and Node.js conventions
5. **Idempotent** - Safe to run multiple times
6. **Informative** - Clear feedback at each step

### Uninstallation Principles

1. **Clean Removal** - Remove all traces when requested
2. **Data Safety** - Warn and backup user data before removal
3. **Selective Cleanup** - Allow keeping specific data (memory, config)
4. **No Orphans** - No leftover files or directories
5. **Reversible** - Can reinstall without issues

## Installation Strategy

### Installation Method: Local + npx

**Recommended Approach**: Local installation with npx execution

**Why**:
- ✅ Consistent behavior across all environments
- ✅ Version per project (no global conflicts)
- ✅ Standard npm workflow
- ✅ Works in CI/CD environments
- ✅ No global pollution
- ✅ Easy to update per project

**Alternative for Global Use**: Provide standalone binary (optional)

### Installation Flow

```
User runs: npm install automatosx
         ↓
NPM downloads package to node_modules/automatosx/
         ↓
NPM runs postinstall script
         ↓
┌─────────────────────────────────────────────┐
│     Post-Install Script (Simplified)        │
├─────────────────────────────────────────────┤
│                                             │
│  1. Detect Installation Context            │
│     - Check if local or global             │
│     - Get project root                     │
│                                             │
│  2. Create Runtime Directory               │
│     - Create .automatosx/                  │
│     - Create subdirectories                │
│                                             │
│  3. Initialize Configuration               │
│     - Create default config if missing     │
│     - Validate environment                 │
│                                             │
│  4. Setup Claude Code Integration          │
│     - Check if Claude Code installed       │
│     - Create global MCP config             │
│     - Register AutomatosX MCP server       │
│                                             │
│  5. Verify Installation                    │
│     - Check provider availability          │
│     - Validate dependencies                │
│     - Show status report                   │
│                                             │
│  6. Display Next Steps                     │
│     - Show getting started commands        │
│                                             │
└─────────────────────────────────────────────┘
         ↓
Installation Complete ✅
```

### Directory Structure After Installation

```
project/
├── node_modules/
│   └── automatosx/              # NPM package
│       ├── dist/                # Bundled code (TypeScript compiled)
│       │   ├── cli/
│       │   ├── core/
│       │   ├── agents/
│       │   ├── providers/
│       │   └── index.js
│       ├── agents/              # Agent profile templates
│       │   ├── _global/
│       │   ├── backend/
│       │   ├── frontend/
│       │   └── ...
│       ├── package.json
│       └── README.md
├── .automatosx/                 # Runtime directory (created by postinstall)
│   ├── memory/                  # Memory storage
│   ├── workspaces/              # Agent workspaces
│   ├── logs/                    # Log files
│   ├── cache/                   # Cached data
│   └── .initialized             # Installation marker
├── automatosx.config.json       # Optional user config (created on first run)
└── package.json
```

### Global Configuration (Claude Code Integration)

```
~/.claude/                       # Global Claude Code directory
└── mcp-servers/
    └── automatosx.json          # AutomatosX MCP server config
```

**MCP Server Configuration**:
```json
{
  "mcpServers": {
    "automatosx": {
      "command": "npx",
      "args": ["automatosx", "mcp-server"],
      "description": "AutomatosX AI Agent Orchestration",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Detailed Installation Steps

### Step 1: Package Installation

```bash
npm install automatosx
```

**What Happens**:
- Downloads package from npm registry
- Extracts to `node_modules/automatosx/`
- Runs `npm install` for package dependencies
- Triggers `postinstall` script

### Step 2: Post-Install Script Execution

**File**: `dist/scripts/postinstall.js`

```typescript
#!/usr/bin/env node

import { InstallationManager } from './installation-manager.js';

async function postInstall() {
  const installer = new InstallationManager();

  try {
    // 1. Detect context
    const context = await installer.detectContext();
    console.log(`Installing AutomatosX v${context.version}...`);

    // 2. Create runtime directory
    await installer.createRuntimeDirectory();

    // 3. Initialize configuration
    await installer.initializeConfiguration();

    // 4. Setup Claude Code integration (if available)
    await installer.setupClaudeIntegration();

    // 5. Verify installation
    const status = await installer.verify();

    // 6. Display results
    installer.displayResults(status);

  } catch (error) {
    console.error('Installation failed:', error.message);
    process.exit(1);
  }
}

postInstall();
```

### Step 3: Runtime Directory Creation

**Created Directories**:
```
.automatosx/
├── memory/              # Vector database and embeddings
│   └── .gitkeep
├── workspaces/          # Agent execution workspaces
│   └── .gitkeep
├── logs/                # Application logs
│   └── .gitkeep
├── cache/               # Cached profiles and embeddings
│   └── .gitkeep
└── .initialized         # Marker file with installation metadata
```

**.initialized File**:
```json
{
  "version": "4.0.0",
  "installedAt": "2025-10-03T15:30:00Z",
  "projectRoot": "/Users/username/project",
  "nodeVersion": "20.10.0",
  "platform": "darwin",
  "claudeCodeAvailable": true
}
```

### Step 4: Configuration Initialization

**Default Config** (`automatosx.config.json` - created on first run):

```json
{
  "$schema": "https://automatosx.dev/schema/v4/config.json",
  "version": "4.0.0",

  "providers": {
    "claude": {
      "enabled": true,
      "priority": 1,
      "command": "claude",
      "timeout": 120000
    },
    "gemini": {
      "enabled": false,
      "priority": 2,
      "command": "gemini",
      "timeout": 180000
    },
    "openai": {
      "enabled": false,
      "priority": 3,
      "command": "openai",
      "timeout": 180000
    }
  },

  "memory": {
    "enabled": true,
    "maxEntries": 10000,
    "persistPath": ".automatosx/memory",
    "autoCleanup": true,
    "cleanupDays": 30,
    "embeddingProvider": "claude"
  },

  "workspace": {
    "basePath": ".automatosx/workspaces",
    "autoCleanup": true,
    "cleanupDays": 7,
    "maxFiles": 100
  },

  "logging": {
    "level": "info",
    "path": ".automatosx/logs",
    "console": true,
    "file": true,
    "maxSize": "50MB",
    "maxFiles": 5
  },

  "agents": {
    "customProfilesPath": null,
    "enabledAgents": "*"
  }
}
```

**Environment Variable Overrides**:
```bash
AUTOMATOSX_PROVIDER_CLAUDE_ENABLED=true
AUTOMATOSX_MEMORY_ENABLED=false
AUTOMATOSX_LOGGING_LEVEL=debug
```

### Step 5: Claude Code Integration

**MCP Server Registration**:

```typescript
async function setupClaudeIntegration() {
  // Check if Claude Code is installed
  const claudeAvailable = await this.checkClaudeCode();

  if (!claudeAvailable) {
    console.log('ℹ️  Claude Code not found - skipping MCP integration');
    return;
  }

  // Create global MCP config
  const mcpConfigPath = path.join(
    os.homedir(),
    '.claude/mcp-servers/automatosx.json'
  );

  await fs.ensureDir(path.dirname(mcpConfigPath));

  const mcpConfig = {
    mcpServers: {
      automatosx: {
        command: 'npx',
        args: ['automatosx', 'mcp-server'],
        description: 'AutomatosX AI Agent Orchestration',
        env: {
          NODE_ENV: 'production'
        }
      }
    }
  };

  await fs.writeJson(mcpConfigPath, mcpConfig, { spaces: 2 });

  console.log('✅ Claude Code MCP integration configured');
  console.log(`   Config: ${mcpConfigPath}`);
}
```

### Step 6: Installation Verification

**Verification Checks**:

```typescript
interface VerificationStatus {
  success: boolean;
  checks: {
    runtimeDirectory: boolean;
    configuration: boolean;
    providers: {
      claude: boolean;
      gemini: boolean;
      openai: boolean;
    };
    claudeCode: boolean;
    dependencies: boolean;
  };
  warnings: string[];
  errors: string[];
}

async function verify(): Promise<VerificationStatus> {
  const status: VerificationStatus = {
    success: true,
    checks: {
      runtimeDirectory: false,
      configuration: false,
      providers: {
        claude: false,
        gemini: false,
        openai: false
      },
      claudeCode: false,
      dependencies: false
    },
    warnings: [],
    errors: []
  };

  // Check runtime directory
  status.checks.runtimeDirectory = await fs.pathExists('.automatosx');

  // Check configuration
  status.checks.configuration = await this.validateConfig();

  // Check providers
  status.checks.providers.claude = await this.checkProvider('claude');
  status.checks.providers.gemini = await this.checkProvider('gemini');
  status.checks.providers.openai = await this.checkProvider('openai');

  // Check Claude Code
  status.checks.claudeCode = await this.checkClaudeCode();

  // Check dependencies
  status.checks.dependencies = await this.checkDependencies();

  // Generate warnings
  if (!status.checks.providers.claude) {
    status.warnings.push('Claude CLI not found - install: npm install -g @anthropic-ai/claude-code');
  }

  if (!status.checks.claudeCode) {
    status.warnings.push('Claude Code not installed - MCP integration unavailable');
  }

  // Check for errors
  if (!status.checks.runtimeDirectory || !status.checks.configuration) {
    status.success = false;
    status.errors.push('Installation incomplete - please reinstall');
  }

  return status;
}
```

### Step 7: Installation Results Display

```
╔════════════════════════════════════════════════════════════╗
║        AutomatosX v4.0.0 Installation Complete ✅          ║
╚════════════════════════════════════════════════════════════╝

📦 Installation Summary:
   ✅ Runtime directory created
   ✅ Configuration initialized
   ✅ Claude provider available
   ⚠️  Gemini provider not found
   ⚠️  OpenAI provider not found
   ✅ Claude Code MCP integration configured

📁 Directories:
   Runtime:  /Users/username/project/.automatosx/
   Config:   /Users/username/project/automatosx.config.json
   MCP:      /Users/username/.claude/mcp-servers/automatosx.json

🚀 Quick Start:
   npx automatosx --help              # Show help
   npx automatosx agent list          # List available agents
   npx automatosx run backend "task"  # Run agent task
   npx automatosx status              # Check system status

📖 Documentation:
   https://automatosx.dev/docs/getting-started

⚠️  Warnings:
   • Gemini CLI not installed (optional)
   • OpenAI CLI not installed (optional)

Need help? https://github.com/defai-sg/automatosx/issues
```

## Uninstallation Strategy

### Uninstallation Goals

1. **Complete Removal** - Remove all AutomatosX files
2. **Data Preservation** - Backup user data before removal
3. **User Choice** - Allow selective cleanup
4. **Clean State** - No orphaned files or directories

### Uninstallation Flow

```
User runs: npm uninstall automatosx
         ↓
NPM runs preuninstall script
         ↓
┌─────────────────────────────────────────────┐
│     Pre-Uninstall Script                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Detect Uninstallation                  │
│     - Check if user initiated              │
│     - Load current configuration           │
│                                             │
│  2. User Confirmation                      │
│     - Display what will be removed         │
│     - Ask for confirmation                 │
│     - Offer backup option                  │
│                                             │
│  3. Backup User Data (if requested)        │
│     - Create timestamped backup            │
│     - Backup memory database               │
│     - Backup configuration                 │
│     - Display backup location              │
│                                             │
│  4. Stop Running Processes                 │
│     - Stop MCP server if running           │
│     - Clean up temp files                  │
│                                             │
│  5. Remove Runtime Directory               │
│     - Delete .automatosx/                  │
│     - Or keep if user requested            │
│                                             │
│  6. Remove Global Configuration            │
│     - Remove MCP server config             │
│     - Clean Claude Code integration        │
│                                             │
│  7. Display Results                        │
│     - Show what was removed                │
│     - Show backup location                 │
│     - Cleanup instructions if needed       │
│                                             │
└─────────────────────────────────────────────┘
         ↓
NPM removes package from node_modules/
         ↓
Uninstallation Complete ✅
```

### Uninstallation Commands

#### Option 1: Standard Uninstallation (Interactive)

```bash
npm uninstall automatosx
```

**Interactive Prompts**:
```
╔════════════════════════════════════════════════════════════╗
║           AutomatosX Uninstallation                        ║
╚════════════════════════════════════════════════════════════╝

The following will be removed:
  • AutomatosX package (node_modules/automatosx/)
  • Runtime directory (.automatosx/)
  • Claude Code MCP integration

⚠️  User data will be lost:
  • Memory database (234 entries)
  • Configuration (automatosx.config.json)
  • Logs (45 MB)

? Do you want to backup your data before uninstalling? (Y/n)
```

If user selects **Yes**:
```
📦 Creating backup...
   ✅ Memory database backed up
   ✅ Configuration backed up
   ✅ Logs backed up

   Backup location: .automatosx-backup-2025-10-03T15-30-00Z/

   To restore: npx automatosx restore .automatosx-backup-2025-10-03T15-30-00Z/
```

Then:
```
? Proceed with uninstallation? (Y/n)
```

If user selects **Yes**:
```
🗑️  Removing AutomatosX...
   ✅ Stopped MCP server
   ✅ Removed runtime directory
   ✅ Removed MCP configuration
   ✅ Package will be uninstalled by npm

╔════════════════════════════════════════════════════════════╗
║        AutomatosX Successfully Uninstalled                 ║
╚════════════════════════════════════════════════════════════╝

Removed:
  • /Users/username/project/.automatosx/
  • /Users/username/.claude/mcp-servers/automatosx.json

Backup:
  • /Users/username/project/.automatosx-backup-2025-10-03T15-30-00Z/

To reinstall: npm install automatosx
```

#### Option 2: Uninstall and Keep Data

```bash
npx automatosx uninstall --keep-data
npm uninstall automatosx
```

**Output**:
```
🗑️  Removing AutomatosX (keeping user data)...
   ✅ Stopped MCP server
   ✅ Removed MCP configuration
   ⏭️  Skipped: .automatosx/ (kept as requested)
   ✅ Package will be uninstalled by npm

Data preserved in: .automatosx/
To remove manually: rm -rf .automatosx/
```

#### Option 3: Complete Cleanup (Non-Interactive)

```bash
npx automatosx uninstall --yes --no-backup
npm uninstall automatosx
```

**Output**:
```
🗑️  Removing AutomatosX (no backup)...
   ✅ Stopped MCP server
   ✅ Removed runtime directory
   ✅ Removed MCP configuration
   ✅ Package will be uninstalled by npm

AutomatosX completely removed.
```

#### Option 4: Backup Only (No Uninstall)

```bash
npx automatosx backup
```

**Output**:
```
📦 Creating AutomatosX backup...
   ✅ Memory database backed up (234 entries)
   ✅ Configuration backed up
   ✅ Logs backed up (45 MB)
   ✅ Agent profiles backed up

Backup location: .automatosx-backup-2025-10-03T15-30-00Z/

Backup contents:
  • memory/          - Vector database and embeddings
  • automatosx.config.json
  • logs/
  • agents/custom/   - Custom agent profiles (if any)

To restore: npx automatosx restore .automatosx-backup-2025-10-03T15-30-00Z/
```

### Pre-Uninstall Script Implementation

**File**: `dist/scripts/preuninstall.js`

```typescript
#!/usr/bin/env node

import { UninstallationManager } from './uninstallation-manager.js';
import inquirer from 'inquirer';

async function preUninstall() {
  const uninstaller = new UninstallationManager();

  try {
    // Check if this is a user-initiated uninstall
    if (!await uninstaller.isUserInitiated()) {
      console.log('ℹ️  Skipping cleanup (automated npm operation)');
      return;
    }

    // Load current state
    const state = await uninstaller.getCurrentState();

    // Check for user data
    const hasUserData = await uninstaller.hasUserData();

    if (!hasUserData) {
      // No data to backup, just clean up
      await uninstaller.cleanup({ backup: false });
      return;
    }

    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'backup',
        message: 'Do you want to backup your data before uninstalling?',
        default: true
      },
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with uninstallation?',
        default: true
      }
    ]);

    if (!answers.proceed) {
      console.log('Uninstallation cancelled.');
      process.exit(1);
    }

    // Perform uninstallation
    await uninstaller.cleanup({
      backup: answers.backup,
      interactive: true
    });

    console.log('\n✅ AutomatosX uninstallation preparation complete');
    console.log('   NPM will now remove the package...\n');

  } catch (error) {
    console.error('Uninstallation preparation failed:', error.message);
    process.exit(1);
  }
}

preUninstall();
```

### Backup Structure

```
.automatosx-backup-2025-10-03T15-30-00Z/
├── metadata.json                # Backup metadata
├── memory/                      # Memory database
│   ├── vector-store.json
│   └── embeddings/
├── automatosx.config.json       # User configuration
├── logs/                        # Log files
│   └── automatosx.log
└── agents/                      # Custom agent profiles (if any)
    └── custom/
```

**metadata.json**:
```json
{
  "version": "4.0.0",
  "backedUpAt": "2025-10-03T15:30:00Z",
  "projectRoot": "/Users/username/project",
  "reason": "uninstallation",
  "stats": {
    "memoryEntries": 234,
    "configFiles": 1,
    "logSize": "45MB",
    "customAgents": 0
  }
}
```

### Restoration Process

```bash
npx automatosx restore .automatosx-backup-2025-10-03T15-30-00Z/
```

**Output**:
```
📦 Restoring AutomatosX from backup...

Backup info:
  Version:      4.0.0
  Created:      2025-10-03 15:30:00
  Memory:       234 entries
  Logs:         45 MB

? This will overwrite current data. Continue? (y/N)

Restoring...
   ✅ Memory database restored (234 entries)
   ✅ Configuration restored
   ✅ Logs restored
   ✅ Custom agents restored (0 files)

╔════════════════════════════════════════════════════════════╗
║           AutomatosX Restored Successfully                 ║
╚════════════════════════════════════════════════════════════╝

Restored to: .automatosx/

Next steps:
   npx automatosx status      # Verify restoration
   npx automatosx validate    # Validate configuration
```

## CLI Commands for Installation Management

### Installation Commands

```bash
# Initial setup (runs automatically after npm install)
npx automatosx init

# Re-initialize (reset to defaults)
npx automatosx init --reset

# Initialize with specific provider
npx automatosx init --provider claude

# Initialize without Claude Code integration
npx automatosx init --no-mcp

# Check installation status
npx automatosx status

# Validate installation
npx automatosx validate

# Repair installation
npx automatosx repair
```

### Uninstallation Commands

```bash
# Backup before uninstalling
npx automatosx backup

# Uninstall preparation (interactive)
npx automatosx uninstall

# Uninstall and keep data
npx automatosx uninstall --keep-data

# Uninstall without backup
npx automatosx uninstall --yes --no-backup

# Clean only runtime data (keep package)
npx automatosx clean

# Factory reset (keep package)
npx automatosx reset --factory

# Remove only memory
npx automatosx clean memory

# Remove only workspaces
npx automatosx clean workspaces

# Remove only logs
npx automatosx clean logs
```

### Restoration Commands

```bash
# List available backups
npx automatosx backup list

# Restore from specific backup
npx automatosx restore <backup-path>

# Restore only memory
npx automatosx restore <backup-path> --only memory

# Restore only configuration
npx automatosx restore <backup-path> --only config
```

## Error Handling

### Installation Errors

#### Error: Runtime Directory Creation Failed

```
❌ Error: Failed to create runtime directory

Reason: Permission denied
Path: /Users/username/project/.automatosx/

Solution:
  1. Check directory permissions
  2. Run with appropriate permissions
  3. Try: sudo npm install automatosx

Need help? https://automatosx.dev/docs/troubleshooting
```

#### Error: Claude Code Integration Failed

```
⚠️  Warning: Claude Code integration failed

Reason: ~/.claude/ is not writable

Impact: MCP server will not be available

Solutions:
  • Fix permissions: chmod +w ~/.claude/
  • Skip MCP: Reinstall with --no-mcp flag

AutomatosX will still work via CLI commands.
```

#### Error: Provider Not Found

```
⚠️  Warning: No AI providers found

AutomatosX requires at least one provider CLI:
  • Claude:  npm install -g @anthropic-ai/claude-code
  • Gemini:  (custom installation required)
  • OpenAI:  npm install -g openai-cli

Run 'npx automatosx validate' after installing a provider.
```

### Uninstallation Errors

#### Error: Backup Failed

```
❌ Error: Backup failed

Reason: Insufficient disk space
Required: 100 MB
Available: 50 MB

Options:
  1. Free up disk space
  2. Skip backup: npx automatosx uninstall --no-backup
  3. Cancel uninstallation

? What would you like to do? (Free space/Skip backup/Cancel)
```

#### Error: MCP Server Still Running

```
⚠️  Warning: MCP server is still running

Process ID: 12345
Port: 3001

Attempting to stop...
✅ MCP server stopped

Continuing with uninstallation...
```

## Migration from v3.x

### Automatic Migration

When v4.0 is installed in a project with v3.x:

```
╔════════════════════════════════════════════════════════════╗
║         AutomatosX v3.x Detected - Migrating               ║
╚════════════════════════════════════════════════════════════╝

Found v3.x installation:
  • .defai/ directory
  • automatosx.config.yaml

? Migrate v3.x data to v4.0? (Y/n)

Migrating...
   ✅ Memory database migrated (234 entries)
   ✅ Configuration converted (yaml → json)
   ✅ Custom agents migrated (0 files)
   ✅ Old files backed up to .defai-v3-backup/

Migration complete!

Changes in v4.0:
  • .defai/ → .automatosx/
  • automatosx.config.yaml → automatosx.config.json
  • Simplified directory structure
  • Global MCP configuration

Old files backed up to: .defai-v3-backup/
You can remove after verifying: rm -rf .defai-v3-backup/
```

### Manual Migration

```bash
# Backup v3.x data
npx automatosx@3 backup

# Uninstall v3.x
npm uninstall automatosx

# Install v4.0
npm install automatosx@4

# Migrate from v3.x backup
npx automatosx migrate --from v3 --backup .automatosx-backup-*/
```

## Testing the Installation Process

### Installation Test Checklist

- [ ] Fresh installation in new project
- [ ] Installation in existing project
- [ ] Installation with Claude Code installed
- [ ] Installation without Claude Code
- [ ] Installation with existing v3.x
- [ ] Installation with no provider CLIs
- [ ] Installation with all provider CLIs
- [ ] Re-installation (idempotent test)
- [ ] Installation in CI/CD environment
- [ ] Installation with insufficient permissions

### Uninstallation Test Checklist

- [ ] Uninstall with user data (with backup)
- [ ] Uninstall with user data (without backup)
- [ ] Uninstall with no user data
- [ ] Uninstall with --keep-data flag
- [ ] Uninstall in non-interactive mode
- [ ] Uninstall with running MCP server
- [ ] Uninstall and reinstall
- [ ] Restore from backup
- [ ] Backup creation without uninstall

## Documentation Requirements

### Installation Documentation

**docs/installation.md**:
- Prerequisites
- Step-by-step installation guide
- Provider CLI installation
- Configuration options
- Troubleshooting
- Verification steps

### Uninstallation Documentation

**docs/uninstallation.md**:
- When to uninstall
- Backup recommendations
- Step-by-step uninstallation guide
- Data preservation options
- Complete removal guide
- Restoration guide

### Migration Documentation

**docs/migration-v3-to-v4.md**:
- What changed
- Migration checklist
- Automatic migration
- Manual migration steps
- Troubleshooting migration issues
- Rollback procedure

## Success Criteria

### Installation Success Criteria

✅ Installation completes in < 30 seconds
✅ Zero errors on fresh installation
✅ All directories created correctly
✅ Configuration file is valid
✅ At least one provider detected (or clear warning)
✅ MCP integration configured (if Claude Code available)
✅ Status command shows green
✅ Can run first agent task

### Uninstallation Success Criteria

✅ User data backed up (if requested)
✅ All runtime files removed
✅ No orphaned files or directories
✅ MCP server stopped cleanly
✅ Global MCP config removed
✅ Can reinstall without errors
✅ Backup can be restored successfully
✅ Clear confirmation of what was removed

## Future Enhancements

### v4.1 and Beyond

1. **GUI Installer**
   - Electron-based installer
   - Visual configuration
   - Provider detection and installation
   - Interactive setup wizard

2. **Docker Installation**
   - Pre-configured Docker image
   - Docker Compose setup
   - Volume management
   - Easy deployment

3. **Cloud Installation**
   - AWS/GCP/Azure deployment scripts
   - Terraform modules
   - Kubernetes Helm charts
   - Serverless deployment

4. **Update Manager**
   - Automatic update detection
   - In-place updates
   - Rollback capability
   - Update notifications

5. **Health Monitoring**
   - Installation health checks
   - Automatic repair
   - Dependency updates
   - Security scanning

## Disaster Recovery & Data Protection

### Overview

AutomatosX manages critical user data including:
- Memory database (AI interaction history)
- Agent workspaces (files and artifacts)
- Configuration (providers, settings)
- Logs (execution history)

**Data loss is unacceptable.** This section defines comprehensive disaster recovery and data protection strategies.

### Recovery Objectives

- **Recovery Time Objective (RTO)**: <15 minutes
  - Time to restore from backup to working state

- **Recovery Point Objective (RPO)**: <24 hours
  - Maximum acceptable data loss (last backup age)

- **Success Rate**: >99.9%
  - Successful recovery from backup

### Disaster Scenarios

#### Scenario 1: Memory Database Corruption

**Symptoms**:
- Search fails with errors
- Cannot store new memories
- Startup crashes on memory initialization

**Detection**:
```bash
npx automatosx health
# Output: ❌ Memory system: UNHEALTHY
```

**Recovery Process**:

```bash
# 1. Stop using AutomatosX
# 2. Verify backup exists
ls -la ~/.automatosx-backups/

# 3. Restore from automatic backup
npx automatosx restore memory --from latest

# 4. Verify recovery
npx automatosx health
npx automatosx memory search "test" # Should work

# 5. If automatic restore fails, manual restore
cp ~/.automatosx-backups/latest/memory/* .automatosx/memory/
npx automatosx memory rebuild-index
```

**Prevention**:
- Automatic daily backups
- File system journaling
- Graceful shutdown handling
- Corruption detection on startup

#### Scenario 2: Complete Data Loss (Disk Failure)

**Symptoms**:
- .automatosx/ directory missing
- All data gone

**Recovery Process**:

```bash
# 1. Reinstall AutomatosX
npm install automatosx

# 2. Check for backup (automatic backups are in home directory)
ls -la ~/.automatosx-backups/

# 3. Full restore
npx automatosx restore --from ~/.automatosx-backups/latest

# 4. Verify all components
npx automatosx status
npx automatosx memory search "test"
npx automatosx run backend "Hello world"
```

**Prevention**:
- Backups stored OUTSIDE project directory (~/.automatosx-backups/)
- Cloud backup option (sync to S3/Dropbox)
- Recommended: User's own backup solution

#### Scenario 3: Bad Configuration

**Symptoms**:
- AutomatosX won't start
- Config validation errors
- Provider failures

**Recovery Process**:

```bash
# 1. Restore default config
npx automatosx config reset

# 2. If that fails, restore from backup
npx automatosx restore config --from latest

# 3. If no backup, recreate
rm automatosx.config.json
npx automatosx init # Creates fresh config

# 4. Reconfigure providers
npx automatosx config set providers.claude-code.enabled true
```

**Prevention**:
- Config validation before saving
- Backup before config changes
- Config version control (user should commit)

#### Scenario 4: Upgrade Failure

**Symptoms**:
- Migration fails midway
- v4.0 broken after upgrade
- Data partially migrated

**Recovery Process**:

```bash
# Automatic rollback (recommended)
npx automatosx migrate rollback

# This will:
# 1. Remove v4.0 installation
# 2. Restore v3.x from backup
# 3. Verify v3.x working
# 4. Keep v4.0 backup for debugging
```

**Prevention**:
- Automatic backup before upgrade
- Migration verification
- Rollback tested before release

#### Scenario 5: Workspace Corruption

**Symptoms**:
- Agent execution fails
- Workspace access errors
- Files missing or corrupted

**Recovery Process**:

```bash
# 1. Clear specific workspace
npx automatosx workspace clear backend

# 2. Or restore from backup
npx automatosx restore workspace backend --from latest

# 3. Or recreate workspace
npx automatosx workspace init backend
```

**Prevention**:
- Workspace isolation
- Automatic cleanup of old files
- Backup before destructive operations

### Backup Strategy

#### Automatic Backups

**When**:
- Daily (if AutomatosX used that day)
- Before major operations (upgrade, clear memory, config reset)
- On shutdown (if data changed)

**What**:
- Memory database (full copy)
- Configuration (all config files)
- MCP configuration
- Metadata (.initialized, version info)

**Where**:
- Local: `~/.automatosx-backups/`
- Retention: Keep last 7 daily + 4 weekly + 3 monthly
- Auto-cleanup old backups

**Format**:
```
~/.automatosx-backups/
├── daily/
│   ├── 2025-10-03/
│   ├── 2025-10-02/
│   └── ... (last 7 days)
├── weekly/
│   ├── 2025-week-40/
│   └── ... (last 4 weeks)
├── monthly/
│   ├── 2025-10/
│   └── ... (last 3 months)
└── latest -> daily/2025-10-03
```

#### Manual Backups

```bash
# Full backup
npx automatosx backup create

# Backup specific components
npx automatosx backup memory
npx automatosx backup config
npx automatosx backup workspace

# Backup to specific location
npx automatosx backup create --output /path/to/backup.tar.gz

# Backup to cloud (requires setup)
npx automatosx backup create --cloud s3://my-bucket/automatosx/
```

#### Backup Verification

**Automatic Verification**:
- After each backup, verify readability
- Check file sizes (should not be 0)
- Validate JSON/data format
- Test restore in isolated environment (optional)

**Manual Verification**:
```bash
# Verify backup integrity
npx automatosx backup verify ~/.automatosx-backups/latest

# Test restore (dry run)
npx automatosx restore --dry-run --from latest

# Verify specific backup
npx automatosx backup verify ~/.automatosx-backups/daily/2025-10-03/
```

### Data Protection Mechanisms

#### 1. File Permissions

**Security**:
```
.automatosx/                 700 (drwx------)
├── memory/                  700
│   ├── vectors.bin         600 (-rw-------)
│   └── entries.json        600
├── workspaces/              700
├── logs/                    700
└── cache/                   755
```

**Why**:
- Prevent unauthorized access
- Protect sensitive data (API keys in logs)
- Prevent accidental deletion

#### 2. Data Validation

**On Write**:
- Validate before saving
- Schema validation (Zod)
- Type checking
- Range validation

**On Read**:
- Validate after loading
- Handle corrupted data gracefully
- Attempt auto-repair
- Fallback to backup if repair fails

#### 3. Atomic Operations

**Write Operations**:
```typescript
// Write to temp file, then atomic rename
async function atomicWrite(path: string, data: any): Promise<void> {
  const tempPath = `${path}.tmp.${Date.now()}`;

  try {
    // Write to temp
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

    // Atomic rename
    await fs.rename(tempPath, path);
  } catch (error) {
    // Cleanup temp file
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}
```

**Why**:
- Prevents partial writes
- Power loss during write won't corrupt
- Crash during write leaves old data intact

#### 4. Transaction-like Operations

**For critical operations**:
```typescript
async function transactionalUpdate(operation: () => Promise<void>): Promise<void> {
  // 1. Backup current state
  const backup = await createBackup();

  try {
    // 2. Perform operation
    await operation();

    // 3. Verify success
    await verify();

  } catch (error) {
    // 4. Rollback on failure
    await restoreFromBackup(backup);
    throw error;
  } finally {
    // 5. Cleanup temp backup
    await cleanup(backup);
  }
}
```

#### 5. Data Encryption (Optional)

**For Sensitive Data**:
```bash
# Enable encryption for memory
npx automatosx config set memory.encryption true

# Set encryption password (stored in system keychain)
npx automatosx config set-secret memory.password
```

**Implementation**:
- AES-256-GCM encryption
- Key stored in system keychain (macOS: Keychain, Linux: Secret Service)
- Encrypted at rest, decrypted in memory
- Optional (off by default)

### Data Privacy

#### What Data is Stored

**Memory Database**:
- User's task descriptions
- AI responses
- Embeddings (numerical vectors)
- Timestamps
- Metadata (provider, duration, tokens)

**Logs**:
- Command history
- Errors and warnings
- Provider calls (no API keys)
- Performance metrics

**Workspaces**:
- Agent-generated files
- Temporary artifacts
- Workspace state

**What is NOT Stored**:
- API keys (stored in provider CLI configs)
- Raw provider responses (unless explicitly saved)
- Network traffic
- User's system information

#### Data Retention

**Default Retention**:
- Memory: Indefinite (user controlled)
- Logs: 30 days (auto-rotate)
- Workspaces: 7 days (auto-cleanup)
- Backups: 7 daily + 4 weekly + 3 monthly

**User Control**:
```bash
# Configure retention
npx automatosx config set memory.retentionDays 90
npx automatosx config set logs.retentionDays 14
npx automatosx config set workspace.cleanupDays 3

# Manual cleanup
npx automatosx memory clear --older-than 30d
npx automatosx logs clear --older-than 7d
npx automatosx workspace cleanup
```

#### Data Export

**For Data Portability**:
```bash
# Export all data
npx automatosx export --output my-data.zip

# Contains:
# - memory/ (JSON format, human-readable)
# - config/ (JSON)
# - logs/ (text files)
# - metadata.json
```

#### GDPR/Privacy Compliance

**User Rights**:
1. **Right to Access**: Export all data
2. **Right to Deletion**: Clear all data
3. **Right to Portability**: Export in standard format
4. **Right to Rectification**: Edit/update data

**Commands**:
```bash
# Access: Export all data
npx automatosx export

# Deletion: Remove all data
npx automatosx uninstall --purge-all

# Portability: Standard JSON format
npx automatosx memory export --format json

# Rectification: Edit memory entries
npx automatosx memory edit <id>
```

### Health Monitoring

#### Continuous Health Checks

**Automatic Monitoring**:
- On startup: Health check all components
- During operation: Monitor for errors
- On shutdown: Verify data integrity

**Health Check Items**:
```bash
npx automatosx health

# Checks:
# ✓ Configuration valid
# ✓ Memory system operational
# ✓ Providers available
# ✓ Disk space sufficient (>1GB free)
# ✓ File permissions correct
# ✓ No corrupted files
# ✓ Backup system working
```

#### Proactive Alerts

**When to Alert**:
- Disk space <500MB
- Memory DB growing rapidly (>100MB/day)
- Backup failures
- Repeated health check failures
- High error rate

**Alert Methods**:
- Console warnings (during execution)
- Log warnings (persistent)
- Health status in `npx automatosx status`

### Recovery Testing

#### Regular Testing

**Recommended Schedule**:
- Test restore: Monthly (user should do this)
- Automated test: On every backup (verify readable)

**Test Process**:
```bash
# Test restore in isolated directory
npx automatosx restore --dry-run --from latest --test-dir /tmp/ax-test

# Verify:
# 1. All files restored
# 2. Config valid
# 3. Memory searchable
# 4. No errors
```

### Support & Troubleshooting

#### Diagnostic Information

```bash
# Generate diagnostic report
npx automatosx diagnose

# Includes:
# - System info (Node version, OS, disk space)
# - AutomatosX version
# - Health check results
# - Recent errors (last 100)
# - Configuration (sanitized, no secrets)
# - File sizes and counts
```

#### Emergency Support

**Critical Data Loss**:
1. **DO NOT** uninstall or reinstall
2. **DO** check ~/.automatosx-backups/
3. Contact support with diagnostic report
4. Support may request:
   - Diagnostic report
   - Error logs
   - Backup metadata

**Contact**:
- GitHub Issues: https://github.com/defai-sg/automatosx/issues
- Emergency tag: `[CRITICAL-DATA-LOSS]`
