/* Sugestões de Modificação para frontend/js/relatorio.js */

/*
Este ficheiro contém sugestões de modificações para o `relatorio.js` existente.
O objetivo é integrar um novo componente de dropdown multi-select para a seleção de técnicos
e adicionar pequenas melhorias de interatividade, mantendo toda a lógica de negócio original.

As modificações e adições estão marcadas com comentários // MODIFICAÇÃO ou // ADIÇÃO.
Certifique-se de que o novo ficheiro CSS (relatorio_enhancements.css) está linkado no relatorio.html.
*/

document.addEventListener("DOMContentLoaded", async () => {
  // --- Elementos do DOM (manter os existentes) ---
  const numeroOS = document.getElementById("numeroOS");
  const clienteOS = document.getElementById("clienteOS");
  // ... (restantes elementos existentes)
  const servicosContainer = document.getElementById("servicosContainer");
  const listaServicos = document.getElementById("listaServicos");
  const iniciarServicoDiv = document.getElementById("iniciarServico");
  const btnIniciarServico = document.getElementById("btnIniciarServico");
  const btnFinalizarServico = document.getElementById("btnFinalizarServico");
  const finalizacaoModal = document.getElementById("finalizacaoModal");
  const btnCancelarFinalizacao = document.getElementById("btnCancelarFinalizacao");
  const btnFinalizado = document.getElementById("btnFinalizado");
  const btnPendenciasModal = document.getElementById("btnPendenciasModal");
  const informacoesTextarea = document.getElementById("informacoes");
  const btnAbrirNotion = document.getElementById("btnAbrirNotion");
  const arquivosServicoContainer = document.getElementById("arquivosServicoContainer");
  const listaArquivosServico = document.getElementById("listaArquivosServico");
  const loadingArquivosMsg = document.getElementById("loadingArquivosMsg");
  const noArquivosMsg = document.getElementById("noArquivosMsg");
  const arquivoModal = document.getElementById("arquivoModal");
  const arquivoModalContent = document.getElementById("arquivoModalContent");
  const btnFecharArquivoModal = document.getElementById("btnFecharArquivoModal");
  const observacoesOS = document.getElementById("observacoesOS");
  const agendamentoInicialOS = document.getElementById("agendamentoInicialOS");
  const agendamentoFinalOS = document.getElementById("agendamentoFinalOS");
  const dataSolicitacaoOS = document.getElementById("dataSolicitacaoOS");
  const responsavelOS = document.getElementById("responsavelOS");
  const tecnicosOS = document.getElementById("tecnicosOS"); // Adicionado para consistência, já existia

  // --- Variáveis Globais (manter as existentes) ---
  let ordemId = "";
  let slug = "";
  let dadosOrdemAtual = null;

  // --- Funções Utilitárias (manter as existentes como mostrarMensagem, formatarData) ---
  function mostrarMensagem(texto, tipo) {
    // ... (código original da função mostrarMensagem)
    // Nenhuma alteração necessária aqui, mas garantir que os estilos CSS para .mensagem-popup são adequados.
    // O CSS em relatorio_enhancements.css ou styles.css deve cobrir isso.
    console.log(`[${tipo.toUpperCase()}] ${texto}`);
    const mensagensAnteriores = document.querySelectorAll(".mensagem-popup");
    mensagensAnteriores.forEach(msg => msg.remove());
    const msgDiv = document.createElement("div");
    msgDiv.className = "mensagem-popup";
    // Aplicar estilos via CSS em vez de inline se possível, mas mantendo a lógica original para compatibilidade
    msgDiv.style.position = "fixed";
    msgDiv.style.top = "50%";
    msgDiv.style.left = "50%";
    msgDiv.style.transform = "translate(-50%, -50%)";
    msgDiv.style.padding = "15px 20px";
    msgDiv.style.borderRadius = "8px";
    msgDiv.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    msgDiv.style.zIndex = "1002"; // Acima do modal de finalização (1000) e dropdown (1001)
    msgDiv.style.maxWidth = "90%";
    msgDiv.style.width = "auto";
    msgDiv.style.minWidth = "280px";
    msgDiv.style.textAlign = "center";
    msgDiv.style.fontFamily = "Arial, sans-serif"; // Considerar usar a fonte do tema
    msgDiv.style.fontSize = "16px";
    msgDiv.style.fontWeight = "500";
    msgDiv.style.border = "1px solid";
    msgDiv.style.opacity = "0";
    msgDiv.style.transition = "opacity 0.3s ease-in-out, transform 0.3s ease-in-out"; // Adicionar transição de transform
    msgDiv.style.transform = "translate(-50%, -70%)"; // Posição inicial para animação

    if (tipo === "sucesso") {
      msgDiv.style.backgroundColor = "#e8f5e9";
      msgDiv.style.color = "#2e7d32";
      msgDiv.style.borderColor = "#a5d6a7";
    } else if (tipo === "erro") {
      msgDiv.style.backgroundColor = "#ffebee";
      msgDiv.style.color = "#c62828";
      msgDiv.style.borderColor = "#ef9a9a";
    } else {
      msgDiv.style.backgroundColor = "#e3f2fd";
      msgDiv.style.color = "#1565c0";
      msgDiv.style.borderColor = "#90caf9";
    }
    let icone = "";
    if (tipo === "sucesso") icone = "✓ ";
    else if (tipo === "erro") icone = "✗ ";
    else icone = "ℹ ";
    msgDiv.textContent = icone + texto;
    document.body.appendChild(msgDiv);
    setTimeout(() => {
      msgDiv.style.opacity = "1";
      msgDiv.style.transform = "translate(-50%, -50%)"; // Posição final
    }, 10);
    setTimeout(() => {
      msgDiv.style.opacity = "0";
      msgDiv.style.transform = "translate(-50%, -70%)"; // Retorna para animação de saída
      setTimeout(() => msgDiv.remove(), 300);
    }, 3000);
  }

  function formatarData(dataISO) {
    // ... (código original da função formatarData)
    if (!dataISO) return "N/A";
    try {
      // Tentar normalizar a data para evitar problemas com fuso horário na conversão simples
      let dateStrToParse = dataISO;
      if (typeof dataISO === "string" && dataISO.length === 10 && !dataISO.includes("T")) {
        // Se for apenas YYYY-MM-DD, adicionar T00:00:00 para tratar como local
        // ou T00:00:00Z para tratar como UTC, dependendo da consistência dos dados de origem.
        // Para exibição, geralmente se assume que a data já está correta ou é UTC.
        dateStrToParse = dataISO + "T00:00:00Z"; 
      }
      const dataObj = new Date(dateStrToParse);
      if (isNaN(dataObj.getTime())) return dataISO; // Retorna original se inválida
      // Usar toLocaleDateString com timeZone UTC para consistência se as datas são armazenadas em UTC
      return dataObj.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch (e) {
      console.error("Erro ao formatar data:", dataISO, e);
      return dataISO; // Retorna original em caso de erro
    }
  }

  // --- ADIÇÃO: Funções para o Dropdown Multi-Select ---
  function criarDropdownTecnicos(servicoId, tecnicosDisponiveis, tecnicosSelecionadosAntes = []) {
    const container = document.createElement("div");
    container.className = "multiselect-dropdown";
    container.dataset.servicoId = servicoId;

    const button = document.createElement("button");
    button.type = "button"; // Evitar submit de formulário
    button.className = "multiselect-dropdown-button";
    button.innerHTML = `<span class="text-placeholder">Selecionar Técnicos</span><span class="multiselect-dropdown-arrow">▼</span>`;

    const listWrapper = document.createElement("div");
    listWrapper.className = "multiselect-dropdown-list-wrapper";
    const list = document.createElement("ul");
    list.className = "multiselect-dropdown-list";

    if (tecnicosDisponiveis.length > 0) {
        tecnicosDisponiveis.forEach(tecnico => {
            const listItem = document.createElement("li");
            listItem.className = "multiselect-dropdown-list-item";
            listItem.dataset.value = tecnico;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `${servicoId}-tecnico-ms-${tecnico.replace(/\s+/g, "-")}`;
            checkbox.value = tecnico;
            checkbox.checked = tecnicosSelecionadosAntes.includes(tecnico);
            if (checkbox.checked) listItem.classList.add("selected");

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.textContent = tecnico;

            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            list.appendChild(listItem);

            // Evento de clique no item (label ou checkbox)
            listItem.addEventListener("click", (e) => {
                // Não fechar o dropdown ao clicar, permitir múltiplas seleções
                e.stopPropagation(); 
                const currentCheckbox = listItem.querySelector("input[type=\"checkbox\"]");
                if (e.target !== currentCheckbox) { // Se clicou no LI ou Label, alterna o checkbox
                    currentCheckbox.checked = !currentCheckbox.checked;
                }
                listItem.classList.toggle("selected", currentCheckbox.checked);
                atualizarTextoBotaoDropdown(container);
            });
        });
    } else {
        const noOptionItem = document.createElement("li");
        noOptionItem.className = "multiselect-dropdown-list-item disabled";
        noOptionItem.textContent = "Nenhum técnico disponível";
        list.appendChild(noOptionItem);
    }

    listWrapper.appendChild(list);
    container.appendChild(button);
    container.appendChild(listWrapper);

    // Evento para abrir/fechar o dropdown
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        // Fechar outros dropdowns abertos
        document.querySelectorAll(".multiselect-dropdown.open").forEach(openDropdown => {
            if (openDropdown !== container) {
                openDropdown.classList.remove("open");
            }
        });
        container.classList.toggle("open");
    });
    
    atualizarTextoBotaoDropdown(container); // Atualiza o texto inicial
    return container;
  }

  function atualizarTextoBotaoDropdown(dropdownContainer) {
    const button = dropdownContainer.querySelector(".multiselect-dropdown-button .text-placeholder") || dropdownContainer.querySelector(".multiselect-dropdown-button span:first-child");
    const selectedItems = dropdownContainer.querySelectorAll(".multiselect-dropdown-list-item input[type=\"checkbox\"]:checked");
    if (selectedItems.length === 0) {
        button.textContent = "Selecionar Técnicos";
        button.classList.add("placeholder");
    } else if (selectedItems.length === 1) {
        button.textContent = selectedItems[0].value;
        button.classList.remove("placeholder");
    } else {
        button.textContent = `${selectedItems.length} técnicos selecionados`;
        button.classList.remove("placeholder");
    }
  }

  // Fechar dropdown se clicar fora
  document.addEventListener("click", () => {
    document.querySelectorAll(".multiselect-dropdown.open").forEach(dropdown => {
        dropdown.classList.remove("open");
    });
  });

  // --- MODIFICAÇÃO: Função aplicarDadosServicoExecutado ---
  function aplicarDadosServicoExecutado(servicoItem, servicoExecutado) {
    // MODIFICAÇÃO: Lógica para o novo dropdown multi-select
    const dropdownContainer = servicoItem.querySelector(".multiselect-dropdown");
    if (dropdownContainer) {
        const checkboxesTecnicos = dropdownContainer.querySelectorAll("input[type=\"checkbox\"]");
        checkboxesTecnicos.forEach(checkbox => {
            checkbox.checked = false;
            if (servicoExecutado.tecnicos && servicoExecutado.tecnicos.includes(checkbox.value)) {
                checkbox.checked = true;
                checkbox.closest(".multiselect-dropdown-list-item").classList.add("selected");
            }
            checkbox.disabled = true; // Desabilitar após salvar
        });
        atualizarTextoBotaoDropdown(dropdownContainer);
        // Desabilitar o botão do dropdown também
        const dropdownButton = dropdownContainer.querySelector(".multiselect-dropdown-button");
        if (dropdownButton) dropdownButton.disabled = true;
    }

    // MODIFICAÇÃO: Lógica para o novo select de status
    const statusSelect = servicoItem.querySelector(".status-selection select");
    if (statusSelect) {
        statusSelect.value = servicoExecutado.status || "";
        statusSelect.disabled = true;
    }

    const observacaoTextarea = servicoItem.querySelector(".observacao-servico textarea");
    if (observacaoTextarea) {
        observacaoTextarea.value = servicoExecutado.observacao || "";
        observacaoTextarea.disabled = true;
    }

    const btnSalvarServicoIndividual = servicoItem.querySelector(".btn-salvar-servico-individual");
    if (btnSalvarServicoIndividual) {
        btnSalvarServicoIndividual.disabled = true;
        btnSalvarServicoIndividual.textContent = "Salvo";
        btnSalvarServicoIndividual.classList.remove("btn-success");
        btnSalvarServicoIndividual.classList.add("btn-secondary");
        // ADIÇÃO: Animação de feedback no botão
        btnSalvarServicoIndividual.style.transform = "scale(0.95)";
        setTimeout(() => { btnSalvarServicoIndividual.style.transform = "scale(1)"; }, 200);
    }
  }

  // --- MODIFICAÇÃO: Função preencherListaServicos ---
  function preencherListaServicos(servicosTexto, tecnicosDaOS, servicosExecutadosFirebase) {
    listaServicos.innerHTML = "";
    const servicos = servicosTexto.split("\n").filter((s) => s.trim() !== "");

    if (servicos.length === 0) {
      listaServicos.innerHTML = "<p class=\"text-muted p-3\">Nenhum serviço específico cadastrado.</p>"; // ADIÇÃO: Classe para estilização
      return;
    }

    let tecnicosDisponiveis = [];
    if (Array.isArray(tecnicosDaOS) && tecnicosDaOS.length > 0) {
        tecnicosDisponiveis = tecnicosDaOS;
    } else if (typeof tecnicosDaOS === "string" && tecnicosDaOS.trim() !== "" && tecnicosDaOS !== "N/A") {
        tecnicosDisponiveis = tecnicosDaOS.split(",").map(t => t.trim()).filter(t => t !== "");
    }
    // Tenta pegar da OS geral se não houver específicos para o serviço
    if (tecnicosDisponiveis.length === 0 && tecnicosOS.textContent && tecnicosOS.textContent !== "N/A"){
        tecnicosDisponiveis = tecnicosOS.textContent.split(", ").map(t => t.trim()).filter(t => t !== "");
    }

    servicos.forEach((servicoDescricao, index) => {
      const servicoId = `servico-${index}`;
      const servicoItem = document.createElement("div");
      // MODIFICAÇÃO: Usar a classe de `relatorio_enhancements.css` ou `additional.css` se já estiver estilizada
      servicoItem.className = "service-item"; // A classe base, estilos adicionais virão do CSS
      servicoItem.id = servicoId;

      const descricaoElement = document.createElement("p");
      descricaoElement.className = "service-description"; // Usar classes para estilizar
      descricaoElement.textContent = servicoDescricao;
      servicoItem.appendChild(descricaoElement);

      // MODIFICAÇÃO: Layout de duas colunas
      const serviceItemLayoutContainer = document.createElement("div");
      serviceItemLayoutContainer.className = "service-item-layout-container"; // Para Grid ou Flex

      const leftColumnDiv = document.createElement("div");
      leftColumnDiv.className = "service-item-left-column";

      const rightColumnDiv = document.createElement("div");
      rightColumnDiv.className = "service-item-right-column";

      // Adicionar descrição à coluna esquerda
      leftColumnDiv.appendChild(descricaoElement);

      // Adicionar Observação à coluna esquerda
      const observacaoDiv = document.createElement("div");
      observacaoDiv.className = "observacao-servico form-group mt-2"; // mt-2 pode ser ajustado/removido pelo CSS
      const observacaoLabel = document.createElement("label");
      observacaoLabel.htmlFor = `${servicoId}-observacao`;
      observacaoLabel.textContent = "Observação (opcional):";
      const observacaoTextarea = document.createElement("textarea");
      observacaoTextarea.className = "form-control";
      observacaoTextarea.id = `${servicoId}-observacao`;
      observacaoTextarea.rows = 4; // Aumentar rows para o campo de observação maior
      observacaoTextarea.placeholder = "Detalhes adicionais sobre este serviço...";
      observacaoDiv.appendChild(observacaoLabel);
      observacaoDiv.appendChild(observacaoTextarea);
      leftColumnDiv.appendChild(observacaoDiv);

      // Adicionar Técnicos à coluna direita
      const tecnicosSelectionDiv = document.createElement("div");
      tecnicosSelectionDiv.className = "tecnicos-selection form-group";
      const tecnicosLabel = document.createElement("label");
      tecnicosLabel.textContent = "Técnico(s) executor(es):";
      tecnicosLabel.className = "d-block mb-1";
      tecnicosSelectionDiv.appendChild(tecnicosLabel);
      let tecnicosJaSelecionadosParaEsteServico = [];
      if (servicosExecutadosFirebase) {
        for (const key in servicosExecutadosFirebase) {
          const se = servicosExecutadosFirebase[key];
          if (se.descricao === servicoDescricao && se.tecnicos) {
            tecnicosJaSelecionadosParaEsteServico = se.tecnicos;
            break;
          }
        }
      }
      const dropdownTecnicos = criarDropdownTecnicos(servicoId, tecnicosDisponiveis, tecnicosJaSelecionadosParaEsteServico);
      tecnicosSelectionDiv.appendChild(dropdownTecnicos);
      rightColumnDiv.appendChild(tecnicosSelectionDiv);

      // Adicionar Status à coluna direita
      const statusSelectionDiv = document.createElement("div");
      statusSelectionDiv.className = "status-selection form-group mt-2"; // mt-2 para espaçamento vertical na coluna direita
      const statusLabel = document.createElement("label");
      statusLabel.textContent = "Status do serviço:";
      statusLabel.className = "d-block mb-1";
      statusLabel.htmlFor = `${servicoId}-status-select`;
      statusSelectionDiv.appendChild(statusLabel);
      const statusSelect = document.createElement("select");
      statusSelect.className = "form-control";
      statusSelect.name = `${servicoId}-status`;
      statusSelect.id = `${servicoId}-status-select`;
      const options = [
          { value: "", text: "Selecione...", defaultSelected: true, disabled: true },
          { value: "Resolvido", text: "Resolvido" },
          { value: "Pendente", text: "Pendente" },
          { value: "Não Realizado", text: "Não Realizado" }
      ];
      options.forEach(opt => {
          const optionElement = document.createElement("option");
          optionElement.value = opt.value;
          optionElement.textContent = opt.text;
          if (opt.defaultSelected) optionElement.selected = true;
          if (opt.disabled) optionElement.disabled = true;
          statusSelect.appendChild(optionElement);
      });
      statusSelectionDiv.appendChild(statusSelect);
      rightColumnDiv.appendChild(statusSelectionDiv);

      // Adicionar Botão Salvar à coluna direita
      const btnSalvarServicoIndividual = document.createElement("button");
      btnSalvarServicoIndividual.className = "btn btn-primary btn-sm mt-3 btn-salvar-servico-individual";
      btnSalvarServicoIndividual.textContent = "Salvar Serviço";
      btnSalvarServicoIndividual.dataset.servicoDescricao = servicoDescricao;
      btnSalvarServicoIndividual.dataset.servicoItemId = servicoId;
      rightColumnDiv.appendChild(btnSalvarServicoIndividual);

      // Montar o layout no item de serviço
      serviceItemLayoutContainer.appendChild(leftColumnDiv);
      serviceItemLayoutContainer.appendChild(rightColumnDiv);
      servicoItem.appendChild(serviceItemLayoutContainer);

      listaServicos.appendChild(servicoItem);

      // Aplicar dados se o serviço já foi salvo anteriormente
      if (servicosExecutadosFirebase) {
        for (const key in servicosExecutadosFirebase) {
          const servicoExecutado = servicosExecutadosFirebase[key];
          if (servicoExecutado.descricao === servicoDescricao) {
            aplicarDadosServicoExecutado(servicoItem, servicoExecutado);
            break;
          }
        }
      }
    });

    // Adicionar event listeners aos botões de salvar individuais
    document.querySelectorAll(".btn-salvar-servico-individual").forEach(button => {
      if (!button.disabled) { // Só adiciona se não estiver já desabilitado (ex: OS concluída)
        button.addEventListener("click", async (event) => {
          const targetButton = event.currentTarget;
          if (targetButton.disabled) return;

          const itemServicoId = targetButton.dataset.servicoItemId;
          const descricaoServico = targetButton.dataset.servicoDescricao;
          const servicoItemElement = document.getElementById(itemServicoId);

          // MODIFICAÇÃO: Obter técnicos do novo dropdown
          const dropdownContainer = servicoItemElement.querySelector(".multiselect-dropdown");
          const tecnicosSelecionados = Array.from(dropdownContainer.querySelectorAll("input[type=\"checkbox\"]:checked"))
                                           .map(cb => cb.value);
          const statusSelecionado = servicoItemElement.querySelector(".status-selection select").value;
          console.log("[relatorio.js] Status selecionado para serviço individual:", statusSelecionado, "para o serviço:", descricaoServico); // LOG ADICIONADO
          const observacao = servicoItemElement.querySelector(".observacao-servico textarea")?.value;

          // Validações (manter e melhorar feedback se necessário)
          if (tecnicosSelecionados.length === 0) {
            mostrarMensagem("Por favor, selecione ao menos um técnico para o serviço.", "erro");
            // ADIÇÃO: Foco no dropdown com erro
            dropdownContainer.classList.add("error-highlight");
            setTimeout(() => dropdownContainer.classList.remove("error-highlight"), 2000);
            return;
          }
          if (!statusSelecionado) { // Verifica se o valor é vazio (o "Selecione..." tem value="")
            mostrarMensagem("Por favor, selecione o status do serviço.", "erro");
            // ADIÇÃO: Foco no grupo de status com erro
            const statusGroup = servicoItemElement.querySelector(".status-selection select");
            statusGroup.classList.add("error-highlight"); // Pode ser necessário um estilo CSS para .error-highlight em select
            setTimeout(() => statusGroup.classList.remove("error-highlight"), 2000);
            return;
          }
          
          const servicoData = {
            descricao: descricaoServico,
            tecnicos: tecnicosSelecionados,
            status: statusSelecionado,
            observacao: observacao || ""
          };

          try {
            targetButton.disabled = true;
            targetButton.textContent = "Salvando...";
            // ADIÇÃO: Animação de carregamento no botão
            targetButton.classList.add("btn-loading"); 

            const resultado = await salvarServicoIndividual(ordemId, servicoData);
            
            mostrarMensagem("Serviço salvo com sucesso!", "sucesso");
            aplicarDadosServicoExecutado(servicoItemElement, servicoData); 

            if (!dadosOrdemAtual.servicos_executados) {
              dadosOrdemAtual.servicos_executados = {};
            }
            const chaveServicoFirebase = descricaoServico.replace(/[^a-zA-Z0-9]/g, "_");
            dadosOrdemAtual.servicos_executados[chaveServicoFirebase] = servicoData;

          } catch (error) {
            console.error("Erro ao salvar serviço individual:", error);
            mostrarMensagem(`Erro ao salvar serviço: ${error.message || error}`, "erro");
            targetButton.disabled = false;
            targetButton.textContent = "Salvar Serviço";
          } finally {
            // ADIÇÃO: Remover animação de carregamento
            targetButton.classList.remove("btn-loading");
          }
        });
      }
    });
  }

  // --- Função desabilitarEdicaoGeralOS (MODIFICAÇÃO) ---
  function desabilitarEdicaoGeralOS() {
    if (btnIniciarServico) btnIniciarServico.disabled = true;
    if (btnFinalizarServico) btnFinalizarServico.disabled = true;
    if (informacoesTextarea) informacoesTextarea.disabled = true;

    document.querySelectorAll(".btn-salvar-servico-individual").forEach(button => {
        button.disabled = true;
        if (!button.textContent.includes("Salvo")) {
            button.textContent = "Bloqueado";
            button.classList.remove("btn-success");
            button.classList.add("btn-secondary");
        }
    });

    // MODIFICAÇÃO: Desabilitar dropdowns e outros inputs
    document.querySelectorAll(".service-item input, .service-item textarea, .service-item .multiselect-dropdown-button").forEach(input => {
        input.disabled = true;
    });
    document.querySelectorAll(".multiselect-dropdown").forEach(dd => dd.classList.add("disabled"));

    mostrarMensagem("Esta OS já foi finalizada e não pode mais ser editada.", "info");
  }

  // --- Event Listeners (Manter e adaptar conforme necessário) ---
  if (btnIniciarServico) {
    btnIniciarServico.addEventListener("click", async () => {
      // ... (lógica original, adicionar feedback visual se desejado)
      try {
        btnIniciarServico.disabled = true;
        btnIniciarServico.textContent = "Iniciando...";
        btnIniciarServico.classList.add("btn-loading"); // ADIÇÃO: Feedback visual
        const dataInicio = new Date().toISOString();
        await atualizarStatusOrdem(ordemId, { status: "Em andamento", dataInicio });
        mostrarMensagem("Serviço iniciado com sucesso! A página será recarregada.", "sucesso");
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error("Erro ao iniciar serviço:", error);
        mostrarMensagem(`Erro ao iniciar serviço: ${error.message}`, "erro");
        btnIniciarServico.disabled = false;
        btnIniciarServico.textContent = "Iniciar Serviço";
      } finally {
        btnIniciarServico.classList.remove("btn-loading"); // ADIÇÃO: Remover feedback
      }
    });
  }

  if (btnFinalizarServico) {
    btnFinalizarServico.addEventListener("click", () => {
      // ADIÇÃO: Animação ao abrir modal
      finalizacaoModal.style.display = "flex";
      setTimeout(() => finalizacaoModal.classList.add("show"), 10); // Classe `show` controla opacidade/transform no CSS
    });
  }

  if (btnCancelarFinalizacao) {
    btnCancelarFinalizacao.addEventListener("click", () => {
      finalizacaoModal.classList.remove("show");
      setTimeout(() => finalizacaoModal.style.display = "none", 300); // Tempo para transição CSS
    });
  }
  
  // --- Função finalizarServicoComStatus (MODIFICAÇÃO) ---
  async function finalizarServicoComStatus(novoStatus) {
    let todosServicosTexto = "";
    const servicosItems = listaServicos.querySelectorAll(".service-item");
    let todosServicosPreenchidosEValidos = true;

    if (servicosItems.length > 0) {
        for (const item of servicosItems) {
            const descricao = item.querySelector(".service-description").textContent;
            // MODIFICAÇÃO: Obter técnicos do novo dropdown
            const dropdownContainer = item.querySelector(".multiselect-dropdown");
            const tecnicos = Array.from(dropdownContainer.querySelectorAll("input[type=\"checkbox\"]:checked")).map(cb => cb.value).join(", ");
            const status = item.querySelector(".status-selection select")?.value; // CORRIGIDO para ler do select
            const obs = item.querySelector(".observacao-servico textarea").value;

            // Validação mais robusta: verifica se o serviço foi salvo (botão "Salvo") ou se está preenchido
            const btnSalvar = item.querySelector(".btn-salvar-servico-individual");
            const isServicoSalvo = btnSalvar && btnSalvar.disabled && btnSalvar.textContent === "Salvo";

            if (!isServicoSalvo) { // Se não está salvo, precisa estar preenchido
                if (!status) {
                    todosServicosPreenchidosEValidos = false;
                    mostrarMensagem(`O serviço "${descricao}" precisa ter um status selecionado.`, "erro");
                    item.querySelector(".status-selection").classList.add("error-highlight");
                    setTimeout(() => item.querySelector(".status-selection").classList.remove("error-highlight"), 2500);
                    break; 
                }
                if (!tecnicos || tecnicos.length === 0) {
                    todosServicosPreenchidosEValidos = false;
                    mostrarMensagem(`O serviço "${descricao}" precisa ter ao menos um técnico selecionado.`, "erro");
                    dropdownContainer.classList.add("error-highlight");
                    setTimeout(() => dropdownContainer.classList.remove("error-highlight"), 2500);
                    break; 
                }
            }

            todosServicosTexto += `Serviço: ${descricao}\n`;
            todosServicosTexto += `Técnicos: ${tecnicos || (isServicoSalvo ? "(Conforme salvo)" : "Nenhum selecionado")}\n`;
            todosServicosTexto += `Status: ${status || (isServicoSalvo ? "(Conforme salvo)" : "Não preenchido")}\n`;
            if (obs) todosServicosTexto += `OBS: ${obs}\n`;
            todosServicosTexto += "\n---\n\n";
        }

        if (!todosServicosPreenchidosEValidos) {
            // A mensagem de erro específica já foi mostrada dentro do loop
            return;
        }
    } else {
        todosServicosTexto = "Nenhum serviço específico detalhado.";
    }
    
    const informacoesAdicionais = informacoesTextarea.value.trim();
    const dataFimAtual = new Date().toISOString();

    const dadosParaAtualizar = {
      status: novoStatus,
      realizado: todosServicosTexto.trim(),
      pendencias: informacoesAdicionais,
      dataFim: dataFimAtual
    };

    try {
      if(btnFinalizado) btnFinalizado.disabled = true;
      if(btnPendenciasModal) btnPendenciasModal.disabled = true;
      // ADIÇÃO: Feedback visual nos botões do modal
      const activeModalButton = (novoStatus === "Concluído") ? btnFinalizado : btnPendenciasModal;
      if (activeModalButton) activeModalButton.classList.add("btn-loading");

      await atualizarStatusOrdem(ordemId, dadosParaAtualizar);
      mostrarMensagem(`OS marcada como "${novoStatus}" com sucesso! A página será recarregada.`, "sucesso");
      finalizacaoModal.classList.remove("show");
      setTimeout(() => {
          finalizacaoModal.style.display = "none";
          window.location.reload();
      }, 1500);
    } catch (error) {
      console.error(`Erro ao marcar OS como ${novoStatus}:`, error);
      mostrarMensagem(`Erro ao finalizar OS: ${error.message}`, "erro");
      if(btnFinalizado) btnFinalizado.disabled = false;
      if(btnPendenciasModal) btnPendenciasModal.disabled = false;
    } finally {
        if(btnFinalizado) btnFinalizado.classList.remove("btn-loading");
        if(btnPendenciasModal) btnPendenciasModal.classList.remove("btn-loading");
    }
  }

  if (btnFinalizado) {
    btnFinalizado.addEventListener("click", () => finalizarServicoComStatus("Concluído"));
  }

  if (btnPendenciasModal) {
    btnPendenciasModal.addEventListener("click", () => finalizarServicoComStatus("Gerou Pendências"));
  }

  // --- Carregamento de Dados e Arquivos (manter e adaptar) ---
  async function carregarDadosOS() {
    // ... (lógica original de carregarDadosOS)
    // Garantir que `servicosContainer.style.animation = "fadeInSmooth 0.5s ease-out forwards;"`
    // seja aplicado quando o container é exibido, ou que a classe com a animação seja adicionada.
    // O CSS já tem `@keyframes fadeInSmooth` e `#servicosContainer { animation: ... }`
    // então deve funcionar se o display for alterado de none para block/flex.
    try {
      const urlParams = new URLSearchParams(window.location.search);
      ordemId = urlParams.get("id");
      slug = urlParams.get("slug");

      if (!ordemId && !slug) {
        mostrarMensagem("Ordem de serviço não encontrada (ID ou Slug ausente na URL).", "erro");
        // Ocultar tudo se não houver OS
        if(document.getElementById("dadosOS")) document.getElementById("dadosOS").style.display = "none";
        return;
      }

      let ordem;
      if (slug) {
        ordem = await getOrdemPorSlug(slug);
        if (ordem && ordem.id) {
          ordemId = ordem.id;
        } else {
          throw new Error("Erro ao buscar ordem pelo slug ou ID não retornado.");
        }
      } else if (ordemId) {
        ordem = await getOrdemPorId(ordemId);
        if (!ordem || !ordem.id) {
          throw new Error("Erro ao buscar ordem pelo ID ou ID não retornado.");
        }
      } else {
        mostrarMensagem("Parâmetro ID ou Slug não encontrado na URL.", "erro");
        if(document.getElementById("dadosOS")) document.getElementById("dadosOS").style.display = "none";
        return;
      }

      dadosOrdemAtual = ordem;
      
      numeroOS.textContent = ordem.numeroOS ? `#${ordem.numeroOS}` : (ordemId ? `#${ordemId.substring(0, 8)}` : "N/A");
      clienteOS.textContent = ordem.CL || ordem.clienteNome || "N/A";
      enderecoOS.textContent = ordem.ED || ordem.localEndereco || ordem.clienteEndereco || "N/A";
      cidadeOS.textContent = ordem.CD || ordem.localCidade || ordem.clienteCidade || "N/A";

      let prestadoresTexto = "N/A";
      if (Array.isArray(ordem.prestadores) && ordem.prestadores.length > 0) {
        prestadoresTexto = ordem.prestadores.join(", ");
      } else if (Array.isArray(ordem.PS) && ordem.PS.length > 0) {
        prestadoresTexto = ordem.PS.join(", ");
      } else if (typeof ordem.PS === "string") {
        prestadoresTexto = ordem.PS;
      }
      tecnicosOS.textContent = prestadoresTexto;
      statusOS.textContent = ordem.STS || ordem.status || "Não iniciada";
      observacoesOS.textContent = ordem.OBS || ordem.observacoes || "Nenhuma observação registrada.";
      agendamentoInicialOS.textContent = formatarData(ordem.agendamentoInicial || ordem.AI);
      agendamentoFinalOS.textContent = formatarData(ordem.agendamentoFinal || ordem.AF);
      dataSolicitacaoOS.textContent = formatarData(ordem.dataSolicitacao || ordem.DTS);
      responsavelOS.textContent = ordem.RSP || ordem.responsavel || "N/A";

      if (ordem.STS === "Não iniciada" || ordem.status === "Não iniciada") {
        iniciarServicoDiv.style.display = "block";
        servicosContainer.style.display = "none";
        if (btnFinalizarServico) btnFinalizarServico.style.display = "none";
      } else {
        iniciarServicoDiv.style.display = "none";
        servicosContainer.style.display = "block"; // A animação CSS deve atuar aqui
        if (btnFinalizarServico) {
            if (ordem.STS === "Em andamento" || ordem.status === "Em andamento") {
                 btnFinalizarServico.style.display = "block"; // Ou 'inline-block' / 'flex' dependendo do CSS
                 btnFinalizarServico.disabled = false;
            } else { 
                 btnFinalizarServico.style.display = "block"; 
            }
        }
        preencherListaServicos(
            ordem.SR || ordem.servicos || "", 
            ordem.PS || ordem.prestadores || [], 
            dadosOrdemAtual.servicos_executados 
        );
        await carregarArquivosServico(ordemId);
      }

      if (ordem.STS === "Concluído" || ordem.STS === "Gerou Pendências" || ordem.status === "Concluído" || ordem.status === "Gerou Pendências") {
        desabilitarEdicaoGeralOS(); 
      }
      
      if(btnAbrirNotion && ordem.notionUrl) {
        btnAbrirNotion.onclick = () => window.open(ordem.notionUrl, "_blank");
        btnAbrirNotion.disabled = false;
      } else if (btnAbrirNotion) {
        btnAbrirNotion.disabled = true;
        btnAbrirNotion.title = "Link do Notion não disponível para esta OS."; // ADIÇÃO: Tooltip
      }

    } catch (error) {
      console.error("Erro detalhado ao carregar dados da OS:", error);
      mostrarMensagem(`Erro ao carregar dados da OS: ${error.message}`, "erro");
      if(document.getElementById("dadosOS")) document.getElementById("dadosOS").style.display = "none";
    }
  }

  async function carregarArquivosServico(idDaOrdem) {
    // ... (lógica original de carregarArquivosServico)
    // Nenhuma alteração principal necessária, mas garantir que os estilos em `relatorio_enhancements.css`
    // para `.arquivos-grid` e `.arquivo-item` sejam aplicados corretamente.
    if (!idDaOrdem) return;
    listaArquivosServico.innerHTML = "";
    loadingArquivosMsg.style.display = "block";
    noArquivosMsg.style.display = "none";
    try {
      const arquivos = await getArquivosServicoPorOrdemId(idDaOrdem);
      loadingArquivosMsg.style.display = "none";
      if (arquivos && arquivos.length > 0) {
        arquivos.forEach(arquivo => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "arquivo-item"; // Classe para estilização CSS
          let tipoArquivo = "desconhecido";
          const nomeLower = arquivo.name.toLowerCase();
          if (nomeLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) tipoArquivo = "imagem";
          else if (nomeLower.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i)) tipoArquivo = "video";

          if (tipoArquivo === "imagem") {
            const img = document.createElement("img");
            img.src = arquivo.url;
            img.alt = arquivo.name;
            img.loading = "lazy"; // Bom para performance
            itemDiv.appendChild(img);
            itemDiv.addEventListener("click", () => abrirModalArquivo(arquivo.url, "imagem"));
          } else if (tipoArquivo === "video") {
            // Usar um ícone de play sobre uma miniatura ou cor de fundo
            itemDiv.classList.add("arquivo-item-video"); // Classe para estilização específica
            const playIcon = document.createElement("i");
            playIcon.className = "fas fa-play play-icon"; // FontAwesome
            itemDiv.appendChild(playIcon);
            // Opcional: Adicionar nome do arquivo como texto pequeno
            const fileNameSpan = document.createElement("span");
            fileNameSpan.className = "arquivo-item-filename";
            fileNameSpan.textContent = arquivo.name;
            itemDiv.appendChild(fileNameSpan);
            itemDiv.addEventListener("click", () => abrirModalArquivo(arquivo.url, "video"));
          } else {
            itemDiv.classList.add("arquivo-item-outro"); // Classe para estilização específica
            const fileIcon = document.createElement("i");
            fileIcon.className = "fas fa-file-alt"; // FontAwesome para arquivo genérico
            itemDiv.appendChild(fileIcon);
            const fileNameSpan = document.createElement("span");
            fileNameSpan.className = "arquivo-item-filename";
            fileNameSpan.textContent = arquivo.name;
            itemDiv.appendChild(fileNameSpan);
            itemDiv.addEventListener("click", () => window.open(arquivo.url, "_blank"));
            itemDiv.title = `Abrir/Baixar: ${arquivo.name}`;
          }
          listaArquivosServico.appendChild(itemDiv);
        });
      } else {
        noArquivosMsg.style.display = "block";
      }
    } catch (error) {
      console.error("Erro ao carregar arquivos de serviço:", error);
      loadingArquivosMsg.style.display = "none";
      mostrarMensagem(`Erro ao buscar arquivos da OS: ${error.message}`, "erro");
      noArquivosMsg.textContent = "Erro ao carregar arquivos.";
      noArquivosMsg.style.display = "block";
      noArquivosMsg.style.color = "red";
    }
  }

  function abrirModalArquivo(url, tipo) {
    // ... (lógica original de abrirModalArquivo)
    // Garantir que as classes .modal.show e .modal-arquivo sejam usadas para as animações CSS
    arquivoModalContent.innerHTML = ""; // Limpar conteúdo anterior
    if (tipo === "imagem") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Visualização de Arquivo";
      arquivoModalContent.appendChild(img);
    } else if (tipo === "video") {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.autoplay = true; // Considerar remover autoplay se for intrusivo
      video.style.maxWidth = "100%";
      video.style.maxHeight = "100%";
      arquivoModalContent.appendChild(video);
    }
    arquivoModal.style.display = "flex";
    setTimeout(() => arquivoModal.classList.add("show"), 10);
  }

  function fecharModalArquivo() {
    // ... (lógica original de fecharModalArquivo)
    arquivoModal.classList.remove("show");
    setTimeout(() => {
      arquivoModal.style.display = "none";
      arquivoModalContent.innerHTML = ""; // Limpar para liberar memória
    }, 300); // Tempo da transição CSS
  }

  // Event listener para fechar modais ao clicar fora (manter)
  window.addEventListener("click", (event) => {
    if (event.target === finalizacaoModal) {
      finalizacaoModal.classList.remove("show");
      setTimeout(() => finalizacaoModal.style.display = "none", 300);
    }
    if (event.target === arquivoModal) {
      fecharModalArquivo();
    }
  });

  if (btnFecharArquivoModal) {
    btnFecharArquivoModal.addEventListener("click", fecharModalArquivo);
  }

  // Carregar dados da OS ao iniciar
  await carregarDadosOS();

  // ADIÇÃO: Classe CSS para highlight de erro em inputs/selects
  // (Adicionar ao relatorio_enhancements.css ou similar)
  /*
  .error-highlight {
      border-color: var(--danger, #dc3545) !important;
      box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important;
  }
  .btn-loading {
      position: relative;
      pointer-events: none; 
      color: transparent !important; 
  }
  .btn-loading::after {
      content: "";
      display: inline-block;
      position: absolute;
      left: 50%;
      top: 50%;
      width: 1.2em; 
      height: 1.2em;
      margin-left: -0.6em;
      margin-top: -0.6em;
      border: 2px solid rgba(255,255,255,0.5);
      border-left-color: var(--white, #fff);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
      to { transform: rotate(360deg); }
  }
  */
});



