 // services/notionService.js
// NÃO REMOVER - Serviço essencial para integração com Notion

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");

dotenv.config();

// Configuração do Notion
const notion = new Client({
  auth: process.env.NOTION_TOKEN, // Atenção: Token hardcoded para exemplo, usar variável de ambiente em produção
});

// IDs das bases de dados (idealmente viriam de variáveis de ambiente)
const idC = process.env.NOTION_CLIENTES_DB_ID || "1ced9246083e80ba9305efcf0a0b83d0"; // ID Real da Base de Clientes
const IDORDEM_PROGRAMACAO = "1dfd9246083e803b9abdd3366e47e523"; // ID Correto para a base de Ordens de Serviço (Programação)
const IDOS_RELATORIO = "1dfd9246083e803b9abdd3366e47e523"; // ID Correto para a base de Ordens de Serviço (Relatório e outras funções)
const ILC = process.env.NOTION_LOCAIS_DB_ID || "1d8d9246083e80128f65f99939f3593d"; // ID Real da Base de Locais/Condomínios (ILC)


// Funções auxiliares para extrair dados de propriedades do Notion de forma segura
const getTextFromRichText = (richTextArray) => {
  if (richTextArray && richTextArray.length > 0) {
    return richTextArray.map(rt => rt.plain_text).join("");
  }
  return "";
};

const getDateFromDateObject = (dateObject) => {
  return dateObject?.start || null;
};

const getSelectName = (selectObject) => {
  return selectObject?.name || null;
};

const getMultiSelectNames = (multiSelectArray) => {
  return multiSelectArray?.map(opt => opt.name) || [];
};

const getRelationId = (relationArray) => {
  return relationArray && relationArray.length > 0 ? relationArray[0].id : null;
};

const getUniqueIdNumber = (uniqueIdObject) => {
  return uniqueIdObject?.number || null;
};

const getFormulaString = (formulaObject) => {
  return formulaObject?.string || "";
}

async function getClientes() {
  try {
    const response = await notion.databases.query({
      database_id: idC,
    });

    return response.results.map((page) => {
      return {
        id: page.id,
        nome: getTextFromRichText(page.properties.Nome?.title) || "Sem nome",
      };
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    throw error;
  }
}

// Adicionada de notionService_isolado.js
// Adaptada para logging padronizado
async function adicionarAnexo(ordemId, propriedade, url) {
  console.log(`[NotionService] Adicionando anexo para OS ID: ${ordemId}, Propriedade: ${propriedade}`);
  try {
    const properties = {};
    // Assume que a URL é externa e válida. A propriedade 'files' espera um array.
    properties[propriedade] = { files: [{ name: `anexo-${Date.now()}`, external: { url: url } }] };
    
    return await notion.pages.update({
      page_id: ordemId,
      properties
    });
  } catch (error) {
    console.error(`[NotionService] Erro ao adicionar anexo para OS ID ${ordemId}:`, error.body || error);
    throw error;
  }
}

async function getEndereco(clienteId) {
  try {
    const response = await notion.pages.retrieve({
      page_id: clienteId,
    });
    return getFormulaString(response.properties.ENDEREÇO?.formula);
  } catch (error) {
    console.error("Erro ao buscar endereço:", error);
    throw error;
  }
}

async function getCidade(clienteId) {
  try {
    const response = await notion.pages.retrieve({
      page_id: clienteId,
    });
    return getFormulaString(response.properties["CIDADE R"]?.formula);
  } catch (error) {
    console.error("Erro ao buscar cidade:", error);
    throw error;
  }
}

async function getLocais(databaseId = ILC) { 
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
    });

    return response.results.map((page) => {
      return {
        id: page.id,
        nome: getTextFromRichText(page.properties.Condomínio?.title) || "Sem nome", 
        endereco: getTextFromRichText(page.properties.Endereço?.rich_text),
        cidade: getTextFromRichText(page.properties.Cidade?.rich_text),
      };
    });
  } catch (error) {
    console.error("Erro ao buscar locais:", error);
    throw new Error("Erro ao buscar locais");
  }
}

