 // services/notionService.js
// NÃO REMOVER - Serviço essencial para integração com Notion

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");

dotenv.config();

// Configuração do Notion
const notion = new Client({
  auth: process.env.NOTION_TOKEN || "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",
});

// Variáveis globais do Notion
const idC = process.env.NOTION_IDC || "1ced9246083e80ba9305efcf0a0b83d0";
const idos = process.env.NOTION_IDOS || "1dfd9246083e803b9abdd3366e47e523"; // Base de Ordens de Serviço
const ILC = process.env.NOTION_ILC || "1d8d9246083e80128f65f99939f3593d"; // ID Base Locais (ILC)


async function getClientes() {
  try {
    const response = await notion.databases.query({
      database_id: idC,
    });
    return response.results.map((page) => ({
      id: page.id,
      nome: page.properties.Nome?.title[0]?.plain_text || "Sem nome",
    }));
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    throw error;
  }
}

async function getEndereco(clienteId) {
  try {
    const response = await notion.pages.retrieve({ page_id: clienteId });
    return response.properties.ENDEREÇO?.formula?.string || "";
  } catch (error) {
    console.error("Erro ao buscar endereço:", error);
    throw error;
  }
}

async function getCidade(clienteId) {
  try {
    const response = await notion.pages.retrieve({ page_id: clienteId });
    return response.properties["CIDADE R"]?.formula?.string || "";
  } catch (error) {
    console.error("Erro ao buscar cidade:", error);
    throw error;
  }
}

async function getLocais(databaseId = ILC) {
  try {
    const response = await notion.databases.query({ database_id: databaseId });
    return response.results.map((page) => ({
      id: page.id,
      nome: page.properties.Condomínio?.title[0]?.plain_text || "Sem nome",
      endereco: page.properties.Endereço?.rich_text[0]?.plain_text || "",
      cidade: page.properties.Cidade?.rich_text[0]?.plain_text || "",
    }));
  } catch (error) {
    console.error("Erro ao buscar locais:", error);
    throw new Error("Erro ao buscar locais");
  }
}

async function getLocaisPorCliente(databaseId = ILC, clienteId) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: { property: "CLIENTE (Global)", relation: { contains: clienteId } },
    });
    return response.results.map((page) => ({
      id: page.id,
      nome: page.properties.Condomínio?.title[0]?.plain_text || "Sem nome",
      endereco: page.properties.Endereço?.rich_text[0]?.plain_text || "",
      cidade: page.properties.Cidade?.rich_text[0]?.plain_text || "",
    }));
  } catch (error) {
    console.error("Erro ao buscar locais do cliente:", error);
    throw new Error("Erro ao buscar locais do cliente");
  }
}

async function getLocaisPorClienteParaEdicao(databaseId = ILC, clienteId) {
    console.log(`[NotionService Isolado] Buscando locais para cliente ${clienteId} na base ${databaseId}`);
    if (!clienteId) {
        console.warn("[NotionService Isolado] clienteId não fornecido para getLocaisPorClienteParaEdicao");
        return [];
    }
    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: "CLIENTE (Global)", // Confirmar se este é o nome correto da relação no DB de Locais
                relation: {
                    contains: clienteId,
                },
            },
        });
        return response.results.map((page) => ({
            id: page.id,
            nome: page.properties.Condomínio?.title[0]?.plain_text || "Sem nome",
        }));
    } catch (error) {
        console.error(`[NotionService Isolado] Erro ao buscar locais do cliente ${clienteId} (para Edição):`, error.body || error);
        throw new Error("Erro ao buscar locais do cliente (para Edição Isolado)");
    }
}

async function getEnderecoLocal(localId, databaseId = ILC) {
  try {
    const response = await notion.pages.retrieve({ page_id: localId });
    return response.properties.Endereço?.rich_text[0]?.plain_text || "";
  } catch (error) {
    console.error("Erro ao buscar endereço do local:", error);
    throw new Error("Erro ao buscar endereço do local");
  }
}

async function getCidadeLocal(localId, databaseId = ILC) {
  try {
    const response = await notion.pages.retrieve({ page_id: localId });
    return response.properties.Cidade?.rich_text[0]?.plain_text || "";
  } catch (error) {
    console.error("Erro ao buscar cidade do local:", error);
    throw new Error("Erro ao buscar cidade do local");
  }
}

