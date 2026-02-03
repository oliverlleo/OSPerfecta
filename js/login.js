// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const btnLogin = document.getElementById('btnLogin');

    // Verificar se já está logado
    if (supabaseClient.auth) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = 'index.html';
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            showError("Preencha todos os campos.");
            return;
        }

        btnLogin.disabled = true;
        btnLogin.textContent = "Entrando...";
        loginError.style.display = 'none';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                // Sucesso
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Erro login:", error);
            showError("Falha no login: " + (error.message === "Invalid login credentials" ? "Credenciais inválidas" : error.message));
            btnLogin.disabled = false;
            btnLogin.textContent = "Entrar";
        }
    });

    function showError(msg) {
        loginError.textContent = msg;
        loginError.style.display = 'block';
    }
});