async function getLocaisPorCliente(databaseId = ILC, clienteId) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "CLIENTE (Global)", 
        relation: {
          contains: clienteId,
        },
      },
    });

    return response.results.map((page) => {
      return {
        id: page.id,
        nome: getTextFromRichText(page.properties.Condomínio?.title) || "Sem nome", 
        endereco: getTextFromRichText(page.properties.Endereço?.rich_text),
        cidade: getTextFromRichText(page.properties.Cidade?.rich_text),
      };
    });
  } catch (error) {
    console.error("Erro ao buscar locais do cliente:", error);
    throw new Error("Erro ao buscar locais do cliente");
  }
}

// Modificada para incorporar lógica de notionService_isolado.js
async function getLocaisPorClienteParaEdicao(databaseId = ILC, clienteId) {
    console.log(`[NotionService] Buscando locais para edição para cliente ${clienteId} na base ${databaseId}`);
    if (!clienteId) {
        console.warn("[NotionService] clienteId não fornecido para getLocaisPorClienteParaEdicao");
        return [];
    }
    try {
        // Reutiliza a lógica de getLocaisPorCliente, mas mantém o log específico e a checagem.
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: "CLIENTE (Global)", 
                relation: {
                    contains: clienteId,
                },
            },
        });

        return response.results.map((page) => {
            // Retorna apenas id e nome como na versão original de _isolado.js para esta função específica
            return {
                id: page.id,
                nome: getTextFromRichText(page.properties.Condomínio?.title) || "Sem nome", 
            };
        });
    } catch (error) {
        console.error(`[NotionService] Erro ao buscar locais do cliente ${clienteId} (para Edição):`, error.body || error);
        throw new Error("Erro ao buscar locais do cliente (para Edição)");
    }
}


async function getEnderecoLocal(localId) {
  try {
    const response = await notion.pages.retrieve({
      page_id: localId,
    });
    return getTextFromRichText(response.properties.Endereço?.rich_text);
  } catch (error) {
    console.error("Erro ao buscar endereço do local:", error);
    throw new Error("Erro ao buscar endereço do local");
  }
}

async function getCidadeLocal(localId) {
  try {
    const response = await notion.pages.retrieve({
      page_id: localId,
    });
    return getTextFromRichText(response.properties.Cidade?.rich_text);
  } catch (error) {
    console.error("Erro ao buscar cidade do local:", error);
    throw new Error("Erro ao buscar cidade do local");
  }
}

async function getEquipe() {
  console.log(`[NotionService] Buscando opções para Equipe usando ID: ${IDOS_RELATORIO}`);
  try {
    const response = await notion.databases.retrieve({
      database_id: IDOS_RELATORIO, 
    });
    return response.properties.Equipe?.multi_select?.options || [];
  } catch (error) {
    console.error("Erro ao buscar equipes:", error.body || error);
    throw error;
  }
}

async function getResponsaveis() {
  console.log(`[NotionService] Buscando opções para Responsável usando ID: ${IDOS_RELATORIO}`);
  try {
    const response = await notion.databases.retrieve({
      database_id: IDOS_RELATORIO, 
    });
    return response.properties.Responsável?.select?.options || [];
  } catch (error) {
    console.error("Erro ao buscar responsáveis:", error.body || error);
    throw error;
  }
}

async function getTiposServico() {
  console.log(`[NotionService] Buscando opções para Tipo de Serviço usando ID: ${IDOS_RELATORIO}`);
  try {
    const response = await notion.databases.retrieve({
      database_id: IDOS_RELATORIO,
    });
    return response.properties["Tipo de Serviço"]?.select?.options || [];
  } catch (error) {
    console.error("Erro ao buscar tipos de serviço:", error.body || error);
    throw error;
  }
}

