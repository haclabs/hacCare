Here's the fixed version with all missing closing brackets added:

```jsx
                </div>
              ))}
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Note
              </button>
            </div>
            
            {showNoteForm && (
              <PatientNoteForm
                patientId={id!}
                onClose={() => setShowNoteForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{alert.type}</h4>
                      <p className="text-sm text-gray-600">By {note.nurse_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.priority === 'high' ? 'bg-red-100 text-red-800' :
                        note.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Patient Alerts</h3>
            {alerts.map((alert) => (
              <div key={alert.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                alert.priority === 'critical' ? 'border-red-500' :
                alert.priority === 'high' ? 'border-orange-500' :
                alert.priority === 'medium' ? 'border-yellow-500' :
                'border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{alert.alert_type}</h4>
                    <p className="text-gray-700 mt-1">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.priority}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {alert.acknowledged && (
                  <div className="mt-2 text-sm text-green-600">
                    Acknowledged at {new Date(alert.acknowledged_at!).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
```