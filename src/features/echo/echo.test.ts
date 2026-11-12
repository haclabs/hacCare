import { afterEach, describe, expect, it, vi } from 'vitest';
import { findPatientByWristband } from './findPatientByWristband';
import { describeCameraError, getScanWindowCrop, getScanWindowSize } from './cameraScanner';
import { getPostLoginPath, isEchoHostname, isEchoMode, setEchoFullWindow, setEchoPreferred, shouldShowDeviceFrame } from './echoMode';
import { echoPatientPath, parseEchoTab } from './echoTabs';
import { buildVitalsGlance } from './vitalsGlance';
import { EMPTY_VITALS_DRAFT, parseVitalsDraft } from './vitalsEntry';

const patients = [
  { id: 'a', patient_id: 'PT64280' },
  { id: 'b', patient_id: 'P58763' },
  { id: 'c', patient_id: 'PT12345' },
];

describe('findPatientByWristband', () => {
  it('matches an app-generated patient id exactly', () => {
    expect(findPatientByWristband('PT64280', patients)?.id).toBe('a');
  });

  it('matches the printed wristband code for ids without a PT prefix', () => {
    expect(findPatientByWristband('PTP58763', patients)?.id).toBe('b');
    expect(findPatientByWristband('P58763', patients)?.id).toBe('b');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(findPatientByWristband('  pt12345 \n', patients)?.id).toBe('c');
  });

  it('does not partially match another patient', () => {
    expect(findPatientByWristband('PT6428', patients)).toBeUndefined();
    expect(findPatientByWristband('64280', patients)).toBeUndefined();
  });

  it('ignores medication barcodes and empty scans', () => {
    expect(findPatientByWristband('MZ30512', patients)).toBeUndefined();
    expect(findPatientByWristband('   ', patients)).toBeUndefined();
  });
});

function stubWindow(hostname: string) {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    location: { hostname },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  return store;
}

describe('echo mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('recognises the echo subdomain', () => {
    expect(isEchoHostname('echo.example.org')).toBe(true);
    expect(isEchoHostname('ECHO.example.org')).toBe(true);
    expect(isEchoHostname('example.org')).toBe(false);
    expect(isEchoHostname('simulation.example.org')).toBe(false);
  });

  it('is on for the echo host without a stored preference', () => {
    stubWindow('echo.example.org');
    expect(isEchoMode()).toBe(true);
  });

  it('follows the device preference on the main domain', () => {
    stubWindow('example.org');
    expect(isEchoMode()).toBe(false);
    setEchoPreferred(true);
    expect(isEchoMode()).toBe(true);
    setEchoPreferred(false);
    expect(isEchoMode()).toBe(false);
  });

  it('sends echo sign-ins to the echo and forgets the last simulation', () => {
    const store = stubWindow('echo.example.org');
    store.set('current_simulation_tenant', 'tenant-x');
    expect(getPostLoginPath(false)).toBe('/echo');
    expect(store.has('current_simulation_tenant')).toBe(false);
  });

  it('keeps existing desktop destinations', () => {
    stubWindow('example.org');
    expect(getPostLoginPath(false)).toBe('/app');
    expect(getPostLoginPath(true)).toBe('/app/simulation-portal');
  });
});

describe('camera scan window', () => {
  it('is 70% of the shorter screen side, capped at 360px', () => {
    expect(getScanWindowSize(390, 844)).toBeCloseTo(273);
    expect(getScanWindowSize(1024, 1366)).toBe(360);
  });

  it('crops the centre of a landscape frame shown on a portrait phone', () => {
    // 1280x720 frame covering a 390x844 screen: scaled by 844/720, sides cut off
    const crop = getScanWindowCrop(1280, 720, 390, 844);
    expect(crop.size).toBeCloseTo(273 / (844 / 720));
    expect(crop.x).toBeCloseTo((1280 - crop.size) / 2);
    expect(crop.y).toBeCloseTo((720 - crop.size) / 2);
  });

  it('never crops more than the frame', () => {
    const crop = getScanWindowCrop(200, 100, 2000, 2000);
    expect(crop.size).toBeLessThanOrEqual(100);
    expect(crop.y).toBeGreaterThanOrEqual(0);
  });
});

describe('describeCameraError', () => {
  it('explains a blocked camera', () => {
    expect(describeCameraError({ name: 'NotAllowedError' })).toMatch(/blocked/);
  });

  it('falls back to a generic message', () => {
    expect(describeCameraError(new Error('x'))).toBe('The camera could not be started.');
  });
});

