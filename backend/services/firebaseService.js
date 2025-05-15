// services/firebaseService.js
// NÃO REMOVER - Serviço essencial para integração com Firebase

const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, child, update, push } = require("firebase/database"); // Adicionado push
const { getStorage, ref: storageRef, uploadString, getDownloadURL } = require("firebase/storage");
const dotenv = require("dotenv");

dotenv.config();

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDfzyQFMSDDWVoX-HUPVLy3vwi2dgAioZ4",
  authDomain: "os---perfecta.firebaseapp.com",
  projectId: "os---perfecta",
  storageBucket: "os---perfecta.firebasestorage.app",
  messagingSenderId: "573615861135",
  appId: "1:573615861135:web:af50c59522a3e166142ffa",
  measurementId: "G-6GFJST9FPJ",
  databaseURL: "https://os---perfecta-default-rtdb.firebaseio.com"
};

// Inicialização do Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);
const storage = getStorage(firebaseApp);

async function salvarOrdem(ordemId, dados) {
  try {
    const {
      cliente,
      endereco,
      cidade,
      agendamentoInicial,
      agendamentoFinal,
      prestadores,
      tipoServico,
      servicos,
      observacoes,
      responsavel,
      nos, 
      sts,
      lid 
    } = dados;
    
    let prestadoresObj = {};
    if (Array.isArray(prestadores)) {
      prestadores.forEach((p, index) => {
        prestadoresObj[index] = p;
      });
    } else if (typeof prestadores === "string") {
      prestadoresObj[0] = prestadores;
    } else if (prestadores && typeof prestadores === "object") {
      prestadoresObj = prestadores;
    } else {
      console.warn("[salvarOrdem] Tipo de prestadores não reconhecido:", typeof prestadores);
    }

    const dadosParaSalvar = {
      CL: cliente,
      ED: endereco,
      CD: cidade,
      PS: prestadoresObj,
      TS: tipoServico,
      SR: servicos,
      AI: agendamentoInicial,
      AF: agendamentoFinal,
      OBS: observacoes,
      RSP: responsavel,
      DTS: new Date().toISOString(),
      NOS: nos, 
      STS: sts, 
      LID: lid, 
      RZ: null, 
      PD: null, 
      INSER: null, 
      DTFIM: null 
    };

    Object.keys(dadosParaSalvar).forEach(key => dadosParaSalvar[key] === undefined && delete dadosParaSalvar[key]);
    console.log(`[salvarOrdem] Salvando Firebase para OS ${ordemId} com dados:`, JSON.stringify(dadosParaSalvar, null, 2));
    await set(ref(database, "ordens/" + ordemId), dadosParaSalvar);
    console.log(`[salvarOrdem] Ordem ${ordemId} salva com sucesso no Firebase.`);
  } catch (error) {
    console.error(`[salvarOrdem] Erro ao salvar ordem ${ordemId} no Firebase:`, error);
    throw error;
  }
}

async function salvarOrdemReabertaFirebase(ordemId, dados) {
  try {
    const {
      CL, ED, CD, AI, AF, EQ, TS, SV, OB, RP, HO,
      nos, 
      sts, 
      lid  
    } = dados;
    
    let prestadoresObj = {};
    if (Array.isArray(EQ)) {
      EQ.forEach((p, index) => {
        prestadoresObj[index] = p;
      });
    } else {
       console.warn("[salvarOrdemReabertaFirebase] EQ (Prestadores) não é um array:", EQ);
       prestadoresObj = {}; 
    }

    const dadosParaSalvar = {
      CL: CL,
      ED: ED,
      CD: CD,
      PS: prestadoresObj, 
      TS: TS,
      SR: SV, 
      AI: AI,
      AF: AF,
      OBS: OB, 
      RSP: RP, 
      HO: HO, 
      DTS: new Date().toISOString(), 
      NOS: nos, 
      STS: sts, 
      LID: lid, 
      RZ: null, 
      PD: null, 
      INSER: null, 
      DTFIM: null 
    };

    Object.keys(dadosParaSalvar).forEach(key => dadosParaSalvar[key] === undefined && delete dadosParaSalvar[key]);
    console.log(`[salvarOrdemReabertaFirebase] Salvando Firebase para OS REABERTA ${ordemId} com dados:`, JSON.stringify(dadosParaSalvar, null, 2));
    await set(ref(database, "ordens/" + ordemId), dadosParaSalvar);
    console.log(`[salvarOrdemReabertaFirebase] Ordem REABERTA ${ordemId} salva com sucesso no Firebase.`);
  } catch (error) {
    console.error(`[salvarOrdemReabertaFirebase] Erro ao salvar ordem REABERTA ${ordemId} no Firebase:`, error);
  }
}

