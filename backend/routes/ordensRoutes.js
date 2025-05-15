// routes/ordensRoutes.js
// NÃO REMOVER - Rotas essenciais para ordens de serviço

const express = require("express");
const router = express.Router();
const notionService = require("../services/notionService");
const firebaseService = require("../services/firebaseService");

/**
 * Rota para criar uma nova ordem de serviço
 * Cria uma página no Notion e salva os dados no Firebase
 * 
 * @route POST /ordem-servico
 * @param {Object} req.body - Dados da ordem de serviço
 * @returns {Object} Resposta com ID da ordem criada
 */
// NÃO REMOVER - Rota essencial para criação de ordens
router.post("/", async (req, res) => {
  try {
    console.log("Recebendo requisição para criar ordem de serviço:", JSON.stringify(req.body, null, 2));
    
    const {
      cliente,
      clienteId,
      clienteNome, // Adicionado para capturar o nome do cliente enviado pelo reabrir_os_isolado.js
      localId, 
      endereco,
      cidade,
      agendamentoInicial,
      agendamentoFinal,
      prestadores,
      servicos,
      observacoes,
      tipoServico,
      responsavel,
      historicoOS // Adicionado para capturar o histórico da OS original
    } = req.body;

    if (!clienteId) {
      console.error("ID do cliente não fornecido");
      return res.status(400).json({ error: "ID do cliente é obrigatório" });
    }

    let notionResponse;
    try {
      notionResponse = await notionService.criarOrdemServico({
        clienteId,
        localId, 
        agendamentoInicial,
        agendamentoFinal,
        prestadores,
        servicos,
        observacoes,
        tipoServico,
        responsavel,
        historicoOS // Passando o histórico para o serviço do Notion
      });
      console.log("Resposta do Notion:", JSON.stringify(notionResponse, null, 2));
    } catch (notionError) {
      console.error("Erro específico do Notion:", notionError);
      if (notionError.body) {
        console.error("Detalhes do erro do Notion:", notionError.body);
      }
      return res.status(500).json({ error: "Erro ao criar ordem de serviço no Notion", details: notionError.message });
    }

    const osId = notionResponse.id;
    const numeroOS = notionResponse.properties["O.S."]?.unique_id?.number || null;
    const statusInicial = notionResponse.properties.Status?.status?.name || "Não iniciada";
    
    try {
      await firebaseService.salvarOrdem(osId, {
        cliente: clienteNome || cliente,
        endereco,
        cidade,
        agendamentoInicial,
        agendamentoFinal,
        prestadores,
        tipoServico,
        servicos,
        observacoes,
        responsavel, 
        nos: numeroOS, 
        sts: statusInicial,
        lid: localId 
      });
      console.log("Ordem salva com sucesso no Firebase");
    } catch (firebaseError) {
      console.error("Erro específico do Firebase:", firebaseError);
      console.warn("A ordem foi criada no Notion, mas houve um erro ao salvar no Firebase");
    }

    res.json({ 
      success: true, 
      message: "Ordem de serviço criada com sucesso",
      id: osId
    });
  } catch (error) {
    console.error("Erro geral ao criar ordem de serviço:", error);
    if (error.body) {
      console.error("Detalhes do erro:", error.body);
    }
    res.status(500).json({ error: "Erro ao criar ordem de serviço", details: error.message });
  }
});

// NOVA ROTA PARA PROGRAMAÇÃO DE TRABALHO
/**
 * Rota para buscar ordens de serviço para a Programação de Trabalho
 * Filtra por data e retorna dados detalhados do Notion.
 * 
 * @route GET /ordem-servico/programacao
 * @param {string} req.query.data - Data no formato YYYY-MM-DD
 * @returns {Array} Lista de ordens de serviço para a data especificada
 */
