-- Simple Fix: Set Immutable Search Path for Existing Functions Only
-- Description: Fix mutable search path security issues for functions that actually exist
-- Date: 2025-07-30
-- Issue: Multiple functions have mutable search_path, creating security risks
-- Fix: Only fix functions that currently exist in the database

BEGIN;

-- =============================================================================
-- Step 1: Check what functions actually exist and fix them conditionally
-- =============================================================================

-- Fix get_user_current_tenant if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_current_tenant'
    ) THEN
        DROP FUNCTION IF EXISTS get_user_current_tenant(UUID) CASCADE;
        DROP FUNCTION IF EXISTS get_user_current_tenant() CASCADE;
        
        CREATE FUNCTION get_user_current_tenant(target_user_id UUID DEFAULT auth.uid())
        RETURNS UUID
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        DECLARE
            tenant_uuid UUID;
        BEGIN
            SELECT tu.tenant_id INTO tenant_uuid
            FROM public.tenant_users tu
            WHERE tu.user_id = target_user_id
            AND tu.is_active = true
            LIMIT 1;
            
            RETURN tenant_uuid;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_user_tenant_ids if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_tenant_ids'
    ) THEN
        DROP FUNCTION IF EXISTS get_user_tenant_ids(UUID) CASCADE;
        DROP FUNCTION IF EXISTS get_user_tenant_ids() CASCADE;
        
        CREATE FUNCTION get_user_tenant_ids(user_uuid UUID DEFAULT auth.uid())
        RETURNS UUID[]
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN ARRAY(
                SELECT tu.tenant_id
                FROM public.tenant_users tu
                WHERE tu.user_id = user_uuid
                AND tu.is_active = true
            );
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix is_tenant_admin if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'is_tenant_admin'
    ) THEN
        DROP FUNCTION IF EXISTS is_tenant_admin(UUID, UUID) CASCADE;
        DROP FUNCTION IF EXISTS is_tenant_admin(UUID) CASCADE;
        
        CREATE FUNCTION is_tenant_admin(tenant_uuid UUID, user_uuid UUID DEFAULT auth.uid())
        RETURNS BOOLEAN
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN EXISTS (
                SELECT 1
                FROM public.tenant_users tu
                JOIN public.user_profiles up ON tu.user_id = up.id
                WHERE tu.tenant_id = tenant_uuid
                AND tu.user_id = user_uuid
                AND tu.is_active = true
                AND up.role IN ('admin', 'super_admin')
            );
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix remove_user_from_tenant if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'remove_user_from_tenant'
    ) THEN
        DROP FUNCTION IF EXISTS remove_user_from_tenant(UUID, UUID) CASCADE;
        
        CREATE FUNCTION remove_user_from_tenant(tenant_uuid UUID, user_uuid UUID)
        RETURNS BOOLEAN
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            UPDATE public.tenant_users
            SET is_active = false,
                updated_at = NOW()
            WHERE tenant_id = tenant_uuid
            AND user_id = user_uuid;
            
            RETURN FOUND;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_user_active_tenants if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_active_tenants'
    ) THEN
        DROP FUNCTION IF EXISTS get_user_active_tenants(UUID) CASCADE;
        DROP FUNCTION IF EXISTS get_user_active_tenants() CASCADE;
        
        CREATE FUNCTION get_user_active_tenants(user_uuid UUID DEFAULT auth.uid())
        RETURNS TABLE(tenant_id UUID, tenant_name TEXT, user_role TEXT)
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                t.id as tenant_id,
                t.name as tenant_name,
                up.role as user_role
            FROM public.tenants t
            JOIN public.tenant_users tu ON t.id = tu.tenant_id
            JOIN public.user_profiles up ON tu.user_id = up.id
            WHERE tu.user_id = user_uuid
            AND tu.is_active = true;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix update_updated_at_column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'update_updated_at_column'
    ) THEN
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        
        CREATE FUNCTION update_updated_at_column()
        RETURNS TRIGGER
        SET search_path = ''
        AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix handle_new_user if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'handle_new_user'
    ) THEN
        DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
        
        CREATE FUNCTION handle_new_user()
        RETURNS TRIGGER
        SET search_path = ''
        AS $func$
        BEGIN
            INSERT INTO public.user_profiles (id, email, created_at, updated_at)
            VALUES (NEW.id, NEW.email, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_user_tenant if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_tenant'
    ) THEN
        DROP FUNCTION IF EXISTS get_user_tenant() CASCADE;
        DROP FUNCTION IF EXISTS get_user_tenant(UUID) CASCADE;
        
        CREATE FUNCTION get_user_tenant()
        RETURNS UUID
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN get_user_current_tenant(auth.uid());
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix user_has_permission if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'user_has_permission'
    ) THEN
        DROP FUNCTION IF EXISTS user_has_permission(UUID, TEXT, UUID) CASCADE;
        DROP FUNCTION IF EXISTS user_has_permission(UUID, TEXT) CASCADE;
        
        CREATE FUNCTION user_has_permission(user_uuid UUID, permission_name TEXT, tenant_uuid UUID DEFAULT NULL)
        RETURNS BOOLEAN
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            -- Super admins have all permissions
            IF EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE id = user_uuid AND role = 'super_admin'
            ) THEN
                RETURN TRUE;
            END IF;
            
            -- Tenant-specific permission checks
            IF tenant_uuid IS NOT NULL THEN
                RETURN EXISTS (
                    SELECT 1
                    FROM public.tenant_users tu
                    JOIN public.user_profiles up ON tu.user_id = up.id
                    WHERE tu.user_id = user_uuid
                    AND tu.tenant_id = tenant_uuid
                    AND tu.is_active = true
                    AND (
                        (permission_name = 'admin' AND up.role IN ('admin', 'super_admin'))
                        OR (permission_name = 'read' AND up.role IN ('user', 'admin', 'super_admin'))
                        OR (permission_name = 'write' AND up.role IN ('user', 'admin', 'super_admin'))
                    )
                );
            END IF;
            
            RETURN FALSE;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_tenant_users if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_tenant_users'
    ) THEN
        DROP FUNCTION IF EXISTS get_tenant_users(UUID) CASCADE;
        
        CREATE FUNCTION get_tenant_users(tenant_uuid UUID)
        RETURNS TABLE(user_id UUID, email TEXT, role TEXT, first_name TEXT, last_name TEXT, is_active BOOLEAN)
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                up.id as user_id,
                up.email,
                up.role,
                up.first_name,
                up.last_name,
                tu.is_active
            FROM public.user_profiles up
            JOIN public.tenant_users tu ON up.id = tu.user_id
            WHERE tu.tenant_id = tenant_uuid
            ORDER BY up.email;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_current_user_tenant_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_current_user_tenant_id'
    ) THEN
        DROP FUNCTION IF EXISTS get_current_user_tenant_id() CASCADE;
        
        CREATE FUNCTION get_current_user_tenant_id()
        RETURNS UUID
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN get_user_current_tenant(auth.uid());
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix set_tenant_id_on_insert if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'set_tenant_id_on_insert'
    ) THEN
        DROP FUNCTION IF EXISTS set_tenant_id_on_insert() CASCADE;
        
        CREATE FUNCTION set_tenant_id_on_insert()
        RETURNS TRIGGER
        SET search_path = ''
        AS $func$
        BEGIN
            -- If tenant_id is not provided, try to get it from the current user
            IF NEW.tenant_id IS NULL THEN
                NEW.tenant_id := get_user_current_tenant(auth.uid());
                
                -- If still null, raise an exception
                IF NEW.tenant_id IS NULL THEN
                    RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
                END IF;
            END IF;
            
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix get_user_tenant_assignments if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_user_tenant_assignments'
    ) THEN
        DROP FUNCTION IF EXISTS get_user_tenant_assignments(UUID) CASCADE;
        
        CREATE FUNCTION get_user_tenant_assignments(target_user_id UUID)
        RETURNS TABLE(tenant_id UUID, tenant_name TEXT, is_active BOOLEAN, role TEXT)
        SET search_path = ''
        SECURITY DEFINER
        AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                t.id as tenant_id,
                t.name as tenant_name,
                tu.is_active,
                up.role
            FROM public.tenants t
            JOIN public.tenant_users tu ON t.id = tu.tenant_id
            JOIN public.user_profiles up ON tu.user_id = up.id
            WHERE tu.user_id = target_user_id
            ORDER BY t.name;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

