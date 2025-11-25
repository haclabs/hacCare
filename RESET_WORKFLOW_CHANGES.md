# Reset Workflow Changes

## Current Behavior
1. Complete Simulation → Creates debrief → Auto-resets → Auto-starts simulation
2. Reset button → Resets data → Auto-starts simulation
3. Play button → Starts simulation AND adds instructor as participant

## Desired Behavior
1. Complete Simulation → Creates debrief → Shows "Needs Reset" indicator
2. Reset button → Resets data → Sets status to 'pending' (does NOT auto-start)
3. Play button → Starts simulation WITHOUT adding instructor as participant

## Required Changes

### 1. Database Function: `reset_simulation_for_next_session`
**Location**: Needs to be created or modified in Supabase
**Change**: Set `status = 'pending'` instead of `'running'`

```sql
-- After resetting data, set status to pending
UPDATE simulation_active
SET 
  status = 'pending',
  starts_at = NULL,
  updated_at = NOW()
WHERE id = p_simulation_id;
```

### 2. Service Layer: `simulationService.ts`
**No changes needed** - reset function already calls the DB function

### 3. Component: `ActiveSimulations.tsx`
**Changes needed**:
- Add visual indicators for different states
- Modify handleResume to not auto-add instructor
- Show appropriate buttons based on status

#### Status Indicators
```tsx
{sim.status === 'completed' && (
  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
    ⚠️ Needs Reset
  </span>
)}
{sim.status === 'pending' && (
  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
    ✓ Ready to Start
  </span>
)}
{sim.status === 'running' && (
  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
    ▶ Running
  </span>
)}
```

#### Button Logic
- **Reset button**: Only show if status is 'completed', 'running', or 'paused'
- **Play button**: Only show if status is 'pending' or 'paused'
- **Complete button**: Only show if status is 'running' or 'paused'

### 4. Update `handleResume` function
Remove the logic that auto-adds the current user as instructor when starting a simulation.

## Implementation Priority
1. **HIGH**: Create database function with status='pending' after reset
2. **HIGH**: Add status indicators to cards
3. **MEDIUM**: Update button visibility logic
4. **MEDIUM**: Remove auto-add instructor from Play button
5. **LOW**: Update confirmation messages to reflect new workflow

## Testing Checklist
- [ ] Complete simulation → Status shows "Needs Reset"
- [ ] Click Reset → Status changes to "Ready to Start" (NOT running)
- [ ] Click Play → Simulation starts WITHOUT adding instructor
- [ ] Instructor can manually join if desired
- [ ] Can launch multiple simulations without being added to each one
