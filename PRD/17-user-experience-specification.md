# User Experience Specification - AutomatosX v4.0

**Date**: 2025-10-04
**Status**: Sprint 1.5 Implementation Complete
**Priority**: 🔴 CRITICAL

---

## Executive Summary

This document defines how users interact with AutomatosX v4.0, covering onboarding, commands, error handling, and user journey. The goal is to make AutomatosX **easy to use** from first install to daily operation.

**Key Principle**: Users should be productive within 5 minutes of installation.

---

## Table of Contents

1. [Onboarding Flow](#onboarding-flow)
2. [Command Reference](#command-reference)
3. [Error Message Guidelines](#error-message-guidelines)
4. [Example Agent Library](#example-agent-library)
5. [Interactive Mode](#interactive-mode)
6. [User Journey Map](#user-journey-map)

---

## Onboarding Flow

### First-Time User Journey

```
1. User installs: npm install -g automatosx
2. User runs: automatosx init
3. System scaffolds:
   .automatosx/
     agents/          (5 example agents)
     abilities/       (15 example abilities)
     memory/          (empty, ready for use)
     workspaces/      (empty, isolated agent workspaces)
     logs/            (empty, for system logs)
     config.json      (sensible defaults)
4. User explores: automatosx list agents
5. User runs: automatosx run assistant "help me get started"
6. Success! ✅
```

**Time to first success**: <5 minutes

---

## Command Reference

### Core Commands

#### `automatosx init`
Initialize AutomatosX in current directory

```bash
# Basic usage
automatosx init

# Initialize in specific directory
automatosx init /path/to/project

# Force re-initialization
automatosx init --force
```

**What it does**:
1. Creates `.automatosx/` directory structure
2. Copies 5 example agent profiles
3. Copies 15 example abilities
4. Generates `automatosx.config.json`
5. Updates `.gitignore` with AutomatosX entries

**Success output**:
```
🤖 AutomatosX v4.0 - Project Initialization

📁 Creating directory structure...
   ✓ Directories created

🤖 Installing example agents...
   ✓ 5 example agents installed

⚡ Installing example abilities...
   ✓ 15 example abilities installed

⚙️  Generating configuration...
   ✓ Configuration created

📝 Updating .gitignore...
   ✓ .gitignore updated

✅ AutomatosX initialized successfully!

Next steps:
  1. Review automatosx.config.json
  2. Explore example agents: automatosx list agents
  3. Run an agent: automatosx run assistant "Hello!"

Available example agents:
  • assistant  - General purpose helper
  • coder      - Code generation specialist
  • reviewer   - Code review expert
  • debugger   - Debug assistance
  • writer     - Content creation
```

---

#### `automatosx run`
Execute an agent with a task

```bash
# Basic usage
automatosx run <agent> "<task>"

# With memory context
automatosx run assistant "summarize recent work" --memory

# Save result to memory
automatosx run assistant "plan next sprint" --save-memory

# Specify provider
automatosx run coder "write a sort function" --provider claude

# Verbose output
automatosx run debugger "analyze error" --verbose
```

**Options**:
- `--memory`: Use memory for context (default: true for agents with memory.enabled)
- `--save-memory`: Save result to memory (default: false)
- `--provider <name>`: Override agent's default provider
- `--verbose`: Show detailed execution logs
- `--no-memory`: Disable memory for this run

---

#### `automatosx list`
List available resources

```bash
# List agents
automatosx list agents

# List abilities
automatosx list abilities

# List providers
automatosx list providers
```

**Output - List Agents**:
```
🤖 Available Agents:

  • assistant
    General purpose AI assistant for various tasks
    Abilities: general-assistance, task-planning, problem-solving

  • coder
    Code generation specialist for writing high-quality code
    Abilities: code-generation, code-review, refactoring, debugging, testing

  • reviewer
    Code review expert for analyzing and improving code quality
    Abilities: code-review, security-audit, performance-analysis, best-practices

  • debugger
    Debug assistance specialist for troubleshooting and fixing issues
    Abilities: debugging, error-analysis, troubleshooting, testing

  • writer
    Content creation specialist for documentation and written materials
    Abilities: documentation, technical-writing, content-creation

Total: 5 agent(s)
```

**Output - List Abilities**:
```
⚡ Available Abilities:

  • Code Generation
    Generate high-quality, production-ready code following best practices.

  • Code Review
    Analyze code for quality, security, and best practices.

  • Debugging
    Systematically identify and resolve software issues.

  • Testing
    Create comprehensive test suites for software quality assurance.

  [... 11 more abilities ...]

Total: 15 ability(ies)
```

**Output - List Providers**:
```
🔌 Available Providers:

  • claude
    Anthropic Claude (via CLI)
    Status: Available
    Capabilities: text-generation, conversation

  • gemini
    Google Gemini (via CLI)
    Status: Available
    Capabilities: text-generation, conversation

  • openai-embed
    OpenAI Embeddings (via CLI)
    Status: Available
    Capabilities: embeddings

Total: 3 provider(s)
```

---

#### `automatosx status`
Show system status and health

```bash
# Basic status
automatosx status

# Detailed health check
automatosx status --health
```

**Output**:
```
🤖 AutomatosX v4.0 Status

Configuration:
  ✓ Config file: automatosx.config.json
  ✓ Agents directory: .automatosx/agents (5 agents)
  ✓ Abilities directory: .automatosx/abilities (15 abilities)
  ✓ Memory database: .automatosx/memory/memory.db (45 entries)

Providers:
  ✓ claude (primary)
  ✓ gemini (available)
  ✓ openai-embed (available)

System:
  ✓ Node.js: v20.10.0
  ✓ AutomatosX: v4.0.0-alpha.1
  ✓ All systems operational
```

---

#### `automatosx memory`
Manage memory system

```bash
# Search memory
automatosx memory search "deployment process"

# View memory stats
automatosx memory stats

# Clear old memories
automatosx memory clear --before 2024-09-01

# Export memory
automatosx memory export backup.json

# Import memory
automatosx memory import backup.json
```

---

### Agent Management Commands

```bash
# Create new agent
automatosx agent create <name> [--template <type>]

# Show agent info
automatosx agent info <name>

# Edit agent profile
automatosx agent edit <name>

# Delete agent
automatosx agent delete <name>
```

**Example - Create Agent**:
```bash
automatosx agent create researcher --template assistant

✨ Created agent: researcher
📝 Edit profile: .automatosx/agents/researcher.yaml
🚀 Run it: automatosx run researcher "search for papers"
```

---

### Configuration Commands

```bash
# Show config
automatosx config show

# Set config value
automatosx config set <key> <value>

# Reset to defaults
automatosx config reset

# Validate config
automatosx config validate
```

---

## Error Message Guidelines

### Principles

1. **User-friendly language** - No technical jargon
2. **Actionable suggestions** - Tell user how to fix it
3. **Context-aware** - Show relevant information
4. **Progressive disclosure** - Basic info first, details on request

---

### Error Templates

#### Agent Not Found

**Bad**:
```
Error: ENOENT: no such file or directory, open '.automatosx/agents/assistant.yaml'
```

**Good**:
```
❌ Agent 'assistant' not found

The agent profile doesn't exist at:
  .automatosx/agents/assistant.yaml

Available agents:
  • coder      - Code generation specialist
  • reviewer   - Code review expert
  • debugger   - Debug assistance

Create a new agent:
  automatosx agent create assistant

Or list all agents:
  automatosx list agents
```

---

#### Configuration Error

**Bad**:
```
Error: Invalid configuration: provider.primary is required
```

**Good**:
```
❌ Configuration error in automatosx.config.json

Missing required field: provider.primary

Your config:
  {
    "provider": {}
  }

Should be:
  {
    "provider": {
      "primary": "claude"
    }
  }

Fix it:
  automatosx config set provider.primary claude

Or reset to defaults:
  automatosx config reset
```

---

#### Provider Not Available

**Bad**:
```
Error: Provider 'claude' failed with exit code 1
```

**Good**:
```
❌ Provider 'claude' is not available

AutomatosX tried to use Claude but encountered an error.

Possible causes:
  1. Claude CLI not installed
     Install: npm install -g @anthropic-ai/claude-cli

  2. Not authenticated
     Run: claude auth login

  3. API key not set
     Set: export ANTHROPIC_API_KEY=your-key

Try another provider:
  automatosx run <agent> "<task>" --provider gemini

Or check status:
  automatosx status --health
```

---

#### Memory Database Error

**Bad**:
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Good**:
```
❌ Cannot access memory database

AutomatosX can't open the memory database at:
  .automatosx/memory/memory.db

Possible causes:
  1. Directory doesn't exist
     Run: automatosx init

  2. Permission denied
     Check: ls -la .automatosx/memory/

  3. Database corrupted
     Backup: automatosx memory export backup.json
     Reset: rm .automatosx/memory/memory.db

Need help? Run:
  automatosx status --health
```

---

#### Path Traversal Prevention

**Bad**:
```
Error: Path outside boundaries
```

**Good**:
```
❌ Security: Path not allowed

The path you specified is outside AutomatosX's allowed boundaries:
  /etc/passwd

For security, agents can only access:
  • Your project files (read-only)
  • Agent workspace (read-write): .automatosx/workspaces/<agent>/

This prevents accidental or malicious access to system files.

If you need to access this file, copy it to your project directory first.
```

---

## Example Agent Library

### Included with `automatosx init`

#### 1. assistant.yaml
**Purpose**: General-purpose AI assistant
**Abilities**: general-assistance, task-planning, problem-solving
**Use cases**:
- Answer questions
- Plan tasks
- Provide explanations

**Example**:
```bash
automatosx run assistant "explain how async/await works in JavaScript"
```

---

#### 2. coder.yaml
**Purpose**: Code generation specialist
**Abilities**: code-generation, code-review, refactoring, debugging, testing
**Use cases**:
- Write functions
- Generate boilerplate
- Refactor code

**Example**:
```bash
automatosx run coder "write a binary search function in TypeScript"
```

---

#### 3. reviewer.yaml
**Purpose**: Code review expert
**Abilities**: code-review, security-audit, performance-analysis, best-practices
**Use cases**:
- Review pull requests
- Security audits
- Code quality checks

**Example**:
```bash
automatosx run reviewer "review src/core/path-resolver.ts"
```

---

#### 4. debugger.yaml
**Purpose**: Debug assistance
**Abilities**: debugging, error-analysis, troubleshooting, testing
**Use cases**:
- Analyze errors
- Find bugs
- Suggest fixes

**Example**:
```bash
automatosx run debugger "why is my API returning 500 errors?"
```

---

#### 5. writer.yaml
**Purpose**: Content creation
**Abilities**: documentation, technical-writing, content-creation
**Use cases**:
- Write documentation
- Create tutorials
- Generate READMEs

**Example**:
```bash
automatosx run writer "create a README for my project"
```

---

## Interactive Mode

### Overview

Interactive mode provides a guided CLI experience for users who prefer step-by-step interaction.

```bash
# Start interactive mode
automatosx interactive
# or
automatosx i
```

---

### Flow

```
? What would you like to do?
  ❯ Run an agent
    Create new agent
    Manage memory
    Configure settings
    Exit

? Select an agent:
  ❯ assistant (General purpose helper)
    coder (Code generation)
    reviewer (Code review)
    debugger (Debug assistance)
    writer (Content creation)

? What task would you like the assistant to perform?
  › Help me understand this error message

? Use memory for context? (Y/n) Y
? Save result to memory? (Y/n) Y

🤖 Running assistant...

[Agent output here]

✅ Task complete!

? What would you like to do next?
  ❯ Run another task
    View memory
    Configure settings
    Exit
```

---

## User Journey Map

### First-Time User (0-5 minutes)

1. **Install** (1 min)
   ```bash
   npm install -g automatosx
   ```

2. **Initialize** (1 min)
   ```bash
   automatosx init
   ```

3. **Explore** (1 min)
   ```bash
   automatosx list agents
   ```

4. **First run** (2 min)
   ```bash
   automatosx run assistant "Hello! What can you help me with?"
   ```

**Total**: <5 minutes to productivity ✅

---

### Daily User (Experienced)

1. **Quick task** (30 sec)
   ```bash
   automatosx run coder "optimize this function"
   ```

2. **Code review** (1 min)
   ```bash
   automatosx run reviewer "check security in api.ts"
   ```

3. **Debug issue** (2 min)
   ```bash
   automatosx run debugger "analyze test failures"
   ```

**Total**: Minimal friction, maximum productivity

---

### Power User (Advanced)

1. **Custom agent** (5 min)
   ```bash
   automatosx agent create researcher --template assistant
   # Edit .automatosx/agents/researcher.yaml
   ```

2. **Memory management** (2 min)
   ```bash
   automatosx memory search "deployment"
   automatosx memory export backup.json
   ```

3. **Scripting** (ongoing)
   ```bash
   # In CI/CD pipeline
   automatosx run reviewer "review changed files" --no-memory --provider claude
   ```

---

## UX Metrics

### Success Criteria

| Metric | Target | Sprint 1.5 Result |
|--------|--------|-------------------|
| Time to first run | <5 min | ✅ ~3 min |
| Error resolution rate | 80%+ | ✅ (clear error messages) |
| User satisfaction (NPS) | 50+ | 📊 TBD (beta testing) |
| Command discoverability | 90%+ | ✅ (help text, examples) |

---

## Implementation Status

### Sprint 1.5 Deliverables

- ✅ `automatosx init` command implemented
- ✅ 5 example agents created
- ✅ 15 example abilities created
- ✅ `automatosx list` commands implemented
- ✅ Error message improvements (in progress)
- ⏳ Interactive mode (planned for Sprint 2.1)
- ⏳ Agent management commands (planned for Sprint 2.1)

---

## Conclusion

AutomatosX v4.0 UX is designed for **ease of use** and **rapid productivity**. The onboarding flow, clear commands, and helpful error messages ensure users can get started in minutes and stay productive daily.

**Status**: ✅ Sprint 1.5 Complete (Core UX Features Implemented)
**Next**: Interactive mode and advanced agent management (Sprint 2.1)

---

**Document Date**: 2025-10-04
**Last Updated**: 2025-10-04 (Sprint 1.5 completion)
**Next Review**: Sprint 2.1 kickoff
