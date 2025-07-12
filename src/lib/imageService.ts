import { supabase } from './supabase';
import { logAction } from './auditService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Image Service
 * Handles uploading, retrieving, and managing patient images
 */

export interface PatientImage {
  id: string;
  patient_id: string;
  image_url: string;
  thumbnail_url?: string;
  annotations: Annotation[];
  image_type: 'wound' | 'injury' | 'other';
  description?: string;
  uploaded_by: string;
  created_at: string;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'highlight' | 'text' | 'measure';
  data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    color: string;
    angle?: number;
  };
}

/**
 * Upload a patient image to Supabase Storage
 */
export const uploadPatientImage = async (
  patientId: string,
  file: File,
  imageType: 'wound' | 'injury' | 'other',
  description?: string
): Promise<PatientImage> => {
  try {
    console.log('Uploading patient image:', file.name);
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${patientId}/${fileName}`;
    
    // Upload to Supabase Storage (skip bucket check and try direct upload)
    console.log('Attempting to upload to patient-images bucket...');
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('patient-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      
      // Provide more helpful error messages based on the error type
      if (uploadError.message?.includes('Bucket not found')) {
        throw new Error('Storage bucket "patient-images" not found or not accessible. Please check bucket permissions in Supabase dashboard.');
      } else if (uploadError.message?.includes('not allowed')) {
        throw new Error('Upload not allowed. Please check storage policies for the patient-images bucket.');
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    }
    
    console.log('Upload successful:', uploadData);
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('patient-images')
      .getPublicUrl(filePath);
    
    console.log('Generated public URL:', publicUrl);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create database record
    console.log('Creating database record...');
    const { data, error } = await supabase
      .from('patient_images')
      .insert({
        patient_id: patientId,
        image_url: publicUrl,
        image_type: imageType,
        description: description || '',
        uploaded_by: user.id,
        annotations: []
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating image record:', error);
      throw new Error(`Failed to save image record: ${error.message}`);
    }
    
    // Log the action
    try {
      await logAction(
        user,
        'uploaded_image',
        patientId,
        'patient',
        { image_type: imageType, description }
      );
    } catch (logError) {
      console.warn('Failed to log action:', logError);
      // Don't fail the upload if logging fails
    }
    
    console.log('Image uploaded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in uploadPatientImage:', error);
    throw error;
  }
};

/**
 * Fetch patient images
 */
export const fetchPatientImages = async (patientId: string): Promise<PatientImage[]> => {
  try {
    console.log('Fetching images for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_images')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching patient images:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} images for patient ${patientId}`);
    return data || [];
  } catch (error) {
    console.error('Error in fetchPatientImages:', error);
    throw error;
  }
};

/**
 * Update image annotations
 */
export const updateImageAnnotations = async (
  imageId: string,
  annotations: Annotation[]
): Promise<PatientImage> => {
  try {
    console.log('Updating annotations for image:', imageId);
    
    const { data, error } = await supabase
      .from('patient_images')
      .update({ annotations })
      .eq('id', imageId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating image annotations:', error);
      throw error;
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log the action
    if (user) {
      await logAction(
        user,
        'updated_image_annotations',
        data.patient_id,
        'patient',
        { image_id: imageId }
      );
    }
    
    console.log('Annotations updated successfully');
    return data;
  } catch (error) {
    console.error('Error in updateImageAnnotations:', error);
    throw error;
  }
};

/**
 * Delete a patient image
 */
export const deletePatientImage = async (imageId: string): Promise<void> => {
  try {
    console.log('Deleting patient image:', imageId);
    
    // Get image data first to get the file path
    const { data: imageData, error: fetchError } = await supabase
      .from('patient_images')
      .select('*')
      .eq('id', imageId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching image data:', fetchError);
      throw fetchError;
    }
    
    // Extract file path from URL
    const url = new URL(imageData.image_url);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('patient-images') + 1).join('/');
    
    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from('patient-images')
      .remove([filePath]);
    
    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      // Continue anyway to delete the database record
    }
    
    // Delete database record
    const { error } = await supabase
      .from('patient_images')
      .delete()
      .eq('id', imageId);
    
    if (error) {
      console.error('Error deleting image record:', error);
      throw error;
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log the action
    if (user) {
      await logAction(
        user,
        'deleted_image',
        imageData.patient_id,
        'patient',
        { image_type: imageData.image_type }
      );
    }
    
    console.log('Image deleted successfully');
  } catch (error) {
    console.error('Error in deletePatientImage:', error);
    throw error;
  }
};