# Contributing to AutomatosX

We welcome pull requests and bug reports that improve AutomatosX. Please follow the
workflow below so we can review and merge changes quickly.

## Development Environment
1. Install Node.js 18+ and the Claude Code CLI (`npm install -g @anthropic-ai/claude-code`).
2. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/defai-digital/automatosx.git
   cd automatosx
   npm install
   ```
3. Run the smoke tests before you start:
   ```bash
   npm test
   npm run lint:md
   ```

## Making Changes
- Keep runtime data out of commits: `.defai/`, `.claude/`, `workspaces/`, and provider CLI
  caches must stay local.
- Prefer incremental, focused PRs. Update documentation (README, QUICKSTART, SECURITY)
  whenever behavior or commands change.
- Maintain the code style: use ES modules, 4-space indentation, and run Prettier/ESLint if
  you touch JS files (`npx eslint src/`, `npx prettier --write src/`).
- For docs, respect the 120 character wrap enforced by `markdownlint`.

## Testing
Before opening a PR, run:
```bash
npm test            # Integration validations
npm run lint:md     # Markdown formatting
```
Include the commands you ran and results in your PR description. Add new tests under
`src/__tests__/` when fixing bugs or adding features.

## Commit & PR Guidelines
- Use conventional-style commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Describe intent, major code paths touched, and test evidence in the PR body. Link any relevant issues.
- If your change affects security, privacy, or workspace handling, call it out explicitly so reviewers can prioritize.

## Responsible Disclosure
Security issues should be reported privately following the instructions in `SECURITY.md`.

Thanks for helping us build AutomatosX!
