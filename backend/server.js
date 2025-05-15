// server.js
// NÃO REMOVER - Arquivo principal do servidor

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Configuração de variáveis de ambiente
dotenv.config();

// Inicialização do app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Importação de rotas
const clientesRoutes = require("./routes/clientesRoutes");
const ordensRoutes = require("./routes/ordensRoutes");
const locaisRoutes = require("./routes/locaisRoutes"); // Importar novas rotas de locais
const gerenciamentoRoutes = require("./routes/gerenciamentoRoutes"); // Importar rotas de gerenciamento
const gerenciamentoIsoladoRoutes = require("./routes/gerenciamento_isolado_routes.js"); // Novas rotas isoladas
const edicaoOsDedicadaRoutes = require("./routes/edicaoOsDedicadaRoutes.js"); // Rota dedicada para edição de OS isolada

// Definição de rotas
app.use("/clientes", clientesRoutes);
app.use("/ordem-servico", ordensRoutes);
app.use("/locais", locaisRoutes); // Usar novas rotas de locais
app.use("/api/gerenciamento", gerenciamentoRoutes); // Usar rotas de gerenciamento com prefixo /api
app.use("/api/gerenciamento_isolado", gerenciamentoIsoladoRoutes); // Novas rotas isoladas com prefixo
app.use("/api/edicao_os_dedicada", edicaoOsDedicadaRoutes); // Rota dedicada para edição de OS isolada

// Rota para a página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Rota para a página de relatório
app.get("/relatorio/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/relatorio.html"));
});

// Inicialização do servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app; // Para testes