// Nova função auxiliar para parsear o texto do campo "Realizado"
function parseTextoRealizadoNotion(textoRealizado) {
  if (!textoRealizado || typeof textoRealizado !== 'string' || textoRealizado.trim() === "") {
    return [];
  }

  const servicosIndividuais = [];
  // Divide pelo separador "---" ou "----" com quebras de linha, e também considera variações com espaços
  const blocosServico = textoRealizado.split(/\n\s*---\s*\n|\n\s*----\s*\n/g);

  blocosServico.forEach(bloco => {
    bloco = bloco.trim();
    if (bloco === "") return;

    const servicoDetalhes = {
        descricao: "",
        tecnicos: [],
        status: "",
        observacao: ""
    };
    const linhas = bloco.split('\n').filter(linha => linha.trim() !== "");

    linhas.forEach(linha => {
      const linhaTrimmed = linha.trim();
      if (linhaTrimmed.toLowerCase().startsWith("serviço:")) {
        servicoDetalhes.descricao = linhaTrimmed.substring("serviço:".length).trim();
      } else if (linhaTrimmed.toLowerCase().startsWith("técnicos:")) {
        servicoDetalhes.tecnicos = linhaTrimmed.substring("técnicos:".length).trim().split(',').map(t => t.trim()).filter(t => t !== "");
      } else if (linhaTrimmed.toLowerCase().startsWith("status:")) {
        servicoDetalhes.status = linhaTrimmed.substring("status:".length).trim();
      } else if (linhaTrimmed.toLowerCase().startsWith("obs:")) {
        servicoDetalhes.observacao = linhaTrimmed.substring("obs:".length).trim();
      }
    });

    // Adiciona apenas se a descrição do serviço foi encontrada
    if (servicoDetalhes.descricao) {
      servicosIndividuais.push(servicoDetalhes);
    }
  });

  return servicosIndividuais;
}



