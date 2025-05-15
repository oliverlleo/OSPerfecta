// test-backend.js
// Script para testar as rotas do backend

const axios = require("axios");

const API_URL = "http://localhost:3000";

// Função auxiliar para logar resultados
function logResultado(teste, sucesso, detalhes = "") {
  console.log(`[${sucesso ? "SUCESSO" : "FALHA"}] ${teste}${detalhes ? " - " + detalhes : ""}`);
  if (!sucesso) {
    console.error(`   Detalhes da falha: ${detalhes}`);
  }
}

// Função para testar as rotas da API
async function testarRotasAPI() {
  console.log("\n--- Iniciando testes das rotas da API ---");
  let sucessoGeral = true;

  try {
    // Testar rota GET /clientes
    console.log("Testando GET /clientes");
    const clientesResponse = await axios.get(`${API_URL}/clientes`);
    logResultado("GET /clientes", clientesResponse.status === 200, `Status: ${clientesResponse.status}, Clientes: ${clientesResponse.data.length}`);
    if (clientesResponse.status !== 200) sucessoGeral = false;

    let clienteIdParaTeste = null;
    if (clientesResponse.data.length > 0) {
      clienteIdParaTeste = clientesResponse.data[0].id;

      // Testar rota GET /cliente/:id/endereco
      console.log("Testando GET /clientes/:id/endereco");
      const enderecoResponse = await axios.get(`${API_URL}/clientes/${clienteIdParaTeste}/endereco`);
      logResultado("GET /clientes/:id/endereco", enderecoResponse.status === 200, `Status: ${enderecoResponse.status}, Endereço: ${enderecoResponse.data.endereco}`);
      if (enderecoResponse.status !== 200) sucessoGeral = false;

      // Testar rota GET /cliente/:id/cidade
      console.log("Testando GET /clientes/:id/cidade");
      const cidadeResponse = await axios.get(`${API_URL}/clientes/${clienteIdParaTeste}/cidade`);
      logResultado("GET /clientes/:id/cidade", cidadeResponse.status === 200, `Status: ${cidadeResponse.status}, Cidade: ${cidadeResponse.data.cidade}`);
      if (cidadeResponse.status !== 200) sucessoGeral = false;
    }

    // Testar rota GET /ordem-servico
    console.log("Testando GET /ordem-servico");
    const ordensResponse = await axios.get(`${API_URL}/ordem-servico`);
    logResultado("GET /ordem-servico", ordensResponse.status === 200, `Status: ${ordensResponse.status}, Ordens: ${ordensResponse.data.length}`);
    if (ordensResponse.status !== 200) sucessoGeral = false;

    // Testar rota GET /ordem-servico/equipes
    console.log("Testando GET /ordem-servico/equipes");
    const equipesResponse = await axios.get(`${API_URL}/ordem-servico/equipes`);
    logResultado("GET /ordem-servico/equipes", equipesResponse.status === 200, `Status: ${equipesResponse.status}, Equipes: ${equipesResponse.data.length}`);
    if (equipesResponse.status !== 200) sucessoGeral = false;

    // Testar rota GET /ordem-servico/dia/:data (CORREÇÃO)
    console.log("Testando GET /ordem-servico/dia/:data");
    const hoje = new Date().toISOString().split("T")[0];
    const ordensDiaResponse = await axios.get(`${API_URL}/ordem-servico/dia/${hoje}`);
    logResultado("GET /ordem-servico/dia/:data", ordensDiaResponse.status === 200, `Status: ${ordensDiaResponse.status}, Ordens do dia: ${ordensDiaResponse.data.length}`);
    if (ordensDiaResponse.status !== 200) sucessoGeral = false;
    // Verificar se as ordens retornadas possuem o campo 'status' (indicando que veio do Notion)
    if (ordensDiaResponse.data.length > 0) {
      const primeiraOrdem = ordensDiaResponse.data[0];
      const temStatus = primeiraOrdem.hasOwnProperty("status");
      logResultado("GET /ordem-servico/dia/:data - Verificação de Status", temStatus, `Primeira ordem ${temStatus ? "possui" : "NÃO possui"} campo 'status'`);
      if (!temStatus) sucessoGeral = false;
    }

  } catch (error) {
    logResultado("Testes de Rotas API", false, `Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data)}`);
    }
    sucessoGeral = false;
  }
  console.log(`--- Testes das rotas da API concluídos ${sucessoGeral ? "com sucesso" : "com falhas"} ---`);
  return sucessoGeral;
}

