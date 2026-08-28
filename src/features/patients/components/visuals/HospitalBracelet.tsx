import React, { useEffect, useRef } from 'react';
import { Patient } from '../../../../types';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Quick-look ID bracelet — a stylized on-screen card for nurses to visually
 * confirm patient identity. Not intended for printing.
 */
interface HospitalBraceletProps {
  patient: Patient;
  onClose: () => void;
}

const QrCode: React.FC<{ data: string; size?: number }> = ({ data, size = 132 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const QRCode = await import('qrcode');
      if (!cancelled && canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, data, {
          width: size,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        }).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [data, size]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }} />;
};

const HospitalBracelet: React.FC<HospitalBraceletProps> = ({ patient, onClose }) => {
  const hasAllergies = !!patient.allergies && patient.allergies.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">ID Bracelet</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 flex justify-center">
        <div
          className="relative w-full rounded-2xl text-white overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%)' }}
        >
          {/* Perforated "wristband" edges */}
          <div className="absolute inset-y-0 left-0 w-3" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)', backgroundSize: '10px 10px' }} />
          <div className="absolute inset-y-0 right-0 w-3" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)', backgroundSize: '10px 10px' }} />

          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-blue-100 uppercase">Patient Identification</span>
              <ShieldCheck className="h-4 w-4 text-blue-100" />
            </div>

            <div className="mt-3 text-2xl font-bold leading-tight">
              {patient.last_name.toUpperCase()}, {patient.first_name}
            </div>
            <div className="text-sm font-mono text-blue-100 mt-0.5">{patient.patient_id}</div>

            <div className="mt-4 grid grid-cols-2 gap-y-1.5 text-sm text-blue-50">
              <div><span className="text-blue-200">DOB:</span> {format(new Date(patient.date_of_birth), 'MM/dd/yyyy')}</div>
              <div><span className="text-blue-200">Blood:</span> {patient.blood_type}</div>
              <div><span className="text-blue-200">Room:</span> {patient.room_number}{patient.bed_number}</div>
              <div><span className="text-blue-200">Gender:</span> {patient.gender}</div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 shrink-0">
                <QrCode data={patient.patient_id} />
              </div>
              <div className="flex-1 min-w-0">
                {hasAllergies ? (
                  <div className="bg-red-600/90 border border-red-300/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Allergies
                    </div>
                    <div className="text-sm font-semibold mt-0.5 break-words">
                      {patient.allergies!.join(', ')}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm font-medium text-blue-50">
                    No known allergies
                  </div>
                )}
                <p className="text-[11px] text-blue-100 mt-2">Scan to verify patient identity</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalBracelet;