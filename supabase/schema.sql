--
-- PostgreSQL database dump
--

\restrict Qqej7MNFMrjbvSlsOjlTtKt7nGtIJDZfbfqj9UOTb0QwYhS03fGujb2j8ZrJ6Ug

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Old simulation system cleaned up - ready for new implementation';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: hypopg; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hypopg WITH SCHEMA extensions;


--
-- Name: EXTENSION hypopg; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hypopg IS 'Hypothetical indexes for PostgreSQL';


--
-- Name: index_advisor; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS index_advisor WITH SCHEMA extensions;


--
-- Name: EXTENSION index_advisor; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION index_advisor IS 'Query index advisor';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: ack_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ack_scope AS ENUM (
    'panel',
    'result'
);


--
-- Name: alert_priority_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


--
-- Name: alert_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type_enum AS ENUM (
    'medication_due',
    'vital_signs',
    'emergency',
    'lab_results',
    'discharge_ready'
);


--
-- Name: device_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_type_enum AS ENUM (
    'closed-suction-drain',
    'chest-tube',
    'foley',
    'iv-peripheral',
    'iv-picc',
    'iv-port',
    'other',
    'feeding-tube',
    'ostomy',
    'nasogastric'
);


--
-- Name: lab_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lab_category AS ENUM (
    'chemistry',
    'abg',
    'hematology'
);


--
-- Name: lab_flag; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lab_flag AS ENUM (
    'normal',
    'abnormal_high',
    'abnormal_low',
    'critical_high',
    'critical_low'
);


--
-- Name: lab_panel_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lab_panel_status AS ENUM (
    'new',
    'partial_ack',
    'acknowledged'
);


--
-- Name: orientation_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.orientation_enum AS ENUM (
    'superior',
    'inferior',
    'medial',
    'lateral',
    'anterior',
    'posterior'
);


--
-- Name: ref_operator; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ref_operator AS ENUM (
    'between',
    '>=',
    '<=',
    'sex-specific'
);


--
-- Name: reservoir_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reservoir_type_enum AS ENUM (
    'jackson-pratt',
    'hemovac',
    'penrose',
    'other',
    'urinary-drainage-bag'
);


--
-- Name: simulation_active_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.simulation_active_status AS ENUM (
    'pending',
    'running',
    'paused',
    'completed',
    'expired',
    'cancelled'
);


--
-- Name: simulation_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.simulation_role AS ENUM (
    'instructor',
    'student'
);


--
-- Name: simulation_template_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.simulation_template_status AS ENUM (
    'draft',
    'ready',
    'archived'
);


--
-- Name: tenant_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_type AS ENUM (
    'production',
    'simulation_template',
    'simulation_active',
    'program'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'nurse',
    'admin',
    'super_admin',
    'instructor',
    'coordinator',
    'student'
);


--
-- Name: TYPE user_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.user_role IS 'User roles: super_admin (cross-tenant), coordinator (tenant-wide), admin (tenant admin), instructor (program-scoped), nurse (clinical staff), student (learner)';


