# AutomatosX

> **AI Agent Orchestration for Claude Code**
>
> Transform Claude Code into a multi-agent powerhouse with persistent memory, intelligent delegation, and zero-cost knowledge management.

[![npm version](https://img.shields.io/npm/v/@defai.digital/automatosx.svg)](https://www.npmjs.com/package/@defai.digital/automatosx)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-1,149%20passing-brightgreen.svg)](#)

**Status**: ✅ Production Ready · v5.0.8 · October 2025

---

## 🎯 Built for Claude Code

**AutomatosX extends Claude Code with specialized AI agents that remember context, delegate tasks, and collaborate autonomously.**

```bash
# In Claude Code, simply use /ax
/ax run paris "Design authentication system with JWT"
/ax run sofia "Implement the auth design"  # Sofia auto-receives Paris's design from memory
/ax memory search "authentication"          # Instant search of all past decisions
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
Day 1: Paris designs architecture → Saved to memory
Day 2: /ax run sofia "implement auth" → Sofia finds Paris's design automatically
Day 3: /ax run steve "security audit" → Steve has full context from Day 1-2
```

**Time saved**: Hours per week. **Quality**: Consistent. **Cost**: $0.

---

## 🚀 What's New

**v5.0.8** (October 2025): Critical Fixes - Timeout & Memory
- **CRITICAL FIX**: Multi-stage agents now respect `--timeout` flag
- **CRITICAL FIX**: Memory system enforces `maxEntries` and `autoCleanup` limits
- **Timeout support**: AbortSignal properly passed to all stage executors
- **Memory limits**: Automatic cleanup prevents database growth issues
- **100% backward compatible**: Drop-in replacement for v5.0.7

**v5.0.6**: File Operation Tools Enabled
**v5.0.5**: Provider Parameters & Version Management
**v5.0.4**: Memory saving now works automatically
**v5.0.3**: Special character support in memory search
**v5.0.0**: Agent template system for quick agent creation

[📋 Full Changelog](CHANGELOG.md) | [🎉 Release Notes](https://github.com/defai-digital/automatosx/releases)

---

## 🧠 Core Value: Persistent Memory

**AutomatosX remembers everything**. Every agent conversation is automatically saved and searchable.

### How It Works

```typescript
// Automatic memory saving
/ax run paris "Design calculator with add/subtract"
→ Task + Response saved to SQLite FTS5

// Automatic memory retrieval
/ax run sofia "Implement the calculator"
→ Memory searches "calculator" automatically
→ Sofia receives: "# Relevant Context from Memory: Paris's design..."
→ Sofia implements WITHOUT you repeating the spec
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
/ax run paris "Build authentication feature"

Paris response:
  "I'll design the auth system with JWT + OAuth2.

   @sofia Please implement the JWT authentication API based on this design.
   @steve Please audit the implementation for security issues."

// AutomatosX automatically:
// 1. Sofia receives full spec, implements code
// 2. Steve receives spec + code, performs audit
// 3. Results aggregated back to Paris
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

## 🎭 15 Specialized Agents, 4 Professional Teams

**Every agent optimized for their domain with the best AI provider**:

### 👥 Core Team (OpenAI)
General assistance and code generation
- **Alex** - Versatile assistant for general tasks
- **Sofia** - Senior software engineer (clean code, TDD, pragmatic)
- **Ryan** - Code reviewer (quality, security, performance)
- **Danny** - Debugger specialist
- **Wendy** - Technical writer

### 💻 Engineering Team (Claude)
Deep reasoning for technical work
- **Bob** - Backend expert (API design, databases, microservices)
- **Frank** - Frontend specialist (React, UX, accessibility)
- **Oliver** - DevOps engineer (infrastructure, CI/CD, cloud)
- **Steve** - Security expert (threat modeling, security audit)
- **Queenie** - QA specialist (testing strategies, test automation)

### 📊 Business Team (Gemini)
Strategic thinking and analysis
- **Eric** - CEO (business strategy, organizational leadership)
- **Tony** - CTO (technology strategy, technical leadership)
- **Daisy** - Data Analyst (data analysis, ML, statistical modeling)

### 🎨 Design Team (Gemini)
Creative and design work
- **Paris** - Product Manager (product strategy, user research)
- **Debbee** - UX/UI Designer (user experience, visual design)

[📖 Complete Agent Directory](examples/AGENTS_INFO.md)

---

## ⚡ Quick Start

### Installation

```bash
npm install -g @defai.digital/automatosx
```

### In Claude Code

```bash
# Initialize (first time only)
/ax init

# Run agents
/ax run paris "Design REST API for users"
/ax run sofia "Implement the API"           # Auto-receives Paris's design
/ax run queenie "Write tests for the API"    # Auto-receives design + implementation

# Search memory
/ax memory search "API design"
/ax memory list --agent paris

# Manage agents
/ax agent list
/ax agent show sofia
/ax agent create backend --template developer
```

**That's it!** Agents now remember everything and coordinate automatically.

📖 **[Full Installation Guide](docs/guide/installation.md)** | **[Quick Start Tutorial](docs/guide/quick-start.md)**

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](docs/guide/quick-start.md)** - Get up and running in 5 minutes
- **[Core Concepts](docs/guide/core-concepts.md)** - Understand agents, memory, providers
- **[Installation Guide](docs/guide/installation.md)** - Detailed setup instructions

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
| **Multi-Agent** | No | No | ✅ 15 specialized agents |
| **Coordination** | Manual | Manual | ✅ Automatic delegation |
| **Context Retention** | Copy-paste | Session only | ✅ Persistent (days/weeks) |
| **Knowledge Sharing** | No | No | ✅ Cross-agent memory |
| **Privacy** | Cloud | Claude servers | ✅ 100% local data |
| **Speed** | Web UI | Terminal | ✅ Instant CLI |

---

## 💼 Real-World Use Cases

### 🏗️ Feature Development
```bash
/ax run paris "Design user authentication feature"
# Paris creates spec → Saved to memory

/ax run sofia "Implement auth based on spec"
# Sofia auto-receives spec → Implements code

/ax run steve "Security audit the auth implementation"
# Steve auto-receives spec + code → Performs audit

/ax run wendy "Document the auth system"
# Wendy auto-receives everything → Creates docs
```

**Result**: 4-step workflow, zero context re-explanation, complete audit trail

### 🐛 Bug Investigation
```bash
/ax run danny "Debug the payment timeout issue"
# Danny analyzes, saves findings to memory

/ax run sofia "Fix the issue Danny found"
# Sofia reads Danny's analysis → Implements fix

/ax run queenie "Test the payment fix"
# Queenie knows the bug + fix → Comprehensive testing
```

**Result**: Coordinated debugging with full context preservation

### 📊 Research & Analysis
```bash
/ax run daisy "Analyze user behavior patterns"
# Daisy analyzes data → Findings in memory

/ax run paris "Design features based on Daisy's analysis"
# Paris reads analysis → Creates product spec

/ax run eric "Business case for Paris's proposal"
# Eric has analysis + spec → Strategic evaluation
```

**Result**: Data-driven decision making with complete context

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
- **Slash command integration** - `/ax` for instant access
- **Terminal-native** - no context switching
- **CLI-based** - scriptable and automatable
- **Zero latency** - local memory = instant search

---

## 🛠️ Production-Ready

✅ **1,149 tests passing** (100% pass rate)
✅ **TypeScript strict mode** (zero errors)
✅ **84% test coverage** (comprehensive testing)
✅ **46MB bundle** (87% smaller than v3.x)
✅ **< 1ms memory search** (62x faster than v3.x)

### Performance Metrics

```
Memory Search: < 1ms (10,000 entries)
Bundle Size:   46MB (down from 340MB in v3.x)
Dependencies:  158 packages (down from 589 in v3.x)
Test Coverage: 84.19% (1,149 tests)
Memory Cost:   $0 (no API calls)
```

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3 (strict mode)
- **Memory**: SQLite + FTS5 (built-in full-text search)
- **Testing**: Vitest 2.x (1,149 tests)
- **Build**: tsup/esbuild
- **Providers**: Claude CLI, Gemini CLI, OpenAI Codex

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
- **🎉 Releases**: [GitHub Releases](https://github.com/defai-digital/automatosx/releases)
- **📋 Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

**Transform Claude Code into an intelligent, coordinated team with AutomatosX.** 🚀

**Built with ❤️ by the AutomatosX team**
