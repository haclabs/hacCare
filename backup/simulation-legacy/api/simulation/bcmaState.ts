/**
 * Global BCMA state manager
 * Prevents conflicts between different barcode scanners
 */

let isBCMAActive = false;

export const setBCMAActive = (active: boolean) => {
  console.log('🔵 BCMA state changed:', active ? 'ACTIVE' : 'INACTIVE');
  isBCMAActive = active;
};

export const isBCMACurrentlyActive = () => {
  return isBCMAActive;
};