--
-- Name: wound_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wound_type_enum AS ENUM (
    'incision',
    'laceration',
    'surgical-site',
    'pressure-injury',
    'skin-tear',
    'other'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: acknowledge_alert_for_tenant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.acknowledge_alert_for_tenant(p_alert_id uuid, p_tenant_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  calling_user_id UUID;
  user_role TEXT;
BEGIN
  -- Get the current user
  calling_user_id := auth.uid();
  
  -- Check if user is super admin or admin
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = calling_user_id;
  
  -- Only super admins and admins can use this function
  IF user_role NOT IN ('super_admin', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied: Super Admin or Admin role required'
    );
  END IF;
  
  -- Update the alert (RLS bypassed due to SECURITY DEFINER)
  UPDATE patient_alerts
  SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = calling_user_id
  WHERE id = p_alert_id
  AND tenant_id = p_tenant_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Alert not found or already acknowledged'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Alert acknowledged successfully'
  );
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


--
-- Name: FUNCTION acknowledge_alert_for_tenant(p_alert_id uuid, p_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.acknowledge_alert_for_tenant(p_alert_id uuid, p_tenant_id uuid) IS 'Allows super admins and admins to acknowledge patient alerts across tenants, bypassing RLS policies';


--
-- Name: archive_landing_content_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archive_landing_content_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only archive if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
    INSERT INTO public.landing_page_content_history (
      content_id,
      version,
      content,
      metadata,
      created_at,
      created_by
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.content,
      OLD.metadata,
      OLD.updated_at,
      OLD.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_set_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_set_tenant_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If tenant_id is already set (e.g., from RPC function), don't override it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, try to get it from tenant_users (avoid user_profiles for now due to cache)
  SELECT tenant_id INTO NEW.tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_tag_simulation_from_template(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_tag_simulation_from_template() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If simulation has no categories but template does, copy them
  IF (NEW.primary_categories IS NULL OR NEW.primary_categories = '{}') 
     AND NEW.template_id IS NOT NULL THEN
    SELECT primary_categories INTO NEW.primary_categories
    FROM simulation_templates
    WHERE id = NEW.template_id
      AND primary_categories IS NOT NULL
      AND primary_categories != '{}';
    
    IF NEW.primary_categories IS NOT NULL AND NEW.primary_categories != '{}' THEN
      RAISE NOTICE '✅ Auto-tagged simulation % with categories from template: %', 
        NEW.name, NEW.primary_categories;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_tag_simulation_from_template(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_tag_simulation_from_template() IS 'Automatically copy primary_categories from template to simulation when launching';


--
-- Name: bulk_assign_students_to_simulation(uuid, uuid[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_assign_students_to_simulation(p_simulation_id uuid, p_student_user_ids uuid[], p_role text DEFAULT 'student'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_simulation RECORD;
  v_assigned_count INTEGER := 0;
  v_tenant_role user_role;
BEGIN
  SELECT * INTO v_simulation 
  FROM simulation_active 
  WHERE id = p_simulation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Simulation not found',
      'assigned_count', 0,
      'error_count', 0
    );
  END IF;

  v_tenant_role := CASE p_role
    WHEN 'instructor' THEN 'admin'::user_role
    WHEN 'student' THEN 'nurse'::user_role
    ELSE 'nurse'::user_role
  END;

  INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by,
    granted_at
  )
  SELECT 
    p_simulation_id,
    unnest(p_student_user_ids),
    p_role::simulation_role,
    auth.uid(),
    NOW()
  ON CONFLICT (simulation_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

  INSERT INTO tenant_users (
    user_id,
    tenant_id,
    role,
    is_active
  )
  SELECT 
    unnest(p_student_user_ids),
    v_simulation.tenant_id,
    v_tenant_role,
    true
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    role = CASE 
      WHEN EXCLUDED.role = 'admin'::user_role THEN 'admin'::user_role
      ELSE EXCLUDED.role 
    END,
    is_active = true;

  RETURN json_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'error_count', 0,
    'errors', '[]'::JSONB,
    'message', format('%s students assigned successfully', v_assigned_count),
    'simulation_id', p_simulation_id,
    'tenant_id', v_simulation.tenant_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'assigned_count', v_assigned_count,
    'error_count', 1,
    'simulation_id', p_simulation_id
  );
END;
$$;


--
-- Name: calculate_simulation_metrics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_simulation_metrics(p_simulation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_metrics jsonb;
  v_tenant_id uuid;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  -- Calculate various metrics
  v_metrics := jsonb_build_object(
    'medications_administered', (
      SELECT COUNT(*)
      FROM patient_medications m
      WHERE m.tenant_id = v_tenant_id
    ),
    'vitals_recorded', (
      SELECT COUNT(*)
      FROM patient_vitals pv
      WHERE pv.tenant_id = v_tenant_id
    ),
    'notes_created', (
      SELECT COUNT(*)
      FROM patient_notes pn
      WHERE pn.tenant_id = v_tenant_id
    ),
    'alerts_generated', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'alerts_acknowledged', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
      AND pa.acknowledged = true
    ),
    'total_actions', (
      SELECT COUNT(*)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    ),
    'unique_participants', (
      SELECT COUNT(DISTINCT user_id)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    )
  );
  
  RETURN v_metrics;
END;
$$;


--
-- Name: cleanup_all_problem_simulations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_all_problem_simulations() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_run_record RECORD;
    v_cleanup_count INTEGER := 0;
    v_results JSONB[];
BEGIN
    -- Find all simulations and try to clean them up
    FOR v_run_record IN 
        SELECT id, name, status 
        FROM sim_runs 
        WHERE status IN ('active', 'paused')
        ORDER BY created_at ASC  -- Delete oldest first
    LOOP
        BEGIN
            -- Try to delete each problematic run
            v_results := v_results || ARRAY[delete_simulation_run_safe(v_run_record.id)];
            v_cleanup_count := v_cleanup_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the failure but continue
                v_results := v_results || ARRAY[jsonb_build_object(
                    'run_id', v_run_record.id,
                    'run_name', v_run_record.name,
                    'status', 'FAILED',
                    'error', SQLERRM
                )];
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'cleaned_up_count', v_cleanup_count,
        'total_processed', array_length(v_results, 1),
        'details', v_results,
        'message', 'Bulk cleanup completed'
    );
END;
$$;


--
-- Name: cleanup_backup_audit_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_backup_audit_logs() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM backup_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_backup_audit_logs(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_backup_audit_logs() IS 'Removes audit logs older than 1 year';


--
-- Name: cleanup_expired_simulations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_simulations() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_tenant_record RECORD;
BEGIN
  -- Find expired simulation tenants
  FOR v_tenant_record IN 
    SELECT t.id, t.simulation_id 
    FROM tenants t 
    WHERE t.tenant_type = 'simulation' 
    AND t.auto_cleanup_at < NOW()
  LOOP
    -- Delete simulation data
    DELETE FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id;
    DELETE FROM simulation_patient_vitals WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_medications WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_notes WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    
    -- Delete lobby and user data
    DELETE FROM simulation_lobby WHERE simulation_id = v_tenant_record.simulation_id;
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_record.id;
    DELETE FROM simulation_users WHERE simulation_tenant_id = v_tenant_record.id;
    
    -- Delete the simulation and tenant
    DELETE FROM active_simulations WHERE id = v_tenant_record.simulation_id;
    DELETE FROM tenants WHERE id = v_tenant_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_simulations(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_simulations() IS 'Removes expired simulation tenants and their data';


--
-- Name: cleanup_old_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_user_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_user_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date (7 days ago)
  cutoff_date := NOW() - INTERVAL '7 days';
  
  -- Delete sessions older than 7 days
  WITH deleted AS (
    DELETE FROM user_sessions
    WHERE login_time < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % old user_sessions (older than %)', deleted_count, cutoff_date;
END;
$$;


--
-- Name: FUNCTION cleanup_old_user_sessions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_old_user_sessions() IS 'Deletes user_sessions older than 7 days to prevent table bloat. Run manually or schedule via Edge Function.';


--
-- Name: cleanup_orphaned_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_orphaned_users() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete user_profiles that don't exist in auth.users
    DELETE FROM public.user_profiles
    WHERE id NOT IN (
        SELECT id FROM auth.users
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up tenant_users for non-existent users
    DELETE FROM public.tenant_users
    WHERE user_id NOT IN (
        SELECT id FROM public.user_profiles
    );
    
    RETURN deleted_count;
END;
$$;


--
-- Name: compare_simulation_template_patients(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compare_simulation_template_patients(p_simulation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patients JSONB := '[]'::jsonb;
  v_template_patients JSONB;
  v_sim_patient_rec RECORD;
  v_template_patient_rec RECORD;
  v_sim_patient_elem JSONB;
  v_template_patient_elem JSONB;
  v_added JSONB := '[]'::jsonb;
  v_removed JSONB := '[]'::jsonb;
  v_unchanged JSONB := '[]'::jsonb;
  v_matched BOOLEAN;
  v_sim_count INT;
  v_template_count INT;
  v_sim_first TEXT;
  v_sim_last TEXT;
  v_sim_dob TEXT;
  v_template_first TEXT;
  v_template_last TEXT;
  v_template_dob TEXT;
BEGIN
  -- Get simulation and template info
  SELECT sa.tenant_id, sa.template_id, st.snapshot_data
  INTO v_sim_tenant_id, v_template_id, v_template_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Get simulation's current patients
  FOR v_sim_patient_rec IN 
    SELECT first_name, last_name, date_of_birth
    FROM patients
    WHERE tenant_id = v_sim_tenant_id
    ORDER BY created_at
  LOOP
    v_sim_patients := v_sim_patients || jsonb_build_object(
      'first_name', v_sim_patient_rec.first_name,
      'last_name', v_sim_patient_rec.last_name,
      'dob', v_sim_patient_rec.date_of_birth
    );
  END LOOP;
  
  -- Get template's patients from snapshot
  v_template_patients := COALESCE(v_template_snapshot->'patients', '[]'::jsonb);
  
  v_sim_count := jsonb_array_length(v_sim_patients);
  v_template_count := jsonb_array_length(v_template_patients);
  
  RAISE NOTICE 'Comparing % sim patients vs % template patients', v_sim_count, v_template_count;
  
  -- Find unchanged and removed patients (sim patients not in template)
  FOR i IN 0..(v_sim_count - 1) LOOP
    v_sim_patient_elem := v_sim_patients->i;
    v_sim_first := v_sim_patient_elem->>'first_name';
    v_sim_last := v_sim_patient_elem->>'last_name';
    v_sim_dob := v_sim_patient_elem->>'dob';
    v_matched := false;
    
    -- Check if this sim patient exists in template
    FOR j IN 0..(v_template_count - 1) LOOP
      v_template_patient_elem := v_template_patients->j;
      v_template_first := v_template_patient_elem->>'first_name';
      v_template_last := v_template_patient_elem->>'last_name';
      v_template_dob := v_template_patient_elem->>'date_of_birth';
      
      IF v_sim_first = v_template_first
         AND v_sim_last = v_template_last
         AND v_sim_dob = v_template_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF v_matched THEN
      v_unchanged := v_unchanged || v_sim_patient_elem;
    ELSE
      v_removed := v_removed || v_sim_patient_elem;
    END IF;
  END LOOP;
  
  -- Find added patients (template patients not in sim)
  FOR i IN 0..(v_template_count - 1) LOOP
    v_template_patient_elem := v_template_patients->i;
    v_template_first := v_template_patient_elem->>'first_name';
    v_template_last := v_template_patient_elem->>'last_name';
    v_template_dob := v_template_patient_elem->>'date_of_birth';
    v_matched := false;
    
    FOR j IN 0..(v_sim_count - 1) LOOP
      v_sim_patient_elem := v_sim_patients->j;
      v_sim_first := v_sim_patient_elem->>'first_name';
      v_sim_last := v_sim_patient_elem->>'last_name';
      v_sim_dob := v_sim_patient_elem->>'dob';
      
      IF v_template_first = v_sim_first
         AND v_template_last = v_sim_last
         AND v_template_dob = v_sim_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF NOT v_matched THEN
      v_added := v_added || v_template_patient_elem;
    END IF;
  END LOOP;
  
  -- Return comparison result
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'simulation_patient_count', v_sim_count,
    'template_patient_count', v_template_count,
    'patients_unchanged', v_unchanged,
    'patients_added', v_added,
    'patients_removed', v_removed,
    'patient_list_identical', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'barcodes_can_preserve', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'requires_relaunch', (jsonb_array_length(v_added) > 0 OR jsonb_array_length(v_removed) > 0)
  );
END;
$$;


--
-- Name: FUNCTION compare_simulation_template_patients(p_simulation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compare_simulation_template_patients(p_simulation_id uuid) IS 'Compares simulation vs template patient lists to determine if barcodes can be preserved during sync';


--
-- Name: compare_simulation_vs_template(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compare_simulation_vs_template(p_simulation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patient_count INT;
  v_sim_medication_count INT;
  v_sim_order_count INT;
  v_sim_wound_count INT;
  v_sim_device_count INT;
  v_template_patient_count INT;
  v_template_medication_count INT;
  v_template_order_count INT;
  v_template_wound_count INT;
  v_template_device_count INT;
  v_template_version INT;
  v_synced_version INT;
BEGIN
  -- Get simulation tenant and template
  SELECT sa.tenant_id, sa.template_id, sa.template_snapshot_version_synced,
         st.snapshot_data, st.snapshot_version
  INTO v_sim_tenant_id, v_template_id, v_synced_version,
       v_template_snapshot, v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Count CURRENT data in active simulation tenant
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT pm.id),
    COUNT(DISTINCT ord.id),
    COUNT(DISTINCT w.id),
    COUNT(DISTINCT d.id)
  INTO 
    v_sim_patient_count,
    v_sim_medication_count,
    v_sim_order_count,
    v_sim_wound_count,
    v_sim_device_count
  FROM patients p
  LEFT JOIN patient_medications pm ON pm.tenant_id = v_sim_tenant_id
  LEFT JOIN doctors_orders ord ON ord.tenant_id = v_sim_tenant_id
  LEFT JOIN wounds w ON w.tenant_id = v_sim_tenant_id
  LEFT JOIN devices d ON d.tenant_id = v_sim_tenant_id
  WHERE p.tenant_id = v_sim_tenant_id;
  
  -- Count data in template snapshot
  v_template_patient_count := jsonb_array_length(COALESCE(v_template_snapshot->'patients', '[]'::jsonb));
  v_template_medication_count := jsonb_array_length(COALESCE(v_template_snapshot->'patient_medications', '[]'::jsonb));
  v_template_order_count := jsonb_array_length(COALESCE(v_template_snapshot->'doctors_orders', '[]'::jsonb));
  v_template_wound_count := jsonb_array_length(COALESCE(v_template_snapshot->'wounds', '[]'::jsonb));
  v_template_device_count := jsonb_array_length(COALESCE(v_template_snapshot->'devices', '[]'::jsonb));
  
  RAISE NOTICE 'Simulation: % patients, % medications | Template: % patients, % medications',
    v_sim_patient_count, v_sim_medication_count, v_template_patient_count, v_template_medication_count;
  
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'template_id', v_template_id,
    'version_synced', v_synced_version,
    'version_current', v_template_version,
    'patient_count_old', v_sim_patient_count,
    'patient_count_new', v_template_patient_count,
    'medication_count_old', v_sim_medication_count,
    'medication_count_new', v_template_medication_count,
    'order_count_old', v_sim_order_count,
    'order_count_new', v_template_order_count,
    'wound_count_old', v_sim_wound_count,
    'wound_count_new', v_template_wound_count,
    'device_count_old', v_sim_device_count,
    'device_count_new', v_template_device_count
  );
END;
$$;


--
-- Name: FUNCTION compare_simulation_vs_template(p_simulation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compare_simulation_vs_template(p_simulation_id uuid) IS 'Compares active simulation current data with template current snapshot for accurate sync preview';


--
-- Name: compare_template_versions(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compare_template_versions(p_template_id uuid, p_version_old integer, p_version_new integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_snapshot_old JSONB;
  v_snapshot_new JSONB;
  v_result JSONB := '{}'::jsonb;
BEGIN
  -- Get old version snapshot
  IF p_version_old = 0 THEN
    -- Version 0 means "nothing" (for initial version comparison)
    v_snapshot_old := '{}'::jsonb;
  ELSE
    SELECT snapshot_data INTO v_snapshot_old
    FROM simulation_template_versions
    WHERE template_id = p_template_id AND version = p_version_old;
  END IF;
  
  -- Get new version snapshot (could be current or history)
  SELECT CASE
    WHEN p_version_new = (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id)
    THEN (SELECT snapshot_data FROM simulation_templates WHERE id = p_template_id)
    ELSE (SELECT snapshot_data FROM simulation_template_versions WHERE template_id = p_template_id AND version = p_version_new)
  END INTO v_snapshot_new;
  
  -- Calculate diffs (simplified - full diff logic in frontend)
  v_result := jsonb_build_object(
    'template_id', p_template_id,
    'version_old', p_version_old,
    'version_new', p_version_new,
    'patient_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'patients'), 0),
    'patient_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'patients'), 0),
    'medication_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'patient_medications'), 0),
    'medication_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'patient_medications'), 0),
    'order_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'doctors_orders'), 0),
    'order_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'doctors_orders'), 0),
    'wound_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'wounds'), 0),
    'wound_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'wounds'), 0),
    'device_count_old', COALESCE(jsonb_array_length(v_snapshot_old->'devices'), 0),
    'device_count_new', COALESCE(jsonb_array_length(v_snapshot_new->'devices'), 0),
    'snapshot_old', v_snapshot_old,
    'snapshot_new', v_snapshot_new
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: complete_simulation(uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_simulation(p_simulation_id uuid, p_activities jsonb DEFAULT '[]'::jsonb, p_instructor_name text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_simulation simulation_active%ROWTYPE;
  v_history_id UUID;
  v_metrics JSONB;
  v_participants JSONB;
  v_activity_summary JSONB;
  v_result JSON;
BEGIN
  -- Get simulation details
  SELECT * INTO v_simulation
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_simulation.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Build simple metrics
  v_metrics := jsonb_build_object(
    'duration_minutes', v_simulation.duration_minutes,
    'activities_count', jsonb_array_length(p_activities)
  );
  
  -- Get participants list
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'granted_at', sp.granted_at
    )
  ) INTO v_participants
  FROM simulation_participants sp
  WHERE sp.simulation_id = p_simulation_id;
  
  -- Activity summary (deprecated - keep for backward compatibility)
  v_activity_summary := jsonb_build_object(
    'total_activities', jsonb_array_length(p_activities),
    'activities', p_activities
  );
  
  -- Insert into history with categories and instructor name
  INSERT INTO simulation_history (
    simulation_id,
    template_id,
    name,
    status,
    duration_minutes,
    started_at,
    ended_at,
    completed_at,
    participants,
    activity_summary,
    student_activities,
    created_by,
    primary_categories,
    sub_categories,
    instructor_name
  )
  VALUES (
    v_simulation.id,
    v_simulation.template_id,
    v_simulation.name,
    'completed',
    v_simulation.duration_minutes,
    v_simulation.starts_at,
    v_simulation.ends_at,
    NOW(),
    v_participants,
    v_activity_summary,
    p_activities,
    v_simulation.created_by,
    v_simulation.primary_categories,
    v_simulation.sub_categories,
    p_instructor_name
  )
  RETURNING id INTO v_history_id;
  
  -- Update simulation status
  UPDATE simulation_active
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'history_id', v_history_id,
    'metrics', v_metrics,
    'message', 'Simulation completed and archived to history with categories'
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION complete_simulation(p_simulation_id uuid, p_activities jsonb, p_instructor_name text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_simulation(p_simulation_id uuid, p_activities jsonb, p_instructor_name text) IS 'Complete simulation and archive to history with categories preserved';


--
-- Name: confirm_user_email(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirm_user_email(target_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role for permission check
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can confirm user emails
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can confirm user emails';
  END IF;

  -- Update the user to be confirmed
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id
    AND email_confirmed_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE 'User % email confirmed successfully', target_user_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User % not found or already confirmed', target_user_id;
    RETURN FALSE;
  END IF;
END;
$$;


--
-- Name: create_medication_super_admin(uuid, text, text, text, text, date, date, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_medication_super_admin(p_patient_id uuid, p_name text, p_dosage text, p_frequency text, p_route text, p_start_date date, p_end_date date DEFAULT NULL::date, p_prescribed_by text DEFAULT NULL::text, p_category text DEFAULT 'scheduled'::text, p_admin_time text DEFAULT '09:00'::text, p_status text DEFAULT 'Active'::text) RETURNS TABLE(medication_id uuid, patient_id uuid, name text, dosage text, frequency text, route text, start_date date, end_date date, prescribed_by text, last_administered timestamp with time zone, next_due timestamp with time zone, status text, created_at timestamp with time zone, category text, tenant_id uuid, admin_time character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    patient_tenant_id UUID;
    new_medication_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can create cross-tenant medications.';
    END IF;

    -- Get the patient's tenant_id
    SELECT patients.tenant_id INTO patient_tenant_id
    FROM patients
    WHERE patients.id = p_patient_id;
    
    IF patient_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Patient not found or has no tenant_id';
    END IF;

    -- Generate new UUID for medication
    new_medication_id := gen_random_uuid();
    
    -- Insert the medication
    INSERT INTO patient_medications (
        id,
        patient_id,
        name,
        dosage,
        frequency,
        route,
        start_date,
        end_date,
        prescribed_by,
        last_administered,
        next_due,
        status,
        created_at,
        category,
        tenant_id,
        admin_time
    ) VALUES (
        new_medication_id,
        p_patient_id,
        p_name,
        p_dosage,
        p_frequency,
        p_route,
        p_start_date,
        p_end_date,
        p_prescribed_by,
        NULL, -- last_administered
        (p_start_date + p_admin_time::time)::timestamptz, -- next_due: start_date + admin_time
        p_status,
        NOW(),
        p_category,
        patient_tenant_id,
        p_admin_time
    );
    
    -- Return the created medication - use fully qualified column names
    RETURN QUERY
    SELECT 
        pm.id as medication_id,
        pm.patient_id,
        pm.name,
        pm.dosage,
        pm.frequency,
        pm.route,
        pm.start_date,
        pm.end_date,
        pm.prescribed_by,
        pm.last_administered,
        pm.next_due,
        pm.status,
        pm.created_at,
        pm.category,
        pm.tenant_id,
        pm.admin_time
    FROM patient_medications pm
    WHERE pm.id = new_medication_id;
    
END;
$$;


--
-- Name: create_program_tenant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_program_tenant(p_program_id uuid, p_parent_tenant_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_program RECORD;
  v_tenant_id UUID;
  v_subdomain TEXT;
  v_result json;
BEGIN
  -- Get program details
  SELECT * INTO v_program
  FROM programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Program not found'
    );
  END IF;

  -- Check if program tenant already exists
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE program_id = p_program_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'tenant_id', v_tenant_id,
      'message', 'Program tenant already exists'
    );
  END IF;

  -- Generate subdomain from program code (lowercase, no spaces)
  v_subdomain := lower(regexp_replace(v_program.code, '[^a-zA-Z0-9]', '', 'g'));

  -- Create the program tenant
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    parent_tenant_id,
    program_id,
    is_simulation,
    status,
    created_at
  )
  VALUES (
    v_program.name || ' Program',
    v_subdomain,
    'program',
    p_parent_tenant_id,
    p_program_id,
    false,
    'active',
    NOW()
  )
  RETURNING id INTO v_tenant_id;

  -- Grant program instructors access to the program tenant
  INSERT INTO tenant_users (user_id, tenant_id, role, is_active)
  SELECT 
    up.user_id,
    v_tenant_id,
    'instructor',
    true
  FROM user_programs up
  WHERE up.program_id = p_program_id
  ON CONFLICT (user_id, tenant_id) DO UPDATE 
  SET is_active = true, role = 'instructor';

  RAISE NOTICE '✅ Created program tenant: % (ID: %)', v_program.name, v_tenant_id;

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_name', v_program.name || ' Program',
    'subdomain', v_subdomain,
    'message', 'Program tenant created successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Subdomain conflict - add suffix
    v_subdomain := v_subdomain || '_' || substr(v_program.tenant_id::text, 1, 8);
    
    INSERT INTO tenants (
      name,
      subdomain,
      tenant_type,
      parent_tenant_id,
      program_id,
      is_simulation,
      status,
      created_at
    )
    VALUES (
      v_program.name || ' Program',
      v_subdomain,
      'program',
      p_parent_tenant_id,
      p_program_id,
      false,
      'active',
      NOW()
    )
    RETURNING id INTO v_tenant_id;

    RETURN json_build_object(
      'success', true,
      'tenant_id', v_tenant_id,
      'message', 'Program tenant created with alternate subdomain'
    );
    
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION create_program_tenant(p_program_id uuid, p_parent_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_program_tenant(p_program_id uuid, p_parent_tenant_id uuid) IS 'Creates a dedicated tenant workspace for a program. Called when programs are created.';


--
-- Name: create_simulation_subtenant(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_simulation_subtenant(p_simulation_id uuid, p_simulation_name text, p_parent_tenant_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_subtenant_id UUID;
  v_subdomain TEXT;
BEGIN
  -- Generate a unique subdomain for the simulation sub-tenant
  v_subdomain := 'sim-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  
  -- Create the simulation sub-tenant
  INSERT INTO tenants (
    id,
    name,
    subdomain,
    parent_tenant_id,
    tenant_type,
    simulation_id,
    auto_cleanup_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Simulation: ' || p_simulation_name,
    v_subdomain,
    p_parent_tenant_id,
    'simulation',
    p_simulation_id,
    NOW() + INTERVAL '24 hours', -- Auto-cleanup after 24 hours
    NOW(),
    NOW()
  ) RETURNING id INTO v_subtenant_id;

  -- Update the active_simulation to reference this tenant and set to lobby
  UPDATE active_simulations 
  SET 
    tenant_id = v_subtenant_id,
    simulation_status = 'lobby',
    lobby_message = 'Welcome to ' || p_simulation_name || '. Please wait for the instructor to start the simulation.'
  WHERE id = p_simulation_id;

  RETURN v_subtenant_id;
END;
$$;


--
-- Name: FUNCTION create_simulation_subtenant(p_simulation_id uuid, p_simulation_name text, p_parent_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_simulation_subtenant(p_simulation_id uuid, p_simulation_name text, p_parent_tenant_id uuid) IS 'Creates a new sub-tenant for a simulation with isolated data and auto-generated subdomain';


--
-- Name: create_simulation_template(text, text, integer, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_simulation_template(p_name text, p_description text, p_default_duration_minutes integer, p_primary_categories text[] DEFAULT NULL::text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
  v_result json;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Generate unique subdomain from template name
  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  -- Create the simulation template tenant
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    status
  )
  VALUES (
    p_name || ' (Template)',
    v_subdomain,
    'simulation_template',
    true,
    'active'
  )
  RETURNING id INTO v_tenant_id;

  -- Create the template record with program categories
  INSERT INTO simulation_templates (
    tenant_id,
    name,
    description,
    default_duration_minutes,
    primary_categories,
    status,
    created_by
  )
  VALUES (
    v_tenant_id,
    p_name,
    p_description,
    p_default_duration_minutes,
    p_primary_categories,
    'draft',
    v_current_user_id
  )
  RETURNING id INTO v_template_id;

  -- Grant the creator admin access to the template tenant
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    is_active
  )
  VALUES (
    v_tenant_id,
    v_current_user_id,
    'admin',
    true
  );

  -- Return success
  SELECT json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION create_simulation_template(p_name text, p_description text, p_default_duration_minutes integer, p_primary_categories text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_simulation_template(p_name text, p_description text, p_default_duration_minutes integer, p_primary_categories text[]) IS 'Creates a new simulation template with optional program categories. Categories determine which instructors can see and use the template.';


--
-- Name: create_snapshot(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_snapshot(p_template_id uuid, p_name text, p_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_snapshot_id UUID;
    v_version INTEGER;
    v_snapshot_data JSONB;
BEGIN
    -- Get next version number for this template
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM sim_snapshots
    WHERE template_id = p_template_id;
    
    -- Build complete snapshot data
    SELECT jsonb_build_object(
        'patients', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tp.id,
                    'public_patient_id', tp.public_patient_id,
                    'demographics', tp.demographics,
                    'medical_history', tp.medical_history,
                    'baseline_vitals', tp.baseline_vitals,
                    'baseline_alerts', tp.baseline_alerts,
                    'room', tp.room,
                    'bed', tp.bed
                )
            )
            FROM sim_template_patients tp
            WHERE tp.template_id = p_template_id
        ), '[]'::jsonb),
        
        'medications', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tm.id,
                    'template_patient_id', tm.template_patient_id,
                    'medication_name', tm.medication_name,
                    'dosage', tm.dosage,
                    'route', tm.route,
                    'frequency', tm.frequency,
                    'prescribed_by', tm.prescribed_by,
                    'prescribed_at', tm.prescribed_at,
                    'status', tm.status
                )
            )
            FROM sim_template_meds tm
            WHERE tm.template_id = p_template_id
        ), '[]'::jsonb),
        
        'barcodes', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tb.id,
                    'template_med_id', tb.template_med_id,
                    'public_barcode_id', tb.public_barcode_id
                )
            )
            FROM sim_template_barcodes tb
            WHERE tb.template_id = p_template_id
        ), '[]'::jsonb),
        
        'lab_orders', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'template_patient_id', tp.id,
                    'order_date', lo.order_date,
                    'order_time', lo.order_time,
                    'procedure_category', lo.procedure_category,
                    'procedure_type', lo.procedure_type,
                    'source_category', lo.source_category,
                    'source_type', lo.source_type,
                    'initials', lo.initials,
                    'status', lo.status,
                    'notes', lo.notes
                )
            )
            FROM sim_template_patients tp
            LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
            LEFT JOIN lab_orders lo ON lo.patient_id = p.id
            WHERE tp.template_id = p_template_id
            AND lo.id IS NOT NULL
        ), '[]'::jsonb),
        
        -- NEW: hacMap data structure with avatar_locations, devices, and wounds
        'hacmap', COALESCE((
            SELECT jsonb_build_object(
                'locations', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', al.id,
                            'patient_id', al.patient_id,
                            'region_key', al.region_key,
                            'x_percent', al.x_percent,
                            'y_percent', al.y_percent,
                            'body_view', al.body_view,
                            'free_text', al.free_text,
                            'created_by', al.created_by
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN avatar_locations al ON al.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND al.id IS NOT NULL
                ), '[]'::jsonb),
                'devices', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'location_id', d.location_id,
                            'type', d.type,
                            'placement_date', d.placement_date,
                            'placement_time', d.placement_time,
                            'placed_pre_arrival', d.placed_pre_arrival,
                            'inserted_by', d.inserted_by,
                            'tube_number', d.tube_number,
                            'orientation', d.orientation,
                            'tube_size_fr', d.tube_size_fr,
                            'number_of_sutures_placed', d.number_of_sutures_placed,
                            'reservoir_type', d.reservoir_type,
                            'reservoir_size_ml', d.reservoir_size_ml,
                            'securement_method', d.securement_method,
                            'patient_tolerance', d.patient_tolerance,
                            'notes', d.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN devices d ON d.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND d.id IS NOT NULL
                ), '[]'::jsonb),
                'wounds', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', w.id,
                            'location_id', w.location_id,
                            'wound_type', w.wound_type,
                            'peri_wound_temperature', w.peri_wound_temperature,
                            'wound_length_cm', w.wound_length_cm,
                            'wound_width_cm', w.wound_width_cm,
                            'wound_depth_cm', w.wound_depth_cm,
                            'wound_description', w.wound_description,
                            'drainage_description', w.drainage_description,
                            'drainage_consistency', w.drainage_consistency,
                            'wound_odor', w.wound_odor,
                            'drainage_amount', w.drainage_amount,
                            'wound_edges', w.wound_edges,
                            'closure', w.closure,
                            'suture_staple_line', w.suture_staple_line,
                            'sutures_intact', w.sutures_intact,
                            'entered_by', w.entered_by,
                            'notes', w.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN wounds w ON w.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND w.id IS NOT NULL
                ), '[]'::jsonb)
            )
        ), '{}'::jsonb),
        
        'template_metadata', (
            SELECT jsonb_build_object(
                'name', name,
                'description', description,
                'specialty', specialty,
                'difficulty_level', difficulty_level,
                'estimated_duration', estimated_duration,
                'learning_objectives', learning_objectives
            )
            FROM sim_templates
            WHERE id = p_template_id
        )
    ) INTO v_snapshot_data;
    
    -- Create the snapshot
    INSERT INTO sim_snapshots (
        template_id,
        version,
        name,
        description,
        snapshot_data,
        created_by
    ) VALUES (
        p_template_id,
        v_version,
        p_name,
        p_description,
        v_snapshot_data,
        auth.uid()
    ) RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$;


--
-- Name: FUNCTION create_snapshot(p_template_id uuid, p_name text, p_description text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_snapshot(p_template_id uuid, p_name text, p_description text) IS 'Creates snapshot from template including hacMap data with body_view field';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    role public.user_role DEFAULT 'nurse'::public.user_role NOT NULL,
    primary_program text,
    license_number text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    simulation_only boolean DEFAULT false,
    default_tenant_id uuid
);


--
-- Name: COLUMN user_profiles.primary_program; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.primary_program IS 'DEPRECATED: Primary program code. Use user_programs junction table instead.';


--
-- Name: COLUMN user_profiles.default_tenant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.default_tenant_id IS 'Instructors default program tenant. Auto-set to their first program tenant or manually chosen.';


--
-- Name: create_user_profile(uuid, text, text, text, public.user_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_profile(user_id uuid, user_email text DEFAULT NULL::text, first_name text DEFAULT 'User'::text, last_name text DEFAULT ''::text, user_role public.user_role DEFAULT 'nurse'::public.user_role) RETURNS public.user_profiles
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_profile user_profiles;
  actual_email text;
BEGIN
  -- Get email from auth.users if not provided
  IF user_email IS NULL THEN
    SELECT email INTO actual_email FROM auth.users WHERE id = user_id;
  ELSE
    actual_email := user_email;
  END IF;

  -- Insert the new profile
  INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    COALESCE(actual_email, ''),
    first_name,
    last_name,
    user_role,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), user_profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), user_profiles.last_name),
    updated_at = now()
  RETURNING * INTO new_profile;

  RETURN new_profile;
END;
$$;


--
-- Name: FUNCTION create_user_profile(user_id uuid, user_email text, first_name text, last_name text, user_role public.user_role); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_user_profile(user_id uuid, user_email text, first_name text, last_name text, user_role public.user_role) IS 'Creates a user profile with immutable search path for security';


--
-- Name: create_user_session(inet, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_session(p_ip_address inet, p_user_agent text DEFAULT NULL::text, p_tenant_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  session_id uuid;
  resolved_tenant_id uuid;
BEGIN
  -- End any existing active sessions for this user first
  UPDATE user_sessions
  SET logout_time = now(),
      status = 'logged_out'
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Resolve tenant ID if not provided
  IF p_tenant_id IS NULL THEN
    resolved_tenant_id := public.get_user_tenant_id();
  ELSE
    resolved_tenant_id := p_tenant_id;
  END IF;

  -- Always create a new session for each login
  INSERT INTO user_sessions (
    user_id,
    ip_address,
    user_agent,
    tenant_id,
    login_time,
    last_activity,
    status
  ) VALUES (
    auth.uid(),
    p_ip_address,
    p_user_agent,
    resolved_tenant_id,
    now(),
    now(),
    'active'
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;


--
-- Name: FUNCTION create_user_session(p_ip_address inet, p_user_agent text, p_tenant_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_user_session(p_ip_address inet, p_user_agent text, p_tenant_id uuid) IS 'Creates or updates user session with IP tracking on login';


--
-- Name: current_user_is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_user_is_super_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Check if user has super_admin role in user_profiles table
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) INTO is_admin;
  
  -- If user_profiles doesn't exist or no record found, check auth metadata
  IF NOT is_admin THEN
    SELECT COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    ) INTO is_admin;
  END IF;
  
  RETURN is_admin;
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback to auth metadata if user_profiles table doesn't exist
    RETURN COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    );
END;
$$;


--
-- Name: deactivate_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_user(target_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate users';
  END IF;
  
  -- Deactivate user
  UPDATE user_profiles 
  SET is_active = false, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User deactivated successfully';
END;
$$;


--
-- Name: delete_medication_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_medication_super_admin(p_medication_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can delete cross-tenant medications.';
    END IF;

    -- First delete any administration records for this medication
    DELETE FROM medication_administrations WHERE medication_id = p_medication_id;
    
    -- Delete the medication itself
    DELETE FROM patient_medications WHERE id = p_medication_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the action if deletion was successful
    IF deleted_count > 0 THEN
        -- Note: Audit logging temporarily disabled due to table schema mismatch
        -- TODO: Fix audit_logs table structure or remove if not needed
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
    
END;
$$;


--
-- Name: FUNCTION delete_medication_super_admin(p_medication_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_medication_super_admin(p_medication_id uuid) IS 'Allows super admins and admins to delete medications across tenant boundaries, bypassing RLS';


--
-- Name: delete_simulation(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_simulation(p_simulation_id uuid, p_archive_to_history boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_simulation_tenant_id uuid;
  v_simulation_name text;
  v_template_id uuid;
  v_deleted_patients integer := 0;
  v_deleted_medications integer := 0;
  v_child_tenant_id uuid;
BEGIN
  -- Get simulation details before deletion
  SELECT tenant_id, name, template_id
  INTO v_simulation_tenant_id, v_simulation_name, v_template_id
  FROM simulation_active
  WHERE id = p_simulation_id;

  IF v_simulation_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- Archive to history if requested (only if simulation actually started)
  IF p_archive_to_history THEN
    -- Check if simulation has started (starts_at is not null)
    IF EXISTS (
      SELECT 1 FROM simulation_active 
      WHERE id = p_simulation_id AND starts_at IS NOT NULL
    ) THEN
      -- Check if not already archived
      IF NOT EXISTS (SELECT 1 FROM simulation_history WHERE simulation_id = p_simulation_id) THEN
        INSERT INTO simulation_history (
          id, simulation_id, tenant_id, template_id, name, duration_minutes,
          started_at, ended_at, created_by, completed_at, status,
          primary_categories, sub_categories
        )
        SELECT 
          gen_random_uuid(), -- New history record ID
          id,                -- simulation_id reference
          tenant_id, 
          template_id, 
          name, 
          duration_minutes,
          COALESCE(starts_at, NOW()), -- Use starts_at or NOW() as fallback
          ends_at,           -- Can be NULL
          created_by, 
          NOW(),             -- completed_at
          status,
          primary_categories, 
          sub_categories
        FROM simulation_active
        WHERE id = p_simulation_id;
      END IF;
    ELSE
      RAISE NOTICE 'Simulation % has not started yet (starts_at is NULL) - skipping history archive', p_simulation_id;
    END IF;
  END IF;

  -- Count what we're about to delete
  SELECT COUNT(*) INTO v_deleted_patients
  FROM patients WHERE tenant_id = v_simulation_tenant_id;

  SELECT COUNT(*) INTO v_deleted_medications
  FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;

  -- Delete all tenant-related data to avoid foreign key conflicts
  -- Order matters: delete children before parents
  -- Use PERFORM with EXCEPTION handling to skip tables that don't exist
  
  BEGIN
    DELETE FROM patient_alerts WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
  END;
  
  BEGIN
    DELETE FROM patient_notes WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_vitals WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM wound_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM device_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_images WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM medication_administrations WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  -- Delete patients last (they're referenced by other tables)
  DELETE FROM patients WHERE tenant_id = v_simulation_tenant_id;
  
  -- Delete simulation participants
  DELETE FROM simulation_participants WHERE simulation_id = p_simulation_id;
  
  -- Delete tenant users
  DELETE FROM tenant_users WHERE tenant_id = v_simulation_tenant_id;

  -- ⚠️ NEW: Delete any child tenants BEFORE deleting the parent simulation tenant
  -- This prevents foreign key violations on parent_tenant_id
  FOR v_child_tenant_id IN 
    SELECT id FROM tenants WHERE parent_tenant_id = v_simulation_tenant_id
  LOOP
    RAISE NOTICE 'Deleting child tenant data for: %', v_child_tenant_id;
    
    -- Delete ALL data from child tenant first (same order as parent)
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM diabetic_records WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- Delete patients from child tenant
    DELETE FROM patients WHERE tenant_id = v_child_tenant_id;
    
    -- Delete child tenant users
    DELETE FROM tenant_users WHERE tenant_id = v_child_tenant_id;
    
    -- Delete the child tenant
    DELETE FROM tenants WHERE id = v_child_tenant_id;
  END LOOP;

  -- Now safe to delete the simulation tenant
  DELETE FROM tenants WHERE id = v_simulation_tenant_id;

  -- Delete the simulation_active record
  DELETE FROM simulation_active WHERE id = p_simulation_id;

  RAISE NOTICE 'Deleted simulation % (%) with tenant % - removed % patients, % medications',
    p_simulation_id, v_simulation_name, v_simulation_tenant_id,
    v_deleted_patients, v_deleted_medications;

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'simulation_name', v_simulation_name,
    'tenant_id', v_simulation_tenant_id,
    'archived', p_archive_to_history,
    'deleted_patients', v_deleted_patients,
    'deleted_medications', v_deleted_medications
  );
END;
$$;


--
-- Name: FUNCTION delete_simulation(p_simulation_id uuid, p_archive_to_history boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_simulation(p_simulation_id uuid, p_archive_to_history boolean) IS 'Deletes an active simulation and its associated tenant. 
Handles child tenants (program tenants) before deleting parent.
Optionally archives to simulation_history before deletion.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';


--
-- Name: delete_simulation_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_simulation_history(p_history_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_simulation_name text;
BEGIN
  -- Get history details
  SELECT name INTO v_simulation_name
  FROM simulation_history
  WHERE id = p_history_id;

  IF v_simulation_name IS NULL THEN
    RAISE EXCEPTION 'History record not found: %', p_history_id;
  END IF;

  -- Delete the history record
  DELETE FROM simulation_history WHERE id = p_history_id;

  RAISE NOTICE 'Deleted history record % (%)', p_history_id, v_simulation_name;

  RETURN jsonb_build_object(
    'success', true,
    'history_id', p_history_id,
    'simulation_name', v_simulation_name
  );
END;
$$;


--
-- Name: FUNCTION delete_simulation_history(p_history_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.delete_simulation_history(p_history_id uuid) IS 'Permanently deletes a simulation history record and its debrief data.
Uses SECURITY DEFINER to bypass RLS.';


--
-- Name: delete_tenant_secure(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_tenant_secure(target_tenant_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can delete tenants
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can delete tenants';
  END IF;
  
  -- Soft delete tenant
  UPDATE tenants 
  SET status = 'inactive', updated_at = NOW()
  WHERE id = target_tenant_id;
  
  RETURN 'Tenant deleted successfully';
END;
$$;


--
-- Name: delete_user_permanently(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_permanently(target_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can permanently delete users
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Delete from tenant_users first
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- Delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (this requires service role)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN 'User permanently deleted';
END;
$$;


--
-- Name: duplicate_patient_to_tenant(text, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.duplicate_patient_to_tenant(p_source_patient_id text, p_target_tenant_id uuid, p_new_patient_id text DEFAULT NULL::text, p_include_vitals boolean DEFAULT true, p_include_medications boolean DEFAULT true, p_include_assessments boolean DEFAULT true, p_include_handover_notes boolean DEFAULT true, p_include_alerts boolean DEFAULT true, p_include_diabetic_records boolean DEFAULT true, p_include_bowel_records boolean DEFAULT true, p_include_wound_care boolean DEFAULT true, p_include_doctors_orders boolean DEFAULT true, p_include_labs boolean DEFAULT true, p_include_hacmap boolean DEFAULT true, p_include_intake_output boolean DEFAULT true) RETURNS TABLE(success boolean, new_patient_id uuid, new_patient_identifier text, records_created jsonb, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_source_patient_uuid UUID;
  v_new_patient_uuid UUID;
  v_new_patient_identifier TEXT;
  v_vitals_count INTEGER := 0;
  v_medications_count INTEGER := 0;
  v_med_admin_count INTEGER := 0;
  v_notes_count INTEGER := 0;
  v_assessments_count INTEGER := 0;
  v_handover_count INTEGER := 0;
  v_alerts_count INTEGER := 0;
  v_diabetic_count INTEGER := 0;
  v_bowel_count INTEGER := 0;
  v_wound_assessments_count INTEGER := 0;
  v_wound_treatments_count INTEGER := 0;
  v_doctors_orders_count INTEGER := 0;
  v_admission_records_count INTEGER := 0;
  v_advanced_directives_count INTEGER := 0;
  v_lab_orders_count INTEGER := 0;
  v_lab_panels_count INTEGER := 0;
  v_lab_results_count INTEGER := 0;
  v_hacmap_locations_count INTEGER := 0;
  v_hacmap_devices_count INTEGER := 0;
  v_hacmap_wounds_count INTEGER := 0;
  v_intake_output_count INTEGER := 0;
  v_panel_id_mapping JSONB := '{}'::JSONB;
  v_location_mapping JSONB := '{}'::JSONB;
  v_old_panel_id UUID;
  v_new_panel_id UUID;
  v_old_location_id UUID;
  v_new_location_id UUID;
  v_records_created JSONB;
BEGIN
  -- Get source patient UUID
  SELECT id INTO v_source_patient_uuid
  FROM patients
  WHERE patient_id = p_source_patient_id;

  IF v_source_patient_uuid IS NULL THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      'Source patient not found'::TEXT AS message;
    RETURN;
  END IF;

  -- Generate new patient_id if not provided
  IF p_new_patient_id IS NULL OR p_new_patient_id = '' THEN
    v_new_patient_identifier := 'P' || (10000 + floor(random() * 90000))::TEXT;
  ELSE
    v_new_patient_identifier := p_new_patient_id;
  END IF;

  -- Check if new patient_id already exists in target tenant
  IF EXISTS (
    SELECT 1 FROM patients 
    WHERE patient_id = v_new_patient_identifier 
    AND tenant_id = p_target_tenant_id
  ) THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      ('Patient ID ' || v_new_patient_identifier || ' already exists in target tenant')::TEXT AS message;
    RETURN;
  END IF;

  -- Create new patient record
  INSERT INTO patients (
    tenant_id,
    patient_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  )
  SELECT
    p_target_tenant_id,
    v_new_patient_identifier,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  FROM patients
  WHERE id = v_source_patient_uuid
  RETURNING id INTO v_new_patient_uuid;

  RAISE NOTICE 'Created new patient: %', v_new_patient_uuid;

  -- Copy patient vitals
  IF p_include_vitals THEN
    INSERT INTO patient_vitals (
      patient_id,
      tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    FROM patient_vitals
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    RAISE NOTICE 'Copied % vital records', v_vitals_count;
  END IF;

  -- Copy medications
  IF p_include_medications THEN
    INSERT INTO patient_medications (
      patient_id,
      tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    FROM patient_medications
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    RAISE NOTICE 'Copied % medication records', v_medications_count;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations') THEN
      INSERT INTO bcma_medication_administrations (
        patient_id,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      )
      SELECT
        v_new_patient_uuid,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      FROM bcma_medication_administrations
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
      RAISE NOTICE 'Copied % medication administration records', v_med_admin_count;
    END IF;
  END IF;

  -- Copy assessments
  IF p_include_assessments THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_assessments') THEN
      INSERT INTO patient_assessments (
        patient_id,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      )
      SELECT
        v_new_patient_uuid,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      FROM patient_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % assessment records', v_assessments_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_admission_records') THEN
      INSERT INTO patient_admission_records (
        patient_id,
        tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      FROM patient_admission_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_admission_records_count = ROW_COUNT;
      RAISE NOTICE 'Copied % admission records', v_admission_records_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_advanced_directives') THEN
      INSERT INTO patient_advanced_directives (
        patient_id,
        tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      FROM patient_advanced_directives
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_advanced_directives_count = ROW_COUNT;
      RAISE NOTICE 'Copied % advanced directives', v_advanced_directives_count;
    END IF;
  END IF;

  -- Copy handover notes
  IF p_include_handover_notes THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'handover_notes') THEN
      INSERT INTO handover_notes (
        patient_id,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      )
      SELECT
        v_new_patient_uuid,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      FROM handover_notes
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_handover_count = ROW_COUNT;
      RAISE NOTICE 'Copied % handover notes', v_handover_count;
    END IF;
  END IF;

  -- Copy patient alerts
  IF p_include_alerts THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_alerts') THEN
      INSERT INTO patient_alerts (
        patient_id,
        tenant_id,
        patient_name,
        alert_type,
        priority,
        message,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        expires_at
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        pa.patient_name,
        pa.alert_type,
        pa.priority,
        pa.message,
        pa.acknowledged,
        pa.acknowledged_by,
        pa.acknowledged_at,
        pa.expires_at
      FROM patient_alerts pa
      WHERE pa.patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_alerts_count = ROW_COUNT;
      RAISE NOTICE 'Copied % patient alerts', v_alerts_count;
    END IF;
  END IF;

  -- Copy diabetic records
  IF p_include_diabetic_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diabetic_records') THEN
      INSERT INTO diabetic_records (
        tenant_id,
        patient_id,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      FROM diabetic_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_diabetic_count = ROW_COUNT;
      RAISE NOTICE 'Copied % diabetic records', v_diabetic_count;
    END IF;
  END IF;

  -- Copy bowel records
  IF p_include_bowel_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bowel_records') THEN
      INSERT INTO bowel_records (
        patient_id,
        tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      FROM bowel_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_bowel_count = ROW_COUNT;
      RAISE NOTICE 'Copied % bowel records', v_bowel_count;
    END IF;
  END IF;

  -- Copy wound care
  IF p_include_wound_care THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_assessments') THEN
      INSERT INTO wound_assessments (
        patient_id,
        tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor,
        signs_of_infection,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor::boolean,
        signs_of_infection::boolean,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      FROM wound_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound assessments', v_wound_assessments_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_treatments') THEN
      INSERT INTO wound_treatments (
        patient_id,
        tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      FROM wound_treatments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_treatments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound treatments', v_wound_treatments_count;
    END IF;
  END IF;

  -- Copy doctors orders
  IF p_include_doctors_orders THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors_orders') THEN
      INSERT INTO doctors_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      FROM doctors_orders
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_doctors_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % doctors orders', v_doctors_orders_count;
    END IF;
  END IF;

  -- Copy lab orders
  IF p_include_labs THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_orders') THEN
      INSERT INTO lab_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        student_name,
        verified_by,
        status,
        notes,
        label_printed,
        created_by
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        student_name,
        verified_by,
        status,
        notes,
        false, -- Reset label_printed for new patient
        created_by
      FROM lab_orders
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_lab_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % lab orders', v_lab_orders_count;
    END IF;
  END IF;

  -- Copy lab panels and lab results (with panel ID mapping)
  IF p_include_labs THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_panels') THEN
      -- First, copy lab panels and build panel ID mapping
      FOR v_old_panel_id IN 
        SELECT id FROM lab_panels WHERE patient_id = v_source_patient_uuid
      LOOP
        INSERT INTO lab_panels (
          patient_id,
          tenant_id,
          panel_time,
          source,
          notes,
          status,
          ack_required,
          entered_by
        )
        SELECT
          v_new_patient_uuid,
          p_target_tenant_id,
          panel_time,
          source,
          notes,
          'new', -- Reset status for new patient
          ack_required,
          entered_by
        FROM lab_panels
        WHERE id = v_old_panel_id
        RETURNING id INTO v_new_panel_id;
        
        -- Store old → new mapping
        v_panel_id_mapping := v_panel_id_mapping || jsonb_build_object(
          v_old_panel_id::text, v_new_panel_id::text
        );
        
        v_lab_panels_count := v_lab_panels_count + 1;
      END LOOP;
      
      RAISE NOTICE 'Copied % lab panels', v_lab_panels_count;
      
      -- Then, copy lab results using the panel ID mapping
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_results') THEN
        INSERT INTO lab_results (
          patient_id,
          tenant_id,
          panel_id,
          category,
          test_code,
          test_name,
          value,
          units,
          ref_low,
          ref_high,
          ref_operator,
          sex_ref,
          critical_low,
          critical_high,
          flag,
          entered_by,
          comments
        )
        SELECT
          v_new_patient_uuid,
          p_target_tenant_id,
          (v_panel_id_mapping->>lr.panel_id::text)::uuid, -- Map old panel_id to new panel_id
          lr.category,
          lr.test_code,
          lr.test_name,
          lr.value,
          lr.units,
          lr.ref_low,
          lr.ref_high,
          lr.ref_operator,
          lr.sex_ref,
          lr.critical_low,
          lr.critical_high,
          lr.flag,
          lr.entered_by,
          lr.comments
        FROM lab_results lr
        WHERE lr.patient_id = v_source_patient_uuid
        AND (v_panel_id_mapping->>lr.panel_id::text) IS NOT NULL;
        
        GET DIAGNOSTICS v_lab_results_count = ROW_COUNT;
        RAISE NOTICE 'Copied % lab results', v_lab_results_count;
      END IF;
    END IF;
  END IF;

  -- Copy hacMap data (avatar_locations, devices, wounds with location ID mapping)
  IF p_include_hacmap THEN
    -- First, copy avatar_locations and build ID mapping
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avatar_locations') THEN
      FOR v_old_location_id IN 
        SELECT id FROM avatar_locations WHERE patient_id = v_source_patient_uuid
      LOOP
        INSERT INTO avatar_locations (
          tenant_id,
          patient_id,
          region_key,
          x_percent,
          y_percent,
          body_view,
          free_text,
          created_by
        )
        SELECT
          p_target_tenant_id,
          v_new_patient_uuid,
          region_key,
          x_percent,
          y_percent,
          body_view,
          free_text,
          created_by
        FROM avatar_locations
        WHERE id = v_old_location_id
        RETURNING id INTO v_new_location_id;
        
        -- Store old → new mapping
        v_location_mapping := v_location_mapping || jsonb_build_object(
          v_old_location_id::text, v_new_location_id::text
        );
        
        v_hacmap_locations_count := v_hacmap_locations_count + 1;
      END LOOP;
      RAISE NOTICE 'Copied % avatar_locations', v_hacmap_locations_count;
    END IF;

    -- Copy devices (linked to new locations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') THEN
      INSERT INTO devices (
        tenant_id,
        patient_id,
        location_id,
        type,
        placement_date,
        placement_time,
        placed_pre_arrival,
        inserted_by,
        tube_number,
        orientation,
        tube_size_fr,
        number_of_sutures_placed,
        reservoir_type,
        reservoir_size_ml,
        securement_method,
        patient_tolerance,
        notes,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        (v_location_mapping->>location_id::text)::uuid,
        type,
        placement_date,
        placement_time,
        placed_pre_arrival,
        inserted_by,
        tube_number,
        orientation,
        tube_size_fr,
        number_of_sutures_placed,
        reservoir_type,
        reservoir_size_ml,
        securement_method,
        patient_tolerance,
        notes,
        created_by
      FROM devices
      WHERE patient_id = v_source_patient_uuid
      AND (v_location_mapping->>location_id::text) IS NOT NULL;
      
      GET DIAGNOSTICS v_hacmap_devices_count = ROW_COUNT;
      RAISE NOTICE 'Copied % devices', v_hacmap_devices_count;
    END IF;

    -- Copy wounds (linked to new locations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wounds') THEN
      INSERT INTO wounds (
        tenant_id,
        patient_id,
        location_id,
        wound_type,
        peri_wound_temperature,
        wound_length_cm,
        wound_width_cm,
        wound_depth_cm,
        wound_description,
        drainage_description,
        drainage_consistency,
        wound_odor,
        drainage_amount,
        wound_edges,
        closure,
        suture_staple_line,
        sutures_intact,
        notes,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        (v_location_mapping->>location_id::text)::uuid,
        wound_type,
        peri_wound_temperature,
        wound_length_cm,
        wound_width_cm,
        wound_depth_cm,
        wound_description,
        drainage_description,
        drainage_consistency,
        wound_odor,
        drainage_amount,
        wound_edges,
        closure,
        suture_staple_line,
        sutures_intact,
        notes,
        created_by
      FROM wounds
      WHERE patient_id = v_source_patient_uuid
      AND (v_location_mapping->>location_id::text) IS NOT NULL;
      
      GET DIAGNOSTICS v_hacmap_wounds_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wounds', v_hacmap_wounds_count;
    END IF;
  END IF;

  -- Copy intake & output events
  IF p_include_intake_output THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_intake_output_events') THEN
      INSERT INTO patient_intake_output_events (
        tenant_id,
        patient_id,
        event_timestamp,
        shift_label,
        direction,
        category,
        route,
        description,
        amount_ml,
        student_name,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        event_timestamp,
        shift_label,
        direction,
        category,
        route,
        description,
        amount_ml,
        student_name,
        created_by
      FROM patient_intake_output_events
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_intake_output_count = ROW_COUNT;
      RAISE NOTICE 'Copied % intake/output events', v_intake_output_count;
    END IF;
  END IF;

  -- Build result JSON
  v_records_created := jsonb_build_object(
    'vitals', v_vitals_count,
    'medications', v_medications_count,
    'medication_administrations', v_med_admin_count,
    'notes', v_notes_count,
    'assessments', v_assessments_count,
    'handover_notes', v_handover_count,
    'alerts', v_alerts_count,
    'diabetic_records', v_diabetic_count,
    'bowel_records', v_bowel_count,
    'wound_assessments', v_wound_assessments_count,
    'wound_treatments', v_wound_treatments_count,
    'doctors_orders', v_doctors_orders_count,
    'admission_records', v_admission_records_count,
    'advanced_directives', v_advanced_directives_count,
    'lab_orders', v_lab_orders_count,
    'lab_panels', v_lab_panels_count,
    'lab_results', v_lab_results_count,
    'hacmap_locations', v_hacmap_locations_count,
    'hacmap_devices', v_hacmap_devices_count,
    'hacmap_wounds', v_hacmap_wounds_count,
    'intake_output_events', v_intake_output_count
  );

  -- Return success
  RETURN QUERY SELECT 
    true AS success,
    v_new_patient_uuid AS new_patient_id,
    v_new_patient_identifier AS new_patient_identifier,
    v_records_created AS records_created,
    ('Patient duplicated successfully with ' || 
     (v_vitals_count + v_medications_count + v_med_admin_count + v_notes_count + 
      v_assessments_count + v_handover_count + v_alerts_count + v_diabetic_count + 
      v_bowel_count + v_wound_assessments_count + v_wound_treatments_count + 
      v_doctors_orders_count + v_admission_records_count + v_advanced_directives_count + 
      v_lab_orders_count + v_lab_panels_count + v_lab_results_count + 
      v_hacmap_locations_count + v_hacmap_devices_count + v_hacmap_wounds_count + 
      v_intake_output_count)::TEXT || ' associated records')::TEXT AS message;

END;
$$;


--
-- Name: FUNCTION duplicate_patient_to_tenant(p_source_patient_id text, p_target_tenant_id uuid, p_new_patient_id text, p_include_vitals boolean, p_include_medications boolean, p_include_assessments boolean, p_include_handover_notes boolean, p_include_alerts boolean, p_include_diabetic_records boolean, p_include_bowel_records boolean, p_include_wound_care boolean, p_include_doctors_orders boolean, p_include_labs boolean, p_include_hacmap boolean, p_include_intake_output boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.duplicate_patient_to_tenant(p_source_patient_id text, p_target_tenant_id uuid, p_new_patient_id text, p_include_vitals boolean, p_include_medications boolean, p_include_assessments boolean, p_include_handover_notes boolean, p_include_alerts boolean, p_include_diabetic_records boolean, p_include_bowel_records boolean, p_include_wound_care boolean, p_include_doctors_orders boolean, p_include_labs boolean, p_include_hacmap boolean, p_include_intake_output boolean) IS 'Duplicates a patient and ALL associated data to another tenant. Includes labs, hacMap, intake/output, and all other clinical data with proper foreign key mapping.';


--
-- Name: end_user_session(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.end_user_session() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update active sessions to logged out
  UPDATE user_sessions
  SET status = 'logged_out',
      logout_time = now()
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Session ended - logout time recorded
  
  RETURN true;
END;
$$;


--
-- Name: FUNCTION end_user_session(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.end_user_session() IS 'Ends user session and records logout time';


--
-- Name: ensure_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Create user profile if it doesn't exist
  INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'nurse',  -- Default role
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: ensure_user_profile(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_user_profile(user_id uuid, user_email text) RETURNS public.user_profiles
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  profile user_profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO profile FROM user_profiles WHERE id = user_id;
  
  -- If no profile exists, create one
  IF profile IS NULL THEN
    INSERT INTO user_profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      is_active
    ) VALUES (
      user_id,
      COALESCE(user_email, ''),
      'User',
      '',
      'nurse',
      true
    )
    RETURNING * INTO profile;
  END IF;
  
  RETURN profile;
EXCEPTION
  WHEN OTHERS THEN
    -- Return a basic profile structure even if insert fails
    SELECT user_id, COALESCE(user_email, ''), 'User', '', 'nurse'::user_role, null, null, null, true, now(), now()
    INTO profile.id, profile.email, profile.first_name, profile.last_name, profile.role, 
         profile.department, profile.license_number, profile.phone, profile.is_active, 
         profile.created_at, profile.updated_at;
    RETURN profile;
END;
$$;


--
-- Name: FUNCTION ensure_user_profile(user_id uuid, user_email text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_user_profile(user_id uuid, user_email text) IS 'Creates or retrieves a user profile. Uses immutable search path for security.';


--
-- Name: fetch_medications_for_tenant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fetch_medications_for_tenant(target_tenant_id uuid) RETURNS TABLE(medication_id uuid, patient_id uuid, name text, dosage text, frequency text, route text, prescribed_by text, start_date date, tenant_id uuid, patient_first_name text, patient_last_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can access cross-tenant data.';
    END IF;
    
    -- Return medications for the specified tenant with patient info
    RETURN QUERY
    SELECT 
        pm.id as medication_id,
        pm.patient_id,
        pm.name,
        pm.dosage,
        pm.frequency,
        pm.route,
        pm.prescribed_by,
        pm.start_date,
        pm.tenant_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
    FROM patient_medications pm
    LEFT JOIN patients p ON pm.patient_id = p.id
    WHERE pm.tenant_id = target_tenant_id
    AND pm.status = 'Active'
    ORDER BY pm.name;
END;
$$;


--
-- Name: find_user_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_user_by_email(email_param text) RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.email = email_param
  AND au.deleted_at IS NULL
  LIMIT 1;
$$;


--
-- Name: generate_simulation_id_sets(uuid, integer, text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_simulation_id_sets(p_template_id uuid, p_session_count integer, p_session_names text[] DEFAULT NULL::text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id_sets jsonb := '[]'::jsonb;
  v_session_data jsonb;
  v_patient_mappings jsonb;
  v_med_mappings jsonb;
  v_tenant_id uuid;
  v_patient_record record;
  v_med_record record;
  v_new_patient_uuid uuid;
  v_new_med_uuid uuid;
  i integer;
  v_session_name text;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  RAISE NOTICE '🎯 Generating % reusable ID sets for template %', p_session_count, p_template_id;
  
  -- Generate ID sets for each session
  FOR i IN 1..p_session_count LOOP
    v_patient_mappings := '{}'::jsonb;
    v_med_mappings := '{}'::jsonb;
    
    -- Determine session name
    IF p_session_names IS NOT NULL AND i <= array_length(p_session_names, 1) THEN
      v_session_name := p_session_names[i];
    ELSE
      v_session_name := 'Session ' || i;
    END IF;
    
    RAISE NOTICE '📋 Session %: %', i, v_session_name;
    
    -- Generate unique IDs for patients (these will be reused across resets)
    FOR v_patient_record IN 
      SELECT id, patient_id, first_name, last_name 
      FROM patients 
      WHERE tenant_id = v_tenant_id
      ORDER BY patient_id
    LOOP
      v_new_patient_uuid := gen_random_uuid();
      v_patient_mappings := jsonb_set(
        v_patient_mappings,
        ARRAY[v_patient_record.id::text],
        to_jsonb(v_new_patient_uuid::text)
      );
      
      RAISE NOTICE '  Patient: % % (%) -> %', 
        v_patient_record.first_name, 
        v_patient_record.last_name,
        v_patient_record.patient_id,
        v_new_patient_uuid;
    END LOOP;
    
    -- Generate unique IDs for medications (these will be reused across resets)
    FOR v_med_record IN 
      SELECT pm.id, pm.medication_name, p.patient_id
      FROM patient_medications pm 
      JOIN patients p ON p.id = pm.patient_id 
      WHERE p.tenant_id = v_tenant_id
      ORDER BY p.patient_id, pm.medication_name
    LOOP
      v_new_med_uuid := gen_random_uuid();
      v_med_mappings := jsonb_set(
        v_med_mappings,
        ARRAY[v_med_record.id::text],
        to_jsonb(v_new_med_uuid::text)
      );
      
      RAISE NOTICE '  Medication: % (Patient: %) -> %', 
        v_med_record.medication_name,
        v_med_record.patient_id,
        v_new_med_uuid;
    END LOOP;
    
    -- Build session data
    v_session_data := jsonb_build_object(
      'session_number', i,
      'session_name', v_session_name,
      'created_at', now(),
      'patient_count', (SELECT count(*) FROM patients WHERE tenant_id = v_tenant_id),
      'medication_count', (SELECT count(*) FROM patient_medications pm JOIN patients p ON p.id = pm.patient_id WHERE p.tenant_id = v_tenant_id),
      'id_mappings', jsonb_build_object(
        'patients', v_patient_mappings,
        'medications', v_med_mappings
      )
    );
    
    -- Add to sets array
    v_id_sets := v_id_sets || jsonb_build_array(v_session_data);
  END LOOP;
  
  -- Store all sets in template
  UPDATE simulation_templates
  SET 
    simulation_id_sets = v_id_sets,
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '✅ Generated % reusable ID sets', p_session_count;
  
  RETURN json_build_object(
    'success', true,
    'session_count', p_session_count,
    'sessions', v_id_sets,
    'message', 'ID sets generated successfully. You can now print labels that will work across multiple simulation runs.'
  );
END;
$$;


--
-- Name: get_available_admin_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_admin_users() RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.email_confirmed_at IS NOT NULL
  ORDER BY au.created_at DESC;
$$;


--
-- Name: get_available_tenants_for_transfer(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_tenants_for_transfer(p_source_patient_id text) RETURNS TABLE(tenant_id uuid, tenant_name character varying, subdomain character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_source_tenant_id UUID;
BEGIN
    -- Get source patient's tenant
    SELECT patients.tenant_id INTO v_source_tenant_id
    FROM patients 
    WHERE patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Return all tenants except the source tenant
    RETURN QUERY 
    SELECT 
        t.id,
        t.name,
        t.subdomain
    FROM tenants t
    WHERE t.id != v_source_tenant_id
    AND t.status = 'active'
    ORDER BY t.name;
END;
$$;


--
-- Name: get_backup_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_backup_statistics() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_backups', COUNT(*),
        'completed_backups', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_backups', COUNT(*) FILTER (WHERE status = 'failed'),
        'expired_backups', COUNT(*) FILTER (WHERE status = 'expired'),
        'total_size_bytes', COALESCE(SUM(file_size), 0),
        'total_records', COALESCE(SUM(record_count), 0),
        'encrypted_backups', COUNT(*) FILTER (WHERE encrypted = true),
        'oldest_backup', MIN(created_at),
        'newest_backup', MAX(created_at),
        'total_downloads', COALESCE(SUM(download_count), 0)
    ) INTO stats
    FROM backup_metadata;
    
    RETURN stats;
END;
$$;


--
-- Name: FUNCTION get_backup_statistics(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_backup_statistics() IS 'Returns comprehensive backup system statistics';


--
-- Name: get_cohort_students(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cohort_students(p_cohort_id uuid) RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, student_number text, program_id uuid, program_code text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    sr.user_id,
    up.email,
    up.first_name,
    up.last_name,
    sr.student_number,
    sr.program_id,
    p.code as program_code
  FROM student_roster sr
  JOIN user_profiles up ON up.id = sr.user_id
  JOIN programs p ON p.id = sr.program_id
  WHERE sr.cohort_id = p_cohort_id
    AND sr.is_active = true
  ORDER BY up.last_name, up.first_name;
$$;


--
-- Name: get_secure_alerts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_secure_alerts() RETURNS TABLE(alert_id uuid, patient_id uuid, patient_name text, alert_type text, message text, priority text, acknowledged boolean, acknowledged_by uuid, acknowledged_at timestamp with time zone, created_at timestamp with time zone, tenant_id uuid, tenant_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_exists BOOLEAN := false;
  user_active BOOLEAN := false;
BEGIN
  -- Check if auth.uid() is valid
  IF current_user_id IS NULL OR current_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;

  -- Check if user profile exists and is active
  SELECT 
    EXISTS(SELECT 1 FROM user_profiles WHERE id = current_user_id),
    COALESCE((SELECT is_active FROM user_profiles WHERE id = current_user_id), false)
  INTO user_exists, user_active;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Access denied: User profile not found';
  END IF;
  
  IF NOT user_active THEN
    RAISE EXCEPTION 'Access denied: User account is inactive';
  END IF;

  -- Return alerts using the RLS-protected view
  RETURN QUERY
  SELECT 
    pav.id as alert_id,
    pav.patient_id,
    pav.patient_name,
    pav.alert_type,
    pav.message,
    pav.priority,
    pav.acknowledged,
    pav.acknowledged_by,
    pav.acknowledged_at,
    pav.created_at,
    pav.tenant_id,
    pav.tenant_name
  FROM patient_alerts_view pav
  ORDER BY pav.created_at DESC;
END;
$$;


--
-- Name: get_simulation_label_data(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_simulation_label_data(p_template_id uuid, p_session_number integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_session_data jsonb;
  v_id_mappings jsonb;
  v_label_data json;
BEGIN
  -- Get template info
  SELECT tenant_id, simulation_id_sets->>(p_session_number - 1)
  INTO v_tenant_id, v_session_data
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_session_data IS NULL THEN
    RAISE EXCEPTION 'Session % not found for template %. Generate ID sets first using generate_simulation_id_sets()', 
      p_session_number, p_template_id;
  END IF;
  
  v_id_mappings := v_session_data->'id_mappings';
  
  -- Build label data with pre-allocated IDs
  SELECT json_build_object(
    'session_name', v_session_data->>'session_name',
    'session_number', p_session_number,
    'template_id', p_template_id,
    'patients', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'patients'->>p.id::text)::uuid,
        'patient_id', p.patient_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'full_name', p.first_name || ' ' || p.last_name,
        'date_of_birth', p.date_of_birth,
        'blood_type', p.blood_type,
        'allergies', p.allergies,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-P-' || (v_id_mappings->'patients'->>p.id::text)
      ) ORDER BY p.patient_id)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'medications', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'medications'->>pm.id::text)::uuid,
        'medication_name', pm.medication_name,
        'generic_name', pm.generic_name,
        'dosage', pm.dosage,
        'route', pm.route,
        'frequency', pm.frequency,
        'patient_id', p.patient_id,
        'patient_name', p.first_name || ' ' || p.last_name,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-M-' || (v_id_mappings->'medications'->>pm.id::text)
      ) ORDER BY p.patient_id, pm.medication_name)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  ) INTO v_label_data;
  
  RETURN v_label_data;
END;
$$;


--
-- Name: get_simulation_students(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_simulation_students(p_simulation_id uuid) RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, student_number text, role public.simulation_role, granted_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    sp.user_id,
    up.email,
    up.first_name,
    up.last_name,
    sr.student_number,
    sp.role,
    sp.granted_at,
    sp.last_accessed_at
  FROM simulation_participants sp
  JOIN user_profiles up ON up.id = sp.user_id
  LEFT JOIN student_roster sr ON sr.user_id = sp.user_id
  WHERE sp.simulation_id = p_simulation_id
  ORDER BY sp.role DESC, up.last_name, up.first_name;
$$;


--
-- Name: get_super_admin_tenant_context(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_super_admin_tenant_context() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  tenant_context text;
BEGIN
  -- Only super admins can get tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RETURN NULL;
  END IF;
  
  -- Get current tenant context from session
  SELECT current_setting('app.current_tenant_id', true) INTO tenant_context;
  
  -- Return NULL if empty string (represents ALL_TENANTS mode)
  IF tenant_context = '' OR tenant_context IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN tenant_context;
END;
$$;


--
-- Name: get_tenant_users(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tenant_users(target_tenant_id uuid) RETURNS TABLE(user_id uuid, tenant_id uuid, role text, permissions text[], is_active boolean, email text, first_name text, last_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::TEXT,
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id;
END;
$$;


--
-- Name: get_user_accessible_simulations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_accessible_simulations(p_user_id uuid) RETURNS TABLE(template_id uuid, template_name text, simulation_id uuid, simulation_name text, categories text[], access_reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id as template_id,
    st.name as template_name,
    sa.id as simulation_id,
    sa.name as simulation_name,
    COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]) as categories,
    CASE
      WHEN up.role IN ('super_admin', 'coordinator') THEN 'Super admin/Coordinator access'
      WHEN up.role = 'admin' THEN 'Admin access'
      WHEN st.created_by = p_user_id OR sa.created_by = p_user_id THEN 'Creator'
      WHEN EXISTS (
        SELECT 1 FROM user_programs up_prog
        JOIN programs prog ON prog.id = up_prog.program_id
        WHERE up_prog.user_id = p_user_id
          AND prog.code = ANY(COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]))
      ) THEN 'Program match: ' || array_to_string(
        ARRAY(
          SELECT prog.code FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = p_user_id
        ), ', '
      )
      ELSE 'Unknown'
    END as access_reason
  FROM user_profiles up
  LEFT JOIN simulation_templates st ON true
  LEFT JOIN simulation_active sa ON true
  WHERE up.id = p_user_id
    AND (st.id IS NOT NULL OR sa.id IS NOT NULL);
END;
$$;


--
-- Name: FUNCTION get_user_accessible_simulations(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_accessible_simulations(p_user_id uuid) IS 'Debug function to see what simulations a user can access and why';


--
-- Name: get_user_current_tenant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_current_tenant(target_user_id uuid) RETURNS TABLE(tenant_id uuid, role text, is_active boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    tu.role::TEXT,  -- Cast VARCHAR to TEXT to match return type
    tu.is_active
  FROM tenant_users tu
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  LIMIT 1;
END;
$$;


--
-- Name: get_user_program_codes(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_program_codes(p_user_id uuid) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT ARRAY_AGG(p.code)
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  WHERE up.user_id = p_user_id
    AND p.is_active = true;
$$;


--
-- Name: FUNCTION get_user_program_codes(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_program_codes(p_user_id uuid) IS 'Returns array of program codes assigned to user';


--
-- Name: get_user_program_tenants(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_program_tenants(p_user_id uuid) RETURNS TABLE(tenant_id uuid, tenant_name text, program_id uuid, program_code text, program_name text, subdomain text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    p.id as program_id,
    p.code as program_code,
    p.name as program_name,
    t.subdomain
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  JOIN tenants t ON t.program_id = p.id
  WHERE up.user_id = p_user_id
    AND p.is_active = true
    AND t.status = 'active'
    AND t.tenant_type = 'program'
  ORDER BY p.code;
$$;


--
-- Name: FUNCTION get_user_program_tenants(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_program_tenants(p_user_id uuid) IS 'Returns all program tenants that a user has access to via their program assignments';


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    RETURN user_role;
END;
$$;


--
-- Name: get_user_simulation_assignments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_simulation_assignments(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  -- Security check: Users can only query their own assignments
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is NULL';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only query your own simulation assignments';
  END IF;

  -- Get simulation assignments for the user
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      sp.id,
      sp.simulation_id,
      sp.role,
      sp.granted_at,
      json_build_object(
        'id', sa.id,
        'name', sa.name,
        'status', sa.status,
        'starts_at', sa.starts_at,
        'tenant_id', sa.tenant_id,
        'template', (
          SELECT json_build_object('name', st.name, 'description', st.description)
          FROM simulation_templates st
          WHERE st.id = sa.template_id
        )
      ) as simulation
    FROM simulation_participants sp
    JOIN simulation_active sa ON sa.id = sp.simulation_id
    WHERE sp.user_id = p_user_id
      AND sa.status = 'running'
      AND sa.ends_at > NOW()
    ORDER BY sp.granted_at DESC
  ) t;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_user_simulation_assignments(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_simulation_assignments(p_user_id uuid) IS 'Gets simulation assignments for a user, bypassing RLS restrictions. Used by simulation portal.';


--
-- Name: get_user_simulation_tenant_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_simulation_tenant_access() RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    -- Super admin can access any tenant
    WHEN EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    ) THEN NULL -- NULL means access all tenants
    
    -- Regular users only access their assigned tenant
    ELSE (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      LIMIT 1
    )
  END;
$$;


--
-- Name: FUNCTION get_user_simulation_tenant_access(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_simulation_tenant_access() IS 'Returns NULL for super_admin (access all tenants) or tenant_id for regular users';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


--
-- Name: handle_patient_tenant_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_patient_tenant_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  -- Ensure patient has a tenant_id
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient must have a tenant_id';
  END IF;
  
  -- Verify tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant_id: %', NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_user_profile_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_profile_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$;


--
-- Name: instantiate_simulation_patients(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.instantiate_simulation_patients(p_simulation_id uuid, p_scenario_template_id uuid) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    template_record RECORD;
    patient_id UUID;
    vitals_record RECORD;
    med_record RECORD;
    note_record RECORD;
    patient_count INTEGER := 0;
BEGIN
    -- Loop through all patient templates for this scenario
    FOR template_record IN 
        SELECT * FROM simulation_patient_templates 
        WHERE scenario_template_id = p_scenario_template_id 
        AND is_active = true
    LOOP
        -- Create the simulation patient with proper constraint fields
        INSERT INTO simulation_patients (
            active_simulation_id,
            template_id,          -- Reference to the template
            is_template,          -- Must be false for instantiated patients
            patient_id,
            patient_name,
            date_of_birth,
            gender,
            room_number,
            bed_number,
            diagnosis,
            condition,
            allergies,
            blood_type,
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_phone,
            assigned_nurse
        ) VALUES (
            p_simulation_id,      -- active_simulation_id
            template_record.id,   -- template_id
            false,                -- is_template = false
            gen_random_uuid()::text,
            template_record.patient_name,
            template_record.date_of_birth,
            template_record.gender,
            template_record.room_number,
            template_record.bed_number,
            template_record.diagnosis,
            template_record.condition,
            template_record.allergies,
            template_record.blood_type,
            template_record.emergency_contact_name,
            template_record.emergency_contact_relationship,
            template_record.emergency_contact_phone,
            template_record.assigned_nurse
        ) RETURNING id INTO patient_id;

        -- Add initial vitals from template
        FOR vitals_record IN 
            SELECT * FROM patient_vitals_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_vitals (
                simulation_patient_id,
                vital_type,
                value_systolic,
                value_diastolic,
                value_numeric,
                unit,
                recorded_at,
                recorded_by,
                notes
            ) VALUES (
                patient_id,
                vitals_record.vital_type,
                vitals_record.value_systolic,
                vitals_record.value_diastolic,
                vitals_record.value_numeric,
                vitals_record.unit,
                NOW(),
                'system',
                vitals_record.notes
            );
        END LOOP;

        -- Add initial medications from template
        FOR med_record IN 
            SELECT * FROM patient_medications_templates 
            WHERE patient_template_id = template_record.id 
            AND is_active = true
        LOOP
            INSERT INTO simulation_patient_medications (
                simulation_patient_id,
                medication_name,
                dosage,
                route,
                frequency,
                start_date,
                end_date,
                indication,
                is_prn,
                prn_parameters,
                notes,
                is_active
            ) VALUES (
                patient_id,
                med_record.medication_name,
                med_record.dosage,
                med_record.route,
                med_record.frequency,
                COALESCE(med_record.start_date, CURRENT_DATE),
                med_record.end_date,
                med_record.indication,
                med_record.is_prn,
                med_record.prn_parameters,
                med_record.notes,
                med_record.is_active
            );
        END LOOP;

        -- Add initial notes from template
        FOR note_record IN 
            SELECT * FROM patient_notes_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_notes (
                simulation_patient_id,
                note_type,
                note_content,
                created_by_role,
                created_at,
                priority,
                is_visible_to_students
            ) VALUES (
                patient_id,
                note_record.note_type,
                note_record.note_content,
                note_record.created_by_role,
                COALESCE(note_record.scheduled_time, NOW()),
                note_record.priority,
                note_record.is_visible_to_students
            );
        END LOOP;

        patient_count := patient_count + 1;
    END LOOP;

    RETURN patient_count;
END;
$$;


--
-- Name: is_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_user(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- Return true if the user is an admin or super_admin
    RETURN user_role IN ('admin', 'super_admin');
END;
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_users 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
$$;


--
-- Name: is_super_admin_direct(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin_direct(user_uuid uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
    AND is_active = true
  );
$$;


--
-- Name: is_super_admin_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin_user(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- Return true if the user is a super_admin
    RETURN user_role = 'super_admin';
END;
$$;


--
-- Name: is_tenant_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_tenant_admin(tenant_uuid uuid, user_uuid uuid DEFAULT auth.uid()) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: launch_run(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.launch_run(p_snapshot_id uuid, p_run_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_run_id UUID;
    v_snapshot_data JSONB;
    v_patient JSONB;
    v_barcode JSONB;
    v_run_patient_id UUID;
BEGIN
    -- Get snapshot data
    SELECT snapshot_data INTO v_snapshot_data
    FROM sim_snapshots
    WHERE id = p_snapshot_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Snapshot not found: %', p_snapshot_id;
    END IF;
    
    -- Create the run
    INSERT INTO sim_runs (
        snapshot_id,
        name,
        created_by
    ) VALUES (
        p_snapshot_id,
        p_run_name,
        auth.uid()
    ) RETURNING id INTO v_run_id;
    
    -- Create stable run patients (preserve public IDs from template)
    FOR v_patient IN 
        SELECT * FROM jsonb_array_elements(v_snapshot_data->'patients')
    LOOP
        INSERT INTO sim_run_patients (
            run_id,
            template_patient_id,
            public_patient_id,
            room,
            bed
        ) VALUES (
            v_run_id,
            (v_patient->>'id')::UUID,
            v_patient->>'public_patient_id',
            v_patient->>'room',
            v_patient->>'bed'
        );
    END LOOP;
    
    -- Create stable barcode pool (preserve public barcode IDs from template)
    FOR v_barcode IN
        SELECT 
            tb.*,
            tm.medication_name
        FROM jsonb_array_elements(v_snapshot_data->'barcodes') tb
        JOIN jsonb_array_elements(v_snapshot_data->'medications') tm
            ON (tb->>'template_med_id')::UUID = (tm->>'id')::UUID
    LOOP
        INSERT INTO sim_run_barcode_pool (
            run_id,
            template_barcode_id,
            public_barcode_id,
            medication_name
        ) VALUES (
            v_run_id,
            (v_barcode->>'id')::UUID,
            v_barcode->>'public_barcode_id',
            v_barcode->>'medication_name'
        );
    END LOOP;
    
    RETURN v_run_id;
END;
$$;


--
-- Name: FUNCTION launch_run(p_snapshot_id uuid, p_run_name text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.launch_run(p_snapshot_id uuid, p_run_name text) IS 'Launches active simulation from snapshot';


--
-- Name: launch_simulation(uuid, text, integer, uuid[], text[], text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.launch_simulation(p_template_id uuid, p_name text, p_duration_minutes integer, p_participant_user_ids uuid[], p_participant_roles text[] DEFAULT NULL::text[], p_primary_categories text[] DEFAULT '{}'::text[], p_sub_categories text[] DEFAULT '{}'::text[]) RETURNS TABLE(simulation_id uuid, tenant_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_simulation_tenant_id UUID;
  v_home_tenant_id UUID;
  v_user_role TEXT;
  v_simulation_id UUID;
  v_snapshot JSONB;
  v_patient_count INTEGER;
  v_template_snapshot_version INTEGER;
BEGIN
  -- Get user's role from user_profiles
  SELECT up.role INTO v_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Get user's home tenant_id from user_tenant_access
  SELECT uta.tenant_id INTO v_home_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
  LIMIT 1;
  
  -- Super admins without tenant: use first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT t.id INTO v_home_tenant_id
    FROM tenants t
    WHERE t.is_simulation = false
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  -- Fetch the template snapshot AND current version
  SELECT st.snapshot_data, st.snapshot_version
  INTO v_snapshot, v_template_snapshot_version
  FROM simulation_templates st
  WHERE st.id = p_template_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Generate new simulation ID
  v_simulation_id := gen_random_uuid();

  -- Create new simulation tenant (temporary tenant for this simulation session)
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    v_home_tenant_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active'
  )
  RETURNING id INTO v_simulation_tenant_id;

  -- Restore snapshot to the NEW simulation tenant (creates patients and all baseline data)
  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_simulation_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false
  );

  -- Count patients created
  SELECT COUNT(*) INTO v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with categories
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,
    created_by,
    status,
    template_snapshot_version,
    template_snapshot_version_synced,
    primary_categories,
    sub_categories
  )
  VALUES (
    v_simulation_id,
    v_simulation_tenant_id,
    p_template_id,
    p_name,
    p_duration_minutes,
    NOW(),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    auth.uid(),
    'running',
    v_template_snapshot_version,
    v_template_snapshot_version,
    p_primary_categories,
    p_sub_categories
  );

  RAISE NOTICE 'Simulation launched: % (%) with categories: Primary=[%], Sub=[%]',
    v_simulation_id, p_name, 
    array_to_string(p_primary_categories, ', '), 
    array_to_string(p_sub_categories, ', ');

  -- =========================================================================
  -- FIX: Add the launching instructor to tenant_users so they can read all
  -- clinical tables when generating the debrief on completion.
  -- Previously only participants were added here; the launcher was omitted,
  -- causing RLS to block getStudentActivitiesBySimulation for non-super_admins.
  -- =========================================================================
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (auth.uid(), v_simulation_tenant_id, true, 'admin')
  ON CONFLICT (user_id, tenant_id) DO UPDATE
    SET is_active = true, role = 'admin';

  RAISE NOTICE '✅ Launching instructor added to simulation tenant_users for debrief access';

  -- Add participants if provided
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1)
    LOOP
      -- Add to simulation_participants table
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        p_participant_user_ids[i],
        COALESCE(p_participant_roles[i], 'student')::simulation_role,
        auth.uid()
      );
      
      -- Add to tenant_users for RLS access to simulation tenant data
      -- Map simulation roles to valid tenant_users roles: instructor→admin, student→nurse
      INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
      VALUES (
        p_participant_user_ids[i], 
        v_simulation_tenant_id, 
        true,
        CASE COALESCE(p_participant_roles[i], 'student')
          WHEN 'instructor' THEN 'admin'
          WHEN 'student' THEN 'nurse'
          ELSE 'nurse'
        END
      )
      ON CONFLICT (user_id, tenant_id) DO UPDATE
        SET is_active = true;
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation with tenant access', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    'Simulation launched successfully'::TEXT AS message;
END;
$$;


--
-- Name: FUNCTION launch_simulation(p_template_id uuid, p_name text, p_duration_minutes integer, p_participant_user_ids uuid[], p_participant_roles text[], p_primary_categories text[], p_sub_categories text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.launch_simulation(p_template_id uuid, p_name text, p_duration_minutes integer, p_participant_user_ids uuid[], p_participant_roles text[], p_primary_categories text[], p_sub_categories text[]) IS 'Launch simulation with category tags for organization and filtering. Instructor (launcher) is explicitly added to tenant_users for debrief RLS access.';


--
-- Name: mark_expired_backups(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_expired_backups() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired backups
    UPDATE backup_metadata 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'completed' 
    AND expiry_date < NOW()
    AND status != 'expired';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the expiration
    INSERT INTO backup_audit_log (user_id, action, details)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID, -- System user
        'backup_expired', 
        jsonb_build_object('expired_count', expired_count)
    );
    
    RETURN expired_count;
END;
$$;


--
-- Name: FUNCTION mark_expired_backups(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.mark_expired_backups() IS 'Automatically marks backups as expired based on expiry_date';


--
-- Name: move_patient_to_tenant(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_patient_to_tenant(p_source_patient_id text, p_target_tenant_id uuid) RETURNS TABLE(patient_id uuid, patient_identifier character varying, records_updated jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_patient_uuid UUID;
    v_patient_identifier VARCHAR(255);
    v_vitals_count INTEGER := 0;
    v_medications_count INTEGER := 0;
BEGIN
    -- Get patient UUID and identifier
    SELECT id, patients.patient_id INTO v_patient_uuid, v_patient_identifier
    FROM patients 
    WHERE patients.patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Update patient tenant
    UPDATE patients 
    SET tenant_id = p_target_tenant_id,
        updated_at = NOW()
    WHERE id = v_patient_uuid;
    
    -- Update vitals tenant
    UPDATE patient_vitals 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    -- Update medications tenant
    UPDATE patient_medications 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT 
        v_patient_uuid,
        v_patient_identifier,
        jsonb_build_object(
            'vitals_updated', v_vitals_count,
            'medications_updated', v_medications_count
        );
END;
$$;


--
-- Name: move_patient_to_tenant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_patient_to_tenant(p_patient_id uuid, p_target_tenant_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE patients 
    SET tenant_id = p_target_tenant_id, updated_at = NOW()
    WHERE id = p_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;
    
    RETURN TRUE;
END;
$$;


--
-- Name: protect_medication_identifiers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_medication_identifiers() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Cannot change medication ID! Barcodes depend on this ID.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION protect_medication_identifiers(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.protect_medication_identifiers() IS 'Protects medication IDs from changes to preserve barcode validity';


--
-- Name: protect_patient_identifiers(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_patient_identifiers() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.patient_id IS DISTINCT FROM NEW.patient_id THEN
    RAISE EXCEPTION 'Cannot change patient_id! Pre-printed labels depend on this ID.';
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Cannot change patient UUID!';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION protect_patient_identifiers(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.protect_patient_identifiers() IS 'Protects patient_id from changes to preserve pre-printed label validity';


--
-- Name: protect_super_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_super_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only block the change if:
  -- 1. The role is being changed FROM super_admin
  -- 2. The user making the change is NOT a super_admin themselves
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    -- Check if the current user is a super_admin
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Cannot change role of super_admin users';
    END IF;
    
    -- Log the change for audit purposes
    RAISE NOTICE 'Super admin % changed role from % to % by %', 
      OLD.id, OLD.role, NEW.role, auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION protect_super_admin_role(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.protect_super_admin_role() IS 'Prevents non-super-admins from changing super_admin roles, but allows super_admins to demote other super_admins. Includes audit logging for security compliance.';


--
-- Name: reactivate_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reactivate_user(target_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate users';
  END IF;
  
  -- Reactivate user
  UPDATE user_profiles 
  SET is_active = true, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User reactivated successfully';
END;
$$;


--
-- Name: reassign_user_tenant(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reassign_user_tenant(p_user_id uuid, p_new_tenant_id uuid, p_role text DEFAULT 'nurse'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_existing_count integer;
  v_deleted_count integer;
BEGIN
  -- Verify the caller is a super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can reassign user tenants';
  END IF;

  -- Verify the target user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verify the target tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_new_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found: %', p_new_tenant_id;
  END IF;

  -- Count existing tenant assignments
  SELECT COUNT(*) INTO v_existing_count
  FROM tenant_users
  WHERE user_id = p_user_id;

  -- Delete all existing tenant assignments for this user
  DELETE FROM tenant_users
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Insert the new tenant assignment
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (p_user_id, p_new_tenant_id, true, p_role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = true, role = EXCLUDED.role;

  RAISE NOTICE 'User % reassigned from % tenants to tenant %', 
    p_user_id, v_deleted_count, p_new_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_tenant_id', p_new_tenant_id,
    'previous_tenant_count', v_existing_count,
    'deleted_count', v_deleted_count
  );
END;
$$;


--
-- Name: FUNCTION reassign_user_tenant(p_user_id uuid, p_new_tenant_id uuid, p_role text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reassign_user_tenant(p_user_id uuid, p_new_tenant_id uuid, p_role text) IS 'Reassigns a user to a different tenant. Uses SECURITY DEFINER to bypass RLS. 
Only callable by super_admins. Removes all existing tenant assignments and creates a new one.';


--
-- Name: refresh_user_tenant_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_user_tenant_cache() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_tenant_cache;
END;
$$;


--
-- Name: remove_user_from_tenant(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_user_from_tenant(tenant_uuid uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    UPDATE public.tenant_users
    SET is_active = false,
        updated_at = NOW()
    WHERE tenant_id = tenant_uuid
    AND user_id = user_uuid;
    
    RETURN FOUND;
END;
$$;


--
-- Name: reset_run(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_run(p_run_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_deleted_counts JSONB;
    v_vitals_count INTEGER;
    v_med_admin_count INTEGER; 
    v_alert_ack_count INTEGER;
    v_notes_count INTEGER;
    v_tenant_check UUID;
BEGIN
    -- Verify run exists and user has access (RLS will enforce this but let's be explicit)
    SELECT st.tenant_id INTO v_tenant_check
    FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = p_run_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Run not found or access denied: %', p_run_id;
    END IF;
    
    -- Prevent concurrent writes during reset with advisory lock
    -- Use a unique lock ID based on the run_id
    PERFORM pg_advisory_xact_lock(
        ('x' || substr(md5('sim_run:' || p_run_id::text), 1, 16))::bit(64)::bigint
    );
    
    -- Delete ONLY event data (student-entered changes)
    -- DO NOT touch sim_run_patients or sim_run_barcode_pool (preserves printed IDs)
    
    DELETE FROM sim_run_vitals_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    DELETE FROM sim_run_med_admin_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
    
    DELETE FROM sim_run_alert_acks WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_alert_ack_count = ROW_COUNT;
    
    DELETE FROM sim_run_notes WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_notes_count = ROW_COUNT;
    
    -- Delete lab orders created during run
    DELETE FROM lab_orders lo
    USING sim_run_patients rp, patients p
    WHERE lo.patient_id = p.id
    AND p.patient_id = rp.public_patient_id
    AND rp.run_id = p_run_id;
    
    -- Delete hacmap markers created during run  
    DELETE FROM hacmap_markers hm
    USING sim_run_patients rp, patients p
    WHERE hm.patient_id = p.id
    AND p.patient_id = rp.public_patient_id
    AND rp.run_id = p_run_id;
    
    -- Update run status and timestamp
    UPDATE sim_runs 
    SET updated_at = NOW()
    WHERE id = p_run_id;
    
    -- Prepare result summary
    v_deleted_counts := jsonb_build_object(
        'vitals_events', v_vitals_count,
        'med_admin_events', v_med_admin_count,
        'alert_acknowledgments', v_alert_ack_count,
        'notes', v_notes_count,
        'total_deleted', v_vitals_count + v_med_admin_count + v_alert_ack_count + v_notes_count,
        'reset_at', NOW(),
        'run_id', p_run_id
    );
    
    -- Send notification for real-time updates
    PERFORM pg_notify('sim_run_reset', p_run_id::text);
    
    -- Log the reset action (optional - could be in a separate audit table)
    INSERT INTO sim_run_notes (
        run_id,
        run_patient_id,
        note_type,
        author_id,
        author_role,
        title,
        content
    ) VALUES (
        p_run_id,
        NULL, -- System note, not patient-specific
        'system',
        auth.uid(),
        'system',
        'Simulation Reset',
        format('Reset completed. Deleted: %s vitals, %s med admins, %s alert acks, %s notes',
               v_vitals_count, v_med_admin_count, v_alert_ack_count, v_notes_count)
    );
    
    RETURN v_deleted_counts;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Reset failed for run %: %', p_run_id, SQLERRM;
END;
$$;


--
-- Name: FUNCTION reset_run(p_run_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reset_run(p_run_id uuid) IS 'Resets simulation by deleting only event data, preserving printed IDs';


--
-- Name: reset_simulation_for_next_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_simulation_for_next_session(p_simulation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_original jsonb;  -- Keep original snapshot with medications
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_stats jsonb := '{}'::jsonb;
BEGIN
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  -- Save original snapshot (before we remove medications)
  v_snapshot_original := v_snapshot;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;

  RAISE NOTICE '✅ Found simulation - tenant: %, template: %', v_tenant_id, v_template_id;
  
  -- =====================================================
  -- STEP 1: SAVE PATIENT & MEDICATION BARCODE IDs (CRITICAL!)
  -- =====================================================
  -- These are printed on labels and CANNOT change
  
  -- Save patient barcodes
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id 
    FROM patients 
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at
  LOOP
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '💾 Saving patient barcode: % has barcode %', v_patient_id, v_barcode;
  END LOOP;
  


  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (preserve medications!)
  -- =====================================================
  -- Delete student-added data but KEEP medications (preserve UUIDs for barcodes)
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % medication administrations', v_count;
  
  -- 🆕 DON'T delete medications - preserve them like we preserve patients!
  -- DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '💊 Preserving medications (like patients) - UUIDs and barcodes stay consistent';
  
  -- 🔄 Reset medication administration timing (for back-to-back sessions)
  UPDATE patient_medications
  SET last_administered = NULL
  WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🔄 Reset % medication administration times for new session', v_count;
  
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % vitals', v_count;
  
  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % neuro assessments', v_count;
  
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % notes', v_count;
  
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % alerts', v_count;
  
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % images', v_count;
  
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wound assessments', v_count;
  
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % device assessments', v_count;
  
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab results', v_count;
  
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab panels', v_count;
  
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % BBIT entries', v_count;
  
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % newborn assessments', v_count;
  
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % doctors orders', v_count;
  
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % handover notes', v_count;
  
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % advanced directives', v_count;
  
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab orders', v_count;
  
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % bowel records', v_count;
  
  -- Try tenant_id first, fall back to patient_id if column doesn't exist
  BEGIN
    DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via tenant_id)', v_count;
  EXCEPTION WHEN undefined_column THEN
    DELETE FROM patient_intake_output_events WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via patient_id)', v_count;
  END;
  
  -- Delete baseline items too (will be restored from snapshot)
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wounds', v_count;
  
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % devices', v_count;
  
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % avatar locations', v_count;
  
  RAISE NOTICE '✅ All data deleted (except patients and medications)';

  -- =====================================================
  -- STEP 3: RESTORE FROM SNAPSHOT WITH BARCODE PRESERVATION
  -- =====================================================
  -- Remove medications from snapshot - they're preserved like patients
  -- KEEP patients in snapshot - restore function needs them to build patient mapping!
  v_snapshot := v_snapshot - 'patient_medications';
  RAISE NOTICE '💊 Removed medications from snapshot (preserved with their UUIDs)';
  RAISE NOTICE '👥 Keeping patients in snapshot for ID mapping (will not create new patients due to preserve_barcodes flag)';
  
  -- Restore all baseline data, mapping to existing patients
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;
  
  RAISE NOTICE '✅ Restored snapshot with preserved barcodes';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);
  RAISE NOTICE '💊 Medications preserved unchanged (like patients) - UUIDs and barcodes stay consistent';

  -- =====================================================
  -- STEP 4: SET STATUS TO PENDING (Ready to start, NOT auto-start)
  -- =====================================================
  
  UPDATE simulation_active
  SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    completed_at = NULL,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  RAISE NOTICE '✅ Status set to PENDING - simulation ready to start manually';
  RAISE NOTICE '⏱️  Timer will be set when instructor clicks Play';

  -- =====================================================
  -- STEP 5: LOG THE RESET
  -- =====================================================
  
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_reset',
    v_result,
    'Simulation reset for next session - status set to pending, ready for manual start'
  );

  RAISE NOTICE '🎉 Session reset complete! Simulation ready to start.';
  
  -- Return success with pending status message and detailed restore info
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'status', 'pending',
    'message', 'Simulation reset successfully. Click Play to start when ready.',
    'restore_details', v_result,
    'restored_counts', COALESCE(v_result->'restored_counts', '{}'::jsonb),
    'patients_preserved', (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant_id),
    'medications_preserved', (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;


--
-- Name: FUNCTION reset_simulation_for_next_session(p_simulation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reset_simulation_for_next_session(p_simulation_id uuid) IS 'Reset simulation for next session - preserves patient/medication barcodes, sets status to pending (manual start required)';


--
-- Name: reset_simulation_with_template_updates(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_simulation_with_template_updates(p_simulation_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_restore_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_template_version INT;
  v_patient_comparison JSONB;
  v_template_meds JSONB;
  v_template_med JSONB;
  v_meds_added INT := 0;
  v_med_exists BOOLEAN;
  v_med_id UUID;
  v_med_record RECORD;
  v_template_med_count INT := 0;
  v_sim_med_count INT := 0;
  v_meds_removed INT := 0;
  i INT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_dob TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 Starting template sync reset for simulation: %', p_simulation_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  -- STEP 0: Check if patient lists match (CRITICAL VALIDATION)
  SELECT compare_simulation_template_patients(p_simulation_id) INTO v_patient_comparison;
  
  IF (v_patient_comparison->>'requires_relaunch')::boolean = true THEN
    RAISE EXCEPTION 'PATIENT_LIST_CHANGED: Cannot preserve barcodes - patient list changed.';
  END IF;
  
  RAISE NOTICE '✅ Patient lists match - barcodes can be preserved';
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_version
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  RAISE NOTICE '📋 Simulation Details:';
  RAISE NOTICE '  - Simulation ID: %', p_simulation_id;
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Template ID: %', v_template_id;
  RAISE NOTICE '  - Template Version: %', v_template_version;
  RAISE NOTICE '  - Snapshot medications: %', jsonb_array_length(v_snapshot->'patient_medications');

  -- Build mapping: template patient UUID → barcode
  -- Extract from snapshot's patients array
  FOR i IN 0..jsonb_array_length(v_snapshot->'patients') - 1 LOOP
    v_patient_id := ((v_snapshot->'patients')->i->>'id')::uuid;
    v_barcode := (v_snapshot->'patients')->i->>'patient_id';
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '🔗 Template patient % → Barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (keep meds & patients!)
  -- =====================================================
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  UPDATE patient_medications SET last_administered = NULL WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

  -- =====================================================
  -- STEP 3: INSERT NEW MEDICATIONS (Property-based matching)
  -- =====================================================
  -- Since simulation launch creates NEW UUIDs, we can't compare by ID
  -- Instead: match by patient barcode + medication properties
  -- New meds get NEW UUIDs = NEW barcodes (print labels for these only)
  
  v_template_meds := v_snapshot->'patient_medications';
  IF v_template_meds IS NOT NULL THEN
    v_template_med_count := jsonb_array_length(v_template_meds);
    
    -- Count existing meds BEFORE sync
    SELECT COUNT(*) INTO v_sim_med_count FROM patient_medications WHERE tenant_id = v_tenant_id;
    
    RAISE NOTICE '📋 Template has % medications, simulation currently has %', v_template_med_count, v_sim_med_count;
    
    FOR i IN 0..jsonb_array_length(v_template_meds) - 1 LOOP
      v_template_med := v_template_meds->i;
      
      -- Get template patient demographics (not barcode - barcodes change!)
      SELECT 
        pat.value->>'first_name',
        pat.value->>'last_name',
        pat.value->>'date_of_birth'
      INTO v_first_name, v_last_name, v_dob
      FROM jsonb_array_elements(v_snapshot->'patients') AS pat
      WHERE (pat.value->>'id')::uuid = (v_template_med->>'patient_id')::uuid;
      
      IF v_first_name IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication % - patient UUID % not found in snapshot', 
          v_template_med->>'name', v_template_med->>'patient_id';
        CONTINUE;
      END IF;
      
      RAISE NOTICE '🔍 Medication: % (%s %s) for patient % % (DOB: %)', 
        v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route',
        v_first_name, v_last_name, v_dob;
      
      -- Find simulation patient by demographics (NOT barcode!)
      SELECT id, patient_id INTO v_patient_id, v_barcode
      FROM patients 
      WHERE tenant_id = v_tenant_id 
        AND first_name = v_first_name
        AND last_name = v_last_name
        AND date_of_birth = v_dob::date;
      
      IF v_patient_id IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication - patient % % (DOB: %) not found in simulation', 
          v_first_name, v_last_name, v_dob;
        CONTINUE;
      END IF;
      
      RAISE NOTICE '   → Mapped to simulation patient % (barcode: %)', v_patient_id, v_barcode;
      
      -- Check if medication exists by properties (name, dosage, route for this patient)
      SELECT EXISTS (
        SELECT 1 FROM patient_medications
        WHERE tenant_id = v_tenant_id 
          AND patient_id = v_patient_id
          AND name = v_template_med->>'name'
          AND dosage = v_template_med->>'dosage'
          AND route = v_template_med->>'route'
      ) INTO v_med_exists;
      
      IF NOT v_med_exists THEN
        RAISE NOTICE '➕ Adding new medication: % %mg %s for patient %', 
          v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route', v_barcode;
        
        BEGIN
          -- Insert with NEW UUID (generates NEW barcode automatically)
          INSERT INTO patient_medications (
            tenant_id, patient_id, name, dosage, route, frequency,
            admin_time, admin_times, category, start_date, end_date,
            next_due, prescribed_by, status, last_administered
          ) VALUES (
            v_tenant_id,
            v_patient_id,  -- Mapped to simulation patient
            v_template_med->>'name',
            v_template_med->>'dosage',
            v_template_med->>'route',
            v_template_med->>'frequency',
            v_template_med->>'admin_time',
            v_template_med->'admin_times',
            v_template_med->>'category',
            (v_template_med->>'start_date')::date,
            CASE WHEN v_template_med->>'end_date' IS NOT NULL 
                 THEN (v_template_med->>'end_date')::date 
                 ELSE NULL END,
            CASE WHEN v_template_med->>'next_due' IS NOT NULL 
                 THEN (v_template_med->>'next_due')::timestamptz 
                 ELSE NULL END,
            v_template_med->>'prescribed_by',
            COALESCE(v_template_med->>'status', 'active'),
            NULL
          );
          
          v_meds_added := v_meds_added + 1;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ ERROR inserting medication: % - Error: %', v_template_med->>'name', SQLERRM;
        END;
      ELSE
        RAISE NOTICE '⏭️ Already exists: % for patient %', v_template_med->>'name', v_barcode;
      END IF;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 MEDICATION SYNC: % new medications added', v_meds_added;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  END IF;

  -- =====================================================
  -- STEP 3B: DELETE REMOVED MEDICATIONS
  -- =====================================================
  -- Find sim medications that DON'T exist in template and delete them
  -- Preserves medication_administrations (student work history)
  
  RAISE NOTICE '🔍 Checking for medications removed from template...';
  
  FOR v_med_record IN 
    SELECT pm.id, pm.name, pm.dosage, pm.route, p.first_name, p.last_name, p.date_of_birth
    FROM patient_medications pm
    JOIN patients p ON p.id = pm.patient_id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    -- Check if this medication exists in template
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_snapshot->'patient_medications') AS med
      JOIN jsonb_array_elements(v_snapshot->'patients') AS pat 
        ON (pat.value->>'id')::uuid = (med.value->>'patient_id')::uuid
      WHERE med.value->>'name' = v_med_record.name
        AND med.value->>'dosage' = v_med_record.dosage
        AND med.value->>'route' = v_med_record.route
        AND pat.value->>'first_name' = v_med_record.first_name
        AND pat.value->>'last_name' = v_med_record.last_name
        AND (pat.value->>'date_of_birth')::date = v_med_record.date_of_birth
    ) THEN
      RAISE NOTICE '➖ Removing deleted medication: % % %s for patient % %', 
        v_med_record.name, v_med_record.dosage, v_med_record.route,
        v_med_record.first_name, v_med_record.last_name;
      
      DELETE FROM patient_medications WHERE id = v_med_record.id;
      v_meds_removed := v_meds_removed + 1;
    END IF;
  END LOOP;
  
  IF v_meds_removed > 0 THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REMOVED: % medications deleted from template', v_meds_removed;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '✅ No medications removed from template';
  END IF;

  -- =====================================================
  -- STEP 4: RESTORE OTHER DATA FROM TEMPLATE
  -- =====================================================
  
  -- Remove patient_medications from snapshot (we handled it above)
  v_snapshot := v_snapshot - 'patient_medications';
  
  -- Build barcode mapping for restore_snapshot_to_tenant (sim patient UUID → barcode)
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id ORDER BY created_at
  LOOP
    v_restore_barcodes := v_restore_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
  END LOOP;
  
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_restore_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;

  -- =====================================================
  -- STEP 5: UPDATE SIMULATION STATUS & LOG
  -- =====================================================
  
  UPDATE simulation_active SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    template_snapshot_version_synced = v_template_version,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  -- Only log if we have an authenticated user (skip during direct SQL testing)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO simulation_activity_log (
      simulation_id, user_id, action_type, action_details, notes
    ) VALUES (
      p_simulation_id, auth.uid(), 'synced_from_template',
      jsonb_build_object(
        'template_version', v_template_version,
        'meds_added', v_meds_added,
        'meds_removed', v_meds_removed
      ),
      format('Synced to template v%s: %s added, %s removed', 
        v_template_version, v_meds_added, v_meds_removed)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_version_synced', v_template_version,
    'medications_added', v_meds_added,
    'medications_removed', v_meds_removed,
    'template_medication_count', v_template_med_count,
    'simulation_medication_count_before', v_sim_med_count,
    'simulation_medication_count_after', v_sim_med_count + v_meds_added - v_meds_removed
  );
END;
$$;


--
-- Name: FUNCTION reset_simulation_with_template_updates(p_simulation_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reset_simulation_with_template_updates(p_simulation_id uuid) IS 'Smart template sync: Matches medications by properties (patient+name+dosage+route), not UUIDs. Inserts NEW medications with NEW UUIDs/barcodes. Instructor prints labels for newly added medications only. Existing medication barcodes unchanged.';


--
-- Name: restore_snapshot_to_tenant(uuid, jsonb, jsonb, jsonb, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb DEFAULT NULL::jsonb, p_barcode_mappings jsonb DEFAULT NULL::jsonb, p_preserve_barcodes boolean DEFAULT false, p_skip_patients boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_table_data jsonb;
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_id_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_count integer;
  v_count_check integer;
  v_total_records integer := 0;
  v_columns text[];
  v_placeholders text[];
  v_values text[];
  v_sql text;
  v_col record;
  i integer;
  v_array_elements text;
  v_column_type text;
  v_udt_name text;
  v_mapped_count integer;
BEGIN
  RAISE NOTICE '🔄 Schema-agnostic restore to tenant % (skip_patients=%, preserve_barcodes=%)', 
    p_tenant_id, p_skip_patients, p_preserve_barcodes;
  
  -- =====================================================
  -- STEP 1: Build patient mapping
  -- =====================================================
  
  IF p_preserve_barcodes AND p_snapshot ? 'patients' THEN
    RAISE NOTICE '💾 Preserving patient barcodes - mapping by demographics (first/last/dob)';
    v_mapped_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Match by demographics – the only stable cross-tenant identifier.
      -- DO NOT use created_at ORDER + OFFSET: simulation patients all share
      -- the same created_at (inserted in one transaction), making OFFSET
      -- non-deterministic and causing cross-patient data mapping.
      SELECT id INTO v_new_patient_id
      FROM patients
      WHERE tenant_id = p_tenant_id
        AND first_name = v_record->>'first_name'
        AND last_name  = v_record->>'last_name'
        AND date_of_birth = (v_record->>'date_of_birth')::date;
      
      IF v_new_patient_id IS NULL THEN
        RAISE EXCEPTION 'Cannot map snapshot patient % % (DOB: %) — no matching patient found in simulation tenant %',
          v_record->>'first_name', v_record->>'last_name', v_record->>'date_of_birth', p_tenant_id;
      END IF;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      
      RAISE NOTICE '💾 Mapped snapshot patient % (% %) → existing patient % (barcode preserved)', 
        v_old_patient_id, v_record->>'first_name', v_record->>'last_name', v_new_patient_id;
      v_mapped_count := v_mapped_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Mapped % patients by demographics', v_mapped_count;
    
  ELSIF p_skip_patients AND p_id_mappings IS NOT NULL THEN
    v_patient_mapping := p_id_mappings;
    v_id_mapping := p_id_mappings;
    RAISE NOTICE '📋 Using existing patient IDs from mapping: %', jsonb_pretty(v_patient_mapping);
    
  ELSIF p_snapshot ? 'patients' THEN
    RAISE NOTICE '👤 Creating new patients...';
    v_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      v_new_patient_id := gen_random_uuid();
      
      v_columns := ARRAY[]::text[];
      v_values := ARRAY[]::text[];
      
      v_columns := array_append(v_columns, 'tenant_id');
      v_values := array_append(v_values, quote_literal(p_tenant_id));
      
      v_columns := array_append(v_columns, 'id');
      v_values := array_append(v_values, quote_literal(v_new_patient_id));
      
      v_columns := array_append(v_columns, 'patient_id');
      IF p_preserve_barcodes AND p_barcode_mappings ? v_new_patient_id::text THEN
        v_values := array_append(v_values, quote_literal(p_barcode_mappings->>v_new_patient_id::text));
        RAISE NOTICE '💾 Preserving barcode for patient %: %', 
          v_new_patient_id, p_barcode_mappings->>v_new_patient_id::text;
      ELSE
        v_values := array_append(v_values, quote_literal('P' || floor(random() * 90000 + 10000)::text));
      END IF;
      
      FOR v_col IN 
        SELECT key, value 
        FROM jsonb_each(v_record)
        WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
      LOOP
        SELECT COUNT(*) INTO v_count_check
        FROM information_schema.columns
        WHERE table_name = 'patients'
        AND column_name = v_col.key
        AND table_schema = 'public';
        
        IF v_count_check = 0 THEN
          RAISE NOTICE '⚠️  Skipping patient column % - does not exist in patients table', v_col.key;
          CONTINUE;
        END IF;
        
        v_columns := array_append(v_columns, quote_ident(v_col.key));
        
        -- Handle empty arrays correctly
        IF jsonb_typeof(v_col.value) = 'array' THEN
          SELECT string_agg(quote_literal(elem), ',')
          INTO v_array_elements
          FROM jsonb_array_elements_text(v_col.value) elem;
          
          IF v_array_elements IS NULL OR v_array_elements = '' THEN
            -- Empty array - add ARRAY[]::text[]
            v_values := array_append(v_values, 'ARRAY[]::text[]');
          ELSE
            -- Non-empty array
            v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
          END IF;
        ELSIF v_col.value = 'null'::jsonb THEN
          v_values := array_append(v_values, 'NULL');
        ELSE
          v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
        END IF;
      END LOOP;
      
      v_sql := format('INSERT INTO patients (%s) VALUES (%s)',
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );
      EXECUTE v_sql;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_count := v_count + 1;
    END LOOP;
    
    v_total_records := v_total_records + v_count;
    RAISE NOTICE '✅ Restored % patients', v_count;
  END IF;
  
  -- =====================================================
  -- STEP 2: Restore ALL other tables dynamically
  -- =====================================================
  FOR v_table_name IN 
    SELECT key as table_name
    FROM jsonb_object_keys(p_snapshot) key
    WHERE key NOT IN ('patients', 'snapshot_metadata')
    ORDER BY 
      CASE key
        WHEN 'avatar_locations' THEN 1
        WHEN 'devices' THEN 2
        WHEN 'wounds' THEN 2
        WHEN 'lab_panels' THEN 3
        WHEN 'lab_results' THEN 4
        ELSE 5
      END
  LOOP
    v_table_data := p_snapshot->v_table_name;
    
    v_actual_table_name := CASE 
      WHEN v_table_name = 'medications' THEN 'patient_medications'
      ELSE v_table_name
    END;
    
    IF jsonb_array_length(v_table_data) > 0 THEN
      RAISE NOTICE '📦 Restoring % (% records)...', v_table_name, jsonb_array_length(v_table_data);
      v_count := 0;
      
      FOR v_record IN SELECT * FROM jsonb_array_elements(v_table_data)
      LOOP
        v_columns := ARRAY[]::text[];
        v_values := ARRAY[]::text[];
        
        IF v_table_name = 'devices' THEN
          RAISE NOTICE '🔧 Processing device: type=%, location_id=%', 
            v_record->>'type', v_record->>'location_id';
        END IF;
        
        v_old_id := (v_record->>'id')::uuid;
        v_new_id := gen_random_uuid();
        v_columns := array_append(v_columns, 'id');
        v_values := array_append(v_values, quote_literal(v_new_id));
        v_id_mapping := v_id_mapping || jsonb_build_object(v_old_id::text, v_new_id);
        
        IF v_record ? 'tenant_id' THEN
          v_columns := array_append(v_columns, 'tenant_id');
          v_values := array_append(v_values, quote_literal(p_tenant_id));
        END IF;
        
        IF v_record ? 'patient_id' THEN
          v_old_patient_id := (v_record->>'patient_id')::uuid;
          
          IF v_patient_mapping ? v_old_patient_id::text THEN
            v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
            v_columns := array_append(v_columns, 'patient_id');
            v_values := array_append(v_values, quote_literal(v_new_patient_id));
          ELSE
            DECLARE
              v_target_patient_id uuid;
              v_patients_in_template integer;
              v_patients_in_simulation integer;
            BEGIN
              SELECT jsonb_array_length(p_snapshot->'patients') INTO v_patients_in_template;
              SELECT COUNT(*) INTO v_patients_in_simulation 
              FROM patients WHERE tenant_id = p_tenant_id;
              
              IF v_patients_in_template = 1 AND v_patients_in_simulation = 1 THEN
                SELECT id INTO v_target_patient_id
                FROM patients
                WHERE tenant_id = p_tenant_id
                LIMIT 1;
                
                IF v_target_patient_id IS NOT NULL THEN
                  v_columns := array_append(v_columns, 'patient_id');
                  v_values := array_append(v_values, quote_literal(v_target_patient_id));
                ELSE
                  RAISE WARNING '⚠️ [%] No patient found in simulation tenant', v_table_name;
                  CONTINUE;
                END IF;
              ELSE
                RAISE WARNING '⚠️ [%] Skipping - template has % patients, simulation has %', 
                  v_table_name, v_patients_in_template, v_patients_in_simulation;
                CONTINUE;
              END IF;
            END;
          END IF;
        END IF;
        
        -- Copy all other columns, mapping foreign key UUIDs
        FOR v_col IN 
          SELECT key, value 
          FROM jsonb_each(v_record)
          WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
        LOOP
          -- Check if column exists in target table
          SELECT COUNT(*) INTO v_count
          FROM information_schema.columns
          WHERE table_name = v_actual_table_name
          AND column_name = v_col.key
          AND table_schema = 'public';
          
          IF v_count = 0 THEN
            -- Column doesn't exist - skip with notice
            RAISE NOTICE '⚠️  Skipping column % - does not exist in %', v_col.key, v_actual_table_name;
            CONTINUE;
          END IF;
          
          v_columns := array_append(v_columns, quote_ident(v_col.key));
          
          IF v_col.key LIKE '%_id' AND v_col.value::text ~ '^"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"$' THEN
            v_old_id := (v_col.value#>>'{}')::uuid;
            IF v_id_mapping ? v_old_id::text THEN
              v_new_id := (v_id_mapping->>v_old_id::text)::uuid;
              v_values := array_append(v_values, quote_literal(v_new_id));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE NOTICE '🗺️  Mapped device.location_id: % → %', v_old_id, v_new_id;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE WARNING '⚠️  Device location_id % NOT FOUND in mapping!', v_old_id;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'array' THEN
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'jsonb' THEN
              v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
            ELSE
              SELECT string_agg(quote_literal(elem), ',')
              INTO v_array_elements
              FROM jsonb_array_elements_text(v_col.value) elem;
              
              -- Handle empty arrays correctly
              IF v_array_elements IS NULL OR v_array_elements = '' THEN
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[]::' || substring(v_udt_name from 2) || '[]');
                ELSE
                  v_values := array_append(v_values, 'ARRAY[]::text[]');
                END IF;
              ELSE
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']::' || substring(v_udt_name from 2) || '[]');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device ENUM array %: [%] cast to %', v_col.key, v_array_elements, substring(v_udt_name from 2) || '[]';
                  END IF;
                ELSE
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device text array %: [%]', v_col.key, v_array_elements;
                  END IF;
                END IF;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'object' THEN
            v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
          ELSIF v_col.value = 'null'::jsonb THEN
            v_values := array_append(v_values, 'NULL');
          ELSE
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'USER-DEFINED' THEN
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}') || '::' || v_udt_name);
              IF v_table_name = 'devices' THEN
                RAISE NOTICE '🎯 Casting % to ENUM type %', v_col.key, v_udt_name;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
            END IF;
          END IF;
        END LOOP;
        
        BEGIN
          IF array_length(v_columns, 1) != array_length(v_values, 1) THEN
            RAISE WARNING '❌ Column/Value mismatch in %: % columns, % values', 
              v_actual_table_name, array_length(v_columns, 1), array_length(v_values, 1);
            RAISE WARNING '📋 Columns: %', array_to_string(v_columns, ', ');
            RAISE WARNING '📋 Values: %', array_to_string(v_values, ', ');
            RAISE WARNING '📋 Record: %', v_record::text;
            CONTINUE;
          END IF;
          
          v_sql := format('INSERT INTO %I (%s) VALUES (%s)',
            v_actual_table_name,
            array_to_string(v_columns, ', '),
            array_to_string(v_values, ', ')
          );
          
          EXECUTE v_sql;
          v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '⚠️ Failed to insert into %: % | SQL: %', v_actual_table_name, SQLERRM, v_sql;
          RAISE WARNING '⚠️ Record data: %', v_record::text;
          RAISE WARNING '⚠️ SQLSTATE: %', SQLSTATE;
        END;
      END LOOP;
      
      v_total_records := v_total_records + v_count;
      RAISE NOTICE '✅ Restored % records to %', v_count, v_actual_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 Restore complete: % total records', v_total_records;
  
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'records_restored', v_total_records,
    'message', 'Schema-agnostic restore completed'
  );
END;
$_$;


--
-- Name: FUNCTION restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean) IS 'Restores snapshot data to a tenant. FIXED: Patient mapping uses demographics (first/last/dob) instead of positional ORDER BY created_at OFFSET — the old approach was non-deterministic because simulation patients share the same created_at from being inserted in one transaction.';


--
-- Name: restore_template_version(uuid, integer, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_template_version(p_template_id uuid, p_version_to_restore integer, p_user_id uuid DEFAULT NULL::uuid, p_restore_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_snapshot_to_restore JSONB;
  v_result JSONB;
BEGIN
  -- Get the snapshot from version history
  SELECT snapshot_data
  INTO v_snapshot_to_restore
  FROM simulation_template_versions
  WHERE template_id = p_template_id
  AND version = p_version_to_restore;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found for template %', p_version_to_restore, p_template_id;
  END IF;
  
  -- Save current version and update to restored snapshot
  SELECT save_template_version(
    p_template_id,
    v_snapshot_to_restore,
    COALESCE(p_restore_notes, 'Restored from version ' || p_version_to_restore),
    p_user_id
  ) INTO v_result;
  
  RETURN v_result || jsonb_build_object('restored_from_version', p_version_to_restore);
END;
$$;


--
-- Name: save_template_snapshot_v2(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_template_snapshot_v2(p_template_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id 
  FROM simulation_templates 
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  RAISE NOTICE '📸 Creating dynamic snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- STEP 1: Auto-discover and capture all tables with tenant_id column
  FOR v_table_record IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'  -- Skip simulation system tables
    ORDER BY t.table_name
  LOOP
    -- Dynamically capture all data from this tenant-aware table
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from %', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- STEP 2: Auto-discover tables linked via patient_id (but no tenant_id)
  FOR v_table_record IN 
    SELECT DISTINCT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2 
      WHERE c2.table_name = t.table_name 
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    -- Capture data linked to patients in this tenant
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      JOIN patients p ON p.id = t.patient_id 
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from % (via patient_id)', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- Add metadata
  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );
  
  -- Update template with new snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '🎉 Dynamic snapshot complete: % tables, % total records', v_total_tables, v_total_records;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Schema-agnostic snapshot created successfully'
  );
END;
$_$;


--
-- Name: FUNCTION save_template_snapshot_v2(p_template_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_template_snapshot_v2(p_template_id uuid) IS 'Schema-agnostic snapshot creation V2. Automatically discovers and captures ALL tenant data without hardcoded table names. Works with future schema changes automatically.';


--
-- Name: save_template_version(uuid, jsonb, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_template_version(p_template_id uuid, p_new_snapshot jsonb, p_change_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_version INT;
  v_current_snapshot JSONB;
  v_new_version INT;
  v_patient_count INT := 0;
  v_medication_count INT := 0;
  v_order_count INT := 0;
  v_wound_count INT := 0;
  v_device_count INT := 0;
  v_version_id UUID;
BEGIN
  -- Get current template data
  SELECT snapshot_version, snapshot_data
  INTO v_current_version, v_current_snapshot
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- Calculate new version
  v_new_version := COALESCE(v_current_version, 0) + 1;
  
  -- Archive CURRENT version (before updating)
  IF v_current_snapshot IS NOT NULL THEN
    -- Calculate stats from current snapshot
    IF v_current_snapshot ? 'patients' THEN
      v_patient_count := jsonb_array_length(v_current_snapshot->'patients');
    END IF;
    
    IF v_current_snapshot ? 'patient_medications' THEN
      v_medication_count := jsonb_array_length(v_current_snapshot->'patient_medications');
    END IF;
    
    IF v_current_snapshot ? 'doctors_orders' THEN
      v_order_count := jsonb_array_length(v_current_snapshot->'doctors_orders');
    END IF;
    
    IF v_current_snapshot ? 'wounds' THEN
      v_wound_count := jsonb_array_length(v_current_snapshot->'wounds');
    END IF;
    
    IF v_current_snapshot ? 'devices' THEN
      v_device_count := jsonb_array_length(v_current_snapshot->'devices');
    END IF;
    
    -- Insert archived version
    INSERT INTO simulation_template_versions (
      template_id,
      version,
      snapshot_data,
      saved_by,
      change_notes,
      patient_count,
      medication_count,
      order_count,
      wound_count,
      device_count
    ) VALUES (
      p_template_id,
      v_current_version,
      v_current_snapshot,
      COALESCE(p_user_id, auth.uid()),
      p_change_notes,
      v_patient_count,
      v_medication_count,
      v_order_count,
      v_wound_count,
      v_device_count
    )
    RETURNING id INTO v_version_id;
    
    RAISE NOTICE '📦 Archived template v% (version_id: %)', v_current_version, v_version_id;
  END IF;
  
  -- Update template with new snapshot and version
  UPDATE simulation_templates
  SET 
    snapshot_data = p_new_snapshot,
    snapshot_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_template_id;
  
  RAISE NOTICE '✅ Updated template to v%', v_new_version;
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_version', v_current_version,
    'new_version', v_new_version,
    'archived_version_id', v_version_id
  );
END;
$$;


--
-- Name: set_alert_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_alert_tenant_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
    FROM public.patients p
    WHERE p.id = NEW.patient_id;
    
    -- If patient doesn't have a tenant_id, this will fail
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create alert: patient has no tenant association';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: set_medication_admin_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_medication_admin_tenant_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM patients
    WHERE patient_id = NEW.patient_id;  -- Join on barcode, not UUID
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_super_admin_tenant_context(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_super_admin_tenant_context(target_tenant_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only super admins can set tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can set tenant context';
  END IF;
  
  -- Validate tenant exists if target_tenant_id provided
  IF target_tenant_id IS NOT NULL THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id::uuid) THEN
        RAISE EXCEPTION 'Invalid tenant ID: %', target_tenant_id;
      END IF;
    EXCEPTION 
      WHEN OTHERS THEN
        -- If tenants table doesn't exist, just accept any tenant_id
        NULL;
    END;
  END IF;
  
  -- Set the context (stored in session)
  IF target_tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', target_tenant_id, false);
  ELSE
    PERFORM set_config('app.current_tenant_id', '', false);
  END IF;
  
  RAISE NOTICE 'Super admin tenant context set to: %', COALESCE(target_tenant_id, 'ALL_TENANTS');
END;
$$;


--
-- Name: set_tenant_id_on_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_tenant_id_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;


--
-- Name: set_wound_assessment_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_wound_assessment_tenant_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Get tenant_id from the patient
  SELECT tenant_id INTO NEW.tenant_id
  FROM patients
  WHERE id = NEW.patient_id;
  
  -- If we couldn't get tenant_id from patient, try from JWT
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  END IF;
  
  -- If still null, raise an error
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine tenant_id for wound assessment';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: set_wound_treatment_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_wound_treatment_tenant_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.tenant_id = (SELECT tenant_id FROM patients WHERE id = NEW.patient_id);
    RETURN NEW;
END;
$$;


--
-- Name: trigger_create_program_tenant(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_create_program_tenant() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  -- Only create tenant for active programs
  IF NEW.is_active THEN
    -- Create the program tenant (use NEW.tenant_id as parent)
    SELECT create_program_tenant(NEW.id, NEW.tenant_id) INTO v_result;
    
    IF (v_result->>'success')::boolean = false THEN
      RAISE WARNING 'Failed to create program tenant: %', v_result->>'error';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trigger_create_program_tenant(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_create_program_tenant() IS 'Trigger function that creates a program tenant when a new program is inserted';


--
-- Name: trigger_refresh_user_tenant_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_refresh_user_tenant_cache() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Trigger cache refresh
  PERFORM refresh_user_tenant_cache();
  RETURN NULL;
END;
$$;


--
-- Name: update_backup_metadata_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_backup_metadata_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_bowel_records_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bowel_records_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_contact_submissions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_contact_submissions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_handover_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_handover_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_lab_panel_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lab_panel_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_results INTEGER;
  v_acked_results INTEGER;
BEGIN
  -- Count total and acknowledged results for this panel
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ack_at IS NOT NULL)
  INTO v_total_results, v_acked_results
  FROM lab_results
  WHERE panel_id = COALESCE(NEW.panel_id, OLD.panel_id);

  -- Update panel status
  IF v_acked_results = 0 THEN
    UPDATE lab_panels SET status = 'new' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSIF v_acked_results < v_total_results THEN
    UPDATE lab_panels SET status = 'partial_ack' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSE
    UPDATE lab_panels SET status = 'acknowledged' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION update_lab_panel_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_lab_panel_status() IS 'Auto-update panel status when results are acknowledged';


--
-- Name: update_lab_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_lab_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_landing_content_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_landing_content_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;


--
-- Name: update_medication_administrations_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_medication_administrations_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: patient_medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    name text NOT NULL,
    dosage text NOT NULL,
    frequency text NOT NULL,
    route text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    prescribed_by text NOT NULL,
    last_administered timestamp with time zone,
    next_due timestamp with time zone NOT NULL,
    status text DEFAULT 'Active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'scheduled'::text,
    tenant_id uuid,
    admin_time character varying(5) DEFAULT '08:00'::character varying,
    admin_times jsonb,
    CONSTRAINT patient_medications_category_check CHECK ((category = ANY (ARRAY['scheduled'::text, 'unscheduled'::text, 'prn'::text, 'continuous'::text, 'diabetic'::text, 'stat'::text])))
);


--
-- Name: COLUMN patient_medications.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_medications.category IS 'Medication category: scheduled (default), unscheduled, prn, continuous, diabetic, stat. Defaults to scheduled for backward compatibility with snapshot restoration.';


--
-- Name: COLUMN patient_medications.admin_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_medications.admin_time IS 'Time of day when medication should be administered (HH:MM format)';


--
-- Name: update_medication_super_admin(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_medication_super_admin(p_medication_id uuid, p_updates jsonb) RETURNS SETOF public.patient_medications
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    update_query TEXT;
    field_name TEXT;
    field_value TEXT;
    update_fields TEXT[] := '{}';
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can update cross-tenant medications.';
    END IF;

    -- Build dynamic update query from JSONB input
    FOR field_name IN SELECT jsonb_object_keys(p_updates)
    LOOP
        -- Get the field value as text
        field_value := p_updates ->> field_name;
        
        -- Add field to update list with proper escaping
        update_fields := update_fields || (quote_ident(field_name) || ' = ' || quote_literal(field_value));
    END LOOP;
    
    -- If no fields to update, return empty result
    IF array_length(update_fields, 1) IS NULL THEN
        RAISE EXCEPTION 'No valid fields provided for update';
    END IF;
    
    -- Build and execute the update query
    update_query := 'UPDATE patient_medications SET ' || array_to_string(update_fields, ', ') || 
                   ' WHERE id = ' || quote_literal(p_medication_id) || ' RETURNING *';
    
    -- Execute the update and return the result
    RETURN QUERY EXECUTE update_query;
    
    -- Note: Audit logging temporarily disabled due to table schema mismatch
    -- TODO: Fix audit_logs table structure or remove if not needed
    
END;
$$;


--
-- Name: FUNCTION update_medication_super_admin(p_medication_id uuid, p_updates jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_medication_super_admin(p_medication_id uuid, p_updates jsonb) IS 'Allows super admins and admins to update medications across tenant boundaries, bypassing RLS';


--
-- Name: update_patient_intake_output_events_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_patient_intake_output_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_patient_notes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_patient_notes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_program_announcements_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_program_announcements_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_programs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_programs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_scheduled_simulations_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_scheduled_simulations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_simulation_categories(uuid, text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_simulation_categories(p_simulation_id uuid, p_primary_categories text[] DEFAULT '{}'::text[], p_sub_categories text[] DEFAULT '{}'::text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Simply update the categories - doesn't affect any other simulation data
  UPDATE simulation_active
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;


--
-- Name: FUNCTION update_simulation_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_simulation_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) IS 'Safely update category tags on existing active simulations';


--
-- Name: update_simulation_history_categories(uuid, text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_simulation_history_categories(p_simulation_id uuid, p_primary_categories text[] DEFAULT '{}'::text[], p_sub_categories text[] DEFAULT '{}'::text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update the categories in simulation_history
  UPDATE simulation_history
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation in history: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found in history: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;


--
-- Name: FUNCTION update_simulation_history_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_simulation_history_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) IS 'Safely update category tags on completed simulations in history';


--
-- Name: update_student_roster_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_student_roster_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_profile_admin(uuid, text, text, text, text, text, text, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profile_admin(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_department text DEFAULT NULL::text, p_license_number text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_simulation_only boolean DEFAULT false) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE user_profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    role = p_role::user_role,
    primary_program = p_department,
    license_number = p_license_number,
    phone = p_phone,
    is_active = p_is_active,
    simulation_only = p_simulation_only,
    updated_at = now()
  WHERE id = p_user_id;

  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'simulation_only', p_simulation_only
  ) INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION update_user_profile_admin(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_department text, p_license_number text, p_phone text, p_is_active boolean, p_simulation_only boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_profile_admin(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_department text, p_license_number text, p_phone text, p_is_active boolean, p_simulation_only boolean) IS 'Allows admins to update user profiles, bypassing RLS restrictions. Includes simulation_only flag for auto-routing users to simulation lobby. Note: p_department parameter is deprecated, now using user_programs junction table.';


--
-- Name: user_has_patient_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_patient_access(patient_tenant_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Super admin can access all patients
  IF public.current_user_is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Regular users can only access patients from their assigned tenants
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = patient_tenant_id 
    AND is_active = true
  ) INTO has_access;
  
  RETURN has_access;
EXCEPTION
  WHEN OTHERS THEN
    -- If tenant_users doesn't exist, allow access (single tenant mode)
    RETURN true;
END;
$$;


--
-- Name: user_has_permission(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_permission(user_uuid uuid, permission_name text, tenant_uuid uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: user_has_program_access(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_program_access(p_user_id uuid, p_program_code text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_programs up
    JOIN programs p ON p.id = up.program_id
    WHERE up.user_id = p_user_id
      AND p.code = p_program_code
      AND p.is_active = true
  );
$$;


--
-- Name: FUNCTION user_has_program_access(p_user_id uuid, p_program_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.user_has_program_access(p_user_id uuid, p_program_code text) IS 'Check if user is assigned to a specific program';


--
-- Name: user_has_tenant_access(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_tenant_access() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role TEXT;
  tenant_count INTEGER;
BEGIN
  -- Check if user exists and is active
  SELECT role INTO user_role
  FROM user_profiles 
  WHERE id = auth.uid() AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admins always have access
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Regular users must have at least one active tenant assignment
  SELECT COUNT(*) INTO tenant_count
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true;
  
  RETURN tenant_count > 0;
END;
$$;


--
-- Name: user_has_tenant_access(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_tenant_access(user_uuid uuid, tenant_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.tenant_users tu
    WHERE tu.user_id = user_uuid 
    AND tu.tenant_id = tenant_uuid 
    AND tu.is_active = true
  );
END;
$$;


--
-- Name: user_is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_super_admin(user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles up
    WHERE up.id = user_uuid 
    AND up.role = 'super_admin'
  );
END;
$$;


--
-- Name: validate_subdomain(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_subdomain(subdomain_input text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Validate subdomain format and availability
  IF subdomain_input IS NULL OR LENGTH(subdomain_input) < 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if subdomain already exists
  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = subdomain_input) THEN
    RETURN FALSE;
  END IF;
  
  -- Basic validation: alphanumeric and hyphens only
  IF subdomain_input !~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL AND ppt.tablename NOT LIKE '% %'),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  -- Count raw slot entries before apply_rls/subscription filter
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  -- Apply RLS and filter as before
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  -- Real rows with slot count attached
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  -- Sentinel row: always returned when no real rows exist so Elixir can
  -- always read slot_changes_count. Identified by wal IS NULL.
  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    target_id uuid,
    target_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: avatar_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatar_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    region_key text NOT NULL,
    x_percent numeric NOT NULL,
    y_percent numeric NOT NULL,
    free_text text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    body_view text,
    CONSTRAINT avatar_locations_x_percent_check CHECK (((x_percent >= (0)::numeric) AND (x_percent <= (100)::numeric))),
    CONSTRAINT avatar_locations_y_percent_check CHECK (((y_percent >= (0)::numeric) AND (y_percent <= (100)::numeric)))
);


--
-- Name: COLUMN avatar_locations.body_view; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.avatar_locations.body_view IS 'View where marker was placed: front or back. NULL for regions visible on both views (head, arms, etc.)';


--
-- Name: backup_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    backup_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT backup_audit_log_action_check CHECK ((action = ANY (ARRAY['backup_created'::text, 'backup_downloaded'::text, 'backup_deleted'::text, 'backup_restored'::text, 'backup_failed'::text, 'backup_expired'::text, 'backup_access_denied'::text])))
);


--
-- Name: TABLE backup_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_audit_log IS 'Comprehensive audit trail for backup operations';


--
-- Name: backup_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    backup_id text NOT NULL,
    file_data text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    file_hash text,
    compression_type text DEFAULT 'none'::text,
    CONSTRAINT backup_files_compression_type_check CHECK ((compression_type = ANY (ARRAY['none'::text, 'gzip'::text, 'brotli'::text])))
);


--
-- Name: TABLE backup_files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_files IS 'Stores backup file data (replace with cloud storage in production)';


--
-- Name: backup_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_metadata (
    id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    backup_type text NOT NULL,
    file_size bigint DEFAULT 0 NOT NULL,
    record_count integer DEFAULT 0 NOT NULL,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    checksum text NOT NULL,
    encrypted boolean DEFAULT false NOT NULL,
    status text DEFAULT 'in_progress'::text NOT NULL,
    expiry_date timestamp with time zone NOT NULL,
    download_count integer DEFAULT 0 NOT NULL,
    last_downloaded timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT backup_metadata_backup_type_check CHECK ((backup_type = ANY (ARRAY['full'::text, 'partial'::text, 'tenant_specific'::text]))),
    CONSTRAINT backup_metadata_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text, 'expired'::text])))
);


--
-- Name: TABLE backup_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.backup_metadata IS 'Stores metadata for system backups with security controls';


--
-- Name: COLUMN backup_metadata.options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.backup_metadata.options IS 'JSON configuration used to create the backup';


--
-- Name: COLUMN backup_metadata.checksum; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.backup_metadata.checksum IS 'SHA-256 checksum for data integrity verification';


--
-- Name: COLUMN backup_metadata.download_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.backup_metadata.download_count IS 'Number of times backup has been downloaded (max 10)';


--
-- Name: bowel_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bowel_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    patient_id text NOT NULL,
    nurse_id text NOT NULL,
    nurse_name text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    bowel_incontinence text,
    stool_appearance text,
    stool_consistency text,
    stool_colour text,
    stool_amount text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_name text,
    CONSTRAINT bowel_records_bowel_incontinence_check CHECK ((bowel_incontinence = ANY (ARRAY['Continent'::text, 'Incontinent'::text, 'Partial'::text]))),
    CONSTRAINT bowel_records_stool_amount_check CHECK ((stool_amount = ANY (ARRAY['Small'::text, 'Moderate'::text, 'Large'::text, 'None'::text]))),
    CONSTRAINT bowel_records_stool_appearance_check CHECK ((stool_appearance = ANY (ARRAY['Normal'::text, 'Abnormal'::text, 'Blood present'::text, 'Mucus present'::text]))),
    CONSTRAINT bowel_records_stool_colour_check CHECK ((stool_colour = ANY (ARRAY['Brown'::text, 'Green'::text, 'Yellow'::text, 'Black'::text, 'Red'::text, 'Clay colored'::text]))),
    CONSTRAINT bowel_records_stool_consistency_check CHECK ((stool_consistency = ANY (ARRAY['Formed'::text, 'Loose'::text, 'Watery'::text, 'Hard'::text, 'Soft'::text])))
);


--
-- Name: TABLE bowel_records; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bowel_records IS 'Bowel movement records with RLS enabled for multi-tenant isolation';


--
-- Name: COLUMN bowel_records.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bowel_records.student_name IS 'Full name of student who created bowel record';


--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    institution text,
    message text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE contact_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contact_submissions IS 'Stores contact form submissions from the landing page';


--
-- Name: COLUMN contact_submissions.processed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contact_submissions.processed IS 'Whether the submission has been reviewed/responded to';


--
-- Name: device_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    assessed_at timestamp with time zone DEFAULT now() NOT NULL,
    student_name text NOT NULL,
    device_type text NOT NULL,
    status text,
    output_amount_ml numeric(10,2),
    notes text,
    assessment_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE device_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.device_assessments IS 'Tracks device assessments over time for monitoring and documentation';


--
-- Name: COLUMN device_assessments.device_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device_assessments.device_id IS 'Links to device being assessed';


--
-- Name: COLUMN device_assessments.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device_assessments.student_name IS 'Name of student who performed the assessment (for debrief tracking)';


--
-- Name: COLUMN device_assessments.device_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device_assessments.device_type IS 'Cached device type from devices table for quick filtering';


--
-- Name: COLUMN device_assessments.output_amount_ml; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device_assessments.output_amount_ml IS 'Generic output amount for drains, tubes, catheters';


--
-- Name: COLUMN device_assessments.assessment_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.device_assessments.assessment_data IS 'Device-specific assessment data stored as JSONB for flexibility';


--
-- Name: devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    location_id uuid NOT NULL,
    type public.device_type_enum DEFAULT 'closed-suction-drain'::public.device_type_enum NOT NULL,
    placement_date date,
    placement_time time without time zone,
    placed_pre_arrival text,
    inserted_by text,
    tube_number integer,
    orientation public.orientation_enum[] DEFAULT '{}'::public.orientation_enum[],
    tube_size_fr text,
    number_of_sutures_placed integer,
    reservoir_type public.reservoir_type_enum,
    reservoir_size_ml integer,
    securement_method text[] DEFAULT '{}'::text[],
    patient_tolerance text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gauge text,
    site_side text,
    route text,
    external_length_cm numeric(5,2),
    initial_xray_confirmed boolean DEFAULT false,
    initial_ph numeric(3,1),
    initial_aspirate_appearance text,
    placement_confirmed boolean DEFAULT false,
    site_location text,
    ostomy_construction text,
    stoma_side text,
    ng_securement text,
    ng_attached_to text,
    ng_external_length_mm numeric(8,1),
    ng_residual_volume_ml numeric(8,1),
    CONSTRAINT devices_tube_number_check CHECK (((tube_number >= 1) AND (tube_number <= 10)))
);


--
-- Name: COLUMN devices.gauge; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.gauge IS 'IV gauge size (e.g., 18G, 20G, 22G)';


--
-- Name: COLUMN devices.site_side; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.site_side IS 'Side of body (Left/Right)';


--
-- Name: COLUMN devices.route; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.route IS 'Feeding tube route (NG, OG, PEG, PEJ, GJ, Other)';


--
-- Name: COLUMN devices.external_length_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.external_length_cm IS 'External length at skin in centimeters';


--
-- Name: COLUMN devices.initial_xray_confirmed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.initial_xray_confirmed IS 'X-ray confirmation of initial placement';


--
-- Name: COLUMN devices.initial_ph; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.initial_ph IS 'Initial pH check value';


--
-- Name: COLUMN devices.initial_aspirate_appearance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.initial_aspirate_appearance IS 'Initial aspirate appearance (milky, green, clear, bloody, other)';


--
-- Name: COLUMN devices.placement_confirmed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.placement_confirmed IS 'Placement confirmed prior to first use';


--
-- Name: COLUMN devices.site_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.site_location IS 'Anatomical location description (e.g., left antecubital, right forearm)';


--
-- Name: COLUMN devices.ostomy_construction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.ostomy_construction IS 'Ostomy type: Colostomy, Ileostomy, Urostomy, Other';


--
-- Name: COLUMN devices.stoma_side; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.devices.stoma_side IS 'Side of abdomen: Left, Right';


--
-- Name: diabetic_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diabetic_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id text NOT NULL,
    recorded_by uuid,
    date date NOT NULL,
    time_cbg_taken time without time zone NOT NULL,
    reading_type character varying(10) NOT NULL,
    glucose_reading numeric(4,1) NOT NULL,
    basal_insulin jsonb,
    bolus_insulin jsonb,
    correction_insulin jsonb,
    other_insulin jsonb,
    treatments_given text,
    comments_for_physician text,
    signature character varying(255) NOT NULL,
    prompt_frequency character varying(10) DEFAULT 'Q6H'::character varying NOT NULL,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    student_name text,
    CONSTRAINT diabetic_records_glucose_reading_check CHECK (((glucose_reading >= (0)::numeric) AND (glucose_reading <= (50)::numeric))),
    CONSTRAINT diabetic_records_reading_type_check CHECK (((reading_type)::text = ANY (ARRAY[('AC'::character varying)::text, ('PC'::character varying)::text, ('HS'::character varying)::text, ('AM'::character varying)::text, ('PRN'::character varying)::text])))
);


--
-- Name: COLUMN diabetic_records.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.diabetic_records.student_name IS 'Full name of student who created diabetic record';


--
-- Name: doctors_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    order_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    order_text text NOT NULL,
    ordering_doctor text NOT NULL,
    notes text,
    order_type text DEFAULT 'Direct'::text,
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    doctor_name text,
    acknowledged_by_student text,
    CONSTRAINT doctors_orders_order_type_check CHECK ((order_type = ANY (ARRAY['Direct'::text, 'Phone Order'::text, 'Verbal Order'::text])))
);


--
-- Name: TABLE doctors_orders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.doctors_orders IS 'Stores physician orders with acknowledgment tracking and support for phone/verbal orders';


--
-- Name: COLUMN doctors_orders.order_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctors_orders.order_text IS 'The actual physician order content';


--
-- Name: COLUMN doctors_orders.order_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctors_orders.order_type IS 'Type of order: Direct (admin/super admin), Phone Order, or Verbal Order (nurses)';


--
-- Name: COLUMN doctors_orders.is_acknowledged; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctors_orders.is_acknowledged IS 'Whether the order has been acknowledged by nursing staff';


--
-- Name: COLUMN doctors_orders.doctor_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctors_orders.doctor_name IS 'Name of the doctor who created the order (for admin/super admin entries)';


--
-- Name: COLUMN doctors_orders.acknowledged_by_student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.doctors_orders.acknowledged_by_student IS 'Full name of student who acknowledged order';


--
-- Name: handover_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handover_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    situation text NOT NULL,
    background text NOT NULL,
    assessment text NOT NULL,
    recommendations text NOT NULL,
    shift character varying(10) NOT NULL,
    priority character varying(10) NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_by_name character varying(255) NOT NULL,
    created_by_role character varying(100) NOT NULL,
    student_name text,
    nursing_notes text,
    CONSTRAINT handover_notes_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text, ('urgent'::character varying)::text]))),
    CONSTRAINT handover_notes_shift_check CHECK (((shift)::text = ANY (ARRAY[('day'::character varying)::text, ('evening'::character varying)::text, ('night'::character varying)::text])))
);


--
-- Name: TABLE handover_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.handover_notes IS 'SBAR (Situation, Background, Assessment, Recommendations) handover notes for patient care transitions';


--
-- Name: COLUMN handover_notes.situation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.situation IS 'Current situation and purpose of communication';


--
-- Name: COLUMN handover_notes.background; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.background IS 'Relevant context and patient history';


--
-- Name: COLUMN handover_notes.assessment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.assessment IS 'Professional clinical judgment and assessment';


--
-- Name: COLUMN handover_notes.recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.recommendations IS 'Proposed actions and next steps';


--
-- Name: COLUMN handover_notes.shift; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.shift IS 'Shift during which the handover note was created';


--
-- Name: COLUMN handover_notes.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.priority IS 'Priority level of the handover communication';


--
-- Name: COLUMN handover_notes.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.student_name IS 'Name of the student who acknowledged this handover note. Used for debrief reporting to track student activity.';


--
-- Name: COLUMN handover_notes.nursing_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.handover_notes.nursing_notes IS 'Free-text nursing observations, displayed above the SBAR fields in the handover form.';


--
-- Name: lab_ack_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_ack_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    panel_id uuid NOT NULL,
    ack_scope public.ack_scope NOT NULL,
    ack_by uuid NOT NULL,
    ack_at timestamp with time zone DEFAULT now(),
    abnormal_summary jsonb,
    note text,
    created_at timestamp with time zone DEFAULT now(),
    student_name text
);


--
-- Name: TABLE lab_ack_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_ack_events IS 'Audit log for lab acknowledgements';


--
-- Name: COLUMN lab_ack_events.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_ack_events.student_name IS 'Name of the student who acknowledged the labs (for debrief reporting)';


--
-- Name: lab_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    order_date date NOT NULL,
    order_time time without time zone NOT NULL,
    procedure_category text NOT NULL,
    procedure_type text NOT NULL,
    source_category text NOT NULL,
    source_type text NOT NULL,
    student_name text NOT NULL,
    verified_by uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    label_printed boolean DEFAULT false,
    label_printed_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: COLUMN lab_orders.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_orders.student_name IS 'Full name of student who ordered lab';


--
-- Name: lab_panels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_panels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    panel_time timestamp with time zone NOT NULL,
    source text,
    entered_by uuid,
    status public.lab_panel_status DEFAULT 'new'::public.lab_panel_status,
    ack_required boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_name text
);


--
-- Name: TABLE lab_panels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_panels IS 'Lab panel batches with acknowledgement tracking';


--
-- Name: COLUMN lab_panels.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_panels.student_name IS 'Full name of student who created panel';


--
-- Name: lab_result_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_result_refs (
    test_code text NOT NULL,
    category public.lab_category NOT NULL,
    test_name text NOT NULL,
    units text,
    ref_low numeric(12,4),
    ref_high numeric(12,4),
    ref_operator public.ref_operator DEFAULT 'between'::public.ref_operator,
    sex_ref jsonb,
    critical_low numeric(12,4),
    critical_high numeric(12,4),
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE lab_result_refs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_result_refs IS 'Seeded with ABG, Hematology, and Chemistry reference ranges';


--
-- Name: COLUMN lab_result_refs.sex_ref; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_result_refs.sex_ref IS 'Sex-specific ranges in JSON format';


--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    panel_id uuid NOT NULL,
    category public.lab_category NOT NULL,
    test_code text NOT NULL,
    test_name text NOT NULL,
    value numeric(12,4),
    units text,
    ref_low numeric(12,4),
    ref_high numeric(12,4),
    ref_operator public.ref_operator DEFAULT 'between'::public.ref_operator,
    sex_ref jsonb,
    critical_low numeric(12,4),
    critical_high numeric(12,4),
    flag public.lab_flag DEFAULT 'normal'::public.lab_flag,
    entered_by uuid,
    entered_at timestamp with time zone DEFAULT now(),
    ack_by uuid,
    ack_at timestamp with time zone,
    comments text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    acknowledged_by_student text,
    note text
);


--
-- Name: TABLE lab_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.lab_results IS 'Individual lab test results with reference ranges';


--
-- Name: COLUMN lab_results.flag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_results.flag IS 'Auto-computed from value vs reference range';


--
-- Name: COLUMN lab_results.acknowledged_by_student; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_results.acknowledged_by_student IS 'Full name of student who acknowledged result';


--
-- Name: COLUMN lab_results.note; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lab_results.note IS 'Student note added when acknowledging lab result';


--
-- Name: medication_administrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_administrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medication_id text,
    patient_id text NOT NULL,
    administered_by text NOT NULL,
    administered_by_id text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    dosage text,
    route text,
    status text DEFAULT 'completed'::text,
    medication_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid NOT NULL,
    student_name text,
    barcode_scanned boolean DEFAULT false,
    patient_barcode_scanned text,
    medication_barcode_scanned text,
    override_reason text,
    witness_name text,
    administered_dose text,
    CONSTRAINT medication_administrations_status_check CHECK ((status = ANY (ARRAY['completed'::text, 'missed'::text, 'late'::text, 'partial'::text])))
);


--
-- Name: TABLE medication_administrations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.medication_administrations IS 'Medication administration records. Can be deleted by reset_simulation_for_next_session function with SECURITY DEFINER bypass.';


--
-- Name: COLUMN medication_administrations.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.student_name IS 'Name of the student who administered the medication (for simulation tracking)';


--
-- Name: COLUMN medication_administrations.barcode_scanned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.barcode_scanned IS 'Whether this medication was administered using barcode scanning (BCMA compliant)';


--
-- Name: COLUMN medication_administrations.patient_barcode_scanned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.patient_barcode_scanned IS 'The patient barcode that was scanned (for audit trail)';


--
-- Name: COLUMN medication_administrations.medication_barcode_scanned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.medication_barcode_scanned IS 'The medication barcode that was scanned (for audit trail)';


--
-- Name: COLUMN medication_administrations.override_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.override_reason IS 'Reason provided when student manually overrides barcode scanning requirement';


--
-- Name: COLUMN medication_administrations.witness_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.witness_name IS 'Name of witness when manual override is used (for safety compliance)';


--
-- Name: COLUMN medication_administrations.administered_dose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medication_administrations.administered_dose IS 'Volume/units drawn up and administered by the student (e.g., "2 mL"). Distinct from dosage which stores the label concentration (e.g., "500mg/2mL"). Populated via the BCMA verify step where students enter their calculated dose.';


--
-- Name: multi_tenant_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multi_tenant_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: patient_admission_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_admission_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    patient_id text NOT NULL,
    admission_type text,
    attending_physician text,
    insurance_provider text,
    insurance_policy text,
    admission_source text,
    chief_complaint text,
    height text,
    weight text,
    bmi text,
    smoking_status text,
    alcohol_use text,
    exercise text,
    occupation text,
    family_history text,
    marital_status text,
    secondary_contact_name text,
    secondary_contact_relationship text,
    secondary_contact_phone text,
    secondary_contact_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    admission_date timestamp with time zone,
    admitting_diagnosis text,
    allergies text,
    current_medications text,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text
);


--
-- Name: TABLE patient_admission_records; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_admission_records IS 'Patient admission records with RLS enabled for multi-tenant isolation';


--
-- Name: patient_advanced_directives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_advanced_directives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    patient_id text NOT NULL,
    living_will_status text,
    living_will_date text,
    healthcare_proxy_name text,
    healthcare_proxy_phone text,
    dnr_status text,
    organ_donation_status text,
    organ_donation_details text,
    religious_preference text,
    special_instructions text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    living_will_exists boolean DEFAULT false,
    healthcare_proxy_relationship text,
    student_name text
);


--
-- Name: TABLE patient_advanced_directives; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_advanced_directives IS 'Patient advanced care directives with RLS enabled for multi-tenant isolation';


--
-- Name: COLUMN patient_advanced_directives.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_advanced_directives.student_name IS 'Name of the student who filled out the advanced directives (for debrief reporting)';


--
-- Name: patient_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    patient_name text NOT NULL,
    alert_type public.alert_type_enum NOT NULL,
    message text NOT NULL,
    priority public.alert_priority_enum NOT NULL,
    acknowledged boolean DEFAULT false NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    tenant_id uuid
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    subdomain character varying(100) NOT NULL,
    logo_url text,
    primary_color character varying(7) DEFAULT '#3B82F6'::character varying,
    settings jsonb DEFAULT '{"currency": "USD", "features": {"mobile_app": true, "wound_care": false, "barcode_scanning": false, "advanced_analytics": false, "medication_management": true}, "security": {"password_policy": {"min_length": 8, "require_numbers": true, "require_symbols": false, "require_lowercase": true, "require_uppercase": true}, "session_timeout": 480, "two_factor_required": false}, "timezone": "UTC", "date_format": "MM/DD/YYYY"}'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    admin_user_id uuid,
    subscription_plan character varying(20) DEFAULT 'basic'::character varying NOT NULL,
    max_users integer DEFAULT 10 NOT NULL,
    max_patients integer DEFAULT 100 NOT NULL,
    parent_tenant_id uuid,
    tenant_type text DEFAULT 'institution'::text,
    simulation_id uuid,
    auto_cleanup_at timestamp without time zone,
    is_simulation boolean DEFAULT false,
    simulation_config jsonb DEFAULT '{}'::jsonb,
    program_id uuid,
    CONSTRAINT tenants_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('suspended'::character varying)::text]))),
    CONSTRAINT tenants_subscription_plan_check CHECK (((subscription_plan)::text = ANY (ARRAY[('basic'::character varying)::text, ('premium'::character varying)::text, ('enterprise'::character varying)::text])))
);


--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenants IS 'Stores tenant/organization information for multi-tenant architecture';


--
-- Name: COLUMN tenants.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.settings IS 'JSON configuration for tenant-specific settings and features';


--
-- Name: COLUMN tenants.program_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.program_id IS 'Links program tenants to their program record. NULL for non-program tenants.';


--
-- Name: patient_alerts_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.patient_alerts_view WITH (security_invoker='on') AS
 SELECT pa.id,
    pa.patient_id,
    pa.patient_name,
    pa.alert_type,
    pa.message,
    pa.priority,
    pa.acknowledged,
    pa.acknowledged_by,
    pa.acknowledged_at,
    pa.created_at,
    pa.tenant_id,
    t.name AS tenant_name,
    t.subdomain AS tenant_subdomain
   FROM (public.patient_alerts pa
     JOIN public.tenants t ON ((pa.tenant_id = t.id)));


--
-- Name: patient_bbit_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_bbit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    time_label text,
    student_name text,
    glucose_value numeric(5,2),
    basal_name text,
    basal_dose numeric(6,2),
    basal_status text,
    basal_held_reason text,
    basal_held_other text,
    bolus_dose numeric(6,2),
    bolus_meal text,
    bolus_status text,
    bolus_not_given_reason text,
    correction_dose numeric(6,2),
    correction_suggested_dose numeric(6,2),
    correction_status text,
    hypo_juice boolean,
    hypo_dextrose_tabs boolean,
    hypo_iv_dextrose boolean,
    hypo_glucagon boolean,
    hypo_other text,
    hypo_recheck_completed boolean,
    carb_intake text,
    note_symptomatic_hypo boolean,
    note_hyperglycemia_symptoms boolean,
    note_insulin_delay boolean,
    note_other text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patient_bbit_entries_basal_dose_check CHECK ((basal_dose >= (0)::numeric)),
    CONSTRAINT patient_bbit_entries_basal_held_reason_check CHECK ((basal_held_reason = ANY (ARRAY['Low BG'::text, 'NPO'::text, 'Provider order'::text, 'Other'::text]))),
    CONSTRAINT patient_bbit_entries_basal_status_check CHECK ((basal_status = ANY (ARRAY['given'::text, 'held'::text]))),
    CONSTRAINT patient_bbit_entries_bolus_dose_check CHECK ((bolus_dose >= (0)::numeric)),
    CONSTRAINT patient_bbit_entries_bolus_meal_check CHECK ((bolus_meal = ANY (ARRAY['Breakfast'::text, 'Lunch'::text, 'Supper'::text]))),
    CONSTRAINT patient_bbit_entries_bolus_not_given_reason_check CHECK ((bolus_not_given_reason = ANY (ARRAY['Patient not eating'::text, 'NPO'::text, 'Refused'::text]))),
    CONSTRAINT patient_bbit_entries_bolus_status_check CHECK ((bolus_status = ANY (ARRAY['given'::text, 'not_given'::text]))),
    CONSTRAINT patient_bbit_entries_carb_intake_check CHECK ((carb_intake = ANY (ARRAY['full'::text, 'partial'::text, 'none'::text]))),
    CONSTRAINT patient_bbit_entries_correction_dose_check CHECK ((correction_dose >= (0)::numeric)),
    CONSTRAINT patient_bbit_entries_correction_status_check CHECK ((correction_status = ANY (ARRAY['given'::text, 'not_required'::text]))),
    CONSTRAINT patient_bbit_entries_correction_suggested_dose_check CHECK ((correction_suggested_dose >= (0)::numeric)),
    CONSTRAINT patient_bbit_entries_glucose_value_check CHECK (((glucose_value >= (0)::numeric) AND (glucose_value <= (50)::numeric)))
);


--
-- Name: patient_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    image_url text NOT NULL,
    thumbnail_url text,
    annotations jsonb DEFAULT '[]'::jsonb,
    image_type text NOT NULL,
    description text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid
);


--
-- Name: patient_intake_output_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_intake_output_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    shift_label text,
    direction text NOT NULL,
    category text NOT NULL,
    route text,
    description text,
    amount_ml numeric(10,2) NOT NULL,
    student_name text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT patient_intake_output_events_amount_ml_check CHECK ((amount_ml >= (0)::numeric)),
    CONSTRAINT patient_intake_output_events_category_check CHECK ((category = ANY (ARRAY['oral'::text, 'iv_fluid'::text, 'iv_med'::text, 'blood'::text, 'tube_feed'::text, 'urine'::text, 'stool'::text, 'emesis'::text, 'drain'::text]))),
    CONSTRAINT patient_intake_output_events_direction_check CHECK ((direction = ANY (ARRAY['intake'::text, 'output'::text])))
);


--
-- Name: TABLE patient_intake_output_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_intake_output_events IS 'Tracks fluid intake and output events for patients. Used for calculating fluid balance in nursing care.';


--
-- Name: COLUMN patient_intake_output_events.direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_intake_output_events.direction IS 'Either intake (fluids going in) or output (fluids coming out)';


--
-- Name: COLUMN patient_intake_output_events.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_intake_output_events.category IS 'Type of I&O: oral, iv_fluid, iv_med, blood, tube_feed, urine, stool, emesis, drain';


--
-- Name: COLUMN patient_intake_output_events.amount_ml; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_intake_output_events.amount_ml IS 'Volume in milliliters (mL). Always positive number.';


--
-- Name: COLUMN patient_intake_output_events.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_intake_output_events.student_name IS 'Name of student who recorded this event. Used for activity tracking in simulation debrief reports.';


--
-- Name: patient_medications_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_medications_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_template_id uuid NOT NULL,
    medication_name character varying(200) NOT NULL,
    generic_name character varying(200),
    dosage character varying(100) NOT NULL,
    route character varying(50) NOT NULL,
    frequency character varying(100) NOT NULL,
    indication text,
    contraindications text,
    side_effects text[],
    is_prn boolean DEFAULT false,
    prn_parameters text,
    start_date date,
    end_date date,
    max_dose_per_day character varying(50),
    notes text,
    barcode character varying(100),
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT patient_medications_templates_route_check CHECK (((route)::text = ANY (ARRAY[('oral'::character varying)::text, ('intravenous'::character varying)::text, ('intramuscular'::character varying)::text, ('subcutaneous'::character varying)::text, ('topical'::character varying)::text, ('inhalation'::character varying)::text, ('rectal'::character varying)::text, ('sublingual'::character varying)::text, ('nasal'::character varying)::text, ('transdermal'::character varying)::text])))
);


--
-- Name: patient_neuro_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_neuro_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    student_name text,
    level_of_consciousness text,
    oriented_person boolean,
    oriented_place boolean,
    oriented_time boolean,
    gcs_eye smallint,
    gcs_verbal smallint,
    gcs_motor smallint,
    pupils_equal boolean,
    pupil_left_size numeric(3,1),
    pupil_left_reaction text,
    pupil_right_size numeric(3,1),
    pupil_right_reaction text,
    strength_right_arm smallint,
    strength_left_arm smallint,
    strength_right_leg smallint,
    strength_left_leg smallint,
    sensation text,
    speech text,
    pain_score smallint,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patient_neuro_assessments_gcs_eye_check CHECK (((gcs_eye >= 1) AND (gcs_eye <= 4))),
    CONSTRAINT patient_neuro_assessments_gcs_motor_check CHECK (((gcs_motor >= 1) AND (gcs_motor <= 6))),
    CONSTRAINT patient_neuro_assessments_gcs_verbal_check CHECK (((gcs_verbal >= 1) AND (gcs_verbal <= 5))),
    CONSTRAINT patient_neuro_assessments_level_of_consciousness_check CHECK ((level_of_consciousness = ANY (ARRAY['Alert'::text, 'Voice'::text, 'Pain'::text, 'Unresponsive'::text]))),
    CONSTRAINT patient_neuro_assessments_pain_score_check CHECK (((pain_score >= 0) AND (pain_score <= 10))),
    CONSTRAINT patient_neuro_assessments_pupil_left_reaction_check CHECK ((pupil_left_reaction = ANY (ARRAY['Brisk'::text, 'Sluggish'::text, 'Fixed'::text, 'Absent'::text]))),
    CONSTRAINT patient_neuro_assessments_pupil_left_size_check CHECK (((pupil_left_size >= (1)::numeric) AND (pupil_left_size <= (9)::numeric))),
    CONSTRAINT patient_neuro_assessments_pupil_right_reaction_check CHECK ((pupil_right_reaction = ANY (ARRAY['Brisk'::text, 'Sluggish'::text, 'Fixed'::text, 'Absent'::text]))),
    CONSTRAINT patient_neuro_assessments_pupil_right_size_check CHECK (((pupil_right_size >= (1)::numeric) AND (pupil_right_size <= (9)::numeric))),
    CONSTRAINT patient_neuro_assessments_sensation_check CHECK ((sensation = ANY (ARRAY['Normal'::text, 'Reduced'::text, 'Absent'::text, 'Abnormal'::text]))),
    CONSTRAINT patient_neuro_assessments_speech_check CHECK ((speech = ANY (ARRAY['Clear'::text, 'Slurred'::text, 'Confused'::text, 'Aphasia'::text, 'None'::text]))),
    CONSTRAINT patient_neuro_assessments_strength_left_arm_check CHECK (((strength_left_arm >= 0) AND (strength_left_arm <= 5))),
    CONSTRAINT patient_neuro_assessments_strength_left_leg_check CHECK (((strength_left_leg >= 0) AND (strength_left_leg <= 5))),
    CONSTRAINT patient_neuro_assessments_strength_right_arm_check CHECK (((strength_right_arm >= 0) AND (strength_right_arm <= 5))),
    CONSTRAINT patient_neuro_assessments_strength_right_leg_check CHECK (((strength_right_leg >= 0) AND (strength_right_leg <= 5)))
);


--
-- Name: patient_newborn_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_newborn_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    time_of_birth time without time zone,
    weight_grams numeric(6,1),
    length_cm numeric(5,1),
    head_circumference_cm numeric(4,1),
    head_circumference_1hr_cm numeric(4,1),
    head_circumference_2hr_cm numeric(4,1),
    apgar_1min smallint,
    apgar_5min smallint,
    apgar_10min smallint,
    vitamin_k_given boolean DEFAULT false,
    vitamin_k_declined boolean DEFAULT false,
    vitamin_k_dose text,
    vitamin_k_site text,
    vitamin_k_date date,
    vitamin_k_time text,
    vitamin_k_signature text,
    erythromycin_given boolean DEFAULT false,
    erythromycin_date date,
    erythromycin_time text,
    erythromycin_signature text,
    physical_observations jsonb DEFAULT '{}'::jsonb,
    completed_by text,
    completed_initials text,
    student_name text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patient_newborn_assessments_apgar_10min_check CHECK (((apgar_10min >= 0) AND (apgar_10min <= 10))),
    CONSTRAINT patient_newborn_assessments_apgar_1min_check CHECK (((apgar_1min >= 0) AND (apgar_1min <= 10))),
    CONSTRAINT patient_newborn_assessments_apgar_5min_check CHECK (((apgar_5min >= 0) AND (apgar_5min <= 10))),
    CONSTRAINT patient_newborn_assessments_vitamin_k_dose_check CHECK ((vitamin_k_dose = ANY (ARRAY['0.5mg'::text, '1.0mg'::text])))
);


--
-- Name: patient_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    note_type text,
    content text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type text DEFAULT 'Note'::text NOT NULL,
    nurse_name text,
    nurse_id text,
    priority text DEFAULT 'Medium'::text,
    student_name text
);


--
-- Name: TABLE patient_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_notes IS 'Stores clinical assessments, nursing notes, and patient documentation';


--
-- Name: COLUMN patient_notes.tenant_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_notes.tenant_id IS 'Auto-set by trigger based on patient tenant';


--
-- Name: COLUMN patient_notes.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_notes.type IS 'Type of note: Assessment, Progress Note, Shift Note, etc.';


--
-- Name: COLUMN patient_notes.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_notes.priority IS 'Priority level: Low, Medium, High, Critical';


--
-- Name: COLUMN patient_notes.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_notes.student_name IS 'Full name of student who created note';


--
-- Name: patient_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_vitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    temperature numeric(4,1),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    heart_rate integer,
    respiratory_rate integer,
    oxygen_saturation integer,
    recorded_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    oxygen_delivery text DEFAULT 'Room Air'::text,
    student_name text,
    oxygen_flow_rate text DEFAULT 'N/A'::text,
    CONSTRAINT patient_vitals_at_least_one_vital CHECK (((temperature IS NOT NULL) OR (heart_rate IS NOT NULL) OR (blood_pressure_systolic IS NOT NULL) OR (blood_pressure_diastolic IS NOT NULL) OR (respiratory_rate IS NOT NULL) OR (oxygen_saturation IS NOT NULL))),
    CONSTRAINT patient_vitals_bp_pair CHECK ((((blood_pressure_systolic IS NULL) AND (blood_pressure_diastolic IS NULL)) OR ((blood_pressure_systolic IS NOT NULL) AND (blood_pressure_diastolic IS NOT NULL))))
);


--
-- Name: TABLE patient_vitals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.patient_vitals IS 'Patient vital signs records. All vital fields are optional to support clinical scenarios where not all measurements can be obtained (e.g., newborns without BP). At least one vital sign must be present per record.';


--
-- Name: COLUMN patient_vitals.oxygen_delivery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_vitals.oxygen_delivery IS 'Oxygen delivery method: Room Air, O2 1 L/min through O2 15 L/min';


--
-- Name: COLUMN patient_vitals.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_vitals.student_name IS 'Full name of student who recorded vitals';


--
-- Name: COLUMN patient_vitals.oxygen_flow_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patient_vitals.oxygen_flow_rate IS 'Oxygen flow rate: N/A, <1L, 1L-15L, >15L. Separates device type from flow rate for clinical accuracy.';


--
-- Name: CONSTRAINT patient_vitals_at_least_one_vital ON patient_vitals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT patient_vitals_at_least_one_vital ON public.patient_vitals IS 'Ensures at least one vital sign measurement is recorded per entry';


--
-- Name: CONSTRAINT patient_vitals_bp_pair ON patient_vitals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT patient_vitals_bp_pair ON public.patient_vitals IS 'Ensures blood pressure values are recorded together (both systolic and diastolic or neither)';


--
-- Name: patient_vitals_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_vitals_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_template_id uuid NOT NULL,
    vital_type character varying(50) NOT NULL,
    value_systolic integer,
    value_diastolic integer,
    value_numeric numeric(10,2),
    unit character varying(20) NOT NULL,
    normal_range_min numeric(10,2),
    normal_range_max numeric(10,2),
    notes text,
    frequency_minutes integer DEFAULT 60,
    is_critical boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT patient_vitals_templates_vital_type_check CHECK (((vital_type)::text = ANY (ARRAY[('blood_pressure'::character varying)::text, ('heart_rate'::character varying)::text, ('respiratory_rate'::character varying)::text, ('temperature'::character varying)::text, ('oxygen_saturation'::character varying)::text, ('blood_glucose'::character varying)::text, ('pain_scale'::character varying)::text, ('weight'::character varying)::text, ('height'::character varying)::text])))
);


--
-- Name: patient_wounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_wounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    location text NOT NULL,
    coordinates_x numeric NOT NULL,
    coordinates_y numeric NOT NULL,
    view text NOT NULL,
    type text NOT NULL,
    stage text NOT NULL,
    size_length numeric NOT NULL,
    size_width numeric NOT NULL,
    size_depth numeric,
    description text,
    treatment text,
    assessed_by text NOT NULL,
    assessment_date timestamp with time zone DEFAULT now() NOT NULL,
    healing_progress text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    date_of_birth date NOT NULL,
    gender text NOT NULL,
    room_number text NOT NULL,
    bed_number text NOT NULL,
    admission_date date NOT NULL,
    condition text NOT NULL,
    diagnosis text NOT NULL,
    allergies text[] DEFAULT '{}'::text[],
    blood_type text NOT NULL,
    emergency_contact_name text NOT NULL,
    emergency_contact_relationship text NOT NULL,
    emergency_contact_phone text NOT NULL,
    assigned_nurse text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    avatar_id text
);


--
-- Name: COLUMN patients.assigned_nurse; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.assigned_nurse IS 'Optional assigned nurse name (TEXT field, not a foreign key). Legacy field from production nursing workflows. Not required for simulation environments.';


--
-- Name: COLUMN patients.avatar_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.patients.avatar_id IS 'Patient avatar identifier (avatar-1 through avatar-10)';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    first_name text,
    last_name text,
    role text DEFAULT 'nurse'::text,
    department text,
    license_number text,
    phone text,
    is_active boolean DEFAULT true,
    permissions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['nurse'::text, 'doctor'::text, 'admin'::text, 'super_admin'::text])))
);


--
-- Name: program_announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'General'::text,
    is_pinned boolean DEFAULT false,
    author_id uuid NOT NULL,
    author_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    CONSTRAINT content_not_empty CHECK ((length(TRIM(BOTH FROM content)) > 0)),
    CONSTRAINT program_announcements_category_check CHECK ((category = ANY (ARRAY['General'::text, 'Templates'::text, 'Training'::text, 'Students'::text, 'Important'::text, 'Reminder'::text]))),
    CONSTRAINT title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0))
);


--
-- Name: TABLE program_announcements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.program_announcements IS 'Announcements and updates for program communications';


--
-- Name: COLUMN program_announcements.is_pinned; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.program_announcements.is_pinned IS 'Pinned announcements appear at the top';


--
-- Name: COLUMN program_announcements.author_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.program_announcements.author_name IS 'Cached author name for performance';


--
-- Name: COLUMN program_announcements.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.program_announcements.expires_at IS 'Optional expiration date for temporary announcements';


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE programs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.programs IS 'Programs within tenants (e.g., NESA, PN, SIM Hub, BNAD)';


--
-- Name: COLUMN programs.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programs.code IS 'Short code for program (e.g., NESA, PN) - used in simulation categories';


--
-- Name: COLUMN programs.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.programs.name IS 'Full program name';


--
-- Name: scheduled_simulations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_simulations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    program_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    cohort_id uuid,
    instructor_id uuid NOT NULL,
    room_location text,
    status text DEFAULT 'scheduled'::text,
    launched_simulation_id uuid,
    recurrence_rule text,
    student_count integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT duration_positive CHECK ((duration_minutes > 0)),
    CONSTRAINT scheduled_end_after_start CHECK ((scheduled_end > scheduled_start)),
    CONSTRAINT scheduled_simulations_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'launched'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE scheduled_simulations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.scheduled_simulations IS 'Calendar of scheduled simulation sessions for programs';


--
-- Name: COLUMN scheduled_simulations.recurrence_rule; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scheduled_simulations.recurrence_rule IS 'iCal RRULE format for recurring sessions (Phase 2)';


--
-- Name: simulation_active; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_active (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    name text NOT NULL,
    tenant_id uuid NOT NULL,
    status public.simulation_active_status DEFAULT 'pending'::public.simulation_active_status,
    duration_minutes integer NOT NULL,
    starts_at timestamp with time zone DEFAULT now(),
    ends_at timestamp with time zone,
    completed_at timestamp with time zone,
    template_snapshot_version integer NOT NULL,
    allow_late_join boolean DEFAULT false,
    auto_cleanup boolean DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    primary_categories text[] DEFAULT '{}'::text[],
    sub_categories text[] DEFAULT '{}'::text[],
    template_snapshot_version_launched integer DEFAULT 1,
    template_snapshot_version_synced integer,
    CONSTRAINT valid_duration CHECK ((duration_minutes > 0))
);


--
-- Name: TABLE simulation_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_active IS 'Active running simulations - RLS enforced';


--
-- Name: COLUMN simulation_active.primary_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_active.primary_categories IS 'Primary program categories: PN, NESA, SIM Hub, BNAD';


--
-- Name: COLUMN simulation_active.sub_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_active.sub_categories IS 'Sub-categories: Labs, Simulation, Testing';


--
-- Name: COLUMN simulation_active.template_snapshot_version_launched; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_active.template_snapshot_version_launched IS 'Template version when simulation was originally launched';


--
-- Name: COLUMN simulation_active.template_snapshot_version_synced; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_active.template_snapshot_version_synced IS 'Template version last synced to (NULL if never synced)';


--
-- Name: simulation_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type text NOT NULL,
    action_details jsonb DEFAULT '{}'::jsonb,
    entity_type text,
    entity_id uuid,
    occurred_at timestamp with time zone DEFAULT now(),
    notes text
);


--
-- Name: TABLE simulation_activity_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_activity_log IS 'Simulation activity audit log - RLS enforced';


--
-- Name: simulation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid,
    template_id uuid NOT NULL,
    name text NOT NULL,
    status public.simulation_active_status NOT NULL,
    duration_minutes integer NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    completed_at timestamp with time zone,
    metrics jsonb DEFAULT '{}'::jsonb,
    debrief_data jsonb DEFAULT '{}'::jsonb,
    participants jsonb DEFAULT '[]'::jsonb,
    activity_summary jsonb DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    archived_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    student_activities jsonb DEFAULT '[]'::jsonb,
    primary_categories text[] DEFAULT '{}'::text[],
    sub_categories text[] DEFAULT '{}'::text[],
    archived boolean DEFAULT false NOT NULL,
    archived_by uuid,
    instructor_name text,
    archive_folder text
);


--
-- Name: TABLE simulation_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_history IS 'Completed simulation history - RLS enforced';


--
-- Name: COLUMN simulation_history.archived_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.archived_at IS 'Timestamp when the simulation was archived';


--
-- Name: COLUMN simulation_history.student_activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.student_activities IS 'Snapshot of student activities at completion time for debrief reports';


--
-- Name: COLUMN simulation_history.primary_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.primary_categories IS 'Primary program categories from active simulation';


--
-- Name: COLUMN simulation_history.sub_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.sub_categories IS 'Sub-categories from active simulation';


--
-- Name: COLUMN simulation_history.archived; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.archived IS 'Whether this simulation has been archived by an instructor';


--
-- Name: COLUMN simulation_history.archived_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.archived_by IS 'User ID of the instructor who archived this simulation';


--
-- Name: COLUMN simulation_history.instructor_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.instructor_name IS 'Name of the instructor who completed and debriefed this simulation';


--
-- Name: COLUMN simulation_history.archive_folder; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_history.archive_folder IS 'Archive folder structure: InstructorName/CompletionDate (e.g., "John Smith/2025-11-30")';


--
-- Name: simulation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.simulation_role DEFAULT 'student'::public.simulation_role NOT NULL,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid NOT NULL,
    last_accessed_at timestamp with time zone
);


--
-- Name: TABLE simulation_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_participants IS 'User access to simulations - RLS enforced';


--
-- Name: simulation_table_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_table_config (
    id integer NOT NULL,
    table_name text NOT NULL,
    category text NOT NULL,
    has_tenant_id boolean DEFAULT false,
    has_patient_id boolean DEFAULT false,
    parent_table text,
    parent_column text,
    requires_id_mapping boolean DEFAULT false,
    delete_order integer NOT NULL,
    enabled boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_delete_order CHECK ((delete_order > 0))
);


--
-- Name: TABLE simulation_table_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_table_config IS 'Configuration for patient-related tables in simulation snapshot/restore system';


--
-- Name: COLUMN simulation_table_config.requires_id_mapping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_table_config.requires_id_mapping IS 'TRUE if IDs must be preserved for barcodes (patients, medications, wounds, lab_panels)';


--
-- Name: COLUMN simulation_table_config.delete_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_table_config.delete_order IS 'Order for deletion in reset: lower numbers first (delete children before parents)';


--
-- Name: simulation_table_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.simulation_table_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: simulation_table_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.simulation_table_config_id_seq OWNED BY public.simulation_table_config.id;


--
-- Name: simulation_template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_template_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot_data jsonb NOT NULL,
    saved_at timestamp without time zone DEFAULT now(),
    saved_by uuid,
    change_notes text,
    patient_count integer,
    medication_count integer,
    order_count integer,
    wound_count integer,
    device_count integer,
    CONSTRAINT simulation_template_versions_version_check CHECK ((version > 0))
);


--
-- Name: TABLE simulation_template_versions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_template_versions IS 'Archives every template snapshot change for version history and rollback';


--
-- Name: simulation_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    tenant_id uuid NOT NULL,
    status public.simulation_template_status DEFAULT 'draft'::public.simulation_template_status,
    snapshot_data jsonb DEFAULT '{}'::jsonb,
    snapshot_version integer DEFAULT 0,
    snapshot_taken_at timestamp with time zone,
    default_duration_minutes integer DEFAULT 120,
    auto_cleanup_after_hours integer DEFAULT 24,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    primary_categories text[] DEFAULT '{}'::text[],
    sub_categories text[] DEFAULT '{}'::text[],
    folder text,
    CONSTRAINT valid_cleanup CHECK ((auto_cleanup_after_hours >= 0)),
    CONSTRAINT valid_duration CHECK ((default_duration_minutes > 0))
);


--
-- Name: TABLE simulation_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.simulation_templates IS 'Simulation templates with snapshot data - RLS enforced';


--
-- Name: COLUMN simulation_templates.folder; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.simulation_templates.folder IS 'Optional display folder for organizing templates in the UI. No referential integrity — purely cosmetic. NULL = uncategorized.';


--
-- Name: student_roster; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_roster (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    program_id uuid NOT NULL,
    cohort_id uuid,
    student_number text NOT NULL,
    enrollment_date date DEFAULT CURRENT_DATE NOT NULL,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: TABLE student_roster; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_roster IS 'Student enrollments in programs with cohort tracking';


--
-- Name: COLUMN student_roster.cohort_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_roster.cohort_id IS 'Optional cohort grouping (e.g., Fall 2025, Spring 2026)';


--
-- Name: COLUMN student_roster.student_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_roster.student_number IS 'Institutional student ID (unique across all programs)';


--
-- Name: student_roster_with_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.student_roster_with_profiles WITH (security_invoker='true') AS
 SELECT sr.id,
    sr.user_id,
    sr.program_id,
    sr.cohort_id,
    sr.student_number,
    sr.enrollment_date,
    sr.is_active,
    sr.notes,
    sr.created_at,
    sr.updated_at,
    sr.created_by,
    up.email AS user_email,
    up.first_name AS user_first_name,
    up.last_name AS user_last_name,
    up.role AS user_role,
    up.phone AS user_phone,
    up.simulation_only AS user_simulation_only
   FROM (public.student_roster sr
     LEFT JOIN public.user_profiles up ON ((sr.user_id = up.id)));


--
-- Name: VIEW student_roster_with_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.student_roster_with_profiles IS 'Student roster with joined user profile information for easy querying';


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    tenant_id uuid,
    log_level character varying(20) NOT NULL,
    log_type character varying(50) NOT NULL,
    component character varying(255),
    action character varying(255),
    error_message text,
    error_stack text,
    request_data jsonb,
    response_data jsonb,
    user_agent text,
    browser_info jsonb,
    ip_address inet,
    session_id text,
    current_url text,
    previous_url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_logs_log_level_check CHECK (((log_level)::text = ANY (ARRAY[('debug'::character varying)::text, ('info'::character varying)::text, ('warn'::character varying)::text, ('error'::character varying)::text, ('security'::character varying)::text])))
);


--
-- Name: TABLE system_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_logs IS 'Comprehensive system logging for super admin monitoring and troubleshooting. Tracks errors, user actions, and system events with full context.';


--
-- Name: tenant_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    permissions text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT tenant_users_role_check CHECK (((role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('coordinator'::character varying)::text, ('admin'::character varying)::text, ('instructor'::character varying)::text, ('nurse'::character varying)::text, ('student'::character varying)::text, ('viewer'::character varying)::text])))
);


--
-- Name: TABLE tenant_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_users IS 'Maps users to tenants with role-based access control';


--
-- Name: COLUMN tenant_users.permissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_users.permissions IS 'Array of permission strings for granular access control';


--
-- Name: CONSTRAINT tenant_users_role_check ON tenant_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT tenant_users_role_check ON public.tenant_users IS 'Validates role: super_admin, coordinator, admin, instructor, nurse, student, viewer';


--
-- Name: tenant_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.tenant_statistics WITH (security_invoker='on') AS
 SELECT t.id,
    t.name,
    t.created_at,
    count(DISTINCT tu.user_id) AS user_count,
    count(DISTINCT p.id) AS patient_count
   FROM ((public.tenants t
     LEFT JOIN public.tenant_users tu ON (((t.id = tu.tenant_id) AND (tu.is_active = true))))
     LEFT JOIN public.patients p ON ((t.id = p.tenant_id)))
  GROUP BY t.id, t.name, t.created_at;


--
-- Name: VIEW tenant_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.tenant_statistics IS 'Tenant statistics view - Uses security_invoker=on to enforce calling user permissions and RLS policies';


--
-- Name: user_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    program_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: TABLE user_programs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_programs IS 'Many-to-many: users assigned to programs';


--
-- Name: user_roles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_roles WITH (security_invoker='on') AS
 SELECT id,
    email,
    role,
    first_name,
    last_name,
    created_at
   FROM public.user_profiles up;


--
-- Name: VIEW user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.user_roles IS 'User roles view - Uses security_invoker=on to enforce calling user permissions and RLS policies';


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    ip_address inet,
    user_agent text,
    tenant_id uuid,
    login_time timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    logout_time timestamp with time zone,
    session_token text,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('idle'::character varying)::text, ('logged_out'::character varying)::text])))
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_sessions IS 'Tracks user login sessions with IP addresses and timestamps';


--
-- Name: user_tenant_access; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_tenant_access WITH (security_invoker='on') AS
 SELECT DISTINCT tu.user_id,
    tu.tenant_id,
    up.role AS user_role,
    tu.is_active
   FROM (public.tenant_users tu
     JOIN public.user_profiles up ON ((tu.user_id = up.id)));


--
-- Name: VIEW user_tenant_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.user_tenant_access IS 'User-tenant access mapping - Uses security_invoker=on to enforce calling user permissions and RLS policies';


--
-- Name: user_tenant_cache; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.user_tenant_cache AS
 SELECT user_id,
    tenant_id,
    role,
    is_active,
    created_at
   FROM public.tenant_users
  WHERE (is_active = true)
  WITH NO DATA;


--
-- Name: MATERIALIZED VIEW user_tenant_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON MATERIALIZED VIEW public.user_tenant_cache IS 'Cached user-tenant relationships for performance. Currently accessible to authenticated users. TODO: Refactor application code to use RLS-protected functions instead of direct access.';


--
-- Name: wound_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wound_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    assessment_date timestamp with time zone DEFAULT now(),
    wound_location text,
    wound_type text,
    stage text,
    length_cm numeric(5,2) DEFAULT 0,
    width_cm numeric(5,2) DEFAULT 0,
    depth_cm numeric(5,2) DEFAULT 0,
    wound_bed text,
    exudate_amount text,
    exudate_type text,
    periwound_condition text,
    pain_level integer,
    odor text,
    signs_of_infection text,
    assessment_notes text,
    photos text[],
    assessor_id uuid,
    assessor_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    student_name text,
    device_id uuid,
    wound_id uuid,
    assessed_at timestamp with time zone DEFAULT now(),
    site_condition text,
    surrounding_skin text,
    treatment_applied text,
    dressing_type text,
    device_functioning boolean,
    output_amount_ml integer,
    drainage_type text[],
    drainage_amount text,
    wound_length_cm numeric(5,2),
    wound_width_cm numeric(5,2),
    wound_depth_cm numeric(5,2),
    wound_appearance text,
    notes text,
    assessment_data jsonb DEFAULT '{}'::jsonb,
    device_type text,
    CONSTRAINT wound_assessments_exudate_amount_check CHECK ((exudate_amount = ANY (ARRAY['none'::text, 'minimal'::text, 'moderate'::text, 'heavy'::text]))),
    CONSTRAINT wound_assessments_exudate_type_check CHECK ((exudate_type = ANY (ARRAY['serous'::text, 'sanguineous'::text, 'serosanguineous'::text, 'purulent'::text, 'other'::text]))),
    CONSTRAINT wound_assessments_pain_level_check CHECK (((pain_level >= 0) AND (pain_level <= 10))),
    CONSTRAINT wound_assessments_wound_bed_check CHECK ((wound_bed = ANY (ARRAY['red'::text, 'yellow'::text, 'black'::text, 'mixed'::text]))),
    CONSTRAINT wound_assessments_wound_type_check CHECK ((wound_type = ANY (ARRAY['surgical'::text, 'pressure'::text, 'venous'::text, 'arterial'::text, 'diabetic'::text, 'traumatic'::text, 'other'::text])))
);


--
-- Name: TABLE wound_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wound_assessments IS 'Multi-purpose table: legacy wound care assessments + new hacMap device/wound assessments';


--
-- Name: COLUMN wound_assessments.student_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.student_name IS 'Full name of student who performed assessment';


--
-- Name: COLUMN wound_assessments.device_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.device_id IS 'Links to device being assessed (NULL if wound assessment)';


--
-- Name: COLUMN wound_assessments.site_condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.site_condition IS 'Condition of IV site (devices) or surrounding skin (wounds)';


--
-- Name: COLUMN wound_assessments.device_functioning; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.device_functioning IS 'Is the device patent and functioning properly?';


--
-- Name: COLUMN wound_assessments.output_amount_ml; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.output_amount_ml IS 'Amount of drainage from device (for drains, tubes, catheters)';


--
-- Name: COLUMN wound_assessments.drainage_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.drainage_type IS 'Array of drainage types: serous, sanguineous, serosanguineous, purulent, none';


--
-- Name: COLUMN wound_assessments.drainage_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.drainage_amount IS 'Amount of drainage: none, scant, small, moderate, large, copious';


--
-- Name: COLUMN wound_assessments.wound_length_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.wound_length_cm IS 'Wound length in centimeters';


--
-- Name: COLUMN wound_assessments.wound_width_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.wound_width_cm IS 'Wound width in centimeters';


--
-- Name: COLUMN wound_assessments.wound_depth_cm; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.wound_depth_cm IS 'Wound depth in centimeters';


--
-- Name: COLUMN wound_assessments.wound_appearance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.wound_appearance IS 'Wound appearance: clean, granulating, epithelializing, slough, eschar, necrotic, infected';


--
-- Name: COLUMN wound_assessments.notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.notes IS 'Additional notes or observations about the assessment';


--
-- Name: COLUMN wound_assessments.assessment_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.assessment_data IS 'Device/wound-specific assessment fields stored as JSONB (e.g., IV site details, feeding tube residuals)';


--
-- Name: COLUMN wound_assessments.device_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_assessments.device_type IS 'Cached device type from devices table for quick filtering';


--
-- Name: wound_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wound_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    wound_assessment_id uuid,
    treatment_date timestamp with time zone DEFAULT now() NOT NULL,
    treatment_type text NOT NULL,
    products_used text NOT NULL,
    procedure_notes text NOT NULL,
    administered_by text NOT NULL,
    administered_by_id uuid NOT NULL,
    administered_at timestamp with time zone DEFAULT now() NOT NULL,
    next_treatment_due timestamp with time zone,
    photos_after text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE wound_treatments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.wound_treatments IS 'Tracks wound treatment history, procedures, and outcomes';


--
-- Name: COLUMN wound_treatments.photos_after; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wound_treatments.photos_after IS 'Array of Supabase Storage URLs for post-treatment photos';


--
-- Name: wounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    location_id uuid NOT NULL,
    wound_type public.wound_type_enum NOT NULL,
    peri_wound_temperature text,
    wound_length_cm numeric,
    wound_width_cm numeric,
    wound_depth_cm numeric,
    wound_description text,
    drainage_description text[] DEFAULT '{}'::text[],
    drainage_consistency text[] DEFAULT '{}'::text[],
    wound_odor text[] DEFAULT '{}'::text[],
    drainage_amount text,
    wound_edges text,
    closure text,
    suture_staple_line text,
    sutures_intact text,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    entered_by text
);


--
-- Name: COLUMN wounds.entered_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.wounds.entered_by IS 'Name of the nurse/clinician who entered/documented this wound';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2025_07_17; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_17 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_18; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_18 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_19; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_19 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_20; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_20 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_21; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_21 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_22; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_22 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_23; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_04_06; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_04_07; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_07 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_04_08; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_08 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_04_09; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_09 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2026_04_10; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2026_04_10 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: messages_2025_07_17; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_17 FOR VALUES FROM ('2025-07-17 00:00:00') TO ('2025-07-18 00:00:00');


--
-- Name: messages_2025_07_18; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_18 FOR VALUES FROM ('2025-07-18 00:00:00') TO ('2025-07-19 00:00:00');


--
-- Name: messages_2025_07_19; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_19 FOR VALUES FROM ('2025-07-19 00:00:00') TO ('2025-07-20 00:00:00');


--
-- Name: messages_2025_07_20; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_20 FOR VALUES FROM ('2025-07-20 00:00:00') TO ('2025-07-21 00:00:00');


--
-- Name: messages_2025_07_21; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_21 FOR VALUES FROM ('2025-07-21 00:00:00') TO ('2025-07-22 00:00:00');


--
-- Name: messages_2025_07_22; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_22 FOR VALUES FROM ('2025-07-22 00:00:00') TO ('2025-07-23 00:00:00');


--
-- Name: messages_2025_07_23; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_23 FOR VALUES FROM ('2025-07-23 00:00:00') TO ('2025-07-24 00:00:00');


--
-- Name: messages_2026_04_06; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_06 FOR VALUES FROM ('2026-04-06 00:00:00') TO ('2026-04-07 00:00:00');


--
-- Name: messages_2026_04_07; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_07 FOR VALUES FROM ('2026-04-07 00:00:00') TO ('2026-04-08 00:00:00');


--
-- Name: messages_2026_04_08; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_08 FOR VALUES FROM ('2026-04-08 00:00:00') TO ('2026-04-09 00:00:00');


--
-- Name: messages_2026_04_09; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_09 FOR VALUES FROM ('2026-04-09 00:00:00') TO ('2026-04-10 00:00:00');


--
-- Name: messages_2026_04_10; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_10 FOR VALUES FROM ('2026-04-10 00:00:00') TO ('2026-04-11 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: simulation_table_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_table_config ALTER COLUMN id SET DEFAULT nextval('public.simulation_table_config_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: avatar_locations avatar_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_locations
    ADD CONSTRAINT avatar_locations_pkey PRIMARY KEY (id);


--
-- Name: backup_audit_log backup_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_audit_log
    ADD CONSTRAINT backup_audit_log_pkey PRIMARY KEY (id);


--
-- Name: backup_files backup_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_files
    ADD CONSTRAINT backup_files_pkey PRIMARY KEY (id);


--
-- Name: backup_metadata backup_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata
    ADD CONSTRAINT backup_metadata_pkey PRIMARY KEY (id);


--
-- Name: bowel_records bowel_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bowel_records
    ADD CONSTRAINT bowel_records_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: device_assessments device_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_assessments
    ADD CONSTRAINT device_assessments_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: diabetic_records diabetic_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diabetic_records
    ADD CONSTRAINT diabetic_records_pkey PRIMARY KEY (id);


--
-- Name: doctors_orders doctors_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_pkey PRIMARY KEY (id);


--
-- Name: handover_notes handover_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_notes
    ADD CONSTRAINT handover_notes_pkey PRIMARY KEY (id);


--
-- Name: lab_ack_events lab_ack_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ack_events
    ADD CONSTRAINT lab_ack_events_pkey PRIMARY KEY (id);


--
-- Name: lab_orders lab_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_pkey PRIMARY KEY (id);


--
-- Name: lab_panels lab_panels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_panels
    ADD CONSTRAINT lab_panels_pkey PRIMARY KEY (id);


--
-- Name: lab_result_refs lab_result_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_result_refs
    ADD CONSTRAINT lab_result_refs_pkey PRIMARY KEY (test_code);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: medication_administrations medication_administrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administrations
    ADD CONSTRAINT medication_administrations_pkey PRIMARY KEY (id);


--
-- Name: multi_tenant_admins multi_tenant_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_tenant_admins
    ADD CONSTRAINT multi_tenant_admins_pkey PRIMARY KEY (id);


--
-- Name: multi_tenant_admins multi_tenant_admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_tenant_admins
    ADD CONSTRAINT multi_tenant_admins_user_id_key UNIQUE (user_id);


--
-- Name: patient_admission_records patient_admission_records_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_admission_records
    ADD CONSTRAINT patient_admission_records_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_admission_records patient_admission_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_admission_records
    ADD CONSTRAINT patient_admission_records_pkey PRIMARY KEY (id);


--
-- Name: patient_advanced_directives patient_advanced_directives_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_advanced_directives
    ADD CONSTRAINT patient_advanced_directives_patient_id_key UNIQUE (patient_id);


--
-- Name: patient_advanced_directives patient_advanced_directives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_advanced_directives
    ADD CONSTRAINT patient_advanced_directives_pkey PRIMARY KEY (id);


--
-- Name: patient_alerts patient_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_alerts
    ADD CONSTRAINT patient_alerts_pkey PRIMARY KEY (id);


--
-- Name: patient_bbit_entries patient_bbit_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_bbit_entries
    ADD CONSTRAINT patient_bbit_entries_pkey PRIMARY KEY (id);


--
-- Name: patient_images patient_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_pkey PRIMARY KEY (id);


--
-- Name: patient_intake_output_events patient_intake_output_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_intake_output_events
    ADD CONSTRAINT patient_intake_output_events_pkey PRIMARY KEY (id);


--
-- Name: patient_medications patient_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_pkey PRIMARY KEY (id);


--
-- Name: patient_medications_templates patient_medications_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_medications_templates
    ADD CONSTRAINT patient_medications_templates_pkey PRIMARY KEY (id);


--
-- Name: patient_neuro_assessments patient_neuro_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_neuro_assessments
    ADD CONSTRAINT patient_neuro_assessments_pkey PRIMARY KEY (id);


--
-- Name: patient_newborn_assessments patient_newborn_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_newborn_assessments
    ADD CONSTRAINT patient_newborn_assessments_pkey PRIMARY KEY (id);


--
-- Name: patient_newborn_assessments patient_newborn_assessments_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_newborn_assessments
    ADD CONSTRAINT patient_newborn_assessments_unique UNIQUE (patient_id, tenant_id);


--
-- Name: patient_notes patient_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_pkey PRIMARY KEY (id);


--
-- Name: patient_vitals patient_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_pkey PRIMARY KEY (id);


--
-- Name: patient_vitals_templates patient_vitals_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals_templates
    ADD CONSTRAINT patient_vitals_templates_pkey PRIMARY KEY (id);


--
-- Name: patient_wounds patient_wounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wounds
    ADD CONSTRAINT patient_wounds_pkey PRIMARY KEY (id);


--
-- Name: patients patients_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_patient_id_key UNIQUE (patient_id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_announcements program_announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: programs programs_tenant_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_tenant_code_unique UNIQUE (tenant_id, code);


--
-- Name: scheduled_simulations scheduled_simulations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_pkey PRIMARY KEY (id);


--
-- Name: simulation_active simulation_active_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_active
    ADD CONSTRAINT simulation_active_pkey PRIMARY KEY (id);


--
-- Name: simulation_activity_log simulation_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_activity_log
    ADD CONSTRAINT simulation_activity_log_pkey PRIMARY KEY (id);


--
-- Name: simulation_history simulation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_history
    ADD CONSTRAINT simulation_history_pkey PRIMARY KEY (id);


--
-- Name: simulation_participants simulation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_participants
    ADD CONSTRAINT simulation_participants_pkey PRIMARY KEY (id);


--
-- Name: simulation_table_config simulation_table_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_table_config
    ADD CONSTRAINT simulation_table_config_pkey PRIMARY KEY (id);


--
-- Name: simulation_table_config simulation_table_config_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_table_config
    ADD CONSTRAINT simulation_table_config_table_name_key UNIQUE (table_name);


--
-- Name: simulation_template_versions simulation_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_template_versions
    ADD CONSTRAINT simulation_template_versions_pkey PRIMARY KEY (id);


--
-- Name: simulation_template_versions simulation_template_versions_template_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_template_versions
    ADD CONSTRAINT simulation_template_versions_template_id_version_key UNIQUE (template_id, version);


--
-- Name: simulation_templates simulation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_templates
    ADD CONSTRAINT simulation_templates_pkey PRIMARY KEY (id);


--
-- Name: student_roster student_roster_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_pkey PRIMARY KEY (id);


--
-- Name: student_roster student_roster_unique_student_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_unique_student_number UNIQUE (student_number);


--
-- Name: student_roster student_roster_unique_user_program; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_unique_user_program UNIQUE (user_id, program_id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: simulation_participants unique_participant; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_participants
    ADD CONSTRAINT unique_participant UNIQUE (simulation_id, user_id);


--
-- Name: tenants unique_subdomain; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT unique_subdomain UNIQUE (subdomain);


--
-- Name: simulation_templates unique_template_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_templates
    ADD CONSTRAINT unique_template_name UNIQUE (name);


--
-- Name: user_profiles user_profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_email_key UNIQUE (email);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_programs user_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_pkey PRIMARY KEY (id);


--
-- Name: user_programs user_programs_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_unique UNIQUE (user_id, program_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: wound_assessments wound_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_pkey PRIMARY KEY (id);


--
-- Name: wound_treatments wound_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_treatments
    ADD CONSTRAINT wound_treatments_pkey PRIMARY KEY (id);


--
-- Name: wounds wounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_17 messages_2025_07_17_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_17
    ADD CONSTRAINT messages_2025_07_17_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_18 messages_2025_07_18_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_18
    ADD CONSTRAINT messages_2025_07_18_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_19 messages_2025_07_19_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_19
    ADD CONSTRAINT messages_2025_07_19_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_20 messages_2025_07_20_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_20
    ADD CONSTRAINT messages_2025_07_20_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_21 messages_2025_07_21_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_21
    ADD CONSTRAINT messages_2025_07_21_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_22 messages_2025_07_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_22
    ADD CONSTRAINT messages_2025_07_22_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_23 messages_2025_07_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_23
    ADD CONSTRAINT messages_2025_07_23_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_06 messages_2026_04_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_06
    ADD CONSTRAINT messages_2026_04_06_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_07 messages_2026_04_07_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_07
    ADD CONSTRAINT messages_2026_04_07_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_08 messages_2026_04_08_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_08
    ADD CONSTRAINT messages_2026_04_08_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_09 messages_2026_04_09_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_09
    ADD CONSTRAINT messages_2026_04_09_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_04_10 messages_2026_04_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2026_04_10
    ADD CONSTRAINT messages_2026_04_10_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_activity_log_simulation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_simulation ON public.simulation_activity_log USING btree (simulation_id, occurred_at DESC);


--
-- Name: idx_activity_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_log_user ON public.simulation_activity_log USING btree (user_id, occurred_at DESC);


--
-- Name: idx_advanced_directives_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advanced_directives_student_name ON public.patient_advanced_directives USING btree (student_name);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_target_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_target_id ON public.audit_logs USING btree (target_id);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_avatar_locations_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_locations_patient ON public.avatar_locations USING btree (patient_id);


--
-- Name: idx_avatar_locations_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_locations_tenant ON public.avatar_locations USING btree (tenant_id);


--
-- Name: idx_backup_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_action ON public.backup_audit_log USING btree (action);


--
-- Name: idx_backup_audit_backup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_backup_id ON public.backup_audit_log USING btree (backup_id);


--
-- Name: idx_backup_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_created_at ON public.backup_audit_log USING btree (created_at DESC);


--
-- Name: idx_backup_audit_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_audit_user_id ON public.backup_audit_log USING btree (user_id);


--
-- Name: idx_backup_files_backup_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_backup_files_backup_id ON public.backup_files USING btree (backup_id);


--
-- Name: idx_backup_files_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_files_created_at ON public.backup_files USING btree (created_at DESC);


--
-- Name: idx_backup_metadata_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_created_at ON public.backup_metadata USING btree (created_at DESC);


--
-- Name: idx_backup_metadata_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_created_by ON public.backup_metadata USING btree (created_by);


--
-- Name: idx_backup_metadata_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_expiry ON public.backup_metadata USING btree (expiry_date);


--
-- Name: idx_backup_metadata_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_status ON public.backup_metadata USING btree (status);


--
-- Name: idx_bbit_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bbit_patient ON public.patient_bbit_entries USING btree (patient_id);


--
-- Name: idx_bbit_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bbit_recorded_at ON public.patient_bbit_entries USING btree (patient_id, recorded_at);


--
-- Name: idx_bbit_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bbit_tenant ON public.patient_bbit_entries USING btree (tenant_id);


--
-- Name: idx_bowel_records_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bowel_records_patient_id ON public.bowel_records USING btree (patient_id);


--
-- Name: idx_bowel_records_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bowel_records_recorded_at ON public.bowel_records USING btree (recorded_at DESC);


--
-- Name: idx_bowel_records_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bowel_records_student_name ON public.bowel_records USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_bowel_records_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bowel_records_tenant_id ON public.bowel_records USING btree (tenant_id);


--
-- Name: idx_contact_submissions_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_email ON public.contact_submissions USING btree (email);


--
-- Name: idx_contact_submissions_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_processed ON public.contact_submissions USING btree (processed) WHERE (NOT processed);


--
-- Name: idx_contact_submissions_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_submitted_at ON public.contact_submissions USING btree (submitted_at DESC);


--
-- Name: idx_device_assessments_assessed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_assessed_at ON public.device_assessments USING btree (assessed_at DESC);


--
-- Name: idx_device_assessments_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_data ON public.device_assessments USING gin (assessment_data);


--
-- Name: idx_device_assessments_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_device_id ON public.device_assessments USING btree (device_id);


--
-- Name: idx_device_assessments_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_device_type ON public.device_assessments USING btree (device_type);


--
-- Name: idx_device_assessments_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_patient_id ON public.device_assessments USING btree (patient_id);


--
-- Name: idx_device_assessments_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_student_name ON public.device_assessments USING btree (student_name);


--
-- Name: idx_device_assessments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_assessments_tenant_id ON public.device_assessments USING btree (tenant_id);


--
-- Name: idx_devices_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devices_location ON public.devices USING btree (location_id);


--
-- Name: idx_devices_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devices_patient ON public.devices USING btree (patient_id);


--
-- Name: idx_devices_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_devices_tenant ON public.devices USING btree (tenant_id);


--
-- Name: idx_diabetic_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_date ON public.diabetic_records USING btree (date);


--
-- Name: idx_diabetic_records_patient_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_patient_date ON public.diabetic_records USING btree (patient_id, date);


--
-- Name: idx_diabetic_records_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_patient_id ON public.diabetic_records USING btree (patient_id);


--
-- Name: idx_diabetic_records_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_recorded_at ON public.diabetic_records USING btree (recorded_at);


--
-- Name: idx_diabetic_records_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_student_name ON public.diabetic_records USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_diabetic_records_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diabetic_records_tenant_id ON public.diabetic_records USING btree (tenant_id);


--
-- Name: idx_doctors_orders_acknowledged_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_orders_acknowledged_by ON public.doctors_orders USING btree (acknowledged_by_student) WHERE (acknowledged_by_student IS NOT NULL);


--
-- Name: idx_doctors_orders_is_acknowledged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_orders_is_acknowledged ON public.doctors_orders USING btree (is_acknowledged);


--
-- Name: idx_doctors_orders_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_orders_order_date ON public.doctors_orders USING btree (order_date);


--
-- Name: idx_doctors_orders_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_orders_patient_id ON public.doctors_orders USING btree (patient_id);


--
-- Name: idx_doctors_orders_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_orders_tenant_id ON public.doctors_orders USING btree (tenant_id);


--
-- Name: idx_handover_notes_acknowledged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_acknowledged ON public.handover_notes USING btree (acknowledged_by) WHERE (acknowledged_by IS NOT NULL);


--
-- Name: idx_handover_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_created_at ON public.handover_notes USING btree (created_at DESC);


--
-- Name: idx_handover_notes_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_patient_id ON public.handover_notes USING btree (patient_id);


--
-- Name: idx_handover_notes_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_priority ON public.handover_notes USING btree (priority);


--
-- Name: idx_handover_notes_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_shift ON public.handover_notes USING btree (shift);


--
-- Name: idx_handover_notes_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_handover_notes_student_name ON public.handover_notes USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_io_direction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_io_direction ON public.patient_intake_output_events USING btree (tenant_id, patient_id, direction);


--
-- Name: idx_io_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_io_student_name ON public.patient_intake_output_events USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_io_tenant_patient_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_io_tenant_patient_time ON public.patient_intake_output_events USING btree (tenant_id, patient_id, event_timestamp DESC);


--
-- Name: idx_lab_ack_events_ack_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_ack_events_ack_by ON public.lab_ack_events USING btree (ack_by);


--
-- Name: idx_lab_ack_events_panel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_ack_events_panel ON public.lab_ack_events USING btree (panel_id);


--
-- Name: idx_lab_ack_events_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_ack_events_student_name ON public.lab_ack_events USING btree (student_name);


--
-- Name: idx_lab_ack_events_tenant_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_ack_events_tenant_patient ON public.lab_ack_events USING btree (tenant_id, patient_id);


--
-- Name: idx_lab_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_date ON public.lab_orders USING btree (order_date DESC);


--
-- Name: idx_lab_orders_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_patient ON public.lab_orders USING btree (patient_id);


--
-- Name: idx_lab_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_status ON public.lab_orders USING btree (status);


--
-- Name: idx_lab_orders_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_student_name ON public.lab_orders USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_lab_orders_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_orders_tenant ON public.lab_orders USING btree (tenant_id);


--
-- Name: idx_lab_panels_entered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_panels_entered_by ON public.lab_panels USING btree (entered_by);


--
-- Name: idx_lab_panels_panel_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_panels_panel_time ON public.lab_panels USING btree (panel_time DESC);


--
-- Name: idx_lab_panels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_panels_status ON public.lab_panels USING btree (status);


--
-- Name: idx_lab_panels_tenant_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_panels_tenant_patient ON public.lab_panels USING btree (tenant_id, patient_id);


--
-- Name: idx_lab_results_ack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_ack ON public.lab_results USING btree (ack_by, ack_at) WHERE (ack_at IS NULL);


--
-- Name: idx_lab_results_ack_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_ack_by ON public.lab_results USING btree (ack_by);


--
-- Name: idx_lab_results_acknowledged_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_acknowledged_by ON public.lab_results USING btree (acknowledged_by_student) WHERE (acknowledged_by_student IS NOT NULL);


--
-- Name: idx_lab_results_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_category ON public.lab_results USING btree (category);


--
-- Name: idx_lab_results_entered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_entered_by ON public.lab_results USING btree (entered_by);


--
-- Name: idx_lab_results_flag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_flag ON public.lab_results USING btree (flag);


--
-- Name: idx_lab_results_note; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_note ON public.lab_results USING btree (note) WHERE (note IS NOT NULL);


--
-- Name: idx_lab_results_panel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_panel ON public.lab_results USING btree (panel_id);


--
-- Name: idx_lab_results_tenant_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_results_tenant_patient ON public.lab_results USING btree (tenant_id, patient_id);


--
-- Name: idx_medication_administrations_administered_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_administered_by_id ON public.medication_administrations USING btree (administered_by_id);


--
-- Name: idx_medication_administrations_medication_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_medication_id ON public.medication_administrations USING btree (medication_id);


--
-- Name: idx_medication_administrations_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_patient_id ON public.medication_administrations USING btree (patient_id);


--
-- Name: idx_medication_administrations_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_student_name ON public.medication_administrations USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_medication_administrations_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_tenant_id ON public.medication_administrations USING btree (tenant_id);


--
-- Name: idx_medication_administrations_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medication_administrations_timestamp ON public.medication_administrations USING btree ("timestamp" DESC);


--
-- Name: idx_neuro_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_neuro_patient ON public.patient_neuro_assessments USING btree (patient_id);


--
-- Name: idx_neuro_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_neuro_recorded_at ON public.patient_neuro_assessments USING btree (patient_id, recorded_at);


--
-- Name: idx_neuro_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_neuro_tenant ON public.patient_neuro_assessments USING btree (tenant_id);


--
-- Name: idx_newborn_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_newborn_patient ON public.patient_newborn_assessments USING btree (patient_id);


--
-- Name: idx_newborn_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_newborn_tenant ON public.patient_newborn_assessments USING btree (tenant_id);


--
-- Name: idx_newborn_tenant_recorded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_newborn_tenant_recorded ON public.patient_newborn_assessments USING btree (tenant_id, recorded_at DESC);


--
-- Name: idx_patient_admission_records_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_admission_records_patient_id ON public.patient_admission_records USING btree (patient_id);


--
-- Name: idx_patient_admission_records_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_admission_records_tenant_id ON public.patient_admission_records USING btree (tenant_id);


--
-- Name: idx_patient_advanced_directives_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_advanced_directives_patient_id ON public.patient_advanced_directives USING btree (patient_id);


--
-- Name: idx_patient_advanced_directives_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_advanced_directives_tenant_id ON public.patient_advanced_directives USING btree (tenant_id);


--
-- Name: idx_patient_alerts_acknowledged; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_acknowledged ON public.patient_alerts USING btree (acknowledged);


--
-- Name: idx_patient_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_created_at ON public.patient_alerts USING btree (created_at);


--
-- Name: idx_patient_alerts_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_expires_at ON public.patient_alerts USING btree (expires_at);


--
-- Name: idx_patient_alerts_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_patient_id ON public.patient_alerts USING btree (patient_id);


--
-- Name: idx_patient_alerts_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_priority ON public.patient_alerts USING btree (priority);


--
-- Name: idx_patient_alerts_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_tenant_id ON public.patient_alerts USING btree (tenant_id);


--
-- Name: idx_patient_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_alerts_type ON public.patient_alerts USING btree (alert_type);


--
-- Name: idx_patient_images_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_images_created_at ON public.patient_images USING btree (created_at);


--
-- Name: idx_patient_images_image_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_images_image_type ON public.patient_images USING btree (image_type);


--
-- Name: idx_patient_images_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_images_patient_id ON public.patient_images USING btree (patient_id);


--
-- Name: idx_patient_medications_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_medications_category ON public.patient_medications USING btree (category);


--
-- Name: idx_patient_medications_next_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_medications_next_due ON public.patient_medications USING btree (next_due);


--
-- Name: idx_patient_medications_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_medications_patient_id ON public.patient_medications USING btree (patient_id);


--
-- Name: idx_patient_medications_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_medications_tenant_id ON public.patient_medications USING btree (tenant_id);


--
-- Name: idx_patient_notes_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_notes_student_name ON public.patient_notes USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_patient_notes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_notes_type ON public.patient_notes USING btree (type);


--
-- Name: idx_patient_vitals_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_patient_id ON public.patient_vitals USING btree (patient_id);


--
-- Name: idx_patient_vitals_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_recorded_at ON public.patient_vitals USING btree (recorded_at);


--
-- Name: idx_patient_vitals_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_student_name ON public.patient_vitals USING btree (student_name) WHERE (student_name IS NOT NULL);


--
-- Name: idx_patient_vitals_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_tenant_id ON public.patient_vitals USING btree (tenant_id);


--
-- Name: idx_patient_vitals_tenant_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_vitals_tenant_patient ON public.patient_vitals USING btree (tenant_id, patient_id);


--
-- Name: idx_patient_wounds_assessment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_wounds_assessment_date ON public.patient_wounds USING btree (assessment_date);


--
-- Name: idx_patients_avatar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_avatar_id ON public.patients USING btree (avatar_id);


--
-- Name: idx_patients_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_patient_id ON public.patients USING btree (patient_id);


--
-- Name: idx_patients_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_room ON public.patients USING btree (room_number, bed_number);


--
-- Name: idx_patients_tenant_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_tenant_created ON public.patients USING btree (tenant_id, created_at DESC);


--
-- Name: idx_patients_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_tenant_id ON public.patients USING btree (tenant_id);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_program_announcements_author_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_announcements_author_id ON public.program_announcements USING btree (author_id);


--
-- Name: idx_program_announcements_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_announcements_category ON public.program_announcements USING btree (category);


--
-- Name: idx_program_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_announcements_created_at ON public.program_announcements USING btree (created_at DESC);


--
-- Name: idx_program_announcements_is_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_announcements_is_pinned ON public.program_announcements USING btree (is_pinned);


--
-- Name: idx_program_announcements_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_announcements_program_id ON public.program_announcements USING btree (program_id);


--
-- Name: idx_programs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_code ON public.programs USING btree (code);


--
-- Name: idx_programs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_is_active ON public.programs USING btree (is_active);


--
-- Name: idx_programs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_tenant_id ON public.programs USING btree (tenant_id);


--
-- Name: idx_scheduled_simulations_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_cohort_id ON public.scheduled_simulations USING btree (cohort_id) WHERE (cohort_id IS NOT NULL);


--
-- Name: idx_scheduled_simulations_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_date_range ON public.scheduled_simulations USING btree (scheduled_start, scheduled_end, status);


--
-- Name: idx_scheduled_simulations_instructor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_instructor_id ON public.scheduled_simulations USING btree (instructor_id);


--
-- Name: idx_scheduled_simulations_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_program_id ON public.scheduled_simulations USING btree (program_id);


--
-- Name: idx_scheduled_simulations_scheduled_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_scheduled_end ON public.scheduled_simulations USING btree (scheduled_end);


--
-- Name: idx_scheduled_simulations_scheduled_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_scheduled_start ON public.scheduled_simulations USING btree (scheduled_start);


--
-- Name: idx_scheduled_simulations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_status ON public.scheduled_simulations USING btree (status);


--
-- Name: idx_scheduled_simulations_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_simulations_template_id ON public.scheduled_simulations USING btree (template_id);


--
-- Name: idx_simulation_active_ends_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_ends_at ON public.simulation_active USING btree (ends_at) WHERE (status = 'running'::public.simulation_active_status);


--
-- Name: idx_simulation_active_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_status ON public.simulation_active USING btree (status);


--
-- Name: idx_simulation_active_status_ends; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_status_ends ON public.simulation_active USING btree (status, ends_at) WHERE (status = 'running'::public.simulation_active_status);


--
-- Name: idx_simulation_active_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_template ON public.simulation_active USING btree (template_id);


--
-- Name: idx_simulation_active_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_tenant ON public.simulation_active USING btree (tenant_id);


--
-- Name: idx_simulation_active_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_active_tenant_status ON public.simulation_active USING btree (tenant_id, status);


--
-- Name: idx_simulation_history_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_history_archived ON public.simulation_history USING btree (archived, completed_at DESC);


--
-- Name: idx_simulation_history_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_history_completed ON public.simulation_history USING btree (completed_at DESC);


--
-- Name: idx_simulation_history_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_history_created_by ON public.simulation_history USING btree (created_by);


--
-- Name: idx_simulation_history_instructor_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_history_instructor_name ON public.simulation_history USING btree (instructor_name);


--
-- Name: idx_simulation_history_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_history_template ON public.simulation_history USING btree (template_id);


--
-- Name: idx_simulation_participants_simulation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_participants_simulation_id ON public.simulation_participants USING btree (simulation_id);


--
-- Name: idx_simulation_participants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_participants_user_id ON public.simulation_participants USING btree (user_id);


--
-- Name: idx_simulation_participants_user_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_participants_user_role ON public.simulation_participants USING btree (user_id, role);


--
-- Name: idx_simulation_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_templates_created_by ON public.simulation_templates USING btree (created_by);


--
-- Name: idx_simulation_templates_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_templates_folder ON public.simulation_templates USING btree (folder);


--
-- Name: idx_simulation_templates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_templates_status ON public.simulation_templates USING btree (status);


--
-- Name: idx_simulation_templates_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_simulation_templates_tenant ON public.simulation_templates USING btree (tenant_id);


--
-- Name: idx_student_roster_cohort_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roster_cohort_id ON public.student_roster USING btree (cohort_id) WHERE (cohort_id IS NOT NULL);


--
-- Name: idx_student_roster_program_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roster_program_active ON public.student_roster USING btree (program_id, is_active) WHERE (is_active = true);


--
-- Name: idx_student_roster_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roster_program_id ON public.student_roster USING btree (program_id);


--
-- Name: idx_student_roster_student_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roster_student_number ON public.student_roster USING btree (student_number);


--
-- Name: idx_student_roster_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_roster_user_id ON public.student_roster USING btree (user_id);


--
-- Name: idx_system_logs_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_component ON public.system_logs USING btree (component, "timestamp" DESC);


--
-- Name: idx_system_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_level ON public.system_logs USING btree (log_level, "timestamp" DESC);


--
-- Name: idx_system_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_tenant_id ON public.system_logs USING btree (tenant_id, "timestamp" DESC);


--
-- Name: idx_system_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_timestamp ON public.system_logs USING btree ("timestamp" DESC);


--
-- Name: idx_system_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_type ON public.system_logs USING btree (log_type, "timestamp" DESC);


--
-- Name: idx_system_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id, "timestamp" DESC);


--
-- Name: idx_template_versions_saved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_versions_saved_at ON public.simulation_template_versions USING btree (saved_at DESC);


--
-- Name: idx_template_versions_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_versions_template ON public.simulation_template_versions USING btree (template_id, version DESC);


--
-- Name: idx_tenant_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_active ON public.tenant_users USING btree (is_active);


--
-- Name: idx_tenant_users_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users USING btree (tenant_id);


--
-- Name: idx_tenant_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_user_id ON public.tenant_users USING btree (user_id);


--
-- Name: idx_tenant_users_user_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_user_tenant ON public.tenant_users USING btree (user_id, tenant_id);


--
-- Name: idx_tenant_users_user_tenant_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_users_user_tenant_active ON public.tenant_users USING btree (user_id, tenant_id, is_active) WHERE (is_active = true);


--
-- Name: idx_tenants_admin_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_admin_user_id ON public.tenants USING btree (admin_user_id);


--
-- Name: idx_tenants_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_id ON public.tenants USING btree (id);


--
-- Name: idx_tenants_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_program_id ON public.tenants USING btree (program_id);


--
-- Name: idx_tenants_simulation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_simulation ON public.tenants USING btree (is_simulation) WHERE (is_simulation = true);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);


--
-- Name: idx_tenants_subdomain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_subdomain ON public.tenants USING btree (subdomain);


--
-- Name: idx_tenants_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_type ON public.tenants USING btree (tenant_type);


--
-- Name: idx_user_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_active ON public.user_profiles USING btree (is_active);


--
-- Name: idx_user_profiles_default_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_default_tenant_id ON public.user_profiles USING btree (default_tenant_id);


--
-- Name: idx_user_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);


--
-- Name: idx_user_profiles_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_id ON public.user_profiles USING btree (id);


--
-- Name: INDEX idx_user_profiles_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_user_profiles_id IS 'Speeds up user profile lookups during authentication';


--
-- Name: idx_user_profiles_id_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_id_role ON public.user_profiles USING btree (id, role);


--
-- Name: idx_user_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);


--
-- Name: idx_user_profiles_role_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_role_active ON public.user_profiles USING btree (role, is_active);


--
-- Name: idx_user_profiles_simulation_only; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_simulation_only ON public.user_profiles USING btree (simulation_only) WHERE (simulation_only = true);


--
-- Name: idx_user_profiles_super_admin_check; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_super_admin_check ON public.user_profiles USING btree (id) WHERE ((role = 'super_admin'::public.user_role) AND (is_active = true));


--
-- Name: idx_user_programs_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_programs_program_id ON public.user_programs USING btree (program_id);


--
-- Name: idx_user_programs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_programs_user_id ON public.user_programs USING btree (user_id);


--
-- Name: idx_user_sessions_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions USING btree (last_activity);


--
-- Name: idx_user_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_status ON public.user_sessions USING btree (status);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_user_tenant_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tenant_active ON public.tenant_users USING btree (user_id, is_active) WHERE (is_active = true);


--
-- Name: INDEX idx_user_tenant_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_user_tenant_active IS 'Optimizes tenant assignment queries for active users';


--
-- Name: idx_user_tenant_cache_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tenant_cache_tenant_id ON public.user_tenant_cache USING btree (tenant_id);


--
-- Name: idx_user_tenant_cache_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_tenant_cache_user ON public.user_tenant_cache USING btree (user_id);


--
-- Name: idx_user_tenant_cache_user_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_tenant_cache_user_tenant ON public.user_tenant_cache USING btree (user_id, tenant_id);


--
-- Name: INDEX idx_user_tenant_cache_user_tenant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_user_tenant_cache_user_tenant IS 'Allows users (especially super admins) to be cached for multiple tenants';


--
-- Name: idx_wound_assessments_assessed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_assessed_at ON public.wound_assessments USING btree (assessed_at DESC);


--
-- Name: idx_wound_assessments_assessment_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_assessment_data ON public.wound_assessments USING gin (assessment_data);


--
-- Name: idx_wound_assessments_assessment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_assessment_date ON public.wound_assessments USING btree (assessment_date);


--
-- Name: idx_wound_assessments_assessor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_assessor_id ON public.wound_assessments USING btree (assessor_id);


--
-- Name: idx_wound_assessments_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_device_id ON public.wound_assessments USING btree (device_id);


--
-- Name: idx_wound_assessments_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_device_type ON public.wound_assessments USING btree (device_type) WHERE (device_type IS NOT NULL);


--
-- Name: idx_wound_assessments_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_patient_id ON public.wound_assessments USING btree (patient_id);


--
-- Name: idx_wound_assessments_student_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_student_name ON public.wound_assessments USING btree (student_name);


--
-- Name: idx_wound_assessments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_tenant_id ON public.wound_assessments USING btree (tenant_id);


--
-- Name: idx_wound_assessments_wound_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_assessments_wound_id ON public.wound_assessments USING btree (wound_id);


--
-- Name: idx_wound_treatments_administered_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_treatments_administered_by_id ON public.wound_treatments USING btree (administered_by_id);


--
-- Name: idx_wound_treatments_assessment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_treatments_assessment_id ON public.wound_treatments USING btree (wound_assessment_id);


--
-- Name: idx_wound_treatments_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_treatments_patient_id ON public.wound_treatments USING btree (patient_id);


--
-- Name: idx_wound_treatments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_treatments_tenant_id ON public.wound_treatments USING btree (tenant_id);


--
-- Name: idx_wound_treatments_treatment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wound_treatments_treatment_date ON public.wound_treatments USING btree (treatment_date);


--
-- Name: idx_wounds_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wounds_location ON public.wounds USING btree (location_id);


--
-- Name: idx_wounds_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wounds_patient ON public.wounds USING btree (patient_id);


--
-- Name: idx_wounds_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wounds_tenant ON public.wounds USING btree (tenant_id);


--
-- Name: patient_notes_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_notes_patient_id_idx ON public.patient_notes USING btree (patient_id);


--
-- Name: patient_notes_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_notes_tenant_id_idx ON public.patient_notes USING btree (tenant_id);


--
-- Name: patient_wounds_patient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX patient_wounds_patient_id_idx ON public.patient_wounds USING btree (patient_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_17_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_17_inserted_at_topic_idx ON realtime.messages_2025_07_17 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_18_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_18_inserted_at_topic_idx ON realtime.messages_2025_07_18 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_19_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_19_inserted_at_topic_idx ON realtime.messages_2025_07_19 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_20_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_20_inserted_at_topic_idx ON realtime.messages_2025_07_20 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_21_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_21_inserted_at_topic_idx ON realtime.messages_2025_07_21 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_22_inserted_at_topic_idx ON realtime.messages_2025_07_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_07_23_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_07_23_inserted_at_topic_idx ON realtime.messages_2025_07_23 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_06_inserted_at_topic_idx ON realtime.messages_2026_04_06 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_07_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_07_inserted_at_topic_idx ON realtime.messages_2026_04_07 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_08_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_08_inserted_at_topic_idx ON realtime.messages_2026_04_08 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_09_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_09_inserted_at_topic_idx ON realtime.messages_2026_04_09 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_04_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2026_04_10_inserted_at_topic_idx ON realtime.messages_2026_04_10 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2025_07_17_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_17_inserted_at_topic_idx;


--
-- Name: messages_2025_07_17_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_17_pkey;


--
-- Name: messages_2025_07_18_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_18_inserted_at_topic_idx;


--
-- Name: messages_2025_07_18_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_18_pkey;


--
-- Name: messages_2025_07_19_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_19_inserted_at_topic_idx;


--
-- Name: messages_2025_07_19_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_19_pkey;


--
-- Name: messages_2025_07_20_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_20_inserted_at_topic_idx;


--
-- Name: messages_2025_07_20_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_20_pkey;


--
-- Name: messages_2025_07_21_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_21_inserted_at_topic_idx;


--
-- Name: messages_2025_07_21_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_21_pkey;


--
-- Name: messages_2025_07_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_22_inserted_at_topic_idx;


--
-- Name: messages_2025_07_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_22_pkey;


--
-- Name: messages_2025_07_23_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_07_23_inserted_at_topic_idx;


--
-- Name: messages_2025_07_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_23_pkey;


--
-- Name: messages_2026_04_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_06_inserted_at_topic_idx;


--
-- Name: messages_2026_04_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_06_pkey;


--
-- Name: messages_2026_04_07_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_07_inserted_at_topic_idx;


--
-- Name: messages_2026_04_07_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_07_pkey;


--
-- Name: messages_2026_04_08_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_08_inserted_at_topic_idx;


--
-- Name: messages_2026_04_08_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_08_pkey;


--
-- Name: messages_2026_04_09_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_09_inserted_at_topic_idx;


--
-- Name: messages_2026_04_09_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_09_pkey;


--
-- Name: messages_2026_04_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_10_inserted_at_topic_idx;


--
-- Name: messages_2026_04_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_10_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();


--
-- Name: programs after_program_insert_create_tenant; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_program_insert_create_tenant AFTER INSERT ON public.programs FOR EACH ROW EXECUTE FUNCTION public.trigger_create_program_tenant();


--
-- Name: avatar_locations avatar_locations_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER avatar_locations_set_tenant_id BEFORE INSERT ON public.avatar_locations FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: devices devices_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER devices_set_tenant_id BEFORE INSERT ON public.devices FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: devices devices_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER devices_set_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lab_orders lab_orders_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lab_orders_set_tenant_id BEFORE INSERT ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: lab_orders lab_orders_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lab_orders_set_updated_at BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: medication_administrations medication_admin_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER medication_admin_set_tenant_id BEFORE INSERT ON public.medication_administrations FOR EACH ROW EXECUTE FUNCTION public.set_medication_admin_tenant_id();


--
-- Name: medication_administrations medication_administrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER medication_administrations_updated_at BEFORE UPDATE ON public.medication_administrations FOR EACH ROW EXECUTE FUNCTION public.update_medication_administrations_updated_at();


--
-- Name: patient_alerts patient_alerts_tenant_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER patient_alerts_tenant_trigger BEFORE INSERT OR UPDATE ON public.patient_alerts FOR EACH ROW EXECUTE FUNCTION public.set_alert_tenant_id();


--
-- Name: patient_medications prevent_medication_id_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_medication_id_changes BEFORE UPDATE ON public.patient_medications FOR EACH ROW EXECUTE FUNCTION public.protect_medication_identifiers();


--
-- Name: patients prevent_patient_id_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_patient_id_changes BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.protect_patient_identifiers();


--
-- Name: program_announcements program_announcements_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER program_announcements_updated_at_trigger BEFORE UPDATE ON public.program_announcements FOR EACH ROW EXECUTE FUNCTION public.update_program_announcements_updated_at();


--
-- Name: programs programs_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER programs_updated_at_trigger BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_programs_updated_at();


--
-- Name: user_profiles protect_super_admin_role_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_super_admin_role_trigger BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();


--
-- Name: scheduled_simulations scheduled_simulations_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER scheduled_simulations_updated_at_trigger BEFORE UPDATE ON public.scheduled_simulations FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_simulations_updated_at();


--
-- Name: patient_notes set_patient_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_patient_notes_updated_at BEFORE UPDATE ON public.patient_notes FOR EACH ROW EXECUTE FUNCTION public.update_patient_notes_updated_at();


--
-- Name: bowel_records set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.bowel_records FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: diabetic_records set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.diabetic_records FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: medication_administrations set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.medication_administrations FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_admission_records set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_admission_records FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_advanced_directives set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_advanced_directives FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_alerts set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_alerts FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_medications set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_medications FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_notes set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_notes FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patient_vitals set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patient_vitals FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: patients set_tenant_id_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_id_before_insert BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: tenant_users set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_roster student_roster_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER student_roster_updated_at_trigger BEFORE UPDATE ON public.student_roster FOR EACH ROW EXECUTE FUNCTION public.update_student_roster_updated_at();


--
-- Name: tenant_users tenant_users_cache_refresh; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_users_cache_refresh AFTER INSERT OR DELETE OR UPDATE ON public.tenant_users FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_user_tenant_cache();


--
-- Name: simulation_active trigger_auto_tag_simulation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_tag_simulation BEFORE INSERT ON public.simulation_active FOR EACH ROW EXECUTE FUNCTION public.auto_tag_simulation_from_template();


--
-- Name: backup_metadata trigger_backup_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_backup_metadata_updated_at BEFORE UPDATE ON public.backup_metadata FOR EACH ROW EXECUTE FUNCTION public.update_backup_metadata_updated_at();


--
-- Name: wound_assessments trigger_set_wound_assessment_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_wound_assessment_tenant_id BEFORE INSERT ON public.wound_assessments FOR EACH ROW EXECUTE FUNCTION public.set_wound_assessment_tenant_id();


--
-- Name: wound_treatments trigger_set_wound_treatment_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_wound_treatment_tenant_id BEFORE INSERT ON public.wound_treatments FOR EACH ROW EXECUTE FUNCTION public.set_wound_treatment_tenant_id();


--
-- Name: patient_intake_output_events trigger_update_patient_intake_output_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_patient_intake_output_events_updated_at BEFORE UPDATE ON public.patient_intake_output_events FOR EACH ROW EXECUTE FUNCTION public.update_patient_intake_output_events_updated_at();


--
-- Name: wound_assessments trigger_wound_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_wound_assessments_updated_at BEFORE UPDATE ON public.wound_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wound_treatments trigger_wound_treatments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_wound_treatments_updated_at BEFORE UPDATE ON public.wound_treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contact_submissions update_contact_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contact_submissions_updated_at BEFORE UPDATE ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION public.update_contact_submissions_updated_at();


--
-- Name: device_assessments update_device_assessments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_device_assessments_updated_at BEFORE UPDATE ON public.device_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: handover_notes update_handover_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_handover_notes_updated_at BEFORE UPDATE ON public.handover_notes FOR EACH ROW EXECUTE FUNCTION public.update_handover_notes_updated_at();


--
-- Name: lab_panels update_lab_panels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lab_panels_updated_at BEFORE UPDATE ON public.lab_panels FOR EACH ROW EXECUTE FUNCTION public.update_lab_updated_at();


--
-- Name: lab_result_refs update_lab_result_refs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lab_result_refs_updated_at BEFORE UPDATE ON public.lab_result_refs FOR EACH ROW EXECUTE FUNCTION public.update_lab_updated_at();


--
-- Name: lab_results update_lab_results_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_lab_updated_at();


--
-- Name: lab_results update_panel_status_on_result_ack; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_panel_status_on_result_ack AFTER UPDATE OF ack_at ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_lab_panel_status();


--
-- Name: wounds wounds_set_tenant_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wounds_set_tenant_id BEFORE INSERT ON public.wounds FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();


--
-- Name: wounds wounds_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wounds_set_updated_at BEFORE UPDATE ON public.wounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: avatar_locations avatar_locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_locations
    ADD CONSTRAINT avatar_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: avatar_locations avatar_locations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_locations
    ADD CONSTRAINT avatar_locations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: avatar_locations avatar_locations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_locations
    ADD CONSTRAINT avatar_locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: backup_audit_log backup_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_audit_log
    ADD CONSTRAINT backup_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: backup_files backup_files_backup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_files
    ADD CONSTRAINT backup_files_backup_id_fkey FOREIGN KEY (backup_id) REFERENCES public.backup_metadata(id) ON DELETE CASCADE;


--
-- Name: backup_metadata backup_metadata_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata
    ADD CONSTRAINT backup_metadata_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: device_assessments device_assessments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_assessments
    ADD CONSTRAINT device_assessments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: device_assessments device_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_assessments
    ADD CONSTRAINT device_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: devices devices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: devices devices_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.avatar_locations(id) ON DELETE CASCADE;


--
-- Name: devices devices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: devices devices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: diabetic_records diabetic_records_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diabetic_records
    ADD CONSTRAINT diabetic_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.user_profiles(id);


--
-- Name: diabetic_records diabetic_records_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diabetic_records
    ADD CONSTRAINT diabetic_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: doctors_orders doctors_orders_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.user_profiles(id);


--
-- Name: doctors_orders doctors_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- Name: doctors_orders doctors_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: doctors_orders doctors_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: doctors_orders doctors_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors_orders
    ADD CONSTRAINT doctors_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.user_profiles(id);


--
-- Name: user_sessions fk_user_sessions_tenant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT fk_user_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: handover_notes handover_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_notes
    ADD CONSTRAINT handover_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: lab_ack_events lab_ack_events_ack_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ack_events
    ADD CONSTRAINT lab_ack_events_ack_by_fkey FOREIGN KEY (ack_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT lab_ack_events_ack_by_fkey ON lab_ack_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT lab_ack_events_ack_by_fkey ON public.lab_ack_events IS 'Foreign key to user_profiles for Supabase joins';


--
-- Name: lab_ack_events lab_ack_events_panel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ack_events
    ADD CONSTRAINT lab_ack_events_panel_id_fkey FOREIGN KEY (panel_id) REFERENCES public.lab_panels(id) ON DELETE CASCADE;


--
-- Name: lab_ack_events lab_ack_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_ack_events
    ADD CONSTRAINT lab_ack_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lab_orders lab_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: lab_orders lab_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: lab_orders lab_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lab_orders lab_orders_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_orders
    ADD CONSTRAINT lab_orders_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: lab_panels lab_panels_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_panels
    ADD CONSTRAINT lab_panels_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT lab_panels_entered_by_fkey ON lab_panels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT lab_panels_entered_by_fkey ON public.lab_panels IS 'Foreign key to user_profiles for Supabase joins';


--
-- Name: lab_panels lab_panels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_panels
    ADD CONSTRAINT lab_panels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_ack_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_ack_by_fkey FOREIGN KEY (ack_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT lab_results_ack_by_fkey ON lab_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT lab_results_ack_by_fkey ON public.lab_results IS 'Foreign key to user_profiles for Supabase joins';


--
-- Name: lab_results lab_results_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: CONSTRAINT lab_results_entered_by_fkey ON lab_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT lab_results_entered_by_fkey ON public.lab_results IS 'Foreign key to user_profiles for Supabase joins';


--
-- Name: lab_results lab_results_panel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_panel_id_fkey FOREIGN KEY (panel_id) REFERENCES public.lab_panels(id) ON DELETE CASCADE;


--
-- Name: lab_results lab_results_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: medication_administrations medication_administrations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_administrations
    ADD CONSTRAINT medication_administrations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: multi_tenant_admins multi_tenant_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_tenant_admins
    ADD CONSTRAINT multi_tenant_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: patient_alerts patient_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_alerts
    ADD CONSTRAINT patient_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: patient_alerts patient_alerts_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_alerts
    ADD CONSTRAINT patient_alerts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_alerts patient_alerts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_alerts
    ADD CONSTRAINT patient_alerts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: patient_bbit_entries patient_bbit_entries_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_bbit_entries
    ADD CONSTRAINT patient_bbit_entries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_images patient_images_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: patient_images patient_images_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_images
    ADD CONSTRAINT patient_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.user_profiles(id);


--
-- Name: patient_intake_output_events patient_intake_output_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_intake_output_events
    ADD CONSTRAINT patient_intake_output_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id);


--
-- Name: patient_intake_output_events patient_intake_output_events_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_intake_output_events
    ADD CONSTRAINT patient_intake_output_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_intake_output_events patient_intake_output_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_intake_output_events
    ADD CONSTRAINT patient_intake_output_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patient_medications patient_medications_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_medications_templates patient_medications_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_medications_templates
    ADD CONSTRAINT patient_medications_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: patient_medications patient_medications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_medications
    ADD CONSTRAINT patient_medications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: patient_neuro_assessments patient_neuro_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_neuro_assessments
    ADD CONSTRAINT patient_neuro_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_newborn_assessments patient_newborn_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_newborn_assessments
    ADD CONSTRAINT patient_newborn_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: patient_notes patient_notes_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_notes patient_notes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_notes
    ADD CONSTRAINT patient_notes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: patient_vitals patient_vitals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_vitals_templates patient_vitals_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals_templates
    ADD CONSTRAINT patient_vitals_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: patient_vitals patient_vitals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_vitals
    ADD CONSTRAINT patient_vitals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: patient_wounds patient_wounds_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_wounds
    ADD CONSTRAINT patient_wounds_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patients patients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: program_announcements program_announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: program_announcements program_announcements_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_announcements
    ADD CONSTRAINT program_announcements_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: programs programs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: programs programs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: scheduled_simulations scheduled_simulations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: scheduled_simulations scheduled_simulations_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id);


--
-- Name: scheduled_simulations scheduled_simulations_launched_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_launched_simulation_id_fkey FOREIGN KEY (launched_simulation_id) REFERENCES public.simulation_active(id);


--
-- Name: scheduled_simulations scheduled_simulations_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: scheduled_simulations scheduled_simulations_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_simulations
    ADD CONSTRAINT scheduled_simulations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.simulation_templates(id) ON DELETE CASCADE;


--
-- Name: simulation_active simulation_active_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_active
    ADD CONSTRAINT simulation_active_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: simulation_active simulation_active_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_active
    ADD CONSTRAINT simulation_active_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.simulation_templates(id) ON DELETE RESTRICT;


--
-- Name: simulation_active simulation_active_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_active
    ADD CONSTRAINT simulation_active_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: simulation_activity_log simulation_activity_log_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_activity_log
    ADD CONSTRAINT simulation_activity_log_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_active(id) ON DELETE CASCADE;


--
-- Name: simulation_activity_log simulation_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_activity_log
    ADD CONSTRAINT simulation_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: simulation_history simulation_history_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_history
    ADD CONSTRAINT simulation_history_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.user_profiles(id);


--
-- Name: simulation_history simulation_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_history
    ADD CONSTRAINT simulation_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: simulation_history simulation_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_history
    ADD CONSTRAINT simulation_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.simulation_templates(id) ON DELETE CASCADE;


--
-- Name: simulation_participants simulation_participants_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_participants
    ADD CONSTRAINT simulation_participants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id);


--
-- Name: simulation_participants simulation_participants_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_participants
    ADD CONSTRAINT simulation_participants_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_active(id) ON DELETE CASCADE;


--
-- Name: simulation_participants simulation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_participants
    ADD CONSTRAINT simulation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: simulation_template_versions simulation_template_versions_saved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_template_versions
    ADD CONSTRAINT simulation_template_versions_saved_by_fkey FOREIGN KEY (saved_by) REFERENCES auth.users(id);


--
-- Name: simulation_template_versions simulation_template_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_template_versions
    ADD CONSTRAINT simulation_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.simulation_templates(id) ON DELETE CASCADE;


--
-- Name: simulation_templates simulation_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_templates
    ADD CONSTRAINT simulation_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: simulation_templates simulation_templates_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_templates
    ADD CONSTRAINT simulation_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: student_roster student_roster_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: student_roster student_roster_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: student_roster student_roster_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_roster
    ADD CONSTRAINT student_roster_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: system_logs system_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: system_logs system_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tenant_users tenant_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_users tenant_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_users
    ADD CONSTRAINT tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: tenants tenants_parent_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_parent_tenant_id_fkey FOREIGN KEY (parent_tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenants tenants_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_default_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_default_tenant_id_fkey FOREIGN KEY (default_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_programs user_programs_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: user_programs user_programs_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: user_programs user_programs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_programs
    ADD CONSTRAINT user_programs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wound_assessments wound_assessments_assessor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_assessor_id_fkey FOREIGN KEY (assessor_id) REFERENCES auth.users(id);


--
-- Name: wound_assessments wound_assessments_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE;


--
-- Name: wound_assessments wound_assessments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: wound_assessments wound_assessments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: wound_assessments wound_assessments_wound_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_assessments
    ADD CONSTRAINT wound_assessments_wound_id_fkey FOREIGN KEY (wound_id) REFERENCES public.wounds(id) ON DELETE CASCADE;


--
-- Name: wound_treatments wound_treatments_administered_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_treatments
    ADD CONSTRAINT wound_treatments_administered_by_id_fkey FOREIGN KEY (administered_by_id) REFERENCES auth.users(id);


--
-- Name: wound_treatments wound_treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_treatments
    ADD CONSTRAINT wound_treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: wound_treatments wound_treatments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wound_treatments
    ADD CONSTRAINT wound_treatments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: wounds wounds_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: wounds wounds_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.avatar_locations(id) ON DELETE CASCADE;


--
-- Name: wounds wounds_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: wounds wounds_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wounds
    ADD CONSTRAINT wounds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants Allow public read access to tenant branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to tenant branding" ON public.tenants FOR SELECT USING (true);


--
-- Name: contact_submissions Anyone can submit contact form; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT TO anon, authenticated WITH CHECK (true);


--
-- Name: wound_assessments Authenticated users can delete wound assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete wound assessments" ON public.wound_assessments FOR DELETE USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: audit_logs Authenticated users can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: wound_assessments Authenticated users can insert wound assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert wound assessments" ON public.wound_assessments FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: wound_assessments Authenticated users can update wound assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update wound assessments" ON public.wound_assessments FOR UPDATE USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: wound_assessments Authenticated users can view wound assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view wound assessments" ON public.wound_assessments FOR SELECT USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: diabetic_records Authorized users can delete diabetic records within tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can delete diabetic records within tenant" ON public.diabetic_records FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'nurse'::public.user_role])) AND (diabetic_records.tenant_id = diabetic_records.tenant_id)))));


--
-- Name: multi_tenant_admins Multi-tenant admins can manage multi_tenant_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Multi-tenant admins can manage multi_tenant_admins" ON public.multi_tenant_admins USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))) OR (user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))));


--
-- Name: contact_submissions Super admins can update contact submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can update contact submissions" ON public.contact_submissions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: contact_submissions Super admins can view contact submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can view contact submissions" ON public.contact_submissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: wound_treatments Tenant isolation for wound treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant isolation for wound treatments" ON public.wound_treatments USING ((tenant_id = ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (tenant_users.is_active = true)))));


--
-- Name: handover_notes Users can create handover notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create handover notes" ON public.handover_notes FOR INSERT WITH CHECK ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: patient_admission_records Users can delete admission records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete admission records for their tenant" ON public.patient_admission_records FOR DELETE USING ((tenant_id = ( SELECT patient_admission_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_advanced_directives Users can delete advanced directives for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete advanced directives for their tenant" ON public.patient_advanced_directives FOR DELETE USING ((tenant_id = ( SELECT patient_advanced_directives.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: bowel_records Users can delete bowel records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete bowel records for their tenant" ON public.bowel_records FOR DELETE USING ((tenant_id = ( SELECT bowel_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_notes Users can delete notes for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete notes for their tenant" ON public.patient_notes FOR DELETE USING ((tenant_id = ( SELECT patient_notes.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: handover_notes Users can delete their own new handover notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own new handover notes" ON public.handover_notes FOR DELETE USING ((((( SELECT ( SELECT auth.uid() AS uid) AS uid))::text = (created_by)::text) AND (created_at > (now() - '01:00:00'::interval))));


--
-- Name: patient_admission_records Users can insert admission records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert admission records for their tenant" ON public.patient_admission_records FOR INSERT WITH CHECK ((tenant_id = ( SELECT patient_admission_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_advanced_directives Users can insert advanced directives for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert advanced directives for their tenant" ON public.patient_advanced_directives FOR INSERT WITH CHECK ((tenant_id = ( SELECT patient_advanced_directives.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: bowel_records Users can insert bowel records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert bowel records for their tenant" ON public.bowel_records FOR INSERT WITH CHECK ((tenant_id = ( SELECT bowel_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: diabetic_records Users can insert diabetic records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert diabetic records for their tenant" ON public.diabetic_records FOR INSERT WITH CHECK ((tenant_id IN ( SELECT diabetic_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_notes Users can insert notes for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert notes for their tenant" ON public.patient_notes FOR INSERT WITH CHECK ((tenant_id = ( SELECT patient_notes.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_admission_records Users can update admission records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update admission records for their tenant" ON public.patient_admission_records FOR UPDATE USING ((tenant_id = ( SELECT patient_admission_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_advanced_directives Users can update advanced directives for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update advanced directives for their tenant" ON public.patient_advanced_directives FOR UPDATE USING ((tenant_id = ( SELECT patient_advanced_directives.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: bowel_records Users can update bowel records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update bowel records for their tenant" ON public.bowel_records FOR UPDATE USING ((tenant_id = ( SELECT bowel_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_notes Users can update notes for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update notes for their tenant" ON public.patient_notes FOR UPDATE USING ((tenant_id = ( SELECT patient_notes.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: diabetic_records Users can update their own diabetic records within tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own diabetic records within tenant" ON public.diabetic_records FOR UPDATE USING (((recorded_by = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)) AND (tenant_id IN ( SELECT diabetic_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))))));


--
-- Name: patient_admission_records Users can view admission records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view admission records for their tenant" ON public.patient_admission_records FOR SELECT USING ((tenant_id = ( SELECT patient_admission_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: patient_advanced_directives Users can view advanced directives for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view advanced directives for their tenant" ON public.patient_advanced_directives FOR SELECT USING ((tenant_id = ( SELECT patient_advanced_directives.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: bowel_records Users can view bowel records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bowel records for their tenant" ON public.bowel_records FOR SELECT USING ((tenant_id = ( SELECT bowel_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: diabetic_records Users can view diabetic records for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view diabetic records for their tenant" ON public.diabetic_records FOR SELECT USING ((tenant_id IN ( SELECT diabetic_records.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: handover_notes Users can view handover notes for accessible patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view handover notes for accessible patients" ON public.handover_notes FOR SELECT USING ((( SELECT ( SELECT auth.role() AS role) AS role) = 'authenticated'::text));


--
-- Name: patient_notes Users can view notes for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notes for their tenant" ON public.patient_notes FOR SELECT USING ((tenant_id = ( SELECT patient_notes.tenant_id
   FROM public.user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));


--
-- Name: simulation_active active_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY active_delete_policy ON public.simulation_active FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_active.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_active.primary_categories)))))))));


--
-- Name: POLICY active_delete_policy ON simulation_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY active_delete_policy ON public.simulation_active IS 'Instructors can delete simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';


--
-- Name: simulation_active active_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY active_insert_policy ON public.simulation_active FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: POLICY active_insert_policy ON simulation_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY active_insert_policy ON public.simulation_active IS 'Super admins, coordinators, admins, and instructors can create simulations. Categories are validated by application logic.';


--
-- Name: simulation_active active_select_instructor_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY active_select_instructor_programs ON public.simulation_active FOR SELECT TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_active.tenant_id) AND (tu.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.simulation_participants sp
  WHERE ((sp.simulation_id = simulation_active.id) AND (sp.user_id = ( SELECT auth.uid() AS uid))))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_active.primary_categories)))))))));


--
-- Name: POLICY active_select_instructor_programs ON simulation_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY active_select_instructor_programs ON public.simulation_active IS 'Instructors see active simulations tagged with their assigned program codes. Super admins, coordinators, creators, and participants see relevant sims.';


--
-- Name: simulation_active active_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY active_update_policy ON public.simulation_active FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_active.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_active.primary_categories))))))))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role]))))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_active.primary_categories)))))))));


--
-- Name: POLICY active_update_policy ON simulation_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY active_update_policy ON public.simulation_active IS 'Instructors can update (start/stop/pause) simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';


--
-- Name: simulation_activity_log activity_log_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_log_delete_policy ON public.simulation_activity_log FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))));


