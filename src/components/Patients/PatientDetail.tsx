Here's the fixed version with all missing closing brackets and elements added:

```typescript
// ... (previous code remains the same until the button onClick handler)

              <button 
                onClick={() => setShowPatientBracelet(true)}
              >
              </button>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowPatientBracelet(true)}
        >
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'vitals', label: 'Vital Signs', icon: Activity },
            { id: 'medications', label: 'MAR', icon: Pill },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'assessments', label: 'Assessments', icon: Stethoscope },
            { id: 'wounds', label: 'Wound Assessment', icon: AlertTriangle },
            { id: 'admission', label: 'Admission', icon: Calendar },
            { id: 'directives', label: 'Directives', icon: FileText2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors dark:border-opacity-75 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-blue-500 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      {/* ... (modal code remains the same) ... */}
    </div>
  );
};
```

The main fixes were:
1. Added missing closing tags for buttons
2. Added missing closing div tags
3. Fixed the structure of the header section
4. Properly closed all nested elements

The rest of the code remains functionally the same, just with proper closing of all elements and brackets.