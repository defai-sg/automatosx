# AutomatosX Development Guide

This document provides guidance for maintaining, extending, and enhancing AutomatosX.
It's designed for developers and maintainers who need to understand development practices and contribution guidelines.

## 🛠️ Development Environment Setup

### Prerequisites

```bash
# Required tools
Node.js 18+                 # ES module support
git                         # Version control
Claude Code CLI             # Primary testing provider

# Recommended tools
markdownlint-cli           # Documentation linting
eslint                     # Code linting
prettier                   # Code formatting
```

### Initial Setup

```bash
# Clone and setup
git clone <repository-url>
cd automatosx
npm install

# Validate environment
npm run validate
npm run health
npm run test:integration
```

### Development Scripts

```bash
# Core development
npm run validate            # System validation
npm run test               # Run test suite
npm run test:integration   # Integration tests
npm run test:concurrent    # Concurrent memory tests

# Code quality
npm run lint:md            # Markdown linting
npm run lint:md:fix        # Fix markdown issues
npx eslint src/            # JavaScript linting
npx prettier --write src/  # Code formatting
```

### 📁 Temporary Files and Project Cleanliness

**Best Practice**: Keep the project tidy by using proper temporary file locations:

```bash
# ✅ Good: Use /tmp for temporary scripts and testing files
./tmp/test-script.js
./tmp/debug-output.txt
./tmp/link-checker.sh

# ❌ Avoid: Temporary files in project root
./test-script.js          # Clutters project root
./debug.txt              # Pollutes git status
./temp-check.sh          # Makes project untidy
```

**Development Guidelines**:
- Create temporary testing scripts in `./tmp/` directory
- Use `./tmp/` for debugging outputs and temporary data
- Clean up temporary files after debugging/testing
- Add `tmp/` to `.gitignore` to prevent accidental commits
- This keeps the project maintainable and professional

### System Operations

```bash
npm run factory-reset:dry-run  # Test factory reset
npm run filesystem:validate   # Filesystem integrity
npm run health:auto-fix       # Auto-fix issues
```

## 🏗️ Architecture Principles

### Design Philosophy

**CLI-First**: Everything accessible via command line
**Memory-Aware**: Persistent context across sessions
**Provider-Agnostic**: Multiple AI provider support
**User-Data Safe**: Never destructive to user work
**AI-Friendly**: Structured for AI system understanding
**Model-Agnostic**: CLI tools manage their own model selection

### Model Management Strategy

**AutomatosX deliberately avoids specifying AI models**, instead letting each CLI provider use its default/latest model.

**Problem Solved**:
- AI providers frequently change model names (e.g., `claude-3-sonnet` → `claude-3-5-sonnet` → `claude-4-sonnet`)
- Managing model configurations across 3+ providers becomes a maintenance nightmare
- Outdated model names cause runtime errors

**Solution**:
```bash
# Instead of: claude --model claude-3-5-sonnet-20241022
claude             # Uses Anthropic's current default

# Instead of: gemini --model gemini-2.0-flash-exp
gemini            # Uses Google's current default

# Instead of: codex --model gpt-4-turbo-2024-04-09
codex exec        # Uses OpenAI's current default
```

**Benefits**:
- ✅ **Zero model maintenance** - No configurations to update
- ✅ **Automatic access to latest models** - Each provider handles updates
- ✅ **Fewer bugs** - No outdated model name errors
- ✅ **Provider expertise** - Each provider chooses optimal defaults
- ✅ **Simplified configuration** - Focus on functionality, not model versions

### Code Organization Patterns

```bash
src/
├── core/           # Core orchestration (stable interfaces)
├── agents/         # Agent definitions (user-modifiable)
├── memory/         # Memory system (performance-critical)
├── providers/      # AI provider integrations (pluggable)
├── scripts/        # Operational scripts (CLI tools)
├── shared/         # Shared utilities and templates
└── __tests__/      # Test suites and integration tests
```

### Module Design Patterns

**Single Responsibility**: Each module has one clear purpose
**Dependency Injection**: Components receive dependencies
**Circuit Breaker**: Graceful failure handling
**Observer Pattern**: Event-driven architecture
**Factory Pattern**: Provider and agent creation

## 🔧 Development Workflows

### Agent Directory Structure

#### The `_global` Directory
**IMPORTANT**: The `src/agents/_global/` directory is **NOT an agent role**. It serves as a shared resource directory:

- **Purpose**: Contains shared abilities and frameworks that can be inherited by all agent roles
- **Why underscore prefix**: The `_` prefix clearly indicates this is a special system directory, not a regular agent role
- **No profile.yaml**: Unlike agent roles, `_global` does not contain a `profile.yaml` file
- **Inheritance**: Other agents can inherit abilities from `_global` through the abilities system
- **Agent count**: When counting agents, `_global` should be excluded as it's infrastructure, not a role

**Directory Contents**:
```
src/agents/_global/
└── abilities/
    ├── core-abilities.md          # Shared core abilities
    ├── tools-and-frameworks.md    # Common tools and frameworks
    └── processes-and-workflows.md # Standard processes
```

