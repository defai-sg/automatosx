# Quick Start Guide

Get started with AutomatosX in under 5 minutes.

---

## What is AutomatosX?

AutomatosX is an **agent execution tool** designed to run inside **Claude Code**. It allows you to:
- Execute AI agents with a single command
- Manage agent memory and context
- Use multiple AI providers (Claude, Gemini, Codex)
- Build reusable agent profiles and abilities

**Key Point**: AutomatosX is **not a standalone chat application**. It's a tool for Claude Code to execute agents and manage their state.

---

## Prerequisites

- **Node.js** 20+ installed
- **Claude Code** environment (AutomatosX is designed to run inside Claude Code)
- npm or pnpm package manager

---

## Installation

### For End Users

Simply install AutomatosX via npm:

```bash
npm install -g @defai.sg/automatosx
```

Or use npx without installation:

```bash
npx @defai.sg/automatosx --version
```

**That's it!** You're ready to use AutomatosX.

### For Developers

If you want to contribute to AutomatosX development:

```bash
# Clone repository
git clone https://github.com/defai-sg/automatosx.git
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
- `.automatosx/memory/` - Vector memory database
- `.automatosx/logs/` - Execution logs

---

## Your First Agent

Run an agent with a simple command:

```bash
automatosx run assistant "What is TypeScript?"
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
      "timeout": 120000,
      "command": "claude"
    },
    "gemini-cli": {
      "enabled": true,
      "priority": 2,
      "timeout": 180000,
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

AutomatosX uses AI providers via their CLI tools:

**Claude** (via Claude Code):
```bash
# Already available in Claude Code environment
# No additional setup needed
```

**Gemini** (Google AI):
```bash
# Install Gemini CLI if needed
npm install -g @google/generative-ai

# Set API key (if required)
export GEMINI_API_KEY="your-api-key"
```

**OpenAI** (for embeddings):
```bash
# Set API key for vector search
export OPENAI_API_KEY="your-api-key"
```

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
- [Vector Search Deep Dive](../tutorials/advanced-usage.md#vector-search)
- [Multi-Provider Configuration](../tutorials/advanced-usage.md#multi-provider)
- [Performance Optimization](../tutorials/advanced-usage.md#performance)

---

## Common Questions

**Q: Do I need to install Claude Code separately?**
A: Yes, AutomatosX is designed to run inside Claude Code. It's not a standalone application.

**Q: Can I use AutomatosX outside Claude Code?**
A: Yes, you can use it from any terminal, but it's optimized for Claude Code workflows.

**Q: Why isn't there a `chat` command?**
A: AutomatosX focuses on single-shot agent execution. Claude Code provides the interactive chat interface.

**Q: How do I update AutomatosX?**
A: Simply run `npm update -g automatosx` (global) or `npm update automatosx` (local).

**Q: Where is my data stored?**
A: All data is stored in `.automatosx/` directory in your project root. This includes configuration, memory, logs, and workspaces.

---

## Troubleshooting

**Command not found: automatosx**
```bash
# If installed globally
npm install -g @defai.sg/automatosx

# Or use npx
npx @defai.sg/automatosx --version
```

**Provider connection failed**
```bash
# Check provider status
automatosx status

# Test provider manually
claude --version  # for Claude
gemini --version  # for Gemini
```

**Memory search not working**
```bash
# Set OpenAI API key for embeddings
export OPENAI_API_KEY="your-key"

# Or use mock provider for testing
export AUTOMATOSX_MOCK_PROVIDERS=true
```

For more help, see [Troubleshooting Guide](../troubleshooting/common-issues.md).

---

## Getting Help

- **Documentation**: [docs.automatosx.dev](https://docs.automatosx.dev) (coming soon)
- **GitHub Issues**: [github.com/defai-sg/automatosx/issues](https://github.com/defai-sg/automatosx/issues)
- **Examples**: Check `.automatosx/agents/` and `.automatosx/abilities/` after running `init`

---

**Ready to build your first agent?** → [Creating Your First Agent](../tutorials/first-agent.md)