// Nova função para carregar, tratar e sincronizar serviços do campo "Realizado" do Notion
async function carregarESincronizarServicosSalvosDoNotion(ordemIdParaBusca) {
  console.log("Iniciando carregamento e sincronização de serviços salvos do Notion para OS ID:", ordemIdParaBusca);
  try {
    // Esta função getCampoRealizadoNotion() deve estar definida em services_modificado.js e acessível globalmente ou importada
    const realizadoTexto = await getCampoRealizadoNotion(ordemIdParaBusca);

    if (realizadoTexto === null || realizadoTexto.trim() === "") {
      console.log("Campo 'Realizado' está vazio ou não foi encontrado no Notion. Nenhum serviço para sincronizar.");
      return;
    }

    console.log("Texto do campo 'Realizado' obtido do Notion:", realizadoTexto);
    const servicosParseadosDoNotion = parseTextoRealizadoNotion(realizadoTexto); // Utiliza a função já adicionada
    console.log("Serviços parseados do Notion:", servicosParseadosDoNotion);

    if (servicosParseadosDoNotion.length === 0) {
      console.log("Nenhum serviço individual encontrado no parse do campo 'Realizado'.");
      return;
    }

    const servicoItemsNoDOM = document.querySelectorAll("#listaServicos .service-item");
    if (servicoItemsNoDOM.length === 0) {
        console.warn("Não há itens de serviço no DOM para sincronizar com dados do Notion.");
        return;
    }

    servicoItemsNoDOM.forEach(servicoItemDOM => {
      const descricaoServicoDOMElement = servicoItemDOM.querySelector(".service-description");
      if (!descricaoServicoDOMElement) {
        console.warn("Elemento de descrição do serviço não encontrado no item DOM:", servicoItemDOM);
        return; // Pula este item do DOM se não tiver descrição
      }
      const descricaoServicoDOM = descricaoServicoDOMElement.textContent.trim();
      const servicoNotionCorrespondente = servicosParseadosDoNotion.find(s => s.descricao.trim() === descricaoServicoDOM);

      if (servicoNotionCorrespondente) {
        console.log(`Sincronizando serviço do DOM: "${descricaoServicoDOM}" com dados do Notion.`);

        const dropdownContainer = servicoItemDOM.querySelector(".multiselect-dropdown");
        if (dropdownContainer) {
            const checkboxesTecnicos = dropdownContainer.querySelectorAll("input[type='checkbox']");
            checkboxesTecnicos.forEach(checkbox => {
                checkbox.checked = servicoNotionCorrespondente.tecnicos.includes(checkbox.value);
                checkbox.disabled = true;
                const listItem = checkbox.closest(".multiselect-dropdown-list-item");
                if (listItem) {
                    listItem.classList.toggle("selected", checkbox.checked);
                }
            });
            if (typeof atualizarTextoBotaoDropdown === "function") {
                atualizarTextoBotaoDropdown(dropdownContainer);
            }
            const dropdownButton = dropdownContainer.querySelector(".multiselect-dropdown-button");
            if (dropdownButton) dropdownButton.disabled = true;
            dropdownContainer.classList.add("disabled");
        }

        const radiosStatus = servicoItemDOM.querySelectorAll(".status-selection input[type='radio']");
        radiosStatus.forEach(radio => {
            radio.checked = (radio.value === servicoNotionCorrespondente.status);
            radio.disabled = true;
        });

        const observacaoTextarea = servicoItemDOM.querySelector(".observacao-servico textarea");
        if (observacaoTextarea) {
            observacaoTextarea.value = servicoNotionCorrespondente.observacao || "";
            observacaoTextarea.disabled = true;
        }

        const btnSalvarServicoIndividual = servicoItemDOM.querySelector(".btn-salvar-servico-individual");
        if (btnSalvarServicoIndividual) {
            btnSalvarServicoIndividual.disabled = true;
            btnSalvarServicoIndividual.textContent = "Salvo (Notion)";
            btnSalvarServicoIndividual.classList.remove("btn-primary", "btn-success"); // Remove classes de ação
            btnSalvarServicoIndividual.classList.add("btn-secondary", "disabled"); // Adiciona classes de estado salvo/desabilitado
        }
         console.log(`Serviço "${descricaoServicoDOM}" sincronizado e bloqueado com base nos dados do Notion.`);
      } else {
        console.log(`Serviço do DOM "${descricaoServicoDOM}" não encontrado nos dados parseados do Notion. Será mantido editável (ou conforme estado do Firebase/cache).`);
      }
    });

  } catch (error) {
    console.error("Erro detalhado ao carregar e sincronizar serviços salvos do Notion:", error);
    mostrarMensagem("Erro ao buscar dados de relatório do Notion. Alguns serviços podem não estar atualizados ou bloqueados corretamente.", "erro");
  }
}

