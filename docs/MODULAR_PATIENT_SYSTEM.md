# Modular Patient Management System

A comprehensive, JSON schema-driven patient management system built with React and TypeScript, designed to replace traditional hard-coded forms with flexible, dynamic, and clinically-aware interfaces.

## 🏗️ Architecture Overview

The modular system consists of three main components that work together to provide a complete patient management solution:

### Core Modules

1. **VitalsModule** - Dynamic vital signs management
2. **MARModule** - Medication Administration Record system  
3. **FormsModule** - Clinical assessment forms and documentation

### Supporting Infrastructure

- **JSON Schema Engine** - Dynamic form generation and validation
- **Healthcare Field Components** - Specialized input components for clinical data
- **Clinical Validation Rules** - Healthcare-specific validation and safety checks
- **Integration Layer** - Seamless integration with existing patient management system

## 📁 File Structure

```
src/
├── types/
│   └── schema.ts                    # JSON schema type definitions
├── lib/
│   └── schemaEngine.ts             # Core schema validation engine
├── components/
│   ├── forms/
│   │   ├── DynamicForm.tsx         # Main dynamic form component
│   │   └── fields/                 # Healthcare-specific field components
│   │       ├── VitalSignsField.tsx
│   │       ├── MedicationLookupField.tsx
│   │       ├── BodyDiagramField.tsx
│   │       └── PainScaleField.tsx
│   ├── ModularPatientDashboard.tsx # Unified dashboard interface
│   └── ModernPatientManagement.tsx # Integration component
├── modules/
│   ├── vitals/
│   │   └── VitalsModule.tsx        # Vitals management system
│   ├── mar/
│   │   └── MARModule.tsx           # Medication administration
│   └── forms/
│       └── FormsModule.tsx         # Clinical assessment forms
├── schemas/
│   ├── vitalsSchemas.ts           # Vital signs form schemas
│   ├── medicationSchemas.ts       # Medication form schemas
│   └── formsSchemas.ts           # Clinical assessment schemas
└── examples/
    └── ModularSystemIntegration.tsx # Integration examples
```

## 🚀 Key Features

### Dynamic Form Generation
- **JSON Schema-Driven**: Forms are generated from JSON schemas, allowing for easy customization and updates
- **Real-time Validation**: Client-side validation with immediate feedback
- **Conditional Logic**: Fields can show/hide based on other field values
- **Multi-step Forms**: Support for complex, multi-page forms

### Healthcare-Specific Components
- **Vital Signs**: Specialized inputs for blood pressure, temperature, heart rate, etc.
- **Medication Lookup**: Drug database integration with dosage validation
- **Body Diagrams**: Interactive anatomical diagrams for wound documentation
- **Pain Scales**: Visual analog scales for pain assessment

### Clinical Safety Features
- **Drug Interaction Checking**: Validates medications against known interactions
- **Allergy Verification**: Checks new medications against patient allergies
- **Clinical Alerts**: Real-time warnings for critical values or conditions
- **Audit Trail**: Complete logging of all clinical actions

### Integration Capabilities
- **Backward Compatible**: Works alongside existing patient management system
- **Gradual Migration**: Can be adopted module-by-module
- **API Integration**: Connects with existing healthcare APIs and databases

## 📊 Usage Examples

### Basic Module Usage

```tsx
import { VitalsModule } from './modules/vitals/VitalsModule';

function PatientVitals({ patient }) {
  const handleVitalsSave = (vitals) => {
    // Save vitals to database
    console.log('New vitals:', vitals);
  };

  return (
    <VitalsModule
      patient={patient}
      onVitalsSave={handleVitalsSave}
      currentUser={{
        id: 'nurse-1',
        name: 'Jane Nurse',
        role: 'nurse'
      }}
    />
  );
}
```

### Complete Dashboard Integration

```tsx
import { ModularPatientDashboard } from './components/ModularPatientDashboard';

function PatientPage({ patient }) {
  const handlePatientUpdate = (updatedData) => {
    // Update patient record
    setPatient(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <ModularPatientDashboard
      patient={patient}
      onPatientUpdate={handlePatientUpdate}
      currentUser={currentUser}
    />
  );
}
```

### Custom Schema Example

```tsx
const customVitalsSchema = {
  id: 'custom-vitals-v1',
  title: 'Custom Vital Signs',
  type: 'object',
  properties: {
    temperature: {
      type: 'vital-signs',
      title: 'Temperature',
      required: true,
      vitalType: 'temperature',
      unit: 'fahrenheit',
      normalRange: { min: 97.0, max: 99.5 }
    },
    // ... more fields
  }
};

// Register custom schema
schemaEngine.registerSchema(customVitalsSchema);
```

