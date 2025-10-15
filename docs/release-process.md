# Release Process

## Automated Release (Recommended)

AutomatosX uses GitHub Actions for automated releases.

### Prerequisites

1. NPM_TOKEN secret configured in GitHub repository settings
   - Go to https://github.com/defai-digital/automatosx/settings/secrets/actions
   - Create secret named `NPM_TOKEN` with your npm automation token

2. Generate npm automation token:
   ```bash
   npm login
   npm token create --type=automation
   ```

### Release Steps

1. **Update version** (local):
   ```bash
   npm run version:patch  # or version:minor, version:major
   ```

2. **Review changes**:
   ```bash
   git log --oneline -5
   git show HEAD
   ```

3. **Push to GitHub**:
   ```bash
   git push && git push --tags
   ```

4. **Monitor release**:
   - Go to https://github.com/defai-digital/automatosx/actions
   - Watch the "Release" workflow
   - Verify npm publication: https://www.npmjs.com/package/@defai.digital/automatosx
   - Check GitHub release: https://github.com/defai-digital/automatosx/releases

### What the Workflow Does

1. ✅ Checks out code
2. ✅ Installs dependencies (`npm ci`)
3. ✅ Runs TypeScript type check
4. ✅ Runs full test suite (1,845 tests)
5. ✅ Builds project
6. ✅ Tests package with `npm pack`
7. ✅ Publishes to npm with provenance
8. ✅ Creates GitHub Release with notes

### Rollback

If a release needs to be rolled back:

```bash
# Unpublish from npm (within 72 hours)
npm unpublish @defai.digital/automatosx@x.x.x

# Delete GitHub release
gh release delete vx.x.x --yes

# Delete tag
git tag -d vx.x.x
git push origin :refs/tags/vx.x.x
```

## Manual Release (Emergency Only)

If GitHub Actions is down, use manual release:

```bash
# 1. Quality checks
npm run typecheck
npm run test:all
npm run build

# 2. Test package
npm pack
tar -tzf *.tgz

# 3. Publish
npm publish --provenance

# 4. Create GitHub Release
gh release create vx.x.x --title "vx.x.x - Title" --notes-file CHANGELOG.md
```

## Pre-release (Beta/RC)

For pre-release versions:

```bash
# Create beta version
npm version prerelease --preid=beta
# Creates: 5.4.0-beta.0

# Tag and push
git push && git push --tags

# Workflow will publish with "beta" tag instead of "latest"
```

Users can install beta with:
```bash
npm install @defai.digital/automatosx@beta
```
