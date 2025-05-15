// routes/clientesRoutes.js
// NÃO REMOVER - Rotas essenciais para clientes

const express = require('express');
const router = express.Router();
const notionService = require('../services/notionService');

// Rota para obter todos os clientes
router.get('/', async (req, res) => {
  try {
    const clientes = await notionService.getClientes();
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

// Rota para obter endereço do cliente
router.get('/:id/endereco', async (req, res) => {
  try {
    const { id } = req.params;
    const endereco = await notionService.getEndereco(id);
    res.json({ endereco });
  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
    res.status(500).json({ error: 'Erro ao buscar endereço' });
  }
});

// Rota para obter cidade do cliente
router.get('/:id/cidade', async (req, res) => {
  try {
    const { id } = req.params;
    const cidade = await notionService.getCidade(id);
    res.json({ cidade });
  } catch (error) {
    console.error('Erro ao buscar cidade:', error);
    res.status(500).json({ error: 'Erro ao buscar cidade' });
  }
});

module.exports = router;
