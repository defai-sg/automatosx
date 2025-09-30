# AutomatosX Operations

This document provides practical guidance for using AutomatosX effectively.
It covers essential operations for both AI systems and human users.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** for ES module support
- **Claude Code CLI** (recommended) or other provider CLI tools

### Installation
```bash
git clone <repository-url>
cd automatosx
npm install
npm run validate
```

### First Task
```bash
# Execute a task with a specific agent
npm start run backend "Design a REST API for user authentication"
```

## 🎯 Agent Operations

### Available Agents

| Agent | Role | Specializations | Use For |
|-------|------|-----------------|---------|
| **backend** | Backend Engineer | APIs, databases, server architecture | Server-side development |
| **frontend** | Frontend Developer | UI/UX, client-side, responsive design | User interface development |
| **security** | Security Analyst | Vulnerability assessment, secure coding | Security reviews and fixes |
| **devops** | DevOps Engineer | Infrastructure, deployment, monitoring | Deployment and operations |
| **architect** | System Architect | System design, technical strategy | Architecture decisions |
| **quality** | QA Engineer | Testing, validation, quality assurance | Code quality and testing |
| **data** | Data Scientist | Analytics, ML, data processing | Data analysis and modeling |
| **product** | Product Manager | Requirements, user stories, planning | Product planning and specs |