async function getEquipe() {
  console.log("[NotionService Isolado] Buscando opções de Equipe da base IDOS:", idos);
  try {
    const response = await notion.databases.retrieve({ database_id: idos });
    return response.properties.Equipe?.multi_select?.options || [];
  } catch (error) {
    console.error("[NotionService Isolado] Erro ao buscar equipes:", error.body || error);
    throw error;
  }
}

async function getResponsaveis() {
  console.log("[NotionService Isolado] Buscando opções de Responsável da base IDOS:", idos);
  try {
    const response = await notion.databases.retrieve({ database_id: idos });
    return response.properties.Responsável?.select?.options || [];
  } catch (error) {
    console.error("[NotionService Isolado] Erro ao buscar responsáveis:", error.body || error);
    throw error;
  }
}

async function getTiposServico() {
    console.log("[NotionService Isolado] Buscando opções de Tipo de Serviço da base IDOS:", idos);
    try {
        const dbInfo = await notion.databases.retrieve({ database_id: idos });
        return dbInfo.properties["Tipo de Serviço"]?.select?.options || [];
    } catch (error) {
        console.error("[NotionService Isolado] Erro ao buscar tipos de serviço:", error.body || error);
        throw error;
    }
}

async function criarOrdemServico(dados) {
  const {
    clienteId, localId, agendamentoInicial, agendamentoFinal, prestadores,
    servicos, observacoes, tipoServico, responsavel,
  } = dados;
  const dateInicialForNotion = agendamentoInicial ? agendamentoInicial.split("T")[0] : null;
  const dateFinalForNotion = agendamentoFinal ? agendamentoFinal.split("T")[0] : null;
  const equipeSelecionada = Array.isArray(prestadores) ? prestadores.map((p) => ({ name: p })) : (prestadores ? [{ name: prestadores }] : []);
  const dataSolicitacaoFormatada = new Date().toISOString().split("T")[0];
  const properties = {
    "Data da Solicitação": { date: { start: dataSolicitacaoFormatada } },
    Cliente: { relation: [{ id: clienteId }] },
    "Agendamento Inicial": dateInicialForNotion ? { date: { start: dateInicialForNotion } } : undefined,
    "Agendamento Final": dateFinalForNotion ? { date: { start: dateFinalForNotion } } : undefined,
    Equipe: { multi_select: equipeSelecionada },
    Execução: { rich_text: [{ text: { content: servicos || "" } }] },
    "Tipo de Serviço": tipoServico ? { select: { name: tipoServico } } : undefined,
    Status: { status: { name: "Não iniciada" } },
    Observações: observacoes ? { rich_text: [{ text: { content: observacoes } }] } : undefined,
  };
  if (localId) properties.Local = { relation: [{ id: localId }] };
  if (responsavel) properties["Responsável"] = { select: { name: responsavel } };
  try {
    return await notion.pages.create({ parent: { database_id: idos }, properties });
  } catch (error) {
    console.error("[NotionService Isolado] Erro ao criar ordem de serviço (original):", error.body || error);
    throw error;
  }
}

async function atualizarStatusOrdem(ordemId, dados) {
  try {
    const { status, dataInicio, dataFim, realizado, pendencias, anexos, assinatura } = dados;
    const properties = { Status: { status: { name: status } } };
    if (dataInicio) properties["Inicio de Serviço"] = { date: { start: dataInicio } };
    if (dataFim) properties["Data finalizado"] = { date: { start: dataFim } };
    if (realizado) properties["Realizado"] = { rich_text: [{ text: { content: realizado } }] };
    if (pendencias) properties["Pendências"] = { rich_text: [{ text: { content: pendencias } }] };
    if (anexos && anexos.length > 0) properties["Arquivos e mídia"] = { url: anexos[0] };
    if (assinatura) {
      let assinaturaUrl = assinatura;
      if (assinatura.startsWith("data:") && assinatura.length > 2000) {
        const dataUrlHeader = assinatura.substring(0, assinatura.indexOf(",") + 1);
        const dataUrlContent = assinatura.substring(assinatura.indexOf(",") + 1);
        assinaturaUrl = dataUrlHeader + dataUrlContent.substring(0, 1500);
      }
      properties["Assinatura"] = { url: assinaturaUrl };
    }
    return await notion.pages.update({ page_id: ordemId, properties });
  } catch (error) {
    console.error("Erro ao atualizar status da ordem (original):", error);
    throw error;
  }
}

async function getOrdem(ordemId) {
  try {
    return await notion.pages.retrieve({ page_id: ordemId });
  } catch (error) {
    console.error("Erro ao buscar ordem de serviço (original):", error);
    throw error;
  }
}

