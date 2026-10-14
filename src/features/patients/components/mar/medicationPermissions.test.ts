import { describe, it, expect } from 'vitest';
import { canManageMedicationOrders } from './medicationPermissions';

describe('canManageMedicationOrders', () => {
  it.each(['super_admin', 'coordinator', 'admin'])('allows %s in any tenant', (role) => {
    expect(canManageMedicationOrders(role, false)).toBe(true);
    expect(canManageMedicationOrders(role, true)).toBe(true);
  });

  it('allows instructors only while editing a template', () => {
    expect(canManageMedicationOrders('instructor', true)).toBe(true);
    expect(canManageMedicationOrders('instructor', false)).toBe(false);
  });

  it('never allows nurses or unknown users', () => {
    expect(canManageMedicationOrders('nurse', true)).toBe(false);
    expect(canManageMedicationOrders('nurse', false)).toBe(false);
    expect(canManageMedicationOrders(undefined, true)).toBe(false);
  });
});
