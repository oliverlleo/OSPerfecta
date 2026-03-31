// login.js
// Lógica para autenticação (Staff e Prestador)

document.addEventListener("DOMContentLoaded", () => {
    // Referências aos elementos
    const formLogin = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const btnLogin = document.getElementById("btnLogin");
    const loginError = document.getElementById("loginError");

    const formLoginPrestador = document.getElementById("loginFormPrestador");
    const prestadorLoginInput = document.getElementById("prestadorLogin");
    const prestadorSenhaInput = document.getElementById("prestadorSenha");
    const btnLoginPrestador = document.getElementById("btnLoginPrestador");

    const tabAdmin = document.getElementById("tab-admin");
    const tabPrestador = document.getElementById("tab-prestador");

    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const loginType = urlParams.get("type");
    const slug = urlParams.get("slug");
    const returnUrl = urlParams.get("returnUrl"); // Captura URL de retorno

    // Selecionar aba correta baseado na URL
    if (loginType === "provider" && tabPrestador) {
        const triggerEl = new bootstrap.Tab(tabPrestador);
        triggerEl.show();
    }

    function mostrarErro(mensagem) {
        loginError.textContent = mensagem;
        loginError.style.display = "block";
        setTimeout(() => loginError.style.display = "none", 5000);
    }

    // --- Login Staff (Supabase Auth) ---
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) return;

            btnLogin.disabled = true;
            btnLogin.textContent = "Entrando...";

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Sucesso -> Redirecionar
                if (returnUrl) {
                    window.location.href = decodeURIComponent(returnUrl);
                } else {
                    window.location.href = "index.html";
                }

            } catch (error) {
                console.error("Login erro:", error);
                mostrarErro("Erro ao entrar: Verifique suas credenciais.");
                btnLogin.disabled = false;
                btnLogin.textContent = "Entrar";
            }
        });
    }

    // --- Login Prestador (RPC) ---
    if (formLoginPrestador) {
        formLoginPrestador.addEventListener("submit", async (e) => {
            e.preventDefault();
            const login = prestadorLoginInput.value.trim();
            const senha = prestadorSenhaInput.value.trim();

            if (!login || !senha) return;

            btnLoginPrestador.disabled = true;
            btnLoginPrestador.textContent = "Verificando...";

            try {
                const { data, error } = await supabaseClient.rpc('validar_credenciais_prestador', {
                    p_login: login,
                    p_senha: senha
                });

                if (error) throw error;

                // Agora 'data' é um objeto JSON { id, name, success }
                // Ou boolean 'true' (se a migration não tiver rodado ainda, fallback)
                let success = false;
                let providerId = null;
                let providerName = null;

                if (typeof data === 'boolean') {
                    success = data;
                } else if (data && data.success) {
                    success = true;
                    providerId = data.id;
                    providerName = data.name;
                }

                if (success) {
                    sessionStorage.setItem("providerAuth", "true");
                    // Armazena ID do prestador para sessão global
                    if (providerId) {
                        localStorage.setItem("provider_id", providerId);
                        localStorage.setItem("provider_name", providerName || "Prestador");
                    }

                    if (slug) {
                        // Se tem slug, vai direto pro relatório com slug
                        window.location.href = `relatorio.html?slug=${slug}`;
                    } else if (returnUrl) {
                        // Se tem returnUrl genérico
                        window.location.href = decodeURIComponent(returnUrl);
                    } else {
                        // Sem destino específico, mas logado com sucesso
                        // Se tentarmos acessar uma OS por ID, o relatorio.js agora vai usar o provider_id
                        // Então podemos mandar para o dashboard ou pedir um ID.
                        // Como não temos dashboard de prestador, mandamos para o returnUrl se existir, ou mensagem.
                        mostrarErro("Login realizado! Acesse um link de relatório.");
                    }
                } else {
                    throw new Error("Credenciais inválidas");
                }

            } catch (error) {
                console.error("Login Prestador erro:", error);
                mostrarErro("Login ou senha incorretos.");
                btnLoginPrestador.disabled = false;
                btnLoginPrestador.textContent = "Acessar Relatório";
            }
        });
    }
});
