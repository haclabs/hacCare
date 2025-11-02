# hacMap Enhancement Ideas

## ✅ Completed Layout Updates
- ✅ 3-column horizontal layout implemented
- ✅ Avatar centered with wider body and shorter limbs
- ✅ Right sidebar with Quick Add buttons, Summary stats, and Recent activity
- ✅ Instructions repositioned below avatar

---

## 🎨 Additional Content Suggestions

### 1. **Body Region Quick Stats** (High Value)
Add a collapsible card below Recent Activity showing device/wound counts by body region:

```tsx
{/* Body Region Stats */}
<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
    By Region
  </div>
  <div className="space-y-1 text-xs">
    {Object.entries(regionCounts).map(([region, count]) => (
      <div key={region} className="flex justify-between items-center py-1">
        <span className="text-gray-600 capitalize">{region.replace(/-/g, ' ')}</span>
        <span className="font-semibold text-gray-900">{count}</span>
      </div>
    ))}
  </div>
</div>
```

**Implementation**: Add a computed value in AvatarBoard.tsx:
```tsx
const regionCounts = markers.reduce((acc, marker) => {
  acc[marker.regionKey] = (acc[marker.regionKey] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

---

### 2. **Keyboard Shortcuts Panel** (Medium Value)
Add a small shortcuts reference card:

```tsx
{/* Keyboard Shortcuts */}
<div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
  <div className="text-xs font-semibold text-indigo-700 mb-2 flex items-center">
    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"/>
    </svg>
    Quick Keys
  </div>
  <div className="space-y-1 text-xs text-indigo-600">
    <div className="flex justify-between">
      <kbd className="px-2 py-0.5 bg-white rounded border border-indigo-300 font-mono text-indigo-800">D</kbd>
      <span>Device mode</span>
    </div>
    <div className="flex justify-between">
      <kbd className="px-2 py-0.5 bg-white rounded border border-indigo-300 font-mono text-indigo-800">W</kbd>
      <span>Wound mode</span>
    </div>
    <div className="flex justify-between">
      <kbd className="px-2 py-0.5 bg-white rounded border border-indigo-300 font-mono text-indigo-800">Esc</kbd>
      <span>Clear selection</span>
    </div>
  </div>
</div>
```

**Implementation**: Add keyboard event listeners in AvatarBoard:
```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'd' || e.key === 'D') setMode('device');
    if (e.key === 'w' || e.key === 'W') setMode('wound');
    if (e.key === 'Escape') setSelectedMarker(null);
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

### 3. **Care Alerts Panel** (High Value - Clinical)
Display clinically relevant alerts based on markers:

```tsx
{/* Care Alerts */}
{careAlerts.length > 0 && (
  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
    <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
      </svg>
      Care Alerts
    </div>
    <div className="space-y-1">
      {careAlerts.map((alert, i) => (
        <div key={i} className="text-xs text-amber-700 bg-white p-2 rounded border border-amber-200">
          {alert}
        </div>
      ))}
    </div>
  </div>
)}
```

**Implementation**: Add computed alerts in AvatarBoard.tsx:
```tsx
const careAlerts = useMemo(() => {
  const alerts: string[] = [];
  
  // Multiple devices in same region
  const regionDevices = markers.filter(m => m.kind === 'device')
    .reduce((acc, m) => {
      acc[m.regionKey] = (acc[m.regionKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  Object.entries(regionDevices).forEach(([region, count]) => {
    if (count > 2) {
      alerts.push(`⚠️ ${count} devices in ${region.replace(/-/g, ' ')}`);
    }
  });
  
  // Wounds older than 7 days
  const oldWounds = markers.filter(m => {
    if (m.kind !== 'wound' || !m.wound?.date_identified) return false;
    const days = Math.floor((Date.now() - new Date(m.wound.date_identified).getTime()) / (1000 * 60 * 60 * 24));
    return days > 7;
  });
  
  if (oldWounds.length > 0) {
    alerts.push(`📅 ${oldWounds.length} wound(s) older than 7 days`);
  }
  
  return alerts;
}, [markers]);
```

---

### 4. **Quick Export/Print Button** (Medium Value)
Add a button to generate a printable body map report:

```tsx
{/* Quick Actions */}
<div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
  <button 
    onClick={handleExport}
    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors flex items-center justify-center space-x-2"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
    </svg>
    <span>Print Body Map</span>
  </button>
</div>
```

---

### 5. **Timeline View Toggle** (Low Priority - Future)
Add a toggle to switch between body map and timeline views showing change history.

---

## 🎯 Recommended Implementation Order

1. **Body Region Quick Stats** - Shows where devices/wounds are concentrated
2. **Care Alerts Panel** - Clinically valuable, helps identify risks
3. **Keyboard Shortcuts** - Improves workflow efficiency
4. **Quick Export/Print** - Useful for documentation and handoffs

---

## 📐 Current Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  hacMap: Device & Wound Mapping - [Patient Name] (MRN: ######)     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │                │  │                 │  │  Quick Add         │  │
│  │                │  │                 │  │  - Add Device      │  │
│  │    Avatar      │  │                 │  │  - Add Wound       │  │
│  │    Canvas      │  │   Records List  │  ├────────────────────┤  │
│  │                │  │   & Details     │  │  Summary           │  │
│  │                │  │   Form Panel    │  │  - Devices: 3      │  │
│  │  [instructions]│  │                 │  │  - Wounds: 2       │  │
│  │                │  │                 │  ├────────────────────┤  │
│  │                │  │                 │  │  Recent Activity   │  │
│  └────────────────┘  └─────────────────┘  └────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation Tips

### Passing Data to Right Sidebar
The right sidebar is now inside AvatarBoard, so it has direct access to all state:
- `markers` array
- `mode` state
- All computed values

### Responsive Considerations
For smaller screens, consider stacking:
```tsx
<div className="flex flex-col lg:flex-row items-start gap-6">
  {/* Avatar - full width on mobile, left on desktop */}
  <div className="w-full lg:w-auto">
    <AvatarCanvas ... />
  </div>
  
  {/* Right sidebar - full width on mobile, fixed on desktop */}
  <div className="w-full lg:w-64">
    {/* Controls and stats */}
  </div>
</div>
```

---

## 🎨 Visual Polish Ideas

1. **Hover State on Avatar**: Highlight the region name when hovering over body areas
2. **Marker Pulse Animation**: Animate newly added markers with a brief pulse effect
3. **Drag to Reposition**: Allow dragging markers to adjust placement (advanced)
4. **Photo Upload**: Add ability to upload photos of wounds/devices (future)
5. **3D View Toggle**: Switch between front/back/side views (future)

---

## ✨ Clinical Features to Consider

1. **Braden Scale Integration**: Show pressure injury risk near wound markers
2. **Care Protocol Suggestions**: Recommend protocols based on device/wound types
3. **Measurement Tools**: Add ruler overlay for wound sizing
4. **Stage/Grade Indicators**: Color-code wounds by severity
5. **Rotation Schedule**: Track and suggest device rotation times

---

Would you like me to implement any of these enhancements?
