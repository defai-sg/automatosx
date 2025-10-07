# Installation

This guide will help you install AutomatosX v4.0 and get your development environment set up.

## Prerequisites

Before installing AutomatosX, ensure you have the following:

### Node.js

AutomatosX requires **Node.js 20 or later**.

Check your Node.js version:

```bash
node --version
# Should output: v20.0.0 or higher
```

Don't have Node.js? Download from [nodejs.org](https://nodejs.org/) or use a version manager:

**Using nvm** (recommended):
```bash
nvm install 20
nvm use 20
```

**Using fnm**:
```bash
fnm install 20
fnm use 20
```

### Package Manager

Choose your preferred package manager:

- **npm** (comes with Node.js)
- **pnpm** (faster, recommended)
- **yarn** (classic or berry)

## Installation Methods

### Method 1: npm (Recommended for most users)

```bash
npm install @defai.sg/automatosx
```

### Method 2: pnpm (Recommended for performance)

```bash
# Install pnpm if needed
npm install -g pnpm

# Install AutomatosX
pnpm add automatosx
```

### Method 3: yarn

```bash
yarn add automatosx
```

### Method 4: Global Installation

Install globally for system-wide access:

```bash
npm install -g @defai.sg/automatosx
# or
pnpm add -g automatosx
# or
yarn global add automatosx
```

**Tip**: Global installation allows you to use `automatosx` command directly without `npx`.

## Verify Installation

Check that AutomatosX is installed correctly:

```bash
npx @defai.sg/automatosx --version
# Should output: 4.0.0
```

Show help to see available commands:

```bash
npx @defai.sg/automatosx --help
```

Expected output:
```
automatosx <command> [options]

AI Agent Orchestration Platform

Commands:
  automatosx init [options]          Initialize project
  automatosx run <agent> <prompt>    Run agent
  automatosx list <type>             List available agents
  automatosx memory <command>        Memory operations
  automatosx config [options]        Configuration management
  automatosx status [options]        System status

Global Options:
  --debug, -d    Enable debug mode with verbose output
  --quiet, -q    Suppress non-essential output
  --config, -c   Path to custom config file
  --help, -h     Show help
  --version, -v  Show version
```

## Initialize Your Project

Create a new AutomatosX project:

```bash
npx @defai.sg/automatosx init
```

This command creates:

```
.automatosx/
├── config.json          # Project configuration
├── agents/              # Agent profile definitions
│   ├── assistant.yaml   # Example assistant agent
│   └── ...
├── abilities/           # Custom ability definitions
│   ├── web-search.md    # Example ability
│   └── ...
├── memory.db            # SQLite + vec database
└── workspaces/          # Agent workspaces (auto-created)
```

<details>
<summary>Default Configuration</summary>

```json
{
  "version": "4.0.0",
  "projectRoot": "/path/to/your/project",
  "paths": {
    "agents": ".automatosx/agents",
    "abilities": ".automatosx/abilities",
    "memory": ".automatosx/memory.db",
    "workspaces": ".automatosx/workspaces"
  },
  "providers": {
    "claude": {
      "apiKey": "",
      "enabled": false
    },
    "gemini": {
      "apiKey": "",
      "enabled": false
    },
    "openai": {
      "apiKey": "",
      "enabled": false
    }
  },
  "memory": {
    "enabled": true,
    "dimensions": 1536,
    "similarityThreshold": 0.7
  }
}
```

</details>

## Setup Provider CLIs

**AutomatosX uses CLI tools—no API keys needed!** Install your preferred CLI and AutomatosX will automatically detect it.

### Claude CLI

```bash
# macOS/Linux
brew install claude

# Or follow: https://claude.ai/download
```

Verify installation:
```bash
claude --version
```

### Gemini CLI

```bash
# Follow Google's CLI setup guide
# https://ai.google.dev/gemini-api/docs/cli
```

Verify installation:
```bash
gemini --version
```

### OpenAI Codex CLI

```bash
# Follow OpenAI's CLI setup guide
# https://platform.openai.com/docs/cli
```

