import React from 'react';
import { AlertTriangle } from 'lucide-react';

import type { BarcodeLabelItem } from '../../../services/operations/bulkLabelService';

/** Lists medications whose labels only exist here, because they weren't picked from the catalog. */
export const NotInCatalogLabelsNotice: React.FC<{ items: BarcodeLabelItem[]; compact?: boolean }> = ({
  items,
  compact = false,
}) => {
  const notInCatalog = items.filter((item) => item.notInCatalog);
  if (notInCatalog.length === 0) return null;

  if (compact) {
    return (
      <p className="mb-3 flex items-start gap-1.5 rounded bg-amber-50 p-2 text-xs text-amber-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        {notInCatalog.length} not in the catalog: print these, since catalog label stock won't scan for them
      </p>
    );
  }

  return (
    <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
      <h3 className="mb-1 flex items-center gap-1.5 font-medium text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        {notInCatalog.length} medication{notInCatalog.length !== 1 ? 's' : ''} not in the catalog
      </h3>
      <p className="mb-2 text-sm text-amber-800">
        Pre-printed catalog labels won't scan for these. Print their labels from here and keep them with this
        simulation's labels.
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {notInCatalog.map((item) => (
          <li key={item.id} className="rounded bg-white px-2 py-0.5 text-xs text-amber-900 ring-1 ring-amber-200">
            {item.name} <span className="font-mono text-amber-700">{item.barcode}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