router.get("/programacao", async (req, res) => {
  try {
    const { data } = req.query;
    if (!data) {
      return res.status(400).json({ error: "Parâmetro 'data' é obrigatório." });
    }
    // Validar formato da data YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD." });
    }

    console.log(`[ordensRoutes] Recebida requisição para /programacao com data: ${data}`);
    const ordensProgramacao = await notionService.getOrdensProgramacao(data);
    console.log(`[ordensRoutes] Retornando ${ordensProgramacao.length} ordens para programação.`);
    res.json(ordensProgramacao);

  } catch (error) {
    console.error("[ordensRoutes] Erro ao buscar ordens para programação:", error.body || error.message, error);
    res.status(500).json({ error: "Erro ao buscar ordens para programação", details: error.message });
  }
});


/**
 * Rota para listar todas as ordens
 * Busca dados do Firebase e complementa com status do Notion
 * 
 * @route GET /ordem-servico
 * @returns {Array} Lista de ordens com status
 */
router.get("/", async (req, res) => {
  try {
    console.log("Listando ordens (método individual)");
    const ordensFirebase = await firebaseService.getOrdens();
    console.log(`Encontradas ${Object.keys(ordensFirebase).length} ordens no Firebase.`);
    const ordemIds = Object.keys(ordensFirebase);
    const notionPromises = ordemIds.map(id => 
      notionService.getOrdem(id).catch(err => {
        console.error(`Erro ao buscar dados do Notion para ordem ${id}:`, err.message);
        return { id, error: true }; 
      })
    );
    console.log(`Iniciando busca paralela de ${notionPromises.length} ordens no Notion...`);
    const notionResults = await Promise.all(notionPromises);
    console.log("Busca paralela no Notion concluída.");
    const notionDataMap = notionResults.reduce((map, result) => {
      if (result && !result.error) {
        map[result.id] = result;
      }
      return map;
    }, {});
    const ordensCompletas = [];
    for (const [id, ordemFirebase] of Object.entries(ordensFirebase)) {
      if (!ordemFirebase || typeof ordemFirebase !== "object") {
        console.warn(`Dados inválidos no Firebase para a ordem ID: ${id}`);
        continue;
      }
      const notionResponse = notionDataMap[id];
      let status = "Não iniciada"; 
      let numeroOS = null;
      let responsavel = ordemFirebase.RSP || null; 
      if (notionResponse) {
        status = notionResponse.properties.Status?.status?.name || status;
        numeroOS = notionResponse.properties["O.S."]?.unique_id?.number || null;
        if (!responsavel) {
          responsavel = notionResponse.properties.Responsável?.select?.name || null;
        }
        console.log(`Dados do Notion combinados para ordem ${id}: Status=${status}, OS=${numeroOS}, Responsável=${responsavel}`);
      } else {
        console.warn(`Dados do Notion não encontrados ou com erro para ordem ${id}. Usando defaults.`);
      }
      if (status === "Concluído") {
        console.log(`Ordem ${id} ignorada (status Concluído)`);
        continue; 
      }
      ordensCompletas.push({
        id,
        numeroOS, 
        cliente: ordemFirebase.CL || "Cliente não informado",
        agendamentoInicial: ordemFirebase.AI, 
        agendamentoFinal: ordemFirebase.AF,   
        endereco: ordemFirebase.ED,
        cidade: ordemFirebase.CD,
        responsavel, 
        status
      });
    }
    console.log(`Total de ${ordensCompletas.length} ordens combinadas.`);
    res.json(ordensCompletas);
  } catch (error) {
    console.error("Erro ao listar ordens:", error);
    res.status(500).json({ error: "Erro ao listar ordens" });
  }
});

// ROTA PARA BUSCAR RESPONSÁVEIS
/**
 * Rota para obter as opções de responsáveis da base de OS no Notion.
 * 
 * @route GET /ordem-servico/responsaveis
 * @returns {Array} Lista de opções de responsáveis (objetos com id, name, color).
 */