--
-- Name: simulation_activity_log activity_log_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_log_insert_policy ON public.simulation_activity_log FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: simulation_activity_log activity_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_log_select_policy ON public.simulation_activity_log FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (simulation_id IN ( SELECT simulation_participants.simulation_id
   FROM public.simulation_participants
  WHERE (simulation_participants.user_id = ( SELECT auth.uid() AS uid)))) OR (simulation_id IN ( SELECT simulation_active.id
   FROM public.simulation_active
  WHERE (simulation_active.created_by = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_consolidated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_logs_consolidated_select ON public.audit_logs FOR SELECT USING ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: avatar_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatar_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_audit_log backup_audit_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_audit_insert_authenticated ON public.backup_audit_log FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: backup_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_audit_log backup_audit_super_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_audit_super_admin_select ON public.backup_audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: backup_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_files ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_files backup_files_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_files_super_admin_all ON public.backup_files USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: backup_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_metadata backup_metadata_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_metadata_super_admin_all ON public.backup_metadata USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: patient_bbit_entries bbit_entries_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bbit_entries_tenant_isolation ON public.patient_bbit_entries TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: bowel_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bowel_records ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_table_config config_modify_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_modify_policy ON public.simulation_table_config USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))));


--
-- Name: contact_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: device_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: device_assessments device_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY device_assessments_tenant_isolation ON public.device_assessments TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