async function adicionarAnexo(ordemId, propriedade, url) {
  try {
    const properties = {};
    properties[propriedade] = { files: [{ name: `anexo-${Date.now()}.jpg`, external: { url: url } }] };
    return await notion.pages.update({ page_id: ordemId, properties });
  } catch (error) {
    console.error("Erro ao adicionar anexo (original):", error);
    throw error;
  }
}

async function getArquivosServico(ordemId) {
  try {
    const pageResponse = await notion.pages.retrieve({ page_id: ordemId });
    const arquivosProp = pageResponse.properties["Arquivos Serviços"];
    if (!arquivosProp || arquivosProp.type !== "files" || !arquivosProp.files || arquivosProp.files.length === 0) return [];
    return arquivosProp.files.map((file) => {
      let url = "";
      if (file.type === "file" && file.file?.url) url = file.file.url;
      else if (file.type === "external" && file.external?.url) url = file.external.url;
      return { name: file.name || "Arquivo sem nome", url: url };
    }).filter((file) => file.url);
  } catch (error) {
    console.error(`Erro ao buscar arquivos de serviço da ordem ${ordemId} (original):`, error);
    throw error;
  }
}

function construirFiltroNotion(filtros) {
  const notionFilterConditions = [];
  if (filtros.status) notionFilterConditions.push({ property: "Status", status: { equals: filtros.status } });
  if (filtros.agendamentoInicial) notionFilterConditions.push({ property: "Agendamento Inicial", date: { on_or_after: filtros.agendamentoInicial } });
  if (filtros.agendamentoFinal) notionFilterConditions.push({ property: "Agendamento Final", date: { on_or_before: filtros.agendamentoFinal } });
  if (filtros.responsavel) notionFilterConditions.push({ property: "Responsável", select: { equals: filtros.responsavel } });
  if (filtros.prestador) notionFilterConditions.push({ property: "Equipe", multi_select: { contains: filtros.prestador } });
  return notionFilterConditions.length > 0 ? { and: notionFilterConditions } : undefined;
}

async function getOrdensGerenciamento(filtros = {}) {
  try {
    const notionFilter = construirFiltroNotion(filtros);
    const response = await notion.databases.query({
      database_id: idos,
      filter: notionFilter,
      sorts: [{ property: "Agendamento Inicial", direction: "ascending" }],
    });
    const ordensPromises = response.results.map(async (page) => {
      try {
        const properties = page.properties;
        let clienteNome = "Cliente não encontrado";
        let localNome = "Local não definido";
        const clienteRelation = properties.Cliente?.relation;
        if (clienteRelation && clienteRelation.length > 0) {
          const clienteId = clienteRelation[0].id;
          try {
            const clientePage = await notion.pages.retrieve({ page_id: clienteId });
            clienteNome = clientePage.properties.Nome?.title[0]?.plain_text || "Cliente sem nome";
          } catch (clienteError) { /* ignore */ }
        }
        const localRelation = properties.Local?.relation;
        if (localRelation && localRelation.length > 0) {
          const localId = localRelation[0].id;
          try {
            const localPage = await notion.pages.retrieve({ page_id: localId });
            localNome = localPage.properties.Condomínio?.title[0]?.plain_text || "Local sem nome";
          } catch (localError) { /* ignore */ }
        }
        return {
          id: page.id,
          numeroOS: properties["O.S."]?.unique_id?.number || null,
          cliente: clienteNome, local: localNome,
          status: properties.Status?.status?.name || "Não iniciada",
          agendamentoInicial: properties["Agendamento Inicial"]?.date?.start || null,
          agendamentoFinal: properties["Agendamento Final"]?.date?.start || null,
          responsavel: properties.Responsável?.select?.name || properties.Responsável?.person?.name || null,
          prestadores: properties.Equipe?.multi_select?.map(opt => opt.name) || [],
        };
      } catch (mapError) { return null; }
    });
    return (await Promise.all(ordensPromises)).filter(ordem => ordem !== null);
  } catch (error) {
    console.error("Erro ao buscar ordens para gerenciamento (isolado):", error);
    throw error;
  }
}