router.get("/responsaveis", async (req, res) => {
  try {
    console.log("Backend: Recebida requisição para buscar responsáveis.");
    const responsaveis = await notionService.getResponsaveis();
    console.log("Backend: Responsáveis buscados com sucesso:", responsaveis);
    res.json(responsaveis || []); // Garante que sempre retorne um array
  } catch (error) {
    console.error("Backend: Erro ao buscar responsáveis:", error.body || error.message);
    res.status(500).json({ error: "Erro ao buscar responsáveis", details: error.message });
  }
});

// ROTA PARA BUSCAR EQUIPES/PRESTADORES
/**
 * Rota para obter as opções de equipe/prestadores da base de OS no Notion.
 * 
 * @route GET /ordem-servico/equipes
 * @returns {Array} Lista de opções de equipe (objetos com id, name, color).
 */
router.get("/equipes", async (req, res) => {
  try {
    console.log("Backend: Recebida requisição para buscar equipes/prestadores.");
    const equipes = await notionService.getEquipe(); // Reutiliza a função getEquipe existente
    console.log("Backend: Equipes/Prestadores buscados com sucesso:", equipes);
    res.json(equipes || []); // Garante que sempre retorne um array
  } catch (error) {
    console.error("Backend: Erro ao buscar equipes/prestadores:", error.body || error.message);
    res.status(500).json({ error: "Erro ao buscar equipes/prestadores", details: error.message });
  }
});


// NOVA ROTA GET /ordem-servico/:id
/**
 * Rota para obter uma ordem de serviço específica pelo ID
 * Busca dados do Firebase e complementa com dados detalhados do Notion
 * 
 * @route GET /ordem-servico/:id
 * @param {string} req.params.id - ID da ordem de serviço
 * @returns {Object} Dados da ordem com status e detalhes
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Buscando ordem pelo ID: ${id}`);

    // 1. Buscar dados básicos no Firebase
    const ordemFirebase = await firebaseService.getOrdem(id);
    if (!ordemFirebase) {
      console.error(`Ordem não encontrada no Firebase para o ID: ${id}`);
      return res.status(404).json({ error: "Ordem não encontrada no Firebase" });
    }
    console.log(`Ordem encontrada no Firebase (ID: ${id})`);

    // 2. Buscar dados detalhados no Notion usando a função getOrdemDetalhada
    let ordemNotionDetalhada;
    try {
      ordemNotionDetalhada = await notionService.getOrdemDetalhada(id);
      console.log(`Detalhes da ordem ${id} buscados no Notion.`);
    } catch (notionError) {
      console.error(`Erro ao buscar detalhes da ordem ${id} no Notion:`, notionError.body || notionError.message);
      // Retornar os dados do Firebase com um aviso sobre o Notion
      return res.status(500).json({
        ...ordemFirebase, // Retorna o que temos do Firebase
        id: id, // Garante que o ID esteja presente
        errorNotion: true,
        messageNotion: "Erro ao buscar detalhes completos no Notion",
        status: ordemFirebase.STS || "Erro Notion" // Usa o status do Firebase ou um indicativo de erro
      });
    }

    if (!ordemNotionDetalhada) {
        console.error(`Dados detalhados do Notion não encontrados para a ordem ${id}.`);
        return res.status(404).json({ error: "Dados detalhados da ordem não encontrados no Notion" });
    }

    // 3. Combinar os dados do Firebase e Notion
    const dadosCombinados = {
      ...ordemFirebase, 
      ...ordemNotionDetalhada, 
      id: id 
    };

    console.log(`Dados combinados para OS ${id}:`, JSON.stringify(dadosCombinados, null, 2));
    res.json(dadosCombinados);

  } catch (error) {
    console.error(`Erro detalhado ao buscar ordem por ID (${req.params.id}):`, error);
    if (error.message && error.message.includes("não encontrada")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Erro interno ao buscar ordem por ID" });
    }
  }
});


/**
 * Rota para criar slug para uma ordem
 * Gera um identificador curto para compartilhamento
 * 
 * @route POST /ordem-servico/slug
 * @param {Object} req.body - Contém o ID da ordem
 * @returns {Object} Resposta com o slug gerado
 */
