// Temporary diagnostic component to test tenant user loading
// Add this to your management dashboard temporarily to debug

import React, { useState } from 'react';
import { getTenantUsers } from '../../services/admin/tenantService';

export const TenantUserDebugger: React.FC = () => {
  const [tenantId, setTenantId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGetTenantUsers = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    console.log('🧪 Testing getTenantUsers with ID:', tenantId);
    
    try {
      const result = await getTenantUsers(tenantId);
      console.log('🧪 Test result:', result);
      setResult(result);
    } catch (error) {
      console.error('🧪 Test error:', error);
      setResult({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
      <h3 className="font-bold text-yellow-800 mb-2">🧪 Tenant User Debugger</h3>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Enter tenant ID"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button
          onClick={testGetTenantUsers}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test'}
        </button>
      </div>
      
      {result && (
        <div className="mt-2">
          <h4 className="font-medium text-gray-800">Result:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ol className="list-decimal list-inside">
          <li>Get LethPoly tenant ID from Supabase: <code>SELECT id FROM tenants WHERE subdomain = 'lethpoly'</code></li>
          <li>Paste the ID above and click Test</li>
          <li>Check browser console for detailed logs</li>
          <li>Compare result with what shows in the UI</li>
        </ol>
      </div>
    </div>
  );
};

export default TenantUserDebugger;