async function getOrdemDetalhada(ordemId) {
  console.log(`[NotionService Isolado] Buscando detalhes para OS ID: ${ordemId}`);
  try {
    const osPage = await notion.pages.retrieve({ page_id: ordemId });
    const properties = osPage.properties;
    let ordemDetalhada = {
      id: osPage.id,
      numeroOS: properties["O.S."]?.unique_id?.number || null,
      status: properties.Status?.status?.name || "Não iniciada",
      agendamentoInicial: properties["Agendamento Inicial"]?.date?.start || null,
      agendamentoFinal: properties["Agendamento Final"]?.date?.start || null,
      responsavel: properties.Responsável?.select?.name || null, // Prioriza select
      prestadores: properties.Equipe?.multi_select?.map(opt => opt.name) || [],
      tipoServico: properties["Tipo de Serviço"]?.select?.name || null,
      servicos: properties.Execução?.rich_text[0]?.plain_text || "",
      observacoes: properties.Observações?.rich_text[0]?.plain_text || "",
      clienteId: properties.Cliente?.relation[0]?.id || null,
      localId: properties.Local?.relation[0]?.id || null,
    };

    let clienteNome = "Cliente não encontrado";
    let endereco = "Endereço não disponível";
    let cidade = "Cidade não disponível";
    let locaisCliente = [];
    let opcoesEquipe = [];
    let opcoesResponsaveis = [];
    let opcoesTipoServico = [];

    if (ordemDetalhada.clienteId) {
      try {
        const clientePage = await notion.pages.retrieve({ page_id: ordemDetalhada.clienteId });
        clienteNome = clientePage.properties.Nome?.title[0]?.plain_text || "Cliente sem nome";
        endereco = await getEndereco(ordemDetalhada.clienteId);
        cidade = await getCidade(ordemDetalhada.clienteId);
        // Crucial: Usar a função correta para buscar locais do cliente para os selects
        locaisCliente = await getLocaisPorClienteParaEdicao(ILC, ordemDetalhada.clienteId);
      } catch (clienteError) {
        console.error(`[NotionService Isolado] Erro ao buscar dados do cliente ${ordemDetalhada.clienteId}:`, clienteError.message);
      }
    }

    try {
        opcoesEquipe = await getEquipe(); // Busca da base IDOS
        opcoesResponsaveis = await getResponsaveis(); // Busca da base IDOS
        opcoesTipoServico = await getTiposServico(); // Busca da base IDOS
    } catch (optionsError) {
        console.error("[NotionService Isolado] Erro ao buscar opções gerais:", optionsError.message);
    }

    const resultadoFinal = {
      ...ordemDetalhada,
      clienteNome,
      endereco,
      cidade,
      opcoes: {
        locais: locaisCliente, // Lista de locais do cliente
        equipes: opcoesEquipe, // Lista de opções de equipe
        responsaveis: opcoesResponsaveis, // Lista de opções de responsáveis
        tiposServico: opcoesTipoServico, // Lista de opções de tipo de serviço
      }
    };
    console.log(`[NotionService Isolado] Detalhes da OS ${ordemId} formatados e com opções:`, JSON.stringify(resultadoFinal.opcoes, null, 2));
    return resultadoFinal;
  } catch (error) {
    console.error(`[NotionService Isolado] Erro grave ao buscar detalhes da OS ${ordemId}:`, error.body || error);
    if (error.code === 'object_not_found') throw new Error("Ordem de Serviço não encontrada.");
    throw error;
  }
}

async function atualizarDadosOs(ordemId, dados) {
  console.log(`[NotionService Isolado] Atualizando OS ID: ${ordemId} com dados:`, JSON.stringify(dados, null, 2));
  try {
    const propertiesToUpdate = {};
    if (dados.agendamentoInicial !== undefined) propertiesToUpdate["Agendamento Inicial"] = dados.agendamentoInicial ? { date: { start: dados.agendamentoInicial.split("T")[0] } } : { date: null };
    if (dados.agendamentoFinal !== undefined) propertiesToUpdate["Agendamento Final"] = dados.agendamentoFinal ? { date: { start: dados.agendamentoFinal.split("T")[0] } } : { date: null };
    if (dados.prestadores && Array.isArray(dados.prestadores)) propertiesToUpdate["Equipe"] = { multi_select: dados.prestadores.map(name => ({ name })) };
    else if (dados.prestadores === null) propertiesToUpdate["Equipe"] = { multi_select: [] }; // Limpar campo
    if (dados.responsavel !== undefined) propertiesToUpdate["Responsável"] = dados.responsavel ? { select: { name: dados.responsavel } } : { select: null };
    if (dados.tipoServico) propertiesToUpdate["Tipo de Serviço"] = { select: { name: dados.tipoServico } };
    else if (dados.tipoServico === null) propertiesToUpdate["Tipo de Serviço"] = { select: null };
    if (dados.servicos !== undefined) propertiesToUpdate["Execução"] = { rich_text: [{ text: { content: dados.servicos || "" } }] };
    if (dados.observacoes !== undefined) propertiesToUpdate["Observações"] = { rich_text: [{ text: { content: dados.observacoes || "" } }] };
    if (dados.localId !== undefined) propertiesToUpdate.Local = dados.localId ? { relation: [{ id: dados.localId }] } : { relation: [] };

    if (Object.keys(propertiesToUpdate).length === 0) return { message: "Nenhuma alteração necessária." };
    const response = await notion.pages.update({ page_id: ordemId, properties: propertiesToUpdate });
    console.log(`[NotionService Isolado] OS ${ordemId} atualizada com sucesso.`);
    return response;
  } catch (error) {
    console.error(`[NotionService Isolado] Erro ao atualizar OS ${ordemId}:`, error.body || error);
    throw error;
  }
}