router.post("/slug", async (req, res) => {
  try {
    const { ordemId } = req.body;
    const slug = await firebaseService.criarSlug(ordemId);
    res.json({ 
      success: true, 
      slug,
      url: `/relatorio/${slug}`
    });
  } catch (error) {
    console.error("Erro ao criar slug:", error);
    res.status(500).json({ error: "Erro ao criar slug" });
  }
});

/**
 * Rota para obter ordem por slug
 * Busca a ordem pelo slug no Firebase e complementa com dados do Notion
 * 
 * @route GET /ordem-servico/slug/:slug
 * @param {string} req.params.slug - Slug da ordem
 * @returns {Object} Dados da ordem com status
 */
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`Buscando ordem com slug: ${slug}`);
    const ordemFirebaseSlug = await firebaseService.getOrdemPorSlug(slug);
    if (!ordemFirebaseSlug || !ordemFirebaseSlug.id) {
      console.error(`Ordem não encontrada no Firebase para o slug: ${slug}`);
      return res.status(404).json({ error: "Ordem não encontrada para este slug" });
    }
    console.log(`Ordem encontrada no Firebase (ID: ${ordemFirebaseSlug.id}) para o slug: ${slug}`);
    
    let ordemNotionDetalhada;
    try {
      ordemNotionDetalhada = await notionService.getOrdemDetalhada(ordemFirebaseSlug.id);
      console.log(`Detalhes da ordem ${ordemFirebaseSlug.id} buscados no Notion.`);
    } catch (notionError) {
      console.error(`Erro ao buscar detalhes da ordem ${ordemFirebaseSlug.id} no Notion:`, notionError.body || notionError.message);
      return res.status(500).json({
        ...ordemFirebaseSlug,
        errorNotion: true,
        messageNotion: "Erro ao buscar detalhes completos no Notion",
        status: ordemFirebaseSlug.STS || "Erro Notion"
      });
    }

    if (!ordemNotionDetalhada) {
        console.error(`Dados detalhados do Notion não encontrados para a ordem ${ordemFirebaseSlug.id}.`);
        return res.status(404).json({ error: "Dados detalhados da ordem não encontrados no Notion" });
    }

    const dadosCombinados = {
      ...ordemFirebaseSlug,
      ...ordemNotionDetalhada,
      id: ordemFirebaseSlug.id 
    };

    console.log(`Dados combinados para OS ${ordemFirebaseSlug.id} via slug ${slug}:`, JSON.stringify(dadosCombinados, null, 2));
    res.json(dadosCombinados);

  } catch (error) {
    console.error(`Erro detalhado ao buscar ordem por slug (${req.params.slug}):`, error);
    if (error.message === "Ordem não encontrada" || (error.message && error.message.includes("não encontrada"))) {
      res.status(404).json({ error: "Ordem não encontrada para este slug" });
    } else {
      res.status(500).json({ error: "Erro interno ao buscar ordem por slug" });
    }
  }
});

/**
 * Rota para atualizar status da ordem
 * Atualiza o status e outros campos no Notion
 * 
 * @route POST /ordem-servico/:id/status
 * @param {string} req.params.id - ID da ordem
 * @param {Object} req.body - Dados para atualização
 * @returns {Object} Resposta de sucesso
 */
