# Simulation Portal - Quick Start Guide

## 🎯 What Is This?

A dedicated portal at `simulation.haccare.app` that automatically routes users to their assigned simulations. Students get seamless access, instructors get management tools.

## ✨ Key Features

### For Students
- ✅ **Single Simulation** → Auto-redirects instantly
- ✅ **Multiple Simulations** → Choose from list
- ✅ **No Simulations** → Helpful guidance
- ✅ **Mobile-Friendly** → Works on any device

### For Instructors
- ✅ **Quick Launch** → Start new simulations fast
- ✅ **Dashboard** → See all active simulations
- ✅ **Manage** → Add/remove participants
- ✅ **Analytics** → Track simulation progress

## 🚀 Quick Setup (5 Minutes)

### 1. Apply Database Policies
```sql
-- Run in Supabase SQL Editor:
-- File: docs/development/simulation-v2/setup_simulation_portal_rls.sql
```

### 2. Configure DNS
```
Type: CNAME
Name: simulation
Value: haccare.app
TTL: 3600
```

### 3. Update Netlify
```toml
# Add to netlify.toml:
[[redirects]]
  from = "https://simulation.haccare.app/*"
  to = "/index.html"
  status = 200
```

### 4. Test
```bash
# Wait for DNS propagation, then:
curl -I https://simulation.haccare.app
# Should return: HTTP/2 200
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Complete overview of what was built |
| [SIMULATION_PORTAL.md](./SIMULATION_PORTAL.md) | Detailed architecture and API docs |
| [USER_FLOW_DIAGRAMS.md](./USER_FLOW_DIAGRAMS.md) | Visual flow diagrams |
| [NETLIFY_SUBDOMAIN_SETUP.md](./NETLIFY_SUBDOMAIN_SETUP.md) | Step-by-step deployment guide |
| [setup_simulation_portal_rls.sql](./setup_simulation_portal_rls.sql) | Database security policies |

## 🎮 How It Works

### Student Experience
```
1. Go to simulation.haccare.app
2. Login
3. → Automatically routed to simulation (if only one)
   → Choose from list (if multiple)
   → See friendly message (if none)
```

### Instructor Experience
```
1. Go to simulation.haccare.app
2. Login
3. See dashboard with:
   - Active simulations list
   - "Launch New Simulation" button
   - "Manage All Simulations" button
4. Click any option to proceed
```

## 🔐 Security

- ✅ **Row-Level Security (RLS)** - Users see only their simulations
- ✅ **Role-Based Access** - Students, Instructors, Admins
- ✅ **Tenant Isolation** - Each simulation is isolated
- ✅ **HTTPS Only** - Secure connections required

## 🧪 Testing

### Test Single Assignment
```sql
-- Assign student to one simulation
INSERT INTO simulation_participants (simulation_id, user_id, role, granted_by)
VALUES ('sim-id', 'student-id', 'student', 'admin-id');

-- Login as student → Should auto-redirect
```

### Test Multiple Assignments
```sql
-- Assign student to two simulations
INSERT INTO simulation_participants (...) VALUES (...); -- Sim 1
INSERT INTO simulation_participants (...) VALUES (...); -- Sim 2

-- Login as student → Should show selection screen
```

### Test RLS Security
```sql
-- Create two students, assign to different simulations
-- Login as Student A → Should only see Sim A
-- Login as Student B → Should only see Sim B
```

## 🐛 Troubleshooting

### "No simulations found"
**Fix:** Check `simulation_participants` table - ensure user is assigned to active simulation

### Auto-redirect not working
**Fix:** Check browser console, verify `simulation_id` is valid

### Subdomain not loading
**Fix:** 
1. Check DNS with `nslookup simulation.haccare.app`
2. Wait for DNS propagation (24-48 hours)
3. Verify Netlify domain alias

### RLS blocking access
**Fix:**
1. Check Supabase logs for RLS violations
2. Verify user's role in `user_profiles`
3. Re-run RLS setup SQL if needed

## 📊 Components Created

```
src/components/Simulation/
├── SimulationPortal.tsx        # Main portal with auto-routing
├── SimulationRouter.tsx        # Subdomain detection & routing
└── SimulationLogin.tsx         # Already existed

