// frontend/js/editar_os.js
// Lógica para a tela de Edição de Ordem de Serviço

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM carregado para editar_os.js");

    // Elementos do DOM
    const formEditarOS = document.getElementById("formEditarOS");
    const loadingMessage = document.getElementById("loadingMessage");
    const numeroOSInput = document.getElementById("numeroOS");
    const clienteNomeInput = document.getElementById("clienteNome");
    const enderecoInput = document.getElementById("endereco");
    const cidadeInput = document.getElementById("cidade");
    const localSelect = document.getElementById("local");
    const agendamentoInicialInput = document.getElementById("agendamentoInicial");
    const agendamentoFinalInput = document.getElementById("agendamentoFinal");
    const prestadoresSelect = document.getElementById("prestadores");
    const responsavelSelect = document.getElementById("responsavel");
    const tipoServicoSelect = document.getElementById("tipoServico");
    const servicosTextarea = document.getElementById("servicos");
    const observacoesTextarea = document.getElementById("observacoes");
    const btnAlterar = document.getElementById("btnAlterar");

    // Obter ID da OS da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ordemId = urlParams.get("id");

    if (!ordemId) {
        loadingMessage.textContent = "Erro: ID da Ordem de Serviço não encontrado na URL.";
        loadingMessage.style.color = "red";
        return;
    }

    console.log(`Editando OS com ID: ${ordemId}`);

    // Função para carregar dados da OS e preencher o formulário
    async function carregarDadosOS() {
        try {
            loadingMessage.textContent = "Carregando dados da O.S....";
            formEditarOS.style.display = "none"; // Esconde form enquanto carrega

            // 1. Buscar detalhes da OS (precisa implementar getOrdemDetalhada em services.js e backend)
            const ordem = await getOrdemDetalhada_isolado(ordemId); // Chamada real ao serviço
            // const ordem = null; // Placeholder

            if (!ordem) {
                throw new Error("Dados da ordem não encontrados.");
            }

            console.log("Dados da OS recebidos:", ordem);

            // 2. Preencher campos não editáveis
            numeroOSInput.value = ordem.numeroOS || "-";
            clienteNomeInput.value = ordem.clienteNome || "-"; // Assumindo que o backend retorna o nome
            enderecoInput.value = ordem.endereco || "-"; // Assumindo que o backend retorna
            cidadeInput.value = ordem.cidade || "-"; // Assumindo que o backend retorna

            // 3. Carregar e preencher campos editáveis (Locais, Equipes, etc.)
            
            // Função auxiliar para popular selects
            const popularSelect = (selectElement, options, valueField = 'id', textField = 'name', selectedValue = null) => {
                selectElement.innerHTML = '<option value="">Selecione...</option>'; // Opção padrão
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option[valueField];
                    optionElement.textContent = option[textField];
                    if (selectedValue && option[valueField] === selectedValue) {
                        optionElement.selected = true;
                    }
                    selectElement.appendChild(optionElement);
                });
            };
            
            // Função auxiliar para popular multi-select
            const popularMultiSelect = (selectElement, options, valueField = 'name', textField = 'name', selectedValues = []) => {
                selectElement.innerHTML = ''; // Limpa opções existentes
                options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option[valueField];
                    optionElement.textContent = option[textField];
                    if (selectedValues.includes(option[valueField])) {
                        optionElement.selected = true;
                    }
                    selectElement.appendChild(optionElement);
                });
            };

            // Popular selects com opções e selecionar valor atual
            popularSelect(localSelect, ordem.opcoes.locais || [], 'id', 'nome', ordem.localId);
            popularMultiSelect(prestadoresSelect, ordem.opcoes.equipes || [], 'name', 'name', ordem.prestadores || []);
            popularSelect(responsavelSelect, ordem.opcoes.responsaveis || [], 'name', 'name', ordem.responsavel);
            popularSelect(tipoServicoSelect, ordem.opcoes.tiposServico || [], 'name', 'name', ordem.tipoServico);

            // Preencher outros campos editáveis
            agendamentoInicialInput.value = ordem.agendamentoInicial ? ordem.agendamentoInicial.split("T")[0] : "";
            agendamentoFinalInput.value = ordem.agendamentoFinal ? ordem.agendamentoFinal.split("T")[0] : "";
            servicosTextarea.value = ordem.servicos || "";
            observacoesTextarea.value = ordem.observacoes || "";

            loadingMessage.style.display = "none";
            formEditarOS.style.display = "block";
            btnAlterar.disabled = false;

        } catch (error) {
            console.error("Erro ao carregar dados da OS:", error);
            loadingMessage.textContent = `Erro ao carregar dados: ${error.message}. Tente recarregar a página.`;
            loadingMessage.style.color = "red";
            btnAlterar.disabled = true;
        }
    }

    // Função para lidar com o envio do formulário (Alterar)
    async function handleAlterarOS(event) {
        event.preventDefault(); // Impede o envio padrão do formulário
        btnAlterar.disabled = true;
        btnAlterar.textContent = "Salvando...";

        try {
            // 1. Coletar dados do formulário
            const dadosParaAtualizar = {
                localId: localSelect.value,
                agendamentoInicial: agendamentoInicialInput.value || null,
                agendamentoFinal: agendamentoFinalInput.value || null,
                prestadores: Array.from(prestadoresSelect.selectedOptions).map(option => option.value),
                responsavel: responsavelSelect.value || null,
                tipoServico: tipoServicoSelect.value,
                servicos: servicosTextarea.value.trim(),
                observacoes: observacoesTextarea.value.trim(),
            };

            console.log("Dados para atualizar:", dadosParaAtualizar);

            // 2. Chamar serviço para atualizar a OS (precisa implementar atualizarOrdem em services.js e backend)
            await atualizarOrdem_isolado(ordemId, dadosParaAtualizar); // Chamada real ao serviço

            console.log("Ordem atualizada com sucesso!");
            // TODO: Mostrar mensagem de sucesso
            // alert("Ordem de Serviço atualizada com sucesso!"); // Exemplo simples
            window.location.href = "gerenciamento.html"; // Redireciona de volta para a lista

        } catch (error) {
            console.error("Erro ao atualizar OS:", error);
            // TODO: Mostrar mensagem de erro
            // alert(`Erro ao atualizar Ordem de Serviço: ${error.message}`); // Exemplo simples
            btnAlterar.disabled = false;
            btnAlterar.textContent = "Alterar";
        }
    }

    // Adicionar listener ao botão Alterar
    btnAlterar.addEventListener("click", handleAlterarOS);

    // Carregar dados iniciais da OS
    await carregarDadosOS();

    console.log("editar_os.js inicializado.");
});

