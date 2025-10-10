# Quick Start Guide

Get started with AutomatosX in under 5 minutes.

---

## What is AutomatosX?

AutomatosX is a **CLI-based AI agent orchestration platform** that allows you to:

- Execute AI agents with a single command
- Manage agent memory and context
- Use multiple AI providers (Claude, Gemini, Codex)
- Build reusable agent profiles and abilities

**Key Point**: AutomatosX works anywhere as a general-purpose CLI tool, and is optimized for integration with Claude Code and other development environments.

---

## Prerequisites

- **Node.js** 20+ installed
- **npm** or **pnpm** package manager
- **Optional**: Claude Code, VS Code, or any terminal environment

---

## Installation

### For End Users

Install AutomatosX via npm:

```bash
npm install -g @defai.digital/automatosx
```

Or use npx without installation:

```bash
npx @defai.digital/automatosx --version
```

**Update to latest version**:

```bash
# Use built-in update command
ax update

# Or via npm
npm install -g @defai.digital/automatosx@latest
```

### For Developers

If you want to contribute to AutomatosX development:

```bash
# Clone repository
git clone https://github.com/defai-digital/automatosx.git
cd automatosx

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

See [Contributing Guide](../CONTRIBUTING.md) for more details.

---

## Initialize Your Project

Create a new AutomatosX project:

```bash
# Initialize in current directory
automatosx init

# Or specify a directory
automatosx init ./my-project
```

This creates:

- `.automatosx/` - Configuration and data directory
- `automatosx.config.json` - Project configuration
- `.automatosx/agents/` - Agent profiles (5 examples included)
- `.automatosx/abilities/` - Agent abilities (15 examples included)
- `.automatosx/teams/` - Team configurations (4 teams)
- `.automatosx/memory/` - FTS5 memory database (full-text search)
- `examples/templates/` - Agent templates (v5.0.0+)

**Force reinitialize** (update existing installation):

```bash
ax init --force   # Overwrites with latest templates and config
```

---

## Your First Agent

### Option 1: Use Example Agent

Run an agent with a simple command:

```bash
automatosx run assistant "What is TypeScript?"
```

### Option 2: Create from Template (v5.0.0+)

Quickly create a custom agent:

```bash
# Interactive creation with prompts
ax agent create my-agent --template developer --interactive

# Or one-line creation
ax agent create my-agent \
  --template developer \
  --display-name "Mike" \
  --role "Backend Engineer" \
  --team engineering

# Run your new agent
ax run my-agent "Help me design an API"
```

**What happens**:

1. AutomatosX loads the `assistant` agent profile
2. Sends your prompt to the configured AI provider (Claude, Gemini, etc.)
3. Returns the response
4. Optionally saves the interaction to memory

**Output**:

```
🤖 AutomatosX v4.0

Agent: assistant
Task: What is TypeScript?

─────────────────────────────────────

TypeScript is a strongly typed programming language that builds on
JavaScript, giving you better tooling at any scale...

─────────────────────────────────────

✓ Complete (1.2s)
```

---

## Explore Available Agents

List all available agents:

```bash
automatosx list agents
```

Example output:

```
Available Agents (5):

┌─────────────┬──────────────────────────┬──────────┐
│ Name        │ Description              │ Provider │
├─────────────┼──────────────────────────┼──────────┤
│ assistant   │ General purpose helper   │ claude   │
│ coder       │ Code generation expert   │ claude   │
│ reviewer    │ Code review specialist   │ claude   │
│ debugger    │ Debug assistance         │ gemini   │
│ writer      │ Content creation         │ claude   │
└─────────────┴──────────────────────────┴──────────┘
```

---

## Basic Commands

### Check Status

```bash
automatosx status
```

Shows:

- Configuration status
- Available providers
- Memory statistics
- System health

### Manage Configuration

```bash
# View all configuration
automatosx config --list

# Set a value
automatosx config --set memory.maxEntries --value 20000

# Get a specific value
automatosx config --get providers.claude.enabled
```

### Memory Management

```bash
# List memories
automatosx memory list

# Search memories
automatosx memory search "TypeScript concepts"

# Add a memory
automatosx memory add "TypeScript is a typed superset of JavaScript" --type knowledge

# Export memories
automatosx memory export ./backup.json

