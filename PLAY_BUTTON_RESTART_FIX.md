# Play Button Auto-Restart for Completed Simulations

## Problem
When a simulation was marked as `status = 'completed'`, clicking the Play button would only change the status back to 'running' without resetting the timer. This meant:
- Timer still showed expired time
- `starts_at` and `ends_at` were from the original session
- No fresh countdown for the new session

## Solution
Modified the Play button behavior to automatically detect completed simulations and reset them with a fresh timer instead of just resuming.

## Changes Made

### File: `src/features/simulation/components/ActiveSimulations.tsx`

#### 1. Updated `handleResume` Function
```typescript
// Before:
const handleResume = async (id: string) => {
  await updateSimulationStatus(id, 'running');
}

// After:
const handleResume = async (id: string, isCompleted: boolean = false) => {
  if (isCompleted) {
    // If simulation is completed, reset it with a fresh timer
    const result = await resetSimulationForNextSession(id);
    alert('Simulation restarted with fresh timer! Ready for next session.');
  } else {
    // If just paused, simply resume
    await updateSimulationStatus(id, 'running');
  }
}
```

#### 2. Updated Play Button Click Handler
```typescript
// Before:
onClick={() => handleResume(sim.id)}
title="Resume simulation"

// After:
onClick={() => handleResume(sim.id, sim.status === 'completed')}
title={sim.status === 'completed' ? 'Restart simulation with fresh timer' : 'Resume simulation'}
```

## User Experience

### Before Fix
1. Complete simulation → Timer expires
2. Click Play button → Status changes to 'running'
3. **Problem**: Timer still shows expired, no fresh countdown

### After Fix
1. Complete simulation → Timer expires
2. Click Play button → Automatically calls `resetSimulationForNextSession()`
3. **Result**: Fresh timer starts, all data reset, ready for new session

## Button Behavior Summary

| Simulation Status | Play Button Action | Tooltip |
|------------------|-------------------|---------|
| `paused` | Resume (just change status) | "Resume simulation" |
| `completed` | Reset + Restart (fresh timer) | "Restart simulation with fresh timer" |
| `running` | N/A (Pause button shown instead) | "Pause simulation" |

## Benefits
✅ Intuitive user experience - Play means "start fresh" for completed sims  
✅ No need to manually click Reset button  
✅ Automatic timer reset with full duration  
✅ Consistent with user expectations  
✅ Preserves medication/patient IDs as designed  

## Backend Integration
This leverages the existing `resetSimulationForNextSession()` function which:
- Clears all event data
- Restores template snapshot
- Resets timer: `starts_at = NOW()`, `ends_at = NOW() + duration`
- Sets `status = 'running'`

## Testing
1. Launch simulation → Complete simulation
2. Verify status = 'completed'
3. Click Play button
4. Verify simulation resets and timer shows full duration
5. Confirm data restored from template

## Related Fixes
- Timer reset on simulation reset (commit e9a119a)
- Timer display fix (Otto v5.1.4-rc3)
- Reset function improvements (DEPLOY_TO_CLOUD_SUPABASE.sql)
