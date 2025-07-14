// config.js (Corrigido e Simplificado para Cloudflare)

// =================================================
//              CONFIGURAÇÕES PRINCIPAIS
// =================================================

// --- CORREÇÃO FINAL ---
// A URL da API agora está definida diretamente para o seu backend na Cloudflare.
// Toda a lógica que verificava "localhost" foi removida para evitar confusão.
const API_URL = "https://osperfecta-backend.perfectaesquadriaspvc.workers.dev";


// IDs dos bancos de dados do Notion.
const NOTION_IDC = '1ced9246083e80ba9305efcf0a0b83d0';
const NOTION_IDOS = '1dfd9246083e803b9abdd3366e47e523';

// Configuração do Firebase para o SDK do cliente.
const firebaseConfig = {
  apiKey: "AIzaSyDfzyQFMSDDWVoX-HUPVLy3vwi2dgAioZ4",
  authDomain: "os---perfecta.firebaseapp.com",
  projectId: "os---perfecta",
  storageBucket: "os---perfecta.firebasestorage.app",
  messagingSenderId: "573615861135",
  appId: "1:573615861135:web:af50c59522a3e166142ffa",
  measurementId: "G-6GFJST9FPJ"
};


// =================================================
//              FUNÇÕES UTILITÁRIAS
// =================================================

/**
 * Formata uma string de data para o padrão brasileiro (DD/MM/YYYY).
 * @param {string} dataString - A data em formato de string.
 * @returns {string} A data formatada.
 */
const formatarData = (dataString) => {
  if (!dataString) return '';
  const dataAjustada = dataString.includes('T') ? dataString : `${dataString}T12:00:00`;
  const data = new Date(dataAjustada);
  return data.toLocaleDateString('pt-BR');
};

/**
 * Formata uma string de data e hora para o padrão brasileiro.
 * @param {string} dataString - A data e hora em formato de string.
 * @returns {string} A data e hora formatadas.
 */
const formatarDataHora = (dataString) => {
  if (!dataString) return '';
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
};

/**
 * Exibe uma mensagem flutuante na tela.
 * @param {string} mensagem - O texto a ser exibido.
 * @param {string} [tipo='info'] - O tipo da mensagem ('info', 'sucesso', 'erro').
 */
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

/**
 * Obtém um parâmetro da URL da página atual.
 * @param {string} nome - O nome do parâmetro.
 * @returns {string|null} O valor do parâmetro ou null se não existir.
 */
const obterParametroUrl = (nome) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nome);
};