async function atualizarOrdemGerenciamentoFirebase(ordemId, dados) {
  try {
    const {
      CL, ED, CD, AI, AF, EQ, TS, SV, OB, RP
    } = dados;

    let prestadoresObj = {};
    if (Array.isArray(EQ)) {
      EQ.forEach((p, index) => {
        prestadoresObj[index] = p;
      });
    } else {
       console.warn("[atualizarOrdemGerenciamentoFirebase] EQ (Prestadores) não é um array:", EQ);
       prestadoresObj = {}; 
    }

    const updates = {
      CL: CL,
      ED: ED,
      CD: CD,
      PS: prestadoresObj, 
      TS: TS,
      SR: SV, 
      AI: AI,
      AF: AF,
      OBS: OB, 
      RSP: RP 
    };

    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
    console.log(`[atualizarOrdemGerenciamentoFirebase] Atualizando Firebase para OS ${ordemId} com dados:`, JSON.stringify(updates, null, 2));
    await update(ref(database, "ordens/" + ordemId), updates);
    console.log(`[atualizarOrdemGerenciamentoFirebase] Ordem ${ordemId} atualizada com sucesso no Firebase.`);
  } catch (error) {
    console.error(`[atualizarOrdemGerenciamentoFirebase] Erro ao atualizar ordem ${ordemId} no Firebase:`, error);
  }
}

async function atualizarOrdemFirebase(ordemId, dadosParaAtualizar) {
  try {
    // Enhanced log for incoming data
    console.log(`[FirebaseService] Iniciando atualizarOrdemFirebase para OS ID: ${ordemId} com dados recebidos:`, JSON.stringify(dadosParaAtualizar, null, 2)); // DEBUG

    const updates = {};

    if (dadosParaAtualizar.status !== undefined) {
      updates["STS"] = dadosParaAtualizar.status;
    }
    if (dadosParaAtualizar.dataInicio !== undefined) {
      updates["INSER"] = dadosParaAtualizar.dataInicio;
    }
    if (dadosParaAtualizar.dataFim !== undefined) {
      updates["DTFIM"] = dadosParaAtualizar.dataFim;
    }
    if (dadosParaAtualizar.realizado !== undefined) {
      updates["RZ"] = dadosParaAtualizar.realizado;
    }
    if (dadosParaAtualizar.pendencias !== undefined) {
      updates["PD"] = dadosParaAtualizar.pendencias;
    }
    // Handling servicosIndividuais as per instructions for ordensRoutes.js
    if (dadosParaAtualizar.servicosIndividuais !== undefined) {
      updates["servicos_finalizados_snapshot"] = dadosParaAtualizar.servicosIndividuais; // Storing the snapshot of services at finalization
      console.log(`[FirebaseService] Incluindo 'servicos_finalizados_snapshot' para OS ID: ${ordemId}`); // DEBUG
    }

    // Remove undefined keys to avoid issues with Firebase update
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    if (Object.keys(updates).length > 0) {
      // Log for the actual updates object being sent to Firebase
      console.log(`[FirebaseService] Aplicando as seguintes atualizações no Firebase para OS ID ${ordemId}:`, JSON.stringify(updates, null, 2)); // DEBUG
      await update(ref(database, "ordens/" + ordemId), updates);
      console.log(`[FirebaseService] Ordem ${ordemId} atualizada com sucesso no Firebase.`);
    } else {
      console.log(`[FirebaseService] Nenhum dado relevante para atualizar no Firebase para ordem ${ordemId} em atualizarOrdemFirebase.`);
    }
  } catch (error) {
    console.error(`[FirebaseService] Erro ao atualizar ordem ${ordemId} no Firebase:`, error.message, error);
    // Consider re-throwing or handling more gracefully if needed by the caller
  }
}

/**
 * Salva um serviço individual executado no Firebase, sob a OS específica.
 * @param {string} osId - ID da Ordem de Serviço.
 * @param {object} servicoData - Dados do serviço { descricao, tecnicos, status, observacao }.
 * @returns {Promise<object>} Objeto com o ID do serviço salvo.
 */
