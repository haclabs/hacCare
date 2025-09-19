# Enhanced Simulation Management Integration Guide

## Overview

The enhanced simulation management system now includes:

1. **Template Management UI** - Create and manage scenario templates and patient templates
2. **Enhanced Simulation Creation** - Select existing users and flag simulation-only access
3. **Updated Service Layer** - Support for template CRUD operations and user management

## Components Added

### 1. ScenarioTemplateManager
- **Location**: `/src/components/simulations/ScenarioTemplateManager.tsx`
- **Purpose**: Complete template management interface
- **Features**:
  - Create/edit scenario templates
  - Add patient templates with demographics
  - Future: Vitals, medications, and notes templates
  - Tabbed interface for organized management

### 2. EnhancedSimulationCreationModal
- **Location**: `/src/components/simulations/EnhancedSimulationCreationModal.tsx`
- **Purpose**: Advanced simulation creation with user selection
- **Features**:
  - Two-step wizard (simulation details → user assignment)
  - Search and select existing tenant users
  - Create new users for simulation
  - Flag users as simulation-only (restricted access)
  - Template selection from available scenarios

### 3. Updated SimulationSubTenantManager
- **Location**: `/src/components/Simulation/SimulationSubTenantManager.tsx`
- **Features**:
  - Navigation tabs: Active Simulations | Template Manager
  - Quick Create vs Enhanced Create options
  - Integrated template management view

## Service Methods Added

### Template Management
- `getScenarioTemplates(tenantId)` - Fetch scenario templates for tenant
- `getPatientTemplates(scenarioTemplateId)` - Fetch patient templates for scenario
- `createScenarioTemplate(tenantId, template)` - Create new scenario template
- `createPatientTemplate(scenarioTemplateId, template)` - Create new patient template

### User Management
- `getExistingTenantUsers(tenantId)` - Fetch existing users in tenant for selection

## Integration Steps

### 1. Import Components
```tsx
import SimulationSubTenantManager from './components/Simulation/SimulationSubTenantManager';
// OR use individual components:
import ScenarioTemplateManager from './components/simulations/ScenarioTemplateManager';
import EnhancedSimulationCreationModal from './components/simulations/EnhancedSimulationCreationModal';
```

### 2. Use in Your App
```tsx
// For complete simulation management (recommended):
<SimulationSubTenantManager currentTenantId={currentTenantId} />

// Or individual components:
<ScenarioTemplateManager currentTenantId={currentTenantId} />
<EnhancedSimulationCreationModal 
  currentTenantId={currentTenantId}
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onSuccess={(simulation) => {
    // Handle successful simulation creation
  }}
/>
```

## Database Requirements

The following tables should exist (created by previous migrations):
- `scenario_templates` - Scenario template definitions
- `patient_templates` - Patient template definitions linked to scenarios
- `active_simulations` - Active simulation instances
- `tenants` - Simulation sub-tenants
- `simulation_users` - Users assigned to simulations
- `user_tenant_associations` - User-tenant relationships

## Workflow

### Template Management
1. Navigate to "Template Manager" tab
2. Create scenario templates with learning objectives, difficulty, duration
3. Add patient templates to scenarios with demographics and medical info
4. Templates become available for simulation creation

### Enhanced Simulation Creation
1. Click "Create Simulation" for enhanced modal
2. **Step 1**: Enter simulation details and select template
3. **Step 2**: Add users by:
   - Searching and selecting existing tenant users
   - Creating new users
   - Flagging users as simulation-only for restricted access
4. Create simulation with all users assigned

### Simulation-Only Users
- Users flagged as "simulation-only" have restricted access
- They can only access simulations they're assigned to
- Managed through RLS policies in the database

## Security Features

- **RLS Policies**: Ensure users only access their assigned simulations
- **Admin Access**: Instructors/admins can manage all simulations in their tenant
- **Simulation Isolation**: Each simulation runs in its own sub-tenant
- **User Flagging**: Simulation-only users are restricted to simulation environments

## Future Enhancements

1. **Vitals Templates**: Add support for pre-configured vital signs
2. **Medication Templates**: Pre-defined medication schedules
3. **Notes Templates**: Template nursing notes and documentation
4. **Bulk User Import**: CSV import for large simulation classes
5. **Template Sharing**: Share templates between tenants
6. **Advanced Scenarios**: Multi-patient, time-based scenario progression