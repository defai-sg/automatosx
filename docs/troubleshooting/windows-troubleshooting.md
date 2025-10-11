# Windows Troubleshooting Guide for AutomatosX

This guide provides comprehensive troubleshooting solutions for AutomatosX on Windows 10 and Windows 11.

**Last Updated**: 2025-10-11
**Applies to**: AutomatosX v5.1.0+
**Platform**: Windows 10/11

---

## 📋 Quick Checklist

Before diving into detailed troubleshooting, verify these essentials:

- ✅ **Node.js**: v20.0.0 or higher installed
- ✅ **AutomatosX**: Latest version (v5.1.0+)
- ✅ **Initialization**: Run `ax init` in your project directory
- ✅ **Provider CLIs**: At least one provider CLI installed (Claude, Gemini, or OpenAI)

---

## 🚨 Most Common Issue: Project Not Initialized

**Symptoms**:
- `ax status` shows "0 agents, 0 abilities, 0 providers"
- Commands fail with "agent not found"
- No `.automatosx` directory exists (or exists but empty)

**Solution 1: First-time initialization**:
```bash
# Initialize AutomatosX in your project
npx @defai.digital/automatosx init

# Verify initialization
npx @defai.digital/automatosx status
```

**Solution 2: If you see "AutomatosX is already initialized" but still have 0 agents**:

This means `.automatosx` folder exists, but init won't overwrite it. Use `--force`:

```bash
# Force reinitialize (overwrites existing setup)
npx @defai.digital/automatosx init --force

# Or with global install
ax init --force

# Verify initialization
ax status
```

**When to use `--force`**:
- Seeing "0 agents" despite having `.automatosx` folder
- Previous initialization failed or was interrupted
- Upgrading from older version (v4.x → v5.x)
- Files are corrupted or incomplete
- Want to reset to default configuration

⚠️ **Warning**: `--force` will overwrite custom changes to agents/abilities/teams.

---

## 🔄 Update to Latest Version

Always ensure you're running the latest version for the best Windows compatibility:

**Update Command**:
```bash
# Method 1: Update global installation
npm update -g @defai.digital/automatosx

# Method 2: Reinstall
npm uninstall -g @defai.digital/automatosx
npm install -g @defai.digital/automatosx@latest

# Verify version
npx @defai.digital/automatosx --version
# Expected: 5.1.0
```

## 🔍 Diagnostic Commands

Run these commands to gather information about your AutomatosX installation:

```bash
# Test 1: Check system status
npx @defai.digital/automatosx status

# Test 2: Try simple agent execution
npx @defai.digital/automatosx run backend "Hello, test message"

# Test 3: List available agents
npx @defai.digital/automatosx list agents

# Test 4: Check configuration
npx @defai.digital/automatosx config show
```

---

## 🪟 Common Windows-Specific Issues

### Issue 1: Path Separator Problems

**Symptom**: "Path not found" or "Invalid path" errors

**Cause**: Windows uses backslash `\` instead of forward slash `/`

**Solution**: AutomatosX v5.1.0 handles this automatically via `path.sep`, but verify:

```javascript
// PathResolver handles this (src/core/path-resolver.ts:150)
const pathWithSep = normalized + sep;  // Uses platform-specific separator
```

**Workaround if needed**:
```bash
# Use forward slashes even on Windows (Node.js normalizes them)
npx @defai.digital/automatosx run backend "Create file at ./test/file.txt"
```

### Issue 2: PowerShell Execution Policy

**Symptom**: "Cannot be loaded because running scripts is disabled"

**Cause**: PowerShell's execution policy blocks scripts

**Check Current Policy**:
```powershell
Get-ExecutionPolicy
```

**Solution**:
```powershell
# Option 1: Allow for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Option 2: Bypass for single command
powershell -ExecutionPolicy Bypass -Command "npx @defai.digital/automatosx --version"
```

### Issue 3: npm Global Installation Path

**Symptom**: `ax` or `automatosx` command not found

**Cause**: npm global bin not in PATH

**Check npm Global Path**:
```bash
npm config get prefix
# Expected: C:\Users\<username>\AppData\Roaming\npm
```

**Check if in PATH**:
```bash
echo %PATH%
# Should contain: C:\Users\<username>\AppData\Roaming\npm
```

**Solution**:
```bash
# Add to PATH (System Properties > Environment Variables)
# Or use npx instead:
npx @defai.digital/automatosx --version
```

### Issue 4: Long Path Issues

**Symptom**: "Path too long" or "ENAMETOOLONG" errors

**Cause**: Windows has 260-character path limit (legacy)

**Solution**:
```bash
# Enable long paths (requires admin)
# Run in PowerShell as Administrator:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or use shorter project paths
# BAD:  C:\Users\username\Documents\Projects\VeryLongFolderName\SubFolder\automatosx
# GOOD: C:\Users\username\test\automatosx
```

### Issue 5: File Permission Issues

**Symptom**: "EACCES" or "Permission denied" errors

**Cause**: Antivirus or Windows Defender blocking file operations

**Solution**:
```bash
# 1. Check if antivirus is blocking
# Temporarily disable Windows Defender (for testing only)