src/services/
└── simulationService.ts        # Added getUserSimulationAssignments()

src/App.tsx                     # Added /simulation-portal route
```

## 🎯 User Flows

### Single Assignment (Auto-Redirect)
```
Login → Loading Screen (1.5s) → Simulation Workspace
```

### Multiple Assignments (Selection)
```
Login → Selection Grid → Click Card → Simulation Workspace
```

### No Assignments (Message)
```
Login → Helpful Message with Instructions
```

### Instructor (Dashboard)
```
Login → Dashboard → [Launch/Manage/Enter] → Action
```

## 📈 Success Metrics

- ⏱️ Portal loads in < 2 seconds
- ⏱️ Auto-redirect in 1.5 seconds
- ⏱️ Query completes in < 500ms
- ✅ RLS prevents unauthorized access
- ✅ Students see only assigned simulations
- ✅ Instructors can manage all simulations

## 🚧 Status

**Current Status:** ✅ Ready for Testing

**Completed:**
- [x] SimulationPortal component with auto-routing
- [x] SimulationRouter for subdomain detection
- [x] getUserSimulationAssignments() service function
- [x] RLS policies for security
- [x] Comprehensive documentation
- [x] User flow diagrams
- [x] Deployment guides

**Pending:**
- [ ] Run RLS SQL script in Supabase
- [ ] Configure DNS CNAME record
- [ ] Add Netlify domain alias
- [ ] Test with real users
- [ ] Monitor in production

## 🎓 Educational Value

This portal provides:
- **Seamless Access** - Students focus on learning, not navigation
- **Clear Context** - Users know which simulation they're in
- **Role Clarity** - Different experiences for students vs instructors
- **Professional UX** - Matches industry-standard healthcare software

## 🔮 Future Enhancements

### Phase 2
- [ ] Email invitations with magic links
- [ ] QR code quick-join
- [ ] Mobile app support
- [ ] Push notifications

### Phase 3
- [ ] Live presence indicators
- [ ] Session recording for review
- [ ] Performance analytics
- [ ] Gamification (badges, points)

## 💡 Pro Tips

1. **DNS Propagation** - Takes 24-48 hours, be patient
2. **Development Testing** - Use `/?simulation=true` or `/simulation-portal` path
3. **Security First** - Always test RLS policies thoroughly
4. **User Feedback** - Monitor how users interact with auto-routing
5. **Performance** - Keep assignment queries fast with proper indexes

## 🆘 Support

**Have Questions?**
1. Check the documentation files listed above
2. Review user flow diagrams for clarity
3. Check browser console for errors
4. Review Supabase logs for RLS issues
5. Test with different user roles

**Found a Bug?**
1. Check browser console
2. Check Supabase logs
3. Verify RLS policies are active
4. Test with different scenarios
5. Document the issue with screenshots

## 📞 Contact

For implementation questions or issues:
- Review the [SIMULATION_PORTAL.md](./SIMULATION_PORTAL.md) for detailed docs
- Check [USER_FLOW_DIAGRAMS.md](./USER_FLOW_DIAGRAMS.md) for visual guides
- See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for overview

---

**Version:** 2.0  
**Last Updated:** October 6, 2025  
**Status:** ✅ Ready for Testing  
**Author:** Development Team

### Quick Links
- [Full Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Architecture Details](./SIMULATION_PORTAL.md)
- [Visual Flow Diagrams](./USER_FLOW_DIAGRAMS.md)
- [Deployment Guide](./NETLIFY_SUBDOMAIN_SETUP.md)
- [Database Setup](./setup_simulation_portal_rls.sql)
