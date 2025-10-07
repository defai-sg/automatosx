---
layout: home

hero:
  name: AutomatosX
  text: AI Agent Orchestration Platform
  tagline: Build, manage, and scale AI agents with ease
  image:
    src: /logo.svg
    alt: AutomatosX
  actions:
    - theme: brand
      text: Get Started
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/automatosx/automatosx
    - theme: alt
      text: API Reference
      link: /api/

features:
  - icon: 🚀
    title: Lightning Fast
    details: Built with modern TypeScript, optimized for performance. Lightweight bundle size under 50MB for fast installation.

  - icon: 🧠
    title: Vector Memory
    details: Advanced memory system powered by SQLite + vec. Efficient semantic search with 0.72ms query latency.

  - icon: 🔌
    title: Multi-Provider
    details: Seamless integration with Claude, Gemini, OpenAI, and more. Automatic fallback and load balancing.

  - icon: 📝
    title: Profile-Based
    details: Define agents with YAML profiles and Markdown abilities. Simple, version-controllable, and shareable.

  - icon: 🔒
    title: Secure by Design
    details: Built-in path validation, workspace isolation, and comprehensive security audits. Your data stays safe.

  - icon: 🎯
    title: Developer Friendly
    details: 100% TypeScript, comprehensive tests (705 passing), excellent documentation, and intuitive CLI.

---

## Quick Example

```bash
# Install
npm install @defai.sg/automatosx

# Initialize project
npx @defai.sg/automatosx init

# Create your first agent
npx @defai.sg/automatosx run assistant "Help me write a README"
```

## Why AutomatosX v4.0?

### Key Features

- **Lightweight**: <50MB bundle size
- **Minimal Dependencies**: Only 158 packages
- **Modern TypeScript**: 100% type safety, strict mode
- **High Performance**: ~280ms startup, 57MB memory usage
- **Comprehensive Tests**: 705 tests, 67% coverage
- **Full Documentation**: Complete guides, API reference, examples

### What's New

- ✨ **SQLite + vec** for vector storage (simple, fast, efficient)
- ✨ **Advanced Caching** reduces API calls by 30-40%
- ✨ **Performance Profiling** built-in for optimization
- ✨ **Improved CLI** with better UX and error handling
- ✨ **Backward Compatible** configuration format

## Get Started in Minutes

<div class="vp-doc">

### 1. Install AutomatosX

```bash
npm install @defai.sg/automatosx
# or
pnpm add automatosx
# or
yarn add automatosx
```

### 2. Initialize Your Project

```bash
npx @defai.sg/automatosx init
```

This creates:
- `.automatosx/config.json` - Configuration
- `.automatosx/agents/` - Agent profiles
- `.automatosx/abilities/` - Custom abilities
- `.automatosx/memory.db` - Vector memory database

### 3. Configure Providers

```bash
npx @defai.sg/automatosx config --set providers.claude.apiKey --value "your-api-key"
```

### 4. Run Your First Agent

```bash
npx @defai.sg/automatosx run assistant "What is the weather like?"
```

</div>

## Community

::: tip Coming Soon
Community resources (Discord, Discussions) will be available after v4.0 launch.

For now, please use [GitHub Issues](https://github.com/yourusername/automatosx/issues) for bug reports and questions.
:::

## License

[MIT License](https://github.com/automatosx/automatosx/blob/main/LICENSE) © 2024-present AutomatosX Team
