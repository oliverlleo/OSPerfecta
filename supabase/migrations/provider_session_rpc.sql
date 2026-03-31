-- Fix Provider Auth: Allow ID-based access and return Provider ID on login

-- 1. Update Provider Login to return ID instead of Boolean
DROP FUNCTION IF EXISTS validar_credenciais_prestador(text, text);

CREATE OR REPLACE FUNCTION validar_credenciais_prestador(p_login text, p_senha text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider providers%ROWTYPE;
BEGIN
    SELECT * INTO v_provider
    FROM providers
    WHERE login = p_login AND password = p_senha AND active = true;

    IF v_provider.id IS NOT NULL THEN
        -- Return ID and Name to store in session
        RETURN json_build_object('id', v_provider.id, 'name', v_provider.name, 'success', true);
    ELSE
        RETURN json_build_object('success', false);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO anon;
GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_credenciais_prestador(text, text) TO service_role;


-- 2. Read OS by ID for Provider (Bypassing RLS if Provider is valid)
CREATE OR REPLACE FUNCTION get_work_order_for_provider(
    p_work_order_id uuid,
    p_provider_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_work_order work_orders%ROWTYPE;
    v_client clients%ROWTYPE;
    v_location client_locations%ROWTYPE;
    v_responsible responsibles%ROWTYPE;
    v_service_type service_types%ROWTYPE;
    v_providers json;
    v_service_exec json;
    v_is_valid_provider boolean;
BEGIN
    -- Verify Provider Exists and is Active
    SELECT EXISTS (SELECT 1 FROM providers WHERE id = p_provider_id AND active = true) INTO v_is_valid_provider;

    IF NOT v_is_valid_provider THEN
        RAISE EXCEPTION 'Provider not found or inactive';
    END IF;

    -- Fetch Work Order
    SELECT * INTO v_work_order FROM work_orders WHERE id = p_work_order_id;

    IF v_work_order.id IS NULL THEN
        RETURN NULL;
    END IF;

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
        WHERE wop.work_order_id = p_work_order_id
    ) p;

    -- Fetch Service Executions
    SELECT json_agg(row_to_json(se)) INTO v_service_exec
    FROM (
        SELECT * FROM work_order_service_exec WHERE work_order_id = p_work_order_id
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

GRANT EXECUTE ON FUNCTION get_work_order_for_provider(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_work_order_for_provider(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_work_order_for_provider(uuid, uuid) TO service_role;


-- 3. Write/Update RPCs for Provider (ID based)

-- Update Status/Text
CREATE OR REPLACE FUNCTION update_work_order_for_provider(
    p_work_order_id uuid,
    p_provider_id uuid,
    p_status text DEFAULT NULL,
    p_started_at timestamptz DEFAULT NULL,
    p_finished_at timestamptz DEFAULT NULL,
    p_realizado_text text DEFAULT NULL,
    p_pendencias_text text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_valid_provider boolean;
BEGIN
    SELECT EXISTS (SELECT 1 FROM providers WHERE id = p_provider_id AND active = true) INTO v_is_valid_provider;

    IF NOT v_is_valid_provider THEN
        RAISE EXCEPTION 'Provider invalid';
    END IF;

    UPDATE work_orders
    SET
        status = COALESCE(p_status, status),
        started_at = COALESCE(p_started_at, started_at),
        finished_at = COALESCE(p_finished_at, finished_at),
        realizado_text = COALESCE(p_realizado_text, realizado_text),
        pendencias_text = COALESCE(p_pendencias_text, pendencias_text),
        updated_at = now()
    WHERE id = p_work_order_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_work_order_for_provider(uuid, uuid, text, timestamptz, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION update_work_order_for_provider(uuid, uuid, text, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_work_order_for_provider(uuid, uuid, text, timestamptz, timestamptz, text, text) TO service_role;

-- Save Service Execution
CREATE OR REPLACE FUNCTION save_service_exec_for_provider(
    p_work_order_id uuid,
    p_provider_id uuid,
    p_description text,
    p_technicians text,
    p_status text,
    p_note text,
    p_service_exec_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check provider
    IF NOT EXISTS (SELECT 1 FROM providers WHERE id = p_provider_id AND active = true) THEN
        RAISE EXCEPTION 'Provider invalid';
    END IF;

    IF p_service_exec_id IS NOT NULL THEN
        UPDATE work_order_service_exec
        SET
            description = p_description,
            technicians = p_technicians,
            status = p_status,
            note = p_note,
            updated_at = now()
        WHERE id = p_service_exec_id AND work_order_id = p_work_order_id;
    ELSE
        INSERT INTO work_order_service_exec (
            work_order_id, description, technicians, status, note
        ) VALUES (
            p_work_order_id, p_description, p_technicians, p_status, p_note
        );
    END IF;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION save_service_exec_for_provider(uuid, uuid, text, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION save_service_exec_for_provider(uuid, uuid, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION save_service_exec_for_provider(uuid, uuid, text, text, text, text, uuid) TO service_role;

-- Register File
CREATE OR REPLACE FUNCTION register_file_for_provider(
    p_work_order_id uuid,
    p_provider_id uuid,
    p_file_name text,
    p_storage_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM providers WHERE id = p_provider_id AND active = true) THEN
        RAISE EXCEPTION 'Provider invalid';
    END IF;

    INSERT INTO work_order_files (work_order_id, file_name, storage_path)
    VALUES (p_work_order_id, p_file_name, p_storage_path);

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION register_file_for_provider(uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION register_file_for_provider(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_file_for_provider(uuid, uuid, text, text) TO service_role;
