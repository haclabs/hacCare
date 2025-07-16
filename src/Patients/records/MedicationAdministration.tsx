import { Medication } from '../../types';
import { fetchPatientMedications, deleteMedication } from '../../lib/medicationService';
import { runAlertChecks } from '../../lib/alertService';
import { usePatients } from '../../hooks/usePatients';
import { supabase } from '../../lib/supabase';