// /home/ubuntu/extracted_zip/perfecta_os_final_corrigido/frontend/js/agendatrabalho.js

document.addEventListener("DOMContentLoaded", () => {
    initProgramacaoTrabalho();
});

async function initProgramacaoTrabalho() {
    const seletorData = document.getElementById("seletorData");
    const dataAtualEl = document.getElementById("dataAtual");

    const hoje = new Date();
    const offset = hoje.getTimezoneOffset();
    const hojeLocal = new Date(hoje.getTime() - (offset * 60 * 1000));
    seletorData.value = hojeLocal.toISOString().split("T")[0];

    function atualizarTituloData(dataSelecionadaStr) {
        const data = new Date(dataSelecionadaStr + "T00:00:00");
        const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });
        const dia = ("0" + data.getDate()).slice(-2);
        const mes = data.toLocaleDateString("pt-BR", { month: "long" });
        const ano = data.getFullYear();
        dataAtualEl.textContent = `Programação: ${diaSemana}, ${dia} de ${mes} de ${ano}`;
    }

    atualizarTituloData(seletorData.value);
    await carregarEExibirOrdens(seletorData.value);

    seletorData.addEventListener("change", async (event) => {
        atualizarTituloData(event.target.value);
        await carregarEExibirOrdens(event.target.value);
    });

    document.getElementById("exportarPDF").addEventListener("click", exportarProgramacaoComoPDF);
    document.getElementById("exportarJPEG").addEventListener("click", exportarProgramacaoComoJPEG);
    document.getElementById("exportarTexto").addEventListener("click", exportarProgramacaoComoTexto);
    // O botão Limpar Dados foi removido do HTML, então o listener abaixo não é mais necessário e pode ser removido ou comentado.
    // document.getElementById("limparDados").addEventListener("click", () => alert("Funcionalidade Limpar Dados a ser implementada."));
    document.getElementById("gerarOS").addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

