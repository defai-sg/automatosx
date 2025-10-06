# Beta Testing Guide

Thank you for participating in AutomatosX v4.0 beta testing! Your feedback is crucial for ensuring a stable and high-quality release.

## What is Beta Testing?

Beta testing helps us:
- Validate functionality in real-world scenarios
- Identify bugs and edge cases
- Improve documentation and user experience
- Ensure production readiness

## Beta Testing Timeline

- **Duration**: 2-4 weeks
- **Current Phase**: v4.0.0-beta.1
- **Target Release**: v4.0.0 (production)

## Prerequisites

- Node.js 20.0.0 or higher
- At least one AI provider API key (Claude, Gemini, or OpenAI)
- Willingness to provide feedback
- Time commitment: 2-5 hours per week

## Installation

### Option 1: Global Installation

```bash
npm install -g automatosx@beta
```

### Option 2: Test in Isolated Project

```bash
mkdir automatosx-beta-test
cd automatosx-beta-test
npm init -y
npm install automatosx@beta
```

### Verify Installation

```bash
automatosx --version
# Should show: 4.0.0-beta.1 (or later beta version)

automatosx --help
# Should display command list
```

## Quick Start

### 1. Initialize Project

```bash
mkdir my-test-project
cd my-test-project
automatosx init
```

### 2. Configure API Keys

```bash
# Set your preferred provider
automatosx config --set providers.claude.apiKey --value "sk-ant-..."

# Or use environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Test Basic Functionality

```bash
# Check status
automatosx status

# List available agents
automatosx list agents

# Run a simple test
automatosx run assistant "Hello, please respond with 'Beta test working'"
```

## Testing Checklist

Please test the following areas and report any issues:

### Core Functionality

- [ ] **Installation**: Smooth installation process, no errors
- [ ] **Configuration**: Config creation and modification works
- [ ] **CLI Commands**: All commands execute without crashes
- [ ] **Error Handling**: Errors are clear and actionable

### CLI Commands

Test each command:

```bash
# Init
automatosx init

# Status
automatosx status

# Config
automatosx config --list
automatosx config --get logging.level
automatosx config --set logging.level --value debug

# List
automatosx list agents
automatosx list abilities

# Run
automatosx run assistant "test prompt"

# Chat
automatosx chat assistant
# Type: hello
# Type: exit

# Memory
automatosx memory list
automatosx memory search "test"
automatosx memory export --output backup.json
```

### Provider Integration

Test with your available providers:

- [ ] **Claude**: Run tasks with Claude provider
- [ ] **Gemini**: Run tasks with Gemini provider
- [ ] **OpenAI Embeddings**: Test memory search

```bash
# Test Claude
automatosx run assistant "Explain TypeScript" --provider claude

# Test Gemini
automatosx run assistant "Explain TypeScript" --provider gemini

# Test provider fallback
# (Temporarily remove primary API key and test fallback)
```

### Memory System

- [ ] **Store memories**: Run agents and verify memory storage
- [ ] **Search memories**: Semantic search works correctly
- [ ] **Export/Import**: Data preservation works

```bash
# Store some data
automatosx run assistant "Remember: my favorite framework is React"

# Search for it
automatosx memory search "favorite framework"

# Export
automatosx memory export --output test-export.json

# Verify export file
cat test-export.json | jq .