describe('echo patient tabs', () => {
  it('opens the MAR by default and keeps other tabs in the URL', () => {
    expect(echoPatientPath('a')).toBe('/echo/patient/a');
    expect(echoPatientPath('a', 'meds')).toBe('/echo/patient/a');
    expect(echoPatientPath('a', 'vitals')).toBe('/echo/patient/a/vitals');
  });

  it('falls back to the MAR for a missing or unknown tab', () => {
    expect(parseEchoTab(undefined)).toBe('meds');
    expect(parseEchoTab('labs')).toBe('meds');
    expect(parseEchoTab('io')).toBe('io');
  });
});

describe('buildVitalsGlance', () => {
  const adult = '1980-01-01';

  it('shows the newest reading and an oldest-first trend', () => {
    const rows = buildVitalsGlance([{ heartRate: 90 }, { heartRate: 80 }, { heartRate: 70 }], adult);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'heartRate', latest: '90', series: [[70, 80, 90]], status: 'normal' });
  });

  it('skips readings missing a vital instead of dropping the row', () => {
    const rows = buildVitalsGlance([{ respiratoryRate: 18 }, { respiratoryRate: 16, temperature: 37.2 }], adult);
    expect(rows.map((r) => [r.key, r.latest])).toEqual([
      ['temperature', '37.2 °C'],
      ['respiratoryRate', '18'],
    ]);
  });

  it('flags blood pressure when either number is out of range', () => {
    const [high] = buildVitalsGlance([{ bloodPressure: { systolic: 210, diastolic: 150 } }], adult);
    expect(high.latest).toBe('210/150');
    expect(high.status).not.toBe('normal');
    expect(buildVitalsGlance([{ bloodPressure: { systolic: 118, diastolic: 76 } }], adult)[0].status).toBe('normal');
  });
});

describe('parseVitalsDraft', () => {
  const draft = (over: Partial<typeof EMPTY_VITALS_DRAFT>) => ({ ...EMPTY_VITALS_DRAFT, studentName: 'Sam', ...over });

  it('accepts a partial set and leaves the rest undefined', () => {
    const result = parseVitalsDraft(draft({ respiratoryRate: '70' }));
    expect(result.ok && result.vitals).toMatchObject({ respiratoryRate: 70, heartRate: undefined, bloodPressure: undefined });
  });

  it('requires blood pressure as a pair', () => {
    expect(parseVitalsDraft(draft({ systolic: '120' }))).toMatchObject({ ok: false, error: expect.stringMatching(/both/) });
    const result = parseVitalsDraft(draft({ systolic: '120', diastolic: '80' }));
    expect(result.ok && result.vitals.bloodPressure).toEqual({ systolic: 120, diastolic: 80 });
  });

  it('rejects empty, out-of-range and unnamed entries', () => {
    expect(parseVitalsDraft(draft({}))).toMatchObject({ ok: false, error: expect.stringMatching(/at least one/) });
    expect(parseVitalsDraft(draft({ temperature: '45' }))).toMatchObject({ ok: false, error: expect.stringMatching(/Temperature/) });
    expect(parseVitalsDraft(draft({ heartRate: 'abc' }))).toMatchObject({ ok: false });
    expect(parseVitalsDraft(draft({ heartRate: '80', studentName: '  ' }))).toMatchObject({ ok: false, error: expect.stringMatching(/name/) });
  });
});

describe('laptop phone preview', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubDevice({ fine, width, framed = false }: { fine: boolean; width: number; framed?: boolean }) {
    const store = new Map<string, string>();
    const w: Record<string, unknown> = {
      innerWidth: width,
      matchMedia: (q: string) => ({ matches: q.includes('coarse') ? !fine : fine }),
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
    w.self = w;
    w.top = framed ? {} : w;
    vi.stubGlobal('window', w);
  }

  it('frames Echo on a laptop until the user picks the full window', () => {
    stubDevice({ fine: true, width: 1440 });
    expect(shouldShowDeviceFrame()).toBe(true);
    setEchoFullWindow(true);
    expect(shouldShowDeviceFrame()).toBe(false);
  });

  it('never frames tablets, phones, narrow windows or the preview itself', () => {
    stubDevice({ fine: false, width: 1024 });
    expect(shouldShowDeviceFrame()).toBe(false);
    stubDevice({ fine: true, width: 600 });
    expect(shouldShowDeviceFrame()).toBe(false);
    stubDevice({ fine: true, width: 1440, framed: true });
    expect(shouldShowDeviceFrame()).toBe(false);
  });
});
