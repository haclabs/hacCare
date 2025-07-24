/**
 * Simple test example showing how to use the nurse selection feature
 * 
 * This is a demonstration of how the new tenant-based nurse dropdown
 * works in the patient form.
 */

import React from 'react';
import { useTenantNurses } from '../hooks/useTenantNurses';

export const NurseSelectionExample: React.FC = () => {
  const { nurses, loading, error, hasNurses } = useTenantNurses();

  if (loading) {
    return <div>Loading nurses...</div>;
  }

  if (error) {
    return <div>Error loading nurses: {error}</div>;
  }

  if (!hasNurses) {
    return <div>No nurses available for this tenant.</div>;
  }

  return (
    <div>
      <h3>Available Nurses for Current Tenant:</h3>
      <ul>
        {nurses.map(nurse => (
          <li key={nurse.id}>
            {nurse.name} - {nurse.email}
            {nurse.department && ` (${nurse.department})`}
          </li>
        ))}
      </ul>
    </div>
  );
};
