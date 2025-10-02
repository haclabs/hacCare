import React, { useState } from 'react';
import { Printer } from 'lucide-react';

interface LabelPosition {
  row: number;
  col: number;
  left: string;
  top: string;
}

const LabelAlignmentTester: React.FC = () => {
  const [showGrid, setShowGrid] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [testMode, setTestMode] = useState<'overlay' | 'corners' | 'full'>('overlay');

  // Generate all 30 label positions with exact Avery 5160 specs
  const generateLabelPositions = (): LabelPosition[] => {
    const positions: LabelPosition[] = [];
    
    // Final perfect Avery 5160 positions  
    const columnPositions = [0.1875, 3.0375, 5.7875]; // inches
    const topMargin = 0.5; // inches
    const labelHeight = 1; // inches
    
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 3; col++) {
        positions.push({
          row: row + 1,
          col: col + 1,
          left: `${columnPositions[col]}in`,
          top: `${topMargin + (row * labelHeight)}in`
        });
      }
    }
    return positions;
  };

  const labelPositions = generateLabelPositions();

  const handlePrintTestPage = () => {
    const testContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Avery 5160 Label Alignment Test</title>
          <style>
            @page { 
              size: 8.5in 11in; 
              margin: 0; 
            }
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif;
              background: white;
            }
            .test-sheet {
              position: relative;
              width: 8.5in;
              height: 11in;
              background: white;
            }
            .label-outline {
              position: absolute;
              width: 2.625in;
              height: 1in;
              border: 2px solid #ff0000;
              box-sizing: border-box;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              color: #ff0000;
            }
            .corner-marker {
              position: absolute;
              width: 0.1in;
              height: 0.1in;
              background: #ff0000;
            }
            .measurement-line {
              position: absolute;
              border: 1px solid #0066cc;
            }
            .horizontal-line {
              width: 100%;
              height: 0;
              border-top: 1px dashed #0066cc;
            }
            .vertical-line {
              height: 100%;
              width: 0;
              border-left: 1px dashed #0066cc;
            }
            @media print {
              * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
            }
          </style>
        </head>
        <body>
          <div class="test-sheet">
            ${testMode === 'corners' ? 
              labelPositions.map((pos) => `
                <div class="corner-marker" style="left: ${pos.left}; top: ${pos.top};"></div>
                <div class="corner-marker" style="left: calc(${pos.left} + 2.525in); top: ${pos.top};"></div>
                <div class="corner-marker" style="left: ${pos.left}; top: calc(${pos.top} + 0.9in);"></div>
                <div class="corner-marker" style="left: calc(${pos.left} + 2.525in); top: calc(${pos.top} + 0.9in);"></div>
              `).join('') 
              : 
              labelPositions.map((pos, index) => `
                <div class="label-outline" style="left: ${pos.left}; top: ${pos.top};">
                  ${index + 1}
                </div>
              `).join('')
            }
            
            ${showMeasurements ? `
              <!-- Top margin line -->
              <div style="position: absolute; left: 0; top: 0.5in; width: 8.5in; border-top: 2px solid #00aa00;"></div>
              <div style="position: absolute; left: 0.1in; top: 0.3in; color: #00aa00; font-size: 10px;">0.5" top margin</div>
              
              <!-- Left margin line -->
              <div style="position: absolute; left: 0.1875in; top: 0; height: 11in; border-left: 2px solid #00aa00;"></div>
              <div style="position: absolute; left: 0.05in; top: 0.2in; color: #00aa00; font-size: 8px; transform: rotate(90deg);">0.1875" left</div>
              
              <!-- Column dividers -->
              <div style="position: absolute; left: 2.8125in; top: 0.5in; height: 10in; border-left: 1px dashed #0066cc;"></div>
              <div style="position: absolute; left: 5.4375in; top: 0.5in; height: 10in; border-left: 1px dashed #0066cc;"></div>
            ` : ''}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.write(testContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Label Alignment Tester</h2>
          <p className="text-sm text-gray-600">Test Avery 5160 positioning without wasting labels</p>
        </div>
        <button
          onClick={handlePrintTestPage}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Test Page
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Mode</label>
          <select
            value={testMode}
            onChange={(e) => setTestMode(e.target.value as any)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="overlay">Full Label Outlines</option>
            <option value="corners">Corner Markers Only</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showGrid"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showGrid" className="text-sm text-gray-700">Show Grid Lines</label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showMeasurements"
            checked={showMeasurements}
            onChange={(e) => setShowMeasurements(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showMeasurements" className="text-sm text-gray-700">Show Measurements</label>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="font-medium text-gray-900 mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
          <li><strong>Print Test Page:</strong> Print on regular paper first</li>
          <li><strong>Physical Check:</strong> Hold printed test over Avery 5160 sheet (hold up to light)</li>
          <li><strong>Alignment Check:</strong> Verify red outlines match actual label positions</li>
          <li><strong>Adjust if needed:</strong> If misaligned, we'll tweak the CSS measurements</li>
          <li><strong>Final Test:</strong> Once aligned, test with one real label sheet</li>
        </ol>
      </div>

      {/* Live Preview */}
      <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
        <h3 className="font-medium text-gray-900 mb-3">Live Preview (50% scale)</h3>
        <div 
          className="relative bg-white border border-gray-200 mx-auto"
          style={{
            width: '4.25in',
            height: '5.5in',
            transform: 'scale(0.5)',
            transformOrigin: 'top left'
          }}
        >
          {labelPositions.map((pos, index) => (
            <div
              key={index}
              className="absolute border border-red-500 flex items-center justify-center text-xs font-bold text-red-600"
              style={{
                left: pos.left,
                top: pos.top,
                width: '2.625in',
                height: '1in'
              }}
            >
              {index + 1}
            </div>
          ))}
          
          {showMeasurements && (
            <>
              <div className="absolute left-0 top-0 w-full h-0 border-t-2 border-green-500" style={{top: '0.5in'}} />
              <div className="absolute left-0 top-0 w-0 h-full border-l-2 border-green-500" style={{left: '0.1875in'}} />
              <div className="absolute top-0 w-0 border-l border-blue-400 border-dashed" style={{left: '2.8125in', top: '0.5in', height: '10in'}} />
              <div className="absolute top-0 w-0 border-l border-blue-400 border-dashed" style={{left: '5.4375in', top: '0.5in', height: '10in'}} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabelAlignmentTester;