/**
 * Avery 5160 Label Positioning Guide
 * 
 * Physical Specifications:
 * - Sheet Size: 8.5" × 11"
 * - Label Size: 2.625" × 1" (2⅝" × 1")
 * - Layout: 3 columns × 10 rows = 30 labels
 * - Left Margin: 0.1875" (3/16")
 * - Top Margin: 0.5"
 * 
 * Testing Solutions:
 */

export const AVERY_5160_SPECS = {
  // Sheet dimensions
  SHEET_WIDTH: 8.5,      // inches
  SHEET_HEIGHT: 11,      // inches
  
  // Label dimensions
  LABEL_WIDTH: 2.625,    // inches (2⅝")
  LABEL_HEIGHT: 1,       // inches
  
  // Margins
  LEFT_MARGIN: 0.1875,   // inches (3/16")
  RIGHT_MARGIN: 0.1875,  // inches (3/16")
  TOP_MARGIN: 0.5,       // inches
  
  // Spacing
  HORIZONTAL_GAP: 0.125, // inches (1/8") between labels
  VERTICAL_GAP: 0,       // inches (no gap between rows)
  
  // Layout
  COLUMNS: 3,
  ROWS: 10,
  TOTAL_LABELS: 30
};

/**
 * Generate CSS for precise Avery 5160 positioning
 */
export const generateAvery5160CSS = (debugMode = false) => `
  .labels-container {
    position: relative;
    width: 8.5in;
    height: 11in;
    margin: 0 auto;
    ${debugMode ? 'border: 2px solid #ff0000;' : ''}
  }
  
  .label {
    position: absolute;
    width: 2.625in;
    height: 1in;
    ${debugMode ? 'border: 2px solid #ff0000 !important;' : 'border: 1px dashed #ccc;'}
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    overflow: hidden;
    ${debugMode ? 'background-color: rgba(255, 0, 0, 0.1);' : ''}
  }
  
  /* Column positioning - final perfect alignment */
  .label:nth-child(3n+1) { 
    left: 0.1875in; 
    ${debugMode ? 'background-color: rgba(255, 0, 0, 0.2);' : ''}
  }
  .label:nth-child(3n+2) { 
    left: 3.0375in; /* Final perfect position */
    ${debugMode ? 'background-color: rgba(0, 255, 0, 0.2);' : ''}
  }
  .label:nth-child(3n+3) { 
    left: 5.7875in; /* Final perfect position */
    ${debugMode ? 'background-color: rgba(0, 0, 255, 0.2);' : ''}
  }
  
  /* Row positioning */
  .label:nth-child(-n+3) { top: 0.5in; }
  .label:nth-child(n+4):nth-child(-n+6) { top: 1.5in; }
  .label:nth-child(n+7):nth-child(-n+9) { top: 2.5in; }
  .label:nth-child(n+10):nth-child(-n+12) { top: 3.5in; }
  .label:nth-child(n+13):nth-child(-n+15) { top: 4.5in; }
  .label:nth-child(n+16):nth-child(-n+18) { top: 5.5in; }
  .label:nth-child(n+19):nth-child(-n+21) { top: 6.5in; }
  .label:nth-child(n+22):nth-child(-n+24) { top: 7.5in; }
  .label:nth-child(n+25):nth-child(-n+27) { top: 8.5in; }
  .label:nth-child(n+28):nth-child(-n+30) { top: 9.5in; }
  
  ${debugMode ? `
    /* Debug grid lines */
    .labels-container::before {
      content: '';
      position: absolute;
      left: 0.1875in;
      top: 0;
      width: 1px;
      height: 100%;
      background: #ff0000;
      z-index: 1000;
    }
    
    .labels-container::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0.5in;
      width: 100%;
      height: 1px;
      background: #ff0000;
      z-index: 1000;
    }
    
    /* Column dividers */
    .debug-column-2::before {
      content: '';
      position: absolute;
      left: 2.8125in;
      top: 0;
      width: 1px;
      height: 100%;
      background: #00ff00;
      z-index: 999;
    }
    
    .debug-column-3::before {
      content: '';
      position: absolute;
      left: 5.4375in;
      top: 0;
      width: 1px;
      height: 100%;
      background: #0000ff;
      z-index: 999;
    }
  ` : ''}
  
  @media print {
    .label {
      border: none !important;
      background-color: transparent !important;
    }
    
    .labels-container {
      width: 8.5in !important;
      height: 11in !important;
      border: none !important;
    }
    
    .labels-container::before,
    .labels-container::after,
    .debug-column-2::before,
    .debug-column-3::before {
      display: none !important;
    }
  }
`;

/**
 * Calculate position for a specific label index (0-29)
 */
export const calculateLabelPosition = (index: number) => {
  const row = Math.floor(index / AVERY_5160_SPECS.COLUMNS);
  const col = index % AVERY_5160_SPECS.COLUMNS;
  
  const left = AVERY_5160_SPECS.LEFT_MARGIN + (col * (AVERY_5160_SPECS.LABEL_WIDTH + AVERY_5160_SPECS.HORIZONTAL_GAP));
  const top = AVERY_5160_SPECS.TOP_MARGIN + (row * (AVERY_5160_SPECS.LABEL_HEIGHT + AVERY_5160_SPECS.VERTICAL_GAP));
  
  return {
    left: `${left}in`,
    top: `${top}in`,
    row: row + 1,
    col: col + 1
  };
};

/**
 * Testing recommendations
 */
export const TESTING_GUIDE = {
  steps: [
    "Print test page on regular paper first",
    "Hold test page over blank Avery 5160 sheet",
    "Check alignment by holding both up to light",
    "Look for any shifts in columns 2 and 3",
    "Adjust measurements if needed",
    "Test with one actual label sheet",
    "Only then print full batch"
  ],
  
  commonIssues: [
    {
      issue: "Column 2 shifts right",
      cause: "Incorrect left margin calculation",
      fix: "Adjust left position for nth-child(3n+2)"
    },
    {
      issue: "Column 3 shifts left", 
      cause: "Label width or spacing miscalculation",
      fix: "Verify 2.625in width and adjust column 3 position"
    },
    {
      issue: "All columns shift",
      cause: "Printer margin settings or page setup",
      fix: "Check printer settings: margins should be 0, scale 100%"
    }
  ],
  
  printerSettings: {
    margins: "0 inches on all sides",
    scale: "100% (Actual size)",
    quality: "High or Best",
    paperSize: "Letter (8.5 x 11 in)",
    orientation: "Portrait"
  }
};