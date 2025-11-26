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
    name: 'Person 1',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#E8F4F8"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#F5C5A0"/>
      <circle cx="60" cy="40" r="22" fill="#8B5A3C"/>
      <circle cx="52" cy="70" r="3" fill="#2C1810"/>
      <circle cx="68" cy="70" r="3" fill="#2C1810"/>
      <path d="M 52 80 Q 60 84 68 80" stroke="#C17D5E" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#5B9BD5"/>
    </svg>`
  },
  {
    id: 'avatar-2',
    name: 'Person 2',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FFF5E6"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#D4A574"/>
      <ellipse cx="60" cy="42" rx="24" ry="26" fill="#2C2C2C"/>
      <circle cx="52" cy="70" r="3" fill="#1A1A1A"/>
      <circle cx="68" cy="70" r="3" fill="#1A1A1A"/>
      <path d="M 53 79 Q 60 83 67 79" stroke="#A67C52" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#F4A460"/>
    </svg>`
  },
  {
    id: 'avatar-3',
    name: 'Person 3',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#F0E6FF"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#E8D0B8"/>
      <path d="M 35 40 Q 60 20 85 40" fill="#4A4A4A"/>
      <circle cx="60" cy="48" r="18" fill="#E8D0B8"/>
      <circle cx="52" cy="70" r="3" fill="#2C1810"/>
      <circle cx="68" cy="70" r="3" fill="#2C1810"/>
      <rect x="55" y="68" width="10" height="4" rx="2" fill="#8B6F47"/>
      <path d="M 52 80 Q 60 85 68 80" stroke="#C99A6E" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#9B7EBD"/>
    </svg>`
  },
  {
    id: 'avatar-4',
    name: 'Person 4',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FFE6F0"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#C68B59"/>
      <path d="M 38 35 Q 60 45 82 35" fill="#654321"/>
      <ellipse cx="60" cy="48" rx="20" ry="22" fill="#654321"/>
      <circle cx="52" cy="70" r="3" fill="#1A1A1A"/>
      <circle cx="68" cy="70" r="3" fill="#1A1A1A"/>
      <path d="M 53 80 Q 60 84 67 80" stroke="#9B6B43" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#E94B8B"/>
    </svg>`
  },
  {
    id: 'avatar-5',
    name: 'Person 5',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FFF0DB"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#F4D5B0"/>
      <circle cx="60" cy="40" r="24" fill="#D4A76A"/>
      <circle cx="52" cy="70" r="3" fill="#2C1810"/>
      <circle cx="68" cy="70" r="3" fill="#2C1810"/>
      <circle cx="48" cy="70" r="2" fill="#FF6B6B"/>
      <circle cx="72" cy="70" r="2" fill="#FF6B6B"/>
      <path d="M 52 79 Q 60 84 68 79" stroke="#D4A574" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#FF8C42"/>
    </svg>`
  },
  {
    id: 'avatar-6',
    name: 'Person 6',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#E6F3FF"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#8D5524"/>
      <ellipse cx="60" cy="38" rx="23" ry="25" fill="#2C2C2C"/>
      <circle cx="52" cy="70" r="3" fill="#1A1A1A"/>
      <circle cx="68" cy="70" r="3" fill="#1A1A1A"/>
      <path d="M 52 80 Q 60 85 68 80" stroke="#6B4423" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#4A90E2"/>
    </svg>`
  },
  {
    id: 'avatar-7',
    name: 'Person 7',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FFF0F5"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#F7D7C4"/>
      <path d="M 36 42 Q 60 30 84 42" fill="#8B7355"/>
      <ellipse cx="60" cy="50" rx="22" ry="24" fill="#F7D7C4"/>
      <circle cx="52" cy="72" r="3" fill="#2C1810"/>
      <circle cx="68" cy="72" r="3" fill="#2C1810"/>
      <path d="M 53 81 Q 60 85 67 81" stroke="#D4A88C" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#D63384"/>
    </svg>`
  },
  {
    id: 'avatar-8',
    name: 'Person 8',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#E0F2F7"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#A67C52"/>
      <circle cx="60" cy="42" r="23" fill="#C0C0C0"/>
      <circle cx="52" cy="70" r="3" fill="#1A1A1A"/>
      <circle cx="68" cy="70" r="3" fill="#1A1A1A"/>
      <rect x="50" y="68" width="20" height="3" rx="1.5" fill="#4A4A4A"/>
      <path d="M 53 80 Q 60 84 67 80" stroke="#8B6F47" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#17A2B8"/>
    </svg>`
  },
  {
    id: 'avatar-9',
    name: 'Person 9',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#FFE6E6"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#F5E6D3"/>
      <path d="M 38 38 Q 60 48 82 38" fill="#B8860B"/>
      <circle cx="60" cy="48" r="20" fill="#F5E6D3"/>
      <circle cx="52" cy="70" r="3" fill="#2C1810"/>
      <circle cx="68" cy="70" r="3" fill="#2C1810"/>
      <path d="M 52 79 Q 60 84 68 79" stroke="#D4C5B0" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#DC3545"/>
    </svg>`
  },
  {
    id: 'avatar-10',
    name: 'Person 10',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" fill="#F5F5F5"/>
      <ellipse cx="60" cy="75" rx="28" ry="32" fill="#E0C4A8"/>
      <ellipse cx="60" cy="40" rx="24" ry="26" fill="#6C757D"/>
      <circle cx="52" cy="70" r="3" fill="#2C1810"/>
      <circle cx="68" cy="70" r="3" fill="#2C1810"/>
      <path d="M 53 80 Q 60 83 67 80" stroke="#C4A484" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="40" y="95" width="40" height="25" rx="4" fill="#6C757D"/>
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