## 📋 Schema System

The modular system uses JSON schemas to define form structure and validation rules:

### Schema Types

1. **Field Schemas**: Define individual form fields with validation
2. **Form Schemas**: Complete form definitions with layouts and logic
3. **Validation Schemas**: Clinical validation rules and safety checks

### Healthcare Field Types

- `vital-signs`: Vital signs with normal ranges and alerts
- `medication-lookup`: Drug database integration
- `body-diagram`: Interactive anatomical diagrams
- `pain-scale`: Visual analog scales (0-10)
- `clinical-text`: Rich text with clinical validation
- `date-clinical`: Date inputs with clinical context

### Validation Features

- **Range Validation**: Numeric ranges with clinical alerts
- **Pattern Matching**: Regex validation for clinical data formats
- **Conditional Validation**: Rules that depend on other field values
- **Clinical Alerts**: Automatic warnings for critical values

## 🔧 Integration Guide

### Adding to Existing PatientDetail Component

1. **Add New Tab**:
```tsx
// Add to tabs array in PatientDetail.tsx
{ id: 'modern', label: 'Modern System', icon: Sparkles }
```

2. **Add Tab Content**:
```tsx
case 'modern':
  return (
    <ModernPatientManagement
      patient={patient}
      onPatientUpdate={handlePatientUpdate}
      mode="tab"
      currentUser={currentUser}
    />
  );
```

### Gradual Migration Strategy

#### Phase 1: Add New Tab
- Add ModernPatientManagement as new tab
- Users can choose between traditional and modern interface
- No breaking changes to existing functionality

#### Phase 2: Module-by-Module Migration  
- Replace VitalsContent with VitalsModule
- Replace MedicationAdministration with MARModule
- Add FormsModule for clinical assessments
- Maintain backward compatibility

#### Phase 3: Complete Replacement
- Replace PatientDetail with ModularPatientDashboard
- Update routing and navigation
- Deprecate old components

## 🎯 Benefits

### For Developers
- **Reduced Code Duplication**: Reusable form components
- **Type Safety**: Full TypeScript support
- **Easy Maintenance**: Schema-driven approach simplifies updates
- **Testing**: Component-based architecture enables better testing

### For Healthcare Staff
- **Intuitive Interface**: Modern, responsive design
- **Clinical Safety**: Built-in validation and alerts
- **Workflow Optimization**: Streamlined data entry processes
- **Real-time Feedback**: Immediate validation and error reporting

### For Healthcare Organizations
- **Compliance**: Built-in clinical validation rules
- **Auditability**: Complete audit trail of all actions
- **Flexibility**: Easy customization without code changes
- **Integration**: Works with existing healthcare systems

## 🔍 Technical Details

### Dependencies
- React 18+
- TypeScript 4.5+
- Tailwind CSS for styling
- Lucide React for icons
- JSON Schema validation library

### Performance Considerations
- **Lazy Loading**: Components load on demand
- **Memoization**: Expensive calculations are cached
- **Virtual Scrolling**: Large lists are virtualized
- **Debounced Validation**: Real-time validation is optimized

### Security Features
- **Input Sanitization**: All user inputs are sanitized
- **XSS Protection**: Built-in cross-site scripting protection
- **Data Validation**: Server-side validation mirrors client-side rules
- **Audit Logging**: All clinical actions are logged

## 🚀 Getting Started

1. **Install Dependencies**:
```bash
npm install
```

2. **Import Required Modules**:
```tsx
import { VitalsModule } from './modules/vitals/VitalsModule';
import { MARModule } from './modules/mar/MARModule';
import { FormsModule } from './modules/forms/FormsModule';
```

3. **Set Up Schema Engine**:
```tsx
import { schemaEngine } from './lib/schemaEngine';
import { vitalsSchemas } from './schemas/vitalsSchemas';

// Register schemas on app initialization
vitalsSchemas.forEach(schema => 
  schemaEngine.registerSchema(schema)
);
```

4. **Use in Components**:
```tsx
<VitalsModule
  patient={patient}
  onVitalsSave={handleVitalsSave}
  currentUser={currentUser}
/>
```

## 📝 Example Schemas

See the `/schemas` directory for complete examples of:
- Vital signs forms with clinical validation
- Medication administration with safety checks  
- Clinical assessment forms with conditional logic
- Custom healthcare field types

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
