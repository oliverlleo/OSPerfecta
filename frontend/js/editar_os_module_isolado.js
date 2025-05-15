/*************************************************************************
 * editar_os_module_isolado.js
 * Módulo isolado para a funcionalidade de Edição de Ordem de Serviço.
 *************************************************************************/

(function() {
    "use strict";

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : '';

    const mostrarMensagemEditarIsolado = (mensagem, tipo = 'info') => {
        let mensagemElement = document.getElementById('isolated-mensagem-sistema');
        if (!mensagemElement) {
            mensagemElement = document.createElement('div');
            mensagemElement.id = 'isolated-mensagem-sistema';
            Object.assign(mensagemElement.style, {
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '10px 20px',
                backgroundColor: tipo === 'erro' ? '#f8d7da' : '#d4edda',
                color: tipo === 'erro' ? '#721c24' : '#155724',
                border: tipo === 'erro' ? '1px solid #f5c6cb' : '1px solid #c3e6cb',
                borderRadius: '4px',
                zIndex: '10000',
                display: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            });
            document.body.appendChild(mensagemElement);
        }
        mensagemElement.className = `isolated-mensagem isolated-mensagem-${tipo}`;
        mensagemElement.textContent = mensagem;
        mensagemElement.style.display = 'block';
        setTimeout(() => {
            if (mensagemElement) {
                mensagemElement.style.display = 'none';
            }
        }, 5000);
    };

    // Função para CARREGAR os dados da OS (mantendo a lógica original de carregamento)
    async function getOrdemDetalhadaParaCarregamento(ordemId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/gerenciamento_isolado/ordens/${ordemId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Ordem não encontrada para este ID (carregamento original)");
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao buscar detalhes da ordem (carregamento original).' }));
                    throw new Error(errorData.message || `Erro ${response.status} ao buscar detalhes da ordem (carregamento original)`);
                }
            }
            return await response.json();
        } catch (error) {
            console.error('[Carregamento Original] Erro em getOrdemDetalhadaParaCarregamento:', error);
            mostrarMensagemEditarIsolado(error.message || 'Erro ao buscar detalhes da ordem (carregamento original).', 'erro');
            throw error;
        }
    }

    // Função para ATUALIZAR/SALVAR os dados da OS (usando a nova rota dedicada)
    async function atualizarOrdemPelaRotaDedicada(ordemId, dadosParaAtualizar) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/edicao_os_dedicada/ordens/${ordemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosParaAtualizar) // Payload com notionData e firebaseData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao atualizar ordem (rota dedicada).' }));
                throw new Error(errorData.message || `Erro ${response.status} ao atualizar ordem de serviço (rota dedicada)`);
            }
            return await response.json();
        } catch (error) {
            console.error('[Edição Dedicada - Salvar] Erro em atualizarOrdemPelaRotaDedicada:', error);
            mostrarMensagemEditarIsolado(error.message || 'Erro ao atualizar ordem de serviço (rota dedicada).', 'erro');
            throw error;
        }
    }

    let clienteIdGlobalEditarIsolado = null;
    let localIdGlobalEditarIsolado = null;

    document.addEventListener("DOMContentLoaded", async () => {
        if (!document.getElementById("formEditarOS")) {
            return;
        }
        console.log("[Edição Isolada] DOM carregado. Carregamento: Original, Salvamento: Dedicado.");

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
        const statusSelect = document.getElementById("status");

        const urlParams = new URLSearchParams(window.location.search);
        const ordemId = urlParams.get("id");

        if (!ordemId) {
            if(loadingMessage) loadingMessage.textContent = "Erro: ID da Ordem de Serviço não encontrado na URL.";
            if(loadingMessage) loadingMessage.style.color = "red";
            return;
        }

        const popularSelect = (selectElement, options, valueField = 'id', textField = 'name', selectedValue = null) => {
            if (!selectElement) return;
            selectElement.innerHTML = '<option value="">Selecione...</option>';
            if (!options || !Array.isArray(options)) {
                options = []; 
            }
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option[valueField];
                optionElement.textContent = option[textField];
                if (selectedValue && String(option[valueField]) === String(selectedValue)) {
                    optionElement.selected = true;
                }
                selectElement.appendChild(optionElement);
            });
        };

        const popularMultiSelect = (selectElement, options, valueField = 'name', textField = 'name', selectedValues = []) => {
            if (!selectElement) return;
            selectElement.innerHTML = '';
            if (!options || !Array.isArray(options)) {
                console.warn("[Edição Isolada] Opções inválidas para popularMultiSelect (options):", options);
                options = [];
            }
            let effectiveSelectedValues = [];
            if (selectedValues && !Array.isArray(selectedValues)) {
                effectiveSelectedValues = [String(selectedValues)];
            } else if (Array.isArray(selectedValues)){
                effectiveSelectedValues = selectedValues.map(String);
            } else {
                console.warn("[Edição Isolada] selectedValues inválido para popularMultiSelect:", selectedValues);
            }

            options.forEach(option => {
                const optionElement = document.createElement('option');
                const val = option[valueField];
                optionElement.value = val;
                optionElement.textContent = option[textField];
                if (effectiveSelectedValues.includes(String(val))) {
                    optionElement.selected = true;
                }
                selectElement.appendChild(optionElement);
            });
        };

        async function carregarDadosOriginaisDaOS() {
            try {
                if(loadingMessage) loadingMessage.textContent = "Carregando dados da O.S. (lógica original)....";
                if(formEditarOS) formEditarOS.style.display = "none";

                const ordem = await getOrdemDetalhadaParaCarregamento(ordemId);

                if (!ordem) {
                    throw new Error("Dados da ordem não encontrados (carregamento original).");
                }

                console.log("[Carregamento Original] Dados da OS recebidos:", ordem);
                clienteIdGlobalEditarIsolado = ordem.clienteId;
                localIdGlobalEditarIsolado = ordem.localId;

                if(numeroOSInput) numeroOSInput.value = ordem.numeroOS || "-";
                if(clienteNomeInput) clienteNomeInput.value = ordem.clienteNome || "-";
                
                // CORREÇÃO: Priorizar ordem.endereco para o campo Endereço
                if(enderecoInput) enderecoInput.value = ordem.endereco || ordem.enderecoCompleto || ordem.enderecoOS || ordem.clienteEndereco || "-"; 
                if(cidadeInput) cidadeInput.value = ordem.cidade || ordem.cidadeOS || ordem.clienteCidade || "-";
                
                const opcoes = ordem.opcoes || {};

                popularSelect(localSelect, opcoes.locais || (ordem.localId ? [{id: ordem.localId, nome: ordem.localNome || 'Local Desconhecido'}] : []), 'id', 'nome', ordem.localId);
                // CORREÇÃO: Usar ordem.prestadores para os valores selecionados em popularMultiSelect
                popularMultiSelect(prestadoresSelect, opcoes.equipes || [], 'name', 'name', ordem.prestadores || []);
                popularSelect(responsavelSelect, opcoes.responsaveis || (ordem.responsavel ? [{name: ordem.responsavel}] : []), 'name', 'name', ordem.responsavel);
                popularSelect(tipoServicoSelect, opcoes.tiposServico || (ordem.tipoServico ? [{name: ordem.tipoServico}] : []), 'name', 'name', ordem.tipoServico);
                popularSelect(statusSelect, opcoes.statusOptions || (ordem.status ? [{name: ordem.status}] : []), 'name', 'name', ordem.status);

                if(agendamentoInicialInput) agendamentoInicialInput.value = ordem.agendamentoInicial ? ordem.agendamentoInicial.split("T")[0] : "";
                if(agendamentoFinalInput) agendamentoFinalInput.value = ordem.agendamentoFinal ? ordem.agendamentoFinal.split("T")[0] : "";
                if(servicosTextarea) servicosTextarea.value = ordem.servicosExecutados || ordem.servicos || "";
                if(observacoesTextarea) observacoesTextarea.value = ordem.observacoes || "";

                if(loadingMessage) loadingMessage.style.display = "none";
                if(formEditarOS) formEditarOS.style.display = "block";
                if(btnAlterar) btnAlterar.disabled = false;

            } catch (error) {
                console.error("[Carregamento Original] Erro ao carregar dados da OS:", error);
                if(loadingMessage) loadingMessage.textContent = `Erro ao carregar dados (lógica original): ${error.message}. Tente recarregar a página.`;
                if(loadingMessage) loadingMessage.style.color = "red";
                if(btnAlterar) btnAlterar.disabled = true;
            }
        }

        async function handleAlterarOSUsandoRotaDedicada(event) {
            event.preventDefault();
            if(btnAlterar) btnAlterar.disabled = true;
            if(btnAlterar) btnAlterar.textContent = "Salvando (rota dedicada)...";

            try {
                const dadosNotion = {
                    agendamentoInicial: agendamentoInicialInput ? agendamentoInicialInput.value : null,
                    agendamentoFinal: agendamentoFinalInput ? agendamentoFinalInput.value : null,
                    prestadores: prestadoresSelect ? Array.from(prestadoresSelect.selectedOptions).map(option => option.value) : [],
                    responsavel: responsavelSelect ? responsavelSelect.value : null,
                    tipoServico: tipoServicoSelect ? tipoServicoSelect.value : null,
                    servicos: servicosTextarea ? servicosTextarea.value : null,
                    observacoes: observacoesTextarea ? observacoesTextarea.value : null,
                    status: statusSelect ? statusSelect.value : null,
                };

                const dadosFirebase = {
                    ...dadosNotion,
                    clienteId: clienteIdGlobalEditarIsolado,
                    localId: localIdGlobalEditarIsolado,
                    clienteNome: clienteNomeInput ? clienteNomeInput.value : null,
                    localNome: localSelect && localSelect.selectedIndex >= 0 && localSelect.options[localSelect.selectedIndex] && localSelect.options[localSelect.selectedIndex].value !== "" ? localSelect.options[localSelect.selectedIndex].text : (document.getElementById('localNomeHidden') ? document.getElementById('localNomeHidden').value : null),
                    enderecoOS: enderecoInput ? enderecoInput.value : null,
                    cidadeOS: cidadeInput ? cidadeInput.value : null,
                    numeroOS: numeroOSInput ? numeroOSInput.value : null
                };

                const payloadCompleto = {
                    notionData: dadosNotion,
                    firebaseData: dadosFirebase
                };

                console.log("[Edição Dedicada - Salvar] Dados para atualizar:", payloadCompleto);
                await atualizarOrdemPelaRotaDedicada(ordemId, payloadCompleto);

                console.log("[Edição Dedicada - Salvar] Ordem atualizada com sucesso!");
                mostrarMensagemEditarIsolado("Ordem de Serviço atualizada com sucesso (rota dedicada)! Redirecionando...", "info");
                setTimeout(() => {
                    window.location.href = "gerenciamento.html"; 
                }, 2000);

            } catch (error) {
                console.error("[Edição Dedicada - Salvar] Erro ao atualizar OS:", error);
                mostrarMensagemEditarIsolado(`Erro ao atualizar Ordem de Serviço (rota dedicada): ${error.message}`, 'erro');
                if(btnAlterar) btnAlterar.disabled = false;
                if(btnAlterar) btnAlterar.textContent = "Alterar";
            }
        }

        if (btnAlterar) {
            btnAlterar.addEventListener("click", handleAlterarOSUsandoRotaDedicada);
        }
        
        if (formEditarOS && loadingMessage && numeroOSInput && clienteNomeInput && btnAlterar) {
            carregarDadosOriginaisDaOS();
        } else {
            console.warn("[Edição Isolada] Um ou mais elementos essenciais do formulário não foram encontrados.");
            if(loadingMessage) {
                loadingMessage.textContent = "Erro: Elementos do formulário não encontrados.";
                loadingMessage.style.color = "red";
            }
        }

        console.log("[Edição Isolada] Módulo inicializado.");
    });

})();