async function criarOrdemServico(dados) {
  const {
    clienteId,
    localId,
    agendamentoInicial,
    agendamentoFinal,
    prestadores,
    servicos,
    observacoes,
    tipoServico,
    responsavel,
    historicoOS // Adicionado para capturar o histórico da OS original, será opcional
  } = dados;

  const dateInicialForNotion = agendamentoInicial ? agendamentoInicial.split("T")[0] : null;
  const dateFinalForNotion = agendamentoFinal ? agendamentoFinal.split("T")[0] : null;
  const equipeSelecionada = Array.isArray(prestadores) ? prestadores.map((p) => ({ name: p })) : (prestadores ? [{ name: prestadores }] : []);
  const dataSolicitacaoFormatada = new Date().toISOString().split("T")[0];

  const properties = {
    "Data da Solicitação": { date: { start: dataSolicitacaoFormatada } },
    Cliente: { relation: [{ id: clienteId }] },
    LOCAL: localId ? { relation: [{ id: localId }] } : undefined,
    "Agendamento Inicial": dateInicialForNotion ? { date: { start: dateInicialForNotion } } : undefined,
    "Agendamento Final": dateFinalForNotion ? { date: { start: dateFinalForNotion } } : undefined,
    Equipe: { multi_select: equipeSelecionada },
    Execução: { rich_text: [{ text: { content: servicos || "" } }] },
    "Tipo de Serviço": tipoServico ? { select: { name: tipoServico } } : undefined,
    Status: { status: { name: "Não iniciada" } },
    Observações: observacoes ? { rich_text: [{ text: { content: observacoes } }] } : undefined,
    Responsável: responsavel ? { select: { name: responsavel } } : undefined,
  };

  // Adiciona o campo Histórico somente se historicoOS for fornecido
  if (historicoOS && historicoOS.trim() !== "") {
    properties["Histórico"] = { rich_text: [{ text: { content: historicoOS } }] };
  }

  try {
    console.log(`[NotionService] Criando OS na base: ${IDOS_RELATORIO}`);
    const notionResponse = await notion.pages.create({
      parent: { database_id: IDOS_RELATORIO }, 
      properties,
    });
    return notionResponse;
  } catch (error) {
    console.error("[NotionService] Erro ao criar ordem de serviço no Notion:", error.body || error);
    throw error;
  }
}

async function atualizarStatusOrdem(ordemId, dados) {
  try {
    const { status, dataInicio, dataFim, realizado, pendencias, anexos, assinatura, servicosIndividuais } = dados;
    console.log(`[NotionService] Iniciando atualizarStatusOrdem para OS ID: ${ordemId} com dados:`, JSON.stringify(dados, null, 2)); 
    const properties = {};

    if (status) properties.Status = { status: { name: status } };
    if (dataInicio) {
      properties["Inicio de Serviço"] = { date: { start: dataInicio } };
      console.log(`[NotionService] Formatando dataInicio para Notion: ${dataInicio}`); 
    }
    if (dataFim) {
        properties["Data finalizado"] = { date: { start: dataFim } };
        console.log(`[NotionService] Formatando dataFim para Notion: ${dataFim}`); 
    }
    if (realizado) properties["Realizado"] = { rich_text: [{ text: { content: realizado } }] };
    if (pendencias) properties["Pendências"] = { rich_text: [{ text: { content: pendencias } }] };
    if (anexos && anexos.length > 0) properties["Arquivos e mídia"] = { url: anexos[0] };
    if (assinatura) properties["Assinatura"] = { url: assinatura };

    if (Object.keys(properties).length === 0) {
      console.log("[NotionService] Nenhum dado para atualizar em atualizarStatusOrdem para OS ID:", ordemId);
      return { message: "Nenhum dado fornecido para atualização." };
    }
    
    console.log(`[NotionService] Objeto 'properties' a ser enviado para Notion para OS ID ${ordemId}:`, JSON.stringify(properties, null, 2)); 

    return await notion.pages.update({
      page_id: ordemId,
      properties,
    });
  } catch (error) {
    console.error(`[NotionService] Erro ao atualizar status da ordem ${ordemId}:`, error.body || error.message, error);
    throw error;
  }
}

