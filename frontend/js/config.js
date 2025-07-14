// config.js
// Configurações e constantes do sistema

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : '';

// IDs dos bancos de dados do Notion
const NOTION_IDC = '1ced9246083e80ba9305efcf0a0b83d0';
const NOTION_IDOS = '1dfd9246083e803b9abdd3366e47e523';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfzyQFMSDDWVoX-HUPVLy3vwi2dgAioZ4",
  authDomain: "os---perfecta.firebaseapp.com",
  projectId: "os---perfecta",
  storageBucket: "os---perfecta.firebasestorage.app",
  messagingSenderId: "573615861135",
  appId: "1:573615861135:web:af50c59522a3e166142ffa",
  measurementId: "G-6GFJST9FPJ"
};

// Formatadores
const formatarData = (dataString) => {
  if (!dataString) return '';
  
  // Corrigindo problema de fuso horário
  // Adicionando 'T00:00:00' para garantir que a data seja interpretada no fuso horário local
  // e não seja afetada pela conversão UTC
  const dataAjustada = dataString.includes('T') ? dataString : `${dataString}T12:00:00`;
  
  // Criando objeto Date e garantindo que use o fuso horário local
  const data = new Date(dataAjustada);
  
  // Formatando para o padrão brasileiro (DD/MM/YYYY)
  return data.toLocaleDateString('pt-BR');
};

const formatarDataHora = (dataString) => {
  if (!dataString) return '';
  
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
};

// Funções de utilidade
const mostrarMensagem = (mensagem, tipo = 'info') => {
  // Verificar se já existe um elemento de mensagem
  let mensagemElement = document.getElementById('mensagem-sistema');
  
  if (!mensagemElement) {
    // Criar elemento de mensagem
    mensagemElement = document.createElement('div');
    mensagemElement.id = 'mensagem-sistema';
    document.body.appendChild(mensagemElement);
  }
  
  // Definir classe baseada no tipo
  mensagemElement.className = `mensagem mensagem-${tipo}`;
  mensagemElement.textContent = mensagem;
  
  // Mostrar mensagem
  mensagemElement.style.display = 'block';
  
  // Esconder após 5 segundos
  setTimeout(() => {
    mensagemElement.style.display = 'none';
  }, 5000);
};

// Função para obter parâmetros da URL
const obterParametroUrl = (nome) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(nome);
};
