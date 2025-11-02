# hacMap: Device & Wound Mapping System

## Overview

hacMap is a comprehensive visual mapping system for documenting device placements and wound assessments on an interactive body diagram. It provides an intuitive interface for clinical staff to accurately record and track the location of medical devices, tubes, drains, wounds, and incisions.

## Features

### 1. Interactive Body Diagram
- SVG-based human anatomy silhouette
- Clickable body regions (head, neck, chest, abdomen, pelvis, arms, legs, etc.)
- Precise coordinate-based placement (x, y percentages)
- Visual markers differentiated by type (green for devices, pink for wounds)

### 2. Device Documentation
Comprehensive tracking for:
- **Closed Suction Drains** (default)
- Chest Tubes
- Foley Catheters
- IV Lines (Peripheral, PICC, Port)
- Custom devices

**Device Fields:**
- Placement date & time (24-hour format)
- Placement location (EMS/Nursing Home/Clinic/Other)
- Inserted by (provider name)
- Tube number (1-10)
- Orientation (superior, inferior, medial, lateral, anterior, posterior)
- Tube size (French)
- Number of sutures placed
- Reservoir type (Jackson-Pratt, Hemovac, Penrose, Other)
- Reservoir size (mL)
- Securement method (multiple selection)
- Patient tolerance
- Notes

### 3. Wound Assessment
Final specification for wound documentation:

**Wound Types:**
- Incision
- Laceration
- Surgical Site
- Pressure Injury
- Skin Tear
- Other

**Assessment Fields:**
- Wound type (required)
- Peri-wound temperature (°C)
- Dimensions: length, width, depth (cm)
- Wound description (multiline text)
- Drainage description (Serous, Sanguineous, Serosanguineous, Purulent, None)
- Drainage consistency (Thin, Thick, Watery, Viscous)
- Wound odor (None, Foul, Sweet, Musty)
- Drainage amount (None, Scant, Minimal, Moderate, Large, Copious, Unable to Assess)
- Wound edges
- Closure type
- Suture/staple line (Approximated/Non-Approximated)
- Sutures intact (Yes/No/Unknown)
- Notes

### 4. Mode Toggle
- **Green Button**: Add Device mode
- **Pink Button**: Add Wound/Incision mode
- Clear visual indication of active mode

### 5. Filtering
- Show/hide devices
- Show/hide wounds
- Count badges for each type

## Architecture

### File Structure
```
src/features/hacmap/
├── AvatarBoard.tsx              # Main orchestrator
├── api.ts                       # Supabase CRUD operations
├── index.ts                     # Module exports
├── components/
│   ├── AvatarCanvas.tsx         # Interactive SVG body diagram
│   ├── ModeToggle.tsx           # Device/Wound mode selector
│   └── RightPanel.tsx           # Slide-over panel container
└── forms/
    ├── DeviceForm.tsx           # Device placement form
    └── WoundForm.tsx            # Wound assessment form

src/types/hacmap.ts              # TypeScript definitions
```

### Database Schema

#### Tables

**avatar_locations**
- Stores x/y coordinates and region information
- Referenced by both devices and wounds

**devices**
- Links to avatar_locations via `location_id`
- All device-specific fields

**wounds**
- Links to avatar_locations via `location_id`
- All wound-specific fields (final spec)

#### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce tenant isolation via JWT `tenant_id` claim
- Users can only access data from their own tenant

### Data Flow

1. **Create Flow:**
   - User clicks body region on canvas
   - System creates `avatar_location` record with coordinates
   - Panel opens with appropriate form (device or wound)
   - User fills form and saves
   - System creates device/wound record linked to location
   - Markers refresh on canvas

2. **Edit Flow:**
   - User clicks existing marker
   - System fetches full record
   - Panel opens with form pre-populated
   - User edits and saves
   - System updates record
   - Markers refresh on canvas

3. **Delete Flow:**
   - User clicks delete button in form
   - Confirmation dialog appears
   - System deletes record (cascade deletes location)
   - Markers refresh on canvas

