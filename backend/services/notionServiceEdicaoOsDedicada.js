// Servico dedicado para o fluxo de edicao de OS isolado.

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");

dotenv.config();

if (!process.env.NOTION_TOKEN) {
  console.error("CRITICAL ERROR: NOTION_TOKEN environment variable is not set. Application cannot connect to Notion.");
  throw new Error("NOTION_TOKEN is not configured.");
}

// Configuracao do Notion (isolada para este servico)
const notion = new Client({
  auth: process.env.NOTION_TOKEN || "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", // Usar a mesma forma de obter o token
});

// IDs de banco de dados (isolados ou configurados conforme necessidade)
const idos = process.env.NOTION_IDOS || "1dfd9246083e803b9abdd3366e47e523"; // ID principal das OSs
const idLocais = process.env.NOTION_ID_LOCAIS || "1ced9246083e80ba9305efcf0a0b83d0"; // ID da base de Locais/Condominios, se for diferente do idC original

/**
 * Busca detalhes de uma Ordem de Servico especifica para edicao (versao dedicada).
 * @param {string} ordemId - ID da ordem de servico (pagina do Notion).
 * @returns {Promise<Object|null>} Dados da OS ou null se nao encontrada.
 */
async function getOrdemDetalhadaDedicada(ordemId) {
    console.log(`[EdicaoDedicadaService] Buscando OS com ID: ${ordemId}`);
    try {
        const pageResponse = await notion.pages.retrieve({ page_id: ordemId });
        if (!pageResponse) {
            return null;
        }

        const props = pageResponse.properties;

        // Funcao auxiliar para extrair texto de rich_text
        const getText = (richTextArray) => richTextArray?.[0]?.plain_text || "";
        // Funcao auxiliar para extrair data
        const getDate = (dateObject) => dateObject?.start || null;
        // Funcao auxiliar para extrair selecao unica (select)
        const getSelectName = (selectObject) => selectObject?.name || "";
        // Funcao auxiliar para extrair multi-selecao (multi_select)
        const getMultiSelectNames = (multiSelectArray) => multiSelectArray?.map(option => option.name) || [];
        // Funcao auxiliar para extrair ID de relacao
        const getRelationId = (relationArray) => relationArray?.[0]?.id || null;

        let clienteNome = "";
        const clienteRelationId = getRelationId(props.Cliente?.relation);
        if (clienteRelationId) {
            const clientePage = await notion.pages.retrieve({ page_id: clienteRelationId });
            clienteNome = getText(clientePage.properties.Nome?.title);
        }

        let localNome = "";
        let localEndereco = "";
        let localCidade = "";
        const localRelationId = getRelationId(props.LOCAL?.relation); // Usando a propriedade LOCAL
        if (localRelationId) {
            const localPage = await notion.pages.retrieve({ page_id: localRelationId });
            localNome = getText(localPage.properties.Condomínio?.title); // Nome do condominio
            localEndereco = getText(localPage.properties.Endereço?.rich_text); // Endereco do condominio
            localCidade = getText(localPage.properties.Cidade?.rich_text); // Cidade do condominio
        }

        return {
            id: pageResponse.id,
            numeroOS: getText(props["Nº OS"]?.title), // Se houver campo de numero da OS
            clienteId: clienteRelationId,
            clienteNome: clienteNome,
            localId: localRelationId,
            localNome: localNome,
            enderecoCompleto: localEndereco, // Endereco direto do local
            cidade: localCidade, // Cidade direto do local
            agendamentoInicial: getDate(props["Agendamento Inicial"]?.date),
            agendamentoFinal: getDate(props["Agendamento Final"]?.date),
            tipoServico: getSelectName(props["Tipo de Serviço"]?.select),
            equipe: getMultiSelectNames(props.Equipe?.multi_select),
            responsavel: getSelectName(props.Responsável?.select),
            servicosExecutados: getText(props.Execução?.rich_text),
            observacoes: getText(props.Observações?.rich_text),
            status: getSelectName(props.Status?.status),
            // Adicionar outros campos conforme necessario para o formulario de edicao
        };

    } catch (error) {
        console.error("[EdicaoDedicadaService] Erro ao buscar ordem de servico detalhada:", error);
        throw error;
    }
}

