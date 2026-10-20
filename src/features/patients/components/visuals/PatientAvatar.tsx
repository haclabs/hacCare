import React from 'react';
import { getAvatarById } from '../../../../data/patientAvatars';
import { isValidPhotoData } from '../../utils/patientPhoto';

interface PatientAvatarProps {
  patient: { photo_data?: string | null; avatar_id?: string | null; first_name?: string; last_name?: string };
  /** Rendered when the patient has neither a photo nor an avatar. */
  fallback: React.ReactNode;
}

/** Fills its container with the patient's photo, else their illustrated avatar, else `fallback`. */
export const PatientAvatar: React.FC<PatientAvatarProps> = ({ patient, fallback }) => {
  if (isValidPhotoData(patient.photo_data)) {
    return (
      <img
        src={patient.photo_data}
        alt={`${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Patient photo'}
        className="w-full h-full object-cover bg-white"
      />
    );
  }

  const avatar = patient.avatar_id ? getAvatarById(patient.avatar_id) : undefined;
  if (avatar) {
    // Built-in SVGs from src/data/patientAvatars.ts, not user content
    return <div className="w-full h-full bg-white" dangerouslySetInnerHTML={{ __html: avatar.svg }} />;
  }

  return <>{fallback}</>;
};

export default PatientAvatar;
