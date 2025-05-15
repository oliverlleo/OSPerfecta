function resetMultiSelectStatus() {
    const multiSelectContainer = document.getElementById('filtroStatusMulti');
    if (!multiSelectContainer) return;

    const selectedTextElement = multiSelectContainer.querySelector('.multi-select-selected-text');
    const optionsContainer = multiSelectContainer.querySelector('.multi-select-options');
    const options = optionsContainer.querySelectorAll('.multi-select-option');
    const todosOption = optionsContainer.querySelector('.multi-select-option[data-value=""]');

    options.forEach(opt => {
        opt.classList.remove('selected');
        opt.classList.remove('hide-todos'); // Ensure 'hide-todos' is removed from all options during reset
    });
    
    if (todosOption) {
        todosOption.classList.add('selected');
    }
    
    if (selectedTextElement) {
        selectedTextElement.textContent = 'Todos';
    }
}

function getSelectedStatusValues() {
    const multiSelectContainer = document.getElementById('filtroStatusMulti');
    if (!multiSelectContainer) return ['']; 

    const selectedOptions = multiSelectContainer.querySelectorAll('.multi-select-option.selected');
    const values = Array.from(selectedOptions).map(opt => opt.dataset.value);

    if (values.includes('')) {
        return ['']; 
    }
    
    return values.length > 0 ? values : [''];
}

