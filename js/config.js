// config.js
// Configurações e constantes do sistema

const SUPABASE_URL = 'https://wlfwtwhojwckhqwcrujg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZnd0d2hvandja2hxd2NydWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzc3MzksImV4cCI6MjA4NTY1MzczOX0.zfQlnEWyBzno9drxyVoN4e6TPM2vzEjT9dDWZBdDm_k';

// Inicializa o cliente Supabase globalmente como 'supabaseClient'
// Isso evita conflito com a biblioteca 'supabase' que pode estar no window
let supabaseClient;

if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client initialized successfully.");
} else if (typeof createClient !== 'undefined') {
    // Fallback caso createClient esteja no escopo global
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase Client initialized via global createClient.");
} else {
    console.error('CRITICAL: Supabase SDK not loaded. Cannot initialize client.');
    alert("Erro crítico: Sistema não conseguiu carregar o banco de dados. Recarregue a página.");
}

// Expor globalmente para garantia
window.supabaseClient = supabaseClient;

// Formatadores
const formatarData = (dataString) => {
  if (!dataString) return '';
  // Se for YYYY-MM-DD
  if (typeof dataString === 'string' && dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = dataString.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return dataString;
  return data.toLocaleDateString('pt-BR');
};

const formatarDataHora = (dataString) => {
  if (!dataString) return '';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return dataString;
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
};

// Funções de utilidade
const mostrarMensagem = (mensagem, tipo = 'info') => {
  let mensagemElement = document.getElementById('mensagem-sistema');

  if (!mensagemElement) {
    mensagemElement = document.createElement('div');
    mensagemElement.id = 'mensagem-sistema';
    document.body.appendChild(mensagemElement);
  }

  mensagemElement.className = `mensagem mensagem-${tipo}`;
  mensagemElement.textContent = mensagem;
  mensagemElement.style.display = 'block';

  setTimeout(() => {
    mensagemElement.style.display = 'none';
  }, 5000);
};

const obterParametroUrl = (nome) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nome);
};
