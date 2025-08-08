// TEMPORARY DIAGNOSTIC COMPONENT
// Add this to your app temporarily to debug the authentication issue

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export const AuthDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const { user } = useAuth();

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: any = {};

      // Test 1: Check current user from useAuth hook
      results.userFromHook = user?.id || 'NULL';

      // Test 2: Check Supabase session directly
      const { data: { session } } = await supabase.auth.getSession();
      results.sessionUserId = session?.user?.id || 'NULL';

      // Test 3: Test RPC function directly
      try {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_user_current_tenant', { target_user_id: user?.id });
        results.rpcFunction = rpcError ? `ERROR: ${rpcError.message}` : rpcResult;
      } catch (error) {
        results.rpcFunction = `EXCEPTION: ${error}`;
      }

      // Test 4: Test direct tenant_users query
      try {
        const { data: directQuery, error: directError } = await supabase
          .from('tenant_users')
          .select('tenant_id, role, is_active')
          .eq('user_id', user?.id)
          .eq('is_active', true);
        results.directQuery = directError ? `ERROR: ${directError.message}` : directQuery;
      } catch (error) {
        results.directQuery = `EXCEPTION: ${error}`;
      }

      setDiagnostics(results);
    };

    if (user) {
      runDiagnostics();
    }
  }, [user]);

  if (!user) {
    return <div className="p-4 bg-red-100 border border-red-400 rounded">
      🔴 No user found in useAuth hook
    </div>;
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-400 rounded">
      <h3 className="font-bold mb-2">🔍 Authentication Diagnostics</h3>
      <div className="space-y-2 text-sm">
        <div><strong>User from hook:</strong> {diagnostics.userFromHook}</div>
        <div><strong>Session user ID:</strong> {diagnostics.sessionUserId}</div>
        <div><strong>RPC function result:</strong> <pre>{JSON.stringify(diagnostics.rpcFunction, null, 2)}</pre></div>
        <div><strong>Direct query result:</strong> <pre>{JSON.stringify(diagnostics.directQuery, null, 2)}</pre></div>
      </div>
    </div>
  );
};

// To use this, temporarily add it to your main component:
// import { AuthDiagnostic } from './path/to/AuthDiagnostic';
// Then add <AuthDiagnostic /> somewhere in your JSX