async function salvarServicoIndividual(osId, servicoData) {
  try {
    console.log(`[salvarServicoIndividual] Salvando serviço para OS ID: ${osId}`, servicoData);
    const servicosExecutadosRef = ref(database, `ordens/${osId}/servicos_executados`);
    const novoServicoRef = push(servicosExecutadosRef); // Gera um ID único para o serviço

    const dadosServicoParaSalvar = {
      ...servicoData,
      timestamp: new Date().toISOString() // Adiciona um timestamp para referência
    };

    await set(novoServicoRef, dadosServicoParaSalvar);
    console.log(`[salvarServicoIndividual] Serviço salvo com ID: ${novoServicoRef.key} para OS ID: ${osId}`);
    return { id: novoServicoRef.key }; // Retorna o ID do serviço salvo

  } catch (error) {
    console.error(`[salvarServicoIndividual] Erro ao salvar serviço individual para OS ID ${osId}:`, error);
    throw error; // Re-lança o erro para ser tratado pela rota
  }
}


async function getOrdens() {
  try {
    const snapshot = await get(ref(database, "ordens"));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("Erro ao buscar ordens do Firebase:", error);
    throw error;
  }
}

async function getOrdem(ordemId) {
  try {
    const snapshot = await get(ref(database, "ordens/" + ordemId));
    const data = snapshot.exists() ? snapshot.val() : null;
    console.log(`[FirebaseService] getOrdem - Dados da ordem ${ordemId} (incluindo servicos_executados, se houver):`, JSON.stringify(data, null, 2)); // DEBUG
    return data;
  } catch (error) {
    console.error(`[FirebaseService] Erro ao buscar ordem ${ordemId} do Firebase:`, error);
    throw error;
  }
}

async function criarSlug(ordemId) {
  try {
    const slug = Math.random().toString(36).substring(2, 10);
    await set(ref(database, "slugs/" + slug), { ordemId });
    console.log(`[criarSlug] Slug ${slug} criado para ordem ${ordemId}.`);
    return slug;
  } catch (error) {
    console.error("Erro ao criar slug no Firebase:", error);
    throw error;
  }
}

async function getOrdemPorSlug(slug) {
  try {
    const snapshot = await get(ref(database, "slugs/" + slug));
    const mapping = snapshot.exists() ? snapshot.val() : null;
    if (!mapping) {
      throw new Error("Ordem não encontrada");
    }
    const { ordemId } = mapping;
    const ordemData = await getOrdem(ordemId);
    if (!ordemData) {
        throw new Error("Dados da ordem não encontrados no Firebase para o ID: " + ordemId);
    }
    return { id: ordemId, ...ordemData };
  } catch (error) {
    console.error("Erro ao buscar ordem por slug:", error);
    throw error;
  }
}

async function getOrdensPorData(data) {
  try {
    const ordens = await getOrdens();
    const ordensDoDia = [];
    for (const [id, ordem] of Object.entries(ordens)) {
      if (ordem && ordem.AI && ordem.AI.startsWith(data)) {
        ordensDoDia.push({
          id,
          cliente: ordem.CL,
          endereco: ordem.ED,
          cidade: ordem.CD,
          servicos: ordem.SR,
          prestadores: ordem.PS,
          tipoServico: ordem.TS,
          responsavel: ordem.RSP
        });
      }
    }
    return ordensDoDia;
  } catch (error) {
    console.error("Erro ao buscar ordens por data:", error);
    throw error;
  }
}

async function uploadImageDataUrl(dataUrl, path) {
  try {
    console.log(`Iniciando upload para ${path}`);
    const base64Data = dataUrl.split(",")[1];
    const fileRef = storageRef(storage, path);
    const snapshot = await uploadString(fileRef, base64Data, "base64");
    const downloadURL = await getDownloadURL(fileRef);
    console.log(`Upload concluído. URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error(`Erro ao fazer upload da imagem para ${path}:`, error);
    throw error;
  }
}

module.exports = {
  salvarOrdem, 
  getOrdens,
  getOrdem,
  criarSlug,
  getOrdemPorSlug,
  getOrdensPorData,
  uploadImageDataUrl,
  atualizarOrdemFirebase, 
  salvarOrdemReabertaFirebase, 
  atualizarOrdemGerenciamentoFirebase, 
  salvarServicoIndividual, // Exporta a nova função
  database,
  storage
};

