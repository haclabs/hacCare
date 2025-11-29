# Sidebar Navigation Component

## Overview

The Sidebar component provides the main navigation interface for the hacCare application. It features role-based access control, smooth animations, and a professional user experience with visual feedback for navigation state.

## Location

`/src/components/Layout/Sidebar.tsx`

## Key Features

### Animated Active Indicator

A vertical blue gradient bar smoothly transitions between active navigation items:
- Automatically adjusts position and height based on the currently active route
- Uses CSS transitions for smooth 300ms animations
- Provides clear visual feedback for current location in the application
- Position calculated using DOM measurements and React state

### Role-Based Access Control

Navigation items are conditionally rendered based on user role:

**Workspace Section** (All Users)
- Patients - Main patient management view
- Schedule - Calendar and scheduling
- Enter Sim - Portal for entering simulations
- Simulations - Simulation management interface

**Admin Section** (Super Admin Only)
- Patient Templates - Manage patient template library
- User & Roles - User management and role assignment
- Tenant Mgmt - Multi-tenant management
- Backups - Backup and restore operations
- Documentation - System documentation
- Changelog - Version history and updates

**Settings** (All Users)
- Application settings and preferences

### Visual Enhancements

**Interactive Icons**
- Icons scale 110% on hover for micro-interaction feedback
- Active items have increased stroke weight (2.5 vs 2) for emphasis
- Dot indicators (1.5px circles) fade in/out on hover and active states

**User Profile Display**
- Avatar with user initials generated from first and last name
- Gradient background (blue to purple) for visual appeal
- Online status indicator (green dot with white border)
- Displays user full name and role
- Hover state with chevron animation (translates down 0.5px)

**Section Organization**
- Clear section labels with uppercase, tracked text
- Visual dividers between sections (gray border)
- Super Admin badge with lock icon for restricted sections
- Proper spacing and visual hierarchy

### Dark Mode Support

All colors and borders have dark mode variants:
- Background: white / gray-800
- Text: gray-700 / gray-200
- Borders: gray-200 / gray-700
- Hover states: gray-50 / gray-700/70
- Active states: blue-50 / blue-900/40

## Technical Implementation

### State Management

```typescript
const [activeItemTop, setActiveItemTop] = useState(0);
const [activeItemHeight, setActiveItemHeight] = useState(0);
const navContainerRef = useRef<HTMLDivElement>(null);
```

The component tracks the position and height of the active navigation item to render the animated indicator bar.

### Active Item Detection

Uses data attributes and DOM queries to find the active element:

```typescript
useEffect(() => {
  const activeElement = document.querySelector('[data-nav-active="true"]');
  if (activeElement && navContainerRef.current) {
    const rect = activeElement.getBoundingClientRect();
    const containerRect = navContainerRef.current.getBoundingClientRect();
    setActiveItemTop(rect.top - containerRect.top);
    setActiveItemHeight(rect.height);
  }
}, [activeTab, location.pathname]);
```

Recalculates position whenever:
- Active tab changes
- Location pathname changes (for route-based navigation)

### Navigation Handling

```typescript
const handleNavClick = (item: any) => {
  if ('route' in item && item.route) {
    navigate(item.route);
  } else {
    onTabChange(item.id);
    navigate('/app', { replace: false });
  }
};
```

Items can either:
- Navigate directly to a specific route (e.g., simulation-portal)
- Update parent state and navigate to base route (traditional tabs)

### User Information Display

Pulls data from authentication context:

```typescript
const getUserInitials = () => {
  if (!profile) return 'U';
  const first = profile.first_name?.[0] || '';
  const last = profile.last_name?.[0] || '';
  return (first + last).toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U';
};
```

Gracefully handles missing profile data with fallbacks.

## Props Interface

```typescript
interface SidebarProps {
  activeTab: string;           // Current active tab identifier
  onTabChange: (tab: string) => void;  // Callback when tab changes
}
```

## Dependencies

- `react-router-dom` - Navigation and location tracking
- `lucide-react` - Icon library
- `useAuth` hook - Authentication and role information
- `SimulationIndicator` - Shows active simulation status

## Styling Details

### Spacing
- Container padding: 4 (16px)
- Item padding: px-4 py-2.5 (horizontal 16px, vertical 10px)
- Gap between icon and text: 3 (12px)
- Section margin top: 6 (24px)

### Colors
- Active background: blue-50 / blue-900/40
- Active text: blue-700 / blue-300
- Hover background: gray-50 / gray-700/70
- Active indicator: gradient blue-500 to blue-600

### Animations
- Transition duration: 200ms for most interactions
- Active indicator: 300ms ease-out for smooth sliding
- Easing: ease-out for natural deceleration

## Performance Considerations

- Position calculations only run when active tab or route changes
- Transitions handled entirely by CSS for GPU acceleration
- Conditional rendering prevents unnecessary DOM elements for non-admin users
- useRef prevents recalculation of container bounds on every render

## Future Enhancement Opportunities

1. Command Palette (Cmd+K)
   - Quick fuzzy search navigation
   - Keyboard shortcuts display
   - Recent pages history

2. Collapsible Sidebar
   - Icon-only mode for increased workspace
   - Toggle button for expansion
   - Responsive behavior for smaller screens

3. Notification Badges
   - Red circular badges with ping animation
   - Count display for items requiring attention
   - Real-time updates via websockets

4. Active Simulation Status
   - Live indicator when simulation is running
   - Quick access to active simulation details
   - Time elapsed display

5. Keyboard Navigation
   - Arrow key navigation between items
   - Enter to select
   - Number shortcuts (1-9) for quick access

6. Customizable Layout
   - User preference for item order
   - Pinned favorites
   - Recently accessed items

## Related Files

- `/src/components/Layout/Sidebar.tsx` - Main component implementation
- `/src/hooks/useAuth.ts` - Authentication hook
- `/src/contexts/auth/AuthContext.tsx` - Auth context provider
- `/src/features/simulation/components/SimulationIndicator.tsx` - Simulation status display
- `/src/components/MainApp.tsx` - Parent component that uses Sidebar

## Testing Considerations

When testing the Sidebar component:

1. Verify role-based rendering
   - Test with nurse, admin, and super_admin roles
   - Confirm admin section only visible to super_admins

2. Test navigation
   - Click each item and verify correct navigation
   - Verify active state updates correctly
   - Test both route-based and state-based navigation

3. Test animations
   - Verify active indicator position calculation
   - Test smooth transitions between items
   - Verify hover states work correctly

4. Test user profile display
   - Verify initials generation with various name formats
   - Test with missing profile data
   - Verify role display formatting

5. Test dark mode
   - Verify all colors have dark variants
   - Test transitions between light and dark modes
