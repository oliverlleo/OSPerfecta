// frontend/js/reabrir_os.js
// Lógica para a tela de Reabertura de Ordem de Serviço

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM carregado para reabrir_os.js");

    // Elementos do DOM
    const formReabrirOS = document.getElementById("formReabrirOS");
    const loadingMessage = document.getElementById("loadingMessage");
    // Campos não editáveis (originais)
    const clienteNomeInput = document.getElementById("clienteNome");
    const enderecoInput = document.getElementById("endereco");
    const cidadeInput = document.getElementById("cidade");
    const historicoOSInput = document.getElementById("historicoOS"); // Novo campo
    // Campos editáveis (nova OS)
    const localSelect = document.getElementById("local");
    const agendamentoInicialInput = document.getElementById("agendamentoInicial");
    const agendamentoFinalInput = document.getElementById("agendamentoFinal");
    const prestadoresSelect = document.getElementById("prestadores");
    const responsavelSelect = document.getElementById("responsavel");
    const tipoServicoSelect = document.getElementById("tipoServico");
    const servicosTextarea = document.getElementById("servicos");
    const observacoesTextarea = document.getElementById("observacoes");
    const btnIncluir = document.getElementById("btnIncluir"); // Botão Incluir

    // Obter ID da OS *original* da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ordemOriginalId = urlParams.get("id");

    if (!ordemOriginalId) {
        loadingMessage.textContent = "Erro: ID da Ordem de Serviço original não encontrado na URL.";
        loadingMessage.style.color = "red";
        return;
    }

    console.log(`Reabrindo OS com base na original ID: ${ordemOriginalId}`);

    // Função para carregar dados da OS original e preparar o formulário
    async function carregarDadosOriginais() {
        try {
            loadingMessage.textContent = "Carregando dados da O.S. original...";
            formReabrirOS.style.display = "none"; // Esconde form enquanto carrega

            // 1. Buscar detalhes da OS original
            const ordemOriginal = await getOrdemDetalhada_isolado(ordemOriginalId);

            if (!ordemOriginal) {
                throw new Error("Dados da ordem original não encontrados.");
            }

            console.log("Dados da OS original recebidos:", ordemOriginal);

            // 2. Preencher campos não editáveis (Cliente, Endereço, Cidade, Histórico)
            clienteNomeInput.value = ordemOriginal.clienteNome || "-";
            enderecoInput.value = ordemOriginal.endereco || "-";
            cidadeInput.value = ordemOriginal.cidade || "-";
            historicoOSInput.value = ordemOriginal.numeroOS || "-"; // Preenche Histórico com Nº OS original

            // 3. Carregar opções para campos editáveis (Locais, Equipes, etc.) - SEM pré-selecionar
            
            // Função auxiliar para popular selects (igual a editar_os.js)
            const popularSelect = (selectElement, options, valueField = 'id', textField = 'name') => {
                selectElement.innerHTML = '<option value="">Selecione...</option>';
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option[valueField];
                    optionElement.textContent = option[textField];
                    selectElement.appendChild(optionElement);
                });
            };
            
            // Função auxiliar para popular multi-select (igual a editar_os.js)
            const popularMultiSelect = (selectElement, options, valueField = 'name', textField = 'name') => {
                selectElement.innerHTML = '';
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option[valueField];
                    optionElement.textContent = option[textField];
                    selectElement.appendChild(optionElement);
                });
            };

            // Popular selects com opções (usando as opções carregadas com a OS original)
            popularSelect(localSelect, ordemOriginal.opcoes.locais || [], 'id', 'nome');
            popularMultiSelect(prestadoresSelect, ordemOriginal.opcoes.equipes || [], 'name', 'name');
            popularSelect(responsavelSelect, ordemOriginal.opcoes.responsaveis || [], 'name', 'name');
            popularSelect(tipoServicoSelect, ordemOriginal.opcoes.tiposServico || [], 'name', 'name');

            // Limpar campos editáveis que não devem herdar valor
            agendamentoInicialInput.value = "";
            agendamentoFinalInput.value = "";
            servicosTextarea.value = "";
            observacoesTextarea.value = "";

            loadingMessage.style.display = "none";
            formReabrirOS.style.display = "block";
            btnIncluir.disabled = false;

        } catch (error) {
            console.error("Erro ao carregar dados da OS original:", error);
            loadingMessage.textContent = `Erro ao carregar dados: ${error.message}. Tente recarregar a página.`;
            loadingMessage.style.color = "red";
            btnIncluir.disabled = true;
        }
    }

    // Função para lidar com o envio do formulário (Incluir Nova OS)
    async function handleIncluirOS(event) {
        event.preventDefault();
        btnIncluir.disabled = true;
        btnIncluir.textContent = "Incluindo...";

        try {
            // 1. Coletar dados do formulário (campos editáveis + histórico)
              const dadosNovaOS = {
                // Dados da OS original para referência (Cliente ID é necessário para criar a relação)
                clienteId: (await getOrdemDetalhada_isolado(ordemOriginalId)).clienteId, // Busca o ID do cliente original usando a função isolada
                historicoOS: historicoOSInput.value, // Pega o número da OS original
                // Dados preenchidos pelo usuário para a nova OS
                localId: localSelect.value,
                agendamentoInicial: agendamentoInicialInput.value || null,
                agendamentoFinal: agendamentoFinalInput.value || null,
                prestadores: Array.from(prestadoresSelect.selectedOptions).map(option => option.value),
                responsavel: responsavelSelect.value || null,
                tipoServico: tipoServicoSelect.value,
                servicos: servicosTextarea.value.trim(),
                observacoes: observacoesTextarea.value.trim(),
                // Incluir dados fixos para o backend usar no Firebase
                clienteNome: clienteNomeInput.value, // Pega o nome do cliente do campo não editável
                endereco: enderecoInput.value, // Pega o endereço do campo não editável
                cidade: cidadeInput.value // Pega a cidade do campo não editável
            };


            console.log("Dados para incluir nova OS (reaberta):", dadosNovaOS);

            // 2. Chamar serviço para criar a nova OS reaber            // (precisa implementar criarOrdemReaberta em services.js e backend)
            await criarOrdemServico(dadosNovaOS); // Chamada à função de criação de OS padrão

            console.log("Nova Ordem (reaberta) incluída com sucesso!");
            // TODO: Mostrar mensagem de sucesso
            // alert("Nova Ordem de Serviço (reaberta) incluída com sucesso!");
            window.location.href = "gerenciamento.html"; // Redireciona de volta para a lista

        } catch (error) {
            console.error("Erro ao incluir nova OS (reaberta):", error);
            // TODO: Mostrar mensagem de erro
            // alert(`Erro ao incluir nova Ordem de Serviço: ${error.message}`);
            btnIncluir.disabled = false;
            btnIncluir.textContent = "Incluir Nova O.S.";
        }
    }

    // Adicionar listener ao botão Incluir
    btnIncluir.addEventListener("click", handleIncluirOS);

    // Carregar dados iniciais da OS original
    await carregarDadosOriginais();

    console.log("reabrir_os.js inicializado.");
});