--
-- Name: diabetic_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diabetic_records ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctors_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors_orders doctors_orders_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctors_orders_access ON public.doctors_orders USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = doctors_orders.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = doctors_orders.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: avatar_locations hacmap_avatar_locations_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hacmap_avatar_locations_access ON public.avatar_locations USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = avatar_locations.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = avatar_locations.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: devices hacmap_devices_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hacmap_devices_access ON public.devices USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = devices.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = devices.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: wounds hacmap_wounds_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hacmap_wounds_access ON public.wounds USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = wounds.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = wounds.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: handover_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.handover_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: handover_notes handover_notes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY handover_notes_update ON public.handover_notes FOR UPDATE TO authenticated USING (((patient_id IN ( SELECT p.id
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((patient_id IN ( SELECT p.id
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: simulation_history history_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY history_insert_policy ON public.simulation_history FOR INSERT WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))));


--
-- Name: simulation_history history_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY history_select_policy ON public.simulation_history FOR SELECT USING (((created_by = ( SELECT auth.uid() AS uid)) OR (participants @> jsonb_build_array(jsonb_build_object('user_id', (( SELECT auth.uid() AS uid))::text))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))));


--
-- Name: simulation_history history_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY history_update_policy ON public.simulation_history FOR UPDATE USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role])))))));