# Import memories
automatosx memory import ./backup.json
```

---

## Using with Claude Code

AutomatosX is designed to work seamlessly inside Claude Code:

### Workflow Example

1. **You ask Claude Code**: "Can you help me understand TypeScript generics?"

2. **Claude Code executes**:

   ```bash
   automatosx run assistant "Explain TypeScript generics with examples"
   ```

3. **AutomatosX**:
   - Loads assistant agent profile
   - Sends prompt to AI provider
   - Returns response with examples
   - Saves to memory (if enabled)

4. **Claude Code displays** the result to you

### Why This Design?

- **No Duplication**: Claude Code already provides interactive chat
- **Single Responsibility**: AutomatosX focuses on agent execution
- **Memory Persistence**: Agents remember context across sessions
- **Provider Flexibility**: Use different AI providers for different tasks

---

## Configuration

### Basic Configuration

Edit `automatosx.config.json`:

```json
{
  "providers": {
    "claude-code": {
      "enabled": true,
      "priority": 1,
      "timeout": 1500000,
      "command": "claude"
    },
    "gemini-cli": {
      "enabled": true,
      "priority": 2,
      "timeout": 1500000,
      "command": "gemini"
    }
  },
  "memory": {
    "maxEntries": 10000,
    "persistPath": ".automatosx/memory",
    "autoCleanup": true,
    "cleanupDays": 30
  },
  "logging": {
    "level": "info",
    "path": ".automatosx/logs",
    "console": true
  }
}
```

### Provider Setup

AutomatosX calls provider CLI tools directly - **no API keys stored in AutomatosX**.

**Claude Code CLI**:
```bash
# Install (do NOT use sudo)
npm install -g @anthropic-ai/claude-code
# Or: curl -fsSL https://claude.ai/install.sh | bash
# Or: brew install --cask claude-code
# Docs: https://docs.claude.com/en/docs/claude-code/setup

# Authenticate (handled by CLI)
claude login
```

**Gemini CLI**:
```bash
# Install
npm install -g @google/gemini-cli
# Docs: https://github.com/google-gemini/gemini-cli

# Authenticate (handled by CLI)
gemini auth login
```

**Codex CLI (OpenAI)**:
```bash
# Install
npm install -g @openai/codex
# Or: brew install codex
# Docs: https://github.com/openai/codex

# Authenticate (handled by CLI)
codex auth login
```

**Important**: v4.0+ uses CLI tools for authentication. Each CLI manages its own API keys - AutomatosX never stores them.

---

## Next Steps

### Learn Core Concepts

- [Core Concepts](./core-concepts.md) - Understand agents, profiles, and abilities
- [Configuration Guide](./configuration.md) - Deep dive into configuration options

### Tutorials

- [Creating Your First Agent](../tutorials/first-agent.md)
- [Working with Memory](../tutorials/memory-management.md)
- [Custom Abilities](../tutorials/custom-abilities.md)

### Reference

- [CLI Commands](../reference/cli-commands.md) - Complete command reference
- [Configuration Schema](../reference/configuration-schema.md)
- [API Documentation](../reference/api/) - For programmatic usage

### Advanced

- [Memory Management Guide](../tutorials/memory-management.md)
- [Multi-Provider Configuration](../tutorials/advanced-usage.md#multi-provider)
- [Performance Optimization](../tutorials/advanced-usage.md#performance)

---

## Common Questions

**Q: Do I need to install Claude Code separately?**
A: Yes, AutomatosX is designed to run inside Claude Code. It's not a standalone application.

**Q: Can I use AutomatosX outside Claude Code?**
A: Yes, you can use it from any terminal, but it's optimized for Claude Code workflows.

**Q: Why isn't there a `chat` command?**
A: AutomatosX focuses on single-shot agent execution. Claude Code and other tools provide the interactive chat interface.

**Q: How do I update AutomatosX?**
A: Use the built-in command `ax update` or run `npm install -g @defai.digital/automatosx@latest`.

**Q: How do I create a custom agent?**
A: Use `ax agent create <name> --template <template>` to create from templates, or manually create `.automatosx/agents/<name>.yaml`.

**Q: Where is my data stored?**
A: All data is stored in `.automatosx/` directory in your project root. This includes configuration, memory, logs, and workspaces.

---

## Troubleshooting

**Command not found: automatosx**

```bash
# If installed globally
npm install -g @defai.digital/automatosx

# Or use npx
npx @defai.digital/automatosx --version
```

**Provider connection failed**

```bash
# Check provider status
automatosx status

# Test provider manually
claude --version  # for Claude
gemini --version  # for Gemini
```

**Memory search not returning results**

```bash
# Try broader search terms
automatosx memory search "auth"  # instead of specific phrases

# Or use mock provider for testing
export AUTOMATOSX_MOCK_PROVIDERS=true
```

For more help, see [Troubleshooting Guide](../troubleshooting/common-issues.md).

---

## Getting Help

- **Documentation**: [docs.automatosx.dev](https://github.com/defai-digital/automatosx/tree/main/docs) (coming soon)
- **GitHub Issues**: [github.com/defai-digital/automatosx/issues](https://github.com/defai-digital/automatosx/issues)
- **Examples**: Check `.automatosx/agents/` and `.automatosx/abilities/` after running `init`

---

**Ready to build your first agent?** → [Creating Your First Agent](../tutorials/first-agent.md)
