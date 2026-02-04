// auth_guard.js
// Verifica se o usuário está autenticado. Se não, redireciona para login.html
// Deve ser incluído APÓS config.js em todas as páginas protegidas

(async function() {
    // Evitar loop de redirecionamento se já estiver na página de login ou login de prestador
    const path = window.location.pathname;
    if (path.endsWith('login.html') || path.endsWith('login_prestador.html')) {
        return;
    }

    // Páginas públicas (ex: relatorio.html se acessado via token)
    // Se relatorio.html tiver ?slug=..., é público. Se tiver ?id=..., é privado.
    // Usar includes para ser mais robusto contra subdiretórios
    if (path.includes('relatorio.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('slug')) {
            return; // Acesso público permitido (validado depois pelo relatorio.js)
        }
    }

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