--
-- Name: patient_intake_output_events intake_output_events_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intake_output_events_tenant_isolation ON public.patient_intake_output_events TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: lab_ack_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_ack_events ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_ack_events lab_ack_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_ack_events_insert ON public.lab_ack_events FOR INSERT TO authenticated WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (ack_by = ( SELECT auth.uid() AS uid))));


--
-- Name: lab_ack_events lab_ack_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_ack_events_select ON public.lab_ack_events FOR SELECT TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: lab_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_orders lab_orders_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_orders_access ON public.lab_orders USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = lab_orders.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = lab_orders.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: lab_panels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_panels lab_panels_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_panels_delete ON public.lab_panels FOR DELETE TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: lab_panels lab_panels_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_panels_insert ON public.lab_panels FOR INSERT TO authenticated WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: POLICY lab_panels_insert ON lab_panels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY lab_panels_insert ON public.lab_panels IS 'Super admins bypass tenant check, regular admins must be in tenant cache';


--
-- Name: lab_panels lab_panels_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_panels_select ON public.lab_panels FOR SELECT TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: lab_panels lab_panels_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_panels_update ON public.lab_panels FOR UPDATE TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: lab_result_refs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_result_refs ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_result_refs lab_result_refs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_result_refs_delete ON public.lab_result_refs FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: lab_result_refs lab_result_refs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_result_refs_insert ON public.lab_result_refs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: lab_result_refs lab_result_refs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_result_refs_select ON public.lab_result_refs FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) IS NOT NULL));


