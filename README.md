# AutomatosX v3.1.4 - AI Agent Orchestration Platform

[![Version](https://img.shields.io/badge/version-3.1.4-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**AutomatosX** transforms a solo builder into a 20-person product organization. Each agent carries a distinct
role—CTO, architect, backend engineer, designer, product strategist, marketer, and more—complete with workflow
stages, shared memory, and personality. In DEFAI benchmarks this coordinated swarm delivers up to **30× higher output
quality and throughput** than a single assistant.

```bash
/ax:agent CTO "Coordinate with Design and Product to improve onboarding. Review implementation with Architecture and \
Backend, agree on a refactor plan, then loop in Quality and Security to validate the changes."
```

AutomatosX handles the end-to-end orchestration. The CTO agent delegates UX improvements to Design and Product,
cross-checks code structure with Architecture and Backend, and routes the final review through Quality and Security.
Shared Milvus-backed memory ensures every agent receives the previous context before responding, so the final
refactor ships with leadership oversight, design polish, engineering rigor, and compliance sign-off—all from one
instruction.

## Why AutomatosX

- **Built-in specialist stack** – 20 agents spanning engineering, leadership, finance, marketing, and compliance
- **Provider strengths on tap** – Blend Claude's coding depth, OpenAI's structured analysis, and Gemini's creative range
- **Cost-capped execution** – CLI authentication keeps spend predictable, ideal for individuals and lean teams
- **Structured collaboration** – YAML workflows, Markdown abilities, and shared memory keep agents aligned on best practices
- **Product velocity** – Multi-agent collaboration removes hand-offs and meetings, yielding 30× productivity gains in internal runs

## Multi-Agent Collaboration Flow

1. **Leadership directive** – High-level roles (CTO, CEO, Product) break goals into coordinated missions
2. **Specialist execution** – Functional agents (Design, Backend, DevOps) implement their portion with role-specific knowledge
3. **Cross-check and refactor** – Architecture and Backend validate structure while shared memory exposes earlier insights
4. **Risk controls** – Quality and Security review outcomes, ensuring compliance and regression-free delivery
5. **Knowledge retention** – Results feed back into Milvus memory so future missions start from a smarter baseline

## Provider Strength Matrix

| CLI Provider | Strengths | Typical Collaboration |
|--------------|-----------|-----------------------|
| **Claude Code** | Deep code generation, refactoring discipline | Leads implementation, pairs with Quality for validation |
| **Codex (OpenAI)** | Analytical breakdowns, planning and documentation | Structures system designs before Claude executes |
| **Gemini CLI** | Creative ideation, multimodal insight | Inspires Design and Marketing agents with novel concepts |

AutomatosX routes tasks to the provider most likely to succeed while keeping a local circuit breaker ready for
failover. Each CLI defaults to the provider's recommended model, eliminating per-release model upkeep.

## Cost-Controlled Execution

- No API keys stored—authentication flows through provider CLIs
- Usage caps track to the plan you already pay for (Claude Pro/Max, Google One AI credits, OpenAI Plus)
- Automated cost-saving scripts (`automatosx optimize`, `automatosx status`) reveal redundant providers
- DEFAI's operating thesis: small teams plus AutomatosX out-deliver historic large teams at a fraction of the cost

## Platform Architecture

- **Three-layer agents** – YAML workflows, Markdown knowledge bases, and JavaScript personalities in `src/agents/`
- **Enhanced router** – `src/core/enhanced-router.js` handles agent selection, provider routing, and memory hydration
- **Dual-layer memory** – Milvus embedded vector store plus practical queue for concurrent writes
- **Workspace isolation** – Execution sandboxes per agent keep filesystem state predictable
- **CLI-first design** – Every capability exposed through `automatosx` commands for scripts, CI, or manual runs

## Quick Start

### Prerequisites

- Node.js 18+
- At least one supported provider CLI (Claude Code recommended)

### Global Installation

```bash
npm install -g automatosx
npm install -g @anthropic-ai/claude-code
claude auth login
automatosx validate
```

Optional providers:

```bash
# Google Gemini CLI
npm install -g @google/generative-ai-cli
gemini auth login

# Codex CLI (OpenAI)
npm install -g codex-cli
codex login
```

### First Task

```bash
automatosx run backend "Design a secure user authentication API"
automatosx run design "Sketch onboarding UX states for the auth flow"
automatosx agents --detailed
```

### Development Setup

```bash
git clone https://github.com/defai-digital/automatosx.git
cd automatosx
npm install
npm run validate
npm start run backend "Hello from source"
```

## Smart Model Management

AutomatosX relies on CLI defaults instead of hard-coded model names. Providers keep models current, while the router
monitors health and fails over automatically when a CLI is unavailable.

```bash
# No model strings required
claude
codex exec
gemini
```

Benefits:

- No maintenance when providers rename models
- Automatic upgrades to the latest capabilities
- Fewer configuration errors or mismatched parameters

## Daily CLI Toolkit

| Command | Purpose |
|---------|---------|
| `automatosx agents --detailed` | Inspect roles, personas, workflow stages, and abilities |
| `automatosx run <agent> "task"` | Execute a specific mission with one agent |
| `automatosx workflow <pattern> "description"` | Run multi-agent workflow templates |
| `automatosx memory search "topic"` | Retrieve prior conversations before acting |
| `automatosx optimize` | Analyze provider performance and cost usage |
| `automatosx status` | View system, provider, and workspace health |

## Project Structure

```
src/
├── core/            # Enhanced router, profile manager, filesystem manager
├── agents/          # Agent definitions, abilities, personalities, _global shared assets
├── providers/       # CLI provider integrations and failover logic
├── memory/          # Milvus integration, practical memory queue, memory server client
├── scripts/         # CLI helpers for validation, reset, optimization, upgrades
├── shared/          # Shared constants, utilities, templates
└── __tests__/       # Integration, practical, and concurrent test suites
```

Supporting directories:

- `config/` – Default YAML templates and provider configs
- `docs/` – Architecture, tutorials, operations, and agent catalogs
- `.defai/` – Runtime workspace, memory, and backups (git-ignored)
- `.claude/` – Claude Code CLI integration files and MCP servers

## Development & Testing

```bash
npm run validate          # Check configuration, providers, filesystem health
npm test                  # Enhanced system regression suite
npm run test:integration  # Abilities, agent, memory, YAML scenarios
npm run test:concurrent   # Stress-test the memory write queue
npm run lint:md           # Markdown style checks
npx eslint src/           # JavaScript linting (run Prettier when touching files)
```

When adding features, place new tests in `src/__tests__/` near the domain they cover and document executed commands in
your pull request.

## Documentation Roadmap

| Topic | Description |
|-------|-------------|
| [docs/CONCEPTS.md](docs/CONCEPTS.md) | Three-layer agent architecture and collaboration principles |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Deep dive into routers, providers, memory, and filesystem design |
| [docs/AGENT-ROLES.md](docs/AGENT-ROLES.md) | Personas, responsibilities, and example commands for all 20 agents |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Full CLI reference including workflows, memory, and reset tooling |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Contributor environment setup, scripts, and best practices |
| [docs/TUTORIALS.md](docs/TUTORIALS.md) | Guided walkthroughs for building with AutomatosX |

## Contributing & Support

- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards and review expectations
- Report issues or share enhancements through GitHub Issues
- Security concerns? See [SECURITY.md](SECURITY.md) for the private disclosure process

## License

AutomatosX is released under the [Apache 2.0 License](LICENSE). Build responsibly and let us know what you create.
