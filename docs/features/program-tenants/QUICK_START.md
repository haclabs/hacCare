# Program Tenants - Quick Start Guide

## What This Does

Creates dedicated program workspaces for instructors. When they login, they land in their program tenant (NESA, PN, SIM Hub, BNAD) instead of the main LethPoly tenant.

## 5-Minute Deployment

### Step 1: Run SQL Migration (2 min)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy/paste `database/migrations/20260127000000_implement_program_tenants.sql`
4. Click "Run"
5. Verify you see: ✅ Created program tenant: NESA Program (and others)

### Step 2: Deploy Code (1 min)
```bash
git add .
git commit -m "feat: implement program tenant workspaces"
git push
```
Wait for auto-deploy.

### Step 3: Test (2 min)
1. Login as instructor with 1 program → Should auto-land in program workspace
2. Login as instructor with 2+ programs → Should see modal to select program
3. Verify no patient data visible in program workspace

Done! ✅

## What Users Will See

### Single Program Instructor
- Logs in → Automatically lands in NESA workspace (for example)
- Sees purple program banner at top
- Sees "NESA Program" badge in sidebar
- No patient data visible (program-focused workspace)

### Multi-Program Instructor  
- Logs in → Sees modal: "Select Your Program"
- Chooses NESA → Lands in NESA workspace
- Can switch programs via banner dropdown
- Selection saved for next login

## Architecture (Super Simple)

```
Before:
Instructor → Login → LethPoly Tenant → See all patients

After:
Instructor → Login → NESA Program Tenant → No patients, program-specific content
```

Each program (NESA, PN, SIM Hub, BNAD) is now its own tenant workspace.

## Files You Need to Know

1. **Migration**: `database/migrations/20260127000000_implement_program_tenants.sql`
2. **Guides**: `docs/features/program-tenants/IMPLEMENTATION_GUIDE.md`
3. **Checklist**: `docs/features/program-tenants/DEPLOYMENT_CHECKLIST.md`

## Common Questions

**Q: What if an instructor is in the wrong program?**  
A: Admin can reassign them via User Management → Edit User → Change Programs

**Q: Can instructors see patient data?**  
A: Not in program workspace. They'd need to switch to organization tenant (future feature).

**Q: What happens to existing simulations?**  
A: Nothing. Simulations still work the same way.

**Q: Can this be rolled back?**  
A: Yes. See "Rollback Plan" in IMPLEMENTATION_GUIDE.md.

## Need Help?

1. Check `IMPLEMENTATION_GUIDE.md` for full details
2. Run verification queries from the guide
3. Check browser console for errors
4. Check Supabase logs

## Phase 2 (Coming Soon)

- [ ] Announcements in program workspace
- [ ] Templates managed per program
- [ ] Program analytics dashboard
- [ ] "Switch to Organization" button

---

**Quick Links**:
- Full Guide: `docs/features/program-tenants/IMPLEMENTATION_GUIDE.md`
- Deployment Checklist: `docs/features/program-tenants/DEPLOYMENT_CHECKLIST.md`
- Summary: `docs/features/program-tenants/SUMMARY.md`
