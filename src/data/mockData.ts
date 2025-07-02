import { Patient, Nurse, Alert } from '../types';
import { addHours, subHours, format, setHours, setMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export const currentNurse: Nurse = {
  id: 'nurse-001',
  firstName: 'Sarah',
  lastName: 'Johnson',
  licenseNumber: 'RN-12345',
  department: 'Medical-Surgical',
  shift: 'Day',
  email: 'sarah.johnson@haccare.com',
  phone: '(555) 123-4567',
  specializations: ['Critical Care', 'Wound Care', 'IV Therapy']
};

// Standard medication administration times
const getNextMedicationTime = (frequency: string, isDiabetic: boolean = false) => {
  const now = new Date();
  const currentHour = now.getHours();
  
  if (isDiabetic) {
    const diabeticTimes = [7.5, 11.5, 16.5];
    
    for (const time of diabeticTimes) {
      if (currentHour < time) {
        return setMinutes(setHours(now, Math.floor(time)), (time % 1) * 60);
      }
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return setMinutes(setHours(tomorrow, 7), 30);
  }
  
  const standardTimes = [8, 12, 17, 20, 21];
  
  if (frequency.includes('Once daily')) {
    if (currentHour < 8) {
      return setHours(now, 8);
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return setHours(tomorrow, 8);
  }
  
  if (frequency.includes('Twice daily')) {
    const twiceDailyTimes = [8, 20];
    for (const time of twiceDailyTimes) {
      if (currentHour < time) {
        return setHours(now, time);
      }
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return setHours(tomorrow, 8);
  }
  
  for (const time of standardTimes) {
    if (currentHour < time) {
      return setHours(now, time);
    }
  }
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return setHours(tomorrow, 8);
};

// Generate proper UUIDs for mock patients
const patient1Id = uuidv4();
const patient2Id = uuidv4();
const patient3Id = uuidv4();

export const mockPatients: Patient[] = [
  {
    id: patient1Id,
    patient_id: 'PT10001',
    first_name: 'John',
    last_name: 'Smith',
    date_of_birth: '1965-03-15',
    gender: 'Male',
    room_number: '302',
    bed_number: 'A',
    admission_date: '2024-01-15',
    condition: 'Stable',
    diagnosis: 'Hypertension with Type 2 Diabetes Mellitus',
    allergies: ['Penicillin (rash)', 'Latex (contact dermatitis)'],
    blood_type: 'O+',
    emergency_contact_name: 'Mary Smith',
    emergency_contact_relationship: 'Spouse',
    emergency_contact_phone: '(555) 987-6543',
    assigned_nurse: 'Sarah Johnson',
    vitals: [
      {
        temperature: 37.0,
        bloodPressure: { systolic: 120, diastolic: 80 },
        heartRate: 72,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        lastUpdated: format(subHours(new Date(), 2), 'yyyy-MM-dd HH:mm:ss'),
        recorded_at: format(subHours(new Date(), 2), 'yyyy-MM-dd HH:mm:ss')
      }
    ],
    medications: [
      {
        id: 'med-001',
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        route: 'Oral',
        start_date: '2024-01-15',
        prescribed_by: 'Dr. Wilson',
        next_due: format(getNextMedicationTime('Once daily'), 'yyyy-MM-dd HH:mm:ss'),
        status: 'Active'
      },
      {
        id: 'med-002',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        route: 'Oral',
        start_date: '2024-01-15',
        prescribed_by: 'Dr. Wilson',
        next_due: format(getNextMedicationTime('Twice daily'), 'yyyy-MM-dd HH:mm:ss'),
        status: 'Active'
      }
    ],
    notes: [
      {
        id: 'note-001',
        created_at: format(subHours(new Date(), 1), 'yyyy-MM-dd HH:mm:ss'),
        nurse_id: 'nurse-001',
        nurse_name: 'Sarah Johnson',
        type: 'Assessment',
        content: 'Patient ambulating well, no complaints of pain. Incision site clean and dry.',
        priority: 'Low'
      }
    ]
  },
  {
    id: patient2Id,
    patient_id: 'PT10002',
    first_name: 'Maria',
    last_name: 'Garcia',
    date_of_birth: '1978-07-22',
    gender: 'Female',
    room_number: '305',
    bed_number: 'B',
    admission_date: '2024-01-16',
    condition: 'Critical',
    diagnosis: 'Pneumonia with Sepsis',
    allergies: ['Sulfa drugs (anaphylaxis)'],
    blood_type: 'A-',
    emergency_contact_name: 'Carlos Garcia',
    emergency_contact_relationship: 'Husband',
    emergency_contact_phone: '(555) 456-7890',
    assigned_nurse: 'Sarah Johnson',
    vitals: [
      {
        temperature: 38.4,
        bloodPressure: { systolic: 140, diastolic: 90 },
        heartRate: 95,
        respiratoryRate: 22,
        oxygenSaturation: 94,
        lastUpdated: format(subHours(new Date(), 1), 'yyyy-MM-dd HH:mm:ss'),
        recorded_at: format(subHours(new Date(), 1), 'yyyy-MM-dd HH:mm:ss')
      }
    ],
    medications: [
      {
        id: 'med-003',
        name: 'Ceftriaxone',
        dosage: '1g',
        frequency: 'Every 12 hours',
        route: 'IV',
        start_date: '2024-01-16',
        prescribed_by: 'Dr. Chen',
        next_due: format(getNextMedicationTime('Every 12 hours'), 'yyyy-MM-dd HH:mm:ss'),
        status: 'Active'
      }
    ],
    notes: [
      {
        id: 'note-002',
        created_at: format(subHours(new Date(), 30), 'yyyy-MM-dd HH:mm:ss'),
        nurse_id: 'nurse-001',
        nurse_name: 'Sarah Johnson',
        type: 'Vital Signs',
        content: 'Elevated temperature and BP. Physician notified. Increased monitoring ordered.',
        priority: 'High'
      }
    ]
  },
  {
    id: patient3Id,
    patient_id: 'PT10003',
    first_name: 'Robert',
    last_name: 'Davis',
    date_of_birth: '1952-11-08',
    gender: 'Male',
    room_number: '308',
    bed_number: 'A',
    admission_date: '2024-01-14',
    condition: 'Improving',
    diagnosis: 'Post-operative Hip Replacement with Hyperlipidemia',
    allergies: [],
    blood_type: 'B+',
    emergency_contact_name: 'Linda Davis',
    emergency_contact_relationship: 'Daughter',
    emergency_contact_phone: '(555) 234-5678',
    assigned_nurse: 'Sarah Johnson',
    vitals: [
      {
        temperature: 36.9,
        bloodPressure: { systolic: 130, diastolic: 85 },
        heartRate: 68,
        respiratoryRate: 18,
        oxygenSaturation: 96,
        lastUpdated: format(subHours(new Date(), 3), 'yyyy-MM-dd HH:mm:ss'),
        recorded_at: format(subHours(new Date(), 3), 'yyyy-MM-dd HH:mm:ss')
      }
    ],
    medications: [
      {
        id: 'med-004',
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        route: 'Oral',
        start_date: '2024-01-14',
        prescribed_by: 'Dr. Martinez',
        next_due: format(setHours(new Date(), 21), 'yyyy-MM-dd HH:mm:ss'),
        status: 'Active'
      }
    ],
    notes: []
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    patientId: 'PT10002',
    patientName: 'Maria Garcia',
    type: 'Medication Due',
    message: `Ceftriaxone 1g IV due at ${format(getNextMedicationTime('Every 12 hours'), 'HH:mm')}`,
    priority: 'High',
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    acknowledged: false
  },
  {
    id: 'alert-002',
    patientId: 'PT10002',
    patientName: 'Maria Garcia',
    type: 'Vital Signs Alert',
    message: 'Temperature elevated to 38.4°C - requires monitoring',
    priority: 'Critical',
    timestamp: format(subHours(new Date(), 1), 'yyyy-MM-dd HH:mm:ss'),
    acknowledged: false
  },
  {
    id: 'alert-003',
    patientId: 'PT10001',
    patientName: 'John Smith',
    type: 'Lab Results',
    message: 'New lab results available for review',
    priority: 'Medium',
    timestamp: format(subHours(new Date(), 2), 'yyyy-MM-dd HH:mm:ss'),
    acknowledged: false
  }
];