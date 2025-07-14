// services.js
// Camada de serviço para interação com o backend.
// Todas as chamadas para a API são centralizadas aqui.

// =================================================
//              CONSTANTES
// =================================================

// ID da base de dados de Locais no Notion.
const ILC = "1d8d9246083e80128f65f99939f3593d";


// =================================================
//              CLIENTES E LOCAIS
// =================================================

/**
 * Busca todos os clientes do banco de dados.
 * @returns {Promise<Array>} Lista de clientes.
 */
async function getClientes() {
  try {
    const response = await fetch(`${API_URL}/clientes`);
    if (!response.ok) {
      throw new Error("Erro ao buscar clientes");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    mostrarMensagem("Erro ao buscar clientes. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Busca todos os locais do banco de dados.
 * @returns {Promise<Array>} Lista de locais.
 */
async function getLocais() {
  try {
    const response = await fetch(`${API_URL}/locais?database=${ILC}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar locais");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar locais:", error);
    mostrarMensagem("Erro ao buscar locais. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Busca locais relacionados a um cliente específico.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<Array>} Lista de locais filtrados.
 */
async function getLocaisPorCliente(clienteId) {
  try {
    const response = await fetch(`${API_URL}/locais/cliente/${clienteId}?database=${ILC}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar locais do cliente");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar locais do cliente:", error);
    mostrarMensagem("Erro ao buscar locais do cliente. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Busca o endereço de um local específico.
 * @param {string} localId - ID do local.
 * @returns {Promise<string>} Endereço do local.
 */
async function getEnderecoLocal(localId) {
  try {
    const response = await fetch(`${API_URL}/locais/${localId}/endereco?database=${ILC}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar endereço do local");
    }
    const data = await response.json();
    return data.endereco;
  } catch (error) {
    console.error("Erro ao buscar endereço do local:", error);
    mostrarMensagem("Erro ao buscar endereço do local. Tente novamente.", "erro");
    return "";
  }
}

/**
 * Busca a cidade de um local específico.
 * @param {string} localId - ID do local.
 * @returns {Promise<string>} Cidade do local.
 */
async function getCidadeLocal(localId) {
  try {
    const response = await fetch(`${API_URL}/locais/${localId}/cidade?database=${ILC}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar cidade do local");
    }
    const data = await response.json();
    return data.cidade;
  } catch (error) {
    console.error("Erro ao buscar cidade do local:", error);
    mostrarMensagem("Erro ao buscar cidade do local. Tente novamente.", "erro");
    return "";
  }
}

/**
 * Busca o endereço de um cliente específico.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<string>} Endereço do cliente.
 */
async function getEndereco(clienteId) {
  try {
    const response = await fetch(`${API_URL}/clientes/${clienteId}/endereco`);
    if (!response.ok) {
      throw new Error("Erro ao buscar endereço");
    }
    const data = await response.json();
    return data.endereco;
  } catch (error) {
    console.error("Erro ao buscar endereço:", error);
    mostrarMensagem("Erro ao buscar endereço. Tente novamente.", "erro");
    return "";
  }
}

/**
 * Busca a cidade de um cliente específico.
 * @param {string} clienteId - ID do cliente.
 * @returns {Promise<string>} Cidade do cliente.
 */
async function getCidade(clienteId) {
  try {
    const response = await fetch(`${API_URL}/clientes/${clienteId}/cidade`);
    if (!response.ok) {
      throw new Error("Erro ao buscar cidade");
    }
    const data = await response.json();
    return data.cidade;
  } catch (error) {
    console.error("Erro ao buscar cidade:", error);
    mostrarMensagem("Erro ao buscar cidade. Tente novamente.", "erro");
    return "";
  }
}


// =================================================
//              ORDEM DE SERVIÇO (GERAL)
// =================================================

/**
 * Busca as opções de equipe disponíveis.
 * @returns {Promise<Array>} Lista de opções de equipe.
 */
async function getEquipe() {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/equipes`);
    if (!response.ok) {
      throw new Error("Erro ao buscar equipes");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    mostrarMensagem("Erro ao buscar equipes. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Busca as opções de responsáveis disponíveis.
 * @returns {Promise<Array>} Lista de opções de responsáveis.
 */
async function getResponsaveis() {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/responsaveis`);
    if (!response.ok) {
      throw new Error("Erro ao buscar responsáveis");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar responsáveis:", error);
    mostrarMensagem("Erro ao buscar responsáveis. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Cria uma nova ordem de serviço.
 * @param {Object} dados - Dados da ordem de serviço.
 * @returns {Promise<Object>} Resposta da criação.
 */
async function criarOrdemServico(dados) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Erro ao criar ordem de serviço");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao criar ordem de serviço:", error);
    mostrarMensagem(error.message || "Erro ao criar ordem de serviço. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Busca todas as ordens de serviço.
 * @returns {Promise<Array>} Lista de ordens de serviço.
 */
async function getOrdens() {
  try {
    const response = await fetch(`${API_URL}/ordem-servico`);
    if (!response.ok) {
      throw new Error("Erro ao buscar ordens");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar ordens:", error);
    mostrarMensagem("Erro ao buscar ordens. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Cria um slug para uma ordem de serviço.
 * @param {string} ordemId - ID da ordem de serviço.
 * @returns {Promise<Object>} Resposta com o slug.
 */
async function criarSlug(ordemId) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/slug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordemId })
    });
    if (!response.ok) {
      throw new Error("Erro ao criar link");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao criar link:", error);
    mostrarMensagem("Erro ao criar link. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Busca uma ordem de serviço pelo slug.
 * @param {string} slug - Slug da ordem de serviço.
 * @returns {Promise<Object>} Dados da ordem de serviço.
 */
async function getOrdemPorSlug(slug) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/slug/${slug}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar ordem pelo slug: ${response.status} ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar ordem pelo slug:", error);
    mostrarMensagem(error.message || "Erro ao buscar ordem. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Atualiza o status de uma ordem de serviço (usado para Iniciar Serviço, Finalizar OS, etc.).
 * @param {string} ordemId - ID da ordem de serviço.
 * @param {Object} dados - Dados para atualização (ex: { status: "Em andamento", dataInicio: new Date().toISOString() }).
 * @returns {Promise<Object>} Resposta da atualização.
 */
async function atualizarStatusOrdem(ordemId, dados) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/${ordemId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao atualizar status da OS." }));
      throw new Error(errorData.message || "Erro ao atualizar status da OS");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao atualizar status da OS:", error);
    mostrarMensagem(error.message || "Erro ao atualizar status da OS. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Inicia o serviço para uma OS.
 * @param {string} ordemId - ID da ordem de serviço.
 * @returns {Promise<Object>} Resposta da API.
 */
async function iniciarServicoOS(ordemId) {
  return atualizarStatusOrdem(ordemId, {
    status: "Em andamento",
    dataInicio: new Date().toISOString()
  });
}

/**
 * Finaliza uma OS com um status específico (Concluído ou Gerou Pendências).
 * @param {string} ordemId - ID da ordem de serviço.
 * @param {string} statusFinal - "Concluído" ou "Gerou Pendências".
 * @param {string} informacoesAdicionais - Informações sobre o que foi realizado ou pendências.
 * @param {Object} servicosExecutados - Objeto com os serviços individuais executados.
 * @returns {Promise<Object>} Resposta da API.
 */
async function finalizarOS(ordemId, statusFinal, informacoesAdicionais, servicosExecutados) {
  const dados = {
    status: statusFinal,
    dataFim: new Date().toISOString(),
    servicosIndividuais: servicosExecutados
  };
  if (statusFinal === "Concluído") {
    dados.realizado = informacoesAdicionais || "Serviços concluídos conforme descrito individualmente.";
  } else if (statusFinal === "Gerou Pendências") {
    dados.pendencias = informacoesAdicionais || "Pendências geradas conforme descrito individualmente.";
  }
  return atualizarStatusOrdem(ordemId, dados);
}

/**
 * Busca ordens de serviço para uma data específica.
 * @param {string} data - Data no formato YYYY-MM-DD.
 * @returns {Promise<Array>} Lista de ordens de serviço.
 */
async function getOrdensPorData(data) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/dia/${data}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar ordens do dia");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar ordens do dia:", error);
    mostrarMensagem("Erro ao buscar ordens do dia. Tente novamente.", "erro");
    return [];
  }
}

/**
 * Busca uma ordem de serviço pelo ID, incluindo os serviços executados.
 * @param {string} id - ID da ordem de serviço.
 * @returns {Promise<Object>} Dados da ordem de serviço.
 */
async function getOrdemPorId(id) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Ordem não encontrada para este ID");
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar ordem por ID: ${response.status} ${errorText}`);
      }
    }
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar ordem por ID:", error);
    mostrarMensagem(error.message || "Erro ao buscar ordem por ID. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Busca os arquivos da propriedade "Arquivos Serviço" para uma ordem específica.
 * @param {string} ordemId - ID da ordem de serviço (página do Notion).
 * @returns {Promise<Array>} Lista de objetos de arquivo { name: string, url: string }.
 */
async function getArquivosServicoPorOrdemId(ordemId) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/${ordemId}/arquivos-servico`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Nenhum arquivo encontrado ou propriedade "Arquivos Serviço" ausente para OS ID: ${ordemId}`);
        return [];
      } else {
        const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao buscar arquivos." }));
        throw new Error(errorData.message || `Erro ${response.status} ao buscar arquivos de serviço`);
      }
    }
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error(`Erro ao buscar arquivos de serviço para OS ID ${ordemId}:`, error);
    return [];
  }
}

/**
 * Salva um serviço individual executado para uma OS.
 * @param {string} osId - ID da Ordem de Serviço.
 * @param {object} servicoData - Dados do serviço { descricao, tecnicos, status, observacao }.
 * @returns {Promise<object>} Resposta da API, incluindo o ID do serviço salvo.
 */
async function salvarServicoIndividual(osId, servicoData) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/${osId}/servico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicoData)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao salvar serviço individual." }));
      throw new Error(errorData.message || `Erro ${response.status} ao salvar serviço individual`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erro ao salvar serviço individual para OS ID ${osId}:`, error);
    mostrarMensagem(error.message || "Erro ao salvar serviço individual. Tente novamente.", "erro");
    throw error;
  }
}

/**
 * Busca dados do campo "Realizado" do Notion.
 * @param {string} osId - ID da Ordem de Serviço.
 * @returns {Promise<string>} Conteúdo do campo "Realizado".
 */
async function getCampoRealizadoNotion(osId) {
  try {
    const response = await fetch(`${API_URL}/ordem-servico/${osId}/campo-realizado`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Campo "Realizado" não encontrado ou vazio para OS ID: ${osId}`);
        return null;
      }
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao buscar campo \"Realizado\"." }));
      throw new Error(errorData.message || `Erro ${response.status} ao buscar campo \"Realizado\"`);
    }
    const data = await response.json();
    return data.realizadoTexto;
  } catch (error) {
    console.error(`Erro ao buscar campo "Realizado" para OS ID ${osId}:`, error);
    throw error;
  }
}


// =================================================
//              MÓDULO DE GERENCIAMENTO
// =================================================

/**
 * Busca ordens de serviço para a tela de gerenciamento, com filtros.
 * @param {Object} filtros - Objeto contendo os filtros a serem aplicados.
 * @returns {Promise<Array>} Lista de ordens de serviço filtradas.
 */
async function getOrdensGerenciamento(filtros = {}) {
  try {
    const queryParams = new URLSearchParams(filtros).toString();
    const response = await fetch(`${API_URL}/api/gerenciamento/ordens?${queryParams}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar ordens para gerenciamento");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro em getOrdensGerenciamento:", error);
    return [];
  }
}

/**
 * Busca os dados detalhados de uma ordem de serviço específica pelo ID.
 * @param {string} ordemId - ID da ordem de serviço.
 * @returns {Promise<Object>} Dados detalhados da ordem de serviço.
 */
async function getOrdemDetalhada(ordemId) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento/ordens/${ordemId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Ordem não encontrada para este ID");
      } else {
        throw new Error("Erro ao buscar detalhes da ordem");
      }
    }
    return await response.json();
  } catch (error) {
    console.error("Erro em getOrdemDetalhada:", error);
    throw error;
  }
}

/**
 * Atualiza os dados de uma ordem de serviço existente.
 * @param {string} ordemId - ID da ordem de serviço a ser atualizada.
 * @param {Object} dadosParaAtualizar - Objeto contendo os campos e valores a serem atualizados.
 * @returns {Promise<Object>} Resposta da atualização.
 */
async function atualizarOrdem(ordemId, dadosParaAtualizar) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento/ordens/${ordemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosParaAtualizar)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao atualizar ordem." }));
      throw new Error(errorData.message || "Erro ao atualizar ordem de serviço");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro em atualizarOrdem:", error);
    throw error;
  }
}

/**
 * Cria uma nova ordem de serviço marcada como reaberta, vinculada a uma original.
 * @param {Object} dadosNovaOs - Dados da nova ordem de serviço.
 * @returns {Promise<Object>} Resposta da criação da nova ordem.
 */
async function criarOrdemReaberta(dadosNovaOs) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento/ordens/reabrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosNovaOs)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido ao reabrir ordem." }));
      throw new Error(errorData.message || "Erro ao reabrir ordem de serviço");
    }
    return await response.json();
  } catch (error) {
    console.error("Erro em criarOrdemReaberta:", error);
    throw error;
  }
}


// =================================================
//              MÓDULO ISOLADO (Edição/Reabertura v2)
// =================================================

/**
 * Busca os dados detalhados de uma ordem de serviço específica pelo ID (versão isolada).
 * @param {string} ordemId - ID da ordem de serviço.
 * @returns {Promise<Object>} Dados detalhados da ordem de serviço.
 */
async function getOrdemDetalhada_isolado(ordemId) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento_isolado/ordens/${ordemId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Ordem não encontrada para este ID (isolado)");
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar detalhes da ordem (isolado): ${response.status} ${errorText}`);
      }
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em getOrdemDetalhada_isolado:', error);
    throw error;
  }
}

/**
 * Atualiza os dados de uma ordem de serviço existente (versão isolada).
 * @param {string} ordemId - ID da ordem de serviço a ser atualizada.
 * @param {Object} dadosParaAtualizar - Objeto contendo os campos e valores a serem atualizados.
 * @returns {Promise<Object>} Resposta da atualização.
 */
async function atualizarOrdem_isolado(ordemId, dadosParaAtualizar) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento_isolado/ordens/${ordemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosParaAtualizar)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao atualizar ordem (isolado).' }));
      throw new Error(errorData.message || 'Erro ao atualizar ordem de serviço (isolado)');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em atualizarOrdem_isolado:', error);
    throw error;
  }
}

/**
 * Cria uma nova ordem de serviço marcada como reaberta, vinculada a uma original (versão isolada).
 * @param {Object} dadosNovaOs - Dados da nova ordem de serviço.
 * @returns {Promise<Object>} Resposta da criação da nova ordem.
 */
async function criarOrdemReaberta_isolado(dadosNovaOs) {
  try {
    const response = await fetch(`${API_URL}/api/gerenciamento_isolado/ordens/reabrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosNovaOs)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido ao reabrir ordem (isolado).' }));
      throw new Error(errorData.message || 'Erro ao reabrir ordem de serviço (isolado)');
    }
    return await response.json();
  } catch (error) {
    console.error('Erro em criarOrdemReaberta_isolado:', error);
    throw error;
  }
}