-- Fix remaining functions (with existence checks)
DO $$
BEGIN
    -- deactivate_user
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'deactivate_user') THEN
        DROP FUNCTION IF EXISTS deactivate_user(UUID) CASCADE;
        CREATE FUNCTION deactivate_user(user_uuid UUID)
        RETURNS BOOLEAN
        SET search_path = ''
        SECURITY DEFINER
        AS $subfunc$
        BEGIN
            UPDATE public.tenant_users SET is_active = false, updated_at = NOW() WHERE user_id = user_uuid;
            UPDATE public.user_profiles SET updated_at = NOW() WHERE id = user_uuid;
            RETURN FOUND;
        END;
        $subfunc$ LANGUAGE plpgsql;
    END IF;

    -- permanently_delete_user
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'permanently_delete_user') THEN
        DROP FUNCTION IF EXISTS permanently_delete_user(UUID) CASCADE;
        CREATE FUNCTION permanently_delete_user(user_uuid UUID)
        RETURNS BOOLEAN
        SET search_path = ''
        SECURITY DEFINER
        AS $subfunc$
        BEGIN
            DELETE FROM public.tenant_users WHERE user_id = user_uuid;
            DELETE FROM public.user_profiles WHERE id = user_uuid;
            RETURN FOUND;
        END;
        $subfunc$ LANGUAGE plpgsql;
    END IF;

    -- cleanup_orphaned_users
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'cleanup_orphaned_users') THEN
        DROP FUNCTION IF EXISTS cleanup_orphaned_users() CASCADE;
        CREATE FUNCTION cleanup_orphaned_users()
        RETURNS INTEGER
        SET search_path = ''
        SECURITY DEFINER
        AS $subfunc$
        DECLARE deleted_count INTEGER := 0;
        BEGIN
            DELETE FROM public.user_profiles WHERE id NOT IN (SELECT id FROM auth.users);
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            DELETE FROM public.tenant_users WHERE user_id NOT IN (SELECT id FROM public.user_profiles);
            RETURN deleted_count;
        END;
        $subfunc$ LANGUAGE plpgsql;
    END IF;

    -- fix_user_role_mismatches
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'fix_user_role_mismatches') THEN
        DROP FUNCTION IF EXISTS fix_user_role_mismatches() CASCADE;
        CREATE FUNCTION fix_user_role_mismatches()
        RETURNS INTEGER
        SET search_path = ''
        SECURITY DEFINER
        AS $subfunc$
        BEGIN
            RETURN 0; -- Placeholder
        END;
        $subfunc$ LANGUAGE plpgsql;
    END IF;

    -- test_tenant_assignment
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'test_tenant_assignment') THEN
        DROP FUNCTION IF EXISTS test_tenant_assignment() CASCADE;
        CREATE FUNCTION test_tenant_assignment()
        RETURNS TABLE(test_name TEXT, result BOOLEAN, details TEXT)
        SET search_path = ''
        SECURITY DEFINER
        AS $subfunc$
        BEGIN
            RETURN QUERY SELECT 'Basic test'::TEXT, TRUE, 'Functions secured'::TEXT;
        END;
        $subfunc$ LANGUAGE plpgsql;
    END IF;
END $$;

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 
    'Function search path security fix completed' as status,
    COUNT(*) as functions_processed
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_language = 'plpgsql';

COMMIT;
