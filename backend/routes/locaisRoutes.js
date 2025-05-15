// routes/locaisRoutes.js
// Rotas para locais (condomínios)

const express = require("express");
const router = express.Router();
const notionService = require("../services/notionService");

// Rota para obter todos os locais (opcional, pode não ser necessária)
router.get("/", async (req, res) => {
  try {
    const databaseId = req.query.database; // Receber ID da base como query param
    if (!databaseId) {
      return res.status(400).json({ error: "ID da base de dados não fornecido" });
    }
    const locais = await notionService.getLocais(databaseId);
    res.json(locais);
  } catch (error) {
    console.error("Erro ao buscar locais:", error);
    res.status(500).json({ error: "Erro ao buscar locais" });
  }
});

// Rota para obter locais filtrados por cliente
router.get("/cliente/:clienteId", async (req, res) => {
  try {
    const { clienteId } = req.params;
    const databaseId = req.query.database; // Receber ID da base como query param
    if (!databaseId) {
      return res.status(400).json({ error: "ID da base de dados não fornecido" });
    }
    const locais = await notionService.getLocaisPorCliente(databaseId, clienteId);
    res.json(locais);
  } catch (error) {
    console.error("Erro ao buscar locais do cliente:", error);
    res.status(500).json({ error: "Erro ao buscar locais do cliente" });
  }
});

// Rota para obter endereço de um local específico
router.get("/:localId/endereco", async (req, res) => {
  try {
    const { localId } = req.params;
    const databaseId = req.query.database; // Receber ID da base como query param
    if (!databaseId) {
      return res.status(400).json({ error: "ID da base de dados não fornecido" });
    }
    const endereco = await notionService.getEnderecoLocal(databaseId, localId);
    res.json({ endereco });
  } catch (error) {
    console.error("Erro ao buscar endereço do local:", error);
    res.status(500).json({ error: "Erro ao buscar endereço do local" });
  }
});

// Rota para obter cidade de um local específico
router.get("/:localId/cidade", async (req, res) => {
  try {
    const { localId } = req.params;
    const databaseId = req.query.database; // Receber ID da base como query param
    if (!databaseId) {
      return res.status(400).json({ error: "ID da base de dados não fornecido" });
    }
    const cidade = await notionService.getCidadeLocal(databaseId, localId);
    res.json({ cidade });
  } catch (error) {
    console.error("Erro ao buscar cidade do local:", error);
    res.status(500).json({ error: "Erro ao buscar cidade do local" });
  }
});

module.exports = router;

