# AutomatosX v4.0

> **Turn yourself into a 20-agent powerhouse**
> Orchestrate Claude, Gemini, and GPT specialists to ship polished products—faster, smarter, and on a CLI budget.

[![npm version](https://img.shields.io/npm/v/automatosx.svg)](https://www.npmjs.com/package/automatosx)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-841%20passing-brightgreen.svg)](#production-ready-toolkit)

**Solo creators, lean teams, and builders choose AutomatosX because:**
- 🧠 **One command = 20 specialized agents** – researcher, coder, reviewer, writer, debugger (no context-switching)
- 💰 **10× cheaper than assistants APIs** – pay only for what you use via direct CLI access
- ⚡ **62× faster than competitors** – 0.72ms memory recall means agents remember everything instantly
- 🚀 **Ship in hours, not weeks** – pre-built agents + examples = launch-ready automation today

**Status**: ✅ Production Release · **Version**: 4.0.3 · **Released**: October 2025

---

## Why AutomatosX?

### The Solo Creator's Dilemma

You're building alone. You need:
- A researcher to scan documentation
- A coder to scaffold features
- A reviewer to catch bugs
- A writer to draft docs
- A debugger to fix edge cases

**But hiring 20 specialists costs $500K/year.** Juggling ChatGPT tabs kills momentum.

### The AutomatosX Solution

**One CLI. 20+ specialized agents. Total control.**

```bash
# Morning: Research phase
automatosx run researcher "Compare Next.js vs Remix for my SaaS"

# Afternoon: Build phase
automatosx run coder "Scaffold auth with Supabase"
automatosx run reviewer "Audit this API for security holes"

# Evening: Polish phase
automatosx run writer "Draft README and API docs"
automatosx chat debugger  # Interactive troubleshooting
```

Each agent has **persistent memory**, **defined abilities**, and **cost caps**. They work in isolated workspaces. You stay in flow.

### Real Impact

| Without AutomatosX | With AutomatosX |
|-------------------|-----------------|
| 🐌 Switch between ChatGPT tabs | ⚡ `automatosx run <agent>` – instant specialist |
| 💸 $200/mo for ChatGPT Pro + APIs | 💰 $20/mo in CLI API costs (10× savings) |
| 🤯 Lose context between sessions | 🧠 Agents remember everything (0.72ms vector search) |
| ⏳ 3 weeks to ship v1 | 🚀 3 days from idea to deployed product |

### "Why not just use Claude Code or ChatGPT?"

**Claude Code**: Brilliant for one-off coding sessions. Stops working when you close the tab.

**ChatGPT**: Great for quick questions. Gets expensive at scale. Forgets context.

**AutomatosX**: Built for **shipping**. Agents run unattended in CI/CD, remember conversations, auto-fallback to cheaper models, and cost 10× less because you control the infrastructure. Use ChatGPT for ideas → AutomatosX for execution.

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
npm install -g automatosx
# or run without installing
npx automatosx --help
```

### 2. Configure (use any provider)
```bash
# Option A: Environment variable
export ANTHROPIC_API_KEY="sk-ant-..."

# Option B: CLI config
automatosx config --set providers.claude.apiKey --value "sk-ant-..."
```

### 3. Run your first agent
```bash
automatosx run assistant "Explain quantum computing in 3 sentences"
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
  "$schema": "https://automatosx.dev/schema/config.json",
  "version": "4.0.0",
  "providers": {
    "preferred": "claude",
    "claude": {
      "apiKey": "${ANTHROPIC_API_KEY}",
      "model": "claude-3-sonnet-20240229"
    },
    "gemini": {
      "apiKey": "${GOOGLE_API_KEY}",
      "model": "gemini-1.5-flash"
    }
  },
  "memory": {
    "maxEntries": 10000,
    "embeddingDimensions": 1536
  }
}
```

Environment variables are interpolated automatically using `${VAR_NAME}` syntax.

---

## Documentation & Support

- **Guides**: `docs/guide/` (installation, quick start, core concepts)
- **FAQ**: `FAQ.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`
- **Issues**: [GitHub Issues](https://github.com/defai-sg/automatosx/issues)
- **Discussions**: [GitHub Discussions](https://github.com/defai-sg/automatosx/discussions)
- **npm**: https://www.npmjs.com/package/automatosx
- **Docs site**: https://docs.automatosx.dev

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

*Need enterprise support, custom integrations, or SLA guarantees? Contact us at team@defai.sg*