router.post("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      dataInicio,
      dataFim,
      realizado,
      pendencias,
      assinatura,
      servicosIndividuais // Adicionado para suportar dados de "Finalizar Serviço"
    } = req.body;

    // Log detalhado do corpo da requisição
    console.log(`[ordensRoutes.js] Rota /:id/status - Recebido para ordem ${id}:`, JSON.stringify(req.body, null, 2)); // LOG EXISTENTE, VERIFICAR SE PRECISA DE MAIS DETALHES
    console.log(`[ordensRoutes.js] Rota /:id/status - Detalhe servicosIndividuais:`, JSON.stringify(req.body.servicosIndividuais, null, 2)); // LOG ADICIONADO PARA SERVICOS INDIVIDUAIS
    console.log(`[ordensRoutes.js] Rota /:id/status - Detalhe campo realizado (se houver):`, req.body.realizado); // LOG ADICIONADO PARA CAMPO REALIZADO

    console.log(`Backend: Atualizando status da ordem ${id} para ${status}`);
    const dadosAtualizacao = {
      status,
      dataInicio,
      dataFim,
      realizado,
      pendencias,
      servicosIndividuais // Incluído nos dados de atualização
    };

    if (assinatura) {
      console.log("Backend: Processando assinatura para o Notion");
      dadosAtualizacao.assinatura = assinatura;
    }

    // Log antes de chamar notionService.atualizarStatusOrdem
    console.log(`Backend: Enviando para notionService.atualizarStatusOrdem (ordem ${id}):`, JSON.stringify(dadosAtualizacao, null, 2)); // DEBUG
    await notionService.atualizarStatusOrdem(id, dadosAtualizacao);
    console.log(`Backend: Status da ordem ${id} atualizado para ${status} no Notion.`);

    try {
      // Preparar dados para Firebase, incluindo dataInicio e servicosIndividuais se presentes
      const dadosParaFirebase = {
        status: dadosAtualizacao.status,
        dataInicio: dadosAtualizacao.dataInicio,
        dataFim: dadosAtualizacao.dataFim,
        realizado: dadosAtualizacao.realizado,
        pendencias: dadosAtualizacao.pendencias,
        servicosIndividuais: dadosAtualizacao.servicosIndividuais
      };
      // Log antes de chamar firebaseService.atualizarOrdemFirebase
      console.log(`Backend: Enviando para firebaseService.atualizarOrdemFirebase (ordem ${id}):`, JSON.stringify(dadosParaFirebase, null, 2)); // DEBUG
      await firebaseService.atualizarOrdemFirebase(id, dadosParaFirebase);
      console.log(`Backend: Campos da ordem ${id} atualizados no Firebase.`);
    } catch (firebaseError) {
      console.error(`Backend: Erro ao atualizar dados da ordem ${id} no Firebase:`, firebaseError);
      // Considerar se deve impactar a resposta de sucesso geral
    }

    res.json({
      success: true,
      message: "Status atualizado com sucesso no Notion e tentativa de atualização no Firebase."
    });
  } catch (error) {
    console.error(`Backend: Erro geral ao atualizar status da ordem ${req.params.id}:`, error.body || error.message, error);
    res.status(500).json({ error: "Erro ao atualizar status", details: error.message });
  }
});

// ROTA PARA SALVAR SERVIÇO INDIVIDUAL
/**
 * @route POST /ordem-servico/:id/servico-individual
 * @description Adiciona um registro de serviço individual ao campo "Realizado" de uma OS no Notion.
 * @param {string} req.params.id - ID da Ordem de Serviço (página do Notion).
 * @param {object} req.body - Dados do serviço { descricao, tecnicos, status, observacao }.
 * @returns {object} Resposta com o texto atualizado do campo "Realizado".
 */