# 2. Run as Administrator (not recommended for regular use)
# Right-click Command Prompt > "Run as administrator"

# 3. Check file permissions
# Right-click .automatosx folder > Properties > Security
```

### Issue 6: Provider CLI Not Found

**Symptom**: "claude: command not found" or "codex not found"

**Cause**: Provider CLIs not installed or not in PATH

**Check Installed Providers**:
```bash
# Check Claude CLI
claude --version

# Check OpenAI CLI
codex --version

# Check Gemini CLI
gemini --version
```

**Solution**:
```bash
# Install missing providers
npm install -g @anthropic-ai/claude-cli
npm install -g @openai/codex-cli
npm install -g @google-ai/gemini-cli

# Or use mock providers for testing
set AUTOMATOSX_MOCK_PROVIDERS=true
npx @defai.digital/automatosx run backend "test"
```

---

## 🔧 Full Diagnostic Report

To generate a comprehensive diagnostic report for troubleshooting:

```bash
@echo off
echo === AutomatosX Windows Diagnostic Report ===
echo.

echo [1] System Information
node --version
npm --version
echo.

echo [2] AutomatosX Version
npx @defai.digital/automatosx --version
echo.

echo [3] Directory Structure
dir /B
echo.

echo [4] AutomatosX Directory
dir /B .automatosx
echo.

echo [5] Configuration Check
type automatosx.config.json
echo.

echo [6] npm Global Prefix
npm config get prefix
echo.

echo [7] Provider CLIs Check
where claude
where codex
where gemini
echo.

echo [8] Environment Variables
echo PATH=%PATH%
echo AUTOMATOSX_MOCK_PROVIDERS=%AUTOMATOSX_MOCK_PROVIDERS%
echo.

echo === End of Report ===
```

Save this as `diagnostics.bat` and run: `diagnostics.bat > report.txt`

---

## 🩹 Quick Fixes to Try

### Fix 1: Clean Reinstall

```bash
# 1. Uninstall
npm uninstall -g @defai.digital/automatosx

# 2. Clear npm cache
npm cache clean --force

# 3. Reinstall latest
npm install -g @defai.digital/automatosx@5.1.0

# 4. Verify
npx @defai.digital/automatosx --version
```

### Fix 2: Reinitialize Project

```bash
# 1. Backup existing config
copy automatosx.config.json automatosx.config.json.backup

# 2. Remove .automatosx
rmdir /S /Q .automatosx

# 3. Reinitialize
npx @defai.digital/automatosx init

# 4. Restore custom config if needed
# (merge automatosx.config.json.backup)
```

### Fix 3: Use Mock Providers

```bash
# Test without real provider CLIs
set AUTOMATOSX_MOCK_PROVIDERS=true
npx @defai.digital/automatosx run backend "Test message"

# If this works, the issue is with provider CLIs
```

### Fix 4: Check Windows Defender

```powershell
# Check if .automatosx directory is excluded
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath

