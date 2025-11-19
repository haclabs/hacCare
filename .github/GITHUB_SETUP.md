# GitHub Configuration Guide

This document outlines the recommended GitHub repository settings for hacCare.

## ✅ Already Configured

- [x] Dependabot for automated dependency updates
- [x] CodeQL security scanning
- [x] CI/CD workflow for testing and linting
- [x] PR templates
- [x] Issue templates
- [x] Netlify auto-deployment on main branch

## 🔧 Manual Configuration Needed

### Branch Rulesets (GitHub's Modern Branch Protection)

To set up branch protection for `main`, go to:
**Settings → Rules → Rulesets → New branch ruleset**

#### Recommended Configuration:

**Step 1: Basic Setup**
- **Ruleset Name:** `Main`
- **Enforcement status:** Active
- **Bypass list:** Leave empty (or add yourself only if working solo)

**Step 2: Target Branches**
- Click **Add target**
- Select **Include by pattern**
- Pattern: `main`

**Step 3: Branch Rules (Check these boxes)**

✅ **Essential (Highly Recommended):**
- [x] **Require a pull request before merging**
  - Number of approvals required: `0` (for solo dev) or `1` (for teams)
  - [x] **Require conversation resolution before merging** (recommended)
- [x] **Require status checks to pass**
  - Click **"+ Add checks"** and add:
    - `test` (displays as "Test & Lint")
    - `security` (displays as "Security Audit")
  - [x] **Require branches to be up to date before merging** (recommended)
- [x] **Block force pushes** - Prevents history rewriting
- [x] **Restrict deletions** - Prevents accidental branch deletion

✅ **Recommended (Good to Have):**
- [x] **Require code scanning results** - Ensures CodeQL passes
- [x] **Require linear history** - Keeps git history clean

⚠️ **Optional (Team/Enterprise):**
- [ ] **Require signed commits** - Cryptographic commit verification
- [ ] **Require deployments to succeed** - Wait for Netlify deploy
- [ ] **Automatically request Copilot code review** - AI code review

#### For Solo Development:
If you're working alone, you can:
- Set approvals to `0` (still requires PR, but no manual approval)
- Still keep status checks required (catches bugs before merge)
- Skip signed commits (adds friction without team benefits)

---

## Repository Settings

### General

**Pull Requests:**
- [x] Allow squash merging (clean history)
- [x] Allow merge commits (preserves branch history)
- [ ] Allow rebase merging (linear history, optional)
- [x] Automatically delete head branches (cleanup merged PRs)

### Security

**Vulnerability alerts:**
- [x] Dependabot alerts (already enabled)
- [x] Dependabot security updates
- [x] CodeQL analysis (already enabled)

**Secret scanning:**
- [x] Enable for public repositories
- [x] Push protection (prevents accidental secret commits)

---

## Secrets Configuration

### Required Secrets for CI/CD

Go to **Settings → Secrets and variables → Actions**

Add the following secrets (if not already set):

1. `VITE_SUPABASE_URL` - Your Supabase project URL
2. `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

**Note:** These are only needed if you want the CI build to succeed. Since Netlify handles your deployments with its own env vars, CI builds can fail without affecting production.

---

## Netlify Configuration

Your Netlify deployment is already configured to:
- Auto-deploy on `main` branch commits
- Build preview deployments for PRs

**Recommended Netlify settings:**
- Deploy previews: Enable for all PRs
- Branch deploys: `main` only
- Build settings: Already configured via `netlify.toml`

---

## How to Set Up Branch Rulesets (Step-by-Step)

1. Go to https://github.com/haclabs/hacCare/settings/rules
2. Click **New branch ruleset**
3. Configure the following:

**Basic Setup:**
- Ruleset Name: `Main`
- Enforcement status: `Active`
- Bypass list: Leave empty

**Target Branches:**
- Click **Add target** → **Include by pattern**
- Enter pattern: `main`

**Branch Rules - Check these boxes:**
- ✅ **Require a pull request before merging**
  - Required approvals: `0` (for solo dev) or `1` (for teams)
  - ✅ **Require conversation resolution before merging**
- ✅ **Require status checks to pass**
  - Click **"+ Add checks"** and add:
    - `test`
    - `security`
  - ✅ **Require branches to be up to date before merging**
- ✅ **Block force pushes**
- ✅ **Restrict deletions**
- ✅ **Require code scanning results** (optional but recommended)

**⚠️ Important:** Don't forget to add target branches or the ruleset won't apply!

4. Scroll to bottom and click **Create**

**That's it!** Your main branch is now protected with Rulesets.

---

## Workflow Overview

### Development Workflow (with branch protection)

```bash
# 1. Create a feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to GitHub
git push origin feature/my-feature

# 4. Open a PR on GitHub
# - CI will run automatically (test, lint, build)
# - Fix any issues if CI fails
# - Merge when CI passes (and approved if required)

# 5. Branch auto-deletes after merge
# - Netlify auto-deploys to production
```

### Hotfix Workflow (emergency)

If you need to bypass rulesets for an emergency:

**Option 1: Add yourself to bypass list**
1. Settings → Rules → Rulesets → Edit `Main` ruleset
2. Under "Bypass list" → Add bypass → Add yourself
3. Push hotfix directly to main
4. Remove yourself from bypass list immediately after

**Option 2: Temporarily disable (not recommended)**
1. Settings → Rules → Rulesets → Edit `Main` ruleset
2. Change enforcement status to `Disabled`
3. Push hotfix
4. Re-enable immediately

---

## Monitoring and Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check Security alerts (Settings → Security)
- Review failed workflow runs

### Monthly Tasks
- Audit access permissions
- Review branch rulesets configuration
- Update this documentation if settings change

---

## Troubleshooting

### CI Fails on PRs
- Check the Actions tab for error details
- Common issues:
  - TypeScript errors
  - Lint errors
  - Build failures (missing env vars)
  - Test failures

### Dependabot PRs Fail to Merge
- Check if CI is passing
- Review for breaking changes
- Test locally before merging

### Can't Push to Main
- This is expected! Create a PR instead
- If urgent, see "Hotfix Workflow" above

---

## Questions or Issues?

- Open an issue using the templates in `.github/ISSUE_TEMPLATE/`
- For security issues, use the security vulnerability template
- For general questions, start a GitHub Discussion

---

**Last Updated:** November 19, 2025
