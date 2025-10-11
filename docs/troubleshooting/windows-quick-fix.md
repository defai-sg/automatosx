# Windows Quick Fix Guide

**Issue**: "not working" - No agents, no providers, directories missing

---

## ✅ Quick Fix (Copy-Paste for User)

### Option 1: Quick Test with Mock Providers (Recommended)

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

### Before Fix (What User Sees Now)

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

### After Fix (Expected)

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

**Root Cause**: User ran `status` command before running `init` command.

**Why this happens**:

1. AutomatosX requires initialization: `npx @defai.digital/automatosx init`
2. Init creates `.automatosx/` directory with agents, abilities, etc.
3. Without init, there are no agents = "not working"

**Prevention**: Always run `init` first in new projects!

---

## 📱 Contact Support

If issue persists after running init:

1. **Provide**:
   - Output of `quick-fix.bat`
   - Output of `dir .automatosx /s`
   - Any error messages

2. **GitHub Issue**: <https://github.com/defai-digital/automatosx/issues>

3. **Discord**: [Link if available]

---

**Last Updated**: 2025-10-11

**Applies To**: AutomatosX v5.0.13+

**Platform**: Windows 10/11
