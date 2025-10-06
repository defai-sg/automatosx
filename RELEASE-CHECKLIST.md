# Release Checklist

This checklist ensures quality and completeness for every AutomatosX release.

## Pre-Release Checks

### Code Quality
- [ ] All tests passing (`npm run test:all`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Test coverage meets targets (>70% overall, >85% core modules)
- [ ] No known critical bugs in issue tracker
- [ ] All planned features for this release are complete

### Documentation
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md reflects current version features
- [ ] API documentation is up-to-date
- [ ] Migration guides updated (if breaking changes)
- [ ] Examples verified and working

### Dependencies
- [ ] All dependencies are up-to-date and secure (`npm audit`)
- [ ] No unused dependencies (`npm ls`)
- [ ] License compliance verified
- [ ] Lock file is current (`package-lock.json`)

### Build & Distribution
- [ ] Clean build succeeds (`npm run build`)
- [ ] Bundle size is acceptable (<250KB target)
- [ ] CLI works after build (`./dist/index.js --version`)
- [ ] All commands tested in built version
- [ ] Node version requirements documented

## Release Process

### 1. Version Bump
- [ ] Update version in `package.json` (follow semver)
- [ ] Update version references in documentation
- [ ] Create version commit: `git commit -m "chore: bump version to X.Y.Z"`
- [ ] Create git tag: `git tag -a vX.Y.Z -m "Release X.Y.Z"`

### 2. Pre-publish Validation
- [ ] Test installation in clean environment
- [ ] Verify all files are included in package (`npm pack` and inspect)
- [ ] Test CLI installation: `npm install -g ./automatosx-X.Y.Z.tgz`
- [ ] Run smoke tests with installed version

### 3. Publish
- [ ] Push commits: `git push origin main`
- [ ] Push tags: `git push origin vX.Y.Z`
- [ ] Publish to npm: `npm publish` (or `npm publish --tag beta`)
- [ ] Verify package on npm: https://www.npmjs.com/package/automatosx

### 4. Post-Release
- [ ] Create GitHub release with changelog
- [ ] Update documentation website (if applicable)
- [ ] Announce release (Twitter, Discord, etc.)
- [ ] Monitor issue tracker for post-release bugs
- [ ] Update project status documents

## Beta Release Checklist

For beta releases (`X.Y.Z-beta.N`):

- [ ] All pre-release checks completed
- [ ] Beta testing group identified
- [ ] Known issues documented
- [ ] Publish with beta tag: `npm publish --tag beta`
- [ ] Beta testers notified with testing instructions
- [ ] Feedback collection mechanism in place

## Hotfix Release Checklist

For emergency hotfix releases:

- [ ] Critical bug identified and documented
- [ ] Fix implemented and tested
- [ ] Hotfix branch created from release tag
- [ ] All tests passing
- [ ] Patch version bumped
- [ ] Emergency review completed
- [ ] Fast-track publish

## Version Types

- **Major (X.0.0)**: Breaking changes, major features
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, backwards compatible
- **Pre-release**: `X.Y.Z-alpha.N`, `X.Y.Z-beta.N`, `X.Y.Z-rc.N`

## Rollback Plan

If critical issues are discovered after release:

1. [ ] Deprecate problematic version: `npm deprecate automatosx@X.Y.Z "Critical bug, use X.Y.Z-1"`
2. [ ] Document issue in GitHub release
3. [ ] Prepare hotfix or rollback
4. [ ] Notify users through all channels

## Notes

- Beta releases should run for 2-4 weeks minimum
- Collect feedback from at least 5 different users/teams
- Monitor npm download stats and issue reports
- Keep release process documentation updated
