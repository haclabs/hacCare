/**
 * Patient Avatar System
 * 10 diverse, realistic patient avatar options
 * More detailed and lifelike representations suitable for healthcare
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
      <!-- Younger male with brown hair -->
      <circle cx="60" cy="60" r="58" fill="#C8E6F5"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#D4A574"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#5B9BD5"/>
      <!-- Collar -->
      <path d="M 55 100 L 52 108 L 68 108 L 65 100" fill="white"/>
      <!-- Face -->
      <ellipse cx="60" cy="70" rx="26" ry="30" fill="#D4A574"/>
      <!-- Hair -->
      <path d="M 34 50 Q 34 30 60 28 Q 86 30 86 50 L 86 58 Q 82 54 75 54 Q 68 54 60 56 Q 52 54 45 54 Q 38 54 34 58 Z" fill="#5C4033"/>
      <!-- Ears -->
      <ellipse cx="34" cy="70" rx="6" ry="10" fill="#C9956F"/>
      <ellipse cx="86" cy="70" rx="6" ry="10" fill="#C9956F"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="68" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="69" r="3" fill="#2C1810"/>
      <circle cx="49" cy="68" r="1.5" fill="white"/>
      <ellipse cx="72" cy="68" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="69" r="3" fill="#2C1810"/>
      <circle cx="73" cy="68" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 42 60 Q 48 58 54 60" stroke="#3D2817" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 66 60 Q 72 58 78 60" stroke="#3D2817" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 72 L 57 80 M 60 72 L 63 80" stroke="#B8956A" stroke-width="1.5" fill="none"/>
      <path d="M 57 80 Q 60 82 63 80" stroke="#B8956A" stroke-width="1.5" fill="none"/>
      <!-- Mouth -->
      <path d="M 51 88 Q 60 92 69 88" stroke="#8B6F47" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-2',
    name: 'Person 2',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Elderly male with glasses and gray hair -->
      <circle cx="60" cy="60" r="58" fill="#F5F0E8"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#E8CBA8"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#7D8A96"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="27" ry="31" fill="#F0D5B5"/>
      <!-- Hair (receding, gray) -->
      <path d="M 38 48 Q 42 38 60 36 Q 78 38 82 48" fill="#C0C0C0"/>
      <path d="M 36 50 L 36 65 Q 38 62 42 62" fill="#C0C0C0"/>
      <path d="M 84 50 L 84 65 Q 82 62 78 62" fill="#C0C0C0"/>
      <!-- Ears -->
      <ellipse cx="33" cy="72" rx="7" ry="12" fill="#E0C5A5"/>
      <ellipse cx="87" cy="72" rx="7" ry="12" fill="#E0C5A5"/>
      <!-- Glasses -->
      <circle cx="47" cy="70" r="9" stroke="#555" stroke-width="2" fill="none"/>
      <circle cx="73" cy="70" r="9" stroke="#555" stroke-width="2" fill="none"/>
      <line x1="56" y1="70" x2="64" y2="70" stroke="#555" stroke-width="2"/>
      <line x1="38" y1="70" x2="33" y2="72" stroke="#555" stroke-width="1.5"/>
      <line x1="82" y1="70" x2="87" y2="72" stroke="#555" stroke-width="1.5"/>
      <!-- Eyes behind glasses -->
      <circle cx="47" cy="70" r="3" fill="#4A6A7C"/>
      <circle cx="73" cy="70" r="3" fill="#4A6A7C"/>
      <!-- Eyebrows (gray) -->
      <path d="M 40 62 Q 47 60 54 62" stroke="#A8A8A8" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 66 62 Q 73 60 80 62" stroke="#A8A8A8" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#D0B595" stroke-width="1.5" fill="none"/>
      <path d="M 57 82 Q 60 84 63 82" stroke="#D0B595" stroke-width="1.5" fill="none"/>
      <!-- Smile lines -->
      <path d="M 48 82 Q 50 86 52 88" stroke="#D0B595" stroke-width="1" fill="none"/>
      <path d="M 72 82 Q 70 86 68 88" stroke="#D0B595" stroke-width="1" fill="none"/>
      <!-- Mouth -->
      <path d="M 51 90 Q 60 93 69 90" stroke="#B8956A" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-3',
    name: 'Person 3',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Elderly female with blonde/gray hair -->
      <circle cx="60" cy="60" r="58" fill="#FAF5F0"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#E8D5C5"/>
      <!-- Blouse -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#D4A8C8"/>
      <circle cx="60" cy="108" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="60" cy="115" r="2.5" fill="white" opacity="0.7"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="26" ry="30" fill="#F5E5D5"/>
      <!-- Hair (short, wavy, light) -->
      <path d="M 34 52 Q 34 35 60 33 Q 86 35 86 52 L 86 72 Q 82 68 76 68 L 76 56 Q 70 54 60 54 Q 50 54 44 56 L 44 68 Q 38 68 34 72 Z" fill="#E8D5A8"/>
      <!-- Ears -->
      <ellipse cx="34" cy="72" rx="6" ry="10" fill="#E8D5C5"/>
      <ellipse cx="86" cy="72" rx="6" ry="10" fill="#E8D5C5"/>
      <circle cx="34" cy="70" r="3" fill="#C9B89A" opacity="0.5"/>
      <circle cx="86" cy="70" r="3" fill="#C9B89A" opacity="0.5"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="71" r="3" fill="#6FA8DC"/>
      <circle cx="49" cy="70" r="1.5" fill="white"/>
      <ellipse cx="72" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="71" r="3" fill="#6FA8DC"/>
      <circle cx="73" cy="70" r="1.5" fill="white"/>
      <!-- Eyelashes -->
      <path d="M 43 68 L 42 66" stroke="#4A4A4A" stroke-width="0.8"/>
      <path d="M 46 67 L 45 65" stroke="#4A4A4A" stroke-width="0.8"/>
      <path d="M 50 67 L 50 65" stroke="#4A4A4A" stroke-width="0.8"/>
      <path d="M 70 67 L 70 65" stroke="#4A4A4A" stroke-width="0.8"/>
      <path d="M 74 67 L 75 65" stroke="#4A4A4A" stroke-width="0.8"/>
      <path d="M 77 68 L 78 66" stroke="#4A4A4A" stroke-width="0.8"/>
      <!-- Eyebrows -->
      <path d="M 42 62 Q 48 60 54 62" stroke="#C8B590" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M 66 62 Q 72 60 78 62" stroke="#C8B590" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#E0CDB5" stroke-width="1.5" fill="none"/>
      <path d="M 57 82 Q 60 83 63 82" stroke="#E0CDB5" stroke-width="1.5" fill="none"/>
      <!-- Smile -->
      <path d="M 50 89 Q 60 94 70 89" stroke="#D5B8A5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-4',
    name: 'Person 4',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Middle-aged male with dark curly hair -->
      <circle cx="60" cy="60" r="58" fill="#E8F0F8"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#8B6F47"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#4A6FA5"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="27" ry="31" fill="#A0785A"/>
      <!-- Hair (curly, dark) -->
      <path d="M 33 48 Q 33 32 60 30 Q 87 32 87 48 Q 87 56 82 60 Q 80 58 78 58 Q 76 60 72 60 Q 70 58 66 58 Q 64 60 60 60 Q 56 58 54 58 Q 52 60 48 60 Q 46 58 42 58 Q 40 58 38 60 Q 33 56 33 48" fill="#2C1810"/>
      <circle cx="40" cy="42" r="5" fill="#1A1208"/>
      <circle cx="52" cy="38" r="5" fill="#1A1208"/>
      <circle cx="68" cy="38" r="5" fill="#1A1208"/>
      <circle cx="80" cy="42" r="5" fill="#1A1208"/>
      <!-- Ears -->
      <ellipse cx="33" cy="72" rx="7" ry="12" fill="#906F4A"/>
      <ellipse cx="87" cy="72" rx="7" ry="12" fill="#906F4A"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="49" cy="70" r="1.5" fill="white"/>
      <ellipse cx="72" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="73" cy="70" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 41 62 Q 48 60 55 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 65 62 Q 72 60 79 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#8B6840" stroke-width="1.8" fill="none"/>
      <path d="M 56 82 Q 60 84 64 82" stroke="#8B6840" stroke-width="1.8" fill="none"/>
      <!-- Mouth -->
      <path d="M 50 90 Q 60 94 70 90" stroke="#6B5035" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Facial hair shadow -->
      <ellipse cx="60" cy="92" rx="12" ry="6" fill="#2C1810" opacity="0.15"/>
    </svg>`
  },
  {
    id: 'avatar-5',
    name: 'Person 5',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Middle-aged female with shoulder-length brown hair -->
      <circle cx="60" cy="60" r="58" fill="#FFF5F0"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#E8CBA8"/>
      <!-- Top -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#E67E73"/>
      <circle cx="60" cy="108" r="2.5" fill="white" opacity="0.8"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="26" ry="30" fill="#F0D5B5"/>
      <!-- Hair (shoulder length, brown) -->
      <path d="M 30 52 Q 30 35 60 33 Q 90 35 90 52 L 90 85 Q 88 88 84 90 L 84 60 Q 78 58 70 58 Q 60 60 50 58 Q 42 58 36 60 L 36 90 Q 32 88 30 85 Z" fill="#6B4423"/>
      <!-- Ears (partially visible) -->
      <ellipse cx="34" cy="72" rx="5" ry="10" fill="#E8CBA8"/>
      <ellipse cx="86" cy="72" rx="5" ry="10" fill="#E8CBA8"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="71" r="3.5" fill="#8B7355"/>
      <circle cx="49" cy="70" r="1.5" fill="white"/>
      <ellipse cx="72" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="71" r="3.5" fill="#8B7355"/>
      <circle cx="73" cy="70" r="1.5" fill="white"/>
      <!-- Eyeliner -->
      <path d="M 43 70 Q 48 68 53 70" stroke="#4A4A4A" stroke-width="1" fill="none"/>
      <path d="M 67 70 Q 72 68 77 70" stroke="#4A4A4A" stroke-width="1" fill="none"/>
      <!-- Eyebrows -->
      <path d="M 42 62 Q 48 60 54 62" stroke="#5A3D2B" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 66 62 Q 72 60 78 62" stroke="#5A3D2B" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#D5B895" stroke-width="1.5" fill="none"/>
      <path d="M 57 82 Q 60 83 63 82" stroke="#D5B895" stroke-width="1.5" fill="none"/>
      <!-- Smile -->
      <path d="M 50 89 Q 60 94 70 89" stroke="#C8A585" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Blush -->
      <ellipse cx="45" cy="78" rx="6" ry="4" fill="#F5A9A9" opacity="0.4"/>
      <ellipse cx="75" cy="78" rx="6" ry="4" fill="#F5A9A9" opacity="0.4"/>
    </svg>`
  },
  {
    id: 'avatar-6',
    name: 'Person 6',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Young adult with short dark hair and medium skin tone -->
      <circle cx="60" cy="60" r="58" fill="#E8E8F5"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#9B7A59"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#5A7A9B"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="27" ry="31" fill="#B89968"/>
      <!-- Hair (short, dark) -->
      <path d="M 33 50 Q 33 32 60 30 Q 87 32 87 50 L 87 60 Q 83 56 78 56 L 78 52 Q 72 50 60 50 Q 48 50 42 52 L 42 56 Q 37 56 33 60 Z" fill="#2C2820"/>
      <!-- Ears -->
      <ellipse cx="33" cy="72" rx="7" ry="12" fill="#A88958"/>
      <ellipse cx="87" cy="72" rx="7" ry="12" fill="#A88958"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="49" cy="70" r="1.5" fill="white"/>
      <ellipse cx="72" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="73" cy="70" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 41 62 Q 48 60 55 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 65 62 Q 72 60 79 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#9B7A4A" stroke-width="1.8" fill="none"/>
      <path d="M 56 82 Q 60 84 64 82" stroke="#9B7A4A" stroke-width="1.8" fill="none"/>
      <!-- Mouth -->
      <path d="M 50 90 Q 60 94 70 90" stroke="#7A5A3A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-7',
    name: 'Person 7',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Female with red/auburn hair, glasses -->
      <circle cx="60" cy="60" r="58" fill="#FFF8F0"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#F0D5B5"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#9B4D9B"/>
      <line x1="60" y1="100" x2="60" y2="120" stroke="#7A3D7A" stroke-width="1"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="26" ry="30" fill="#F5DCC8"/>
      <!-- Hair (wavy, auburn) -->
      <path d="M 32 50 Q 32 33 60 31 Q 88 33 88 50 L 88 78 Q 86 82 82 85 L 82 58 Q 76 56 68 56 Q 60 58 52 56 Q 44 56 38 58 L 38 85 Q 34 82 32 78 Z" fill="#A0522D"/>
      <!-- Ears -->
      <ellipse cx="34" cy="72" rx="6" ry="10" fill="#E8CBA8"/>
      <ellipse cx="86" cy="72" rx="6" ry="10" fill="#E8CBA8"/>
      <!-- Glasses (thin frames) -->
      <circle cx="47" cy="70" r="8" stroke="#8B4513" stroke-width="1.8" fill="none"/>
      <circle cx="73" cy="70" r="8" stroke="#8B4513" stroke-width="1.8" fill="none"/>
      <line x1="55" y1="70" x2="65" y2="70" stroke="#8B4513" stroke-width="1.8"/>
      <line x1="39" y1="70" x2="34" y2="72" stroke="#8B4513" stroke-width="1.5"/>
      <line x1="81" y1="70" x2="86" y2="72" stroke="#8B4513" stroke-width="1.5"/>
      <!-- Eyes -->
      <circle cx="47" cy="70" r="3.5" fill="#4A7C59"/>
      <circle cx="47" cy="69" r="1.5" fill="white"/>
      <circle cx="73" cy="70" r="3.5" fill="#4A7C59"/>
      <circle cx="73" cy="69" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 40 62 Q 47 60 54 62" stroke="#8B4513" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 66 62 Q 73 60 80 62" stroke="#8B4513" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#E0CDB5" stroke-width="1.5" fill="none"/>
      <path d="M 57 82 Q 60 83 63 82" stroke="#E0CDB5" stroke-width="1.5" fill="none"/>
      <!-- Smile -->
      <path d="M 50 89 Q 60 94 70 89" stroke="#D5B8A5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Freckles -->
      <circle cx="52" cy="76" r="0.8" fill="#C8956F" opacity="0.6"/>
      <circle cx="68" cy="76" r="0.8" fill="#C8956F" opacity="0.6"/>
      <circle cx="55" cy="78" r="0.8" fill="#C8956F" opacity="0.6"/>
      <circle cx="65" cy="78" r="0.8" fill="#C8956F" opacity="0.6"/>
    </svg>`
  },
  {
    id: 'avatar-8',
    name: 'Person 8',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Asian features, black hair, younger -->
      <circle cx="60" cy="60" r="58" fill="#F5F5FA"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#F0D5B0"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#6BA3A0"/>
      <path d="M 55 100 L 52 110 L 68 110 L 65 100" fill="white" opacity="0.8"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="26" ry="29" fill="#FAEBD7"/>
      <!-- Hair (straight, black) -->
      <path d="M 34 48 Q 34 32 60 30 Q 86 32 86 48 L 86 58 Q 82 54 76 54 Q 70 54 60 56 Q 50 54 44 54 Q 38 54 34 58 Z" fill="#1A1A1A"/>
      <!-- Side hair -->
      <path d="M 34 55 L 34 70 Q 36 68 40 68" fill="#1A1A1A"/>
      <path d="M 86 55 L 86 70 Q 84 68 80 68" fill="#1A1A1A"/>
      <!-- Ears -->
      <ellipse cx="34" cy="72" rx="6" ry="10" fill="#F0D5B0"/>
      <ellipse cx="86" cy="72" rx="6" ry="10" fill="#F0D5B0"/>
      <!-- Eyes (slightly different shape) -->
      <ellipse cx="47" cy="70" rx="6" ry="5" fill="white"/>
      <circle cx="48" cy="71" r="3" fill="#2C1810"/>
      <circle cx="48" cy="70" r="1.2" fill="white"/>
      <ellipse cx="73" cy="70" rx="6" ry="5" fill="white"/>
      <circle cx="74" cy="71" r="3" fill="#2C1810"/>
      <circle cx="74" cy="70" r="1.2" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 41 63 Q 47 61 53 63" stroke="#1A1A1A" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 67 63 Q 73 61 79 63" stroke="#1A1A1A" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 58 81 M 60 74 L 62 81" stroke="#E8D0B0" stroke-width="1.2" fill="none"/>
      <path d="M 58 81 Q 60 82 62 81" stroke="#E8D0B0" stroke-width="1.2" fill="none"/>
      <!-- Mouth -->
      <path d="M 51 89 Q 60 93 69 89" stroke="#D5B8A5" stroke-width="2.3" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-9',
    name: 'Person 9',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Elderly female with short silver hair -->
      <circle cx="60" cy="60" r="58" fill="#F8F5F0"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#E8D5C5"/>
      <!-- Clothing -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#A57C9B"/>
      <ellipse cx="60" cy="108" rx="8" ry="5" fill="white" opacity="0.6"/>
      <!-- Face -->
      <ellipse cx="60" cy="74" rx="25" ry="29" fill="#F5E8DC"/>
      <!-- Hair (short, silver) -->
      <path d="M 35 52 Q 35 36 60 34 Q 85 36 85 52 L 85 68 Q 82 64 78 64 L 78 56 Q 72 54 60 54 Q 48 54 42 56 L 42 64 Q 38 64 35 68 Z" fill="#D0D0D5"/>
      <!-- Soft curls -->
      <circle cx="42" cy="48" r="4" fill="#C8C8D0"/>
      <circle cx="52" cy="44" r="4" fill="#C8C8D0"/>
      <circle cx="68" cy="44" r="4" fill="#C8C8D0"/>
      <circle cx="78" cy="48" r="4" fill="#C8C8D0"/>
      <!-- Ears -->
      <ellipse cx="35" cy="74" rx="6" ry="10" fill="#E8D5C5"/>
      <ellipse cx="85" cy="74" rx="6" ry="10" fill="#E8D5C5"/>
      <!-- Pearl earrings -->
      <circle cx="35" cy="78" r="3.5" fill="#F0E8E0" stroke="#D0C8C0" stroke-width="0.5"/>
      <circle cx="85" cy="78" r="3.5" fill="#F0E8E0" stroke="#D0C8C0" stroke-width="0.5"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="72" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="73" r="3" fill="#5A7C9B"/>
      <circle cx="49" cy="72" r="1.5" fill="white"/>
      <ellipse cx="72" cy="72" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="73" r="3" fill="#5A7C9B"/>
      <circle cx="73" cy="72" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 42 64 Q 48 62 54 64" stroke="#B0B0B8" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M 66 64 Q 72 62 78 64" stroke="#B0B0B8" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <!-- Smile lines -->
      <path d="M 47 80 Q 49 84 51 87" stroke="#E0D0C5" stroke-width="1" fill="none"/>
      <path d="M 73 80 Q 71 84 69 87" stroke="#E0D0C5" stroke-width="1" fill="none"/>
      <!-- Nose -->
      <path d="M 60 76 L 57 84 M 60 76 L 63 84" stroke="#E0D0C5" stroke-width="1.5" fill="none"/>
      <path d="M 57 84 Q 60 85 63 84" stroke="#E0D0C5" stroke-width="1.5" fill="none"/>
      <!-- Gentle smile -->
      <path d="M 50 92 Q 60 96 70 92" stroke="#D5C0B5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-10',
    name: 'Person 10',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Young adult with medium-dark complexion, short hair -->
      <circle cx="60" cy="60" r="58" fill="#E8F0F5"/>
      <!-- Neck -->
      <rect x="50" y="95" width="20" height="25" fill="#8B6F47"/>
      <!-- Shirt -->
      <path d="M 35 105 L 40 120 L 80 120 L 85 105 Q 75 100 60 100 Q 45 100 35 105" fill="#6B8E9B"/>
      <!-- Collar -->
      <path d="M 55 100 L 52 108 L 68 108 L 65 100" fill="white"/>
      <circle cx="60" cy="105" r="1.5" fill="#5A7D8A"/>
      <!-- Face -->
      <ellipse cx="60" cy="72" rx="27" ry="31" fill="#A0785A"/>
      <!-- Hair (short, dark, fade) -->
      <path d="M 33 50 Q 33 32 60 30 Q 87 32 87 50 L 87 62 Q 83 58 78 58 L 78 52 Q 72 50 60 50 Q 48 50 42 52 L 42 58 Q 37 58 33 62 Z" fill="#2C2820"/>
      <!-- Ears -->
      <ellipse cx="33" cy="72" rx="7" ry="12" fill="#906F4A"/>
      <ellipse cx="87" cy="72" rx="7" ry="12" fill="#906F4A"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="49" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="49" cy="70" r="1.5" fill="white"/>
      <ellipse cx="72" cy="70" rx="5" ry="6" fill="white"/>
      <circle cx="73" cy="71" r="3.5" fill="#3D2817"/>
      <circle cx="73" cy="70" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 41 62 Q 48 60 55 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M 65 62 Q 72 60 79 62" stroke="#1A1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 74 L 57 82 M 60 74 L 63 82" stroke="#8B6840" stroke-width="1.8" fill="none"/>
      <path d="M 56 82 Q 60 84 64 82" stroke="#8B6840" stroke-width="1.8" fill="none"/>
      <!-- Mouth -->
      <path d="M 50 90 Q 60 94 70 90" stroke="#6B5035" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Stubble -->
      <ellipse cx="60" cy="93" rx="14" ry="7" fill="#2C2820" opacity="0.12"/>
    </svg>`
  },
  {
    id: 'avatar-newborn',
    name: 'Newborn (0-28 days)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Newborn baby -->
      <circle cx="60" cy="60" r="58" fill="#FFF8F0"/>
      <!-- Body/Blanket -->
      <ellipse cx="60" cy="100" rx="35" ry="20" fill="#C8E6F5"/>
      <!-- Small swaddled body -->
      <ellipse cx="60" cy="95" rx="28" ry="25" fill="#E3F2FD"/>
      <!-- Head (larger proportion for newborn) -->
      <circle cx="60" cy="55" r="32" fill="#FFE4D6"/>
      <!-- Baby hat -->
      <path d="M 28 48 Q 28 30 60 28 Q 92 30 92 48 L 92 52 L 28 52 Z" fill="#C8E6F5"/>
      <rect x="28" y="48" width="64" height="4" fill="#A3D5F0"/>
      <!-- Tiny ears -->
      <ellipse cx="28" cy="58" rx="4" ry="6" fill="#FFD4C6"/>
      <ellipse cx="92" cy="58" rx="4" ry="6" fill="#FFD4C6"/>
      <!-- Closed peaceful eyes -->
      <path d="M 44 58 Q 48 60 52 58" stroke="#8B7355" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 68 58 Q 72 60 76 58" stroke="#8B7355" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Small nose -->
      <circle cx="60" cy="64" r="2.5" fill="#FFD4C6"/>
      <!-- Small mouth (peaceful) -->
      <ellipse cx="60" cy="72" rx="6" ry="3" fill="#FFB3B3" opacity="0.5"/>
      <!-- Rosy cheeks -->
      <circle cx="45" cy="64" r="6" fill="#FFB3B3" opacity="0.3"/>
      <circle cx="75" cy="64" r="6" fill="#FFB3B3" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'avatar-infant',
    name: 'Infant (1-12 months)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Infant baby -->
      <circle cx="60" cy="60" r="58" fill="#FFF5E6"/>
      <!-- Onesie body -->
      <ellipse cx="60" cy="100" rx="30" ry="20" fill="#FFE4B5"/>
      <path d="M 30 90 L 30 110 L 50 110 L 50 105 Q 55 103 60 103 Q 65 103 70 105 L 70 110 L 90 110 L 90 90" fill="#FFE4B5"/>
      <!-- Head -->
      <circle cx="60" cy="58" r="28" fill="#FFE4D6"/>
      <!-- Little hair tuft -->
      <path d="M 50 32 Q 60 28 70 32" fill="#8B6914" opacity="0.6"/>
      <!-- Ears -->
      <ellipse cx="32" cy="60" rx="5" ry="8" fill="#FFD4C6"/>
      <ellipse cx="88" cy="60" rx="5" ry="8" fill="#FFD4C6"/>
      <!-- Big curious eyes -->
      <ellipse cx="48" cy="56" rx="6" ry="7" fill="white"/>
      <circle cx="49" cy="57" r="4" fill="#4A6A7C"/>
      <circle cx="49" cy="56" r="2" fill="white"/>
      <ellipse cx="72" cy="56" rx="6" ry="7" fill="white"/>
      <circle cx="73" cy="57" r="4" fill="#4A6A7C"/>
      <circle cx="73" cy="56" r="2" fill="white"/>
      <!-- Eyebrows (thin baby brows) -->
      <path d="M 42 48 Q 48 46 54 48" stroke="#B8956A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M 66 48 Q 72 46 78 48" stroke="#B8956A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <!-- Button nose -->
      <circle cx="60" cy="64" r="3" fill="#FFD4C6"/>
      <!-- Happy baby smile -->
      <path d="M 50 72 Q 60 76 70 72" stroke="#FFB3B3" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Rosy cheeks -->
      <circle cx="42" cy="64" r="7" fill="#FFB3B3" opacity="0.3"/>
      <circle cx="78" cy="64" r="7" fill="#FFB3B3" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'avatar-toddler',
    name: 'Toddler (1-3 years)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Toddler -->
      <circle cx="60" cy="60" r="58" fill="#FFF9E6"/>
      <!-- T-shirt body -->
      <path d="M 35 95 L 40 115 L 55 115 L 55 105 Q 60 103 60 103 Q 60 103 65 105 L 65 115 L 80 115 L 85 95" fill="#FF6B9D"/>
      <rect x="40" y="90" width="40" height="15" fill="#FF6B9D"/>
      <!-- Neck -->
      <rect x="52" y="85" width="16" height="10" fill="#FFE4D6"/>
      <!-- Head -->
      <ellipse cx="60" cy="62" rx="24" ry="26" fill="#FFE4D6"/>
      <!-- Messy toddler hair -->
      <path d="M 36 42 Q 36 32 60 30 Q 84 32 84 42 L 84 52 Q 80 48 72 48 Q 64 50 60 52 Q 56 50 48 48 Q 40 48 36 52 Z" fill="#F4A460"/>
      <!-- Ears -->
      <ellipse cx="36" cy="64" rx="5" ry="8" fill="#FFD4C6"/>
      <ellipse cx="84" cy="64" rx="5" ry="8" fill="#FFD4C6"/>
      <!-- Big toddler eyes -->
      <ellipse cx="48" cy="60" rx="6" ry="7" fill="white"/>
      <circle cx="49" cy="61" r="4" fill="#654321"/>
      <circle cx="49" cy="60" r="2" fill="white"/>
      <ellipse cx="72" cy="60" rx="6" ry="7" fill="white"/>
      <circle cx="73" cy="61" r="4" fill="#654321"/>
      <circle cx="73" cy="60" r="2" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 42 52 Q 48 50 54 52" stroke="#C68642" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 66 52 Q 72 50 78 52" stroke="#C68642" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Button nose -->
      <circle cx="60" cy="68" r="3" fill="#FFD4C6"/>
      <!-- Big toddler smile -->
      <path d="M 48 76 Q 60 80 72 76" stroke="#D27979" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Chubby cheeks -->
      <circle cx="42" cy="68" r="8" fill="#FFB3B3" opacity="0.3"/>
      <circle cx="78" cy="68" r="8" fill="#FFB3B3" opacity="0.3"/>
    </svg>`
  },
  {
    id: 'avatar-preschool',
    name: 'Preschool (3-5 years)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Preschool child -->
      <circle cx="60" cy="60" r="58" fill="#FFF5F0"/>
      <!-- Shirt -->
      <path d="M 35 100 L 40 118 L 55 118 L 55 105 L 65 105 L 65 118 L 80 118 L 85 100" fill="#FFD700"/>
      <rect x="42" y="95" width="36" height="12" fill="#FFD700"/>
      <!-- Neck -->
      <rect x="52" y="88" width="16" height="10" fill="#F5D5B8"/>
      <!-- Head -->
      <ellipse cx="60" cy="64" rx="23" ry="25" fill="#F5D5B8"/>
      <!-- Playful hair with ponytail/pigtails style -->
      <path d="M 37 44 Q 37 34 60 32 Q 83 34 83 44 L 83 50 Q 78 46 70 46 Q 62 48 60 50 Q 58 48 50 46 Q 42 46 37 50 Z" fill="#2C1810"/>
      <!-- Hair accessories (bow) -->
      <path d="M 35 48 L 30 50 L 35 52" fill="#FF69B4"/>
      <path d="M 85 48 L 90 50 L 85 52" fill="#FF69B4"/>
      <!-- Ears -->
      <ellipse cx="37" cy="66" rx="5" ry="8" fill="#E5C5A8"/>
      <ellipse cx="83" cy="66" rx="5" ry="8" fill="#E5C5A8"/>
      <!-- Bright eyes -->
      <ellipse cx="49" cy="62" rx="5" ry="6" fill="white"/>
      <circle cx="50" cy="63" r="3.5" fill="#6B4423"/>
      <circle cx="50" cy="62" r="1.5" fill="white"/>
      <ellipse cx="71" cy="62" rx="5" ry="6" fill="white"/>
      <circle cx="72" cy="63" r="3.5" fill="#6B4423"/>
      <circle cx="72" cy="62" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 43 55 Q 49 53 55 55" stroke="#2C1810" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 65 55 Q 71 53 77 55" stroke="#2C1810" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 66 L 58 72" stroke="#D5B598" stroke-width="1.5" fill="none"/>
      <path d="M 58 72 Q 60 73 62 72" stroke="#D5B598" stroke-width="1.5" fill="none"/>
      <!-- Happy smile -->
      <path d="M 49 80 Q 60 84 71 80" stroke="#B8675A" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-schoolage',
    name: 'School Age (6-12 years)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- School age child -->
      <circle cx="60" cy="60" r="58" fill="#F0F8FF"/>
      <!-- Hoodie/casual shirt -->
      <path d="M 35 102 L 38 118 L 55 118 L 55 108 L 65 108 L 65 118 L 82 118 L 85 102" fill="#4169E1"/>
      <rect x="40" y="98" width="40" height="12" fill="#4169E1"/>
      <!-- Hood outline -->
      <path d="M 40 98 Q 38 94 40 90 L 45 90 M 80 98 Q 82 94 80 90 L 75 90" stroke="#2F4F7F" stroke-width="2" fill="none"/>
      <!-- Neck -->
      <rect x="52" y="90" width="16" height="10" fill="#D4A574"/>
      <!-- Head -->
      <ellipse cx="60" cy="66" rx="22" ry="24" fill="#D4A574"/>
      <!-- School-age hair (neat, styled) -->
      <path d="M 38 46 Q 38 36 60 34 Q 82 36 82 46 L 82 54 Q 78 50 70 50 Q 62 52 60 54 Q 58 52 50 50 Q 42 50 38 54 Z" fill="#4A3728"/>
      <!-- Ears -->
      <ellipse cx="38" cy="68" rx="5" ry="9" fill="#C9956F"/>
      <ellipse cx="82" cy="68" rx="5" ry="9" fill="#C9956F"/>
      <!-- Eyes (alert, curious) -->
      <ellipse cx="49" cy="64" rx="5" ry="6" fill="white"/>
      <circle cx="50" cy="65" r="3" fill="#3D2817"/>
      <circle cx="50" cy="64" r="1.5" fill="white"/>
      <ellipse cx="71" cy="64" rx="5" ry="6" fill="white"/>
      <circle cx="72" cy="65" r="3" fill="#3D2817"/>
      <circle cx="72" cy="64" r="1.5" fill="white"/>
      <!-- Eyebrows -->
      <path d="M 43 57 Q 49 55 55 57" stroke="#3D2817" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 65 57 Q 71 55 77 57" stroke="#3D2817" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose -->
      <path d="M 60 68 L 58 74 M 60 68 L 62 74" stroke="#B8956A" stroke-width="1.5" fill="none"/>
      <path d="M 58 74 Q 60 76 62 74" stroke="#B8956A" stroke-width="1.5" fill="none"/>
      <!-- Friendly smile -->
      <path d="M 50 82 Q 60 86 70 82" stroke="#8B6F47" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'avatar-adolescent',
    name: 'Adolescent (13-18 years)',
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Adolescent/Teen -->
      <circle cx="60" cy="60" r="58" fill="#E8F4F8"/>
      <!-- Hoodie -->
      <path d="M 35 105 L 38 120 L 55 120 L 55 110 L 65 110 L 65 120 L 82 120 L 85 105" fill="#2C3E50"/>
      <rect x="40" y="100" width="40" height="12" fill="#2C3E50"/>
      <!-- Hood -->
      <path d="M 35 100 Q 32 95 35 88 L 42 88 Q 45 92 48 95" stroke="#1A252F" stroke-width="2" fill="#34495E"/>
      <path d="M 85 100 Q 88 95 85 88 L 78 88 Q 75 92 72 95" stroke="#1A252F" stroke-width="2" fill="#34495E"/>
      <!-- Neck -->
      <rect x="52" y="92" width="16" height="12" fill="#C9A882"/>
      <!-- Head (more defined features) -->
      <ellipse cx="60" cy="68" rx="22" ry="26" fill="#C9A882"/>
      <!-- Teen hair (longer, more styled) -->
      <path d="M 38 48 Q 38 34 60 32 Q 82 34 82 48 L 82 58 Q 78 52 68 50 Q 60 52 60 54 Q 58 52 52 50 Q 42 52 38 58 Z" fill="#3A2A1A"/>
      <!-- Side swept fringe -->
      <path d="M 38 48 Q 42 42 50 40 Q 58 40 65 42" fill="#3A2A1A"/>
      <!-- Ears -->
      <ellipse cx="38" cy="70" rx="5" ry="9" fill="#B8956A"/>
      <ellipse cx="82" cy="70" rx="5" ry="9" fill="#B8956A"/>
      <!-- Eyes (more mature, slightly narrower) -->
      <ellipse cx="49" cy="66" rx="5" ry="5" fill="white"/>
      <circle cx="50" cy="67" r="3" fill="#2C1810"/>
      <circle cx="50" cy="66" r="1.5" fill="white"/>
      <ellipse cx="71" cy="66" rx="5" ry="5" fill="white"/>
      <circle cx="72" cy="67" r="3" fill="#2C1810"/>
      <circle cx="72" cy="66" r="1.5" fill="white"/>
      <!-- Eyebrows (more defined) -->
      <path d="M 42 60 Q 49 58 56 60" stroke="#2C1810" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M 64 60 Q 71 58 78 60" stroke="#2C1810" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Nose (more defined) -->
      <path d="M 60 70 L 58 78 M 60 70 L 62 78" stroke="#A87A54" stroke-width="1.8" fill="none"/>
      <path d="M 57 78 Q 60 80 63 78" stroke="#A87A54" stroke-width="1.8" fill="none"/>
      <!-- Mouth (subtle smile) -->
      <path d="M 51 86 Q 60 88 69 86" stroke="#7A5C42" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`
  }
];

/**
 * Get avatar by ID
 */
export function getAvatarById(id: string): AvatarOption | undefined {
  return PATIENT_AVATARS.find(avatar => avatar.id === id);
}

/**
 * Get a random avatar ID
 */
export function getRandomAvatarId(): string {
  const randomIndex = Math.floor(Math.random() * PATIENT_AVATARS.length);
  return PATIENT_AVATARS[randomIndex].id;
}
