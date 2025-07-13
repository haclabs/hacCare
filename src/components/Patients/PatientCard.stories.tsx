import type { Meta, StoryObj } from '@storybook/react';
import PatientCard from './PatientCard';
import { BrowserRouter } from 'react-router-dom';

// Meta information about the component
const meta: Meta<typeof PatientCard> = {
  title: 'Patients/PatientCard',
  component: PatientCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  // Wrap the component in BrowserRouter since it uses Link from react-router-dom
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div style={{ width: '400px' }}>
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PatientCard>;

// Sample patient data
const samplePatient = {
  id: 'patient-123',
  patient_id: 'PT12345',
  first_name: 'John',
  last_name: 'Smith',
  date_of_birth: '1965-03-15',
  gender: 'Male',
  room_number: '302',
  bed_number: 'A',
  admission_date: '2024-01-15',
  condition: 'Stable',
  diagnosis: 'Hypertension with Type 2 Diabetes Mellitus',
  allergies: ['Penicillin', 'Latex'],
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
      lastUpdated: new Date().toISOString()
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
      next_due: new Date().toISOString(),
      status: 'Active'
    }
  ],
  notes: []
};

// Default story
export const Default: Story = {
  args: {
    patient: samplePatient,
    onClick: () => console.log('Patient card clicked'),
  },
};

// Critical patient
export const CriticalPatient: Story = {
  args: {
    patient: {
      ...samplePatient,
      condition: 'Critical',
      vitals: [
        {
          temperature: 39.2,
          bloodPressure: { systolic: 160, diastolic: 95 },
          heartRate: 110,
          respiratoryRate: 24,
          oxygenSaturation: 92,
          lastUpdated: new Date().toISOString()
        }
      ],
    },
    onClick: () => console.log('Critical patient card clicked'),
  },
};

// Patient with many allergies
export const PatientWithAllergies: Story = {
  args: {
    patient: {
      ...samplePatient,
      allergies: ['Penicillin', 'Latex', 'Sulfa Drugs', 'Aspirin', 'Ibuprofen'],
    },
    onClick: () => console.log('Patient with allergies card clicked'),
  },
};