async function exportarProgramacaoComoPDF() {
    const { jsPDF } = window.jspdf;
    const seletorData = document.getElementById("seletorData");
    const dataSelecionada = seletorData.value || new Date().toISOString().split("T")[0];
    const nomeArquivo = `programacao_${dataSelecionada}.pdf`;

    const areaParaCapturar = document.querySelector("main");
    const botoesExportacao = document.querySelector(".export-buttons");

    // Esconde os botões de exportação temporariamente
    if (botoesExportacao) botoesExportacao.style.display = "none";

    try {
        const canvas = await html2canvas(areaParaCapturar, {
            scale: 2, // Melhora a qualidade da imagem
            useCORS: true, // Para carregar imagens de outras origens, se houver
            logging: true,
            onclone: (documentClone) => {
                // Garante que o header e nav não sejam capturados, mesmo que estejam dentro do 'main' por algum motivo.
                // No nosso caso, eles estão fora, mas é uma boa prática.
                const headerClone = documentClone.querySelector("header");
                if (headerClone) headerClone.style.display = "none";
                const navClone = documentClone.querySelector("nav"); // Se houver nav dentro do main
                if (navClone) navClone.style.display = "none";
            }
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4"
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let alturaRestante = pdfHeight;
        let posicaoY = 0;
        const margem = 10; // Margem de 10mm em todas as direções
        const larguraUtil = pdfWidth - (2 * margem);
        const alturaUtilPagina = pdf.internal.pageSize.getHeight() - (2 * margem);

        // Adiciona a primeira página
        pdf.addImage(imgData, "PNG", margem, margem, larguraUtil, pdfHeight > alturaUtilPagina ? alturaUtilPagina : pdfHeight, undefined, "FAST");
        alturaRestante -= alturaUtilPagina;

        // Adiciona mais páginas se necessário
        while (alturaRestante > 0) {
            posicaoY += alturaUtilPagina;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", margem, margem - posicaoY, larguraUtil, pdfHeight, undefined, "FAST");
            alturaRestante -= alturaUtilPagina;
        }

        pdf.save(nomeArquivo);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
        // Mostra os botões de exportação novamente
        if (botoesExportacao) botoesExportacao.style.display = "";
    }
}

async function carregarEExibirOrdens(dataSelecionada) {
    try {
        document.getElementById("listaObrasExternas").innerHTML = "<p>Carregando...</p>";
        document.getElementById("listaServicosFabrica").innerHTML = "<p>Carregando...</p>";

        const ordensBrutas = await fetchOrdensDeServicoProgramacao(dataSelecionada);
        // A API já retorna os dados processados, então o nome da variável pode ser enganoso.
        // A função processarOSExtraida agora adapta a estrutura retornada pela API para a estrutura de renderização.
        const ordensProcessadas = ordensBrutas.map(os => processarOSExtraida(os)); 
        renderizarOrdensServico(ordensProcessadas);
    } catch (error) {
        console.error("Erro ao carregar e exibir ordens de serviço:", error);
        document.getElementById("listaObrasExternas").innerHTML = 
            `<p class="error-message">Erro ao carregar dados: ${error.message}. Verifique o console para mais detalhes.</p>`;
        document.getElementById("listaServicosFabrica").innerHTML = 
            `<p class="error-message">Erro ao carregar dados: ${error.message}. Verifique o console para mais detalhes.</p>`;
    }
}

async function fetchOrdensDeServicoProgramacao(data) {
    console.log(`Frontend: Buscando dados reais para a data: ${data}`);
    try {
        // Assumindo que config.js pode definir window.config.API_BASE_URL
        // Se não, o caminho relativo /ordem-servico/programacao será usado.
        const apiBaseUrl = (window.config && window.config.API_BASE_URL) ? window.config.API_BASE_URL : "";
        const url = `${apiBaseUrl}/ordem-servico/programacao?data=${data}`;
        
        console.log(`Frontend: Chamando API em: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            let errorData = { message: response.statusText };
            try {
                errorData = await response.json();
            } catch (e) {
                // Se o corpo do erro não for JSON, usa o statusText
            }
            console.error("Frontend: Erro na resposta da API:", response.status, errorData);
            throw new Error(`Erro ${response.status}: ${errorData.error || errorData.message || response.statusText}`);
        }
        
        const dadosRecebidos = await response.json();
        console.log("Frontend: Dados recebidos do backend:", dadosRecebidos);
        return dadosRecebidos;

    } catch (error) {
        console.error("Frontend: Erro ao buscar ordens de serviço via API:", error);
        throw error; // Re-lança o erro para ser tratado por carregarEExibirOrdens
    }
}

// Adapta a estrutura de dados retornada pelo backend para a estrutura esperada pela renderização.
function processarOSExtraida(osBruta) {
    const pageId = osBruta.id;
    const tipoServico = osBruta.tipoServico || "";
    let categoria = "";

    if (tipoServico === "Instalação" || tipoServico === "Manutenção") {
        categoria = "externa";
    } else if (tipoServico === "Fábrica") {
        categoria = "interna";
    }

    return {
        id: pageId,
        cliente: osBruta.cliente || "N/D",
        condominio: osBruta.local || "N/D",
        endereco: osBruta.localEndereco || "N/D",
        cidade: osBruta.localCidade || "N/D",
        equipe: Array.isArray(osBruta.prestadores) ? osBruta.prestadores.join(", ") : (osBruta.prestadores || "N/D"),
        servicos: (osBruta.servicos || "").split("\n").map(s => s.trim()).filter(s => s !== ""),
        observacoes: osBruta.observacoes || "Nenhuma",
        tipoServico: tipoServico,
        linkRelatorio: `relatorio.html?id=${pageId}`,
        categoria: categoria
    };
}

function renderizarOrdensServico(listaOS) {
    const listaObrasExternasEl = document.getElementById("listaObrasExternas");
    const listaServicosFabricaEl = document.getElementById("listaServicosFabrica");

    listaObrasExternasEl.innerHTML = "";
    listaServicosFabricaEl.innerHTML = "";

    const obrasExternas = listaOS.filter(os => os.categoria === "externa");
    const servicosFabrica = listaOS.filter(os => os.categoria === "interna");

    if (obrasExternas.length === 0) {
        listaObrasExternasEl.innerHTML = 
            "<p class=\"empty-message\">Nenhuma ordem de serviço de instalação ou manutenção cadastrada para esta data.</p>";
    } else {
        obrasExternas.forEach(os => {
            const osElement = criarOSElement(os, true);
            listaObrasExternasEl.appendChild(osElement);
        });
    }

    if (servicosFabrica.length === 0) {
        listaServicosFabricaEl.innerHTML = 
            "<p class=\"empty-message\">Nenhuma ordem de serviço de fábrica cadastrada para esta data.</p>";
    } else {
        servicosFabrica.forEach(os => {
            const osElement = criarOSElement(os, false);
            listaServicosFabricaEl.appendChild(osElement);
        });
    }
}

function criarOSElement(os, isExterna) {
    const div = document.createElement("div");
    div.classList.add("os-card");

    let servicosHtml = os.servicos.map(s => `<li>${escapeHtml(s)}</li>`).join("");
    if (!os.servicos || os.servicos.length === 0) servicosHtml = "<li>Nenhum serviço especificado.</li>";

    const observacoesHtml = os.observacoes ? escapeHtml(os.observacoes) : "Nenhuma.";

    div.innerHTML = `
        <h4>Cliente: ${escapeHtml(os.cliente)}</h4>
        <p><strong>Condomínio:</strong> ${escapeHtml(os.condominio)}</p>
        <p><strong>Endereço:</strong> ${escapeHtml(os.endereco)}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(os.cidade)}</p>
        <p><strong>Equipe:</strong> ${escapeHtml(os.equipe)}</p>
        <p><strong>Serviços a Realizar:</strong></p>
        <ul>${servicosHtml}</ul>
        <p><strong>Observações:</strong> ${observacoesHtml}</p>
        ${isExterna ? `<p><strong>Tipo de Serviço:</strong> ${escapeHtml(os.tipoServico)}</p>` : ""}
        <p><a href="${os.linkRelatorio}" target="_blank">Ver Relatório Completo</a></p>
    `;
    return div;
}

function escapeHtml(unsafe) {
    if (unsafe === null || typeof unsafe === "undefined") {
        return "";
    }
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Adiciona estilos CSS dinamicamente para os cards (mantido da versão anterior)
const style = document.createElement("style");
style.textContent = `
    .os-card {
        border: 1px solid #ddd;
        padding: 15px;
        margin-bottom: 15px;
        border-radius: 5px;
        background-color: #f9f9f9;
    }
    .os-card h4 {
        margin-top: 0;
        color: #333;
    }
    .os-card p {
        margin-bottom: 5px;
        font-size: 0.9em;
    }
    .os-card ul {
        margin-top: 0;
        padding-left: 20px;
    }
    .error-message {
        color: red;
        font-weight: bold;
    }
    .empty-message {
        color: #777;
        font-style: italic;
    }
`;
document.head.appendChild(style);



async function exportarProgramacaoComoJPEG() {
    const seletorData = document.getElementById("seletorData");
    const dataSelecionada = seletorData.value || new Date().toISOString().split("T")[0];
    const nomeArquivo = `programacao_${dataSelecionada}.jpeg`;

    const areaParaCapturar = document.querySelector("main");
    const botoesExportacao = document.querySelector(".export-buttons");

    // Esconde os botões de exportação temporariamente
    if (botoesExportacao) botoesExportacao.style.display = "none";

    try {
        const canvas = await html2canvas(areaParaCapturar, {
            scale: 2, // Melhora a qualidade da imagem
            useCORS: true,
            logging: true,
            onclone: (documentClone) => {
                const headerClone = documentClone.querySelector("header");
                if (headerClone) headerClone.style.display = "none";
                const navClone = documentClone.querySelector("nav");
                if (navClone) navClone.style.display = "none";
            }
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.9); // 0.9 é a qualidade do JPEG

        const link = document.createElement("a");
        link.href = imgData;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Erro ao gerar JPEG:", error);
        alert("Ocorreu um erro ao gerar o JPEG. Verifique o console para mais detalhes.");
    } finally {
        // Mostra os botões de exportação novamente
        if (botoesExportacao) botoesExportacao.style.display = "";
    }
}


async function exportarProgramacaoComoTexto() {
    const seletorData = document.getElementById("seletorData");
    const dataSelecionadaStr = seletorData.value || new Date().toISOString().split("T")[0];

    // Formatar a data para o cabeçalho do texto
    const dataObj = new Date(dataSelecionadaStr + "T00:00:00");
    const diaSemana = dataObj.toLocaleDateString("pt-BR", { weekday: "long" });
    const dia = ("0" + dataObj.getDate()).slice(-2);
    const mes = dataObj.toLocaleDateString("pt-BR", { month: "long" });
    const ano = dataObj.getFullYear();
    const tituloDataFormatado = `Programação ${diaSemana}, ${dia} de ${mes} de ${ano}`;

    let textoFinal = `🗓 ${tituloDataFormatado}\n\n`;

    try {
        // Reutilizar a lógica de busca e processamento de OS
        const ordensBrutas = await fetchOrdensDeServicoProgramacao(dataSelecionadaStr);
        if (!ordensBrutas || ordensBrutas.length === 0) {
            alert("Não há dados de programação para a data selecionada.");
            return;
        }
        const ordensProcessadas = ordensBrutas.map(os => processarOSExtraida(os));

        const obrasExternas = ordensProcessadas.filter(os => os.categoria === "externa");
        const servicosFabrica = ordensProcessadas.filter(os => os.categoria === "interna");

        if (obrasExternas.length > 0) {
            textoFinal += "🏗 Serviço Externo\n";
            obrasExternas.forEach(os => {
                const enderecoCompleto = `${os.endereco || ''}, ${os.condominio || ''}, ${os.cidade || ''}`.replace(/^, |, $/g, '').replace(/, ,/g, ',');
                const servicosTexto = os.servicos && os.servicos.length > 0 ? os.servicos.join("\n") : "Nenhum serviço especificado.";
                const linkAbsoluto = new URL(os.linkRelatorio, window.location.origin).href;
                textoFinal += `Cliente: ${os.cliente || 'N/D'}\n`;
                textoFinal += `Endereço: ${enderecoCompleto || 'N/D'}\n`;
                textoFinal += `Equipe: ${os.equipe || 'N/D'}\n`;
                textoFinal += `Serviço:\n${servicosTexto}\n`;
                textoFinal += `Obs: ${os.observacoes || 'Nenhuma'}\n`;
                textoFinal += `Tipo de Serviço: ${os.tipoServico || 'N/D'}\n`;
                textoFinal += `Link: ${linkAbsoluto}\n\n`;
            });
        }

        if (servicosFabrica.length > 0) {
            textoFinal += "⚙ Serviço Interno\n";
            servicosFabrica.forEach(os => {
                const servicosTexto = os.servicos && os.servicos.length > 0 ? os.servicos.join("\n") : "Nenhum serviço especificado.";
                const linkAbsoluto = new URL(os.linkRelatorio, window.location.origin).href;
                textoFinal += `Cliente: ${os.cliente || 'N/D'}\n`;
                textoFinal += `Serviço:\n${servicosTexto}\n`;
                textoFinal += `Equipe: ${os.equipe || 'N/D'}\n`;
                textoFinal += `Obs: ${os.observacoes || 'Nenhuma'}\n`;
                textoFinal += `Link: ${linkAbsoluto}\n\n`;
            });
        }

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textoFinal);
            alert("Texto da programação copiado para a área de transferência!");
        } else {
            // Fallback para navegadores/contextos não seguros (menos comum)
            const textArea = document.createElement("textarea");
            textArea.value = textoFinal;
            textArea.style.position = "fixed"; // Evita rolagem
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand("copy");
                alert("Texto da programação copiado para a área de transferência!");
            } catch (err) {
                console.error("Erro ao copiar texto (fallback):", err);
                alert("Erro ao copiar texto. Verifique o console.");
            }
            document.body.removeChild(textArea);
        }

    } catch (error) {
        console.error("Erro ao gerar texto para WhatsApp:", error);
        alert("Ocorreu um erro ao gerar o texto para WhatsApp. Verifique o console para mais detalhes.");
    }
}

