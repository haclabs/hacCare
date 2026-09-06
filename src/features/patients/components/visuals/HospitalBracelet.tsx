import React, { useEffect, useRef } from 'react';
import { Patient } from '../../../../types';
import { X, ShieldCheck } from 'lucide-react';
import { formatDOB } from '../../../../utils/patientUtils';

/**
 * Quick-look ID bracelet — a stylized on-screen card for nurses to visually
 * confirm patient identity. Not intended for printing.
 */
interface HospitalBraceletProps {
  patient: Patient;
  onClose: () => void;
}

const QrCode: React.FC<{ data: string; size?: number }> = ({ data, size = 108 }) => {
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
  // Repeated small-print run, mimicking the identifying text printed
  // end-to-end along a real hospital wristband strip.
  const repeatingLabel = `${patient.last_name.toUpperCase()}, ${patient.first_name.toUpperCase()} • ${patient.patient_id} • `;

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">ID Bracelet</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-8 bg-gray-100 flex justify-center">
        {/* ── Wristband strip ── */}
        <div className="relative w-full flex items-center">
          {/* Left tail — feeds into the buckle, like a real band's excess strap */}
          <div
            className="h-9 w-10 -mr-1 rounded-l-full shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
          />

          <div
            className="relative flex-1 min-w-0 text-white overflow-hidden shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #0ea5e9 100%)' }}
          >
            {/* Perforated stitch-line edges, top and bottom */}
            <div className="absolute inset-x-0 top-1.5 h-px" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 4px, transparent 4px 9px)' }} />
            <div className="absolute inset-x-0 bottom-1.5 h-px" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 4px, transparent 4px 9px)' }} />

            {/* Faint repeating patient identifier, printed the length of the band */}
            <div className="absolute inset-0 flex items-center overflow-hidden opacity-[0.12] select-none pointer-events-none">
              <span className="whitespace-nowrap text-xs font-bold tracking-widest">
                {repeatingLabel.repeat(10)}
              </span>
            </div>

            <div className="relative px-7 py-6 flex items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-100" />
                  <span className="text-[11px] font-bold tracking-widest text-blue-100 uppercase">Patient Identification</span>
                </div>
                <div className="mt-2 text-2xl font-bold leading-tight truncate">
                  {patient.last_name}, {patient.first_name}
                </div>
                <div className="text-sm font-mono text-blue-100 mt-1">
                  DOB: {formatDOB(patient.date_of_birth)} &bull; {patient.gender}
                </div>
                <div className="text-sm font-mono text-blue-100 mt-0.5">ID: {patient.patient_id}</div>
              </div>

              <div className="bg-white rounded-lg p-1.5 shrink-0">
                <QrCode data={patient.patient_id} />
              </div>
            </div>
          </div>

          {/* Buckle / closure — the plastic clasp end of a real band */}
          <div className="h-14 w-7 -ml-1 rounded-r-md bg-slate-300 shrink-0 flex flex-col items-center justify-center gap-1.5 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <div className="w-2 h-2 rounded-full bg-slate-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalBracelet;
