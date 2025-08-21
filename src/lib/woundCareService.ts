/**
 * Wound Care Service
 * 
 * Service class for managing wound assessments and treatments.
 * Provides CRUD operations for wound care data with Supabase integration.
 * 
 * Features:
 * - Wound assessment management
 * - Treatment tracking
 * - Photo upload handling
 * - Multi-tenant support
 * - Error handling
 */

import { supabase } from './supabase';
import { WoundAssessment, WoundTreatment } from '../types';

export class WoundCareService {
  /**
   * Get all wound assessments for a patient
   */
  static async getAssessmentsByPatient(patientId: string): Promise<WoundAssessment[]> {
    try {
      const { data, error } = await supabase
        .from('wound_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessment_date', { ascending: false });

      if (error) {
        console.error('Error fetching wound assessments:', error);
        throw new Error(`Failed to fetch wound assessments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAssessmentsByPatient:', error);
      throw error;
    }
  }

  /**
   * Get all treatments for a patient
   */
  static async getTreatmentsByPatient(patientId: string): Promise<WoundTreatment[]> {
    try {
      const { data, error } = await supabase
        .from('wound_treatments')
        .select('*')
        .eq('patient_id', patientId)
        .order('treatment_date', { ascending: false });

      if (error) {
        console.error('Error fetching wound treatments:', error);
        throw new Error(`Failed to fetch wound treatments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTreatmentsByPatient:', error);
      throw error;
    }
  }

  /**
   * Create a new wound assessment
   */
  static async createAssessment(assessment: Omit<WoundAssessment, 'id' | 'created_at' | 'updated_at'>): Promise<WoundAssessment> {
    try {
      const { data, error } = await supabase
        .from('wound_assessments')
        .insert({
          ...assessment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating wound assessment:', error);
        throw new Error(`Failed to create wound assessment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createAssessment:', error);
      throw error;
    }
  }

  /**
   * Update an existing wound assessment
   */
  static async updateAssessment(id: string, updates: Partial<WoundAssessment>): Promise<WoundAssessment> {
    try {
      const { data, error } = await supabase
        .from('wound_assessments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating wound assessment:', error);
        throw new Error(`Failed to update wound assessment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateAssessment:', error);
      throw error;
    }
  }

  /**
   * Delete a wound assessment
   */
  static async deleteAssessment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('wound_assessments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting wound assessment:', error);
        throw new Error(`Failed to delete wound assessment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteAssessment:', error);
      throw error;
    }
  }

  /**
   * Create a new wound treatment
   */
  static async createTreatment(treatment: Omit<WoundTreatment, 'id' | 'created_at' | 'updated_at'>): Promise<WoundTreatment> {
    try {
      const { data, error } = await supabase
        .from('wound_treatments')
        .insert({
          ...treatment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating wound treatment:', error);
        throw new Error(`Failed to create wound treatment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createTreatment:', error);
      throw error;
    }
  }

  /**
   * Update an existing wound treatment
   */
  static async updateTreatment(id: string, updates: Partial<WoundTreatment>): Promise<WoundTreatment> {
    try {
      const { data, error } = await supabase
        .from('wound_treatments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating wound treatment:', error);
        throw new Error(`Failed to update wound treatment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateTreatment:', error);
      throw error;
    }
  }

  /**
   * Delete a wound treatment
   */
  static async deleteTreatment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('wound_treatments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting wound treatment:', error);
        throw new Error(`Failed to delete wound treatment: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteTreatment:', error);
      throw error;
    }
  }

  /**
   * Upload wound photo to Supabase Storage
   */
  static async uploadWoundPhoto(file: File, patientId: string, assessmentId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}/${assessmentId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('wound-photos')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading wound photo:', error);
        throw new Error(`Failed to upload wound photo: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('wound-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadWoundPhoto:', error);
      throw error;
    }
  }

  /**
   * Delete wound photo from Supabase Storage
   */
  static async deleteWoundPhoto(photoUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const { error } = await supabase.storage
        .from('wound-photos')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting wound photo:', error);
        throw new Error(`Failed to delete wound photo: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteWoundPhoto:', error);
      throw error;
    }
  }

  /**
   * Get wound assessments by date range
   */
  static async getAssessmentsByDateRange(
    patientId: string, 
    startDate: string, 
    endDate: string
  ): Promise<WoundAssessment[]> {
    try {
      const { data, error } = await supabase
        .from('wound_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .gte('assessment_date', startDate)
        .lte('assessment_date', endDate)
        .order('assessment_date', { ascending: false });

      if (error) {
        console.error('Error fetching wound assessments by date range:', error);
        throw new Error(`Failed to fetch wound assessments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAssessmentsByDateRange:', error);
      throw error;
    }
  }

  /**
   * Get the latest assessment for a patient
   */
  static async getLatestAssessment(patientId: string): Promise<WoundAssessment | null> {
    try {
      const { data, error } = await supabase
        .from('wound_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return null;
        }
        console.error('Error fetching latest wound assessment:', error);
        throw new Error(`Failed to fetch latest wound assessment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getLatestAssessment:', error);
      throw error;
    }
  }
}