# Import (after deleting database)
rm .automatosx/memory.db
automatosx memory import --input test-export.json
```

### Agent System

- [ ] **Pre-built agents**: Test example agents work
- [ ] **Custom agents**: Create and test custom agent
- [ ] **Agent abilities**: Verify abilities are loaded and used

```bash
# Copy example agents
cp -r node_modules/automatosx/examples/agents/* .automatosx/agents/

# Test different agents
automatosx run assistant "general task"
automatosx run coder "write a function"
automatosx run reviewer "review code quality"

# Create custom agent
cat > .automatosx/agents/my-test-agent.yaml << EOF
name: my-test-agent
description: Test agent
model: claude-3-sonnet-20240229
temperature: 0.7
abilities:
  - general-assistance
EOF

# Test custom agent
automatosx run my-test-agent "hello"
```

### Performance

- [ ] **Startup time**: CLI starts within 2-3 seconds
- [ ] **Response time**: Agents respond within reasonable time
- [ ] **Memory usage**: No excessive RAM usage
- [ ] **Bundle size**: Installation is reasonably sized

```bash
# Test startup time
time automatosx --version

# Test response time
time automatosx run assistant "hello"

# Check bundle size
du -sh node_modules/automatosx
```

### Edge Cases

- [ ] **Long prompts**: Test with 1000+ word prompts
- [ ] **Special characters**: Test with Unicode, emojis
- [ ] **Large files**: Test reading large files (if applicable)
- [ ] **Network errors**: Test behavior with no internet
- [ ] **Invalid inputs**: Test error handling for invalid data

## What to Test

### Priority 1: Critical Paths (Required)

These are must-test scenarios:

1. **Installation and Setup**
   - Clean installation
   - Configuration creation
   - API key setup

2. **Basic Agent Execution**
   - Run at least 3 different prompts
   - Test with your primary use case
   - Verify responses are coherent

3. **Memory Functionality**
   - Store and retrieve data
   - Search works as expected
   - Export/import preserves data

### Priority 2: Common Use Cases (Recommended)

Test scenarios you'd actually use:

1. **Code Generation**
   - Ask agent to write code
   - Verify code quality
   - Test multiple languages

2. **Documentation**
   - Generate documentation
   - Explain complex concepts
   - Write tutorials

3. **Analysis**
   - Code review
   - Error debugging
   - Performance analysis

### Priority 3: Advanced Features (Optional)

If you have time:

1. **Multi-turn Conversations**
   - Use chat mode
   - Test context retention
   - Verify conversation flow

2. **Custom Agents**
   - Create specialized agents
   - Test different configurations
   - Experiment with abilities

3. **Integration**
   - Use in real projects
   - Test with existing workflows
   - Combine with other tools

## How to Report Issues

### Reporting Bugs

Use [GitHub Issues](https://github.com/defai-sg/automatosx/issues/new):

**Title**: Brief description of the issue

**Template**:
```markdown
## Bug Description
Clear description of what went wrong

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should have happened

## Actual Behavior
What actually happened

## Environment
- AutomatosX version: (run `automatosx --version`)
- Node version: (run `node --version`)
- OS: (e.g., macOS 13.5, Ubuntu 22.04)
- Provider: (Claude/Gemini/OpenAI)

## Logs/Output
```
Paste error messages or relevant output here
Use --debug flag for detailed logs:
automatosx run assistant "test" --debug
```

## Additional Context
Any other relevant information
```

### Reporting Feedback

For general feedback, use [GitHub Discussions](https://github.com/defai-sg/automatosx/discussions):

**Categories**:
- **Feature Requests**: Suggest improvements
- **Questions**: Ask for help or clarification
- **Show and Tell**: Share your use cases
- **General Feedback**: Overall impressions

## Testing Tips

### Get Detailed Logs

```bash
# Enable debug mode
automatosx run assistant "test" --debug

# Or set in config
automatosx config --set logging.level --value debug
```

### Isolate Issues

```bash
# Test in clean environment
mkdir clean-test
cd clean-test
automatosx init
# Reproduce issue
```

### Compare with Mock Mode

```bash
# Test with real provider
automatosx run assistant "test"

# Test with mock (no API calls)
AUTOMATOSX_MOCK_PROVIDERS=true automatosx run assistant "test"
```

### Document Your Setup

Keep notes of:
- Your use case
- Your configuration
- Commands that work/don't work
- Workarounds you discover

## Beta Tester Rewards

As a thank you for beta testing:

- **Recognition**: Listed in CONTRIBUTORS.md (if you wish)
- **Early Access**: First to know about new features
- **Influence**: Your feedback directly shapes v4.0
- **Swag**: AutomatosX stickers (for active testers)

## Communication Channels

- **GitHub Issues**: Bug reports
- **GitHub Discussions**: General feedback
- **Discord**: Real-time chat (coming soon)
- **Email**: beta@automatosx.dev

## Beta Testing Timeline

### Week 1-2: Initial Testing
- Install and setup
- Test core functionality
- Report critical bugs

### Week 3-4: Deep Testing
- Real-world usage
- Edge cases
- Performance testing

### Week 5: Final Validation
- Verify bug fixes
- Confirm improvements
- Sign off on release

## Frequently Asked Questions

### Is beta safe for production use?

**No**. Beta versions may have bugs. Use only for testing.

### Will my data be lost when updating?

Data should persist across updates, but we recommend:
```bash
automatosx memory export --output backup.json
```

### Can I test multiple versions?

Yes, use different directories:
```bash
mkdir test-beta-1 && cd test-beta-1
npm install automatosx@4.0.0-beta.1

mkdir test-beta-2 && cd test-beta-2
npm install automatosx@4.0.0-beta.2
```

### How do I revert to stable version?

```bash
npm install -g automatosx@3.1.5
```

### Will I be charged for API usage?

Yes, beta testing uses real AI providers. Costs are typically:
- $0.05 - $0.50 for basic testing
- $1 - $5 for extensive testing

## Success Metrics

We consider beta successful when:
- [ ] 10+ testers complete full test suite
- [ ] All critical bugs fixed
- [ ] Documentation gaps identified and filled
- [ ] Real-world use cases validated
- [ ] 95%+ of testers satisfied with stability

## Thank You!

Your participation makes AutomatosX better for everyone. We appreciate your time and feedback!

---

**Questions?** Email beta@automatosx.dev or ask in [GitHub Discussions](https://github.com/defai-sg/automatosx/discussions)
