// frontend/js/visualizar_os.js
// Lógica para a tela de Visualização de Ordem de Serviço (buscando dados do Notion)

document.addEventListener("DOMContentLoaded", async () => {
    const loadingMessage = document.getElementById("loadingMessage");
    // const viewOsContainer = document.getElementById("viewOsContainer"); // Não é usado para esconder/mostrar diretamente

    const urlParams = new URLSearchParams(window.location.search);
    const osId = urlParams.get("id"); // Este ID é o ID da página do Notion

    if (!osId) {
        loadingMessage.textContent = "ID da Ordem de Serviço não fornecido na URL.";
        loadingMessage.style.color = "red";
        return;
    }

    try {
        loadingMessage.textContent = "Carregando dados da O.S. do Notion...";

        // Utilizar a função getOrdemDetalhada (de services.js), que busca do Notion,
        // similar ao que a tela de edição (editar_os.js) faz.
        // Esta função deve ser garantida no services.js e no backend para buscar todos os campos necessários.
        const osData = await getOrdemDetalhada(osId);
        console.log("Dados recebidos do backend (osData):", JSON.stringify(osData, null, 2)); // DEBUG PARA VER OS DADOS COMPLETOS

        if (osData) {
            document.getElementById("numeroOS").textContent = osData.numeroOS || "N/A";
            document.getElementById("clienteNome").textContent = osData.clienteNome || "N/A";
            document.getElementById("endereco").textContent = osData.localEndereco || "N/A";
            document.getElementById("cidade").textContent = osData.localCidade || "N/A";
            
            // Para o Local/Condomínio:
            // Se getOrdemDetalhada já trouxer o nome (ex: osData.localNome), usar diretamente.
            // Senão, se trouxer localId e opcoes.locais, buscar o nome:
            let localNome = "N/A";
            if (osData.localNome) {
                localNome = osData.localNome;
            } else if (osData.localId && osData.opcoes && osData.opcoes.locais) {
                const localEncontrado = osData.opcoes.locais.find(l => l.id === osData.localId);
                if (localEncontrado) {
                    localNome = localEncontrado.nome;
                }
            }
            document.getElementById("local").textContent = localNome;

            document.getElementById("statusOS").textContent = osData.status || "N/A";
            document.getElementById("tipoServico").textContent = osData.tipoServico || "N/A";
            
            // Formatar datas para exibição
            const formatDate = (dateString) => {
                if (!dateString) return "N/A";
                // Notion pode retornar datas já formatadas ou ISO. Ajustar conforme necessário.
                // Se for ISO (ex: YYYY-MM-DDTHH:mm:ss.sssZ), converter.
                try {
                    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                } catch (e) {
                    return dateString; // Retorna a string original se não for uma data válida
                }
            };
            const formatDateTime = (dateTimeString) => {
                if (!dateTimeString) return "N/A";
                try {
                    return new Date(dateTimeString).toLocaleString('pt-BR', { timeZone: 'UTC' }); // Ajuste timeZone se necessário
                } catch (e) {
                    return dateTimeString;
                }
            };

            document.getElementById("agendamentoInicial").textContent = formatDate(osData.agendamentoInicial);
            document.getElementById("agendamentoFinal").textContent = formatDate(osData.agendamentoFinal);
            document.getElementById("dataSolicitacao").textContent = formatDateTime(osData.dataSolicitacao);
            document.getElementById("responsavel").textContent = osData.responsavel || "N/A";
            
            const prestadoresDiv = document.getElementById("prestadores");
            prestadoresDiv.innerHTML = ""; // Limpa conteúdo anterior
            if (osData.prestadores && Array.isArray(osData.prestadores) && osData.prestadores.length > 0) {
                osData.prestadores.forEach(prestador => {
                    const p = document.createElement("p");
                    p.textContent = prestador;
                    p.style.margin = "0 0 5px 0";
                    prestadoresDiv.appendChild(p);
                });
            } else {
                prestadoresDiv.textContent = "N/A";
            }

            document.getElementById("dataInicioServico").textContent = formatDateTime(osData.inicioServico);
            document.getElementById("dataFinalizado").textContent = formatDateTime(osData.dataFinalizado);
            
            // Campos de Rich Text (Serviços, Observações, Realizado, Pendências)
            // O Notion API retorna rich text como um array de objetos. 
            // A função getOrdemDetalhada no backend deve processar isso para uma string simples.
            // Se osData.servicos (etc.) já for uma string, está ok.
            document.getElementById("servicos").textContent = osData.servicos || "N/A";
            document.getElementById("observacoes").textContent = osData.observacoes || "N/A";
            document.getElementById("servicosRealizados").textContent = osData.realizado || "N/A";
            document.getElementById("pendencias").textContent = osData.pendencias || "N/A";
            document.getElementById("historicoOS").textContent = osData.historicoOS || "N/A";

            // Carregar Imagens
            await carregarImagensAnexadas(osId);

            loadingMessage.style.display = "none";
        } else {
            loadingMessage.textContent = "Ordem de Serviço não encontrada no Notion.";
            loadingMessage.style.color = "orange";
        }
    } catch (error) {
        console.error("Erro ao carregar dados da OS a partir do Notion:", error);
        loadingMessage.textContent = `Erro ao carregar dados do Notion: ${error.message}`;
        loadingMessage.style.color = "red";
    }
});

