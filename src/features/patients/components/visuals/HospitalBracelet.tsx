import React, { useEffect, useRef } from 'react';
import { Patient } from '../../../../types';
import { X, ShieldCheck } from 'lucide-react';

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

          <div className="px-8 py-7 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-100" />
                <span className="text-[11px] font-bold tracking-widest text-blue-100 uppercase">Patient Identification</span>
              </div>
              <div className="mt-2 text-2xl font-bold leading-tight truncate">
                {patient.last_name}, {patient.first_name}
              </div>
              <div className="text-sm font-mono text-blue-100 mt-1">{patient.patient_id}</div>
            </div>

            <div className="bg-white rounded-lg p-2 shrink-0">
              <QrCode data={patient.patient_id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalBracelet;