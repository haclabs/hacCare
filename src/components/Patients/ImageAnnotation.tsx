import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Edit, Trash2, ArrowRight, Square, Type, Ruler } from 'lucide-react';
import ImageMarker from 'react-image-marker';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../hooks/useAuth';
import { PatientImage, uploadPatientImage, fetchPatientImages, updateImageAnnotations, deletePatientImage } from '../../lib/imageService';
import { format } from 'date-fns';

interface ImageAnnotationProps {
  patientId: string;
  patientName: string;
  onClose?: () => void;
}

export const ImageAnnotation: React.FC<ImageAnnotationProps> = ({
  patientId,
  patientName,
  onClose
}) => {
  const { user, profile } = useAuth();
  const [images, setImages] = useState<PatientImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<PatientImage | null>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState('');
  const [imageType, setImageType] = useState<'wound' | 'injury' | 'other'>('wound');
  
  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5242880, // 5MB
    onDrop: handleImageDrop,
    disabled: uploading
  });
  
  // Load images on component mount
  useEffect(() => {
    loadImages();
  }, [patientId]);
  
  // Load patient images
  const loadImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const patientImages = await fetchPatientImages(patientId);
      setImages(patientImages);
      
      // Select the first image if available
      if (patientImages.length > 0 && !selectedImage) {
        handleSelectImage(patientImages[0]);
      }
    } catch (err: any) {
      console.error('Error loading images:', err);
      setError(err.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle image selection
  const handleSelectImage = (image: PatientImage) => {
    setSelectedImage(image);
    setMarkers(image.annotations || []);
  };
  
  // Handle image upload
  async function handleImageDrop(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return;
    
    try {
      setUploading(true);
      setError(null);
      
      const file = acceptedFiles[0];
      
      // Upload image
      const uploadedImage = await uploadPatientImage(
        patientId,
        file,
        imageType,
        imageDescription
      );
      
      // Add to images list
      setImages(prev => [uploadedImage, ...prev]);
      
      // Select the uploaded image
      setSelectedImage(uploadedImage);
      setMarkers([]);
      setImageDescription('');
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }
  
  // Handle adding markers
  const handleAddMarker = (marker: any) => {
    const newMarker = {
      ...marker,
      id: Math.random().toString(16).slice(2)
    };
    setMarkers([...markers, newMarker]);
  };
  
  // Save markers to database
  const saveMarkers = async () => {
    if (!selectedImage) return;
    
    try {
      setUploading(true);
      setError(null);
      
      // Update markers in database
      const updatedImage = await updateImageAnnotations(
        selectedImage.id,
        markers
      );
      
      // Update local state
      setImages(prev => 
        prev.map(img => 
          img.id === updatedImage.id ? updatedImage : img
        )
      );
      
      setSelectedImage(updatedImage);
    } catch (err: any) {
      console.error('Error saving annotations:', err);
      setError(err.message || 'Failed to save annotations');
    } finally {
      setUploading(false);
    }
  };
  
  // Delete image
  const handleDeleteImage = async () => {
    if (!selectedImage || !window.confirm('Are you sure you want to delete this image?')) return;
    
    try {
      setUploading(true);
      setError(null);
      
      // Delete image from database and storage
      await deletePatientImage(selectedImage.id);
      
      // Update local state
      setImages(prev => prev.filter(img => img.id !== selectedImage.id));
      setSelectedImage(images.length > 1 ? images.find(img => img.id !== selectedImage.id) || null : null);
      setMarkers([]);
    } catch (err: any) {
      console.error('Error deleting image:', err);
      setError(err.message || 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };
  
  // Render image upload form
  const renderImageUploadForm = () => (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Uploading image...</p>
          </div>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-1">Drag & drop an image here, or click to select</p>
            <p className="text-gray-500 text-sm">Supported formats: JPEG, PNG, GIF (max 5MB)</p>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Type
          </label>
          <select
            value={imageType}
            onChange={(e) => setImageType(e.target.value as 'wound' | 'injury' | 'other')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={uploading}
          >
            <option value="wound">Wound</option>
            <option value="injury">Injury</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={imageDescription}
            onChange={(e) => setImageDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the image"
            disabled={uploading}
          />
        </div>
      </div>
    </div>
  );
  
  // Render image gallery
  const renderImageGallery = () => (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {images.map((image) => (
        <div
          key={image.id}
          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
            selectedImage?.id === image.id ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300'
          }`}
          onClick={() => handleSelectImage(image)}
        >
          <img
            src={image.image_url}
            alt={image.description || 'Patient image'}
            className="w-full h-24 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
            {format(new Date(image.created_at), 'MMM dd, yyyy')}
          </div>
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Patient Images & Annotations</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Image Upload & Gallery */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Upload New Image</h4>
            {renderImageUploadForm()}
          </div>
          
          {images.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Image Gallery</h4>
              {renderImageGallery()}
            </div>
          )}
        </div>
        
        {/* Right Column - Image Annotation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">
              {selectedImage ? 'Annotate Image' : 'Select an Image to Annotate'}
            </h4>
            {selectedImage && (
              <div className="flex space-x-2">
                <button
                  onClick={saveMarkers}
                  disabled={uploading}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={handleDeleteImage}
                  disabled={uploading}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
          
          {selectedImage ? (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <ImageMarker
                  src={selectedImage.image_url}
                  markers={markers}
                  onAddMarker={handleAddMarker}
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Image Details</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600"><strong>Type:</strong> {selectedImage.image_type}</p>
                    <p className="text-gray-600"><strong>Uploaded:</strong> {format(new Date(selectedImage.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600"><strong>Description:</strong> {selectedImage.description || 'No description'}</p>
                    <p className="text-gray-600"><strong>Markers:</strong> {markers.length}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">
                {images.length > 0 ? 'Select an image from the gallery to annotate' : 'Upload an image to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};