async function criarOrdemReaberta(dadosNovaOS) {
  const {
    clienteId, historicoOS, localId, agendamentoInicial, agendamentoFinal,
    prestadores, servicos, observacoes, tipoServico, responsavel
  } = dadosNovaOS;
  console.log("[NotionService Isolado] Criando ordem REABERTA:", JSON.stringify(dadosNovaOS, null, 2));
  const dateInicialForNotion = agendamentoInicial ? agendamentoInicial.split("T")[0] : null;
  const dateFinalForNotion = agendamentoFinal ? agendamentoFinal.split("T")[0] : null;
  const equipeSelecionada = Array.isArray(prestadores) ? prestadores.map(name => ({ name })) : (prestadores ? [{ name: prestadores }] : []);
  const dataSolicitacaoFormatada = new Date().toISOString().split("T")[0];
  const properties = {
    "Data da Solicitação": { date: { start: dataSolicitacaoFormatada } },
    Cliente: { relation: [{ id: clienteId }] },
    "Agendamento Inicial": dateInicialForNotion ? { date: { start: dateInicialForNotion } } : undefined,
    "Agendamento Final": dateFinalForNotion ? { date: { start: dateFinalForNotion } } : undefined,
    Equipe: { multi_select: equipeSelecionada },
    Execução: { rich_text: [{ text: { content: servicos || "" } }] },
    "Tipo de Serviço": tipoServico ? { select: { name: tipoServico } } : undefined,
    Status: { status: { name: "Não iniciada" } },
    Observações: observacoes ? { rich_text: [{ text: { content: observacoes } }] } : undefined,
    "OS Original (Reaberta)": historicoOS ? { rich_text: [{ text: { content: String(historicoOS) } }] } : undefined,
  };
  if (localId) properties.Local = { relation: [{ id: localId }] };
  if (responsavel && responsavel.trim() !== "") properties["Responsável"] = { select: { name: responsavel } };
  else properties["Responsável"] = { select: null };
  console.log("[NotionService Isolado] Propriedades para REABERTURA:", JSON.stringify(properties, null, 2));
  try {
    const notionResponse = await notion.pages.create({ parent: { database_id: idos }, properties });
    console.log("[NotionService Isolado] Ordem REABERTA criada com sucesso:", notionResponse.id);
    return notionResponse;
  } catch (error) {
    console.error("[NotionService Isolado] Erro ao criar ordem REABERTA:", error.body || error);
    throw error;
  }
}

module.exports = {
  getClientes,
  getEndereco,
  getCidade,
  getEquipe, // Para uso geral e pelas funções isoladas
  getResponsaveis, // Para uso geral e pelas funções isoladas
  getTiposServico, // Nova função para buscar tipos de serviço, usada em getOrdemDetalhada
  criarOrdemServico, // Original, se ainda usada pelo sistema base
  atualizarStatusOrdem, // Original
  getOrdem, // Original
  adicionarAnexo, // Original
  getLocais,
  getLocaisPorCliente,
  getLocaisPorClienteParaEdicao, // Crucial para popular selects de local em editar/reabrir
  getEnderecoLocal,
  getCidadeLocal,
  getArquivosServico,
  getOrdensGerenciamento, // Pode ser a versão do sistema funcional se for melhor
  getOrdemDetalhada,      // Função crucial corrigida/restaurada para o módulo isolado
  atualizarDadosOs,       // Função crucial corrigida/restaurada para o módulo isolado
  criarOrdemReaberta,     // Função crucial corrigida/restaurada para o módulo isolado
};