--
-- Name: lab_result_refs lab_result_refs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_result_refs_update ON public.lab_result_refs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))));


--
-- Name: lab_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

--
-- Name: lab_results lab_results_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_results_delete ON public.lab_results FOR DELETE TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: lab_results lab_results_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_results_insert ON public.lab_results FOR INSERT TO authenticated WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: POLICY lab_results_insert ON lab_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY lab_results_insert ON public.lab_results IS 'Super admins bypass tenant check, regular admins must be in tenant cache';


--
-- Name: lab_results lab_results_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_results_select ON public.lab_results FOR SELECT TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: lab_results lab_results_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lab_results_update ON public.lab_results FOR UPDATE TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) AND ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role]))))) OR ((ack_by = ( SELECT auth.uid() AS uid)) AND (ack_at IS NOT NULL)))));


--
-- Name: medication_administrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

--
-- Name: medication_administrations medication_administrations_secure_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_administrations_secure_access ON public.medication_administrations USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (patient_id IN ( SELECT (p.id)::text AS id
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((p.tenant_id = tu.tenant_id)))
  WHERE ((tu.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (tu.is_active = true))))));


--
-- Name: multi_tenant_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multi_tenant_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_neuro_assessments neuro_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY neuro_assessments_tenant_isolation ON public.patient_neuro_assessments TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: patient_newborn_assessments newborn_assessments_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY newborn_assessments_tenant_isolation ON public.patient_newborn_assessments TO authenticated USING (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: simulation_participants participants_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_delete_policy ON public.simulation_participants FOR DELETE USING (((granted_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role])))))));


