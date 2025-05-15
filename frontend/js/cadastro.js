// cadastro.js
// Script para a página de Cadastro de Ordem de Serviço

document.addEventListener("DOMContentLoaded", async () => {
  // Elementos do DOM
  const clienteSelect = document.getElementById("cliente"); // O select original (agora escondido)
  const clienteAutocompleteInput = document.getElementById("clienteAutocomplete"); // Novo input de texto
  const clienteResultadosDiv = document.getElementById("clienteResultados"); // Nova div para resultados
  const localSelect = document.getElementById("local");
  const enderecoInput = document.getElementById("endereco");
  const cidadeInput = document.getElementById("cidade");
  const prestadoresSelect = document.getElementById("prestadores");
  const responsavelSelect = document.getElementById("responsavel"); // Adicionado select para responsável
  const novaOrdemBtn = document.getElementById("novaOrdem");
  const cadastrarOSBtn = document.getElementById("cadastrarOS");
  const osForm = document.getElementById("osForm");
  const tipoServicoSelect = document.getElementById("tipoServico");
  const servicosTextarea = document.getElementById("servicos");
  const observacoesTextarea = document.getElementById("observacoes");

  let todosClientes = []; // Variável para armazenar a lista completa de clientes

  // Desabilitar campos inicialmente
  servicosTextarea.disabled = true;
  observacoesTextarea.disabled = true;
  localSelect.disabled = true;

  // Carregar clientes e armazenar na variável
  async function carregarClientes() {
    try {
      todosClientes = await getClientes(); // Armazena na variável
      // Limpa o select escondido e adiciona a opção padrão
      clienteSelect.innerHTML = 
        '<option value="">Selecione um cliente</option>';
      // Preenche o select escondido (necessário para o form submit e lógica existente)
      todosClientes.forEach((cliente) => {
        const option = document.createElement("option");
        option.value = cliente.id;
        option.textContent = cliente.nome;
        clienteSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      mostrarMensagem("Erro ao carregar clientes. Tente novamente.", "erro");
      todosClientes = []; // Garante que a lista esteja vazia em caso de erro
    }
  }

  // Lógica do Autocomplete para Clientes
  clienteAutocompleteInput.addEventListener("input", () => {
    const termoPesquisa = clienteAutocompleteInput.value.toLowerCase();
    clienteResultadosDiv.innerHTML = ""; // Limpa resultados anteriores
    clienteResultadosDiv.style.display = "none"; // Esconde por padrão

    if (termoPesquisa.length === 0) {
      clienteSelect.value = ""; // Limpa o select escondido se o input for limpo
      clienteSelect.dispatchEvent(new Event("change")); // Dispara change para limpar locais
      return; // Não mostra resultados se o campo estiver vazio
    }

    const clientesFiltrados = todosClientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(termoPesquisa)
    );

    if (clientesFiltrados.length > 0) {
      clienteResultadosDiv.style.display = "block"; // Mostra a div de resultados
      clientesFiltrados.forEach((cliente) => {
        const itemResultado = document.createElement("div");
        itemResultado.classList.add("autocomplete-item");
        itemResultado.textContent = cliente.nome;
        itemResultado.dataset.id = cliente.id;
        itemResultado.dataset.nome = cliente.nome;

        itemResultado.addEventListener("click", () => {
          clienteAutocompleteInput.value = itemResultado.dataset.nome;
          clienteSelect.value = itemResultado.dataset.id; // Atualiza o select escondido
          clienteResultadosDiv.innerHTML = ""; // Limpa e esconde resultados
          clienteResultadosDiv.style.display = "none";
          // Dispara o evento change no select escondido para carregar locais
          clienteSelect.dispatchEvent(new Event("change"));
        });
        clienteResultadosDiv.appendChild(itemResultado);
      });
    } else {
      clienteSelect.value = ""; // Limpa o select se não houver correspondência
    }
  });

  // Esconder resultados se clicar fora
  document.addEventListener("click", (event) => {
    if (
      !clienteAutocompleteInput.contains(event.target) &&
      !clienteResultadosDiv.contains(event.target)
    ) {
      clienteResultadosDiv.style.display = "none";
    }
  });

  // Carregar equipes
  async function carregarEquipes() {
    try {
      const equipes = await getEquipe();
      prestadoresSelect.innerHTML = ""; // Limpa opções existentes
      // Adiciona uma opção padrão não selecionável se necessário
      // const defaultOption = document.createElement("option");
      // defaultOption.value = "";
      // defaultOption.textContent = "Selecione a equipe";
      // defaultOption.disabled = true;
      // defaultOption.selected = true;
      // prestadoresSelect.appendChild(defaultOption);

      equipes.forEach((equipe) => {
        const option = document.createElement("option");
        option.value = equipe.name;
        option.textContent = equipe.name;
        prestadoresSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Erro ao carregar equipes:", error);
      mostrarMensagem("Erro ao carregar equipes. Tente novamente.", "erro");
    }
  }

  // Carregar responsáveis
  async function carregarResponsaveis() {
    try {
      const responsaveis = await getResponsaveis();
      responsavelSelect.innerHTML = 
        '<option value="">Selecione um responsável</option>'; // Opção padrão
      responsaveis.forEach((resp) => {
        const option = document.createElement("option");
        option.value = resp.name; // Assumindo que a API retorna { name: "Nome" }
        option.textContent = resp.name;
        responsavelSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Erro ao carregar responsáveis:", error);
      mostrarMensagem("Erro ao carregar responsáveis. Tente novamente.", "erro");
    }
  }

  // Função para carregar locais filtrados por cliente (agora usa clienteSelect.value)
  async function carregarLocais(clienteId) {
    localSelect.innerHTML = '<option value="">Selecione um local</option>';
    localSelect.disabled = true;
    enderecoInput.value = "";
    cidadeInput.value = "";

    if (!clienteId) {
      return;
    }

    try {
      const locais = await getLocaisPorCliente(clienteId);
      if (locais.length > 0) {
        locais.forEach((local) => {
          const option = document.createElement("option");
          option.value = local.id;
          option.textContent = `${local.nome} - ${local.endereco || "Endereço não informado"} - ${local.cidade || "Cidade não informada"}`;
          option.dataset.endereco = local.endereco || "";
          option.dataset.cidade = local.cidade || "";
          localSelect.appendChild(option);
        });
        localSelect.disabled = false;
      } else {
        localSelect.innerHTML = 
          '<option value="">Nenhum local encontrado para este cliente</option>';
      }
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
      mostrarMensagem("Erro ao carregar locais. Tente novamente.", "erro");
    }
  }

  // Evento de mudança de cliente (no select escondido, disparado programaticamente)
  clienteSelect.addEventListener("change", async () => {
    const clienteId = clienteSelect.value;
    await carregarLocais(clienteId);
  });

  // Evento de mudança de Local
  localSelect.addEventListener("change", () => {
    const selectedOption = localSelect.options[localSelect.selectedIndex];
    const localId = selectedOption.value;

    if (localId) {
      enderecoInput.value = selectedOption.dataset.endereco || "";
      cidadeInput.value = selectedOption.dataset.cidade || "";
    } else {
      enderecoInput.value = "";
      cidadeInput.value = "";
    }
  });

  // Evento de mudança de Tipo de Serviço
  tipoServicoSelect.addEventListener("change", () => {
    if (tipoServicoSelect.value) {
      servicosTextarea.disabled = false;
      observacoesTextarea.disabled = false;
    } else {
      servicosTextarea.disabled = true;
      servicosTextarea.value = "";
      observacoesTextarea.disabled = true;
      observacoesTextarea.value = "";
    }
  });

  // Evento de clique no botão Nova Ordem
  novaOrdemBtn.addEventListener("click", () => {
    osForm.reset();
    clienteAutocompleteInput.value = ""; // Limpa o input de autocomplete
    clienteSelect.value = ""; // Garante que o select escondido também seja limpo
    enderecoInput.value = "";
    cidadeInput.value = "";
    servicosTextarea.disabled = true;
    servicosTextarea.value = "";
    observacoesTextarea.disabled = true;
    observacoesTextarea.value = "";
    localSelect.innerHTML = '<option value="">Selecione um local</option>';
    localSelect.disabled = true;
    responsavelSelect.value = ""; // Limpa o select de responsável
    clienteAutocompleteInput.focus(); // Foca no novo input
  });

  // Evento de submit do formulário (validações e payload permanecem os mesmos, usando clienteSelect.value)
  osForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Validação extra: Verificar se o valor do input corresponde a um cliente válido
    // (Opcional, mas recomendado para evitar submissões com texto aleatório)
    const clienteSelecionado = todosClientes.find(
      (c) => c.id === clienteSelect.value
    );
    if (
      !clienteSelecionado ||
      clienteAutocompleteInput.value !== clienteSelecionado.nome
    ) {
      mostrarMensagem("Selecione um cliente válido da lista.", "erro");
      clienteAutocompleteInput.focus();
      return;
    }

    const clienteId = clienteSelect.value;
    const localId = localSelect.value;
    const cliente = clienteSelecionado.nome; // Usar o nome do cliente selecionado
    const endereco = enderecoInput.value;
    const cidade = cidadeInput.value;
    const agendamentoInicial = document.getElementById("agendamentoInicial").value;
    const agendamentoFinal = document.getElementById("agendamentoFinal").value;
    const servicos = servicosTextarea.value;
    const observacoes = observacoesTextarea.value;
    const tipoServico = tipoServicoSelect.value;
    const responsavel = responsavelSelect.value; // Pega o valor do responsável
    const prestadores = Array.from(prestadoresSelect.selectedOptions).map(
      (option) => option.value
    );

    if (
      !clienteId ||
      !localId ||
      !agendamentoInicial ||
      !agendamentoFinal ||
      prestadores.length === 0 ||
      !tipoServico ||
      !servicos ||
      !responsavel // Adiciona validação para responsável
    ) {
      mostrarMensagem("Preencha todos os campos obrigatórios, incluindo o Responsável.", "erro");
      return;
    }

    try {
      const response = await criarOrdemServico({
        clienteId,
        localId,
        cliente,
        endereco,
        cidade,
        agendamentoInicial,
        agendamentoFinal,
        prestadores,
        servicos,
        observacoes,
        tipoServico,
        responsavel, // Envia o responsável
      });

      let slugResponse;
      try {
        slugResponse = await criarSlug(response.id);
        console.log("Slug criado:", slugResponse);
      } catch (slugError) {
        console.error("Erro ao criar slug:", slugError);
        mostrarMensagem(
          "Ordem criada, mas houve um erro ao gerar o link do relatório.",
          "aviso"
        );
      }

      mostrarMensagem("Ordem de serviço criada com sucesso!", "sucesso");

      try {
        localStorage.removeItem("perfecta_cache_ordens");
        localStorage.removeItem("perfecta_cache_timestamp");
        console.log("Cache de ordens invalidado após criação.");
      } catch (cacheError) {
        console.error("Erro ao invalidar cache:", cacheError);
      }

      osForm.reset();
      clienteAutocompleteInput.value = ""; // Limpa o input de autocomplete
      clienteSelect.value = ""; // Limpa o select escondido
      enderecoInput.value = "";
      cidadeInput.value = "";
      servicosTextarea.disabled = true;
      servicosTextarea.value = "";
      observacoesTextarea.disabled = true;
      observacoesTextarea.value = "";
      localSelect.innerHTML = '<option value="">Selecione um local</option>';
      localSelect.disabled = true;
      responsavelSelect.value = ""; // Limpa o select de responsável
      clienteAutocompleteInput.focus();
    } catch (error) {
      console.error("Erro ao criar ordem de serviço:", error);
      mostrarMensagem("Erro ao criar ordem de serviço. Tente novamente.", "erro");
    }
  });

  // Inicialização
  await carregarClientes(); // Carrega clientes e preenche o select escondido
  await carregarEquipes();
  await carregarResponsaveis(); // Carrega os responsáveis

  // Função auxiliar para mostrar mensagens (mantida como estava)
  function mostrarMensagem(mensagem, tipo) {
    const notificationArea = document.getElementById("notification-area");
    if (!notificationArea) {
      console.error("Elemento 'notification-area' não encontrado no DOM.");
      console.log(`[${tipo.toUpperCase()}] ${mensagem}`);
      return;
    }

    const notificationDiv = document.createElement("div");
    const tipoClasse = String(tipo).toLowerCase().replace(/[^a-z0-9-_]/g, "");
    notificationDiv.classList.add("notification", tipoClasse);
    notificationDiv.textContent = mensagem;

    // Limpa mensagens anteriores antes de adicionar a nova
    // notificationArea.innerHTML = '';

    notificationArea.appendChild(notificationDiv);

    setTimeout(() => {
      if (notificationDiv.parentNode === notificationArea) {
        notificationArea.removeChild(notificationDiv);
      }
    }, 7000); // Aumentado para 7 segundos conforme solicitado anteriormente
  }
});