Verify installation:
```bash
openai --version
```

**How it works:**
- AutomatosX calls `claude`, `gemini`, or `openai` commands
- Your CLI handles authentication (via your existing login)
- No API keys stored in AutomatosX configuration
- Pay via your existing CLI subscription/plan

**Tip**: You can install multiple CLIs. AutomatosX will automatically fallback if one fails.

## Verify Setup

Check your configuration:

```bash
npx @defai.sg/automatosx status
```

Expected output:
```
AutomatosX Status
-----------------
Version: 4.0.0
Project Root: /path/to/your/project
Config: .automatosx/config.json

Providers:
  ✓ Claude (claude-3-5-sonnet-20241022)
  ✓ Gemini (gemini-1.5-pro)
  ✗ OpenAI (not configured)

Memory:
  ✓ Enabled
  Database: .automatosx/memory.db
  Entries: 0
  Size: 8 KB

Agents:
  ✓ assistant (1.0.0)
  Total: 1 agent

Status: Ready ✓
```

## Test Installation

Run a simple test:

```bash
npx @defai.sg/automatosx run assistant "Say hello"
```

Expected output:
```
🤖 assistant: Hello! How can I help you today?
```

**Success!** If you see the response, AutomatosX is installed and working correctly!

## Troubleshooting

### Command Not Found

**Problem**: `automatosx: command not found`

**Solutions**:
1. Use `npx @defai.sg/automatosx` instead of `automatosx`
2. Install globally: `npm install -g @defai.sg/automatosx`
3. Add `./node_modules/.bin` to your PATH

### API Key Not Working

**Problem**: `Provider authentication failed`

**Solutions**:
1. Check API key is correct (no extra spaces)
2. Ensure provider is enabled: `--set providers.claude.enabled true`
3. Verify API key has necessary permissions
4. Check rate limits haven't been exceeded

### Permission Denied

**Problem**: `EACCES: permission denied`

**Solutions**:
1. Don't use `sudo` (not recommended)
2. Fix npm permissions: [docs.npmjs.com/resolving-eacces-permissions-errors](https://docs.npmjs.com/resolving-eacces-permissions-errors)
3. Use a version manager (nvm, fnm)

### Memory Database Error

**Problem**: `Cannot open database`

**Solutions**:
1. Ensure `.automatosx` directory exists
2. Check write permissions
3. Re-run `automatosx init`

### Module Not Found

**Problem**: `Cannot find module 'automatosx'`

**Solutions**:
1. Reinstall: `npm install @defai.sg/automatosx`
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check `package.json` includes automatosx

## Next Steps

Now that AutomatosX is installed:

1. See the [examples directory](../../examples/) for common use cases
2. Check the [API documentation](../api/) for technical reference
3. Read the [introduction](./introduction.md) to understand core concepts

## System Requirements

### Minimum

- **Node.js**: 20.0.0 or later
- **RAM**: 512 MB
- **Disk Space**: 100 MB
- **OS**: macOS, Linux, Windows (WSL recommended)

### Recommended

- **Node.js**: 20.11.0 or later
- **RAM**: 2 GB
- **Disk Space**: 500 MB (with agents and memory)
- **OS**: macOS or Linux (native)

## Platform-Specific Notes

### macOS

Works out of the box. Install via Homebrew:

```bash
brew install node@20
npm install @defai.sg/automatosx
```

### Linux

Ensure build tools are installed:

```bash
# Ubuntu/Debian
sudo apt install build-essential

# Fedora/RHEL
sudo dnf install @development-tools

# Arch
sudo pacman -S base-devel
```

### Windows

Use WSL2 for best experience:

```powershell
wsl --install
wsl --set-version Ubuntu 2
```

Then follow Linux installation steps.

**Warning**: Native Windows support exists but WSL2 is recommended for better compatibility.

## Getting Help

- **Documentation** - Check the docs/ directory for guides and tutorials
- **API Reference** - See docs/api/ for technical documentation
- **GitHub Issues** - Report bugs and request features (available after v4.0 launch)