async function concatenarServicoRealizado(osId, servicoData) {
  console.log(`[NotionService] Concatenando serviço para OS ID: ${osId}`);
  try {
    const page = await notion.pages.retrieve({ page_id: osId });
    const currentRealizadoRichText = page.properties.Realizado?.rich_text || [];

    let novoServicoTexto = `--- SERVIÇO EXECUTADO ---\n`;
    novoServicoTexto += `Descrição: ${servicoData.descricao}\n`;
    novoServicoTexto += `Técnico(s): ${servicoData.tecnicos.join(", ")}\n`;
    novoServicoTexto += `Status: ${servicoData.status}\n`;
    if (servicoData.observacao && servicoData.observacao.trim() !== "") {
      novoServicoTexto += `Observação: ${servicoData.observacao}\n`;
    }
    novoServicoTexto += `-------------------------\n\n`; 

    const novoRichTextObject = {
      type: "text",
      text: {
        content: novoServicoTexto,
      },
    };

    const updatedRichTextArray = [...currentRealizadoRichText, novoRichTextObject];
    
    await notion.pages.update({
      page_id: osId,
      properties: {
        Realizado: {
          rich_text: updatedRichTextArray,
        },
      },
    });

    console.log(`[NotionService] Campo 'Realizado' atualizado para OS ID: ${osId}`);
    return getTextFromRichText(updatedRichTextArray);

  } catch (error) {
    console.error(`[NotionService] Erro ao concatenar serviço no Notion para OS ID ${osId}:`, error.body || error);
    const enhancedError = new Error(error.message || "Erro ao atualizar Notion.");
    enhancedError.statusCode = error.code || 500;
    enhancedError.body = error.body;
    throw enhancedError;
  }
}


async function getOrdem(ordemId) {
  try {
    return await notion.pages.retrieve({ page_id: ordemId });
  } catch (error) {
    console.error("Erro ao buscar ordem de serviço:", error.body || error);
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
    console.log(`[NotionService] Buscando ordens para GERENCIAMENTO usando ID: ${IDOS_RELATORIO}`); 
    const response = await notion.databases.query({
      database_id: IDOS_RELATORIO, 
      filter: notionFilter,
      sorts: [{ property: "Agendamento Inicial", direction: "ascending" }],
    });

    const ordensPromises = response.results.map(async (page) => {
      try {
        const properties = page.properties;
        let clienteNome = "Cliente não encontrado";
        const clienteRelation = getRelationId(properties.Cliente?.relation);
        if (clienteRelation) {
          const clientePage = await notion.pages.retrieve({ page_id: clienteRelation });
          clienteNome = getTextFromRichText(clientePage.properties.Nome?.title) || "Cliente sem nome";
        }

        let localNome = "Local não definido";
        const localRelationId = getRelationId(properties.LOCAL?.relation); 
        if (localRelationId) {
            const localPage = await notion.pages.retrieve({ page_id: localRelationId });
            localNome = getTextFromRichText(localPage.properties.Condomínio?.title) || "Local sem nome"; 
        }

        return {
          id: page.id,
          numeroOS: getUniqueIdNumber(properties["O.S."]?.unique_id),
          cliente: clienteNome,
          local: localNome,
          status: getSelectName(properties.Status?.status),
          agendamentoInicial: getDateFromDateObject(properties["Agendamento Inicial"]?.date),
          agendamentoFinal: getDateFromDateObject(properties["Agendamento Final"]?.date),
          responsavel: getSelectName(properties.Responsável?.select),
          prestadores: getMultiSelectNames(properties.Equipe?.multi_select),
          tipoServico: getSelectName(properties["Tipo de Serviço"]?.select),
          servicos: getTextFromRichText(properties.Execução?.rich_text),
          observacoes: getTextFromRichText(properties.Observações?.rich_text),
          notionUrl: page.url
        };
      } catch (innerError) {
        console.error(`Erro ao processar ordem individual ${page.id} em getOrdensGerenciamento:`, innerError);
        return { id: page.id, error: "Erro ao processar dados da ordem" };
      }
    });
    return Promise.all(ordensPromises);
  } catch (error) {
    console.error("Erro ao buscar ordens para gerenciamento:", error.body || error);
    throw error;
  }
}

