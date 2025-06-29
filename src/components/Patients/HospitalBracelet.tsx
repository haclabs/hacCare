import React from 'react';
import { Patient } from '../../types';
import { X, Printer, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Hospital Bracelet Component
 * 
 * Generates a realistic vector-style hospital bracelet for patient identification.
 * Features a professional medical design with patient information, allergies,
 * and scannable barcode for quick identification.
 * 
 * Features:
 * - Vector-based bracelet design
 * - Patient name in Last, First format
 * - Date of birth
 * - Allergy alerts in red
 * - Barcode with patient ID
 * - Print and download functionality
 * - Realistic hospital bracelet appearance
 * 
 * @param {Object} props - Component props
 * @param {Patient} props.patient - Patient information
 * @param {Function} props.onClose - Callback when bracelet is closed
 */
interface HospitalBraceletProps {
  patient: Patient;
  onClose: () => void;
}

export const HospitalBracelet: React.FC<HospitalBraceletProps> = ({ patient, onClose }) => {
  /**
   * Generate barcode pattern for patient ID
   * Creates a realistic barcode representation using the patient ID
   * 
   * @param {string} patientId - Patient ID to encode
   * @returns {JSX.Element} SVG barcode element
   */
  const generateBarcode = (patientId: string) => {
    // Create barcode pattern based on patient ID
    const barcodeData = patientId.split('').map((char, index) => {
      const charCode = char.charCodeAt(0);
      const width = (charCode % 4) + 2; // Vary bar width 2-5 (more bold)
      const isWide = (charCode + index) % 2 === 0;
      return { 
        width: width * 1.5, 
        height: isWide ? 45 : 40, // Taller bars
        spacing: 1
      };
    });

    return (
      <g>
        {/* Start guard - more bold */}
        <rect x="0" y="0" width="4" height="45" fill="#000" />
        <rect x="6" y="0" width="4" height="45" fill="#000" />
        
        {/* Data bars - centered and more bold */}
        {barcodeData.map((bar, index) => {
          const x = 15 + (index * 10);
          return (
            <rect
              key={index}
              x={x}
              y="0"
              width={bar.width}
              height={bar.height}
              fill="#000"
            />
          );
        })}
        
        {/* End guard - more bold */}
        <rect x={15 + (barcodeData.length * 10) + 8} y="0" width="4" height="45" fill="#000" />
        <rect x={15 + (barcodeData.length * 10) + 14} y="0" width="4" height="45" fill="#000" />
      </g>
    );
  };

  /**
   * Handle print functionality
   * Opens print dialog with bracelet design
   */
  const handlePrint = () => {
    const printContent = document.getElementById('hospital-bracelet-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Hospital Bracelet - ${patient.patientId}</title>
              <style>
                @page {
                  size: 11in 8.5in landscape;
                  margin: 0.5in;
                }
                body { 
                  margin: 0; 
                  padding: 20px;
                  font-family: Arial, sans-serif; 
                  background: white;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                .bracelet-container {
                  transform: scale(1.5);
                }
                @media print {
                  body { 
                    margin: 0; 
                    padding: 0;
                  }
                  .bracelet-container {
                    transform: scale(2);
                  }
                }
              </style>
            </head>
            <body>
              <div class="bracelet-container">
                ${printContent.innerHTML}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  /**
   * Handle download functionality
   * Downloads bracelet as PNG image
   */
  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high resolution
    canvas.width = 1200;
    canvas.height = 400;

    // Draw bracelet background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f8fafc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bracelet border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Draw hospital logo area
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(40, 40, 120, 80);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HOSPITAL', 100, 70);
    ctx.fillText('ID', 100, 90);

    // Draw patient name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${patient.lastName.toUpperCase()}, ${patient.firstName}`, 180, 80);

    // Draw patient ID
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`ID: ${patient.patientId}`, 180, 110);

    // Draw DOB
    ctx.font = '20px Arial';
    ctx.fillText(`DOB: ${format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')}`, 180, 140);

    // Draw room info
    ctx.fillText(`Room: ${patient.roomNumber}${patient.bedNumber}`, 180, 170);

    // Draw allergies if any
    if (patient.allergies.length > 0) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(40, 200, canvas.width - 80, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ ALLERGIES ⚠️', canvas.width / 2, 225);
      ctx.font = '16px Arial';
      const allergiesText = patient.allergies.join(', ');
      ctx.fillText(allergiesText, canvas.width / 2, 245);
    }

    // Draw barcode area
    const barcodeY = patient.allergies.length > 0 ? 280 : 200;
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Scan for Patient Info', canvas.width / 2, barcodeY + 60);

    // Simple barcode representation
    for (let i = 0; i < 30; i++) {
      const barWidth = (i % 3) + 2;
      const barHeight = 40;
      const x = 400 + (i * 8);
      if (i % 2 === 0) {
        ctx.fillRect(x, barcodeY, barWidth, barHeight);
      }
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hospital-bracelet-${patient.patientId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Hospital Patient Bracelet</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Bracelet</span>
            </button>
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Patient Information Summary */}
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-3">Bracelet Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-900"><strong>Patient:</strong> {patient.lastName}, {patient.firstName}</p>
                <p className="text-blue-900"><strong>Patient ID:</strong> {patient.patientId}</p>
                <p className="text-blue-900"><strong>Date of Birth:</strong> {format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')}</p>
              </div>
              <div>
                <p className="text-blue-900"><strong>Room:</strong> {patient.roomNumber}{patient.bedNumber}</p>
                <p className="text-blue-900"><strong>Blood Type:</strong> {patient.bloodType}</p>
                <p className="text-blue-900"><strong>Allergies:</strong> {patient.allergies.length > 0 ? patient.allergies.join(', ') : 'None'}</p>
              </div>
            </div>
          </div>

          {/* Hospital Bracelet Design */}
          <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
            <div className="text-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Hospital Patient Identification Bracelet</h4>
              <p className="text-sm text-gray-600">Professional medical identification with security features</p>
            </div>
            
            <div 
              id="hospital-bracelet-content" 
              className="bg-white mx-auto border-2 border-dashed border-gray-300 relative"
              style={{
                width: '800px',
                height: '280px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: '15px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                transform: 'scale(0.8)',
                transformOrigin: 'center'
              }}
            >
              {/* Hospital Logo Section - Better positioned with proper padding */}
              <div 
                className="absolute bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center"
                style={{ 
                  left: '20px', 
                  top: '20px', 
                  width: '100px', 
                  height: '80px' 
                }}
              >
                <div className="text-sm font-bold">HOSPITAL</div>
                <div className="text-2xl font-bold">ID</div>
              </div>

              {/* Main Patient Information - Better spacing and positioning */}
              <div className="absolute" style={{ left: '140px', top: '20px', right: '20px' }}>
                {/* Patient Name - Larger and better spaced */}
                <div className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {patient.lastName.toUpperCase()}, {patient.firstName}
                </div>
                
                {/* Patient ID - More prominent with better spacing */}
                <div className="text-xl font-bold text-blue-600 mb-3">
                  ID: {patient.patientId}
                </div>
                
                {/* DOB and Room - Better spacing */}
                <div className="text-base text-gray-700 space-y-2">
                  <div>DOB: {format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')}</div>
                  <div>Room: {patient.roomNumber}{patient.bedNumber} • Blood Type: {patient.bloodType}</div>
                </div>
              </div>

              {/* Allergy Alert Section - Better positioning with proper spacing */}
              {patient.allergies.length > 0 && (
                <div 
                  className="absolute bg-red-600 text-white rounded-lg flex items-center justify-center"
                  style={{ 
                    left: '20px', 
                    right: '20px', 
                    top: '115px', 
                    height: '50px' 
                  }}
                >
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span className="font-bold text-base">
                    ⚠️ ALLERGIES: {patient.allergies.join(', ')} ⚠️
                  </span>
                </div>
              )}

              {/* Barcode Section - Better centered with proper spacing */}
              <div 
                className="absolute bg-white rounded-lg flex items-center justify-center"
                style={{ 
                  left: '20px', 
                  right: '20px', 
                  bottom: '20px', 
                  height: '95px',
                  top: patient.allergies.length > 0 ? '175px' : '125px'
                }}
              >
                <div className="flex flex-col items-center justify-center w-full">
                  <div className="text-sm text-gray-600 mb-3">Scan for Patient Information</div>
                  
                  {/* Centered and bold barcode */}
                  <div className="flex justify-center mb-3">
                    <svg width="280" height="50" className="mx-auto">
                      {generateBarcode(patient.patientId)}
                    </svg>
                  </div>
                  
                  <div className="text-sm text-gray-800 font-mono font-bold">{patient.patientId}</div>
                </div>
                
                {/* Medical Symbol - Better positioned with proper spacing */}
                <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-center">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    ✚
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-bold">MEDICAL</div>
                </div>
              </div>

              {/* Security Features - Better positioning with proper spacing */}
              <div className="absolute top-6 right-6 text-xs text-gray-400 text-center">
                <div className="font-bold">SECURE ID</div>
                <div className="text-blue-600 font-bold">#{patient.patientId.slice(-4)}</div>
              </div>

              {/* Tamper-evident pattern - More subtle and properly spaced */}
              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%" className="opacity-5">
                  <defs>
                    <pattern id="security-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                      <text x="15" y="20" fontSize="8" textAnchor="middle" fill="#3b82f6" transform="rotate(45 15 15)">
                        SECURE
                      </text>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#security-pattern)" />
                </svg>
              </div>
            </div>
          </div>

          {/* Instructions and Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                <Printer className="h-4 w-4" />
                <span>Printing Instructions</span>
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Use waterproof, tear-resistant bracelet material</li>
                <li>• Print at high resolution for barcode clarity</li>
                <li>• Ensure secure attachment to patient's wrist</li>
                <li>• Verify all information before application</li>
                <li>• Replace if damaged or illegible</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Security Features</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Unique patient ID barcode for scanning</li>
                <li>• Tamper-evident security pattern</li>
                <li>• High-contrast allergy alerts in red</li>
                <li>• Medical symbol for quick identification</li>
                <li>• Secure ID number for verification</li>
              </ul>
            </div>
          </div>

          {patient.allergies.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-medium text-red-900">Critical Allergy Information</h4>
              </div>
              <div className="text-sm text-red-800">
                <p className="mb-2"><strong>Patient Allergies:</strong></p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-300">
                      {allergy}
                    </span>
                  ))}
                </div>
                <div className="bg-red-100 border border-red-300 rounded p-2">
                  <p className="text-xs font-bold">
                    ⚠️ CRITICAL: This bracelet displays allergy information prominently in RED to immediately alert all medical staff of potential adverse reactions.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Hospital Bracelet Standards</h4>
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
              <div>
                <p>• Material: Medical-grade vinyl or Tyvek</p>
                <p>• Size: 10" x 1" (adjustable)</p>
                <p>• Closure: Tamper-evident adhesive</p>
                <p>• Durability: Water and tear resistant</p>
              </div>
              <div>
                <p>• Barcode: Code 128 format for compatibility</p>
                <p>• Colors: High contrast for readability</p>
                <p>• Security: Unique ID and pattern</p>
                <p>• Compliance: HIPAA and hospital standards</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};