## Integration

### Patient Overview Page

The hacMap feature is integrated into the patient dashboard via a purple "hacMap" button that replaces the old "Edit Template" button.

**Location:** `src/components/ModularPatientDashboard.tsx`

**Button:**
```tsx
<button
  onClick={() => setShowHacMap(true)}
  className="flex items-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-4 py-2.5 rounded-xl transition-all duration-200 border border-purple-200 hover:border-purple-300 hover:scale-105 font-medium"
  title="Device & Wound Mapping"
>
  <MapPin className="h-4 w-4 mr-2" />
  hacMap
</button>
```

**Modal:**
Opens in a full-screen modal (90vh) with:
- Patient name and MRN in header
- Close button (X)
- Full AvatarBoard component in body

## Usage

### For Developers

```typescript
import { AvatarBoard } from '../features/hacmap';

// In your component
<AvatarBoard patientId={patient.id} />
```

### For Clinical Users

1. **Open hacMap:**
   - Navigate to patient overview
   - Click purple "hacMap" button

2. **Add a Device:**
   - Click green "Add Device" toggle
   - Click on body where device is placed
   - Fill out device form
   - Click "Save Device"

3. **Add a Wound:**
   - Click pink "Add Wound/Incision" toggle
   - Click on body where wound is located
   - Fill out wound assessment form
   - Click "Save Wound"

4. **Edit Existing Marker:**
   - Click on any green or pink marker
   - Edit form fields
   - Click "Update"

5. **Delete Marker:**
   - Click on marker to open edit form
   - Click red "Delete" button
   - Confirm deletion

## Standards & Units

### Metric System
All measurements use metric units:
- **Distances**: centimeters (cm)
- **Volumes**: milliliters (mL)
- **Temperature**: Celsius (°C)

### Time Format
- **24-hour format**: HH:MM (e.g., 14:30, not 2:30 PM)
- Uses native `<input type="time">` element

### User Notifications
Blue info banner displays at top of forms:
> "Note: All measurements use metric units"
> "Times are in 24-hour format (HH:MM)"

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **ARIA Labels**: Proper ARIA labels on canvas and forms
- **Focus Management**: Focus trap in right panel
- **ESC to Close**: ESC key closes panel (with dirty check)
- **Screen Reader**: Semantic HTML and descriptive labels

## Security

### Authentication
- Requires authenticated user via `useAuth()` hook
- `user.id` used for `created_by` fields

### Authorization
- Tenant-based isolation via RLS policies
- All queries filtered by `tenant_id` from JWT
- No cross-tenant data access possible

### Validation
- Required fields enforced in forms
- Numeric fields validated (min, max, step)
- Type checking via TypeScript

## Performance

- Efficient marker loading via single joined query
- Optimistic UI updates for better UX
- Debounced form changes to detect dirty state
- Lazy loading of edit data (fetch on marker click)

## Future Enhancements

Potential additions:
- [ ] Photo attachment to markers
- [ ] Measurement history/timeline
- [ ] Wound healing progress tracking
- [ ] Device output/drainage tracking
- [ ] Print view of body map
- [ ] Export to PDF
- [ ] Multi-view (front/back/lateral)
- [ ] Zoom and pan on body diagram
- [ ] Touch screen optimization
- [ ] Mobile responsive layouts

## Troubleshooting

### Markers not appearing
- Check browser console for API errors
- Verify patient has valid `id`
- Ensure RLS policies are correct
- Check tenant_id in JWT claims

### Form not saving
- Check network tab for failed requests
- Verify all required fields are filled
- Check user authentication status
- Review Supabase error messages

### Canvas clicks not working
- Ensure SVG viewBox is correct
- Check region boundary definitions
- Verify click handler is attached
- Test in different browsers

## Support

For issues or questions:
1. Check browser console for errors
2. Review Supabase logs
3. Verify database schema matches spec
4. Contact development team

## License

Internal use only - hacCare EHR System
