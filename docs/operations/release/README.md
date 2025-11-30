# Local Development Setup Guide

This directory contains scripts and documentation for setting up a local development environment that mirrors production.

## 📁 Directory Structure

```
docs/operations/release/
├── README.md                    # This file
├── setup-local.sh              # Complete local setup script
├── dump-production.sh          # Dump production database
├── DEPLOYMENT_CHECKLIST.md     # Pre-deployment verification
└── LOCAL_TESTING_GUIDE.md      # How to test locally
```

---

## 🚀 Quick Start

### First Time Setup

1. **Install Prerequisites:**
   - Docker Desktop
   - Node.js 18+
   - Supabase CLI (auto-installed by script)

2. **Dump Production Database:**
   ```bash
   cd docs/operations/release
   ./dump-production.sh
   ```
   This creates `supabase/full-database-dump.sql` with your production schema

3. **Run Setup Script:**
   ```bash
   ./setup-local.sh
   ```
   This will:
   - Start local Supabase (Docker)
   - Load production schema
   - Install npm dependencies
   - Configure environment variables

4. **Start Development:**
   ```bash
   npm run dev
   ```

---

## 📋 Scripts Reference

### `setup-local.sh`
**Purpose:** Complete local environment setup  
**What it does:**
- ✅ Checks prerequisites (Docker, Node, Supabase CLI)
- ✅ Starts local Supabase instance
- ✅ Loads database schema from dump
- ✅ Installs npm dependencies
- ✅ Creates `.env.local` with local credentials

**Usage:**
```bash
./setup-local.sh
```

**After running:**
- Local Supabase: `http://localhost:54323` (Studio)
- Local API: `http://localhost:54321`
- Local DB: `postgresql://postgres:postgres@localhost:54322/postgres`
- Local App: `http://localhost:5173`

---

### `dump-production.sh`
**Purpose:** Export production database schema  
**What it dumps:**
- All tables and data
- Functions (RPC)
- Triggers
- RLS policies
- Extensions
- Auth schema

**Usage:**
```bash
./dump-production.sh
```

**Output:** `supabase/full-database-dump.sql`

**When to run:**
- Before setting up new development machine
- After major production schema changes
- Before testing migrations locally
- Weekly (to keep local in sync)

---

## 🔄 Daily Workflow

### Starting Work
```bash
# Start Supabase if not running
supabase start

# Start dev server
npm run dev
```

### Syncing with Production
```bash
# 1. Dump latest production schema
./dump-production.sh

# 2. Reset local database with new dump
supabase db reset
psql postgresql://postgres:postgres@localhost:54322/postgres < ../../supabase/full-database-dump.sql
```

### Stopping Work
```bash
# Stop dev server (Ctrl+C)

# Optionally stop Supabase (frees up Docker resources)
supabase stop
```

---

## 🧪 Testing Changes

### Testing Database Changes

1. Make changes in Supabase Studio: `http://localhost:54323`
2. Generate migration:
   ```bash
   supabase db diff -f migration_name
   ```
3. Test migration:
   ```bash
   supabase db reset
   ```
4. If good, apply to production via Supabase Dashboard

### Testing Code Changes

1. Make changes in `src/`
2. Hot reload will update automatically
3. Test thoroughly in local environment
4. Create PR when ready

---

## 🎯 Common Tasks

### View Local Database
```bash
# Open Studio
open http://localhost:54323

# Or use psql
psql postgresql://postgres:postgres@localhost:54322/postgres
```

### Reset Database
```bash
# Reset to migrations
supabase db reset

# Or load from dump
psql postgresql://postgres:postgres@localhost:54322/postgres < ../../supabase/full-database-dump.sql
```

### Check Supabase Status
```bash
supabase status
```

### View Logs
```bash
supabase logs
```

### Stop Everything
```bash
supabase stop
```

---

## 🐛 Troubleshooting

### "Port already in use"
```bash
# Stop Supabase
supabase stop

# Kill Docker containers
docker ps | grep supabase | awk '{print $1}' | xargs docker stop
```

### "Database connection failed"
```bash
# Restart Supabase
supabase stop
supabase start
```

### "Migrations out of sync"
```bash
# Reset and apply all migrations
supabase db reset
```

### "Function not found" errors
```bash
# Reload database dump (includes all functions)
psql postgresql://postgres:postgres@localhost:54322/postgres < ../../supabase/full-database-dump.sql
```

---

## 📚 Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/local-development)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

---

## ⚠️ Important Notes

### Don't Commit These Files
- `.env.local` (local credentials)
- `supabase/.branches` (local branches)
- `supabase/.temp` (temp files)

### DO Commit These Files
- `supabase/migrations/` (schema changes)
- `supabase/config.toml` (Supabase config)
- Database dumps in `supabase/` for team sharing

### Credentials
Local Supabase uses standard test credentials:
- **API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
- **Password:** `postgres`
- **Port:** `54322`

These are safe to use locally and are NOT your production credentials.

---

## 🤝 Team Setup

### New Team Member

1. Clone repository
2. Run `./setup-local.sh`
3. Done! They have a full local environment

### Sharing Database State

```bash
# Create shareable dump
./dump-production.sh

# Commit the dump (if small enough)
git add supabase/full-database-dump.sql
git commit -m "chore: Update database dump"

# Or share via cloud storage if large
```

---

## 🎬 Next Steps

After setup is complete:
1. ✅ Read [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)
2. ✅ Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. ✅ Check [Active Functions](../ACTIVE_SUPABASE_FUNCTIONS.md)
4. ✅ Review [Cleanup Plan](../CLEANUP_PLAN.md)
