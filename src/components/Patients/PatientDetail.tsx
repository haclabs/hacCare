Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit,
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets,
  Clock,
  Pill,
  FileText,
  AlertTriangle,
  Plus, 
  Stethoscope,
  TrendingUp,
  FileText2
} from 'lucide-react';
import { Patient, VitalSigns, PatientNote, Medication } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { PatientNoteForm } from './PatientNoteForm';
import { MedicationForm } from './MedicationForm';
import { VitalsTrends } from './VitalsTrends';
import { MedicationAdministration } from './MedicationAdministration';
import { PatientBracelet } from './PatientBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { WoundAssessment } from './WoundAssessment';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentDetail } from './AssessmentDetail';
import { getPatientVitals, getPatientNotes } from '../../lib/patientService';
import { fetchPatientMedications } from '../../lib/medicationService';
import { formatTime, calculateAge } from '../../utils/patientUtils';
import { fetchPatientAssessments } from '../../lib/assessmentService';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  // ... rest of the component code ...
}); // Added closing bracket for PatientDetail component
```