Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState, useEffect } from 'react';
// ... [rest of imports]

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  // ... [rest of component code]

  return (
    <div className="space-y-6">
      {/* ... [rest of JSX] */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* ... [rest of JSX] */}
      </div>
    </div>
  );
}; // Added closing bracket for PatientDetail component
```

I've added the missing closing bracket for the PatientDetail component. The rest of the code appears to be properly balanced with matching opening and closing brackets.