# Add exclusion (as Administrator)
Add-MpPreference -ExclusionPath "C:\path\to\your\project\.automatosx"
```

---

## 📝 Troubleshooting Checklist

When encountering issues, gather this information for effective troubleshooting:

1. **Error Details**
   - Full error message text
   - Stack trace (if available)
   - Command that triggered the error

2. **Command Context**
   - Exact command executed
   - Expected vs actual behavior
   - Any warning messages

3. **System Information**
   - Run diagnostics.bat (above)
   - Review full diagnostic output
   - Check system event logs

4. **Provider Configuration**
   - Which provider you're using
   - Provider CLI installation status
   - Test: `claude --version`, `codex --version`, `gemini --version`

5. **Environment Changes**
   - Recent AutomatosX updates
   - New software installations
   - Windows system updates
   - Changes to PATH or environment variables

---

## 🐛 Known Windows Issues (v5.1.0)

### 1. JSON Module Warning (HARMLESS)

**Message**:
```
ExperimentalWarning: Importing JSON modules is an experimental feature
```

**Status**: ✅ SAFE TO IGNORE
**Reason**: Node.js 20.x experimental feature, not a bug
**Fix**: This will be resolved when Node.js stabilizes JSON imports

### 2. Path Traversal on Windows

**Status**: ✅ FIXED in v5.1.0
**Details**: PathResolver now correctly handles Windows paths with backslashes

### 3. MCP Server on Windows

**Status**: ✅ SUPPORTED in v5.1.0
**Details**: MCP server works on Windows, but ensure `.automatosx/memory/exports` exists

---

## 🧪 Testing Steps

### Step 1: Verify Installation

```bash
# Should output version 5.1.0
npx @defai.digital/automatosx --version
```

### Step 2: Check System Status

```bash
# Should show providers, memory, sessions
npx @defai.digital/automatosx status
```

### Step 3: List Agents

```bash
# Should list 12 agents (Bob, Frank, etc.)
npx @defai.digital/automatosx list agents
```

### Step 4: Test with Mock Provider

```bash
# Should complete successfully
set AUTOMATOSX_MOCK_PROVIDERS=true
npx @defai.digital/automatosx run backend "Hello"
```

### Step 5: Test Real Provider

```bash
# Should work if Claude CLI is installed
npx @defai.digital/automatosx run backend "Hello" --provider claude
```

---

## 📞 Getting Help

If the issue persists after trying all fixes, create a GitHub issue:

**Create Issue**: <https://github.com/defai-digital/automatosx/issues>

### Required Information

Please include the following in your issue:

**Issue Template**:
```markdown
**Environment**
- OS: Windows 10/11
- Node.js: v[your version] (run: node --version)
- AutomatosX: v[your version] (run: ax --version)
- npm: v[your version] (run: npm --version)

**Command Executed**
[exact command that failed]

**Expected Behavior**
[what you expected to happen]

**Actual Behavior**
[what actually happened]

**Error Output**
[full error message and stack trace]

**Screenshots**
[attach screenshots showing the error - drag and drop images into issue]

**Diagnostic Report**
[output from diagnostics.bat - paste inside code block]

**Steps Already Tried**
- [ ] Updated to v5.1.0
- [ ] Ran diagnostic commands
- [ ] Tried mock providers
- [ ] Ran ax init
- [ ] Other: [describe what you tried]
```

### Tips for Creating Issues

1. **Attach Screenshots**: Drag and drop error screenshots directly into the GitHub issue
2. **Use Code Blocks**: Wrap command output in triple backticks (\`\`\`)
3. **Be Specific**: Include exact commands and full error messages
4. **Describe Environment**: Include Windows version, Node.js version, npm version
5. **List What You've Tried**: Help us avoid suggesting solutions you've already attempted

---

## ✅ Resolution Checklist

- [ ] Update to AutomatosX v5.1.0
- [ ] Verify Node.js v20+ is installed
- [ ] Run diagnostic commands
- [ ] Check PowerShell execution policy
- [ ] Verify npm global path in PATH
- [ ] Test with mock providers
- [ ] Check provider CLIs installed
- [ ] Review Windows Defender exclusions
- [ ] Enable long paths if needed
- [ ] Get specific error message
- [ ] Create GitHub issue if unresolved

---

## 📚 Additional Resources

- **Windows Installation Guide**: docs/guide/installation.md
- **Troubleshooting Guide**: TROUBLESHOOTING.md
- **FAQ**: FAQ.md
- **GitHub Issues**: https://github.com/defai-digital/automatosx/issues
- **npm Package**: https://www.npmjs.com/package/@defai.digital/automatosx

---

**Last Updated**: 2025-10-11
**Applies to**: AutomatosX v5.1.0
**Platform**: Windows 10/11
