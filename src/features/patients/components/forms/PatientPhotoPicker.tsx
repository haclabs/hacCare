import React, { useRef, useState } from 'react';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { PATIENT_AVATARS } from '../../../../data/patientAvatars';
import { resizePatientPhoto } from '../../utils/patientPhoto';
import { PatientAvatar } from '../visuals/PatientAvatar';

interface PatientPhotoPickerProps {
  photoData: string | null | undefined;
  avatarId: string | undefined;
  onPhotoChange: (photoData: string | null) => void;
  onAvatarChange: (avatarId: string) => void;
}

/** Upload a patient photo, or pick one of the illustrated avatars. A photo takes precedence. */
export const PatientPhotoPicker: React.FC<PatientPhotoPickerProps> = ({
  photoData,
  avatarId,
  onPhotoChange,
  onAvatarChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      onPhotoChange(await resizePatientPhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That image couldn't be used.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Patient Photo</label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden ring-1 ring-gray-300 dark:ring-gray-600 flex-shrink-0">
            <PatientAvatar
              patient={{ photo_data: photoData, avatar_id: avatarId }}
              fallback={<div className="w-full h-full bg-gray-100 dark:bg-gray-700" />}
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={processing}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-haccare-teal hover:bg-haccare-teal-dark rounded-lg disabled:opacity-50"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {photoData ? 'Replace Photo' : 'Upload Photo'}
              </button>
              {photoData && (
                <button
                  type="button"
                  onClick={() => onPhotoChange(null)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Photo
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use a stock or AI-generated photo, never a real patient. It's cropped to a square and shrunk automatically.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Avatar {photoData && <span className="font-normal text-gray-400">(used if the photo is removed)</span>}
        </label>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
          {PATIENT_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onAvatarChange(avatar.id)}
              className={`relative rounded-lg overflow-hidden transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                avatarId === avatar.id
                  ? 'ring-4 ring-blue-500 ring-offset-2 scale-105 shadow-lg'
                  : 'ring-1 ring-gray-300 dark:ring-gray-600 hover:ring-blue-300'
              }`}
              title={avatar.name}
            >
              <div className="aspect-square" dangerouslySetInnerHTML={{ __html: avatar.svg }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientPhotoPicker;