/**
 * Atualiza os dados de uma Ordem de Servico no Notion (versao dedicada).
 * @param {string} ordemId - ID da ordem de servico (pagina do Notion).
 * @param {Object} dadosParaAtualizar - Dados a serem atualizados.
 * @returns {Promise<Object>} Resposta da API do Notion.
 */
async function atualizarDadosOsDedicada(ordemId, dadosParaAtualizar) {
    console.log(`[EdicaoDedicadaService] Atualizando OS ID: ${ordemId} com dados:`, JSON.stringify(dadosParaAtualizar, null, 2));
    
    const propertiesToUpdate = {};

    // Mapeamento dos campos do frontend para as propriedades do Notion
    if (dadosParaAtualizar.agendamentoInicial) {
        propertiesToUpdate["Agendamento Inicial"] = { date: { start: dadosParaAtualizar.agendamentoInicial.split("T")[0] } };
    }
    if (dadosParaAtualizar.agendamentoFinal) {
        propertiesToUpdate["Agendamento Final"] = { date: { start: dadosParaAtualizar.agendamentoFinal.split("T")[0] } };
    }
    if (dadosParaAtualizar.tipoServico) {
        propertiesToUpdate["Tipo de Serviço"] = { select: { name: dadosParaAtualizar.tipoServico } };
    }
    if (dadosParaAtualizar.prestadores && Array.isArray(dadosParaAtualizar.prestadores)) {
        propertiesToUpdate.Equipe = { multi_select: dadosParaAtualizar.prestadores.map(name => ({ name })) };
    }
    if (dadosParaAtualizar.responsavel) {
        propertiesToUpdate.Responsável = { select: { name: dadosParaAtualizar.responsavel } };
    }
    if (dadosParaAtualizar.servicos) { // 'servicos' no frontend, 'Execucao' no Notion
        propertiesToUpdate.Execução = { rich_text: [{ text: { content: dadosParaAtualizar.servicos } }] };
    }
    if (dadosParaAtualizar.observacoes) {
        propertiesToUpdate.Observações = { rich_text: [{ text: { content: dadosParaAtualizar.observacoes } }] };
    }
    if (dadosParaAtualizar.status) { 
        propertiesToUpdate.Status = { status: { name: dadosParaAtualizar.status } };
    }

    // Para Cliente e Local, geralmente nao se altera o ID de relacao na edicao de OS, mas sim os dados da OS em si.
    // Se for necessario alterar a relacao, o codigo abaixo pode ser adaptado.
    // if (dadosParaAtualizar.clienteId) {
    //     propertiesToUpdate.Cliente = { relation: [{ id: dadosParaAtualizar.clienteId }] };
    // }
    // if (dadosParaAtualizar.localId) {
    //     propertiesToUpdate.LOCAL = { relation: [{ id: dadosParaAtualizar.localId }] };
    // }

    if (Object.keys(propertiesToUpdate).length === 0) {
        console.log("[EdicaoDedicadaService] Nenhum dado fornecido para atualizacao.");
        return { message: "Nenhum dado fornecido para atualizacao." };
    }

    console.log("[EdicaoDedicadaService] Propriedades para atualizar no Notion:", JSON.stringify(propertiesToUpdate, null, 2));

    try {
        const notionResponse = await notion.pages.update({
            page_id: ordemId,
            properties: propertiesToUpdate,
        });
        console.log("[EdicaoDedicadaService] OS atualizada com sucesso no Notion:", notionResponse);
        return notionResponse;
    } catch (error) {
        console.error("[EdicaoDedicadaService] Erro ao atualizar OS no Notion:", error.body || error);
        throw error;
    }
}

module.exports = {
    getOrdemDetalhadaDedicada,
    atualizarDadosOsDedicada,
};