// Função específica para a Programação de Trabalho
async function getOrdensProgramacao(dataSelecionada) {
  console.log(`[NotionService] Buscando ordens para PROGRAMAÇÃO na data: ${dataSelecionada} usando ID: ${IDORDEM_PROGRAMACAO}`);
  try {
    const filtro = {
      and: [
        {
          property: "Agendamento Inicial",
          date: {
            on_or_before: dataSelecionada,
          },
        },
        {
          property: "Agendamento Final",
          date: {
            on_or_after: dataSelecionada,
          },
        },
        {
            property: "Status",
            status: {
                does_not_equal: "Concluído"
            }
        }
      ],
    };

    const response = await notion.databases.query({
      database_id: IDORDEM_PROGRAMACAO, // Usa a constante específica para Programação
      filter: filtro,
      sorts: [
        { property: "Agendamento Inicial", direction: "ascending" },
        { property: "O.S.", direction: "ascending" },
      ],
    });

    const ordensFormatadas = await Promise.all(response.results.map(async (page) => {
      const properties = page.properties;
      let clienteNome = "Cliente não encontrado";
      const clienteRelationId = getRelationId(properties.Cliente?.relation);
      if (clienteRelationId) {
        const clientePage = await notion.pages.retrieve({ page_id: clienteRelationId });
        clienteNome = getTextFromRichText(clientePage.properties.Nome?.title) || "Cliente sem nome";
      }

      let localNome = "Local não definido";
      let localEndereco = "Endereço não disponível"; // Valor padrão
      let localCidade = "Cidade não disponível"; // Valor padrão
      const localRelationId = getRelationId(properties.LOCAL?.relation);
      if (localRelationId) {
        try {
            const localPage = await notion.pages.retrieve({ page_id: localRelationId });
            localNome = getTextFromRichText(localPage.properties.Condomínio?.title) || "Local sem nome";
            // Assumindo que as propriedades de endereço e cidade na base ILC são 'Endereço' e 'Cidade' e são do tipo rich_text
            localEndereco = getTextFromRichText(localPage.properties.Endereço?.rich_text) || "Endereço não informado";
            localCidade = getTextFromRichText(localPage.properties.Cidade?.rich_text) || "Cidade não informada";
        } catch (localError) {
            console.error(`Erro ao buscar detalhes do local ${localRelationId}:`, localError.body || localError);
            // Mantém os valores padrão se houver erro ao buscar o local
        }
      }

      return {
        id: page.id,
        numeroOS: getUniqueIdNumber(properties["O.S."]?.unique_id),
        cliente: clienteNome,
        local: localNome, // Nome do local/condomínio
        localEndereco: localEndereco, // Endereço do local/condomínio
        localCidade: localCidade,   // Cidade do local/condomínio
        status: getSelectName(properties.Status?.status),
        agendamentoInicial: getDateFromDateObject(properties["Agendamento Inicial"]?.date),
        agendamentoFinal: getDateFromDateObject(properties["Agendamento Final"]?.date),
        responsavel: getSelectName(properties.Responsável?.select),
        prestadores: getMultiSelectNames(properties.Equipe?.multi_select),
        tipoServico: getSelectName(properties["Tipo de Serviço"]?.select),
        servicos: getTextFromRichText(properties.Execução?.rich_text), // Mantido como 'Execução' conforme mapeamento anterior no frontend
        observacoes: getTextFromRichText(properties.Observações?.rich_text), // Mantido como 'Observações' conforme mapeamento anterior no frontend
        notionUrl: page.url,
        obraInterna: getSelectName(properties["Obra Interna"]?.select) === "Sim",
      };
    }));

    console.log(`[NotionService] ${ordensFormatadas.length} ordens encontradas para programação.`);
    return ordensFormatadas;
  } catch (error) {
    console.error("Erro ao buscar ordens para programação:", error.body || error);
    throw error;
  }
}


