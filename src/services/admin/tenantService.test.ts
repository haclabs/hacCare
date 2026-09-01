import { describe, it, expect } from 'vitest';
import { filterByTenant } from './tenantService';

/**
 * Tenant isolation tests.
 *
 * filterByTenant() is the last in-memory guard for tenant isolation when data
 * from multiple tenants ends up in the same array (e.g. after a join or a cache
 * merge). Cross-tenant data leaks in this app are almost always caused by a
 * missing tenant_id filter, so these tests pin down the exact matching rules.
 */

interface Row {
  id: string;
  tenant_id?: string;
}

describe('filterByTenant', () => {
  it('returns only rows belonging to the given tenant', () => {
    const rows: Row[] = [
      { id: '1', tenant_id: 'tenant-a' },
      { id: '2', tenant_id: 'tenant-b' },
      { id: '3', tenant_id: 'tenant-a' }
    ];

    const result = filterByTenant(rows, 'tenant-a');

    expect(result.map(r => r.id)).toEqual(['1', '3']);
  });

  it('excludes rows with no tenant_id (never treats "no tenant" as a match)', () => {
    const rows: Row[] = [
      { id: '1', tenant_id: 'tenant-a' },
      { id: '2' } // missing tenant_id entirely
    ];

    const result = filterByTenant(rows, 'tenant-a');

    expect(result.map(r => r.id)).toEqual(['1']);
  });

  it('returns an empty array when no rows match the tenant', () => {
    const rows: Row[] = [
      { id: '1', tenant_id: 'tenant-b' },
      { id: '2', tenant_id: 'tenant-c' }
    ];

    expect(filterByTenant(rows, 'tenant-a')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const rows: Row[] = [
      { id: '1', tenant_id: 'tenant-a' },
      { id: '2', tenant_id: 'tenant-b' }
    ];
    const original = [...rows];

    filterByTenant(rows, 'tenant-a');

    expect(rows).toEqual(original);
  });

  it('is an exact tenant_id match, not a substring/prefix match', () => {
    const rows: Row[] = [
      { id: '1', tenant_id: 'tenant-a' },
      { id: '2', tenant_id: 'tenant-ab' }
    ];

    const result = filterByTenant(rows, 'tenant-a');

    expect(result.map(r => r.id)).toEqual(['1']);
  });
});
