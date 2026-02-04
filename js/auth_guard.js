// auth_guard.js
// Verifica se o usuário está autenticado. Se não, redireciona para login.html
// Deve ser incluído APÓS config.js em todas as páginas protegidas

(async function() {
    // 1. Regra Global: Se tiver "slug" na URL, é acesso público (provavelmente relatório ou login de prestador)
    // Permitimos passar, pois a própria página vai validar o slug/token de prestador
    if (window.location.search.includes('slug=')) {
        return;
    }

    // 2. Páginas de Login estão liberadas
    const path = window.location.pathname;
    if (path.includes('login.html') || path.includes('login_prestador.html')) {
        return;
    }

    // 3. Relatório sem slug é privado (cai na regra de auth abaixo)
    // Mas se tiver slug (tratado acima), passa.

    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client not ready for Auth Guard.");
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            console.warn("Usuário não autenticado. Redirecionando para login...");
            // Salvar URL de retorno? Pode ser uma melhoria futura.
            window.location.href = 'login.html';
        } else {
            console.log("Sessão válida encontrada.");
        }

        // Listener para logout
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = 'login.html';
            }
        });

    } catch (err) {
        console.error("Erro ao verificar sessão:", err);
        window.location.href = 'login.html';
    }
})();
