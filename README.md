# AutomatosX v4.5.9

> **The control tower for shipping customer-facing ideas—without the chaos**
> Orchestrate specialized AI agents to move work from slide decks to production, keeping product, engineering, and stakeholders in sync.

[![npm version](https://img.shields.io/npm/v/@defai.sg/automatosx.svg)](https://www.npmjs.com/package/@defai.sg/automatosx)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-841%20passing-brightgreen.svg)](#production-ready-toolkit)

**Teams and solo builders choose AutomatosX because:**
- 🎯 **Keeps people aligned, not just code moving** – track roadmaps, builds, and launch tasks in one place
- 🛡️ **Protects quality across the whole release** – built-in guardrails for tests, docs, compliance, approvals
- ⚡ **Shortens idea-to-impact gap** – organized workflows mean faster onboarding, tighter handoffs, confident timelines
- 💰 **10× more cost-effective** – CLI-based orchestration beats expensive assistants APIs

**Status**: ✅ Production Release · **Version**: 4.5.9 · **Released**: October 2025

---

## Why AutomatosX?

### The Real Problem: Coordination, Not Code

Building software is easy. **Shipping it reliably is hard.**

Your team faces:
- **Context chaos**: Marketing doesn't know what's shipping next week. Sales asks "who owns this?" Nobody remembers what was decided.
- **Quality gaps**: Deadlines loom. Release notes go stale. Compliance updates get skipped. Tests aren't run.
- **Handoff friction**: New contributors ask the same questions. Cross-team work stalls. Executives lose confidence in timelines.

**Claude or ChatGPT can write code fast—but they can't tell your team what to ship, in what order, or who's responsible.**

### The AutomatosX Solution

**Think of AutomatosX as your operating system for launches.** Every plan, checklist, test result, and approval lives in one orchestrated workflow—so your team stays in sync from kickoff to post-launch.

```bash
# Product Manager: Kickoff sprint
automatosx run planner "Draft Q1 roadmap with marketing milestones"

# Engineer: Build with guardrails
automatosx run coder "Scaffold auth with Supabase"
automatosx run reviewer "Audit API security before launch"

# QA: Run pre-launch checks
automatosx run tester "Execute integration test suite"

# Marketing: Coordinate launch
automatosx run writer "Draft release notes and changelog"
automatosx memory search "What did sales promise Customer #1234?"
```

**Every agent has:**
- 🧠 **Persistent memory** – recalls every decision, deadline, and dependency
- 🎭 **Defined roles** – researcher, coder, reviewer, tester, writer (no context-switching)
- 🔒 **Workspace isolation** – agents work independently without colliding
- 💸 **Cost controls** – pay per CLI call, not expensive subscription seats

### Real Impact: Before vs After

| Without AutomatosX | With AutomatosX |
|-------------------|-----------------|
| 📋 Scattered docs, Slack threads, "who owns this?" | 🎯 Single source of truth—everyone works from the same playbook |
| 🐌 New hires take weeks to ramp | ⚡ Organized workflows = onboarding in days |
| 💸 $200/mo per seat (ChatGPT Pro + APIs) | 💰 $20/mo total (pay-per-use CLI) = 10× savings |
| 🤯 Release notes forgotten, compliance skipped | 🛡️ Built-in guardrails catch gaps before launch |
| ⏳ 3 weeks from plan to production | 🚀 3 days—agents handle research, build, review, docs in parallel |

### "Why not just use Claude Code or ChatGPT?"

**Claude Code / ChatGPT**: Brilliant for answering quick questions or generating snippets. But they can't:
- Track who approved the launch plan
- Remind you the release checklist is incomplete
- Coordinate work across product, engineering, and marketing
- Remember context from last quarter's sprint

**AutomatosX**: Built for **shipping outcomes, not just code**. It's the glue that:
- Keeps teams aligned on what's shipping and when
- Enforces quality gates (tests, docs, compliance) automatically
- Turns scattered tribal knowledge into dependable workflows
- Runs unattended in CI/CD while remembering every conversation

**In plain terms**: Claude is a smart assistant. AutomatosX is your launch control center. Use both—but only AutomatosX ensures the right work happens, in the right order, by the right people.

---

## What You Can Build in Minutes

### 🔍 Research Assistant
```bash
automatosx run researcher "Analyze the top 5 TypeScript frameworks in 2025"
# → Searches web, summarizes findings, cites sources
```

### 🚨 On-Call Incident Bot
```bash
automatosx run oncall "Check error logs from the last hour"
# → Scans logs, identifies critical errors, auto-creates tickets
```

### 💬 Customer Support Copilot
```bash
automatosx chat support
> "What did Customer #1234 ask about last week?"
# → Searches memory, recalls context, suggests responses
```

### 🔄 Batch Processing with Fallbacks
```bash
automatosx run batch-analyzer "Process all user feedback from Q3"
# → Tries Claude → falls back to Gemini if rate-limited → exports results
```

See `examples/` for ready-to-run agent profiles.

---

## Quick Start (< 2 minutes)

### 1. Install
```bash
npm install -g @defai.sg/automatosx
# or run without installing
npx @defai.sg/automatosx --help
```

### 2. Setup Provider CLI (one-time)
AutomatosX uses your installed CLI tools—**no API keys needed**:

```bash
# Install Claude CLI (if you use Claude)
brew install claude

# Or install Gemini CLI (if you use Gemini)
# Follow: https://ai.google.dev/gemini-api/docs/cli

# Or install OpenAI Codex CLI (if you use Codex)
# Follow OpenAI CLI setup instructions
```

AutomatosX will automatically detect and use your installed CLIs.

### 3. Run your first agent
```bash
automatosx run assistant "Explain quantum computing in 3 sentences"
# AutomatosX calls your installed Claude/Gemini/Codex CLI under the hood
```

**That's it!** Now explore:
```bash
automatosx list agents              # See available agents
automatosx chat assistant           # Interactive mode
automatosx memory search "quantum"  # Recall past conversations
```

---

## Key Capabilities

**Composable Agents**
Define roles, abilities, and guardrails in `.automatosx/agents/*.yaml` and extend skills with Markdown knowledge bases.

```yaml
# .automatosx/agents/researcher.yaml
name: researcher
description: Research specialist with web search and citation abilities
model: claude-3-sonnet-20240229
temperature: 0.7
abilities:
  - web_search
  - summarize
  - cite_sources
```

**Intelligent Memory**
SQLite + `vec` delivers millisecond semantic recall with export/import, quotas, and deterministic search.

```bash
# Store information
automatosx run assistant "Remember: Project Alpha launches Q1 2025"

# Search later (even in different sessions)
automatosx memory search "when does Alpha launch"
# → Returns: "Project Alpha launches Q1 2025" (0.72ms)
```

**Secure Execution**
Path boundary validation, workspace sandboxes, and deterministic config precedence keep agents in safe lanes.

- ✅ Agents read user files (validated paths only)
- ✅ Agents write to isolated workspaces (`.automatosx/workspaces/<agent>/`)
- ✅ Input sanitization prevents path traversal attacks

**Developer Experience**
Strict TypeScript, CLI ergonomics, and rich docs unblock contributors quickly.

```bash
npm run dev -- run assistant "test"  # Dev mode with hot reload
npm test                              # 841 tests with Vitest
npm run typecheck                     # Strict TS validation
```

---

## Architecture at a Glance

```
automatosx/
├── src/
│   ├── core/        # config, routing, memory, path resolution
│   ├── cli/         # command definitions (run, chat, memory, etc.)
│   ├── providers/   # Claude, Gemini, OpenAI adapters
│   └── utils/       # logger, performance tracking
├── tests/
│   ├── unit/        # 677 tests (core modules)
│   ├── integration/ # 78 tests (CLI commands)
│   └── e2e/         # 17 tests (complete workflows)
├── docs/            # guides, references, troubleshooting
└── examples/        # agent profiles and abilities
```

Strict mode TypeScript + Vitest ensures every module is covered before it ships.

---

## Production-Ready Toolkit

| Metric | v3.1 | v4.0 | Improvement |
|--------|------|------|-------------|
| Bundle size | 340 MB | 46 MB | **87% ↓** |
| Vector search | 45 ms | 0.72 ms | **62× ↑** |
| Dependencies | 589 | 158 | **73% ↓** |
| Tests passing | 512 | 841 | **64% ↑** |

**Run the essentials:**
```bash
npm run build          # Bundle via tsup into dist/
npm test               # All test suites
npm run typecheck      # Strict TS validation
npm run test:coverage  # Generate coverage report
```

---

## Commands You'll Use Daily

```bash
# Execute agents
automatosx run <agent> "<task>"      # One-time execution
automatosx chat <agent>               # Interactive session

# Agents have memorable names! 🎉
automatosx run Bob "Design a RESTful API"      # Bob = Backend Engineer
automatosx run Frank "Create login component"  # Frank = Frontend Developer
automatosx run Steve "Review auth code"        # Steve = Security Engineer

# Manage agents
automatosx list agents                # Show available agents
automatosx list abilities             # Show available abilities

# Memory operations
automatosx memory search "<query>"   # Semantic search
automatosx memory export --output memories.json
automatosx memory import --input memories.json
automatosx memory clear               # Clear all memories

# Configuration
automatosx init [path]                # Initialize project
automatosx config --list              # View settings
automatosx config --set <key> --value <val>
automatosx status                     # System status
```

Full CLI reference: `docs/reference/cli-commands.md`

---

## Real-World Examples

### Research Pipeline
```bash
# 1. Define researcher agent
cat > .automatosx/agents/researcher.yaml <<EOF
name: researcher
model: claude-3-sonnet-20240229
abilities: [web_search, summarize, cite_sources]
EOF

# 2. Run research task
automatosx run researcher "Compare Redis vs PostgreSQL for session storage"

# 3. Search results later
automatosx memory search "session storage comparison"
```

### CI/CD Integration
```yaml
# .github/workflows/code-review.yml
- name: AI Code Review
  run: |
    automatosx run reviewer "Review changes in PR #${{ github.event.number }}"
```

### Cron Job Monitoring
```bash
# Monitor logs every hour
0 * * * * automatosx run oncall "Check last hour logs for errors" | mail -s "Hourly Report" team@company.com
```

---

## Configuration

AutomatosX uses JSON configuration with priority order:

1. `.automatosx/config.json` (project-specific)
2. `automatosx.config.json` (project root)
3. `~/.automatosx/config.json` (user global)

**Example configuration:**
```json
{
  "$schema": "https://automatosx.com/schema/config.json",
  "version": "4.0.0",
  "providers": {
    "preferred": "claude",
    "claude": {
      "command": "claude"
    },
    "gemini": {
      "command": "gemini"
    },
    "openai": {
      "command": "openai"
    }
  },
  "memory": {
    "maxEntries": 10000,
    "embeddingDimensions": 1536
  }
}
```

**How it works:**
- AutomatosX calls your installed CLI commands (`claude`, `gemini`, `openai`)
- Each CLI uses its own default model (you can override via CLI config if needed)
- No need to specify model versions—CLIs auto-update to latest models
- You manage your own subscription/plan directly with the provider
- No API keys stored in AutomatosX—your CLI handles authentication
- Pay only for what you use via your existing CLI plan

---

## Documentation & Support

- **Guides**: `docs/guide/` (installation, quick start, core concepts)
- **FAQ**: `FAQ.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Issues**: [GitHub Issues](https://github.com/defai-sg/automatosx/issues)
- **Discussions**: [GitHub Discussions](https://github.com/defai-sg/automatosx/discussions)
- **npm**: https://www.npmjs.com/package/@defai.sg/automatosx
- **Website**: https://automatosx.com

---

## Migration from v3.1

⚠️ **No automatic migration path** – v4.0 requires clean installation due to fundamental architectural changes.

**Key changes:**
- Vector DB: Milvus → SQLite + vec
- Language: JavaScript → TypeScript
- Config: `.defai/` → `.automatosx/`, YAML → JSON
- Bundle: 340MB → 46MB (87% reduction)

See [CHANGELOG.md](CHANGELOG.md#400---2025-10-06) for detailed upgrade instructions.

---

## Contributing

We welcome contributions! Please:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Follow [Conventional Commits](https://www.conventionalcommits.org/)
3. Run tests before submitting: `npm test -- --coverage`
4. Update docs when changing architecture or APIs

**Development setup:**
```bash
git clone https://github.com/defai-sg/automatosx.git
cd automatosx
npm install
npm test
npm run build
```

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

**Built by the DEFAI team for practitioners who ship agents, not demos.**

*Need enterprise support, custom integrations, or SLA guarantees? Contact us at support@defai.digital*
