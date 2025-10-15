# AutomatosX

> **Provider-Agnostic AI Agent Orchestration**
>
> A CLI-first tool for orchestrating specialized AI agents with persistent memory, intelligent delegation, and cross-provider support (Claude, Gemini, OpenAI).

[![npm version](https://img.shields.io/npm/v/@defai.digital/automatosx.svg)](https://www.npmjs.com/package/@defai.digital/automatosx)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-1,845%20passing-brightgreen.svg)](#)
[![macOS](https://img.shields.io/badge/macOS-26.0-blue.svg)](https://www.apple.com/macos)
[![Windows](https://img.shields.io/badge/Windows-10+-blue.svg)](https://www.microsoft.com/windows)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-24.04-orange.svg)](https://ubuntu.com)

**Status**: ✅ Production Ready · v5.4.3-beta.0 · October 2025

Looking for answers? See the [FAQ](FAQ.md).

---

## 🎯 Built for Claude Code

**AutomatosX extends Claude Code with specialized AI agents that remember context, delegate tasks, and collaborate autonomously.**

### 💡 Best Way to Use: Natural Language Collaboration (Recommended)

Instead of directly commanding agents, **let Claude Code think and coordinate**:

```
✅ RECOMMENDED: Natural language collaboration
"please work with ax agent to implement user authentication with JWT"

What happens:
1. Claude Code analyzes your project structure
2. AutomatosX selects the most suitable agent automatically
3. Provides full context to the agent
4. Validates the results
5. Helps you understand and iterate
```

**vs.**

```
⚡ EXPRESS: Direct slash command (for simple tasks)
/ax:agent backend, implement JWT auth

What happens:
1. Backend agent executes directly
2. Limited project context
3. No validation or planning
```

### 🎓 Think of it This Way

- **Natural Collaboration** = Having a conversation with an intelligent coordinator who summons experts
- **Slash Commands** = Directly commanding the experts without coordination

**Recommendation**: Use natural language for 80% of tasks, slash commands for quick 20%.

📖 **[Complete Best Practices Guide](docs/BEST-PRACTICES.md)**

---

## 💡 Why AutomatosX?

### The Problem with Stateless AI

**Traditional AI assistants** (ChatGPT, vanilla Claude):
- ❌ No memory between conversations
- ❌ You repeat context every time
- ❌ No coordination between tasks
- ❌ Knowledge disappears after each session

**AutomatosX changes this**:
- ✅ **Persistent memory**: < 1ms search, zero cost, 100% local
- ✅ **Multi-agent delegation**: Agents coordinate automatically
- ✅ **Context retention**: Never explain the same thing twice
- ✅ **Knowledge accumulation**: Your team gets smarter over time

### Real-World Impact

**Without AutomatosX**:
```
Day 1: You explain architecture to Claude → Response lost
Day 2: You ask to implement → You re-explain architecture
Day 3: Different task → You re-explain everything again
```

**With AutomatosX**:
```
Day 1: Product designs architecture → Saved to memory
Day 2: ax run backend "implement auth" → Backend finds Product's design automatically
Day 3: ax run security "security audit" → Security has full context from Day 1-2
```

**Time saved**: Hours per week. **Quality**: Consistent. **Cost**: $0.

---

[📋 Full Changelog](CHANGELOG.md) | [🎉 Release Notes](https://github.com/defai-digital/automatosx/releases)

---

## 🧠 Core Value: Persistent Memory

**AutomatosX remembers everything**. Every agent conversation is automatically saved and searchable.

### How It Works

```bash
# Automatic memory saving
ax run product "Design calculator with add/subtract"
→ Task + Response saved to SQLite FTS5

# Automatic memory retrieval
ax run backend "Implement the calculator"
→ Memory searches "calculator" automatically
→ Backend receives: "# Relevant Context from Memory: Product's design..."
→ Backend implements WITHOUT you repeating the spec
```

### The Technology

- **SQLite FTS5**: Built-in full-text search
- **< 1ms search**: 62x faster than v3.x vector search
- **$0 cost**: No embedding APIs, no cloud calls
- **100% local**: Your data never leaves your machine
- **Automatic injection**: Relevant context added to every agent

### Benefits

✅ **Cross-day continuity**: Pick up where you left off
✅ **Cross-agent knowledge**: All agents share the same knowledge base
✅ **Learning from history**: Agents avoid past mistakes
✅ **Zero cost scaling**: 10,000 entries = ~10MB, still < 1ms search

**Learn more**: [Memory System Guide](docs/guide/agent-communication.md) | [Memory Tutorial](docs/tutorials/memory-management.md)

---

## 🤝 Core Value: Multi-Agent Orchestration

**Agents coordinate automatically**. Natural language delegation creates complex workflows without manual orchestration.

### How It Works

```typescript
// Product Manager analyzes and delegates
ax run product "Build authentication feature"

Product response:
  "I'll design the auth system with JWT + OAuth2.

   @backend Please implement the JWT authentication API based on this design.
   @security Please audit the implementation for security issues."

// AutomatosX automatically:
// 1. Backend receives full spec, implements code
// 2. Security receives spec + code, performs audit
// 3. Results aggregated back to Product
```

### The Technology

- **7 delegation syntaxes**: `@mention`, `DELEGATE TO`, `Please ask`, etc.
- **Cycle detection**: Prevents infinite loops
- **Depth limits**: Default 2 levels (configurable)
- **Session tracking**: Who did what, when
- **Shared workspace**: Organized PRD/tmp structure for collaboration

### Benefits

✅ **Automatic coordination**: No manual task switching
✅ **Parallel execution**: Multiple agents work simultaneously
✅ **Transparent workflows**: Full delegation chain visible
✅ **Context preservation**: Every agent has complete context

**Learn more**: [Multi-Agent Orchestration Guide](docs/guide/multi-agent-orchestration.md)

---

## 🎭 12 Specialized Agents with Clear Governance

**v5.0.12 introduces strict role ownership and delegation controls to eliminate cycles**:
**v5.3.4 Phase 2 Pilot**: 3 coordinator agents now support 3-layer delegation for complex multi-phase workflows

### 💻 Engineering Team (Implementers)
**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation
- **Bob** (backend) - API design, database modeling, caching strategies
  - Can delegate to: frontend, data, security, quality, devops
- **Frank** (frontend) - Component architecture, state management, accessibility
  - Can delegate to: backend, design, security, quality, devops
- **Oliver** (devops) - **🆕 v5.3.4: Infrastructure Coordinator (depth 3)** - Orchestrate complex deployment pipelines
  - Can delegate to: backend, frontend, security, quality
  - 3-layer capability for multi-phase infrastructure workflows
- **Daisy** (data) - Data modeling, ETL pipelines, SQL optimization
  - Can delegate to: backend, security, quality
- **Steve** (security) - **Sole owner** of security-audit, threat modeling, secure coding review
  - Can delegate to: backend, frontend, devops, quality
- **Dana** (data-scientist) - **🆕 v5.3.4: Data Science Coordinator (depth 3)** - End-to-end ML pipelines
  - Can delegate to: data, backend, quality
  - 3-layer capability for complex data science workflows

### 🎯 Quality Team (Coordinator Role)
**maxDelegationDepth: 1** - Can delegate fixes back to implementers, no re-delegation
- **Queenie** (quality) - **Sole owner** of code-review and debugging, testing strategies
  - Can delegate to: backend, frontend, security, devops, data

### 🎨 Content Team (Implementers)
**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation
- **Debbee** (design) - UX research, wireframes, design systems
  - Can delegate to: frontend, writer, quality
- **Wendy** (writer) - API documentation, ADRs, release notes
  - Can delegate to: backend, frontend, design, quality

### 📊 Leadership Team (Coordinators)
**maxDelegationDepth: 1-3** - Delegate to implementers, focus on strategy
- **Paris** (product) - Product strategy, feature planning, roadmap
  - Can delegate to: backend, frontend, design, writer, quality
  - maxDelegationDepth: 1
- **Eric** (ceo) - Business strategy, organizational leadership
  - Can delegate to: paris, tony, all agents
  - maxDelegationDepth: 1
- **Tony** (cto) - **🆕 v5.3.4: Strategic Coordinator (depth 3)** - Multi-phase technical initiatives
  - Can delegate to: backend, frontend, devops, security, quality
  - 3-layer capability for strategic technology projects with sub-coordination

### 🔬 Research Team (Specialist)
**maxDelegationDepth: 0** - Execute research work directly, no delegation
- **Rodman** (researcher) - Idea validation, feasibility analysis, research reports
  - Specializes in: logical reasoning, risk assessment, literature review
  - Produces: executive summaries, feasibility studies, long-form research reports

**New in v5.0.12**: Each agent has role-specific workflow stages, smart ability loading (abilitySelection), and explicit delegation scopes. Most agents have `maxDelegationDepth: 1` to allow cross-domain collaboration while preventing delegation cycles.

**New in v5.3.4 (Phase 2 Pilot)**: 3 coordinator agents (Tony/CTO, Oliver/DevOps, Dana/Data Scientist) now support `maxDelegationDepth: 3` for orchestrating complex multi-layer workflows. This enables strategic coordination of multi-phase projects while maintaining safety through depth limits and cycle detection.

[📖 Complete Agent Directory](examples/AGENTS_INFO.md)

---

## 🚀 Two Ways to Use AutomatosX

AutomatosX offers **two powerful modes** to fit your workflow:

### 1️⃣ Claude Code Integration (Recommended)

**The best way**: Use **natural language collaboration** to let Claude Code coordinate agents intelligently.

#### Natural Language Collaboration (Primary Method - 80% of tasks)

```
# Let Claude Code think, plan, and coordinate
"please work with ax agent to implement user authentication"
"please work with ax agent to design a secure API for our application"
"please work with ax agent to refactor this module with best practices"
```

**Why this is better**:
- 🧠 Claude Code analyzes your project first
- 🎯 Automatically selects the best agents
- 📚 Provides full context from your codebase
- ✅ Validates results and handles errors
- 🔄 Easy to iterate and refine

#### Slash Commands (Express Method - 20% of tasks)

```bash
# Direct execution for simple, well-defined tasks
/ax:agent Paris, design a REST API for user authentication
/ax:agent Bob, write a function to validate emails
/ax:agent Steve, review this code snippet
```

**Use slash commands when**:
- ⚡ Task is simple and well-defined
- 🎯 You know exactly which agent to use
- 🚀 Speed matters more than planning

**Perfect for**:
- 💬 All types of development workflows
- 🔄 Both simple and complex tasks
- 🤝 Single and multi-agent coordination
- 🎯 Interactive and automated workflows

**How it works**: Claude Code acts as an intelligent coordinator, analyzing context, selecting agents, and orchestrating their work seamlessly.

### 2️⃣ Terminal/CLI Mode (Power Users)

**Use AutomatosX as a standalone CLI tool** for automation, scripting, and direct control.

```bash
# In any terminal (Bash, Zsh, PowerShell)
ax run Paris "Design REST API for user authentication"
ax run Bob "Implement the auth API"           # Auto-receives Paris's design from memory
ax run Steve "Security audit the auth code"   # Auto-receives design + implementation

# Full CLI power
ax memory search "authentication"
ax agent list --by-team engineering
ax session list --active
```

**Perfect for**:
- ⚙️ CI/CD pipelines and automation scripts
- 🔧 Custom workflows and integrations
- 📊 Batch processing and reporting
- 🎛️ Advanced configuration and debugging

**How it works**: Direct command-line execution with full control over providers, memory, sessions, and configuration.

### Which Mode Should I Use?

| Scenario | Recommended Mode |
|----------|------------------|
| Coding in Claude Code | **Claude Code Integration** (`/ax:agent`) |
| Automation scripts | **Terminal Mode** (`ax run`) |
| CI/CD pipelines | **Terminal Mode** |
| Quick questions during dev | **Claude Code Integration** |
| Memory management | **Terminal Mode** |
| Agent creation/management | **Terminal Mode** |
| Multi-agent workflows | **Both work great!** |

### 📖 Learn More

- **Using Terminal Mode?** → [Complete Terminal Mode Guide](docs/guide/terminal-mode.md)
- **Using Claude Code?** → Continue reading below for slash command examples
- **Want both?** → They work together seamlessly! Memory is shared across both modes.

---

## ⚡ Quick Start

### Step 1: Install AutomatosX

**All Platforms** (Windows, macOS, Linux):

```bash
npm install -g @defai.digital/automatosx
```

**Verify Installation**:

```bash
ax --version
# Should show: 5.3.5 (or later)
```

> **Windows Users**: If `ax` command not found, see [Windows Troubleshooting](docs/troubleshooting/windows-troubleshooting.md)

---

### Step 2: Initialize Your Project ⚠️ REQUIRED

**Navigate to your project directory**, then run:

```bash
# Go to your project folder
cd your-project-folder

# Initialize AutomatosX (MUST do this first!)
ax init
```

**If you see "already initialized" but have issues**:

```bash
# Force reinitialize (overwrites existing setup)
ax init --force
```

> **💡 When to use `--force`**:
> - Seeing "0 agents" despite having `.automatosx` folder
> - Upgrading from older version
> - Files are corrupted or incomplete
> - Want to reset to default configuration

**What This Does**:
- Creates `.automatosx/` directory with 12 agents, 15 abilities, 4 teams
- Sets up memory database (SQLite FTS5)
- Creates shared workspace structure (PRD for planning, tmp for temporary files)
- Generates `automatosx.config.json`
- **NEW (v5.2.0)**: Automatically initializes git repository (required for Codex provider)

**Verify Initialization**:

```bash
ax status
# Should show: ✅ System is healthy
# With: 12 agents, 15 abilities, providers configured

ax list agents
# Should list 12 agents: backend, frontend, devops, security, etc.
```

> **⚠️ IMPORTANT**: If you still see "0 agents" or "System has issues" after `ax init`, try `ax init --force`!

---

### 🪟 Windows Support (Fully Tested)

**AutomatosX v5.3.5+ fully supports Windows 10 & 11** with automatic CLI provider detection and native Claude Code integration.

#### ✨ NEW in v5.3.5: Automatic Claude Code Detection

**Windows + Claude Code users no longer need manual configuration!**

When running AutomatosX inside Claude Code on Windows, the system automatically:
- ✅ **Detects Claude Code environment** (via ENV variables and process detection)
- ✅ **Auto-enables mock providers** (no external CLI tools needed)
- ✅ **Provides helpful error messages** with environment-specific guidance
- ✅ **Zero configuration required** for most users

```bash
# In Claude Code on Windows - works automatically!
ax run backend "Create a user authentication API"
# → Auto-detects Claude Code, uses mock providers seamlessly

# To verify auto-detection:
ax status
# → Should show: "Detected Claude Code environment - auto-enabling mock providers"
```

**How it works**: AutomatosX detects you're running inside Claude Code and automatically enables mock providers, eliminating the "claude: command not found" errors that plagued previous versions.

**Need real AI responses?** You can still use real providers:
```cmd
REM Windows CMD
set AUTOMATOSX_MOCK_PROVIDERS=false
ax run backend "task"

REM PowerShell
$env:AUTOMATOSX_MOCK_PROVIDERS="false"
ax run backend "task"
```

📖 **Complete Guide**: [Windows + Claude Code Integration](docs/troubleshooting/windows-claude-code-integration.md)

#### Quick Start for Windows Users (Terminal Mode)

**Most users don't need any configuration** - AutomatosX automatically detects provider CLIs installed via npm:

```bash
# 1. Install providers (if not already installed)
npm install -g @anthropic-ai/claude-cli
npm install -g @google/generative-ai-cli
npm install -g openai

# 2. Verify detection
ax status
```

**If providers are not detected**, you can manually specify paths:

**Windows (Command Prompt)**:
```cmd
set CLAUDE_CLI=C:\Users\YourName\AppData\Roaming\npm\claude.cmd
set GEMINI_CLI=C:\Users\YourName\AppData\Roaming\npm\gemini.cmd
ax status
```

**Windows (PowerShell)**:
```powershell
$env:CLAUDE_CLI="C:\Users\YourName\AppData\Roaming\npm\claude.cmd"
$env:GEMINI_CLI="C:\Users\YourName\AppData\Roaming\npm\gemini.cmd"
ax status
```

#### How Provider Detection Works

AutomatosX uses a **three-layer detection system**:

1. **ENV Variables** (highest priority) - `CLAUDE_CLI`, `GEMINI_CLI`, `CODEX_CLI`
2. **Config File** - Custom paths in `automatosx.config.json`
3. **PATH Detection** (automatic) - Standard system PATH
   - **Windows**: Uses `where.exe` + PATH×PATHEXT scanning
   - **Unix/macOS**: Uses `which` command

#### Windows-Specific Help

Having issues on Windows? See our comprehensive guides:

- 📖 **[Windows Setup Guide](docs/troubleshooting/windows-setup.md)** - Complete Windows installation walkthrough
- 🔧 **[Windows Troubleshooting](docs/troubleshooting/windows-troubleshooting.md)** - Common Windows issues and solutions
- ⚙️ **[Advanced Configuration](docs/guide/configuration.md)** - Custom paths, version requirements, and more

> **💡 Quick Tip**: Run `ax status --verbose` to see exactly which paths are being detected and used.

---

### Step 3: Run Your First Agent

#### Option A: Claude Code Integration (Recommended)

**Best Practice: Natural Language Collaboration**

Open Claude Code and try these prompts:

```
✅ "please work with ax agent to create a simple calculator function"
✅ "please work with ax agent to design a REST API for user management"
✅ "please work with ax agent to implement secure authentication"
```

**What happens**:
1. Claude Code analyzes your project context
2. Selects and coordinates the best agents
3. Agents execute with full context
4. Results are validated and explained
5. Easy to iterate: "please improve the error handling"

**Express Option: Slash Commands** (for simple tasks)

```bash
# Quick, direct execution
/ax:agent backend, write a function to validate email
/ax:agent quality, review this code snippet
```

📖 **Learn more**: [Best Practices Guide](docs/BEST-PRACTICES.md)

#### Option B: Terminal Mode (Power Users)

```bash
# Test with backend agent
ax run backend "Explain TypeScript in one sentence"

# Agents automatically share memory
ax run Paris "Design REST API for users"
ax run Bob "Implement the API"           # Auto-receives Paris's design
ax run Queenie "Write tests for the API" # Auto-receives design + implementation
```

---

### Common Issues

**"Agent not found" or "0 agents"**:
→ You forgot `ax init`. Run it in your project directory.

**Windows: Command not found**:
→ See [Windows Quick Fix](docs/troubleshooting/windows-quick-fix.md)

**No providers available**:
→ Install a provider CLI (Claude, Gemini, or OpenAI) or use mock providers for testing:
```bash
# Test with mock providers (no API needed)
set AUTOMATOSX_MOCK_PROVIDERS=true   # Windows CMD
$env:AUTOMATOSX_MOCK_PROVIDERS="true"  # Windows PowerShell
export AUTOMATOSX_MOCK_PROVIDERS=true  # macOS/Linux

ax run backend "Hello"
```

**That's it!** Agents now remember everything and coordinate automatically.

### MCP Server Mode (Advanced) ✨ NEW in v5.1.0

**Use AutomatosX as a native MCP server** for direct Claude Code integration via Model Context Protocol.

```bash
# Start MCP server
ax mcp

# Add to Claude Code's claude_desktop_config.json
{
  "mcpServers": {
    "automatosx": {
      "command": "ax",
      "args": ["mcp"]
    }
  }
}
```

**What you get**:
- ✅ **16 native MCP tools** for Claude Code
- ✅ **90% faster** than CLI execution (shared state, < 300ms p50 latency)
- ✅ **Persistent services** across requests (MemoryManager, SessionManager)
- ✅ **First-class integration** with Claude Desktop

**Available MCP Tools**:
- Agent execution: `run_agent`, `list_agents`
- Memory operations: `search_memory`, `memory_add`, `memory_list`, `memory_delete`, `memory_export`, `memory_import`, `memory_stats`, `memory_clear`
- Session management: `session_create`, `session_list`, `session_status`, `session_complete`, `session_fail`
- System info: `get_status`

**Performance**:
- No subprocess overhead (3-5s → 300ms)
- < 1.5s cold start
- Shared services across requests
- Native JSON-RPC 2.0 protocol

📖 **[Terminal Mode Guide](docs/guide/terminal-mode.md)** | **[Installation Guide](docs/guide/installation.md)** | **[Quick Start Tutorial](docs/guide/quick-start.md)**

---

## ⏱️ Stage Checkpoints & Run History

AutomatosX 5.3 introduces stage-aware checkpoints so you can pause long-running agent workflows, inspect intermediate outputs, and resume exactly where the run stopped.

### Enable resumable runs
- CLI: `ax run <agent> "<task>" --resumable` (add `--interactive` or `--hybrid` for live approval)
- Config: set `execution.stages.enabled` to `true` in `automatosx.config.json` to make stage checkpoints the default. Combine with `execution.stages.autoSaveCheckpoint` to persist after every stage.

When a stage finishes, AutomatosX stores a checkpoint under `.automatosx/checkpoints/<run-id>/` (artifacts, logs, and metadata). The CLI prints the UUID so you can resume or inspect it later.

### Manage checkpoints
- `ax resume <run-id>` — Resume a saved run. Flags such as `--interactive`, `--streaming`, `--hybrid`, or `--auto-continue` override the saved execution mode.
- `ax runs list [--status running|paused|completed|failed|aborted] [--agent <name>] [--limit <n>]` — Review recent checkpoints with progress and status.
- `ax runs show <run-id> [--artifacts]` — Inspect stage history, retry counts, and generated artifacts before resuming.
- `ax runs delete <run-id> [--force]` — Remove stale checkpoints or clear sensitive artifacts once a run is finalized.

Set `execution.stages.cleanupAfterDays` to control automatic pruning (default 7 days). For an end-to-end guide, see [Checkpoints & Run History](docs/guide/checkpoints-and-resume.md).

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](docs/guide/quick-start.md)** - Get up and running in 5 minutes
- **[Terminal Mode Guide](docs/guide/terminal-mode.md)** - Complete CLI usage tutorial
- **[Core Concepts](docs/guide/core-concepts.md)** - Understand agents, memory, providers
- **[Installation Guide](docs/guide/installation.md)** - Detailed setup instructions
- **[FAQ](FAQ.md)** - Common questions and answers
- **[Troubleshooting](TROUBLESHOOTING.md)** - Problem solving and platform-specific issues

### Core Features
- **[Agent Communication & Memory](docs/guide/agent-communication.md)** - How agents communicate and remember
- **[Multi-Agent Orchestration](docs/guide/multi-agent-orchestration.md)** - Natural language delegation
- **[Team Configuration](docs/guide/team-configuration.md)** - Team-based agent organization
- **[Agent Templates](docs/guide/agent-templates.md)** - Quick agent creation
- **[Checkpoints & Run History](docs/guide/checkpoints-and-resume.md)** - Manage resumable runs and checkpoint storage

### Tutorials
- **[Memory Management](docs/tutorials/memory-management.md)** - Hands-on memory system guide
- **[Creating Your First Agent](docs/tutorials/first-agent.md)** - Build custom agents

### Reference
- **[CLI Commands](docs/reference/cli-commands.md)** - Complete command reference
- **[Agent Directory](examples/AGENTS_INFO.md)** - All available agents

---

## 🔬 The Technical Advantage

| Feature | Traditional AI Chat | Claude Code | Claude Code + AutomatosX |
|---------|---------------------|-------------|--------------------------|
| **Memory** | No | No | ✅ SQLite FTS5 (< 1ms) |
| **Cost** | $20/month | Included | ✅ $0 (100% local) |
| **Multi-Agent** | No | No | ✅ 12 specialized agents |
| **Coordination** | Manual | Manual | ✅ Automatic delegation |
| **Context Retention** | Copy-paste | Session only | ✅ Persistent (days/weeks) |
| **Knowledge Sharing** | No | No | ✅ Cross-agent memory |
| **Privacy** | Cloud | Claude servers | ✅ 100% local data |
| **Speed** | Web UI | Terminal | ✅ Instant CLI |

---

## 💼 Real-World Use Cases

### 🏗️ Feature Development
```bash
# Using friendly agent names in terminal
ax run Paris "Design user authentication feature"
# Paris creates spec → Saved to memory

ax run Bob "Implement auth based on spec"
# Bob auto-receives spec → Implements code

ax run Steve "Security audit the auth implementation"
# Steve auto-receives spec + code → Performs audit

ax run Wendy "Document the auth system"
# Wendy auto-receives everything → Creates docs

# Or in Claude Code:
# /ax:agent Paris, design user authentication feature
# /ax:agent Bob, implement auth based on spec
```

**Result**: 4-step workflow, zero context re-explanation, complete audit trail

### 🐛 Bug Investigation
```bash
# Mix of names and roles (both work!)
ax run Queenie "Debug the payment timeout issue"
# Queenie analyzes, saves findings to memory

ax run backend "Fix the issue Queenie found"
# Backend reads Queenie's analysis → Implements fix

ax run quality "Test the payment fix"
# Quality knows the bug + fix → Comprehensive testing
```

**Result**: Coordinated debugging with full context preservation

### 📊 Research & Analysis
```bash
# Using agent names for clarity
ax run Daisy "Analyze user behavior patterns"
# Daisy analyzes patterns → Findings in memory

ax run Paris "Design features based on Daisy's analysis"
# Paris reads analysis → Creates product spec

ax run Eric "Business case for Paris's proposal"
# Eric has analysis + spec → Strategic evaluation
```

**Result**: Data-driven decision making with complete context

### 🚀 Multi-Agent Delegation
```bash
# Single command triggers automatic multi-agent coordination
ax run Paris "Build a user dashboard with real-time metrics"

# Paris analyzes and delegates automatically in its response:
# "I've designed the dashboard architecture:
#
# @Bob Please implement the REST API endpoints for user metrics
# @Frank Please create the React dashboard components
# @Steve Please review the data access security
#
# All specs are in my workspace."

# AutomatosX automatically:
# ✓ Bob implements backend API → Saves to workspace
# ✓ Frank builds frontend UI → Reads Bob's API spec
# ✓ Steve audits security → Reviews both implementations
# ✓ Results aggregated → Complete dashboard delivered
```

**Result**: One command orchestrates 4 agents with automatic coordination

**Delegation Syntaxes**:
```bash
@Bob Please implement this          # Direct mention
DELEGATE TO Frank: Create the UI    # Explicit syntax
Please ask Steve to audit this      # Polite request
I need Daisy to analyze the data    # Need expression
```

---

## 🎯 Why Teams Choose AutomatosX

### For Solo Developers
- **Extend Claude Code** with persistent memory
- **Never repeat context** - agents remember everything
- **Coordinate complex tasks** with multi-agent workflows
- **100% local** - your data stays private

### For Teams
- **Shared knowledge base** - export/import memory across team
- **Consistent quality** - agents learn from past work
- **Faster onboarding** - new members inherit team knowledge
- **Audit trail** - complete history of all decisions

### For Claude Code Power Users
- **Slash command integration** - `/ax:agent` for instant access in Claude Code
- **Terminal-native** - no context switching
- **CLI-based** - scriptable and automatable
- **Zero latency** - local memory = instant search

---

## 🛠️ Production-Ready

✅ **1,845 tests passing** (100% pass rate)
✅ **TypeScript strict mode** (zero errors)
✅ **~56% test coverage** (comprehensive testing)
✅ **458KB bundle** (99.9% smaller than v3.x)
✅ **< 1ms memory search** (62x faster than v3.x)

### Tested Platforms

AutomatosX has been thoroughly tested across multiple operating systems:

- ✅ **macOS**: macOS 15+ (tested on macOS 15)
- ✅ **Ubuntu**: Ubuntu 24.04 LTS
- ✅ **Windows**: Windows 10 & Windows 11

### Performance Metrics

```
Memory Search: < 1ms (10,000 entries)
Bundle Size:   458KB (down from 340MB in v3.x)
Dependencies:  19 packages (down from 589 in v3.x)
Test Coverage: ~56% (1,845 tests passing, 100% pass rate)
Memory Cost:   $0 (no API calls)
```

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3 (strict mode)
- **Memory**: SQLite + FTS5 (built-in full-text search)
- **Testing**: Vitest 2.x (1,259 tests)
- **Build**: tsup/esbuild
- **Providers**: Claude CLI, Gemini CLI, Codex CLI (OpenAI)

---

## 🔒 Security

AutomatosX packages are published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), providing supply chain security and verifying package authenticity.

You can verify the provenance of any version:

```bash
npm view @defai.digital/automatosx@latest --json | jq .dist
```

Look for the `attestations` field which confirms the package was built in GitHub Actions.

For more information, see our [Security Policy](SECURITY.md).

---

## 🚧 Coming Soon

- Enhanced Claude Code integration
- Visual workflow builder
- Advanced memory analytics
- Cross-project knowledge sharing
- Plugin system for custom providers

---

## 🤝 Contributing

We welcome contributions! AutomatosX is built in the open.

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Development Setup](CONTRIBUTING.md#development-setup)** - Local setup
- **[Architecture Guide](docs/guide/core-concepts.md)** - Understand the codebase

**Join the community**:
- 🐛 [Report Issues](https://github.com/defai-digital/automatosx/issues)
- 💡 [Feature Requests](https://github.com/defai-digital/automatosx/issues/new)

---

## 📄 License

AutomatosX is [Apache 2.0 licensed](LICENSE).

---

## 🔗 Links

- **📦 npm**: [@defai.digital/automatosx](https://www.npmjs.com/package/@defai.digital/automatosx)
- **🐙 GitHub**: [defai-digital/automatosx](https://github.com/defai-digital/automatosx)
- **📖 Documentation**: [docs/](docs/)
- **❓ FAQ**: [FAQ.md](FAQ.md)
- **🎉 Releases**: [GitHub Releases](https://github.com/defai-digital/automatosx/releases)
- **📋 Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

**Transform Claude Code into an intelligent, coordinated team with AutomatosX.** 🚀

**Built with ❤️ by the AutomatosX team**
