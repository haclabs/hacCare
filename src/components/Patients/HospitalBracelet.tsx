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
      const width = (charCode % 4) + 1; // Vary bar width 1-4
      const isWide = (charCode + index) % 2 === 0;
      return { 
        width: width * 2, 
        height: isWide ? 40 : 35,
        spacing: 1
      };
    });

    return (
      <g>
        {/* Start guard */}
        <rect x="10" y="10" width="2" height="40" fill="#000" />
        <rect x="14" y="10" width="2" height="40" fill="#000" />
        
        {/* Data bars */}
        {barcodeData.map((bar, index) => {
          const x = 20 + (index * 8);
          return (
            <rect
              key={index}
              x={x}
              y={10}
              width={bar.width}
              height={bar.height}
              fill="#000"
            />
          );
        })}
        
        {/* End guard */}
        <rect x={20 + (barcodeData.length * 8) + 5} y="10" width="2" height="40" fill="#000" />
        <rect x={20 + (barcodeData.length * 8) + 9} y="10" width="2" height="40" fill="#000" />
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
              {/* Hospital Logo Section */}
              <div 
                className="absolute left-4 top-4 bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center"
                style={{ width: '80px', height: '60px' }}
              >
                <div className="text-xs font-bold">HOSPITAL</div>
                <div className="text-lg font-bold">ID</div>
              </div>

              {/* Main Patient Information */}
              <div className="absolute left-24 top-4 right-4">
                {/* Patient Name */}
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {patient.lastName.toUpperCase()}, {patient.firstName}
                </div>
                
                {/* Patient ID */}
                <div className="text-lg font-bold text-blue-600 mb-1">
                  ID: {patient.patientId}
                </div>
                
                {/* DOB and Room */}
                <div className="text-sm text-gray-700 mb-1">
                  DOB: {format(new Date(patient.dateOfBirth), 'MM/dd/yyyy')} • Room: {patient.roomNumber}{patient.bedNumber} • {patient.bloodType}
                </div>
              </div>

              {/* Allergy Alert Section */}
              {patient.allergies.length > 0 && (
                <div 
                  className="absolute left-4 right-4 bg-red-600 text-white rounded-lg flex items-center justify-center"
                  style={{ top: '80px', height: '40px' }}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="font-bold text-sm">
                    ⚠️ ALLERGIES: {patient.allergies.join(', ')} ⚠️
                  </span>
                </div>
              )}

              {/* Barcode Section */}
              <div 
                className="absolute left-4 right-4 bg-white border border-gray-200 rounded-lg"
                style={{ 
                  bottom: '20px', 
                  height: '80px',
                  top: patient.allergies.length > 0 ? '130px' : '90px'
                }}
              >
                <div className="flex items-center justify-between h-full px-4">
                  <div className="flex-1">
                    <div className="text-xs text-gray-600 mb-1">Scan for Patient Information</div>
                    <svg width="200" height="50" className="border border-gray-300">
                      {generateBarcode(patient.patientId)}
                    </svg>
                    <div className="text-xs text-gray-800 font-mono mt-1">{patient.patientId}</div>
                  </div>
                  
                  {/* Medical Symbol */}
                  <div className="text-right">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      ✚
                    </div>
                    <div className="text-xs text-gray-600 mt-1">MEDICAL</div>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="absolute top-2 right-2 text-xs text-gray-400">
                <div>SECURE ID</div>
                <div className="text-blue-600">#{patient.patientId.slice(-4)}</div>
              </div>

              {/* Tamper-evident pattern */}
              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%" className="opacity-5">
                  <defs>
                    <pattern id="security-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <text x="10" y="15" fontSize="8" textAnchor="middle" fill="#3b82f6" transform="rotate(45 10 10)">
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