> **Understanding Agents**: Learn about the three-layer agent architecture in **[CONCEPTS.md](CONCEPTS.md#three-layer-agent-architecture)**
> and see the technical implementation in **[ARCHITECTURE.md](ARCHITECTURE.md#core-components)**.

### Basic Agent Usage

```bash
# Single agent tasks
npm start run <agent> "<task description>"

# Examples
npm start run backend "Create user authentication endpoints"
npm start run frontend "Build responsive dashboard with dark mode"
npm start run security "Analyze this API for security vulnerabilities"
npm start run devops "Setup CI/CD pipeline for Node.js application"
```

### Advanced Agent Operations

```bash
# Execute a specific workflow stage
node src/index.js run backend "Review checkout API design" --stage review

# Run every stage defined in an agent profile
node src/index.js run backend "Design ecommerce checkout" --workflow

# List all available agents (summary)
npm run agents

# Inspect personas, stages, and specializations
node src/index.js agents --detailed
```

## 🧠 Memory and Context Operations

### Memory System

AutomatosX automatically stores and retrieves conversation history for context:

```bash
# Search conversation history
npm start memory search "API design patterns"
npm start memory search "authentication" --agent backend

# View conversation details
npm start memory show <conversation-id>

# Get agent conversation history
npm start memory history backend
npm start memory recent

# Memory statistics
npm start memory stats
```

### Memory Management

```bash
# Clear specific memory types
npm start memory clear all        # Clear every memory layer
npm start memory clear practical  # Clear the practical memory store
npm start memory clear milvus     # Clear the embedded vector database

# Cleanup helpers
npm start memory cleanup          # View advanced cleanup options
```

## 🔧 System Operations

### System Health and Validation

```bash
# System status and health
npm run status                    # Check all system components
npm run validate                  # Validate configuration and setup
npm run health                    # Detailed health check

# Component-specific validation
npm run filesystem:validate      # Filesystem integrity
npm run memory:test              # Memory system connectivity
```

### Factory Reset and Recovery

```bash
# Safe factory reset (preserves user data)
npm run factory-reset             # Full reset with backup
npm run factory-reset:dry-run     # Preview what would be reset
npm run factory-reset:no-backup   # Fast reset without backup

# Filesystem management
npm run filesystem:stats          # Show file statistics
npm run filesystem:backup         # Create backup
```

### Version and Upgrade Management

```bash
# Version information
npm run version:current           # Show current version

# Upgrade preparation
npm run upgrade:prepare 3.1.3     # Prepare for version upgrade
npm run upgrade:prepare 3.1.3 --dry-run  # Preview upgrade changes
npm run upgrade:validate 3.1.3    # Validate completed upgrade
```

## 🔄 Workflow Operations

### Multi-Agent Workflows

Execute complex tasks involving multiple agents:

```bash
# Predefined workflow patterns
npm start workflow security-fix "authentication system"
npm start workflow feature-development "user profile management"

# Workflow management
npm start workflow --list         # List available patterns
npm start workflow --status <id>  # Check workflow status
```

### Custom Workflows

Define and execute custom multi-agent workflows:

```bash
# Execute custom workflow sequence
npm start run architect "Design system" \
  | npm start run backend "Implement API" \
  | npm start run quality "Create tests"
```

## ⚙️ Configuration Operations

### Provider Management

```bash
# Check provider status and failover health (includes CLI checks)
npm run status

# Manage provider configuration
node src/scripts/config-manager.js status
node src/scripts/config-manager.js enable gemini
node src/scripts/config-manager.js priority claude 1

# Test enabled providers directly from the config manager
node src/scripts/config-manager.js test
```

### Agent Customization

```bash
# Modify agent abilities (edit Markdown files)
# Files located at: src/agents/{role}/abilities/*.md

# Update agent profiles (edit YAML files)
# Files located at: src/agents/{role}/profile.yaml

# After modifications, reinitialize generated assets
node src/scripts/dynamic-init.js full
/ax:init  # Equivalent Claude slash command
```

## 📁 Workspace Operations

### Workspace Management

Each agent execution creates isolated workspaces:

```bash
# View workspace contents
ls .defai/workspaces/roles/backend/

# Workspace structure
.defai/workspaces/roles/{agent}/
├── tasks/          # Task history and metadata
├── outputs/        # Generated files and results
└── README.md       # Workspace documentation
```

### Workspace Cleanup

```bash
# Remove generated files for a specific agent
rm -rf .defai/workspaces/roles/backend/outputs/*

# Clear cached artifacts for all agents
rm -rf .defai/workspaces/roles/*/outputs/*

# Archive before cleanup (optional)
tar czf workspace-backup.tgz .defai/workspaces/
```

> Prefer the Claude Code integration? Use `/ax:workspace clean <role>` to trigger the guided cleanup flow.

## 🎯 Claude Code Integration

### Slash Commands

When using Claude Code, these slash commands are available:

```bash
/ax:init                 # System initialization and factory reset
/ax:factory-reset        # Safe factory reset
/ax:upgrade              # Version upgrade management
/ax:help                 # AutomatosX help system
/ax:agent               # Agent operations
/ax:backend             # Direct backend agent access
/ax:frontend            # Direct frontend agent access
/ax:security            # Direct security agent access
/ax:workspace           # Workspace management
/ax:config              # Configuration management
```

### MCP Integration

AutomatosX provides MCP servers for Claude Code:

- **Memory Server**: Access to conversation history and search
- **Workspace Server**: File operations within agent workspaces
- **HTTP Memory Server**: Distributed memory access

## 🔍 Troubleshooting Operations

### Common Issues

**System Won't Start**:
```bash
npm run validate              # Check system integrity
npm run health               # Detailed diagnostics
npm run factory-reset        # Reset to clean state
```

**Memory Issues**:
```bash
npm run memory:test          # Test memory connectivity
npm start memory clear practical  # Clear corrupted memory
npm run filesystem:backup    # Backup before major changes
```

**Provider Failures**:
```bash
npm run status                       # Check provider health and failover
node src/scripts/config-manager.js test   # Verify provider CLIs
node src/scripts/config-manager.js setup  # Re-run interactive provider setup
```

**Agent Configuration Issues**:
```bash
node src/scripts/dynamic-init.js validate   # Validate agent profiles and abilities
/ax:init                                     # Reinitialize via Claude Code
node src/scripts/dynamic-init.js full        # Force complete regeneration of assets
```

### Advanced Diagnostics

```bash
# System health and status
npm run health
npm run status

# Performance analysis
npm run optimize
node src/scripts/performance-benchmark.js

# Memory inspection
npm start memory stats
npm start memory recent

# Filesystem verification
npm run filesystem:validate
```

## 📊 Monitoring and Metrics

Keep AutomatosX healthy with these built-in checks:

```bash
npm run status                         # Provider health and profile summary
npm run optimize                       # Provider routing analysis
node src/scripts/performance-benchmark.js  # Optional benchmark snapshot
npm start memory stats                 # Memory usage counters
```

### Health Monitoring

```bash
npm run health                         # Comprehensive health check
watch -n 60 'npm run status'           # Re-check status every minute (macOS/Linux)
```

## 🔐 Security Operations

```bash
npm start run security "Audit authentication service for OWASP risks"
npm run filesystem:validate            # Confirm filesystem integrity before resets
```

## 📝 Logging and Auditing

Logs are written under `.defai/workspaces/logs/`.

```bash
ls -R .defai/workspaces/logs/
tail -n 50 .defai/workspaces/logs/provider-usage.log
```

## 🤖 Integrating with CI/CD

You can integrate AutomatosX into your CI/CD pipelines to automate tasks like code analysis, documentation generation,
or security scanning.

This example workflow uses the `security` agent to scan for vulnerabilities on every push to the `main` branch.

### Example: GitHub Actions Workflow

```yaml
# .github/workflows/automatosx-scan.yml
name: AutomatosX Security Scan

on:
  push:
    branches:
      - main

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install AutomatosX Dependencies
        run: npm install

      - name: Install and Auth Provider CLI
        # Ensure your provider CLI is installed and authenticated.
        # For CI/CD, this usually involves setting secrets (e.g., CLAUDE_API_KEY).
        run: |
          npm install -g @anthropic-ai/claude-code
          # Add authentication command here, using secrets.

      - name: Run Security Agent Scan
        run: npm start run security "Scan the entire codebase for potential security vulnerabilities and provide a summary report."
```

## Related Documentation

This operations guide covers the essential commands and procedures for working with AutomatosX effectively.

**For New Users**: Start with **[TUTORIALS.md](TUTORIALS.md)** for step-by-step guidance.

**For Troubleshooting**: See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** when commands don't work as expected.

**For Deep Understanding**:
- **[CONCEPTS.md](CONCEPTS.md)**: Why AutomatosX works the way it does
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: How AutomatosX works internally
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: How to extend and customize AutomatosX