**Do NOT**:
- Create a profile.yaml in `_global`
- Register `_global` in agent-profiles.js
- Count `_global` as an agent role
- Use `_global` as a target for agent commands

### Adding New Agents

1. **Create Agent Structure**:
```bash
# Create agent directories
mkdir -p src/agents/{role}/abilities
```

1. **Define Profile** (`src/agents/{role}/profile.yaml`):
```yaml
role: newrole
description: "Description of the agent's purpose"
specializations: ["area1", "area2"]
workflow_stages:
  - stage1
  - stage2
memory_scope: ["scope1", "scope2"]
model_config:
  tier_core_technical:
    token_limit: 12000
    temperature: 0.1
```

1. **Create Abilities** (`src/agents/{role}/abilities/*.md`):
```bash
# Create ability files
touch src/agents/{role}/abilities/core-abilities.md
touch src/agents/{role}/abilities/tools-and-frameworks.md
touch src/agents/{role}/abilities/processes-and-workflows.md
```

1. **Register Personality** (`src/agents/agent-profiles.js`):
```javascript
export const AGENT_PROFILES = {
  // ... existing agents
  newrole: {
    name: "AgentName",
    title: "Agent Title",
    personality: "traits, style, approach",
    catchphrase: "Characteristic phrase",
    specializations: ["area1", "area2"]
  }
};
```

1. **Initialize and Test**:
```bash
node src/scripts/dynamic-init.js full
npm run validate
npm start run newrole "test task"
```

### Extending Memory System

1. **Implement Storage Interface**:
```javascript
// src/memory/new-storage-backend.js
export class NewStorageBackend {
  async initialize() { /* implementation */ }
  async store(conversation) { /* implementation */ }
  async search(query, options) { /* implementation */ }
  async getStatistics() { /* implementation */ }
}
```

1. **Integrate with Memory Manager**:
```javascript
// src/memory/practical-memory-system.js
import { NewStorageBackend } from './new-storage-backend.js';

// Add to initialization logic
if (config.useNewBackend) {
  this.backend = new NewStorageBackend(config);
}
```

1. **Test Integration**:
```bash
npm run test:integration:memory
npm run test:concurrent
```

### Adding New Providers

1. **Implement Provider Interface**:
```javascript
// src/providers/new-provider.js
export class NewProvider {
  constructor(config) { /* setup */ }

  async checkAvailability() { /* health check */ }

  async executeTask(agentContext, task, options) {
    // Implementation following pattern from claude-code.js
  }

  async estimateTokens(prompt) { /* token estimation */ }
}
```

1. **Register in Provider Manager**:
```javascript
// src/providers/provider-manager.js
import { NewProvider } from './new-provider.js';

const PROVIDERS = {
  // ... existing providers
  'new-provider': NewProvider
};
```

1. **Add Configuration**:
```json
// src/config/providers.json
{
  "new-provider": {
    "priority": 3,
    "health_check": "new-provider --version",
    "timeout": 30000,
    "circuit_breaker": {
      "failure_threshold": 5,
      "reset_timeout": 60000
    }
  }
}
```

### Creating New Workflows

1. **Define Workflow Template**:
```javascript
// src/core/workflow-router.js
const WORKFLOW_PATTERNS = {
  'new-pattern': {
    description: 'Description of workflow purpose',
    steps: [
      {
        agent: 'agent1',
        task_template: 'Task for {{context.variable}}',
        condition: 'optional_condition'
      },
      {
        agent: 'agent2',
        task_template: 'Follow-up task based on {{previous.result}}',
        depends_on: 'step1'
      }
    ]
  }
};
```

1. **Test Workflow**:
```bash
npm start workflow new-pattern "test context"
npm start workflow --list  # Verify registration
```

## 🧪 Testing Guidelines

### Test Structure

```bash
src/__tests__/
├── integration-examples/         # Integration test suites
│   ├── abilities-system-test.js     # Abilities functionality
│   ├── agent-management-test.js     # Agent operations
│   ├── memory-system-test.js        # Memory operations
│   └── quick-memory-test.js         # Fast memory validation
├── concurrent-memory-test.js     # Concurrent access testing
├── enhanced-system-test.js       # End-to-end validation
└── practical-memory-test.js      # Memory system unit tests
```

### Testing Practices

**Integration First**: Test component interactions
**Memory Safety**: Test concurrent access patterns
**Provider Resilience**: Test failover scenarios
**Data Preservation**: Validate user data protection

### Running Tests

```bash
# Full test suite
npm run test:integration

# Specific test categories
npm run test:integration:memory    # Memory system
npm run test:integration:abilities # Abilities system
npm run test:concurrent           # Concurrent access
npm run test:quick-memory         # Fast validation

# System validation
npm run validate                  # Configuration validation
npm run health                    # System health check
npm run filesystem:validate       # File integrity
```

## 📊 Performance Guidelines

### Memory System Optimization

**Vector Database Tuning**:
```javascript
// Optimize embedding configuration
const config = {
  maxActiveMemories: 20000,      // Balance memory vs performance
  relevanceThreshold: 0.3,       // Filter low-relevance results
  compressionInterval: 3600000,  // Regular compression cycles
  enablePerformanceTracking: true
};
```

