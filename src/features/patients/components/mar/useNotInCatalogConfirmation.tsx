import { useState } from 'react';

import { NotInCatalogDialog } from './NotInCatalogConfirmation';

/**
 * Routes a save through NotInCatalogDialog when the medication has no catalog link.
 * Render `dialog` inside the form's component and call `confirmSave(catalogId, name, save)` on submit.
 */
export function useNotInCatalogConfirmation() {
  const [pending, setPending] = useState<{ name: string; save: () => void } | null>(null);

  const confirmSave = (catalogId: string | null | undefined, name: string, save: () => void) => {
    if (catalogId) save();
    else setPending({ name, save });
  };

  const dialog = pending ? (
    <NotInCatalogDialog
      medicationName={pending.name}
      onChooseFromCatalog={() => setPending(null)}
      onSaveAnyway={() => {
        setPending(null);
        pending.save();
      }}
    />
  ) : null;

  return { confirmSave, dialog };
}