--
-- Name: simulation_participants participants_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_insert_policy ON public.simulation_participants FOR INSERT WITH CHECK (((simulation_id IN ( SELECT simulation_active.id
   FROM public.simulation_active
  WHERE (simulation_active.created_by = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))));


--
-- Name: simulation_participants participants_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_select_policy ON public.simulation_participants FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))));


--
-- Name: POLICY participants_select_policy ON simulation_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY participants_select_policy ON public.simulation_participants IS 'Allow users to see their own participant records or admins/instructors to see all';


--
-- Name: simulation_participants participants_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_update_policy ON public.simulation_participants FOR UPDATE USING (((simulation_id IN ( SELECT simulation_active.id
   FROM public.simulation_active
  WHERE (simulation_active.created_by = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role])))))));


--
-- Name: patient_admission_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_admission_records ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_advanced_directives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_advanced_directives ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_alerts patient_alerts_consolidated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_alerts_consolidated_delete ON public.patient_alerts FOR DELETE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_alerts patient_alerts_consolidated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_alerts_consolidated_insert ON public.patient_alerts FOR INSERT WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_alerts patient_alerts_consolidated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_alerts_consolidated_select ON public.patient_alerts FOR SELECT USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_alerts patient_alerts_consolidated_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_alerts_consolidated_update ON public.patient_alerts FOR UPDATE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))))) WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_bbit_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_bbit_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_images ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_images patient_images_consolidated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_images_consolidated_delete ON public.patient_images FOR DELETE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_images patient_images_consolidated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_images_consolidated_insert ON public.patient_images FOR INSERT WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_images patient_images_consolidated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_images_consolidated_select ON public.patient_images FOR SELECT USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_images patient_images_consolidated_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_images_consolidated_update ON public.patient_images FOR UPDATE USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))))) WITH CHECK ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)))));


