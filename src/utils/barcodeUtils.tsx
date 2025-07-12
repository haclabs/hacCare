/**
 * Barcode Utility Functions
 * 
 * Utilities for generating Code-128 barcodes and other barcode formats
 * used throughout the hospital management system.
 */

/**
 * Code-128 character set mapping
 * Maps characters to their Code-128 values
 */
const CODE128_CHARSET = {
  ' ': 0, '!': 1, '"': 2, '#': 3, '$': 4, '%': 5, '&': 6, "'": 7,
  '(': 8, ')': 9, '*': 10, '+': 11, ',': 12, '-': 13, '.': 14, '/': 15,
  '0': 16, '1': 17, '2': 18, '3': 19, '4': 20, '5': 21, '6': 22, '7': 23,
  '8': 24, '9': 25, ':': 26, ';': 27, '<': 28, '=': 29, '>': 30, '?': 31,
  '@': 32, 'A': 33, 'B': 34, 'C': 35, 'D': 36, 'E': 37, 'F': 38, 'G': 39,
  'H': 40, 'I': 41, 'J': 42, 'K': 43, 'L': 44, 'M': 45, 'N': 46, 'O': 47,
  'P': 48, 'Q': 49, 'R': 50, 'S': 51, 'T': 52, 'U': 53, 'V': 54, 'W': 55,
  'X': 56, 'Y': 57, 'Z': 58, '[': 59, '\\': 60, ']': 61, '^': 62, '_': 63,
  '`': 64, 'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70, 'g': 71,
  'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79,
  'p': 80, 'q': 81, 'r': 82, 's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87,
  'x': 88, 'y': 89, 'z': 90, '{': 91, '|': 92, '}': 93, '~': 94
};

/**
 * Code-128 bar patterns
 * Each pattern represents the bar/space pattern for a character
 */
const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011'
];

/**
 * Generate Code-128 barcode pattern
 * Creates a proper Code-128 barcode with start, data, checksum, and stop codes
 * 
 * @param {string} data - Data to encode in the barcode
 * @returns {string} Binary pattern string for the barcode
 */
export const generateCode128Pattern = (data: string): string => {
  // Start with Code B (104)
  let pattern = CODE128_PATTERNS[104];
  let checksum = 104;
  
  // Add data characters
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    const value = CODE128_CHARSET[char as keyof typeof CODE128_CHARSET];
    
    if (value !== undefined) {
      pattern += CODE128_PATTERNS[value];
      checksum += value * (i + 1);
    }
  }
  
  // Add checksum
  const checksumValue = checksum % 103;
  pattern += CODE128_PATTERNS[checksumValue];
  
  // Add stop pattern
  pattern += CODE128_PATTERNS[106]; // Stop pattern
  pattern += '11'; // Final bars
  
  return pattern;
};

/**
 * Generate SVG barcode element
 * Creates an SVG representation of a Code-128 barcode
 * 
 * @param {string} data - Data to encode
 * @param {Object} options - Barcode options
 * @param {number} options.width - Total width of the barcode
 * @param {number} options.height - Height of the barcode bars
 * @param {boolean} options.showText - Whether to show text below barcode
 * @returns {JSX.Element} SVG barcode element
 */
export const generateCode128SVG = (
  data: string, 
  options: {
    width?: number;
    height?: number;
    showText?: boolean;
    className?: string;
  } = {}
): JSX.Element => {
  const {
    width = 200,
    height = 50,
    showText = true,
    className = ''
  } = options;

  const pattern = generateCode128Pattern(data);
  const barWidth = width / pattern.length;
  
  const bars = [];
  let x = 0;
  
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      bars.push(
        <rect
          key={i}
          x={x}
          y={0}
          width={barWidth}
          height={height}
          fill="#000000"
        />
      );
    }
    x += barWidth;
  }
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="border border-gray-300 bg-white"
      >
        {bars}
      </svg>
      {showText && (
        <div className="text-xs font-mono mt-1 text-center text-gray-700">
          {data}
        </div>
      )}
    </div>
  );
};

/**
 * Validate data for Code-128 encoding
 * Checks if the data contains only valid Code-128 characters
 * 
 * @param {string} data - Data to validate
 * @returns {boolean} True if data is valid for Code-128
 */
export const validateCode128Data = (data: string): boolean => {
  for (const char of data) {
    if (!(char in CODE128_CHARSET)) {
      return false;
    }
  }
  return true;
};

/**
 * Generate simple barcode pattern (for non-Code-128 uses)
 * Creates a simple barcode pattern for display purposes
 * 
 * @param {string} data - Data to encode
 * @returns {Array} Array of bar objects with width and height
 */
export const generateSimpleBarcodePattern = (data: string) => {
  return data.split('').map((char, index) => {
    const charCode = char.charCodeAt(0);
    const width = (charCode % 3) + 2;
    const isWide = index % 2 === 0;
    return { 
      width: `${width * 2}px`, 
      height: isWide ? '32px' : '28px'
    };
  });
};