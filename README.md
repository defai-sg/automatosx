# AutomatosX

> **Provider-Agnostic AI Agent Orchestration**
>
> A CLI-first tool for orchestrating specialized AI agents with persistent memory, intelligent delegation, and cross-provider support (Claude, Gemini, OpenAI).

[![npm version](https://img.shields.io/npm/v/@defai.digital/automatosx.svg)](https://www.npmjs.com/package/@defai.digital/automatosx)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-1,136%20passing-brightgreen.svg)](#)

**Status**: ✅ Production Ready · v5.1.0 · October 2025

Looking for answers? See the [FAQ](docs/faq.md).

---

## 🎯 Built for Claude Code

**AutomatosX extends Claude Code with specialized AI agents that remember context, delegate tasks, and collaborate autonomously.**

```bash
# In Claude Code, simply use /ax:agent
/ax:agent Paris, design authentication system with JWT
/ax:agent Bob, implement the auth design  # Bob auto-receives Paris's design from memory
```

**The result**: Claude Code becomes a **learning, coordinated team** instead of a stateless assistant.

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
- **Workspace isolation**: No file collisions

### Benefits

✅ **Automatic coordination**: No manual task switching
✅ **Parallel execution**: Multiple agents work simultaneously
✅ **Transparent workflows**: Full delegation chain visible
✅ **Context preservation**: Every agent has complete context

**Learn more**: [Multi-Agent Orchestration Guide](docs/guide/multi-agent-orchestration.md)

---

## 🎭 12 Specialized Agents with Clear Governance

**v5.0.12 introduces strict role ownership and delegation controls to eliminate cycles**:

### 💻 Engineering Team (Implementers)
**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation
- **Bob** (backend) - API design, database modeling, caching strategies
  - Can delegate to: frontend, data, security, quality, devops
- **Frank** (frontend) - Component architecture, state management, accessibility
  - Can delegate to: backend, design, security, quality, devops
- **Oliver** (devops) - Infrastructure as code, CI/CD pipelines, observability
  - Can delegate to: backend, frontend, security, quality
- **Daisy** (data) - Data modeling, ETL pipelines, SQL optimization
  - Can delegate to: backend, security, quality
- **Steve** (security) - **Sole owner** of security-audit, threat modeling, secure coding review
  - Can delegate to: backend, frontend, devops, quality

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
**maxDelegationDepth: 1** - Delegate to implementers, focus on strategy, no re-delegation
- **Paris** (product) - Product strategy, feature planning, roadmap
  - Can delegate to: backend, frontend, design, writer, quality
- **Eric** (ceo) - Business strategy, organizational leadership
  - Can delegate to: paris, tony, all agents
- **Tony** (cto) - Technology strategy, technical leadership
  - Can delegate to: backend, frontend, devops, security, quality

### 🔬 Research Team (Specialist)
**maxDelegationDepth: 0** - Execute research work directly, no delegation
- **Rodman** (researcher) - Idea validation, feasibility analysis, research reports
  - Specializes in: logical reasoning, risk assessment, literature review
  - Produces: executive summaries, feasibility studies, long-form research reports

**New in v5.0.12**: Each agent has role-specific workflow stages, smart ability loading (abilitySelection), and explicit delegation scopes. Most agents have `maxDelegationDepth: 1` to allow cross-domain collaboration while preventing delegation cycles.

[📖 Complete Agent Directory](examples/AGENTS_INFO.md)

---

## 🚀 Two Ways to Use AutomatosX

AutomatosX offers **two powerful modes** to fit your workflow:

### 1️⃣ Claude Code Integration (Recommended)

**Use AutomatosX agents directly inside Claude Code conversations** with the `/ax:agent` slash command.

```bash
# In Claude Code, use the slash command
/ax:agent Paris, design a REST API for user authentication
/ax:agent Bob, implement the auth API from Paris's design
/ax:agent Steve, security audit the authentication code
```

**Perfect for**:
- 💬 Interactive development workflows
- 🔄 Seamless context switching within Claude Code
- 🤝 Collaborative coding sessions
- 🎯 Quick agent delegation while coding

**How it works**: Claude Code executes AutomatosX commands behind the scenes, brings results back into your conversation, and maintains full context.

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

### Installation

```bash
npm install -g @defai.digital/automatosx
```

### Claude Code Integration

```bash
# In Claude Code, initialize (first time only)
# Ask Claude: "Please run ax init"
# Or use terminal mode: ax init

# Then use the slash command for agents
/ax:agent Paris, design REST API for users
/ax:agent Bob, implement the API
/ax:agent Queenie, write tests for the API
```

**What happens**:
1. Claude Code executes AutomatosX behind the scenes
2. Paris designs the API → Saved to memory
3. Bob reads Paris's design from memory → Implements code
4. Queenie reads everything → Writes comprehensive tests
5. Results flow back into your Claude Code conversation

### Terminal Mode

```bash
# Initialize your project
ax init

# Run agents from any terminal
ax run Paris "Design REST API for users"
ax run Bob "Implement the API"           # Auto-receives Paris's design from memory
ax run Queenie "Write tests for the API" # Auto-receives design + implementation

# Manage memory and agents
ax memory search "API design"
ax agent list --by-team engineering
ax agent create myagent --template developer
```

**That's it!** Agents now remember everything and coordinate automatically across both modes.

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

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](docs/guide/quick-start.md)** - Get up and running in 5 minutes
- **[Terminal Mode Guide](docs/guide/terminal-mode.md)** - Complete CLI usage tutorial
- **[Core Concepts](docs/guide/core-concepts.md)** - Understand agents, memory, providers
- **[Installation Guide](docs/guide/installation.md)** - Detailed setup instructions
- **[FAQ](docs/faq.md)** - Common questions and troubleshooting

### Core Features
- **[Agent Communication & Memory](docs/guide/agent-communication.md)** - How agents communicate and remember
- **[Multi-Agent Orchestration](docs/guide/multi-agent-orchestration.md)** - Natural language delegation
- **[Team Configuration](docs/guide/team-configuration.md)** - Team-based agent organization
- **[Agent Templates](docs/guide/agent-templates.md)** - Quick agent creation

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

✅ **1,136 tests passing** (100% pass rate)
✅ **TypeScript strict mode** (zero errors)
✅ **~56% test coverage** (comprehensive testing)
✅ **458KB bundle** (99.9% smaller than v3.x)
✅ **< 1ms memory search** (62x faster than v3.x)

### Performance Metrics

```
Memory Search: < 1ms (10,000 entries)
Bundle Size:   458KB (down from 340MB in v3.x)
Dependencies:  19 packages (down from 589 in v3.x)
Test Coverage: ~56% (1,136 tests passing, 100% pass rate)
Memory Cost:   $0 (no API calls)
```

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3 (strict mode)
- **Memory**: SQLite + FTS5 (built-in full-text search)
- **Testing**: Vitest 2.x (1,136 tests)
- **Build**: tsup/esbuild
- **Providers**: Claude CLI, Gemini CLI, Codex CLI (OpenAI)

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
- **❓ FAQ**: [docs/faq.md](docs/faq.md)
- **🎉 Releases**: [GitHub Releases](https://github.com/defai-digital/automatosx/releases)
- **📋 Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

**Transform Claude Code into an intelligent, coordinated team with AutomatosX.** 🚀

**Built with ❤️ by the AutomatosX team**