--
-- Name: patient_intake_output_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_intake_output_events ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_medications ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_medications patient_medications_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_medications_delete ON public.patient_medications FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patient_medications.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: patient_medications patient_medications_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_medications_insert ON public.patient_medications FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patient_medications.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: patient_medications patient_medications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_medications_select ON public.patient_medications FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patient_medications.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: patient_medications_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_medications_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_medications patient_medications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_medications_update ON public.patient_medications FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patient_medications.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: patient_neuro_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_neuro_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_newborn_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_newborn_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_vitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_vitals patient_vitals_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_vitals_delete ON public.patient_vitals FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((p.id = patient_vitals.patient_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true))))));


--
-- Name: patient_vitals patient_vitals_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_vitals_insert ON public.patient_vitals FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((p.id = patient_vitals.patient_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true))))));


--
-- Name: patient_vitals patient_vitals_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_vitals_select ON public.patient_vitals FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((p.id = patient_vitals.patient_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true))))));


--
-- Name: patient_vitals_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_vitals_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_vitals patient_vitals_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_vitals_update ON public.patient_vitals FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM (public.patients p
     JOIN public.tenant_users tu ON ((tu.tenant_id = p.tenant_id)))
  WHERE ((p.id = patient_vitals.patient_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true))))));


--
-- Name: patient_wounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_wounds ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_wounds patient_wounds_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_wounds_delete ON public.patient_wounds FOR DELETE TO authenticated USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (tenant_users.is_active = true)))))) AND (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = ANY (ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])))))));


--
-- Name: patient_wounds patient_wounds_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_wounds_select ON public.patient_wounds FOR SELECT TO authenticated USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (tenant_users.is_active = true)))))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: patient_wounds patient_wounds_tenant_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_wounds_tenant_insert ON public.patient_wounds FOR INSERT TO authenticated WITH CHECK ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))))));


--
-- Name: patient_wounds patient_wounds_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patient_wounds_update ON public.patient_wounds FOR UPDATE TO authenticated USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (tenant_users.is_active = true)))))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))))) WITH CHECK (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (tenant_users.is_active = true)))))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role))))));


--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: patients patients_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patients_tenant_isolation ON public.patients TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patients.tenant_id) AND (tenant_users.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role) AND (user_profiles.is_active = true)))) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.tenant_id = patients.tenant_id) AND (tenant_users.is_active = true))))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_consolidated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_consolidated_select ON public.profiles FOR SELECT USING ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: profiles profiles_consolidated_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_consolidated_update ON public.profiles FOR UPDATE USING ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))) WITH CHECK ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: program_announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: program_announcements program_announcements_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_announcements_delete ON public.program_announcements FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'instructor'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: program_announcements program_announcements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_announcements_insert ON public.program_announcements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'instructor'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: program_announcements program_announcements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_announcements_update ON public.program_announcements FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'instructor'::public.user_role, 'admin'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'instructor'::public.user_role, 'admin'::public.user_role]))))));


--
-- Name: program_announcements program_announcements_view_program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_announcements_view_program ON public.program_announcements FOR SELECT TO authenticated USING ((program_id IN ( SELECT p.id
   FROM public.programs p
  WHERE (p.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))))));


--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: programs programs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_delete ON public.programs FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: programs programs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_insert ON public.programs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: programs programs_super_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_super_admin_select ON public.programs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: programs programs_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_tenant_isolation ON public.programs FOR SELECT TO authenticated USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))));


--
-- Name: programs programs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_update ON public.programs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: scheduled_simulations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_simulations ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_simulations scheduled_simulations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_simulations_delete ON public.scheduled_simulations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: scheduled_simulations scheduled_simulations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_simulations_insert ON public.scheduled_simulations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: scheduled_simulations scheduled_simulations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_simulations_update ON public.scheduled_simulations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: scheduled_simulations scheduled_simulations_view_program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY scheduled_simulations_view_program ON public.scheduled_simulations FOR SELECT TO authenticated USING ((program_id IN ( SELECT p.id
   FROM public.programs p
  WHERE (p.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))))));


--
-- Name: simulation_active; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_active ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_history ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_history simulation_history_delete_instructor_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY simulation_history_delete_instructor_programs ON public.simulation_history FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_history.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_history.primary_categories)))))))));


--
-- Name: POLICY simulation_history_delete_instructor_programs ON simulation_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY simulation_history_delete_instructor_programs ON public.simulation_history IS 'Instructors can delete simulation history for their assigned programs. Super admins, coordinators, admins, and creators have full access.';


--
-- Name: simulation_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_table_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_table_config ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_template_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_template_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: simulation_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: student_roster; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_roster ENABLE ROW LEVEL SECURITY;

--
-- Name: student_roster student_roster_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_roster_delete ON public.student_roster FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: student_roster student_roster_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_roster_insert ON public.student_roster FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: student_roster student_roster_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_roster_update ON public.student_roster FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: student_roster student_roster_view_program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_roster_view_program ON public.student_roster FOR SELECT TO authenticated USING ((program_id IN ( SELECT p.id
   FROM public.programs p
  WHERE (p.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))))));


--
-- Name: system_logs super_admin_delete_system_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_delete_system_logs ON public.system_logs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: user_sessions super_admin_sessions_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_sessions_access ON public.user_sessions USING (
CASE
    WHEN public.current_user_is_super_admin() THEN true
    ELSE (user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))
END);


--
-- Name: system_logs super_admin_view_system_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_view_system_logs ON public.system_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))));


--
-- Name: system_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_logs system_logs_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_logs_insert_authenticated ON public.system_logs FOR INSERT TO authenticated WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: simulation_template_versions template_versions_tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY template_versions_tenant_isolation ON public.simulation_template_versions TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (public.simulation_templates st
     JOIN public.tenant_users tu ON ((tu.tenant_id = st.tenant_id)))
  WHERE ((st.id = simulation_template_versions.template_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM (public.simulation_templates st
     JOIN public.tenant_users tu ON ((tu.tenant_id = st.tenant_id)))
  WHERE ((st.id = simulation_template_versions.template_id) AND (tu.user_id = ( SELECT auth.uid() AS uid)) AND (tu.is_active = true))))));


--
-- Name: simulation_templates templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_delete ON public.simulation_templates FOR DELETE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_templates.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_templates.primary_categories)))))))));


--
-- Name: simulation_templates templates_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_insert_policy ON public.simulation_templates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'admin'::public.user_role, 'instructor'::public.user_role]))))));


--
-- Name: simulation_templates templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_select ON public.simulation_templates FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_templates.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_templates.primary_categories))))))) OR (status = 'ready'::public.simulation_template_status)));


--
-- Name: simulation_templates templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_update ON public.simulation_templates FOR UPDATE TO authenticated USING (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_templates.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_templates.primary_categories))))))))) WITH CHECK (((created_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))) OR (EXISTS ( SELECT 1
   FROM (public.user_profiles up
     JOIN public.tenant_users tu ON ((tu.user_id = up.id)))
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'admin'::public.user_role) AND (tu.tenant_id = simulation_templates.tenant_id) AND (tu.is_active = true)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'instructor'::public.user_role)))) AND ((primary_categories IS NULL) OR (primary_categories = '{}'::text[]) OR (EXISTS ( SELECT 1
   FROM (public.user_programs up_prog
     JOIN public.programs prog ON ((prog.id = up_prog.program_id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (prog.code = ANY (simulation_templates.primary_categories)))))))));


--
-- Name: tenant_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_users tenant_users_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_users_auth_delete ON public.tenant_users FOR DELETE USING ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: tenant_users tenant_users_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_users_auth_insert ON public.tenant_users FOR INSERT WITH CHECK ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: tenant_users tenant_users_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_users_auth_select ON public.tenant_users FOR SELECT USING ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: tenant_users tenant_users_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_users_auth_update ON public.tenant_users FOR UPDATE USING ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))) WITH CHECK ((user_id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_auth_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_auth_delete ON public.tenants FOR DELETE USING ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: tenants tenants_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_auth_insert ON public.tenants FOR INSERT WITH CHECK ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: tenants tenants_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_auth_update ON public.tenants FOR UPDATE USING ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL)) WITH CHECK ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: tenants tenants_authenticated_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_authenticated_select ON public.tenants FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))) OR (EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'coordinator'::public.user_role)))) OR (id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))) OR ((tenant_type = 'program'::text) AND (program_id IN ( SELECT p.id
   FROM (public.programs p
     JOIN public.user_programs up_prog ON ((up_prog.program_id = p.id)))
  WHERE ((up_prog.user_id = ( SELECT auth.uid() AS uid)) AND (p.is_active = true)))))));


--
-- Name: tenants tenants_super_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_super_admin_delete ON public.tenants FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))));


--
-- Name: tenants tenants_super_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_super_admin_insert ON public.tenants FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))));


--
-- Name: tenants tenants_super_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_super_admin_update ON public.tenants FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::public.user_role)))));


--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles user_profiles_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_auth_insert ON public.user_profiles FOR INSERT WITH CHECK ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: user_profiles user_profiles_auth_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_auth_select ON public.user_profiles FOR SELECT USING ((( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid) IS NOT NULL));


--
-- Name: user_profiles user_profiles_auth_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_auth_update ON public.user_profiles FOR UPDATE USING ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid))) WITH CHECK ((id = ( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)));


--
-- Name: user_profiles user_profiles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_profiles_delete ON public.user_profiles FOR DELETE TO authenticated USING (((id = ( SELECT auth.uid() AS uid)) OR public.current_user_is_super_admin()));


--
-- Name: user_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_programs user_programs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_programs_delete ON public.user_programs FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: user_programs user_programs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_programs_insert ON public.user_programs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: user_programs user_programs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_programs_select ON public.user_programs FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::public.user_role)))) OR ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'coordinator'::public.user_role)))) AND (program_id IN ( SELECT p.id
   FROM public.programs p
  WHERE (p.tenant_id IN ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE ((tenant_users.user_id = ( SELECT auth.uid() AS uid)) AND (tenant_users.is_active = true)))))))));


--
-- Name: user_programs user_programs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_programs_update ON public.user_programs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['super_admin'::public.user_role, 'coordinator'::public.user_role]))))));


--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: wound_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wound_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: wound_treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wound_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: wounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wounds ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Allow authenticated users to upload tenant logos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow authenticated users to upload tenant logos" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'tenant-logos'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Allow users to delete tenant logos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow users to delete tenant logos" ON storage.objects FOR DELETE USING (((bucket_id = 'tenant-logos'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Allow users to update tenant logos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Allow users to update tenant logos" ON storage.objects FOR UPDATE USING (((bucket_id = 'tenant-logos'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects Authenticated users can delete their own images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can delete their own images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'patient-images'::text) AND (auth.uid() = owner)));


--
-- Name: objects Authenticated users can update their own images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can update their own images" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'patient-images'::text) AND (auth.uid() = owner)));


--
-- Name: objects Authenticated users can upload patient images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload patient images" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'patient-images'::text));


--
-- Name: objects Authenticated users can upload wound photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Authenticated users can upload wound photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'wound-photos'::text));


--
-- Name: objects Users can delete their uploaded photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can delete their uploaded photos" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'wound-photos'::text) AND (owner = auth.uid())));


--
-- Name: objects Users can update their uploaded photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Users can update their uploaded photos" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'wound-photos'::text) AND (owner = auth.uid())));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime simulation_active; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.simulation_active;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict Qqej7MNFMrjbvSlsOjlTtKt7nGtIJDZfbfqj9UOTb0QwYhS03fGujb2j8ZrJ6Ug

