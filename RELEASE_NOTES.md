# AutomatosX Release Notes

This document tracks releases and changes for the AutomatosX AI agent orchestration platform.

## Latest Release

**Version**: 3.1.4
**Release Date**: November 2024
**Status**: Active Development

### v3.1.4 - Agent Management & Documentation Improvements
*Released: November 2024*

**Key Improvements:**
- 🎯 **Agent Role Optimization**: Removed translator agent, focusing on 20 core specialized roles
- 📚 **Documentation Accuracy**: Fixed agent count from incorrect 13 to correct 20 across all documentation
- 📦 **Complete Package**: Full npm package with 199 files ensuring GitHub/npm parity
- 🔧 **Example Updates**: Replaced outdated translator examples with current analyst examples

**Agent Lineup (20 Roles):**
- **Core Development (14)**: algorithm, analyst, architect, backend, data, design, devops, docs, edge, frontend, network, quality, quantum, security
- **Business & Leadership (6)**: ceo, cfo, cto, legal, marketer, product

**Technical:**
- Safe agent removal using built-in scripts
- Automatic backup system for removed roles
- Profile synchronization and cleanup
- Documentation consistency validation

---

### v3.1.3 - Complete npm Package
*Released: November 2024*

**Major Fix:**
- 📦 **Complete npm Package**: Fixed npm package from 6 files to 199 files
- 📚 **Full Documentation**: Added complete docs/ directory to npm package
- 🔧 **Configuration Files**: Included all necessary configuration files
- 🎯 **GitHub Parity**: npm package now matches GitHub repository content

**What's Included:**
- Complete source code (src/ directory)
- Full documentation (docs/ directory - 12 files)
- Configuration files (.markdownlint.json, .markdownlintignore)
- Important markdown files (CLAUDE.md, CONTRIBUTING.md, SECURITY.md, etc.)

---

### v3.1.2 - Initial Complete Release
*Released: November 2024*

**Initial Features:**
- 🤖 **AI Agent Orchestration**: Multi-provider routing with Claude Code, OpenAI, Gemini
- 📋 **20 Specialized Agents**: Complete lineup from technical to business roles
- 💾 **Memory System**: Milvus Lite vector database with SQLite fallback
- 🔧 **CLI-First Architecture**: Zero-cost access through CLI authentication
- 📚 **Complete Documentation**: Comprehensive guides and examples

**Project Origins:**
- Born from customer request at Tokyo AI Expo November 2024
- Evolved from Python to JavaScript for better CLI integration
- Focused on practical business automation solutions