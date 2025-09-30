# AutomatosX Operations

This document provides practical guidance for using AutomatosX effectively.
It covers essential operations for both AI systems and human users.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** for ES module support
- **Claude Code CLI** (recommended) or other provider CLI tools

### Installation

**For End Users (Recommended):**
```bash
# Install globally via npm
npm install -g automatosx

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code
claude auth login

# Verify installation
automatosx validate
```

**For Developers/Contributors:**
```bash
# Clone repository for development
git clone <repository-url>
cd automatosx && npm install

# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code
claude auth login

# Verify development setup
npm run validate
```

### First Task

**Global Installation:**
```bash
# Execute a task with a specific agent
automatosx run backend "Design a REST API for user authentication"
```

**Development Setup:**
```bash
# Execute a task with a specific agent
npm start run backend "Design a REST API for user authentication"
```

> **Note**: This guide shows commands for **global installation** by default. Development commands are indicated separately where different.

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
automatosx run <agent> "<task description>"

# Examples
automatosx run backend "Create user authentication endpoints"
automatosx run frontend "Build responsive dashboard with dark mode"
automatosx run security "Analyze this API for security vulnerabilities"
automatosx run devops "Setup CI/CD pipeline for Node.js application"
```

### Advanced Agent Operations

```bash
# Execute a specific workflow stage
automatosx run backend "Review checkout API design" --stage review

# Run every stage defined in an agent profile
automatosx run backend "Design ecommerce checkout" --workflow

# List all available agents (summary)
automatosx agents

# Inspect personas, stages, and specializations
automatosx agents --detailed
```

## 🧠 Memory and Context Operations

### Memory System

AutomatosX automatically stores and retrieves conversation history for context:

```bash
# Search conversation history
automatosx memory search "API design patterns"
automatosx memory search "authentication" --agent backend

# View conversation details
automatosx memory show <conversation-id>

# Get agent conversation history
automatosx memory history backend
automatosx memory recent

# Memory statistics
automatosx memory stats
```

### Memory Management

```bash
# Clear specific memory types
automatosx memory clear all        # Clear every memory layer
automatosx memory clear practical  # Clear the practical memory store
automatosx memory clear milvus     # Clear the embedded vector database

# Cleanup helpers
automatosx memory cleanup          # View advanced cleanup options
```

## 🔧 System Operations

### System Health and Validation

```bash
# System status and health
automatosx status                    # Check all system components
automatosx validate                  # Validate configuration and setup
automatosx health                    # Detailed health check

# Component-specific validation
automatosx filesystem:validate      # Filesystem integrity
automatosx memory:test              # Memory system connectivity
```

### Factory Reset and Recovery

```bash
# Safe factory reset (preserves user data)
automatosx factory-reset             # Full reset with backup
automatosx factory-reset:dry-run     # Preview what would be reset
automatosx factory-reset:no-backup   # Fast reset without backup

# Filesystem management
automatosx filesystem:stats          # Show file statistics
automatosx filesystem:backup         # Create backup
```

### Version and Upgrade Management

```bash
# Version information
npm run version:current           # Show current version

# Upgrade preparation
npm run upgrade:prepare 3.1.4     # Prepare for version upgrade
npm run upgrade:prepare 3.1.4 --dry-run  # Preview upgrade changes
automatosx upgrade:validate 3.1.4    # Validate completed upgrade
```

## 🔄 Workflow Operations

### Multi-Agent Workflows

Execute complex tasks involving multiple agents:

```bash
# Predefined workflow patterns
automatosx workflow security-fix "authentication system"
automatosx workflow feature-development "user profile management"

# Workflow management
automatosx workflow --list         # List available patterns
automatosx workflow --status <id>  # Check workflow status
```

### Custom Workflows

Define and execute custom multi-agent workflows:

```bash
# Execute custom workflow sequence
automatosx run architect "Design system" \
  | automatosx run backend "Implement API" \
  | automatosx run quality "Create tests"
```

## ⚙️ Configuration Operations

### Provider Management

```bash
# Check provider status and failover health (includes CLI checks)
automatosx status

# Manage provider configuration
automatosx config status             # Provider configuration status
automatosx config enable gemini      # Enable Gemini CLI provider
automatosx config disable openai     # Disable OpenAI provider
automatosx config priority claude 1  # Set provider priority

# Test enabled providers
automatosx config test               # Test all enabled providers

# Development setup alternative:
# node src/scripts/config-manager.js status
# node src/scripts/config-manager.js enable gemini
```

### Agent Customization

```bash
# Modify agent abilities (edit Markdown files)
# User files: .defai/agents/{role}/abilities/*.md

# Update agent profiles (edit YAML files)
# User files: .defai/agents/{role}/profile.yaml

# After modifications, reinitialize generated assets
automatosx init                          # Reinitialize system (Global installation)
/ax:init                                 # Equivalent Claude slash command

# Development setup alternative:
# node src/scripts/dynamic-init.js full
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
automatosx validate              # Check system integrity
automatosx health               # Detailed diagnostics
automatosx factory-reset        # Reset to clean state
```

**Memory Issues**:
```bash
automatosx memory:test          # Test memory connectivity
automatosx memory clear practical  # Clear corrupted memory
automatosx filesystem:backup    # Backup before major changes
```

**Provider Failures**:
```bash
automatosx status                       # Check provider health and failover
automatosx config setup                 # Re-run interactive provider setup

# Development setup alternative:
# node src/scripts/config-manager.js setup
```

**Agent Configuration Issues**:
```bash
automatosx validate                          # Validate agent profiles and abilities
automatosx init                              # Force complete regeneration of assets
/ax:init                                     # Reinitialize via Claude Code

# Development setup alternative:
# node src/scripts/dynamic-init.js validate
# node src/scripts/dynamic-init.js full
```

### Advanced Diagnostics

```bash
# System health and status
automatosx health
automatosx status

# Performance analysis
automatosx optimize
# Note: Detailed performance benchmarks available in development setup

# Memory inspection
automatosx memory stats
automatosx memory recent

# Filesystem verification
automatosx filesystem:validate
```

## 📊 Monitoring and Metrics

Keep AutomatosX healthy with these built-in checks:

```bash
automatosx status                         # Provider health and profile summary
automatosx optimize                       # Provider routing analysis
automatosx memory stats                  # Memory usage counters
```

### Health Monitoring

```bash
automatosx health                         # Comprehensive health check
watch -n 60 'automatosx status'           # Re-check status every minute (macOS/Linux)
```

## 🔐 Security Operations

```bash
automatosx run security "Audit authentication service for OWASP risks"
automatosx filesystem:validate            # Confirm filesystem integrity before resets
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
        run: automatosx run security "Scan the entire codebase for potential security vulnerabilities and provide a summary report."
```

## Related Documentation

This operations guide covers the essential commands and procedures for working with AutomatosX effectively.

**For New Users**: Start with **[TUTORIALS.md](TUTORIALS.md)** for step-by-step guidance.

**For Troubleshooting**: See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** when commands don't work as expected.

**For Deep Understanding**:
- **[CONCEPTS.md](CONCEPTS.md)**: Why AutomatosX works the way it does
- **[ARCHITECTURE.md](ARCHITECTURE.md)**: How AutomatosX works internally
- **[DEVELOPMENT.md](DEVELOPMENT.md)**: How to extend and customize AutomatosX