router.post("/:id/servico-individual", async (req, res) => {
  const { id } = req.params;
  const servicoData = req.body;
  console.log(`[ordensRoutes] Rota /:id/servico-individual - Recebido para OS ${id}:`, JSON.stringify(servicoData, null, 2));

  if (!servicoData || !servicoData.descricao || !servicoData.tecnicos || !servicoData.status) {
    return res.status(400).json({ error: "Dados incompletos para o serviço individual. Descrição, técnicos e status são obrigatórios." });
  }

  try {
    const realizadoAtualizado = await notionService.concatenarServicoRealizado(id, servicoData);
    console.log(`[ordensRoutes] Serviço individual concatenado com sucesso para OS ${id}.`);
    
    // Tentar atualizar também no Firebase
    try {
        await firebaseService.atualizarCampoRealizadoFirebase(id, realizadoAtualizado);
        console.log(`[ordensRoutes] Campo Realizado atualizado no Firebase para OS ${id}.`);
    } catch (firebaseError) {
        console.warn(`[ordensRoutes] Falha ao atualizar campo Realizado no Firebase para OS ${id}:`, firebaseError.message);
        // Não interrompe o sucesso da operação no Notion
    }

    res.json({ 
        success: true, 
        message: "Serviço individual adicionado com sucesso ao Notion.",
        realizado: realizadoAtualizado
    });

  } catch (error) {
    console.error(`[ordensRoutes] Erro ao adicionar serviço individual para OS ${id}:`, error.body || error.message, error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || "Erro interno ao adicionar serviço individual.", details: error.body });
  }
});


// ROTA PARA BUSCAR ARQUIVOS DE SERVIÇO
/**
 * @route GET /ordem-servico/:id/arquivos-servico
 * @description Busca os arquivos anexados a uma Ordem de Serviço no Notion.
 * @param {string} req.params.id - ID da Ordem de Serviço (página do Notion).
 * @returns {Array<object>} Lista de arquivos, cada um com { name, url }.
 */
router.get("/:id/arquivos-servico", async (req, res) => {
  const { id } = req.params;
  console.log(`[ordensRoutes] Rota /:id/arquivos-servico - Buscando arquivos para OS ${id}`);

  try {
    const arquivos = await notionService.getArquivosServico(id);
    console.log(`[ordensRoutes] ${arquivos.length} arquivos encontrados para OS ${id}.`);
    res.json(arquivos);
  } catch (error) {
    console.error(`[ordensRoutes] Erro ao buscar arquivos de serviço para OS ${id}:`, error.body || error.message, error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || "Erro interno ao buscar arquivos de serviço.", details: error.body });
  }
});


module.exports = router;




// ROTA PARA SALVAR SERVIÇO INDIVIDUAL
/**
 * @route POST /ordem-servico/:osId/servico
 * @param {string} req.params.osId - ID da Ordem de Serviço
 * @param {Object} req.body - Dados do serviço (descricao, tecnicos, status, observacao)
 * @returns {Object} Resposta de sucesso ou erro
 */
router.post("/:osId/servico", async (req, res) => {
  const { osId } = req.params;
  const { descricao, tecnicos, status, observacao } = req.body;

  console.log(`[Rotas] Recebida requisição para salvar serviço individual para OS ID: ${osId}`);
  console.log("[Rotas] Dados do serviço:", JSON.stringify(req.body, null, 2));

  if (!descricao || !tecnicos || tecnicos.length === 0 || !status) {
    return res.status(400).json({ message: "Descrição, técnicos e status são obrigatórios." });
  }

  try {
    const textoConcatenado = await notionService.concatenarServicoRealizado(osId, { descricao, tecnicos, status, observacao });
    console.log(`[Rotas] Serviço concatenado e salvo no Notion para OS ID: ${osId}`);

    const servicoSalvoFirebase = await firebaseService.salvarServicoIndividual(osId, { descricao, tecnicos, status, observacao });
    console.log(`[Rotas] Serviço individual salvo no Firebase para OS ID: ${osId}, ID do Serviço: ${servicoSalvoFirebase.id}`);

    res.json({ 
      success: true, 
      message: "Serviço salvo com sucesso!", 
      notionText: textoConcatenado,
      firebaseId: servicoSalvoFirebase.id
    });

  } catch (error) {
    console.error(`[Rotas] Erro ao salvar serviço individual para OS ID ${osId}:`, error.body || error.message);
    const errorMessage = error.message || "Erro interno ao processar o salvamento do serviço.";
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ message: errorMessage, details: error.body || error.toString() });
  }
});

module.exports = router;
