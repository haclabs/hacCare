import { afterEach, describe, expect, it, vi } from 'vitest';
import { findPatientByWristband } from './findPatientByWristband';
import { getPostLoginPath, isRoverHostname, isRoverMode, setRoverPreferred } from './roverMode';

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

describe('rover mode', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('recognises the rover subdomain', () => {
    expect(isRoverHostname('rover.example.org')).toBe(true);
    expect(isRoverHostname('ROVER.example.org')).toBe(true);
    expect(isRoverHostname('example.org')).toBe(false);
    expect(isRoverHostname('simulation.example.org')).toBe(false);
  });

  it('is on for the rover host without a stored preference', () => {
    stubWindow('rover.example.org');
    expect(isRoverMode()).toBe(true);
  });

  it('follows the device preference on the main domain', () => {
    stubWindow('example.org');
    expect(isRoverMode()).toBe(false);
    setRoverPreferred(true);
    expect(isRoverMode()).toBe(true);
    setRoverPreferred(false);
    expect(isRoverMode()).toBe(false);
  });

  it('sends rover sign-ins to the rover and forgets the last simulation', () => {
    const store = stubWindow('rover.example.org');
    store.set('current_simulation_tenant', 'tenant-x');
    expect(getPostLoginPath(false)).toBe('/rover');
    expect(store.has('current_simulation_tenant')).toBe(false);
  });

  it('keeps existing desktop destinations', () => {
    stubWindow('example.org');
    expect(getPostLoginPath(false)).toBe('/app');
    expect(getPostLoginPath(true)).toBe('/app/simulation-portal');
  });
});
