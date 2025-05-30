// backend/routes/gerenciamentoRoutes.js
// Rotas para o novo módulo de Gerenciamento de Ordens de Serviço

const express = require("express");
const router = express.Router();
const notionService = require("../services/notionService");
const firebaseService = require("../services/firebaseService"); // Descomentado para usar funções isoladas

/**
 * Rota para buscar ordens de serviço para a tela de gerenciamento.
 * Aceita query parameters para filtros.
 * 
 * @route GET /api/gerenciamento/ordens
 * @param {Object} req.query - Parâmetros de filtro (ex: status, cliente, local, etc.)
 * @returns {Array} Lista de ordens de serviço formatadas.
 */
router.get("/ordens", async (req, res) => {
  try {
    const filtros = req.query;
    console.log("[Gerenciamento Route] Recebidos filtros:", filtros);

    // Chamar a nova função no notionService
    const ordens = await notionService.getOrdensGerenciamento(filtros);
    // const ordens = []; // Placeholder inicial

    console.log(`[Gerenciamento Route] Retornando ${ordens.length} ordens.`);
    res.json(ordens);

  } catch (error) {
    console.error("[Gerenciamento Route] Erro ao buscar ordens para gerenciamento:", error);
    res.status(500).json({ error: "Erro interno ao buscar ordens para gerenciamento", details: error.message });
  }
});

// TODO: Implementar rota GET /api/gerenciamento/ordens/:id (buscar detalhes)
/**
 * Rota para buscar os dados detalhados de uma ordem de serviço específica.
 * 
 * @route GET /api/gerenciamento/ordens/:id
 * @param {string} req.params.id - ID da ordem de serviço (página do Notion).
 * @returns {Object} Dados detalhados da ordem de serviço e opções relacionadas.
 */
router.get("/ordens/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`[Gerenciamento Route] Buscando detalhes para OS ID: ${id}`);
    const ordemDetalhada = await notionService.getOrdemDetalhada(id);
    res.json(ordemDetalhada);
  } catch (error) {
    console.error(`[Gerenciamento Route] Erro ao buscar detalhes da OS ${id}:`, error);
    const statusCode = error.message === "Ordem de Serviço não encontrada." ? 404 : 500;
    res.status(statusCode).json({ error: `Erro ao buscar detalhes da OS ${id}`, details: error.message });
  }
});

// TODO: Implementar rota PUT /api/gerenciamento/ordens/:id (atualizar OS)
/**
 * Rota para atualizar os dados de uma ordem de serviço existente.
 * 
 * @route PUT /api/gerenciamento/ordens/:id
 * @param {string} req.params.id - ID da ordem de serviço (página do Notion).
 * @param {Object} req.body - Objeto contendo os dados a serem atualizados.
 * @returns {Object} Resposta da atualização.
 */
