# Smoke Tests

Smoke tests verify that the packaged npm distribution works correctly in a clean environment.

## What They Test

1. **Package Installation**: Can install from tarball
2. **CLI Availability**: Both `automatosx` and `ax` commands work
3. **Basic Commands**: `--version`, `--help`, `list agents`, `status`
4. **File Structure**: Examples, dist, documentation present
5. **File Exclusions**: No source files, tests, or source maps
6. **Bin Configuration**: Shebang and permissions correct

## Running Locally

```bash
npm run test:smoke
```

This will:
1. Build the project
2. Create a tarball with `npm pack`
3. Install in a temporary directory
4. Run verification tests
5. Clean up

## CI/CD

Smoke tests run automatically:
- On every release (release workflow)
- As part of quality checks before publishing

## Troubleshooting

If smoke tests fail:

1. **"command not available"**: Check bin entries in package.json
2. **"missing files"**: Check files array in package.json
3. **"source maps found"**: Verify tsup.config.ts has `sourcemap: false`
4. **"shebang missing"**: Check tsup.config.ts banner configuration

## Test Steps

The smoke test performs the following verifications:

### Step 1: Build and Pack
- Runs `npm run build` to build the project
- Creates tarball with `npm pack`

### Step 2: Clean Installation
- Creates temporary directory
- Installs package from tarball
- Verifies installation succeeds

### Step 3: CLI Availability
- Tests `automatosx` command exists
- Tests `ax` alias exists
- Both should respond to `--version`

### Step 4: Basic Commands
- `--version`: Returns version string
- `--help`: Shows help information
- `list agents`: Lists available agents
- `status`: Shows system status

### Step 5: Examples Directory
- Verifies examples directory exists
- Checks for AGENTS_INFO.md
- Counts abilities (expects at least 20)

### Step 6: Package Integrity
- Verifies bin entries in package.json
- Checks Node.js engine requirements
- Validates package.json structure

### Step 7: File Exclusions
- No source maps (.map files)
- No tests directory
- No src directory
- Only distribution files included

### Step 8: Distribution Verification
- dist/index.js exists
- Type definitions (.d.ts) present
- Shebang present in executable
- File permissions correct

## Adding New Tests

To add new verification steps:

1. Edit `tests/smoke/smoke-test.sh`
2. Add new test step with descriptive echo messages
3. Use exit code 1 for failures
4. Test locally before committing

Example:
```bash
# Step 9: Test new feature
echo "🔍 Step 9: Testing new feature..."
if ! npx ax new-command > /dev/null 2>&1; then
    echo "   ✗ New command failed"
    exit 1
fi
echo "   ✓ New command works"
echo ""
```

## Performance

Smoke tests typically take 30-60 seconds:
- Build: 10-15s
- Pack: 2-3s
- Install: 10-15s
- Tests: 5-10s
- Cleanup: 1-2s
