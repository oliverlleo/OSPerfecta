const express = require("express");
const router = express.Router();
const notionService = require("../services/notionService"); // Consolidated service
const firebaseService = require("../services/firebaseService");

// Rota para ATUALIZAR uma Ordem de Serviço (PUT)
router.put("/ordens/:id", async (req, res) => {
    const { id } = req.params;
    const { notionData, firebaseData } = req.body;

    if (!notionData || !firebaseData) {
        return res.status(400).json({ message: "Dados para Notion (notionData) e Firebase (firebaseData) são obrigatórios." });
    }

    try {
        // Lógica para atualizar no Notion
        const resultadoNotion = await notionService.atualizarOrdemServico(id, notionData); // Changed to consolidated function
        
        // Mapeamento do payload do frontend (firebaseData) para o formato esperado pelo firebaseService.atualizarOrdemGerenciamentoFirebase
        const payloadFirebaseFormatado = {
            CL: firebaseData.clienteNome,       // Cliente Nome
            ED: firebaseData.enderecoOS,        // Endereço OS
            CD: firebaseData.cidadeOS,          // Cidade OS
            EQ: firebaseData.prestadores,       // Equipe/Prestadores (espera array de nomes)
            TS: firebaseData.tipoServico,       // Tipo de Serviço
            SV: firebaseData.servicos,          // Serviços (descrição dos serviços)
            AI: firebaseData.agendamentoInicial, // Agendamento Inicial
            AF: firebaseData.agendamentoFinal,   // Agendamento Final
            OB: firebaseData.observacoes,       // Observações
            RP: firebaseData.responsavel,       // Responsável
            // Campos adicionais que podem ser úteis ou necessários, mas não estão explicitamente na assinatura de atualizarOrdemGerenciamentoFirebase
            // No entanto, a função firebaseService.atualizarOrdemGerenciamentoFirebase só usa os campos acima.
            // LID: firebaseData.localId, // ID do Local, se necessário para alguma lógica interna no Firebase
            // NOS: firebaseData.numeroOS, // Número da OS, se necessário
            // STS: firebaseData.status, // Status, se necessário
        };

        // Remover chaves com valores undefined para não sobrescrever campos no Firebase desnecessariamente
        Object.keys(payloadFirebaseFormatado).forEach(key => {
            if (payloadFirebaseFormatado[key] === undefined || payloadFirebaseFormatado[key] === null) {
                delete payloadFirebaseFormatado[key];
            }
        });

        console.log(`[Rota Edição OS Dedicada] Payload formatado para Firebase:`, JSON.stringify(payloadFirebaseFormatado, null, 2));

        // Lógica para atualizar no Firebase
        const resultadoFirebase = await firebaseService.atualizarOrdemGerenciamentoFirebase(id, payloadFirebaseFormatado);

        res.status(200).json({ 
            message: "Ordem de Serviço atualizada com sucesso em ambas as fontes (Notion e Firebase) através da rota dedicada.",
            dataNotion: resultadoNotion,
            dataFirebase: resultadoFirebase
        });
    } catch (error) {
        console.error(`[Rota Edição OS Dedicada] Erro ao atualizar OS: ${id}`, error.message, error.stack);
        res.status(500).json({ message: "Erro interno no servidor ao tentar atualizar a OS pela rota dedicada.", error: error.message });
    }
});

// Rota para BUSCAR detalhes de uma Ordem de Serviço para edição (GET)
// Esta rota não foi alterada, pois o carregamento deve usar a rota original, conforme instrução.
// No entanto, a rota dedicada de GET ainda existe e usa o notionService.
// Se o frontend foi ajustado para usar a rota original de carregamento, esta rota GET dedicada pode não estar sendo usada ativamente pelo editar_os_isolado.html.
router.get("/ordens/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const osDetalhes = await notionService.getOrdemDetalhada(id); // Changed to consolidated function
        if (osDetalhes) {
            res.status(200).json(osDetalhes);
        } else {
            res.status(404).json({ message: "Ordem de Serviço não encontrada na rota dedicada." });
        }
    } catch (error) {
        console.error(`[Rota Edição OS Dedicada] Erro ao buscar OS: ${id}`, error);
        res.status(500).json({ message: "Erro interno no servidor ao buscar detalhes da OS pela rota dedicada.", error: error.message });
    }
});

module.exports = router;

