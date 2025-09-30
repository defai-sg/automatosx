# AutomatosX Documentation

**AutomatosX** is an AI agent orchestration platform that enables Claude Code and other AI systems
to understand and work with specialized agent roles for software development tasks.

## 📚 Documentation Structure

This documentation follows software industry best practices with focused documents:

| Document | Purpose | Target Audience | Content Focus |
|---|---|---|---|
| **[QUICKSTART.md](QUICKSTART.md)** | 5-minute install + first task | **New Users** | Fast setup and first run |
| **[TUTORIALS.md](TUTORIALS.md)** | Step-by-step guided learning | **New Users** | How to get started and perform common tasks |
| **[AGENT-ROLES.md](AGENT-ROLES.md)** | Complete agent reference guide | **All Users** | Agent roles, personalities, features, and usage examples |
| **[FAQ.md](FAQ.md)** | Frequently asked questions | **All Users** | Common questions about setup, design, and usage |
| **[OPERATIONS.md](OPERATIONS.md)** | Essential operations reference | AI Systems + Users | How to use AutomatosX (command reference) |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Problem-solving and diagnostics | All Users | How to fix common errors and advanced issues |
| **[CONCEPTS.md](CONCEPTS.md)** | Core concepts and mental models | AI Systems + Developers | What AutomatosX does and why |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design and components | AI Systems + Developers | How AutomatosX works internally |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Maintenance and enhancement | Developers + Maintainers | How to extend AutomatosX |
| **[PROJECT-HISTORY.md](PROJECT-HISTORY.md)** | Evolution and design decisions | All stakeholders | Why AutomatosX exists and how it evolved |
| **[ROADMAP.md](ROADMAP.md)** | Future development plans | Stakeholders + Contributors | Strategic vision and upcoming features |

## 🚀 Quick Start

For immediate usage:
1. **New Users**: Start with the **[TUTORIALS.md](TUTORIALS.md)** for a guided walkthrough.
2. **Common Questions**: Check **[FAQ.md](FAQ.md)** for setup, design, and usage answers.
3. **Experienced Users**: Keep the **[OPERATIONS.md](OPERATIONS.md)** handy as a command reference.
4. **Developers**: Begin with **[CONCEPTS.md](CONCEPTS.md)**, then dive into **[ARCHITECTURE.md](ARCHITECTURE.md)** and **[DEVELOPMENT.md](DEVELOPMENT.md)**.
5. **If you get stuck**: Check the **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** guide.

## 🎯 What is AutomatosX?

AutomatosX provides **21 specialized AI agent roles** (backend, frontend, security, etc.) with:
- **Three-layer architecture**: YAML profiles + Markdown abilities + JavaScript personalities
- **Memory system**: Milvus vector database for cross-agent knowledge sharing
- **Claude Code integration**: Slash commands and MCP servers
- **Filesystem management**: Safe upgrades and factory reset capabilities

## 🔧 Core Operations

```bash
# Essential commands
automatosx validate              # System validation
automatosx factory-reset         # Safe system reset
automatosx filesystem:stats      # System information
/ax:init                         # Claude Code initialization
```

This documentation is designed to be **minimal but complete** - enabling both AI systems and humans
to understand, maintain, and enhance AutomatosX effectively.
