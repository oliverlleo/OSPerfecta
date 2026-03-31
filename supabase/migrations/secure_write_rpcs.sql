-- Secure Write RPCs for Public/Provider Access
-- These functions allow editing OS data via Token (Slug) or internal check, bypassing RLS safely.

-- 1. update_work_order_by_token: Updates status, timestamps, text fields
CREATE OR REPLACE FUNCTION update_work_order_by_token(
    p_token text,
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
    v_work_order_id uuid;
BEGIN
    -- Validate Token
    SELECT work_order_id INTO v_work_order_id
    FROM work_order_share_links
    WHERE token = p_token;

    IF v_work_order_id IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    -- Update Work Order
    UPDATE work_orders
    SET
        status = COALESCE(p_status, status),
        started_at = COALESCE(p_started_at, started_at),
        finished_at = COALESCE(p_finished_at, finished_at),
        realizado_text = COALESCE(p_realizado_text, realizado_text),
        pendencias_text = COALESCE(p_pendencias_text, pendencias_text),
        updated_at = now()
    WHERE id = v_work_order_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION update_work_order_by_token(text, text, timestamptz, timestamptz, text, text) TO anon;
GRANT EXECUTE ON FUNCTION update_work_order_by_token(text, text, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_work_order_by_token(text, text, timestamptz, timestamptz, text, text) TO service_role;


-- 2. save_service_exec_by_token: Inserts or Updates individual service items
CREATE OR REPLACE FUNCTION save_service_exec_by_token(
    p_token text,
    p_description text,
    p_technicians text, -- Comma separated string or whatever format
    p_status text,
    p_note text,
    p_service_exec_id uuid DEFAULT NULL -- If present, update; else insert
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_work_order_id uuid;
BEGIN
    -- Validate Token
    SELECT work_order_id INTO v_work_order_id
    FROM work_order_share_links
    WHERE token = p_token;

    IF v_work_order_id IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    IF p_service_exec_id IS NOT NULL THEN
        -- Update existing
        UPDATE work_order_service_exec
        SET
            description = p_description,
            technicians = p_technicians,
            status = p_status,
            note = p_note,
            updated_at = now()
        WHERE id = p_service_exec_id AND work_order_id = v_work_order_id;
    ELSE
        -- Insert new
        INSERT INTO work_order_service_exec (
            work_order_id, description, technicians, status, note
        ) VALUES (
            v_work_order_id, p_description, p_technicians, p_status, p_note
        );
    END IF;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION save_service_exec_by_token(text, text, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION save_service_exec_by_token(text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION save_service_exec_by_token(text, text, text, text, text, uuid) TO service_role;


-- 3. register_file_by_token: Registers uploaded file in DB
CREATE OR REPLACE FUNCTION register_file_by_token(
    p_token text,
    p_file_name text,
    p_storage_path text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_work_order_id uuid;
BEGIN
    -- Validate Token
    SELECT work_order_id INTO v_work_order_id
    FROM work_order_share_links
    WHERE token = p_token;

    IF v_work_order_id IS NULL THEN
        RAISE EXCEPTION 'Invalid token';
    END IF;

    INSERT INTO work_order_files (work_order_id, file_name, storage_path)
    VALUES (v_work_order_id, p_file_name, p_storage_path);

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION register_file_by_token(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION register_file_by_token(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_file_by_token(text, text, text) TO service_role;

-- NOTE: Storage Buckets policies (RLS) are separate.
-- You must ensure the 'os-files' bucket allows public uploads if we want providers to upload.
-- Or better, create a policy that checks if the folder path corresponds to a valid OS ID?
-- For now, simplest robust approach for this prompt context: Allow authenticated (even anon) uploads to specific paths?
-- But anon can't check paths easily against OS IDs in storage policies without complexity.
-- Assuming the bucket is already configured or we need to advise on it.
-- The previous plan assumed backend (Node) or specific users. Now it's client-side.
-- We will rely on Storage RLS "give anon write access" or similar for simplicity,
-- or we can't solve file uploads without a backend/edge function to sign the upload URL.
-- `supabase.storage.from('...').upload()` requires RLS permission.
-- Let's try to assume Storage is open or standard 'authenticated' access.
