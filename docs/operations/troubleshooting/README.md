# 🔧 Troubleshooting Guide

Common issues and their solutions.

## 📄 Available Fixes

### Authentication Issues
- **[Auth Hang and Security Fix](AUTH_HANG_AND_SECURITY_FIX.md)** - Login freezing, session issues
- **[Login History Troubleshooting](LOGIN_HISTORY_TROUBLESHOOTING.md)** - Session tracking problems
- **[Profile Fetch Timeout Fix](PROFILE_FETCH_TIMEOUT_FIX.md)** - Slow profile loading

### Database Issues
- **[Database Health Check Removal](DATABASE_HEALTH_CHECK_REMOVAL.md)** - Health check problems
- **[IP Address Fix](IP_ADDRESS_FIX.md)** - IP tracking issues

### UI/Navigation Issues
- **[Navigation Fix](NAVIGATION_FIX.md)** - Routing and navigation problems

### Simulation Issues
- **[Urgent Simulation Fixes Applied](URGENT_SIMULATION_FIXES_APPLIED.md)** - Critical simulation bugs

## 🚨 Common Problems

### Authentication
**Problem:** Login hangs or freezes  
**Solution:** See [AUTH_HANG_AND_SECURITY_FIX.md](AUTH_HANG_AND_SECURITY_FIX.md)

**Problem:** Session not persisting  
**Solution:** Check browser localStorage and session cookies

**Problem:** "Permission denied" errors  
**Solution:** Verify RLS policies in [security audit](../../architecture/security/)

### Database
**Problem:** Slow queries  
**Solution:** Run `database/maintenance/performance_indexes.sql`

**Problem:** Missing functions  
**Solution:** Run all files in `database/functions/`

**Problem:** RLS policy violations  
**Solution:** Check `database/maintenance/security_audit.sql`

### Simulation
**Problem:** Simulation won't launch  
**Solution:** See [URGENT_SIMULATION_FIXES_APPLIED.md](URGENT_SIMULATION_FIXES_APPLIED.md)

**Problem:** Snapshot/restore fails  
**Solution:** Check `database/functions/simulation_snapshot_functions.sql`

## 🔗 Related Documentation

- [Security Architecture](../../architecture/security/) - RLS and permissions
- [Database Maintenance](../../../database/maintenance/) - DBA scripts
- [Feature Documentation](../../features/) - Feature-specific troubleshooting

---

**Need more help?** Check the specific fix documents above or review the database maintenance scripts.
