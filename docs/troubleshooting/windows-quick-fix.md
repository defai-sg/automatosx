# Windows Quick Fix Guide

This guide provides quick solutions for common AutomatosX issues on Windows 10/11.

**Last Updated**: 2025-10-11
**Applies To**: AutomatosX v5.1.0+
**Platform**: Windows 10/11

---

## 🚨 Common Symptoms

If you're experiencing any of these issues:
- "Agent not found" errors
- `ax status` shows "0 agents, 0 abilities, 0 providers"
- No `.automatosx` directory in your project
- All providers showing as unavailable

Try the quick fixes below.

---

## ✅ Quick Fix #1: Initialize Project (Most Common)

### Automated Fix (Batch Script)

```batch
@echo off
echo === AutomatosX Quick Fix for Windows ===
echo.

echo Step 1: Initializing project...
npx @defai.digital/automatosx init
echo.

echo Step 2: Enabling mock providers...
set AUTOMATOSX_MOCK_PROVIDERS=true
echo.

echo Step 3: Testing with mock provider...
npx @defai.digital/automatosx run assistant "Hello, this is a test message"
echo.

echo Step 4: Checking status...
npx @defai.digital/automatosx status
echo.

echo === Fix Complete ===
echo.
echo If this worked, AutomatosX is now functional!
echo To use real AI providers, you need to install provider CLIs.
echo See: https://github.com/defai-digital/automatosx#installation
pause
```

**Save as**: `quick-fix.bat`

**Run**: Double-click `quick-fix.bat`

---

## ✅ Manual Steps (For PowerShell Users)

```powershell
# Step 1: Initialize project
npx @defai.digital/automatosx init

# Step 2: Enable mock providers
$env:AUTOMATOSX_MOCK_PROVIDERS="true"

# Step 3: Test
npx @defai.digital/automatosx run assistant "Hello test"

# Step 4: Check status
npx @defai.digital/automatosx status
```

---

## 📊 Expected Results

### Before Fix

If your installation is not initialized, `ax status` shows:

```text
Resources:
❌ agents (0 agents)
❌ abilities (0 abilities)
❌ memory (0 files, 0 B)

Providers:
❌ claude-code: unavailable
❌ gemini-cli: unavailable
❌ openai: unavailable

⚠️ System has issues
```

### After Fix

```text
Resources:
✅ agents (12 agents)
✅ abilities (15 abilities)
✅ memory (1 file, initialized)

Providers:
✅ mock: available (when AUTOMATOSX_MOCK_PROVIDERS=true)

✅ System ready
```

---

## 🔧 If Still Not Working

### Check 1: Did init succeed?

```bash
# Should list agents directory with 12 files
dir .automatosx\agents
```

**Expected output**:

```text
backend.yaml
frontend.yaml
devops.yaml
security.yaml
quality.yaml
data.yaml
design.yaml
writer.yaml
product.yaml
ceo.yaml
cto.yaml
researcher.yaml
```

### Check 2: Is config valid?

```bash
# Should show JSON config
type automatosx.config.json
```

### Check 3: Test mock provider explicitly

```bash
set AUTOMATOSX_MOCK_PROVIDERS=true
npx @defai.digital/automatosx list agents
```

**Expected**: List of 12 agents with friendly names

---

## 💡 Understanding the Issue

**Root Cause**: Project not initialized before use.

**Why this happens**:

1. AutomatosX requires initialization in each project directory
2. Command: `npx @defai.digital/automatosx init`
3. Init creates `.automatosx/` directory with agents, abilities, and configuration
4. Without initialization, no agents are available

**Prevention**: Always run `ax init` or `npx @defai.digital/automatosx init` first in new projects!

---

## 📱 Getting Help

If the issue persists after trying these fixes, create a GitHub issue with:

**Required Information**:
1. Output of `quick-fix.bat` (or diagnostic commands)
2. Output of `dir .automatosx /s`
3. Screenshots of error messages
4. Full error logs (if available)
5. Your environment:
   - Windows version (10/11)
   - Node.js version (`node --version`)
   - AutomatosX version (`ax --version`)

**Create Issue**: <https://github.com/defai-digital/automatosx/issues>

When creating an issue:
- Use a descriptive title
- Attach screenshots showing the error
- Include all diagnostic output
- Describe what you've already tried

---

**Last Updated**: 2025-10-11

**Applies To**: AutomatosX v5.1.0+

**Platform**: Windows 10/11
