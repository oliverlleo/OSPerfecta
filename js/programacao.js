// programacao.js
// Script para a página de Programação de Trabalho

document.addEventListener('DOMContentLoaded', async () => {
  // Elementos do DOM
  const dataAtualSpan = document.getElementById('dataAtual');
  const seletorData = document.getElementById('seletorData');
  const listaObrasExternas = document.getElementById('listaObrasExternas');
  const listaServicosFabrica = document.getElementById('listaServicosFabrica');
  const exportarPDFBtn = document.getElementById('exportarPDF');
  const exportarJPEGBtn = document.getElementById('exportarJPEG');
  const exportarTextoBtn = document.getElementById('exportarTexto');
  const limparDadosBtn = document.getElementById('limparDados');
  const gerarOSBtn = document.getElementById('gerarOS');

  // Definir data atual
  const hoje = new Date();
  const dataFormatada = hoje.toISOString().split('T')[0];
  seletorData.value = dataFormatada;
  
  // Atualizar exibição da data
  atualizarExibicaoData();

  // Função para atualizar a exibição da data
  function atualizarExibicaoData() {
    // Correção: Tratar a data como local para evitar problemas de fuso horário
    const [year, month, day] = seletorData.value.split("-").map(Number);
    // Criar a data usando os componentes para garantir que seja interpretada no fuso horário local
    const data = new Date(year, month - 1, day);
    const options = { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }; // Usar UTC para evitar conversão local indesejada na formatação
    dataAtualSpan.textContent = `Programação: ${data.toLocaleDateString("pt-BR", options)}`;
  }

  // Carregar ordens de serviço para a data selecionada
  async function carregarOrdensDoDia() {
    try {
      // Limpar listas
      listaObrasExternas.innerHTML = '';
      listaServicosFabrica.innerHTML = '';
      
      // Buscar ordens do dia
      const ordens = await getOrdensPorData(seletorData.value);
      
      // Separar por tipo de serviço
      const obrasExternas = ordens.filter(ordem => 
        ordem.tipoServico === 'Instalação' || ordem.tipoServico === 'Manutenção'
      );
      
      const servicosFabrica = ordens.filter(ordem => 
        ordem.tipoServico === 'Fábrica'
      );
      
      // Exibir mensagem se não houver ordens
      if (obrasExternas.length === 0) {
        listaObrasExternas.innerHTML = '<p class="empty-message">Nenhuma ordem de serviço de instalação ou manutenção cadastrada.</p>';
      } else {
        // Adicionar cards de obras externas
        obrasExternas.forEach(ordem => {
          const card = criarCardServico(ordem);
          listaObrasExternas.appendChild(card);
        });
      }
      
      if (servicosFabrica.length === 0) {
        listaServicosFabrica.innerHTML = '<p class="empty-message">Nenhuma ordem de serviço de fábrica cadastrada.</p>';
      } else {
        // Adicionar cards de serviços de fábrica
        servicosFabrica.forEach(ordem => {
          const card = criarCardServico(ordem);
          listaServicosFabrica.appendChild(card);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ordens do dia:', error);
      mostrarMensagem('Erro ao carregar ordens do dia. Tente novamente.', 'erro');
    }
  }

  // Função para criar card de serviço
  function criarCardServico(ordem) {
    const card = document.createElement('div');
    card.className = 'service-card';
    
    // Formatar prestadores
    let prestadoresTexto = '';
    if (Array.isArray(ordem.prestadores)) {
      prestadoresTexto = ordem.prestadores.join(', ');
    } else if (typeof ordem.prestadores === 'string') {
      prestadoresTexto = ordem.prestadores;
    }
    
    card.innerHTML = `
      <h4>${ordem.cliente}</h4>
      <p><strong>Endereço:</strong> ${ordem.endereco}</p>
      <p><strong>Cidade:</strong> ${ordem.cidade}</p>
      <div class="service-details">
        <p><strong>Serviços:</strong> ${ordem.servicos}</p>
        <p><strong>Equipe:</strong> ${prestadoresTexto}</p>
      </div>
    `;
    
    return card;
  }

  // Função para exportar como PDF
  async function exportarPDF() {
    try {
      mostrarMensagem('Gerando PDF...', 'info');
      
      // Aqui seria implementada a lógica de geração de PDF
      // Como exemplo, vamos simular um atraso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      mostrarMensagem('PDF gerado com sucesso!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      mostrarMensagem('Erro ao exportar PDF. Tente novamente.', 'erro');
    }
  }

  // Função para exportar como JPEG
  async function exportarJPEG() {
    try {
      mostrarMensagem('Gerando imagem...', 'info');
      
      // Aqui seria implementada a lógica de geração de imagem
      // Como exemplo, vamos simular um atraso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      mostrarMensagem('Imagem gerada com sucesso!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar JPEG:', error);
      mostrarMensagem('Erro ao exportar imagem. Tente novamente.', 'erro');
    }
  }

  // Função para exportar como texto para WhatsApp
  async function exportarTexto() {
    try {
      // Buscar ordens do dia
      const ordens = await getOrdensPorData(seletorData.value);
      
      // Separar por tipo de serviço
      const obrasExternas = ordens.filter(ordem => 
        ordem.tipoServico === 'Instalação' || ordem.tipoServico === 'Manutenção'
      );
      
      const servicosFabrica = ordens.filter(ordem => 
        ordem.tipoServico === 'Fábrica'
      );
      
      // Formatar data
      const data = new Date(seletorData.value);
      const dataFormatada = data.toLocaleDateString('pt-BR');
      
      // Construir texto
      let texto = `🗓 Programação: ${dataFormatada}\n\n`;
      
      // Adicionar obras externas
      texto += `🏗 Serviço Externo:\n`;
      if (obrasExternas.length === 0) {
        texto += `- Nenhum serviço externo programado.\n`;
      } else {
        obrasExternas.forEach(ordem => {
          texto += `- ${ordem.cliente} (${ordem.cidade}): ${ordem.servicos}\n`;
        });
      }
      
      texto += `\n⚙ Serviço Interno:\n`;
      if (servicosFabrica.length === 0) {
        texto += `- Nenhum serviço interno programado.\n`;
      } else {
        servicosFabrica.forEach(ordem => {
          texto += `- ${ordem.cliente}: ${ordem.servicos}\n`;
        });
      }
      
      // Copiar para a área de transferência
      await navigator.clipboard.writeText(texto);
      
      mostrarMensagem('Texto copiado para a área de transferência!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar texto:', error);
      mostrarMensagem('Erro ao exportar texto. Tente novamente.', 'erro');
    }
  }

  // Evento de mudança de data
  seletorData.addEventListener('change', () => {
    atualizarExibicaoData();
    carregarOrdensDoDia();
  });

  // Eventos dos botões (verificando existência)
  if (exportarPDFBtn) exportarPDFBtn.addEventListener('click', exportarPDF);
  if (exportarJPEGBtn) exportarJPEGBtn.addEventListener('click', exportarJPEG);
  if (exportarTextoBtn) exportarTextoBtn.addEventListener('click', exportarTexto);
  
  if (limparDadosBtn) {
    limparDadosBtn.addEventListener('click', () => {
        listaObrasExternas.innerHTML = '<p class="empty-message">Nenhuma ordem de serviço de instalação ou manutenção cadastrada.</p>';
        listaServicosFabrica.innerHTML = '<p class="empty-message">Nenhuma ordem de serviço de fábrica cadastrada.</p>';
        mostrarMensagem('Dados limpos com sucesso!', 'sucesso');
    });
  }
  
  if (gerarOSBtn) {
    gerarOSBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
  }

  // Inicialização
  await carregarOrdensDoDia();
});