async function getOrdemDetalhada(ordemId) {
  console.log(`[NotionService] Buscando detalhes da OS ID: ${ordemId} usando ID: ${IDOS_RELATORIO}`);
  try {
    const page = await notion.pages.retrieve({ page_id: ordemId });
    const properties = page.properties;

    // Buscar todas as listas de opções em paralelo
    const [locaisDoCliente, todasEquipes, todosResponsaveis, todosTiposServico] = await Promise.all([
        getLocaisPorClienteParaEdicao(ILC, getRelationId(properties.Cliente?.relation)), // Passa o ID do cliente da OS atual
        getEquipe(),
        getResponsaveis(),
        getTiposServico()
    ]);

    let clienteNome = "Cliente não encontrado";
    let clienteEndereco = "";
    let clienteCidade = "";
    const clienteRelationId = getRelationId(properties.Cliente?.relation);
    if (clienteRelationId) {
      const clientePage = await notion.pages.retrieve({ page_id: clienteRelationId });
      clienteNome = getTextFromRichText(clientePage.properties.Nome?.title) || "Cliente sem nome";
      clienteEndereco = getFormulaString(clientePage.properties.ENDEREÇO?.formula);
      clienteCidade = getFormulaString(clientePage.properties["CIDADE R"]?.formula);
    }

    let localNome = "Local não definido";
    let localEnderecoDetalhe = ""; // Renomeado para evitar conflito com o que será adicionado para programação
    let localCidadeDetalhe = ""; // Renomeado para evitar conflito
    const localRelationId = getRelationId(properties.LOCAL?.relation);
    if (localRelationId) {
      const localPage = await notion.pages.retrieve({ page_id: localRelationId });
      localNome = getTextFromRichText(localPage.properties.Condomínio?.title) || "Local sem nome";
      localEnderecoDetalhe = getTextFromRichText(localPage.properties.Endereço?.rich_text);
      localCidadeDetalhe = getTextFromRichText(localPage.properties.Cidade?.rich_text);
    }

    const ordemDetalhada = {
      id: page.id,
      numeroOS: getUniqueIdNumber(properties["O.S."]?.unique_id),
      status: getSelectName(properties.Status?.status),
      agendamentoInicial: getDateFromDateObject(properties["Agendamento Inicial"]?.date),
      agendamentoFinal: getDateFromDateObject(properties["Agendamento Final"]?.date),
      responsavel: getSelectName(properties.Responsável?.select),
      tipoServico: getSelectName(properties["Tipo de Serviço"]?.select),
      servicos: getTextFromRichText(properties.Execução?.rich_text),
      observacoes: getTextFromRichText(properties.Observações?.rich_text),
      prestadores: getMultiSelectNames(properties.Equipe?.multi_select),
      clienteId: clienteRelationId,
      clienteNome,
      clienteEndereco, // Endereço do cliente (rollup)
      clienteCidade,   // Cidade do cliente (rollup)
      localId: localRelationId,
      localNome,
      localEndereco: localEnderecoDetalhe, // Endereço do local (ILC)
      localCidade: localCidadeDetalhe,     // Cidade do local (ILC)
      dataSolicitacao: getDateFromDateObject(properties["Data da Solicitação"]?.date),
      inicioServico: getDateFromDateObject(properties["Inicio de Serviço"]?.date),
      dataFinalizado: getDateFromDateObject(properties["Data finalizado"]?.date),
      realizado: getTextFromRichText(properties.Realizado?.rich_text),
      pendencias: getTextFromRichText(properties.Pendências?.rich_text),
      assinaturaUrl: properties.Assinatura?.url || null,
      notionUrl: page.url,
      historicoOS: getTextFromRichText(properties.Histórico?.rich_text), // ADICIONADO PARA BUSCAR O HISTÓRICO
      arquivosServico: await getArquivosServico(ordemId),
      opcoes: {
        locais: locaisDoCliente,
        equipes: todasEquipes,
        responsaveis: todosResponsaveis,
        tiposServico: todosTiposServico
      }
    };
    console.log(`[NotionService] Detalhes da OS ${ordemId} obtidos com sucesso, incluindo opções.`);
    return ordemDetalhada;

  } catch (error) {
    console.error(`[NotionService] Erro ao buscar detalhes da OS ${ordemId}:`, error.body || error.message);
    if (error.code === 'object_not_found') {
        const notFoundError = new Error(`Ordem de serviço com ID ${ordemId} não encontrada no Notion.`);
        notFoundError.statusCode = 404;
        throw notFoundError;
    }
    const serviceError = new Error(error.message || "Erro interno ao buscar detalhes da OS no Notion.");
    serviceError.statusCode = error.code || 500;
    serviceError.body = error.body;
    throw serviceError;
  }
}

