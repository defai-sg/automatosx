# AutomatosX Quickstart

Get AutomatosX v3.1.4 running in minutes and run your first agent tasks.

## 1. Install Prerequisites
- Node.js 18+ (`node -v`)
- Git
- Claude Code CLI (free provider)

```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

## 2. Clone and Install AutomatosX
```bash
git clone https://github.com/defai-digital/automatosx.git
cd automatosx
npm install
```

## 3. Verify the CLI
```bash
npm run status             # Provider checks + system summary
npm run agents --detailed  # List all 21 agents and workflows
```

You should see Claude marked `✅ Available` before proceeding.

## 4. Run Your First Tasks
```bash
# Ask the backend engineer to draft an API
npm start run backend "Design an auth API for a task tracker"

# Let the designer plan a quick UI flow
npm start run design "Create a 3-screen onboarding flow for a mobile app"
```

Add `--workflow` to trigger the full multi-stage lifecycle defined in each agent profile.

## 5. Save and Inspect Outputs
Generated artifacts are stored under `.defai/workspaces/`.
- `roles/<role>/outputs/` keeps Markdown task reports.
- `roles/<role>/logs/` captures execution metadata.

> ⚠️ Privacy Note: `.defai/chat-history/` stores past prompts and responses so agents can
> reuse context. Delete the directory or run `npm run reset:memory` if you do not want
> transcripts retained locally.

## 6. Reset If Needed
```bash
npm run reset:status        # Show configurable reset options
npm run reset:config        # Restore default configuration
npm run reset:workspace     # Clean workspaces (keeps structure)
```

## 7. Next Steps
- Explore command references in `docs/OPERATIONS.md`.
- Review each agent’s abilities in `docs/AGENT-ROLES.md`.
- Configure additional providers via `src/config/providers.json` and `npm run status`.
