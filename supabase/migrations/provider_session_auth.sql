-- Provider Session Auth & Secure RPCs
-- Implements secure session management for Providers (Login + PIN) on the database.

-- 1. Enable pgcrypto (Required for hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create provider_sessions table
CREATE TABLE IF NOT EXISTS public.provider_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS provider_sessions_provider_id_idx ON public.provider_sessions(provider_id);
CREATE INDEX IF NOT EXISTS provider_sessions_token_hash_idx ON public.provider_sessions(token_hash);

-- Enable RLS (allow access only via functions)
ALTER TABLE public.provider_sessions ENABLE ROW LEVEL SECURITY;


-- 3. Function: Provider Login (Creates Session)
CREATE OR REPLACE FUNCTION public.provider_login(p_login text, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider public.providers%rowtype;
    v_token text;
    v_hash text;
    v_expires timestamptz;
BEGIN
    SELECT * INTO v_provider
    FROM public.providers
    WHERE login = p_login
      AND password = p_pin
      AND active = true;

    IF v_provider.id IS NULL THEN
        RETURN json_build_object('success', false);
    END IF;

    -- Generate random token (32 bytes hex)
    v_token := encode(gen_random_bytes(32), 'hex');
    v_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_expires := now() + interval '12 hours';

    INSERT INTO public.provider_sessions(provider_id, token_hash, expires_at)
    VALUES (v_provider.id, v_hash, v_expires);

    RETURN json_build_object(
        'success', true,
        'token', v_token,
        'provider_id', v_provider.id,
        'provider_name', v_provider.name,
        'expires_at', v_expires
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.provider_login(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_login(text, text) TO service_role;


-- 4. Function: Validate Session Token
CREATE OR REPLACE FUNCTION public.provider_validate_session(p_token text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM public.provider_sessions s
            WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
              AND s.revoked = false
              AND s.expires_at > now()
        )
        THEN json_build_object('valid', true)
        ELSE json_build_object('valid', false)
    END
$$;

GRANT EXECUTE ON FUNCTION public.provider_validate_session(text) TO anon;
GRANT EXECUTE ON FUNCTION public.provider_validate_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_validate_session(text) TO service_role;


-- 5. Helper: Get Provider ID from Token (Internal Use)
CREATE OR REPLACE FUNCTION public.provider_id_from_token(p_token text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT s.provider_id
    FROM public.provider_sessions s
    WHERE s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND s.revoked = false
      AND s.expires_at > now()
    LIMIT 1
$$;


-- 6. RPC: Read Work Order for Provider (Session Based)
CREATE OR REPLACE FUNCTION public.get_work_order_for_provider_session(
    p_work_order_id uuid,
    p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider_id uuid;
    v_is_assigned boolean;
    v_work_order public.work_orders%rowtype;
    v_client public.clients%rowtype;
    v_location public.client_locations%rowtype;
    v_responsible public.responsibles%rowtype;
    v_service_type public.service_types%rowtype;
    v_providers json;
    v_service_exec json;
BEGIN
    v_provider_id := public.provider_id_from_token(p_session_token);
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Invalid session';
    END IF;

    SELECT EXISTS(
        SELECT 1
        FROM public.work_order_providers
        WHERE work_order_id = p_work_order_id
          AND provider_id = v_provider_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT * INTO v_work_order FROM public.work_orders WHERE id = p_work_order_id;
    SELECT * INTO v_client FROM public.clients WHERE id = v_work_order.client_id;
    SELECT * INTO v_location FROM public.client_locations WHERE id = v_work_order.location_id;
    SELECT * INTO v_responsible FROM public.responsibles WHERE id = v_work_order.responsible_id;
    SELECT * INTO v_service_type FROM public.service_types WHERE id = v_work_order.service_type_id;

    SELECT coalesce(json_agg(row_to_json(p)), '[]'::json) INTO v_providers
    FROM (
        SELECT p.name, p.id
        FROM public.work_order_providers wop
        JOIN public.providers p ON p.id = wop.provider_id
        WHERE wop.work_order_id = p_work_order_id
    ) p;

    SELECT coalesce(json_agg(row_to_json(se)), '[]'::json) INTO v_service_exec
    FROM (
        SELECT * FROM public.work_order_service_exec WHERE work_order_id = p_work_order_id
    ) se;

    RETURN json_build_object(
        'work_order', v_work_order,
        'client', v_client,
        'location', v_location,
        'responsible', v_responsible,
        'service_type', v_service_type,
        'providers', v_providers,
        'service_exec', v_service_exec
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_work_order_for_provider_session(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_work_order_for_provider_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_work_order_for_provider_session(uuid, text) TO service_role;


-- 7. RPC: Update Work Order for Provider (Session Based)
CREATE OR REPLACE FUNCTION public.update_work_order_for_provider_session(
    p_work_order_id uuid,
    p_session_token text,
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
    v_provider_id uuid;
    v_is_assigned boolean;
BEGIN
    v_provider_id := public.provider_id_from_token(p_session_token);
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Invalid session';
    END IF;

    SELECT EXISTS(
        SELECT 1
        FROM public.work_order_providers
        WHERE work_order_id = p_work_order_id
          AND provider_id = v_provider_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.work_orders
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

GRANT EXECUTE ON FUNCTION public.update_work_order_for_provider_session(uuid, text, text, timestamptz, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_work_order_for_provider_session(uuid, text, text, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_work_order_for_provider_session(uuid, text, text, timestamptz, timestamptz, text, text) TO service_role;


-- 8. RPC: Save Service Execution for Provider (Session Based)
CREATE OR REPLACE FUNCTION public.save_service_exec_for_provider_session(
    p_work_order_id uuid,
    p_session_token text,
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
DECLARE
    v_provider_id uuid;
    v_is_assigned boolean;
BEGIN
    v_provider_id := public.provider_id_from_token(p_session_token);
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Invalid session';
    END IF;

    SELECT EXISTS(
        SELECT 1
        FROM public.work_order_providers
        WHERE work_order_id = p_work_order_id
          AND provider_id = v_provider_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF p_service_exec_id IS NOT NULL THEN
        UPDATE public.work_order_service_exec
        SET
            description = p_description,
            technicians = p_technicians,
            status = p_status,
            note = p_note,
            updated_at = now()
        WHERE id = p_service_exec_id AND work_order_id = p_work_order_id;
    ELSE
        INSERT INTO public.work_order_service_exec (
            work_order_id, description, technicians, status, note
        ) VALUES (
            p_work_order_id, p_description, p_technicians, p_status, p_note
        );
    END IF;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_service_exec_for_provider_session(uuid, text, text, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.save_service_exec_for_provider_session(uuid, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_service_exec_for_provider_session(uuid, text, text, text, text, text, uuid) TO service_role;


-- 9. RPC: Register File for Provider (Session Based)
CREATE OR REPLACE FUNCTION public.register_file_for_provider_session(
    p_work_order_id uuid,
    p_session_token text,
    p_file_name text,
    p_storage_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider_id uuid;
    v_is_assigned boolean;
BEGIN
    v_provider_id := public.provider_id_from_token(p_session_token);
    IF v_provider_id IS NULL THEN
        RAISE EXCEPTION 'Invalid session';
    END IF;

    SELECT EXISTS(
        SELECT 1
        FROM public.work_order_providers
        WHERE work_order_id = p_work_order_id
          AND provider_id = v_provider_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    INSERT INTO public.work_order_files (work_order_id, file_name, storage_path)
    VALUES (p_work_order_id, p_file_name, p_storage_path);

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_file_for_provider_session(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_file_for_provider_session(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_file_for_provider_session(uuid, text, text, text) TO service_role;
