Initialize AutomatosX in the current project directory.

Execute:
```bash
automatosx init
```

This will:
1. Create `.automatosx/` directory structure
2. Install example agents in `.automatosx/agents/`
3. Install example abilities in `.automatosx/abilities/`
4. Create `.claude/` integration files
5. Generate `automatosx.config.json`
6. Update `.gitignore`

Use `/ax:init --force` to reinitialize if `.automatosx` already exists.

Example:
- `/ax:init` → Initialize project
- `/ax:init --force` → Force reinitialize
