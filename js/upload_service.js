
/**
 * Upload de Arquivo (com suporte a Slug/RPC)
 */
async function uploadArquivo(ordemId, arquivo) {
    try {
        const fileExt = arquivo.name.split('.').pop();
        const fileName = `${ordemId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;

        // 1. Upload para Storage (Supabase Storage RLS deve permitir upload público ou autenticado)
        // Nota: Se o bucket for privado e não houver policy para anon, isso falhará para provider.
        // Assumimos que o bucket 'os-files' tem policy "INSERT" para public/anon ou similar.
        const { error: uploadError } = await supabaseClient.storage
            .from('os-files')
            .upload(fileName, arquivo);

        if (uploadError) throw uploadError;

        // 2. Registrar no Banco
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get("slug");

        if (slug) {
            // Usar RPC para registrar via Token
            const { error } = await supabaseClient.rpc('register_file_by_token', {
                p_token: slug,
                p_file_name: arquivo.name,
                p_storage_path: fileName
            });
            if (error) throw error;
        } else {
            // Acesso Staff direto
            const { error } = await supabaseClient.from('work_order_files').insert({
                work_order_id: ordemId,
                file_name: arquivo.name,
                storage_path: fileName
            });
            if (error) throw error;
        }

        return { success: true };
    } catch (error) {
        console.error("Erro uploadArquivo:", error);
        throw error;
    }
}

// Exportar
window.uploadArquivo = uploadArquivo;
