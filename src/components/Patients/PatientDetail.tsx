Here's the fixed version with the missing closing brackets and parentheses:

```typescript
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Calendar, MapPin, Phone, User, Heart, Thermometer, Activity, Droplets, Clock, Pill, FileText, AlertTriangle, Plus, Stethoscope, TrendingUp, FileText as FileText2 } from 'lucide-react';
// ... rest of imports

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  // ... state declarations and other code

  const handleTabChange = (tab: string) => {
    // Close the vitals trends modal when switching tabs
    if (tab !== 'vitals' && showVitalsTrends) {
      setShowVitalsTrends(false);
    }
    setActiveTab(tab);
  };

  // ... other functions

  return (
    <div className="space-y-6">
      {/* ... JSX content */}
      <button
        onClick={() => {
          setShowVitalsTrends(true);
          handleTabChange('vitals');
        }}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        title="View vital signs trends"
      >
        <TrendingUp className="h-4 w-4" />
        <span>View Trends</span>
      </button>
      {/* ... rest of JSX */}
    </div>
  );
};
```

The main fixes were:

1. Added missing closing parenthesis and curly brace for the onClick handler in the button
2. Added missing closing angle bracket for the button element
3. Added missing closing curly brace for the component