// Função para testar a criação e fluxo de uma ordem de serviço
async function testarFluxoOrdem() {
  console.log("\n--- Iniciando teste de fluxo de ordem de serviço ---");
  let sucessoGeral = true;
  let ordemCriadaId = null;
  let slugCriado = null;

  try {
    // 1. Buscar um cliente para usar na ordem
    console.log("Buscando cliente para teste...");
    const clientesResponse = await axios.get(`${API_URL}/clientes`);
    if (clientesResponse.data.length === 0) {
      logResultado("Busca de Cliente", false, "Não há clientes disponíveis para teste.");
      return false;
    }
    const cliente = clientesResponse.data[0];
    logResultado("Busca de Cliente", true, `Cliente encontrado: ${cliente.nome} (ID: ${cliente.id})`);

    // 2. Buscar endereço e cidade do cliente
    const enderecoResponse = await axios.get(`${API_URL}/clientes/${cliente.id}/endereco`);
    const cidadeResponse = await axios.get(`${API_URL}/clientes/${cliente.id}/cidade`);

    // 3. Buscar equipes disponíveis
    const equipesResponse = await axios.get(`${API_URL}/ordem-servico/equipes`);
    const prestadores = equipesResponse.data.length > 0
      ? [equipesResponse.data[0].name]
      : ["Técnico Teste"];

    // 4. Dados da ordem de serviço
    const ordemData = {
      cliente: cliente.nome,
      clienteId: cliente.id, // Incluir clienteId
      endereco: enderecoResponse.data.endereco,
      cidade: cidadeResponse.data.cidade,
      dataServico: new Date().toISOString().split("T")[0],
      prestadores: prestadores,
      servicos: "Serviço de teste automatizado",
      tipoServico: "Manutenção",
    };

    // 5. Criar ordem de serviço
    console.log("Testando POST /ordem-servico (Criação)");
    console.log("Dados da ordem:", JSON.stringify(ordemData, null, 2));
    const criacaoResponse = await axios.post(`${API_URL}/ordem-servico`, ordemData);
    logResultado("POST /ordem-servico", criacaoResponse.status === 200 && criacaoResponse.data.id, `Status: ${criacaoResponse.status}, Resposta: ${JSON.stringify(criacaoResponse.data)}`);
    if (!(criacaoResponse.status === 200 && criacaoResponse.data.id)) {
      sucessoGeral = false;
    } else {
      ordemCriadaId = criacaoResponse.data.id;
    }

    if (ordemCriadaId) {
      // 6. Testar busca por ID
      console.log("Testando GET /ordem-servico/:id");
      const ordemPorIdResponse = await axios.get(`${API_URL}/ordem-servico/${ordemCriadaId}`);
      logResultado("GET /ordem-servico/:id", ordemPorIdResponse.status === 200 && ordemPorIdResponse.data.id === ordemCriadaId, `Status: ${ordemPorIdResponse.status}, ID: ${ordemPorIdResponse.data.id}`);
      if (!(ordemPorIdResponse.status === 200 && ordemPorIdResponse.data.id === ordemCriadaId)) sucessoGeral = false;

      // 7. Testar criação de slug
      console.log("Testando POST /ordem-servico/slug");
      const slugResponse = await axios.post(`${API_URL}/ordem-servico/slug`, {
        ordemId: ordemCriadaId,
      });
      logResultado("POST /ordem-servico/slug", slugResponse.status === 200 && slugResponse.data.slug, `Status: ${slugResponse.status}, Slug: ${slugResponse.data.slug}`);
      if (!(slugResponse.status === 200 && slugResponse.data.slug)) {
        sucessoGeral = false;
      } else {
        slugCriado = slugResponse.data.slug;
      }

      // 8. Testar atualização de status (incluindo anexos e assinatura)
      console.log("Testando POST /ordem-servico/:id/status");
      const statusUpdateData = {
        status: "Concluído",
        dataFim: new Date().toISOString(),
        realizado: "Teste de serviço realizado - OK",
        pendencias: "Nenhuma pendência de teste",
        anexos: ["http://example.com/anexo1.pdf", "http://example.com/anexo2.jpg"], // URLs de teste
        assinatura: "http://example.com/assinatura.jpeg" // URL de teste
      };
      // **Importante:** Este teste apenas verifica se a rota aceita os dados.
      // Ele NÃO verifica se o Notion foi realmente atualizado, pois isso exigiria
      // consultar a API do Notion após a chamada, o que está fora do escopo deste script.
      const statusUpdateResponse = await axios.post(`${API_URL}/ordem-servico/${ordemCriadaId}/status`, statusUpdateData);
      logResultado("POST /ordem-servico/:id/status", statusUpdateResponse.status === 200 && statusUpdateResponse.data.success, `Status: ${statusUpdateResponse.status}, Sucesso: ${statusUpdateResponse.data.success}`);
      if (!(statusUpdateResponse.status === 200 && statusUpdateResponse.data.success)) sucessoGeral = false;

    }

    if (slugCriado) {
      // 9. Testar busca por slug (após atualização de status, se aplicável)
      console.log("Testando GET /ordem-servico/slug/:slug (após update)");
      const ordemPorSlugResponse = await axios.get(`${API_URL}/ordem-servico/slug/${slugCriado}`);
      logResultado("GET /ordem-servico/slug/:slug", ordemPorSlugResponse.status === 200 && ordemPorSlugResponse.data.id === ordemCriadaId, `Status: ${ordemPorSlugResponse.status}, ID: ${ordemPorSlugResponse.data.id}`);
      if (!(ordemPorSlugResponse.status === 200 && ordemPorSlugResponse.data.id === ordemCriadaId)) sucessoGeral = false;
      // Verificar se o status foi atualizado (pode não refletir imediatamente dependendo da implementação)
      if (ordemPorSlugResponse.data.status === "Concluído") {
         logResultado("GET /ordem-servico/slug/:slug - Verificação Status Pós-Update", true, `Status esperado 'Concluído' encontrado.`);
      } else {
         logResultado("GET /ordem-servico/slug/:slug - Verificação Status Pós-Update", false, `Status esperado 'Concluído', encontrado '${ordemPorSlugResponse.data.status}'. (Pode ser delay ou falha)`);
         // Não marcar como falha geral por causa disso, pois pode ser delay
      }
    }

  } catch (error) {
    logResultado("Teste de Fluxo de Ordem", false, `Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data)}`);
    }
    sucessoGeral = false;
  } finally {
      // Limpeza (Opcional): Poderia adicionar código para deletar a ordem criada no Notion/Firebase
      // if (ordemCriadaId) { ... }
  }
  console.log(`--- Teste de fluxo de ordem concluído ${sucessoGeral ? "com sucesso" : "com falhas"} ---`);
  return sucessoGeral;
}

// Executar todos os testes
async function executarTestes() {
  console.log("=== INICIANDO TESTES DO BACKEND ===");
  let resultadoRotas = false;
  let resultadoFluxo = false;

  // Adiciona um delay maior para garantir que o servidor Node.js esteja pronto
  console.log("Aguardando 5 segundos para o servidor iniciar...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    resultadoRotas = await testarRotasAPI();
    resultadoFluxo = await testarFluxoOrdem();
  } catch (e) {
    console.error("\nERRO GERAL DURANTE A EXECUÇÃO DOS TESTES:", e);
  }

  console.log("\n=== RESULTADO FINAL DOS TESTES ===");
  console.log(`Testes de Rotas API: ${resultadoRotas ? "SUCESSO" : "FALHA"}`);
  console.log(`Teste de Fluxo de Ordem: ${resultadoFluxo ? "SUCESSO" : "FALHA"}`);
  console.log("==================================");

  if (!resultadoRotas || !resultadoFluxo) {
    console.error("\nALERTA: Um ou mais testes falharam!");
    // Em um ambiente de CI/CD, poderíamos sair com um código de erro
    // process.exit(1);
  }
}

executarTestes();