router.put("/ordens/:id", async (req, res) => {
  const { id } = req.params;
  const dadosParaAtualizar = req.body;
  // Log para depurar o que está chegando do frontend
  console.log(`[Gerenciamento Route - DEBUG] Recebido req.body para OS ID ${id}:`, JSON.stringify(req.body, null, 2));
  try {
    console.log(`[Gerenciamento Route] Atualizando OS ID: ${id} com dados:`, dadosParaAtualizar);
    const resultado = await notionService.atualizarOrdemServico(id, dadosParaAtualizar); // Changed to consolidated function

    // Não busca mais no Notion, pega direto do frontend
    const clienteNome = dadosParaAtualizar.clienteNome || 'N/A';
    const localEndereco = dadosParaAtualizar.endereco || 'N/A';
    const localCidade = dadosParaAtualizar.cidade || 'N/A';

    // Preparar dados para o Firebase (usando dados recebidos do frontend)
    const dadosParaFirebase = {
      CL: clienteNome, // Campo Cliente no Firebase
      ED: localEndereco, // Campo Endereço no Firebase
      CD: localCidade, // Campo Cidade no Firebase
      AI: dadosParaAtualizar.agendamentoInicial, // Agendamento Inicial
      AF: dadosParaAtualizar.agendamentoFinal, // Agendamento Final
      EQ: dadosParaAtualizar.prestadores, // Equipe (espera-se array)
      TS: dadosParaAtualizar.tipoServico, // Tipo de Serviço
      SV: dadosParaAtualizar.servicos, // Serviços/Execução
      OB: dadosParaAtualizar.observacoes, // Observações
      RP: dadosParaAtualizar.responsavel, // Responsável
      // Adicionar outros campos se necessário, ex: Status (ST)
      // ST: 'Atualizado' // Exemplo: Se precisar definir um status específico
    };

    // Chamar a função isolada para atualizar o Firebase
    await firebaseService.atualizarOrdemGerenciamentoFirebase(id, dadosParaFirebase);
    console.log(`[Gerenciamento Route] Firebase atualizado para OS ${id} via função isolada.`);

    res.json({ message: "Ordem de Serviço atualizada com sucesso no Notion e Firebase!", details: resultado });
  } catch (error) {
    console.error(`[Gerenciamento Route] Erro ao atualizar OS ${id}:`, error);
    res.status(500).json({ error: `Erro ao atualizar OS ${id}`, details: error.message });
  }
});

// Rota para criar uma nova OS (reaberta)
router.post("/ordens/reabrir", async (req, res) => {
  try {
    const dadosNovaOS = req.body;
    console.log("[Route] Recebido POST para /api/gerenciamento/ordens/reabrir com dados:", dadosNovaOS);

    // 1. Criar a OS no Notion
    const notionResponse = await notionService.criarOrdemReaberta(dadosNovaOS);
    const novaOrdemId = notionResponse.id;
    // Extrair NOS e STS da resposta do Notion
    const numeroOS = notionResponse.properties["O.S."]?.unique_id?.number || null;
    const statusInicial = notionResponse.properties.Status?.status?.name || "Não iniciada";

    // 2. Pegar dados do frontend para o Firebase (NÃO busca mais no Notion)
    const clienteNome = dadosNovaOS.clienteNome || 'N/A';
    const localEndereco = dadosNovaOS.endereco || 'N/A';
    const localCidade = dadosNovaOS.cidade || 'N/A';

    // 3. Preparar dados para o Firebase (usando a função isolada)
    const dadosParaFirebase = {
      CL: clienteNome, // Usa o nome do frontend
      ED: localEndereco, // Usa o endereço do frontend
      CD: localCidade, // Usa a cidade do frontend
      AI: dadosNovaOS.agendamentoInicial,
      AF: dadosNovaOS.agendamentoFinal,
      EQ: dadosNovaOS.prestadores, // EQ para Equipe
      TS: dadosNovaOS.tipoServico,
      SV: dadosNovaOS.servicos, // SV para Serviços
      OB: dadosNovaOS.observacoes, // OB para Observações
      RP: dadosNovaOS.responsavel, // RP para Responsável
      HO: dadosNovaOS.historicoOS, // Número da OS original
      // Novos campos para Firebase
      nos: numeroOS,
      sts: statusInicial,
      lid: dadosNovaOS.localId // Adicionar LID se disponível nos dadosNovaOS
    };

    // 4. Chamar a função isolada para salvar no Firebase
    await firebaseService.salvarOrdemReabertaFirebase(novaOrdemId, dadosParaFirebase);
    console.log(`[Route] Firebase salvo para OS REABERTA ${novaOrdemId} via função isolada.`);

    res.status(201).json({ message: "Ordem de Serviço reaberta criada com sucesso no Notion e Firebase!", notionResponse });

  } catch (error) {
    console.error("[Route] Erro ao criar OS reaberta:", error);
    res.status(500).json({ message: "Erro interno ao criar ordem de serviço reaberta", error: error.message });
  }
});

module.exports = router;

