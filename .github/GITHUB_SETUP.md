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

### Branch Protection Rules

To set up branch protection for `main`, go to:
**Settings → Branches → Add branch protection rule**

#### Recommended Settings:

**Branch name pattern:** `main`

✅ **Required:**
- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Status checks to require:
    - `Test & Lint`
    - `Security Audit`
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings

⚠️ **Optional (Recommended for teams):**
- [ ] Require signed commits
- [ ] Require linear history
- [ ] Include administrators (enforce rules for admins too)

#### For Solo Development:
If you're working alone, you can:
- Skip "Require approvals" 
- Still keep status checks required (catches bugs before merge)

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

## How to Set Up Branch Protection (Step-by-Step)

1. Go to https://github.com/haclabs/hacCare/settings/branches
2. Click **Add branch protection rule**
3. Enter `main` as the branch name pattern
4. Check **Require a pull request before merging**
   - Set required approvals to `1` (or `0` if working solo)
5. Check **Require status checks to pass before merging**
   - Search and add: `Test & Lint`
   - Search and add: `Security Audit`
6. Check **Require conversation resolution before merging**
7. Click **Create** at the bottom

**That's it!** Your main branch is now protected.

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

If you need to bypass branch protection for an emergency:
1. Temporarily disable protection (Settings → Branches → Edit rule → Save)
2. Push hotfix directly to main
3. Re-enable protection immediately after

---

## Monitoring and Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check Security alerts (Settings → Security)
- Review failed workflow runs

### Monthly Tasks
- Audit access permissions
- Review branch protection rules
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