document.addEventListener("DOMContentLoaded", async () => {
  // Elementos do DOM
  const tabelaOrdens = document.getElementById("tabelaOrdens").querySelector("tbody");
  const filtroData = document.getElementById("filtroData");
  const filtroCliente = document.getElementById("filtroCliente");
  // const filtroStatus = document.getElementById("filtroStatus"); // REMOVIDO: Não existe mais o select antigo
  const filtroNOS = document.getElementById("filtroNOS"); 
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnLimpar = document.getElementById("btnLimpar");
  const btnMostrarTodas = document.getElementById("btnMostrarTodas");
  const paginacaoControles = document.getElementById("paginacaoControles");
  const btnPaginaAnterior = document.getElementById("btnPaginaAnterior");
  const btnProximaPagina = document.getElementById("btnProximaPagina");
  const infoPagina = document.getElementById("infoPagina");

  const CACHE_ORDENS_KEY = "perfecta_cache_ordens";
  const CACHE_ORDENS_DIA_KEY = "perfecta_cache_ordens_dia";
  const CACHE_CLIENTES_KEY = "perfecta_cache_clientes";
  const CACHE_TIMESTAMP_KEY = "perfecta_cache_timestamp";
  const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; 

  let todasOrdensFiltradas = [];
  let ordensHoje = []; 
  let paginaAtual = 1;
  const ITENS_POR_PAGINA = 10; 
  let progressoElement = null;

  function mostrarMensagem(mensagem, tipo) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) {
        console.error("Elemento 'notification-area' não encontrado no DOM.");
        console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
        return;
    }
    const notificationDiv = document.createElement('div');
    const tipoClasse = String(tipo).toLowerCase().replace(/[^a-z0-9-_]/g, ''); 
    notificationDiv.classList.add('notification', tipoClasse); 
    notificationDiv.textContent = mensagem;
    notificationArea.appendChild(notificationDiv);
    setTimeout(() => {
        if (notificationDiv.parentNode === notificationArea) {
             notificationArea.removeChild(notificationDiv);
        }
    }, 5000); 
  }

  function mostrarProgresso(mensagem, porcentagem = 0) {
    if (!progressoElement) {
      const progressoAnterior = document.getElementById('progresso-discreto');
      if (progressoAnterior) {
        progressoAnterior.remove();
      }
      progressoElement = document.createElement("div");
      progressoElement.id = "progresso-discreto";
      progressoElement.className = "progresso-discreto";
      progressoElement.innerHTML = `
        <div class="progresso-mensagem">${mensagem}</div>
        <div class="progresso-barra-container">
          <div class="progresso-barra" style="width: ${porcentagem}%"></div>
        </div>
        <div class="progresso-porcentagem">${Math.round(porcentagem)}%</div>
      `;
      const tituloOrdens = document.querySelector('.ordens-container h2');
      if (tituloOrdens) {
        tituloOrdens.insertAdjacentElement('afterend', progressoElement);
      } else {
        const secaoOrdens = document.querySelector('.ordens-container');
        if (secaoOrdens) {
          secaoOrdens.insertAdjacentElement('afterbegin', progressoElement);
        } else {
          document.body.appendChild(progressoElement);
        }
      }
      if (!document.getElementById("estilos-progresso")) {
        const estilos = document.createElement("style");
        estilos.id = "estilos-progresso";
        estilos.textContent = `
          .progresso-discreto { margin: 5px 0 15px 0; padding: 8px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #4CAF50; }
          .progresso-mensagem { font-size: 14px; margin-bottom: 5px; }
          .progresso-barra-container { height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; margin-bottom: 3px; }
          .progresso-barra { height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s ease; }
          .progresso-porcentagem { font-size: 12px; text-align: right; color: #666; }
          .ordens-hoje-header { background-color: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4CAF50; font-weight: bold; }
          .ordem-hoje { background-color: rgba(76, 175, 80, 0.1); }
        `;
        document.head.appendChild(estilos);
      }
    } else {
      progressoElement.querySelector(".progresso-mensagem").textContent = mensagem;
      progressoElement.querySelector(".progresso-barra").style.width = `${porcentagem}%`;
      progressoElement.querySelector(".progresso-porcentagem").textContent = `${Math.round(porcentagem)}%`;
    }
    progressoElement.style.display = "block";
  }

  function esconderProgresso() {
    if (progressoElement) {
      progressoElement.style.display = "none";
      progressoElement = null; 
    }
  }

  function cacheValido() {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    const agora = new Date().getTime();
    return agora - parseInt(timestamp) < CACHE_EXPIRY_TIME;
  }

  function salvarCache(ordens, ordensHoje, clientes) {
    try {
      if (ordens !== null) localStorage.setItem(CACHE_ORDENS_KEY, JSON.stringify(ordens));
      if (ordensHoje !== null) localStorage.setItem(CACHE_ORDENS_DIA_KEY, JSON.stringify(ordensHoje));
      if (clientes !== null) localStorage.setItem(CACHE_CLIENTES_KEY, JSON.stringify(clientes));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
      console.log("Dados salvos no cache");
    } catch (error) {
      console.error("Erro ao salvar no cache:", error);
      try {
        localStorage.removeItem(CACHE_ORDENS_KEY);
        localStorage.removeItem(CACHE_ORDENS_DIA_KEY);
        localStorage.removeItem(CACHE_CLIENTES_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      } catch (e) {
        console.error("Erro ao limpar cache:", e);
      }
    }
  }

  function obterCache(key) {
    try {
      const dados = localStorage.getItem(key);
      return dados ? JSON.parse(dados) : null;
    } catch (error) {
      console.error(`Erro ao obter ${key} do cache:`, error);
      return null;
    }
  }

  async function carregarClientes() {
    mostrarProgresso("Verificando cache de clientes...", 10);
    try {
      let clientes = null;
      if (cacheValido()) {
        mostrarProgresso("Carregando clientes do cache...", 20);
        clientes = obterCache(CACHE_CLIENTES_KEY);
      }
      if (!clientes) {
        mostrarProgresso("Conectando ao servidor...", 30);
        await new Promise((resolve) => setTimeout(resolve, 300));
        mostrarProgresso("Buscando lista de clientes...", 50);
        clientes = await getClientes();
        mostrarProgresso("Salvando clientes no cache...", 70);
        salvarCache(null, null, clientes);
      }
      mostrarProgresso("Atualizando interface...", 90);
      filtroCliente.innerHTML = '<option value="">Selecione um cliente</option>';
      clientes.forEach((cliente) => {
        const option = document.createElement("option");
        option.value = cliente.nome;
        option.textContent = cliente.nome;
        filtroCliente.appendChild(option);
      });
      esconderProgresso();
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      mostrarMensagem("Erro ao carregar clientes. Tente novamente.", "erro");
      esconderProgresso();
    }
  }

  function formatarDataDDMMYY(dataStr) {
    if (!dataStr) return "-";
    try {
      const [ano, mes, dia] = dataStr.split("-");
      return `${dia}/${mes}/${ano.slice(-2)}`;
    } catch (e) {
      console.error("Erro ao formatar data DD/MM/YY:", dataStr, e);
      return "Data inválida";
    }
  }

  function formatarIntervaloDatas(dataInicialStr, dataFinalStr) {
    const dataInicialFormatada = formatarDataDDMMYY(dataInicialStr);
    const dataFinalFormatada = formatarDataDDMMYY(dataFinalStr);
    return `${dataInicialFormatada} - ${dataFinalFormatada}`;
  }

  function renderizarTabelaPaginada(mensagemVazia = "Nenhuma ordem de serviço encontrada.") {
    tabelaOrdens.innerHTML = "";
    const totalOrdens = todasOrdensFiltradas.length;
    const totalPaginas = Math.ceil(totalOrdens / ITENS_POR_PAGINA);
    if (totalOrdens === 0) {
      tabelaOrdens.innerHTML = `<tr><td colspan="5" style="text-align: center;">${mensagemVazia}</td></tr>`;
      paginacaoControles.style.display = "none";
      return;
    }
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;
    const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const indiceFim = Math.min(indiceInicio + ITENS_POR_PAGINA, totalOrdens);
    const ordensPagina = todasOrdensFiltradas.slice(indiceInicio, indiceFim);
    const fragmento = document.createDocumentFragment();
    ordensPagina.forEach((ordem) => {
      const tr = document.createElement("tr");
      const ehOrdemHoje = ordensHoje.some(ordemHoje => ordemHoje.id === ordem.id);
      if (ehOrdemHoje) tr.classList.add("ordem-hoje");
      const numeroOS = ordem.numeroOS || ordem.id.substring(0, 8);
      let statusClass = "";
      switch (ordem.status) {
        case "Não iniciada": statusClass = "status-nao-iniciada"; break;
        case "Em andamento": statusClass = "status-andamento"; break;
        case "Concluído": statusClass = "status-concluido"; break;
        case "Gerou Pendências": statusClass = "status-pendente"; break;
      }
      tr.innerHTML = `
        <td>${numeroOS}</td>
        <td>${formatarIntervaloDatas(ordem.agendamentoInicial, ordem.agendamentoFinal)}</td>
        <td>${ordem.cliente}</td>
        <td><span class="status-badge ${statusClass}">${ordem.status}</span></td>
        <td class="action-buttons">
          <a href="relatorio.html?id=${ordem.id}" class="btn btn-primary btn-action">Ver</a>
          <button class="btn btn-secondary btn-action copiar-link" data-id="${ordem.id}">Copiar Link</button>
        </td>
      `;
      fragmento.appendChild(tr);
    });
    tabelaOrdens.appendChild(fragmento);
    paginacaoControles.style.display = "flex";
    infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas} (${totalOrdens} ordens)`;
    btnPaginaAnterior.disabled = paginaAtual === 1;
    btnProximaPagina.disabled = paginaAtual === totalPaginas;
    document.querySelectorAll(".copiar-link:not([data-event-added])").forEach((button) => {
      button.setAttribute("data-event-added", "true");
      button.addEventListener("click", async function () {
        const ordemId = this.getAttribute("data-id");
        await copiarLink(ordemId);
      });
    });
  }

  function getDataAtual() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  async function carregarOrdensDoDia() {
    try {
      mostrarProgresso("Buscando ordens do dia atual...", 30);
      const dataAtual = getDataAtual();
      let ordensDoDia = null;
      if (cacheValido()) {
        ordensDoDia = obterCache(CACHE_ORDENS_DIA_KEY);
      }
      if (!ordensDoDia) {
        ordensDoDia = await getOrdensPorData(dataAtual);
        salvarCache(null, ordensDoDia, null);
      }
      mostrarProgresso("Processando ordens do dia...", 70);
      ordensHoje = ordensDoDia;
      return ordensDoDia;
    } catch (error) {
      console.error("Erro ao carregar ordens do dia:", error);
      mostrarMensagem("Erro ao carregar ordens do dia. Tente novamente.", "erro");
      return [];
    }
  }

  async function carregarOrdens(forcarAtualizacao = false, mostrarTodas = false) {
    mostrarProgresso("Iniciando carregamento de ordens...", 5);
    try {
      tabelaOrdens.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';
      paginacaoControles.style.display = "none";
      await carregarOrdensDoDia();
      let ordens = null;
      let carregandoDoCache = false;
      if (!forcarAtualizacao && cacheValido()) {
        mostrarProgresso("Carregando ordens do cache local...", 20);
        ordens = obterCache(CACHE_ORDENS_KEY);
        if (ordens) {
          carregandoDoCache = true;
          mostrarProgresso("Aplicando filtros aos dados em cache...", 40);
          todasOrdensFiltradas = aplicarFiltros(ordens, mostrarTodas);
          paginaAtual = 1;
          renderizarTabelaPaginada();
        }
      }
      if (!ordens || forcarAtualizacao) {
        if (carregandoDoCache) {
          mostrarProgresso("Verificando atualizações no servidor...", 60);
        } else {
          mostrarProgresso("Conectando ao servidor...", 30);
          await new Promise((resolve) => setTimeout(resolve, 300));
          mostrarProgresso("Buscando ordens de serviço...", 80);
        }
        const ordensAtualizadas = await getOrdens();
        mostrarProgresso("Salvando dados no cache local...", 90);
        salvarCache(ordensAtualizadas, null, null);
        const ordensFiltradasAtualizadas = aplicarFiltros(ordensAtualizadas, mostrarTodas);
        if (!carregandoDoCache) {
          mostrarProgresso("Aplicando filtros e renderizando dados...", 95);
          todasOrdensFiltradas = ordensFiltradasAtualizadas;
          paginaAtual = 1;
          renderizarTabelaPaginada();
        } else {
          const precisaAtualizar =
            todasOrdensFiltradas.length !== ordensFiltradasAtualizadas.length ||
            todasOrdensFiltradas.some(
              (ordem, index) =>
                index >= ordensFiltradasAtualizadas.length ||
                ordem.id !== ordensFiltradasAtualizadas[index].id ||
                ordem.status !== ordensFiltradasAtualizadas[index].status
            );
          if (precisaAtualizar) {
            mostrarProgresso("Atualizando interface com novos dados...", 95);
            todasOrdensFiltradas = ordensFiltradasAtualizadas;
            paginaAtual = 1;
            renderizarTabelaPaginada();
            mostrarMensagem("Dados atualizados com sucesso!", "sucesso");
          } else {
            mostrarMensagem("Você já está vendo os dados mais recentes.", "info");
          }
        }
      }
      esconderProgresso();
    } catch (error) {
      console.error("Erro ao carregar ordens:", error);
      if (cacheValido() && obterCache(CACHE_ORDENS_KEY)) {
        mostrarMensagem("Erro ao atualizar dados. Mostrando dados do cache.", "aviso");
        const ordensCache = obterCache(CACHE_ORDENS_KEY);
        if (ordensCache) {
          todasOrdensFiltradas = aplicarFiltros(ordensCache, mostrarTodas);
          paginaAtual = 1;
          renderizarTabelaPaginada();
        }
      } else {
        mostrarMensagem("Erro ao carregar ordens. Tente novamente.", "erro");
        tabelaOrdens.innerHTML = '<tr><td colspan="5" style="text-align: center;">Erro ao carregar ordens.</td></tr>';
        paginacaoControles.style.display = "none";
      }
      esconderProgresso();
    }
  }

  function aplicarFiltros(ordens, mostrarTodas = false) {
    let ordensFiltradas = ordens;
    const statusSelecionados = getSelectedStatusValues();

    if (statusSelecionados.length > 0 && !statusSelecionados.includes('')) {
        ordensFiltradas = ordensFiltradas.filter(ordem => 
            statusSelecionados.includes(ordem.status)
        );
    } else if (!mostrarTodas && statusSelecionados.includes('')) {
        ordensFiltradas = ordensFiltradas.filter(
            (ordem) =>
                ordem.status === "Não iniciada" || ordem.status === "Em andamento"
        );
    }

    if (filtroData.value) {
      const dataFiltro = filtroData.value;
      ordensFiltradas = ordensFiltradas.filter(
        (ordem) => {
          return ordem.agendamentoInicial && ordem.agendamentoFinal &&
                 ordem.agendamentoInicial <= dataFiltro &&
                 ordem.agendamentoFinal >= dataFiltro;
        }
      );
    }
    if (filtroCliente.value) {
      ordensFiltradas = ordensFiltradas.filter(
        (ordem) => ordem.cliente === filtroCliente.value
      );
    }
    if (filtroNOS.value) {
      const nosFiltro = parseInt(filtroNOS.value, 10);
      if (!isNaN(nosFiltro)) {
        ordensFiltradas = ordensFiltradas.filter(
          (ordem) => ordem.numeroOS === nosFiltro
        );
      }
    }
    ordensFiltradas.sort((a, b) => {
      const nosA = a.numeroOS || 0;
      const nosB = b.numeroOS || 0;
      return nosB - nosA;
    });
    return ordensFiltradas;
  }

  async function copiarLink(ordemId) {
    try {
      mostrarProgresso("Gerando link compartilhável...", 50);
      const response = await criarSlug(ordemId);
      const url = `${window.location.origin}/relatorio.html?slug=${response.slug}`;
      await navigator.clipboard.writeText(url);
      esconderProgresso();
      mostrarMensagem("Link copiado para a área de transferência!", "sucesso");
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      esconderProgresso();
      mostrarMensagem("Erro ao copiar link. Tente novamente.", "erro");
    }
  }

  btnFiltrar.addEventListener("click", () => carregarOrdens(true, false));

  btnLimpar.addEventListener("click", () => {
    filtroData.value = "";
    filtroCliente.value = "";
    filtroNOS.value = ""; // Limpar também o filtro NOS
    resetMultiSelectStatus(); 
    carregarOrdens(true, false); 
  });

  btnMostrarTodas.addEventListener("click", () => {
    filtroData.value = "";
    filtroCliente.value = "";
    filtroNOS.value = ""; // Limpar também o filtro NOS
    resetMultiSelectStatus();
    carregarOrdens(true, true); 
  });

  btnPaginaAnterior.addEventListener("click", () => {
    if (paginaAtual > 1) {
      paginaAtual--;
      renderizarTabelaPaginada();
    }
  });

  btnProximaPagina.addEventListener("click", () => {
    const totalPaginas = Math.ceil(todasOrdensFiltradas.length / ITENS_POR_PAGINA);
    if (paginaAtual < totalPaginas) {
      paginaAtual++;
      renderizarTabelaPaginada();
    }
  });

  await carregarClientes();
  await carregarOrdens(false, false);

  // --- Lógica para o Multi-Select Minimalista (colocada dentro do mesmo DOMContentLoaded para garantir ordem) ---
  const multiSelectContainer = document.getElementById('filtroStatusMulti');
  if (multiSelectContainer) { // Verifica se o container existe
    const selectedTextElement = multiSelectContainer.querySelector('.multi-select-selected-text');
    const optionsContainer = multiSelectContainer.querySelector('.multi-select-options');
    const options = optionsContainer.querySelectorAll('.multi-select-option');

    function updateSelectedText() {
        const selectedOptions = Array.from(optionsContainer.querySelectorAll('.multi-select-option.selected'))
                                    .filter(opt => opt.dataset.value !== '');
        const todosOption = optionsContainer.querySelector('.multi-select-option[data-value=""]');

        if (selectedOptions.length === 0 || (selectedOptions.length === 1 && selectedOptions[0].dataset.value === '')) {
            selectedTextElement.textContent = 'Todos';
            if(todosOption) todosOption.classList.add('selected');
            if(todosOption) todosOption.classList.remove('hide-todos');
        } else {
            selectedTextElement.textContent = selectedOptions.map(opt => opt.textContent).join(', ');
            if(todosOption) todosOption.classList.remove('selected');
            if(todosOption) todosOption.classList.add('hide-todos');
        }
    }

    if (selectedTextElement && optionsContainer && options.length > 0) { // Verifica se os elementos internos existem
        selectedTextElement.addEventListener('click', (event) => {
            event.stopPropagation();
            multiSelectContainer.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', (event) => {
                event.stopPropagation();
                const value = option.dataset.value;
                const todosOption = optionsContainer.querySelector('.multi-select-option[data-value=""]');

                if (value === '') {
                    options.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                } else {
                    if(todosOption) todosOption.classList.remove('selected');
                    option.classList.toggle('selected');
                }

                const anySelected = Array.from(optionsContainer.querySelectorAll('.multi-select-option.selected'))
                                    .some(opt => opt.dataset.value !== '');
                if (!anySelected && todosOption) {
                    todosOption.classList.add('selected');
                }
                updateSelectedText();
            });
        });

        document.addEventListener('click', () => {
            if (multiSelectContainer.classList.contains('open')) {
                multiSelectContainer.classList.remove('open');
            }
        });
        updateSelectedText(); // Inicializa o texto
    } else {
        console.error('Multi-select elements not found or no options available.');
    }
  } else {
      console.error('Multi-select container #filtroStatusMulti not found.');
  }
}); // Fim do DOMContentLoaded principal

