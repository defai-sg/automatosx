# AutomatosX Quickstart

Get AutomatosX v3.1.4 running in minutes and run your first agent tasks.

## 1. Install AutomatosX

```bash
# Install AutomatosX globally
npm install -g automatosx

# Install Claude Code CLI (recommended provider)
npm install -g @anthropic-ai/claude-code
claude auth login
```

**For Developers (Source Installation):**
```bash
# Clone for development
git clone https://github.com/defai-sg/automatosx.git
cd automatosx && npm install

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code
claude auth login
```

## 2. Choose Your Interface

### Option A: Claude Code Integration (Recommended)

**Best experience with MCP integration, shared memory, and seamless agent coordination:**

```bash
# Initialize AutomatosX in Claude Code
/ax:init

# Check status and agents
/ax:status
/ax:agents
```

### Option B: Terminal Commands

**Best for automation, scripts, and CI/CD:**

```bash
automatosx status             # Provider checks + system summary
automatosx agents --detailed  # List all 20 agents and workflows
```

You should see Claude marked `✅ Available` before proceeding.

## 3. Run Your First Tasks

### Using Claude Code (Interactive)

```bash
# Ask the backend engineer to draft an API
/ax:agent backend "Design an auth API for a task tracker"

# Ask the designer to create user experience
/ax:agent design "Create a 3-screen onboarding flow for a mobile app"

# Get security insights
/ax:agent security "What are the top 3 security risks for a Node.js API?"
```

**Why Claude Code Integration is Superior:**

Claude Code's MCP integration provides the best AutomatosX experience:

- **Shared Memory Context** – Agents automatically access previous conversations via Milvus vector database
- **Seamless Handoffs** – Switch between agents (`/ax:agent backend` → `/ax:agent security`) without losing context
- **Native File Operations** – Direct access to workspaces and memory through MCP servers
- **Real-time Collaboration** – Multiple agents work together in the same conversation thread
- **Zero Setup Overhead** – No additional authentication or configuration needed

### Using Terminal (Automation)

```bash
# Ask the backend engineer to draft an API
automatosx run backend "Design an auth API for a task tracker"

# Let the designer plan a quick UI flow
automatosx run design "Create a 3-screen onboarding flow for a mobile app"
```

Add `--workflow` to trigger the full multi-stage lifecycle defined in each agent profile.

## 5. Save and Inspect Outputs
Generated artifacts are stored under `.defai/workspaces/`.
- `roles/<role>/outputs/` keeps Markdown task reports.
- `roles/<role>/logs/` captures execution metadata.

> ⚠️ Privacy Note: `.defai/chat-history/` stores past prompts and responses so agents can
> reuse context. Delete the directory or run `automatosx reset:memory` if you do not want
> transcripts retained locally.

## 6. Reset If Needed

**For Global Installation:**
```bash
automatosx reset:status        # Show configurable reset options
automatosx reset:config        # Restore default configuration
automatosx reset:workspace     # Clean workspaces (keeps structure)
```

**For Development Setup:**
```bash
npm run reset:status        # Show configurable reset options
npm run reset:config        # Restore default configuration
npm run reset:workspace     # Clean workspaces (keeps structure)
```

## 7. Next Steps
- Explore command references in `docs/OPERATIONS.md`.
- Review each agent’s abilities in `docs/AGENT-ROLES.md`.
- Configure additional providers and check status with `automatosx status`.
