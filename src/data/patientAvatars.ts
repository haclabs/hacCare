/**
 * Patient Avatar System
 * 10 diverse, androgynous patient avatar options
 */

export interface AvatarOption {
  id: string;
  name: string;
  svg: string;
}

export const PATIENT_AVATARS: AvatarOption[] = [
  {
    id: 'avatar-1',
    name: 'Warm Smile',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FEF3C7"/>
      <circle cx="50" cy="45" r="35" fill="#FDE68A"/>
      <circle cx="38" cy="42" r="3" fill="#92400E"/>
      <circle cx="62" cy="42" r="3" fill="#92400E"/>
      <path d="M 35 55 Q 50 62 65 55" stroke="#92400E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#D97706"/>
    </svg>`
  },
  {
    id: 'avatar-2',
    name: 'Friendly Face',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#DBEAFE"/>
      <circle cx="50" cy="45" r="35" fill="#BFDBFE"/>
      <circle cx="38" cy="42" r="3" fill="#1E40AF"/>
      <circle cx="62" cy="42" r="3" fill="#1E40AF"/>
      <path d="M 35 53 Q 50 60 65 53" stroke="#1E40AF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#3B82F6"/>
    </svg>`
  },
  {
    id: 'avatar-3',
    name: 'Gentle Soul',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#F3E8FF"/>
      <circle cx="50" cy="45" r="35" fill="#E9D5FF"/>
      <circle cx="38" cy="42" r="3" fill="#6B21A8"/>
      <circle cx="62" cy="42" r="3" fill="#6B21A8"/>
      <path d="M 37 54 Q 50 59 63 54" stroke="#6B21A8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#A855F7"/>
    </svg>`
  },
  {
    id: 'avatar-4',
    name: 'Calm Presence',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#D1FAE5"/>
      <circle cx="50" cy="45" r="35" fill="#A7F3D0"/>
      <circle cx="38" cy="42" r="3" fill="#065F46"/>
      <circle cx="62" cy="42" r="3" fill="#065F46"/>
      <path d="M 36 54 Q 50 61 64 54" stroke="#065F46" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#10B981"/>
    </svg>`
  },
  {
    id: 'avatar-5',
    name: 'Bright Spirit',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FED7AA"/>
      <circle cx="50" cy="45" r="35" fill="#FDBA74"/>
      <circle cx="38" cy="42" r="3" fill="#7C2D12"/>
      <circle cx="62" cy="42" r="3" fill="#7C2D12"/>
      <path d="M 35 55 Q 50 63 65 55" stroke="#7C2D12" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#F97316"/>
    </svg>`
  },
  {
    id: 'avatar-6',
    name: 'Peaceful Mind',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#E0E7FF"/>
      <circle cx="50" cy="45" r="35" fill="#C7D2FE"/>
      <circle cx="38" cy="42" r="3" fill="#3730A3"/>
      <circle cx="62" cy="42" r="3" fill="#3730A3"/>
      <path d="M 36 53 Q 50 60 64 53" stroke="#3730A3" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#6366F1"/>
    </svg>`
  },
  {
    id: 'avatar-7',
    name: 'Kind Heart',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FCE7F3"/>
      <circle cx="50" cy="45" r="35" fill="#FBCFE8"/>
      <circle cx="38" cy="42" r="3" fill="#831843"/>
      <circle cx="62" cy="42" r="3" fill="#831843"/>
      <path d="M 35 54 Q 50 61 65 54" stroke="#831843" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#EC4899"/>
    </svg>`
  },
  {
    id: 'avatar-8',
    name: 'Serene Look',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#CFFAFE"/>
      <circle cx="50" cy="45" r="35" fill="#A5F3FC"/>
      <circle cx="38" cy="42" r="3" fill="#164E63"/>
      <circle cx="62" cy="42" r="3" fill="#164E63"/>
      <path d="M 37 53 Q 50 60 63 53" stroke="#164E63" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#06B6D4"/>
    </svg>`
  },
  {
    id: 'avatar-9',
    name: 'Gentle Gaze',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FEE2E2"/>
      <circle cx="50" cy="45" r="35" fill="#FECACA"/>
      <circle cx="38" cy="42" r="3" fill="#7F1D1D"/>
      <circle cx="62" cy="42" r="3" fill="#7F1D1D"/>
      <path d="M 36 54 Q 50 61 64 54" stroke="#7F1D1D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#EF4444"/>
    </svg>`
  },
  {
    id: 'avatar-10',
    name: 'Hopeful Eyes',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#E5E7EB"/>
      <circle cx="50" cy="45" r="35" fill="#D1D5DB"/>
      <circle cx="38" cy="42" r="3" fill="#1F2937"/>
      <circle cx="62" cy="42" r="3" fill="#1F2937"/>
      <path d="M 35 53 Q 50 60 65 53" stroke="#1F2937" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="20" fill="#6B7280"/>
    </svg>`
  }
];

/**
 * Get a random avatar ID
 */
export const getRandomAvatarId = (): string => {
  const randomIndex = Math.floor(Math.random() * PATIENT_AVATARS.length);
  return PATIENT_AVATARS[randomIndex].id;
};

/**
 * Get avatar by ID
 */
export const getAvatarById = (id: string): AvatarOption | undefined => {
  return PATIENT_AVATARS.find(avatar => avatar.id === id);
};