// Consolidada e renomeada. Baseada em atualizarDadosOs de notionService_isolado.js e atualizarOrdemGerenciamento de notionService.js
// e inputs de atualizarDadosOsDedicada de notionServiceEdicaoOsDedicada.js
async function atualizarOrdemServico(ordemId, dados) { // Renomeada para atualizarOrdemServico
  console.log(`[NotionService] Atualizando OS ID: ${ordemId} com dados:`, JSON.stringify(dados, null, 2));
  try {
    const propertiesToUpdate = {};

    // Datas
    if (dados.agendamentoInicial !== undefined) {
      propertiesToUpdate["Agendamento Inicial"] = dados.agendamentoInicial ? { date: { start: dados.agendamentoInicial.split("T")[0] } } : { date: null };
    }
    if (dados.agendamentoFinal !== undefined) {
      propertiesToUpdate["Agendamento Final"] = dados.agendamentoFinal ? { date: { start: dados.agendamentoFinal.split("T")[0] } } : { date: null };
    }
    if (dados.dataInicio !== undefined) { // Campo de atualizarOrdemGerenciamento
        propertiesToUpdate["Inicio de Serviço"] = dados.dataInicio ? { date: { start: dados.dataInicio.split("T")[0] } } : { date: null };
    }
    if (dados.dataFim !== undefined) { // Campo de atualizarOrdemGerenciamento
        propertiesToUpdate["Data finalizado"] = dados.dataFim ? { date: { start: dados.dataFim.split("T")[0] } } : { date: null };
    }

    // Selects
    if (dados.responsavel !== undefined) {
      propertiesToUpdate["Responsável"] = dados.responsavel ? { select: { name: dados.responsavel } } : { select: null };
    }
    if (dados.tipoServico !== undefined) { // Nome 'tipoServico' como em _isolado e _dedicada
      propertiesToUpdate["Tipo de Serviço"] = dados.tipoServico ? { select: { name: dados.tipoServico } } : { select: null };
    }
    if (dados.status !== undefined) { // Campo de atualizarOrdemGerenciamento e _dedicada
        propertiesToUpdate.Status = dados.status ? { status: { name: dados.status } } : { status: null }; // Assumindo que status pode ser limpo com null
    }

    // Multi-select
    if (dados.prestadores && Array.isArray(dados.prestadores)) { // Nome 'prestadores' como em _isolado e _dedicada
      propertiesToUpdate.Equipe = { multi_select: dados.prestadores.map(name => ({ name })) };
    } else if (dados.prestadores === null) { // Para limpar o campo
      propertiesToUpdate.Equipe = { multi_select: [] };
    }

    // Rich Text
    if (dados.servicos !== undefined) { // Nome 'servicos' como em _isolado e _dedicada (Execução no Notion)
      propertiesToUpdate.Execução = { rich_text: [{ text: { content: dados.servicos || "" } }] };
    }
    if (dados.observacoes !== undefined) {
      propertiesToUpdate.Observações = { rich_text: [{ text: { content: dados.observacoes || "" } }] };
    }
    if (dados.realizado !== undefined) { // Campo de atualizarOrdemGerenciamento
        propertiesToUpdate.Realizado = { rich_text: [{ text: { content: dados.realizado || "" } }] };
    }
    if (dados.pendencias !== undefined) { // Campo de atualizarOrdemGerenciamento
        propertiesToUpdate.Pendências = { rich_text: [{ text: { content: dados.pendencias || "" } }] };
    }
    
    // Relations
    // Mantendo a lógica original de atualizarOrdemGerenciamento para Cliente e Local, se fornecidos.
    if (dados.clienteId) {
        propertiesToUpdate.Cliente = { relation: [{ id: dados.clienteId }] };
    }
    if (dados.localId !== undefined) { // 'localId' como em _isolado
      propertiesToUpdate.LOCAL = dados.localId ? { relation: [{ id: dados.localId }] } : { relation: [] }; // Limpar relação se localId for null
    }

    if (Object.keys(propertiesToUpdate).length === 0) {
      console.log("[NotionService] Nenhum dado fornecido para atualização em atualizarOrdemServico.");
      return { message: "Nenhuma alteração necessária." };
    }

    const response = await notion.pages.update({
      page_id: ordemId,
      properties: propertiesToUpdate,
    });
    console.log(`[NotionService] OS ${ordemId} atualizada com sucesso (atualizarOrdemServico).`);
    return response;
  } catch (error) {
    console.error(`[NotionService] Erro ao atualizar OS ${ordemId} (atualizarOrdemServico):`, error.body || error.message);
    const serviceError = new Error(error.message || "Erro interno ao atualizar OS no Notion.");
    serviceError.statusCode = error.code || 500; // Mapeia para um código de status HTTP, se disponível
    serviceError.body = error.body; // Adiciona o corpo do erro do Notion para depuração
    throw serviceError;
  }
}

