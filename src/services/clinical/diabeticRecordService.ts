/**
 * Diabetic Record Service
 * Handles database operations for diabetic records and glucose monitoring
 */

import { supabase } from '../../lib/api/supabase';
import { DiabeticRecord, DiabeticRecordFormData, GlucoseTrendPoint } from '../types/diabeticRecord';

class DiabeticRecordService {
  /**
   * Create a new diabetic record
   */
  async createDiabeticRecord(patientId: string, formData: DiabeticRecordFormData, userId: string): Promise<DiabeticRecord> {
    try {
      // Get the patient's tenant_id first for proper tenant support
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('tenant_id')
        .eq('patient_id', patientId)  // Use patient_id instead of id
        .single();

      if (patientError) {
        console.error('Error fetching patient for tenant_id:', patientError);
        throw patientError;
      }

      // Convert form data to database record (following patient_vitals pattern)
      const record = {
        patient_id: patientId,
        tenant_id: patient?.tenant_id, // Include tenant_id for multi-tenant support
        recorded_by: userId,
        date: formData.date,
        time_cbg_taken: formData.timeCbgTaken,
        reading_type: formData.readingType,
        glucose_reading: parseFloat(formData.glucoseReading),
        treatments_given: formData.treatmentsGiven,
        comments_for_physician: formData.commentsForPhysician,
        signature: formData.signature,
        prompt_frequency: 'Q6H' // Default value since field is required in database
      };

      // Add insulin administrations if provided
      if (formData.basalInsulinType && formData.basalInsulinUnits) {
        (record as any).basal_insulin = {
          type: formData.basalInsulinType,
          category: 'Basal',
          units: parseFloat(formData.basalInsulinUnits),
          timeAdministered: formData.basalTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.basalInjectionSite
        };
      }

      if (formData.bolusInsulinType && formData.bolusInsulinUnits) {
        (record as any).bolus_insulin = {
          type: formData.bolusInsulinType,
          category: 'Bolus',
          units: parseFloat(formData.bolusInsulinUnits),
          timeAdministered: formData.bolusTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.bolusInjectionSite
        };
      }

      if (formData.correctionInsulinType && formData.correctionInsulinUnits) {
        (record as any).correction_insulin = {
          type: formData.correctionInsulinType,
          category: 'Correction',
          units: parseFloat(formData.correctionInsulinUnits),
          timeAdministered: formData.correctionTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.correctionInjectionSite
        };
      }

      if (formData.otherInsulinType && formData.otherInsulinUnits) {
        (record as any).other_insulin = {
          type: formData.otherInsulinType,
          category: 'Other',
          units: parseFloat(formData.otherInsulinUnits),
          timeAdministered: formData.otherTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.otherInjectionSite
        };
      }

      const { data, error } = await supabase
        .from('diabetic_records')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        console.error('Record being inserted:', record);
        throw error;
      }

      // Transform database response to match interface
      return this.transformDatabaseRecord(data);
    } catch (error) {
      console.error('Error creating diabetic record:', error);
      throw error;
    }
  }

  /**
   * Transform database record to match interface (camelCase)
   */
  private transformDatabaseRecord(dbRecord: any): DiabeticRecord {
    return {
      id: dbRecord.id,
      tenantId: dbRecord.tenant_id,
      patientId: dbRecord.patient_id,
      recordedBy: dbRecord.recorded_by,
      date: dbRecord.date,
      timeCbgTaken: dbRecord.time_cbg_taken,
      readingType: dbRecord.reading_type,
      glucoseReading: dbRecord.glucose_reading,
      basalInsulin: dbRecord.basal_insulin,
      bolusInsulin: dbRecord.bolus_insulin,
      correctionInsulin: dbRecord.correction_insulin,
      otherInsulin: dbRecord.other_insulin,
      treatmentsGiven: dbRecord.treatments_given,
      commentsForPhysician: dbRecord.comments_for_physician,
      signature: dbRecord.signature,
      recordedAt: dbRecord.recorded_at,
      createdAt: dbRecord.created_at
    };
  }

  /**
   * Get diabetic records for a patient
   */
  async getPatientDiabeticRecords(patientId: string, limit: number = 50): Promise<DiabeticRecord[]> {
    try {
      const { data, error } = await supabase
        .from('diabetic_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
        .order('time_cbg_taken', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(record => this.transformDatabaseRecord(record));
    } catch (error) {
      console.error('Error fetching diabetic records:', error);
      throw error;
    }
  }

  /**
   * Get recent diabetic records (last 5)
   */
  async getRecentDiabeticRecords(patientId: string): Promise<DiabeticRecord[]> {
    return this.getPatientDiabeticRecords(patientId, 5);
  }

  /**
   * Get glucose trend data for graphing
   */
  async getGlucoseTrendData(patientId: string, hours: number = 72): Promise<GlucoseTrendPoint[]> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);
      
      const { data, error } = await supabase
        .from('diabetic_records')
        .select('*')
        .eq('patient_id', patientId)
        .gte('created_at', startDate.toISOString())
        .order('date', { ascending: true })
        .order('time_cbg_taken', { ascending: true });

      if (error) throw error;

      // Convert to trend points
      const trendData: GlucoseTrendPoint[] = (data || []).map(record => ({
        timestamp: `${record.date}T${record.time_cbg_taken}:00`,
        glucoseLevel: record.glucose_reading,
        readingType: record.reading_type,
        insulinGiven: {
          basal: record.basal_insulin?.units,
          bolus: record.bolus_insulin?.units,
          correction: record.correction_insulin?.units
        }
      }));

      return trendData;
    } catch (error) {
      console.error('Error fetching glucose trend data:', error);
      throw error;
    }
  }

  /**
   * Update a diabetic record
   */
  async updateDiabeticRecord(recordId: string, formData: DiabeticRecordFormData): Promise<DiabeticRecord> {
    try {
      // Convert form data to database format
      const updates = {
        date: formData.date,
        time_cbg_taken: formData.timeCbgTaken,
        reading_type: formData.readingType,
        glucose_reading: parseFloat(formData.glucoseReading),
        treatments_given: formData.treatmentsGiven,
        comments_for_physician: formData.commentsForPhysician,
        signature: formData.signature,
        prompt_frequency: 'Q6H' // Default value since field is required in database
      };

      // Update insulin administrations
      if (formData.basalInsulinType && formData.basalInsulinUnits) {
        (updates as any).basal_insulin = {
          type: formData.basalInsulinType,
          category: 'Basal',
          units: parseFloat(formData.basalInsulinUnits),
          timeAdministered: formData.basalTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.basalInjectionSite
        };
      }

      if (formData.bolusInsulinType && formData.bolusInsulinUnits) {
        (updates as any).bolus_insulin = {
          type: formData.bolusInsulinType,
          category: 'Bolus',
          units: parseFloat(formData.bolusInsulinUnits),
          timeAdministered: formData.bolusTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.bolusInjectionSite
        };
      }

      if (formData.correctionInsulinType && formData.correctionInsulinUnits) {
        (updates as any).correction_insulin = {
          type: formData.correctionInsulinType,
          category: 'Correction',
          units: parseFloat(formData.correctionInsulinUnits),
          timeAdministered: formData.correctionTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.correctionInjectionSite
        };
      }

      if (formData.otherInsulinType && formData.otherInsulinUnits) {
        (updates as any).other_insulin = {
          type: formData.otherInsulinType,
          category: 'Other',
          units: parseFloat(formData.otherInsulinUnits),
          timeAdministered: formData.otherTimeAdministered || formData.timeCbgTaken,
          injectionSite: formData.otherInjectionSite
        };
      }

      const { data, error } = await supabase
        .from('diabetic_records')
        .update(updates)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      return this.transformDatabaseRecord(data);
    } catch (error) {
      console.error('Error updating diabetic record:', error);
      throw error;
    }
  }

  /**
   * Delete a diabetic record
   */
  async deleteDiabeticRecord(recordId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('diabetic_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting diabetic record:', error);
      throw error;
    }
  }

  /**
   * Get glucose statistics for a patient
   */
  async getGlucoseStatistics(patientId: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('diabetic_records')
        .select('glucose_reading')
        .eq('patient_id', patientId)
        .gte('date', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      const readings = data?.map(record => record.glucose_reading) || [];
      
      if (readings.length === 0) {
        return {
          average: 0,
          min: 0,
          max: 0,
          count: 0,
          inRange: 0,
          percentInRange: 0
        };
      }

      const average = readings.reduce((sum, reading) => sum + reading, 0) / readings.length;
      const min = Math.min(...readings);
      const max = Math.max(...readings);
      const inRange = readings.filter(reading => reading >= 5 && reading <= 10).length;
      const percentInRange = (inRange / readings.length) * 100;

      return {
        average: Math.round(average * 10) / 10,
        min,
        max,
        count: readings.length,
        inRange,
        percentInRange: Math.round(percentInRange)
      };
    } catch (error) {
      console.error('Error calculating glucose statistics:', error);
      throw error;
    }
  }
}

export const diabeticRecordService = new DiabeticRecordService();
