// auth_guard.js
// Verifica se o usuário está autenticado. Se não, redireciona para login.html
// Deve ser incluído APÓS config.js em todas as páginas protegidas

(async function() {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    // 1. Login e Slug liberados (a lógica de validação é interna nessas páginas)
    if (path.includes('login.html') || urlParams.has('slug')) {
        return;
    }

    // 2. Relatório:
    // O relatorio.html agora gerencia sua própria autenticação híbrida (Staff vs Prestador).
    // O auth_guard não deve interferir se estivermos no relatório.
    if (path.includes('relatorio.html')) {
        return;
    }

    // 3. Demais Páginas (Admin/Staff apenas):
    // Ex: index.html, acompanhamento.html, cadastros.html
    // Exige sessão Supabase Auth (Email/Senha).
    // Prestadores (Token de Sessão) NÃO PODEM acessar estas páginas.

    if (!supabaseClient || !supabaseClient.auth) {
        console.error("Supabase Client not ready for Auth Guard.");
        return;
    }

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
            console.warn("[Auth Guard] Acesso negado. Usuário não é Staff.");
            // Se for prestador tentando acessar área restrita, manda pro login
            window.location.href = 'login.html';
        } else {
            console.log("[Auth Guard] Sessão Staff válida.");
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