async function getArquivosServico(pageId) {
  console.log(`[NotionService] Buscando arquivos de serviço para a página ID: ${pageId}`);
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });

    const arquivosProperty = page.properties["Arquivos e mídia"];
    if (!arquivosProperty || arquivosProperty.type !== "files") {
      console.warn(`[NotionService] Propriedade "Arquivos e mídia" não encontrada ou não é do tipo "files" para a página ${pageId}.`);
      return []; 
    }

    const filesData = arquivosProperty.files;
    if (!filesData || filesData.length === 0) {
      console.log(`[NotionService] Nenhum arquivo encontrado na propriedade "Arquivos e mídia" para a página ${pageId}.`);
      return []; 
    }

    const arquivosFormatados = filesData.map(file => {
      if (file.type === "file") { 
        return {
          name: file.name,
          url: file.file.url,
        };
      } else if (file.type === "external") { 
        return {
          name: file.name || new URL(file.external.url).pathname.split('/').pop() || "Link Externo", 
          url: file.external.url,
        };
      }
      return null; 
    }).filter(file => file !== null); 

    console.log(`[NotionService] ${arquivosFormatados.length} arquivos encontrados e formatados para a página ${pageId}.`);
    return arquivosFormatados;

  } catch (error) {
    console.error(`[NotionService] Erro ao buscar arquivos de serviço para a página ${pageId}:`, error.body || error.message);
    if (error.code === 'object_not_found') {
        const notFoundError = new Error(`Página com ID ${pageId} não encontrada no Notion ao buscar arquivos.`);
        notFoundError.statusCode = 404;
        throw notFoundError; 
    }
    const serviceError = new Error(error.message || "Erro interno ao buscar arquivos de serviço no Notion.");
    serviceError.statusCode = error.code || 500;
    serviceError.body = error.body;
    throw serviceError;
  }
}



module.exports = {
  getClientes,
  getEndereco,
  getCidade,
  getLocais,
  getLocaisPorCliente,
  getLocaisPorClienteParaEdicao,
  getEnderecoLocal,
  getCidadeLocal,
  getEquipe,
  getResponsaveis,
  criarOrdemServico,
  atualizarStatusOrdem,
  concatenarServicoRealizado,
  getOrdem,
  getOrdensGerenciamento,
  getOrdemDetalhada,
  // atualizarOrdemGerenciamento, // Comentado pois foi substituído por atualizarOrdemServico
  atualizarOrdemServico, // Nova função consolidada
  getArquivosServico,
  getOrdensProgramacao, // Exporta a função para Programação
  criarOrdemReaberta, // Adicionada de notionService_isolado.js
  adicionarAnexo // Adicionada de notionService_isolado.js
};

// Adicionada de notionService_isolado.js
// Adaptada para usar IDOS_RELATORIO e logging padronizado
async function criarOrdemReaberta(dadosNovaOS) {
  const {
    clienteId, historicoOS, localId, agendamentoInicial, agendamentoFinal,
    prestadores, servicos, observacoes, tipoServico, responsavel
  } = dadosNovaOS;
  console.log("[NotionService] Criando ordem REABERTA:", JSON.stringify(dadosNovaOS, null, 2));
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
  if (localId) properties.LOCAL = { relation: [{ id: localId }] }; // Alterado de 'Local' para 'LOCAL' para consistência com criarOrdemServico
  if (responsavel && responsavel.trim() !== "") properties["Responsável"] = { select: { name: responsavel } };
  else properties["Responsável"] = { select: null }; // Garante que o campo seja limpo se não houver responsável
  
  console.log("[NotionService] Propriedades para REABERTURA:", JSON.stringify(properties, null, 2));
  try {
    const notionResponse = await notion.pages.create({ parent: { database_id: IDOS_RELATORIO }, properties }); // Usa IDOS_RELATORIO
    console.log("[NotionService] Ordem REABERTA criada com sucesso:", notionResponse.id);
    return notionResponse;
  } catch (error) {
    console.error("[NotionService] Erro ao criar ordem REABERTA:", error.body || error);
    throw error;
  }
}

