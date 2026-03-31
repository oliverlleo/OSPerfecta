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
  const exportarTextoComLinkBtn = document.getElementById('exportarTextoComLink');
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
      const { jsPDF } = window.jspdf;
      
      const element = document.querySelector("main");
      if (!element) throw new Error("Elemento principal não encontrado");

      // Ocultar botões antes da captura
      const buttonsDiv = document.querySelector('.export-buttons');
      if (buttonsDiv) buttonsDiv.style.display = 'none';

      const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
      });

      if (buttonsDiv) buttonsDiv.style.display = 'flex'; // Restaurar botões

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`programacao_${seletorData.value}.pdf`);
      
      mostrarMensagem('PDF gerado com sucesso!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      mostrarMensagem('Erro ao exportar PDF: ' + error.message, 'erro');
      const buttonsDiv = document.querySelector('.export-buttons');
      if (buttonsDiv) buttonsDiv.style.display = 'flex';
    }
  }

  // Função para exportar como JPEG
  async function exportarJPEG() {
    try {
      mostrarMensagem('Gerando imagem...', 'info');
      
      const element = document.querySelector("main");

      const buttonsDiv = document.querySelector('.export-buttons');
      if (buttonsDiv) buttonsDiv.style.display = 'none';

      const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true
      });

      if (buttonsDiv) buttonsDiv.style.display = 'flex';

      const link = document.createElement('a');
      link.download = `programacao_${seletorData.value}.jpeg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
      
      mostrarMensagem('Imagem gerada com sucesso!', 'sucesso');
    } catch (error) {
      console.error('Erro ao exportar JPEG:', error);
      mostrarMensagem('Erro ao exportar imagem: ' + error.message, 'erro');
      const buttonsDiv = document.querySelector('.export-buttons');
      if (buttonsDiv) buttonsDiv.style.display = 'flex';
    }
  }

  // Função para exportar como texto para WhatsApp
  async function exportarTexto(comLink = false) {
    try {
      mostrarMensagem('Gerando texto...', 'info');
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
      // Nota: new Date(seletorData.value) pode dar problema de timezone se for YYYY-MM-DD
      const [y, m, d] = seletorData.value.split('-');
      const dataFormatada = `${d}/${m}/${y}`;
      
      // Construir texto
      let texto = `🗓 Programação: ${dataFormatada}\n\n`;
      
      // Helper para montar linha
      const montarLinha = async (ordem) => {
          let linha = `- ${ordem.cliente} (${ordem.cidade || 'Local não informado'}): ${ordem.servicos}`;
          if (comLink) {
              try {
                  const { slug } = await criarSlug(ordem.id);
                  const link = `${window.location.origin}/relatorio.html?slug=${slug}`;
                  linha += `\n🔗 Link: ${link}`;
              } catch (e) {
                  console.error('Erro ao gerar link para exportação:', e);
              }
          }
          return linha;
      };

      // Adicionar obras externas
      texto += `🏗 Serviço Externo:\n`;
      if (obrasExternas.length === 0) {
        texto += `- Nenhum serviço externo programado.\n`;
      } else {
        for (const ordem of obrasExternas) {
            texto += (await montarLinha(ordem)) + "\n\n"; // Double newline for spacing if link exists
        }
      }
      
      texto += `\n⚙ Serviço Interno:\n`;
      if (servicosFabrica.length === 0) {
        texto += `- Nenhum serviço interno programado.\n`;
      } else {
        for (const ordem of servicosFabrica) {
            texto += (await montarLinha(ordem)) + "\n\n";
        }
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
  if (exportarTextoBtn) exportarTextoBtn.addEventListener('click', () => exportarTexto(false));
  if (exportarTextoComLinkBtn) exportarTextoComLinkBtn.addEventListener('click', () => exportarTexto(true));
  
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
