-- Fix Security for Public Access RPCs
-- This must be run in the Supabase SQL Editor

-- 1. get_work_order_by_token: Allows reading data by token without login
CREATE OR REPLACE FUNCTION get_work_order_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_work_order work_orders%ROWTYPE;
    v_client clients%ROWTYPE;
    v_location client_locations%ROWTYPE;
    v_responsible responsibles%ROWTYPE;
    v_service_type service_types%ROWTYPE;
    v_providers json;
    v_service_exec json;
    v_work_order_id uuid;
BEGIN
    -- Find the work order ID from the token
    SELECT work_order_id INTO v_work_order_id
    FROM work_order_share_links
    WHERE token = p_token;

    IF v_work_order_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch Work Order
    SELECT * INTO v_work_order FROM work_orders WHERE id = v_work_order_id;

    -- Fetch Related Data
    SELECT * INTO v_client FROM clients WHERE id = v_work_order.client_id;
    SELECT * INTO v_location FROM client_locations WHERE id = v_work_order.location_id;
    SELECT * INTO v_responsible FROM responsibles WHERE id = v_work_order.responsible_id;
    SELECT * INTO v_service_type FROM service_types WHERE id = v_work_order.service_type_id;

    -- Fetch Providers (Join)
    SELECT json_agg(row_to_json(p)) INTO v_providers
    FROM (
        SELECT p.name, p.id
        FROM work_order_providers wop
        JOIN providers p ON p.id = wop.provider_id
        WHERE wop.work_order_id = v_work_order_id
    ) p;

    -- Fetch Service Executions
    SELECT json_agg(row_to_json(se)) INTO v_service_exec
    FROM (
        SELECT * FROM work_order_service_exec WHERE work_order_id = v_work_order_id
    ) se;

    -- Return JSON object
    RETURN json_build_object(
        'work_order', v_work_order,
        'client', v_client,
        'location', v_location,
        'responsible', v_responsible,
        'service_type', v_service_type,
        'providers', COALESCE(v_providers, '[]'::json),
        'service_exec', COALESCE(v_service_exec, '[]'::json)
    );
END;
$$;

-- 2. Grant permission to anonymous users
GRANT EXECUTE ON FUNCTION get_work_order_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_work_order_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_work_order_by_token(text) TO service_role;

-- 3. validar_credenciais_prestador: Validates provider login
CREATE OR REPLACE FUNCTION validar_credenciais_prestador(p_login text, p_senha text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM providers
        WHERE login = p_login AND password = p_senha AND active = true
    ) INTO v_exists;
    RETURN v_exists;
END;
$$;

-- 4. Grant permission for provider login
GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO anon;
GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO service_role;

-- 5. create_share_link: Generates token (Internal use mostly, but good to secure)
CREATE OR REPLACE FUNCTION create_share_link(p_work_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token text;
BEGIN
    -- Check if exists
    SELECT token INTO v_token FROM work_order_share_links WHERE work_order_id = p_work_order_id;

    IF v_token IS NOT NULL THEN
        RETURN v_token;
    END IF;

    -- Generate new token (simple md5 for example, or use pgcrypto if available)
    v_token := encode(digest(p_work_order_id::text || clock_timestamp()::text, 'sha256'), 'hex');

    INSERT INTO work_order_share_links (work_order_id, token) VALUES (p_work_order_id, v_token);

    RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION create_share_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_share_link(uuid) TO service_role;
-- Anon should NOT create links, usually.