// NOTA: A função getLocalName que existia anteriormente foi removida.
// A lógica para obter o nome do local foi incorporada acima, assumindo que 
// getOrdemDetalhada(osId) retorna os dados necessários (localNome ou localId + opcoes.locais).
// É crucial que a função getOrdemDetalhada em services.js (e seu endpoint de backend correspondente)
// seja capaz de buscar todos os campos listados acima diretamente do Notion e formatá-los adequadamente
// (especialmente campos rich_text e relações como Cliente e Local).

// Adicionar event listener para o botão de voltar ao gerenciamento
document.addEventListener("DOMContentLoaded", function() {
    const btnVoltarGerenciamento = document.getElementById("btnVoltarGerenciamento");
    if (btnVoltarGerenciamento) {
        btnVoltarGerenciamento.addEventListener("click", function() {
            // Usar location.replace para evitar problemas de histórico do navegador
            window.location.replace("gerenciamento.html");
        });
    }
});

async function carregarImagensAnexadas(ordemId) {
    const container = document.getElementById("imagensAnexadasContainer");
    const loadingMsg = document.getElementById("loadingImagensMsg");
    const noImagensMsg = document.getElementById("noImagensMsg");

    if (!container) return;

    loadingMsg.style.display = "block";
    noImagensMsg.style.display = "none";
    container.innerHTML = ""; // Limpar (mas manter mensagens ocultas se possível, ou recriar)
    container.appendChild(loadingMsg);
    container.appendChild(noImagensMsg);

    try {
        // Usa a função exportada pelo services.js
        const arquivos = await getArquivosServicoPorOrdemId(ordemId);

        loadingMsg.style.display = "none";

        if (arquivos && arquivos.length > 0) {
            arquivos.forEach(arquivo => {
                // Filtra apenas imagens para exibição direta, ou mostra link para outros
                const itemDiv = document.createElement("div");
                itemDiv.style.border = "1px solid #ddd";
                itemDiv.style.padding = "5px";
                itemDiv.style.borderRadius = "4px";
                itemDiv.style.width = "150px";
                itemDiv.style.textAlign = "center";

                const nomeLower = arquivo.name.toLowerCase();
                const isImage = nomeLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

                if (isImage) {
                    const img = document.createElement("img");
                    img.src = arquivo.url;
                    img.alt = arquivo.name;
                    img.style.maxWidth = "100%";
                    img.style.height = "auto";
                    img.style.cursor = "pointer";
                    img.onclick = () => window.open(arquivo.url, "_blank");
                    itemDiv.appendChild(img);
                } else {
                    const icon = document.createElement("div");
                    icon.innerHTML = '<i class="fas fa-file" style="font-size: 48px; color: #666;"></i>';
                    itemDiv.appendChild(icon);
                }

                const link = document.createElement("a");
                link.href = arquivo.url;
                link.target = "_blank";
                link.textContent = arquivo.name;
                link.style.display = "block";
                link.style.marginTop = "5px";
                link.style.fontSize = "12px";
                link.style.overflow = "hidden";
                link.style.textOverflow = "ellipsis";
                link.style.whiteSpace = "nowrap";

                itemDiv.appendChild(link);
                container.appendChild(itemDiv);
            });
        } else {
            noImagensMsg.style.display = "block";
        }

    } catch (error) {
        console.error("Erro ao carregar imagens:", error);
        loadingMsg.style.display = "none";
        noImagensMsg.textContent = "Erro ao carregar imagens.";
        noImagensMsg.style.display = "block";
    }
}
