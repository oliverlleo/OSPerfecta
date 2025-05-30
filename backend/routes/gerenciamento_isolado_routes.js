// backend/routes/gerenciamentoRoutes.js
// Rotas para o novo módulo de Gerenciamento de Ordens de Serviço

const express = require("express");
const router = express.Router();
const notionService = require("../services/notionService"); // Consolidated service
// const firebaseService = require("../services/firebaseService"); // Descomentar se necessário

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
  try {
    console.log(`[Gerenciamento Route] Atualizando OS ID: ${id} com dados:`, dadosParaAtualizar);
    const resultado = await notionService.atualizarOrdemServico(id, dadosParaAtualizar); // Changed to consolidated function
    res.json({ message: "Ordem de Serviço atualizada com sucesso!", details: resultado });
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

    // 2. Preparar dados para salvar no Firebase (precisa extrair do Notion response ou usar dadosNovaOS)
    //    É importante ter os dados formatados como a função salvarOrdem espera.
    //    Vamos buscar os dados recém-criados do Notion para garantir consistência?
    //    Ou adaptar os dadosNovaOS?
    //    Por simplicidade e para seguir o padrão existente, vamos adaptar dadosNovaOS
    //    e buscar o nome do cliente do Notion (já que só temos o ID).

    const nomeCliente = await notionService.getClientes().then(clientes => {
        const cliente = clientes.find(c => c.id === dadosNovaOS.clienteId);
        return cliente ? cliente.nome : "Cliente não encontrado";
    });
    
    // Buscar endereço e cidade do LOCAL selecionado
    const ilcDatabaseId = process.env.NOTION_ILC || "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"; // Usar variável de ambiente
    const localInfo = await notionService.getLocais(ilcDatabaseId).then(locais => {
        const local = locais.find(l => l.id === dadosNovaOS.localId);
        return local ? { endereco: local.endereco, cidade: local.cidade } : { endereco: "", cidade: "" };
    });

    const dadosParaFirebase = {
        cliente: nomeCliente,
        endereco: localInfo.endereco,
        cidade: localInfo.cidade,
        agendamentoInicial: dadosNovaOS.agendamentoInicial,
        agendamentoFinal: dadosNovaOS.agendamentoFinal,
        prestadores: dadosNovaOS.prestadores, // Já deve estar no formato correto (array)
        tipoServico: dadosNovaOS.tipoServico,
        servicos: dadosNovaOS.servicos,
        observacoes: dadosNovaOS.observacoes,
        responsavel: dadosNovaOS.responsavel,
        // Não precisamos do historicoOS no Firebase
    };

    console.log("[Route] Dados preparados para Firebase:", dadosParaFirebase);

    // 3. Salvar no Firebase
    await firebaseService.salvarOrdem(novaOrdemId, dadosParaFirebase);
    console.log("[Route] Nova OS salva no Firebase.");

    // 4. Criar Slug
    const slug = await firebaseService.criarSlug(novaOrdemId);
    console.log(`[Route] Slug criado para nova OS: ${slug}`);

    res.status(201).json({ notionResponse, slug }); // Retorna resposta do Notion e slug

  } catch (error) {
    console.error("[Route] Erro ao criar OS reaberta:", error);
    res.status(500).json({ message: "Erro interno ao criar ordem de serviço reaberta", error: error.message });
  }
});

module.exports = router;

