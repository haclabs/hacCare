Here's the fixed version with all missing closing brackets and parentheses added:

```typescript
// ... (previous code remains the same until the medications case)

      case 'medications':
        return (
          <MedicationAdministration
            patientId={id!}
            patientName={patientName}
            medications={medications}
            onRefresh={async () => {
              try {
                const meds = await fetchPatientMedications(id!);
                setMedications(meds);
              } catch (error) {
                console.error('Error refreshing medications:', error);
              }
            }}
          />
        );

      case 'vitals':
        return (
          <VitalSignsEditor
            patientId={id!}
            vitals={vitals[0]}
            onClose={() => {
              setShowVitalForm(false);
            }}
            onSave={async (newVitals) => {
              // Refresh vitals data after saving
              await fetchPatientVitalsData();
            }}
          />
        );

// ... (rest of the code remains the same)
```

The main fixes were:
1. Added missing closing brace for the try-catch block in the medications case
2. Added missing closing parenthesis for the onRefresh function
3. Fixed the structure of the vitals case that was incorrectly nested
4. Ensured proper closing of all component tags

The rest of the file remains unchanged as it was properly structured. These changes restore the proper syntax and nesting of the code blocks.