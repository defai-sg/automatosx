# Gemini CLI Integration for AutomatosX

This directory contains Gemini CLI custom commands that mirror Claude Code's slash commands.

## Setup

When you run `ax init`, these files will be automatically copied to your project's `.gemini/commands/` directory.

## Available Commands

**Complete 1:1 mapping with Claude Code commands:**

| Gemini CLI | Claude Code | Description |
|------------|-------------|-------------|
| `/ax` | `/ax:agent` | Execute any agent |
| `/ax-agent` | `/ax:agent` | Execute agent (alternative) |
| `/ax-status` | `/ax:status` | Check system status |
| `/ax-list` | `/ax:list` | List agents/abilities |
| `/ax-memory` | `/ax:memory` | Search memory |
| `/ax-init` | `/ax:init` | Initialize project |
| `/ax-clear` | `/ax:clear` | Clear memory |
| `/ax-update` | `/ax:update` | Update AutomatosX |

## Command Syntax

**IMPORTANT**: All commands use **comma-separated format** matching Claude Code.

### Format

```
/ax <agent>, <task>
```

- Use a **comma** to separate agent name and task
- Agent name can be either:
  - **Display name** (Bob, Frank, Steve, Queenie, etc.)
  - **Agent ID** (backend, frontend, security, quality, etc.)

## Usage Examples

### Execute Agents

```bash
# Using display names
/ax bob, create a REST API for authentication
/ax frank, build a responsive navbar
/ax steve, audit this code for security
/ax queenie, write unit tests

# Using agent IDs
/ax backend, create a REST API
/ax frontend, build a navbar
/ax security, audit code
/ax quality, write tests
```

### System Management

```bash
# Check status
/ax-status

# List resources
/ax-list agents
/ax-list abilities

# Search memory
/ax-memory search database

# Initialize new project
/ax-init

# Clear memory
/ax-clear

# Update AutomatosX
/ax-update
```

## How It Works

1. `ax init` copies these `.toml` files to `.gemini/commands/`
2. Gemini CLI automatically discovers them
3. You can use `/command-name` in Gemini CLI
4. Commands execute `ax run [agent] "[task]" --provider gemini --timeout 180`

## Adding More Commands

To add your own custom commands:

1. Create a `.toml` file in `.gemini/commands/`
2. Follow the format in the example files
3. Use `{{args}}` as a placeholder for user input
4. Test with `/your-command task description`

## Syncing with Gemini CLI

```bash
# Register AutomatosX MCP server
ax gemini sync-mcp

# List available commands
ax gemini list-commands

# Check integration status
ax gemini status
```

## Notes

- Commands automatically use `gemini` provider
- Default timeout is 180 seconds (3 minutes)
- You can create custom agents and add commands for them
- See `examples/gemini/commands/` for more examples