**Query Optimization**:
```javascript
// Efficient search patterns
const results = await memorySystem.search(query, {
  agentRole: 'specific-agent',    // Scope filtering
  limit: 10,                     // Reasonable result limits
  timeRange: {                   // Time-bound searches
    start: Date.now() - 86400000,
    end: Date.now()
  }
});
```

### Provider Performance

**Circuit Breaker Configuration**:
```json
{
  "failure_threshold": 5,     // Failures before circuit opens
  "reset_timeout": 60000,     // Recovery attempt interval
  "half_open_max_calls": 3    // Test calls in half-open state
}
```

**Request Optimization**:
```javascript
// Efficient provider usage
await provider.executeTask(context, task, {
  timeout: 30000,           // Reasonable timeout
  retries: 2,              // Limited retry attempts
  priority: 'normal'       # Priority-based queuing
});
```

## 🔧 Configuration Management

### Environment-Specific Configuration

```yaml
# Development
memory:
  maxActiveMemories: 1000
  enablePerformanceTracking: true

# Production
memory:
  maxActiveMemories: 25000
  archiveThreshold: 100000
  enablePerformanceTracking: true
```

### Configuration Validation

```javascript
// Add validation for new config options
const configSchema = {
  memory: {
    maxActiveMemories: { type: 'number', min: 100, max: 50000 },
    enablePerformanceTracking: { type: 'boolean' }
  }
};
```

## 📚 Documentation Standards

### Code Documentation

```javascript
/**
 * Brief function description
 * @param {string} agentRole - The agent role identifier
 * @param {string} task - The task description
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Task execution result
 */
async function executeAgentTask(agentRole, task, options = {}) {
  // Implementation
}
```

### Markdown Standards

- Use markdownlint for consistency
- Follow heading hierarchy (H1 → H2 → H3)
- Include code examples for complex operations
- Maintain table of contents for long documents

### API Documentation

```javascript
// Use JSDoc for API documentation
/**
 * @typedef {Object} AgentContext
 * @property {string} role - Agent role identifier
 * @property {Array<string>} abilities - Available abilities
 * @property {Object} memory - Memory context
 */
```

## 🔄 Release Management

### Version Strategy

- **Major versions**: Breaking changes, new architecture
- **Minor versions**: New features, non-breaking changes
- **Patch versions**: Bug fixes, security updates

### Release Process

1. **Pre-release Validation**:
```bash
npm run validate
npm run test:integration
npm run health
npm run filesystem:validate
```

1. **Version Update**:
```bash
npm version minor  # or major/patch
```

1. **Migration Testing**:
```bash
npm run upgrade:prepare 3.x.0 --dry-run
```

1. **Documentation Update**:
```bash
# Update filesystem map version
# Update CLAUDE.md command references
# Validate all documentation links
```

### Migration Guidelines

**File Moves**: Update filesystem mapping
**API Changes**: Provide backward compatibility
**Configuration Changes**: Include migration scripts
**Database Changes**: Provide upgrade paths

## 🚀 Deployment Patterns

### Development Deployment

```bash
# Local development
npm install
npm run validate
npm start run backend "test"
```

### Production Deployment

```bash
# Production setup
npm ci                        # Clean install
npm run validate             # System validation
npm run health               # Health check
npm run factory-reset:dry-run # Verify reset capability
```

### CI/CD Integration

```yaml
# Example GitHub Actions
name: AutomatosX CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run validate
      - run: npm run test:integration
      - run: npm run health
```

## 🐛 Debugging Guidelines

### Common Issues

**Memory System Issues**:
```bash
# Check vector database status
npm run memory:test
# Rebuild indices if corrupted
npm start memory clear milvus
```

**Provider Connectivity**:
```bash
# Test provider availability
claude --version
node src/scripts/config-manager.js status
```

**Agent Configuration**:
```bash
# Validate agent profiles
node src/scripts/dynamic-init.js validate
# Reinitialize if needed
node src/scripts/dynamic-init.js full
```

### Debug Tools

```bash
# Enable verbose logging
DEBUG=automatosx:* npm start run backend "task"

# Memory system debugging
npm start memory stats

# Provider debugging
node src/scripts/config-manager.js test
```

## 🤝 Contribution Guidelines

### Code Standards

- **ES Modules**: Use import/export syntax
- **Async/Await**: Prefer over promises chains
- **Error Handling**: Comprehensive error catching
- **Type Documentation**: JSDoc for complex types

### Pull Request Process

1. Fork repository and create feature branch
1. Implement changes with tests
1. Run full validation suite
1. Update documentation as needed
1. Submit PR with clear description

### Review Criteria

- **Functionality**: Does it work as intended?
- **Performance**: No significant performance degradation
- **Compatibility**: Maintains backward compatibility
- **Documentation**: Adequate documentation updates
- **Testing**: Appropriate test coverage

This development guide provides the foundation for maintaining and enhancing AutomatosX
while preserving its core architectural principles and user experience.
