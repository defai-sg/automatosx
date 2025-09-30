# AutomatosX Release Checklist

Use this checklist when cutting a public release.

## 1. Pre-release Verification
- [ ] Update `package.json` and `package-lock.json` with the new semantic version.
- [ ] Update README badges, CLI banners, and docs references to the new version.
- [ ] Confirm `SECURITY.md`, `docs/QUICKSTART.md`, and README privacy notes match current behavior.
- [ ] Ensure provider docs (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) reflect current commands.

## 2. Test Suite
Run the full validation matrix and record results:
```bash
npm test
npm run lint:md
```
Add any additional targeted tests relevant to the release (e.g., `npm run test:integration`, `npm run status`).

## 3. Changelog & Tag
- [ ] Create or update the changelog section for this version (e.g., in `docs/PROJECT-HISTORY.md`).
- [ ] Tag the release: `git tag -a vX.Y.Z -m "AutomatosX vX.Y.Z"`.
- [ ] Push tags after merging: `git push origin main --tags`.

## 4. Publish
- [ ] Announce availability (release notes, blog, etc.).
- [ ] Update any deployment artifacts or package registries if applicable.

## 5. Post-release
- [ ] Monitor issues and security inbox for regression reports.
- [ ] Triage backlog for the next milestone.

Keep this checklist updated as the release process evolves.
