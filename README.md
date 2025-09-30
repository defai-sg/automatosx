# AutomatosX v3.1.3 - AI Agent Orchestration Platform

[![Version](https://img.shields.io/badge/version-3.1.3-blue.svg)](package.json)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

**AutomatosX** is a sophisticated AI agent orchestration platform featuring CLI-first architecture, multi-provider
routing, and comprehensive agent management. The system provides **13 specialized AI agent roles** with YAML-based
profiles, real-time chat history tracking, and zero-cost access through CLI authentication.

## ✨ Key Features

- 🎭 **13 Specialized AI Agents** - From backend engineers to CEOs, each with unique personalities and expertise
- 🔄 **Dynamic Role Loading** - Intelligent caching system with 40-80ms initial load, <1ms cached performance
- 🛡️ **CLI-First Security** - Zero stored API keys, uses CLI authentication only
- 📊 **Chat History Tracking** - Embedded Milvus with SQLite/file fallback for semantic search
- 🎯 **Multi-Provider Routing** - Automatic fallback across Claude Code, OpenAI Codex CLI, and Gemini CLI
- 🏗️ **Workspace Isolation** - Role-based workspace management for clean execution environments
- ⚡ **Performance Optimized** - Parallel loading, intelligent caching, and circuit breaker protection

## 🚀 Quick Start: Experience AI Agent Team in 15 Minutes

> 💡 **New User?** We strongly recommend reading [Why Multi-Agent Systems?](docs/CONCEPTS.md) to understand
> AutomatosX's unique value proposition.

### ⚡ 3-Minute Quick Installation

**System Requirements**: Node.js 18+ and one AI CLI tool

```bash
# 1. Clone and install
git clone https://github.com/your-org/automatosx.git
cd automatosx && npm install

# 2. Install Claude Code CLI (free, recommended)
npm install -g @anthropic-ai/claude-code
claude auth login

# 3. (Optional) Install additional AI providers for fallback
# Codex CLI for advanced coding tasks
npm install -g codex-cli
codex login

# 4. Verify installation
npm run status
```

✅ **Success when you see "Provider Status: ✅ Connected"!**

### 🎯 Instant Experience (30 seconds)

```bash
# Let backend expert Bob design an API
npm start run backend "Create complete design for user authentication API"

# Let UI designer Luna create interface
npm start run design "Design clean login page user experience"

# View all available professional agents
npm run agents --detailed
```

🎉 **Congratulations! You now have an AI development team with 13 experts!**

### 📚 Complete Learning Path

| Time Investment | Learning Goal | Recommended Resources |
|-----------------|---------------|----------------------|
| **5 minutes** | Install and run first task | [⚡ Quickstart](docs/QUICKSTART.md) |
| **15 minutes** | Quick hands-on experience | [📖 15-Minute Quick Guide](docs/TUTORIALS.md) |
| **30 minutes** | Understand multi-agent value | [🤖 Multi-Agent System Guide](docs/CONCEPTS.md) |
| **1 hour** | Master advanced features | [🧠 Milvus Intelligent Memory](#-agent-to-agent-communication-with-milvus-lite) |
| **Half day** | Production environment deployment | [⚙️ Production Setup Guide](docs/DEVELOPMENT.md) |

### 🆘 Need Help?

- 🚨 **Installation Issues**: Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- 🤔 **Usage Questions**: Run `npm run examples` to see practical examples
- 💬 **Community Support**: Ask questions in GitHub Issues

---

## 🎭 AutomatosX Agent Team (13 Specialists)

Each AutomatosX agent combines three powerful layers to deliver specialized expertise:

### 🧠 Agent Architecture: Three-Layer Design

**1. YAML Profile Configuration** (`src/agents/<role>/profile.yaml`)
- **Workflow Stages**: Multi-step execution plans for complex tasks
- **Model Configuration**: Primary/fallback AI models with temperature settings
- **Memory Scopes**: Domain-specific knowledge retention and retrieval
- **Personality Traits**: Communication style and decision-making patterns

**2. Markdown Abilities Knowledge Base** (`src/agents/<role>/abilities/`)
- **Core Abilities**: Domain-specific technical expertise and skills
- **Tools & Frameworks**: Technology stack recommendations and usage
- **Processes & Workflows**: Industry best practices and methodologies
- **User-Editable**: Customizable knowledge base for each agent

**3. JavaScript Personality Profiles** (`src/agents/agent-profiles.js`)
- **Human Names**: Natural interaction with Bob, Frank, Steve, etc.
- **Professional Traits**: Unique communication styles and specializations
- **Catchphrases**: Memorable personality expressions
- **Thinking Patterns**: Problem-solving approaches and decision frameworks

### 💻 Development & Engineering
- **backend** (Bob) - Senior Backend Engineer specializing in APIs, databases, microservices
  - *Profile*: 7-stage workflow (API analysis → deployment → monitoring)
  - *Abilities*: Database optimization, microservices patterns, security implementation
  - *Personality*: "Performance is measured, security is verified, architecture is proven"

- **frontend** (Frank) - Frontend Developer expert in React, UI/UX, performance optimization
  - *Profile*: Modern React patterns, component-driven development
  - *Abilities*: Web performance optimization, accessibility design, Progressive Web Apps
  - *Personality*: "Beautiful interfaces tell stories, performant code delivers experiences"

- **devops** (Oliver) - Senior DevOps Engineer focused on infrastructure, CI/CD, monitoring
  - *Profile*: Infrastructure as Code, container orchestration, CI/CD pipelines
  - *Abilities*: Cloud platforms, monitoring systems, site reliability engineering
  - *Personality*: "Automate the predictable, monitor the unpredictable, scale the inevitable"

- **security** (Steve) - Security Engineer for vulnerability assessment and compliance
  - *Profile*: Advanced threat modeling, penetration testing, security architecture
  - *Abilities*: Zero-trust implementation, compliance frameworks, incident response
  - *Personality*: "Trust nothing, verify everything, assume breach, defend in depth"

- **quality** (Queenie) - Quality Professional covering testing and QA processes
  - *Profile*: Test automation frameworks, performance testing, quality assurance
  - *Abilities*: Quality metrics development, process improvement, compliance auditing
  - *Personality*: "Quality is built in, not bolted on - excellence through systematic prevention"

### 🏗️ Architecture & Strategy
- **architect** (Adrian) - Software Architect for system design and technical leadership
  - *Profile*: Enterprise architecture, design patterns, technology evaluation
  - *Abilities*: Scalability design, system integration, architecture governance
  - *Personality*: "Good architecture is the foundation of great software"

- **data** (Diana) - Data Professional covering data science and engineering
  - *Profile*: Data pipeline architecture, statistical modeling, machine learning
  - *Abilities*: ETL/ELT processes, predictive analytics, MLOps infrastructure
  - *Personality*: "Quality data engineering enables meaningful data science"

### 🎨 Product & Design
- **design** (Debbee) - Senior UX Designer specializing in inclusive, system-driven experiences
  - *Profile*: Human-centered design, design systems, accessibility design
  - *Abilities*: User research, prototyping, design thinking methodologies
  - *Personality*: "Design is empathy made visible, accessibility is design done right"

- **product** (Paris) - Product Manager for requirements and strategy
  - *Profile*: 12-stage workflow (discovery → launch → validation)
  - *Abilities*: Product strategy, stakeholder management, business analysis
  - *Personality*: "Clear requirements bridge user needs to product success"

### 📚 Research & Documentation
- **docs** (Doris) - Technical Documentation Specialist for developer workflows
  - *Profile*: Technical writing, API documentation, knowledge management
  - *Abilities*: Content strategy, documentation architecture, user-focused writing
  - *Personality*: "Good documentation is the bridge between confusion and clarity"

- **analyst** (Anna) - Business Analyst for market research and insights
  - *Profile*: Market research, competitive analysis, strategic planning
  - *Abilities*: Business intelligence, data analytics, performance metrics
  - *Personality*: "In analysis, patterns reveal opportunities, data drives decisions"

### 👔 Leadership
- **ceo** (Eric) - Chief Executive Officer guiding strategic planning and culture
  - *Profile*: Strategic vision, market positioning, organizational development
  - *Abilities*: Digital transformation, sustainable growth, investor relations
  - *Personality*: "Vision without execution is hallucination; execution without vision is chaos"

- **cto** (Tony) - Chief Technology Officer for technical strategy
  - *Profile*: Technology strategy, technical leadership, innovation management
  - *Abilities*: Enterprise architecture, engineering culture, technical due diligence
  - *Personality*: "Technology is best when it empowers people to achieve the impossible"

## 📖 Usage Examples

### Basic Task Execution
```bash
# Backend development
npm start run backend "Design REST API for e-commerce platform"

# Frontend development
npm start run frontend "Create responsive dashboard with dark mode"

# DevOps tasks
npm start run devops "Set up CI/CD pipeline for Node.js application"

# Security auditing
npm start run security "Audit application for security vulnerabilities"
```

### Multi-Stage Workflows
```bash
# Execute complete workflow with all stages
npm start run architect "Design microservices architecture" --workflow

# Product development workflow
npm start run ceo "Develop investor pitch for AI startup" --workflow
```

### Chat History & Knowledge Management
```bash
# Search conversation history
npm start history "database optimization" --role backend

# View system usage statistics
npm start history --stats

# Clear chat history
node src/scripts/memory-clear.js
```

### System Management
```bash
# Validate agent profiles
npm run validate

# Check provider connectivity
npm run status

# List all agents with details
npm run agents --detailed

# Test agent routing
node src/scripts/agent-router.js --list-agents
```

### Role Management
```bash
# Create new role/agent
node src/utils/create-role.js translator Alex "Senior Translator"
node src/utils/create-role.js mobile Sarah "Mobile Developer" --specializations "iOS,Android,React Native"

# Remove existing role/agent
node src/utils/remove-role.js --list                    # List all removable roles
node src/utils/remove-role.js translator --force        # Remove by role name
node src/utils/remove-role.js Alex --force              # Remove by agent name

# Role creation with custom options
node src/utils/create-role.js blockchain Oliver "Blockchain Developer" \
  --specializations "Smart Contracts,DeFi,Web3" \
  --stages "requirements,architecture,development,testing,deployment" \
  --catchphrase "Code is law, security is paramount"

# Safe role removal (creates backup)
node src/utils/remove-role.js blockchain               # Shows confirmation
node src/utils/remove-role.js blockchain --force       # Removes with backup
node src/utils/remove-role.js Oliver --force --no-backup # Removes without backup (⚠️ dangerous)
```

### System Reset and Maintenance
```bash
# Configuration Reset
npm run reset:status               # Show current configuration status
npm run reset:all                  # Complete system reset (config + memory)
npm run reset:config               # Reset configuration to defaults
npm run reset:memory               # Clear all memory and chat history
npm run reset:workspace            # Reset workspace directories

# Backup Operations
npm run backup:config              # Backup current configuration
npm run backup:uninstall           # Create backup before uninstall

# Uninstall (Use with caution)
npm run uninstall:status           # Show uninstall status
npm run uninstall:global           # Uninstall global package only
npm run uninstall:clean            # Complete uninstall (⚠️ removes all data)
```

### Privacy & Storage
- Conversation history and task artifacts are stored locally under `.defai/` and `.claude/`.
- Run `npm run reset:memory` to purge chat logs; `npm run reset:workspace` clears generated outputs while keeping structure.
- Avoid committing these directories; they may contain sensitive prompts or provider metadata.

## 🏗️ Architecture Overview

### Core Components

- **Enhanced Router** (`src/core/enhanced-router.js`) - Main orchestration engine
- **Profile Manager** (`src/core/profile-manager.js`) - YAML profile loader and validator
- **Chat History Manager** (`src/core/chat-history.js`) - Embedded Milvus with fallback conversation tracking
- **Provider Manager** (`src/providers/provider-manager.js`) - CLI tool detection and routing
- **Dynamic Role Loader** (`scripts/utils/dynamic-role-loader.js`) - Intelligent role loading system

### Directory Structure

**Development Structure:**
```
src/                               # Main source directory
├── __tests__/                     # Test suite (integration + regression)
├── agents/                        # Agent profiles and abilities
├── bin/                           # CLI executable entry points
├── commands/                      # CLI subcommands
├── config/                        # Configuration templates
├── core/                          # Orchestration, workflow, memory engines
├── memory/                        # Memory system implementations
├── providers/                     # Provider adapters (Claude, Gemini, OpenAI)
├── scripts/                       # Operational scripts (reset, uninstall, etc.)
├── shared/                        # Reusable templates and analysis helpers
└── utils/                         # Supporting utilities and loaders
```

**Installation Structure:**
```
.defai/                            # AutomatosX runtime data (user-specific)
├── workspaces/                    # Agent execution environments
│   ├── agents/                    # Individual agent sandboxes
│   ├── roles/                     # Role-based workspaces
│   └── workflows/                 # Multi-agent workflow outputs
├── memory/                        # Hybrid vector/file memory store
├── backups/                       # Safety backups
└── claude-integration/            # Claude Code integration cache

.claude/                           # Claude Code shared assets (managed externally)
├── commands/ax/                   # AutomatosX command handlers
├── memory/ax/                     # Chat history and semantic memory
├── styles/ax/                     # Output formatting styles
└── mcp/ax/                        # Claude MCP integration assets
```

## ⚙️ Configuration Settings

### Main Configuration File: `automatosx.config.yaml` (Project Root)

**Location:** Project root directory (same level as `package.json`)
**Purpose:** Project-level settings for AI providers, memory, workspace, and logging

```yaml
# AI Provider Settings
providers:
  claude-code:
    enabled: true           # Primary provider (free)
    priority: 1             # Highest priority
    timeout: 120000         # 2 minutes timeout
  gemini-cli:
    enabled: true           # Secondary provider
    priority: 2             # Lower priority
    timeout: 180000         # 3 minutes timeout
  openai-cli:
    enabled: false          # Disabled by default
    priority: 3             # Fallback priority
    timeout: 180000         # 3 minutes timeout

# Memory System Settings
memory:
  type: "hybrid"            # Hybrid vector + file storage
  milvus:
    enabled: true           # Vector database enabled
    fallback: true          # Auto fallback to SQLite
  sqlite:
    enabled: true           # File-based fallback
    file: ".defai/memory/chat-history.db"

# Workspace Settings
workspace:
  directory: "./.defai/workspaces"    # Main workspace location
  cleanup:
    enabled: true           # Auto cleanup enabled
    maxAge: 7              # Keep files for 7 days
    maxFiles: 100          # Max 100 files per workspace

# Logging Settings
logging:
  level: "info"             # Log level (debug/info/warn/error)
  file: "./.defai/workspaces/logs/automatosx.log"
  console: true             # Show logs in console
```

### Package.json Key Scripts

```json
{
  "main": "src/index.js",
  "bin": {
    "automatosx": "src/bin/automatosx.js"    # CLI entry point
  },
  "scripts": {
    // Development
    "start": "node src/index.js",
    "legacy": "node src/index.js",
    "test": "node src/test/enhanced-system-test.js",
    "build": "node src/scripts/build.js",

    // System Management
    "status": "node src/index.js status",
    "validate": "node src/index.js validate",
    "agents": "node src/index.js agents",

    // Installation & Cleanup
    "install:local": "node src/scripts/local-install.js",
    "reset:all": "npm run reset:config && npm run reset:memory",
    "reset:memory": "node src/scripts/memory-clear.js all",

    // Examples & Testing
    "examples": "npm run examples:abilities && npm run examples:agent && npm run examples:memory && npm run examples:yaml",
    "test:examples": "node src/test/examples-validation.js"
  }
}
```

### File Location Reference

**Project Root Files (Version Controlled):**

| File | Location | Purpose | Notes |
|------|----------|---------|--------|
| `automatosx.config.yaml` | `./automatosx.config.yaml` | Main configuration | Project-level settings |
| `package.json` | `./package.json` | Package metadata | NPM configuration |
| `README.md` | `./README.md` | Documentation | Project overview |
| `CLAUDE.md` | `./CLAUDE.md` | Claude Code guidance | Development reference |
| `AGENTS.md` | `./AGENTS.md` | Agent guidelines | Repository structure |
| `GEMINI.md` | `./GEMINI.md` | Gemini integration | Provider setup |

**Project Root Files (Not Version Controlled):**

| File/Directory | Location | Purpose | Notes |
|----------------|----------|---------|--------|
| `node_modules/` | `./node_modules/` | NPM dependencies | Standard Node.js location |
| `package-lock.json` | `./package-lock.json` | Dependency lock file | Generated by npm |
| `.env` | `./.env` | Environment variables | If needed for local config |

**Development vs Installation Mappings:**

| Component | Development Path | Installation Path | Purpose |
|-----------|------------------|-------------------|---------|
| **Main App** | `src/` | `.defai/automatosx/src/` | Application source |
| **CLI Binary** | `src/bin/automatosx.js` | `.defai/automatosx/src/bin/automatosx.js` | Command line interface |
| **Config Templates** | `src/config/` | `.defai/automatosx/config/` | Configuration templates |
| **Agent Profiles** | `src/agents/` | `.defai/automatosx/profiles/` | Agent configurations |
| **Scripts & Tools** | `src/scripts/` | `.defai/automatosx/src/scripts/` | Utility scripts |
| **Tests** | `src/test/` | `.defai/automatosx/src/test/` | Test suite |
| **Examples** | `src/examples/` | `.defai/automatosx/src/examples/` | Example code |
| **Documentation** | `src/docs/` | `.defai/automatosx/src/docs/` | Development docs |

**Runtime Data Directories:**

| Component | Path | Purpose | Owner |
|-----------|------|---------|--------|
| **Workspaces** | `.defai/workspaces/` | Agent execution environments | User |
| **Chat Memory** | `.claude/memory/ax/` | Conversation history | Claude Code |
| **Commands** | `.claude/commands/ax/` | Claude integration | Claude Code |
| **Styles** | `.claude/styles/ax/` | Output formatting | Claude Code |
| **Metrics** | `.claude/metrics/` | Performance data | Claude Code |

### Three-Layer Agent System

1. **YAML Profiles** (`src/agents/<role>/profile.yaml`) - Workflow stages, model configurations, memory scopes
2. **Markdown Abilities** (`src/agents/<role>/abilities/`) - User-editable knowledge files
3. **JavaScript Personalities** (`src/agents/agent-profiles.js`) - Agent names and traits

## 🧠 Agent-to-Agent Communication with Milvus Lite

AutomatosX features a sophisticated **intelligent memory system** that enables seamless agent-to-agent communication and
knowledge sharing through **Milvus Lite** vector database integration.

### 🔄 How Agents Communicate

#### Semantic Memory Network
- Each agent conversation is automatically stored in **Milvus Lite** vector database
- Conversations are embedded using advanced semantic search capabilities
- Agents can access and learn from previous interactions across the entire team
- **Cross-Agent Knowledge Transfer**: Bob's API insights can inform Frank's frontend decisions

#### Memory Architecture
```
Agent Conversation Flow:
1. Agent Task Execution → 2. Milvus Lite Storage → 3. Semantic Indexing → 4. Cross-Agent Retrieval

Example Communication Chain:
Bob (Backend) → "API security patterns" → Milvus Vector DB → Steve (Security) retrieves context
Frank (Frontend) → "React performance" → Milvus Vector DB → Adrian (Architect) provides insights
```

### 📊 Memory System Components

**1. Milvus Lite Vector Database** (`src/memory/milvus-embedded.js`)
- **Semantic Search**: Natural language queries to find relevant past conversations
- **Vector Embeddings**: Advanced AI-powered conversation understanding
- **Automatic Fallback**: SQLite/file storage when Milvus unavailable
- **Performance**: Sub-second search across thousands of conversations

**2. Chat History Manager** (`src/core/chat-history.js`)
- **Real-Time Recording**: Every agent interaction automatically saved
- **Session Management**: Isolated conversation threads per agent
- **Metadata Tracking**: Agent roles, timestamps, task context, response metrics
- **Cross-Session Retrieval**: Agents access insights from previous sessions

**3. Practical Memory System** (`src/memory/practical-memory-system.js`)
- **Multi-Modal Storage**: Vector search + keyword search + file storage
- **Conversation Linking**: Related discussions automatically connected
- **Performance Optimization**: Intelligent caching and indexing
- **Graceful Degradation**: Always available, even without vector database

**4. Concurrent Memory Server** (`src/memory/memory-server-client.js`)
- **Single-Writer Coordination**: Solves Milvus Lite's single-writer limitation
- **HTTP Memory Server**: Centralized write queue with automatic port discovery
- **Read-Your-Writes Consistency**: Immediate access to data via read-through cache
- **Multi-Project Support**: Random high ports (49152-65535) prevent conflicts
- **Transparent Fallback**: Automatic local storage when server unavailable

### 🎯 Agent Communication Examples

#### Scenario 1: Cross-Domain Knowledge Sharing
```bash
# Bob creates API security recommendations
npm start run backend "Design secure JWT authentication system"

# Steve later accesses Bob's security insights
npm start history "JWT security patterns" --role security
# → Finds Bob's previous recommendations and builds upon them
```

#### Scenario 2: Iterative Development Workflow
```bash
# Frank designs frontend component
npm start run frontend "Create user dashboard component"

# Adrian reviews architectural implications
npm start history "dashboard component architecture" --role architect
# → Accesses Frank's design decisions for architectural review
```

#### Scenario 3: Team Knowledge Accumulation
```bash
# View conversation statistics across all agents
npm start history --stats
# → Shows knowledge growth: 150 conversations, 12 agents active, 45 cross-references

# Search specific technical topics
npm start history "microservices patterns"
# → Returns insights from Bob, Adrian, and Oliver's conversations
```

### 🚀 Advanced Memory Features

#### Semantic Search Capabilities
- **Natural Language Queries**: "Show me all security recommendations"
- **Context-Aware Results**: Understanding of technical relationships
- **Multi-Agent Synthesis**: Combining insights from multiple expert agents
- **Temporal Relevance**: Recent insights weighted higher than older ones

#### Memory Scopes and Isolation
```yaml
# Example: Backend Agent Memory Configuration
memory:
  scopes:
    - global                    # System-wide knowledge
    - backend-core             # Backend-specific expertise
    - api-architecture         # API design patterns
    - database-performance     # Database optimization
    - microservices           # Microservices patterns
    - security-backend        # Backend security practices
```

#### Performance Metrics
- **Storage**: Automatic compression and indexing
- **Retrieval Speed**: <100ms semantic search responses
- **Accuracy**: 95%+ relevant results for technical queries
- **Scalability**: Handles 10,000+ conversations efficiently

### 🔧 Memory System Commands

#### Search and Retrieval
```bash
# Search across all agent conversations
npm start history "API optimization techniques"

# Search within specific agent's expertise
npm start history "React performance" --role frontend

# View system memory statistics
npm start history --stats

# Agent-specific conversation history
npm start history "database design" --role backend --limit 5
```

#### Memory Management
```bash
# Clear all chat history and reset memory
npm run reset:memory

# Clear specific memory type
node src/scripts/memory-clear.js type milvus

# View memory system health
npm run status
```

#### Development Integration
```bash
# Memory system validation
node test/practical-memory-test.js

# Check vector database connectivity
node test/enhanced-system-test.js

# Validate memory architecture
npm run validate

# Test concurrent memory coordination
npm run test:concurrent

# Start memory server for multi-project use
npm run memory:server

# Test memory server functionality
npm run memory:test
```

### 🔄 Concurrent Memory Coordination

**Multi-Agent Concurrent Operations**
AutomatosX solves the Milvus Lite single-writer limitation through an intelligent HTTP memory server that coordinates
writes across multiple agents running simultaneously.

**Key Features:**
- **Single-Writer Coordination**: All agents write through a centralized server
- **Write Queue Management**: Priority-based processing with 100ms intervals
- **Read-Through Cache**: Immediate consistency for read-your-writes operations
- **Automatic Port Discovery**: Agents find the server via `.claude/memory/ax/server.port`
- **Multi-Project Isolation**: Each project uses random high ports (49152-65535)

**Concurrent Testing Examples:**
```bash
# Test concurrent write coordination
npm run test:concurrent
# → Simulates 5 agents with 10 operations each (100% success rate)

# Start multiple agents simultaneously
npm start run backend "design API" &
npm start run frontend "create UI" &
npm start run quality "validate system" &
# → All agents coordinate writes through memory server

# Monitor server statistics
curl http://localhost:$(cat .claude/memory/ax/server.port)/stats
```

**Multi-Project Support:**
- **Automatic Port Management**: Each project gets unique random port
- **Port File Discovery**: Clients automatically find running servers
- **Graceful Fallback**: Works with or without server coordination
- **Zero Configuration**: No manual port management required

This intelligent memory system transforms AutomatosX from individual AI agents into a **collaborative AI development team**
where each agent learns from and builds upon the insights of others, creating exponentially more valuable outputs over time.

## 🤖 Dynamic Role Management

AutomatosX v3.1.3 supports dynamic role creation and removal, allowing you to extend the AI team with custom agents
tailored to your specific needs.

### Creating Custom Roles

Create new roles with specialized expertise:

```bash
# Basic role creation
node src/utils/create-role.js <role> <name> <title>

# Example: Create a translator agent
node src/utils/create-role.js translator Alex "Senior Translator"
```

**Advanced Role Creation:**
```bash
# Mobile development specialist
node src/utils/create-role.js mobile Sarah "Mobile Developer" \
  --specializations "iOS Development,Android Development,React Native,Flutter" \
  --stages "requirements,ui_design,development,testing,deployment,optimization" \
  --catchphrase "Mobile-first, user-centric, performance-optimized"

# Blockchain specialist
node src/utils/create-role.js blockchain Oliver "Blockchain Developer" \
  --specializations "Smart Contracts,DeFi,Web3,Solidity,Ethereum" \
  --stages "tokenomics,smart_contract_design,development,auditing,deployment" \
  --catchphrase "Code is law, security is paramount"
```

### What Gets Created

When you create a new role, AutomatosX automatically generates:

1. **📝 YAML Profile** (`src/agents/{role}/profile.yaml`)
   - Complete agent configuration
   - Workflow stages and model mappings
   - Memory scopes and abilities paths

2. **📚 Abilities Directory** (`src/agents/{role}/abilities/`)
   - `core-abilities.md` - Primary responsibilities and expertise
   - `tools-and-frameworks.md` - Recommended tools and technologies
   - `processes-and-workflows.md` - Standard operating procedures

3. **🔄 Agent Registry** (`src/agents/agent-profiles.js`)
   - Updated with new agent profile
   - Maintains personality and communication patterns

4. **🏗️ Workspace Directories**
   - `.defai/workspaces/agents/{name}/` - Agent-specific workspace
   - `.defai/workspaces/roles/{role}/` - Role-based workspace
   - Includes: outputs, logs, tasks, context, artifacts subdirectories

### Managing Existing Roles

**List Available Roles:**
```bash
node src/utils/remove-role.js --list
```

**Safe Role Removal:**
```bash
# Preview what will be removed (creates backup)
node src/utils/remove-role.js translator

# Remove with backup
node src/utils/remove-role.js translator --force

# Remove by agent name
node src/utils/remove-role.js Alex --force
```

**Dangerous Operations:**
```bash
# Remove without backup (⚠️ permanent deletion)
node src/utils/remove-role.js translator --force --no-backup
```

### Role Customization

After creating a role, you can customize:

1. **Edit Abilities** - Update `src/agents/{role}/abilities/*.md` files
2. **Modify Profile** - Adjust `src/agents/{role}/profile.yaml` configuration
3. **Test Integration** - Run `npm run validate` to verify configuration

### Best Practices

- **Specialized Roles**: Create focused roles for specific domains (mobile, blockchain, AI/ML)
- **Clear Naming**: Use descriptive role names and agent names
- **Comprehensive Abilities**: Define detailed expertise in abilities files
- **Stage Workflows**: Design logical workflow stages for complex tasks
- **Backup Before Removal**: Always backup roles before removal

## 🔧 Development

### Code Quality
```bash
# Formatting and linting
npx eslint src/ scripts/ test/
npx prettier --write src/ scripts/ test/

# Testing
npm test                           # Main integration tests
node test/enhanced-system-test.js  # Core system tests
node test/practical-memory-test.js # Memory system tests
```

### System Validation
```bash
# Validate profiles and architecture
npm run validate
node src/scripts/validate-architecture.js

# Test router functionality
node src/scripts/agent-router.js frontend "test task"
```

### Build and Deployment
```bash
# Build system with parallel execution
npm run build

# Install locally for development
npm run install:local

# Install globally for system-wide access
npm run install:global
```

## 📊 Performance Metrics

- **Role Loading**: 40-80ms initial, <1ms cached (5-minute TTL)
- **Provider Routing**: <10ms with circuit breaker protection
- **Memory Search**: Vector search with SQLite fallback
- **Workspace Management**: Isolated execution environments per agent

## 🛡️ Security Features

- **Zero Stored Credentials** - Uses CLI authentication exclusively
- **Input Validation** - Comprehensive security validation and sanitization
- **Workspace Isolation** - Each agent execution isolated in dedicated workspace
- **Command Security** - Protection against injection attacks

## 🔄 Provider Support

### Primary Provider
- **Claude Code CLI** - Zero-cost access with full feature support

### Fallback Providers
- **OpenAI Codex CLI** - Automatic fallback with advanced coding capabilities via `codex` command
- **Gemini CLI** - Google AI integration via gcloud

### Circuit Breaker Protection
- Automatic provider switching on failures
- Performance monitoring and health checks
- Graceful degradation with intelligent fallbacks

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete development reference
- **[Architecture Guide](docs/architecture/)** - System architecture details
- **[Setup Guide](docs/)** - Detailed installation instructions
- **[User Guide](docs/)** - Usage examples and best practices
- **[Examples](examples/)** - Practical examples and demonstrations

## 🔧 Examples and Testing

### Running Examples

Explore AutomatosX features with practical examples:

```bash
# Run all examples in sequence
npm run examples

# Run individual examples
npm run examples:abilities    # Abilities system demonstration
npm run examples:agent        # Agent management showcase
npm run examples:memory       # Optimized memory system demo
npm run examples:yaml         # YAML inheritance patterns

# Validate examples work correctly
npm run test:examples
```

### Development Testing

```bash
# Full test suite
npm test                      # Core system tests
npm run test:examples         # Examples validation
npm run test:legacy           # Legacy compatibility tests

# System validation
npm run validate              # Profile and configuration validation
npm run status                # Provider connectivity check
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Run tests: `npm test`
4. Validate profiles: `npm run validate`
5. Submit pull request

## 📄 License

AutomatosX is released under the [Apache License 2.0](LICENSE). Retain the bundled `LICENSE` file and preserve the
copyright notice (`DEFAI Team`) and product references (`AutomatosX`) in source distributions or derivative works.

## 🌟 Why AutomatosX?

AutomatosX combines the architectural patterns of enterprise agent platforms with enhanced profile management and
intelligent routing. Built for developers who need sophisticated AI agent orchestration without the complexity of
traditional platforms.

**Key Differentiators:**
- CLI-first architecture eliminates API key management
- Dynamic role loading enables rapid agent customization
- Multi-provider routing ensures reliability and cost optimization
- Comprehensive chat history provides continuous learning capabilities

---

**Ready to orchestrate AI agents like never before?** Start with `npm start run backend "your first task"` and experience
the future of AI collaboration.
