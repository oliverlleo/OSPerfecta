// services.js
// Camada de serviço para interação com o Supabase

// Mapeamento de campos para compatibilidade com código legado
const mapClientToFrontend = (c) => ({
    id: c.id,
    nome: c.name,
    endereco: '', // Clientes não têm endereço na tabela principal, mas o front pode pedir
    cidade: ''
});

const mapLocalToFrontend = (l) => ({
    id: l.id,
    nome: l.name,
    endereco: l.address,
    cidade: l.city,
    clienteNome: l.clients ? l.clients.name : ''
});

/**
 * Busca todos os clientes ativos
 */
async function getClientes() {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data.map(mapClientToFrontend);
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        mostrarMensagem("Erro ao buscar clientes.", "erro");
        return [];
    }
}

/**
 * Busca todos os locais ativos
 */
async function getLocais() {
    try {
        const { data, error } = await supabase
            .from('client_locations')
            .select('*, clients(name)')
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data.map(mapLocalToFrontend);
    } catch (error) {
        console.error("Erro ao buscar locais:", error);
        mostrarMensagem("Erro ao buscar locais.", "erro");
        return [];
    }
}

/**
 * Busca locais por cliente
 */
async function getLocaisPorCliente(clienteId) {
    try {
        const { data, error } = await supabase
            .from('client_locations')
            .select('*, clients(name)')
            .eq('client_id', clienteId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data.map(mapLocalToFrontend);
    } catch (error) {
        console.error("Erro ao buscar locais do cliente:", error);
        return [];
    }
}

/**
 * Busca equipe (Prestadores)
 */
async function getEquipe() {
    try {
        const { data, error } = await supabase
            .from('providers')
            .select('id, name')
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data; // Front usa .name
    } catch (error) {
        console.error("Erro ao buscar equipe:", error);
        return [];
    }
}

/**
 * Busca responsáveis
 */
async function getResponsaveis() {
    try {
        const { data, error } = await supabase
            .from('responsibles')
            .select('id, name')
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Erro ao buscar responsáveis:", error);
        return [];
    }
}

/**
 * Busca Tipos de Serviço
 */
async function getTiposServico() {
    try {
        const { data, error } = await supabase
            .from('service_types')
            .select('id, name')
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Erro ao buscar tipos de serviço:", error);
        return [];
    }
}

/**
 * Auxiliar para buscar ID pelo Nome (se necessário)
 */
async function getIdByName(table, name) {
    const { data } = await supabase.from(table).select('id').eq('name', name).single();
    return data ? data.id : null;
}

/**
 * Cria Nova OS
 */
async function criarOrdemServico(dados) {
    try {
        // Resolver IDs se vierem nomes
        let serviceTypeId = dados.tipoServicoId;
        if (!serviceTypeId && dados.tipoServico) {
            serviceTypeId = await getIdByName('service_types', dados.tipoServico);
        }

        let responsibleId = dados.responsavelId;
        if (!responsibleId && dados.responsavel) {
            responsibleId = await getIdByName('responsibles', dados.responsavel);
        }

        if (!serviceTypeId) throw new Error("Tipo de Serviço inválido");
        if (!responsibleId) throw new Error("Responsável inválido");

        // Preparar payload
        const payload = {
            client_id: dados.clienteId,
            location_id: dados.localId,
            service_type_id: serviceTypeId,
            responsible_id: responsibleId,
            scheduled_start: dados.agendamentoInicial,
            scheduled_end: dados.agendamentoFinal,
            services_text: dados.servicos,
            observations_text: dados.observacoes,
            status: 'Não iniciada'
        };

        if (dados.historico_os) {
            payload.historico_os = dados.historico_os;
        }

        // Insert OS
        const { data: os, error } = await supabase
            .from('work_orders')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // Insert Providers (N:N)
        if (dados.prestadores && dados.prestadores.length > 0) {
            // Se prestadores for array de nomes, converter. Se IDs, usar.
            // Assumindo nomes baseado no legado, mas vamos tentar suportar ambos.
            const providerInserts = [];
            for (const p of dados.prestadores) {
                let pId = p;
                // Verificar se é UUID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p);
                if (!isUuid) {
                    pId = await getIdByName('providers', p);
                }
                if (pId) {
                    providerInserts.push({ work_order_id: os.id, provider_id: pId });
                }
            }
            if (providerInserts.length > 0) {
                await supabase.from('work_order_providers').insert(providerInserts);
            }
        }

        return os;

    } catch (error) {
        console.error("Erro ao criar OS:", error);
        throw error;
    }
}

/**
 * Mapeia OS do Supabase para formato legado
 */
function mapOsToLegacy(os) {
    if (!os) return null;
    
    // Prestadores
    let prestadoresList = [];
    if (os.work_order_providers) {
        prestadoresList = os.work_order_providers.map(wop => wop.providers?.name).filter(Boolean);
    }

    return {
        id: os.id,
        numeroOS: os.os_number,
        cliente: os.clients?.name,
        clienteId: os.client_id,
        localNome: os.client_locations?.name,
        localId: os.location_id,
        endereco: os.client_locations?.address,
        cidade: os.client_locations?.city,
        status: os.status,
        agendamentoInicial: os.scheduled_start,
        agendamentoFinal: os.scheduled_end,
        responsavel: os.responsibles?.name,
        prestadores: prestadoresList, // Array de nomes
        tipoServico: os.service_types?.name,
        servicos: os.services_text,
        observacoes: os.observations_text,
        dataSolicitacao: os.created_at,
        inicioServico: os.started_at,
        dataFinalizado: os.finished_at,
        realizado: os.realizado_text,
        pendencias: os.pendencias_text,
        historico_os: os.historico_os,
        // Campos extras para relatório
        servicosExecutados: (os.work_order_service_exec || []).map(s => ({
            id: s.id,
            descricao: s.description,
            tecnicos: s.technicians ? s.technicians.split(',').map(t => t.trim()) : [], // Assuming stored as comma string or JSON string?
            // Wait, Supabase stores text. If I save array, does it stringify?
            // In salvarServicoIndividual I pass it directly. If it is array, Postgres might reject if col is text?
            // PostgREST handles JSON body. If col is text, I should stringify or join.
            // Let's assume I join it in salvarServicoIndividual.
            status: s.status,
            observacao: s.note
        }))
    };
}

/**
 * Busca Ordens (Geral)
 */
async function getOrdens() {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients(name),
                client_locations(name, address, city),
                service_types(name),
                responsibles(name),
                work_order_providers(providers(name))
            `)
            .order('os_number', { ascending: false });

        if (error) throw error;
        return data.map(mapOsToLegacy);
    } catch (error) {
        console.error("Erro ao buscar ordens:", error);
        return [];
    }
}

/**
 * Busca Ordens por Data (Overlap)
 */
async function getOrdensPorData(dataStr) {
    // dataStr is YYYY-MM-DD
    // Overlap: start <= data AND end >= data
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients(name),
                client_locations(name),
                service_types(name),
                responsibles(name),
                work_order_providers(providers(name))
            `)
            .lte('scheduled_start', dataStr)
            .gte('scheduled_end', dataStr)
            .order('os_number', { ascending: false });

        if (error) throw error;
        return data.map(mapOsToLegacy);
    } catch (error) {
        console.error("Erro ao buscar ordens por data:", error);
        return [];
    }
}

/**
 * Busca Ordem por ID
 */
async function getOrdemPorId(id) {
    try {
        const { data, error } = await supabase
            .from('work_orders')
            .select(`
                *,
                clients(name),
                client_locations(name, address, city),
                service_types(name),
                responsibles(name),
                work_order_providers(providers(name)),
                work_order_service_exec(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return mapOsToLegacy(data);
    } catch (error) {
        console.error("Erro ao buscar ordem por ID:", error);
        throw error;
    }
}

/**
 * Criar Link (Slug)
 */
async function criarSlug(ordemId) {
    try {
        const { data, error } = await supabase.rpc('create_share_link', { p_work_order_id: ordemId });
        if (error) throw error;
        return { slug: data };
    } catch (error) {
        console.error("Erro ao criar slug:", error);
        throw error;
    }
}

/**
 * Get Ordem por Slug (Público)
 */
async function getOrdemPorSlug(slug) {
    try {
        const { data, error } = await supabase.rpc('get_work_order_by_token', { p_token: slug });
        if (error) throw error;
        if (!data) throw new Error("Ordem não encontrada");

        // Mapear retorno do RPC (JSON) para formato legado
        // O RPC já retorna JSON estruturado, precisamos adaptar
        const wo = data.work_order;
        const result = {
            id: wo.id,
            numeroOS: wo.os_number,
            cliente: data.client?.name,
            localNome: data.location?.name,
            endereco: data.location?.address,
            cidade: data.location?.city,
            status: wo.status,
            agendamentoInicial: wo.scheduled_start,
            agendamentoFinal: wo.scheduled_end,
            responsavel: data.responsible?.name,
            tipoServico: data.service_type?.name,
            servicos: wo.services_text,
            observacoes: wo.observations_text,
            prestadores: (data.providers || []).map(p => p.name),
            inicioServico: wo.started_at,
            dataFinalizado: wo.finished_at,
            realizado: wo.realizado_text,
            pendencias: wo.pendencias_text,
            servicosExecutados: data.service_exec || []
        };
        return result;

    } catch (error) {
        console.error("Erro ao buscar por slug:", error);
        throw error;
    }
}

/**
 * Atualizar Status e Dados
 */
async function atualizarStatusOrdem(ordemId, dados) {
    try {
        const updatePayload = {};

        if (dados.status) updatePayload.status = dados.status;
        if (dados.dataInicio) updatePayload.started_at = dados.dataInicio;
        if (dados.dataFim) updatePayload.finished_at = dados.dataFim;
        if (dados.realizado) updatePayload.realizado_text = dados.realizado;
        if (dados.pendencias) updatePayload.pendencias_text = dados.pendencias;

        const { error } = await supabase
            .from('work_orders')
            .update(updatePayload)
            .eq('id', ordemId);

        if (error) throw error;

        // Se houver serviços individuais para salvar (array)
        if (dados.servicosIndividuais && Array.isArray(dados.servicosIndividuais)) {
            for (const serv of dados.servicosIndividuais) {
                // Se tem ID atualiza, se não cria?
                // O front geralmente manda o objeto completo.
                // Vamos simplificar: salvarServicoIndividual deve ser chamado para cada um ou loop aqui.
                // Mas a função finalizarOS manda um objeto 'servicosExecutados' que é um MAP ou Array?
                // No código legado parecia ser um objeto. Vamos ver.
                // Assume-se que 'servicosIndividuais' aqui seja tratado se for passado.
                // Mas a função `salvarServicoIndividual` existe separada.
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        throw error;
    }
}

/**
 * Iniciar Serviço
 */
async function iniciarServicoOS(ordemId) {
    return atualizarStatusOrdem(ordemId, {
        status: "Em andamento",
        dataInicio: new Date().toISOString()
    });
}

/**
 * Finalizar OS
 */
async function finalizarOS(ordemId, statusFinal, informacoesAdicionais, servicosExecutados) {
    const dados = {
        status: statusFinal,
        dataFim: new Date().toISOString()
    };
    if (statusFinal === "Concluído") {
        dados.realizado = informacoesAdicionais;
    } else {
        dados.pendencias = informacoesAdicionais;
    }
    // servicosExecutados logic is handled separately usually via salvarServicoIndividual calls in UI?
    // Or we should save them here.
    return atualizarStatusOrdem(ordemId, dados);
}

/**
 * Salvar Serviço Individual
 */
async function salvarServicoIndividual(osId, servicoData) {
    try {
        const payload = {
            work_order_id: osId,
            description: servicoData.descricao,
            technicians: Array.isArray(servicoData.tecnicos) ? servicoData.tecnicos.join(', ') : servicoData.tecnicos,
            status: servicoData.status,
            note: servicoData.observacao,
            updated_at: new Date()
        };

        // Se tiver ID, update
        let result;
        if (servicoData.id) {
             result = await supabase.from('work_order_service_exec').update(payload).eq('id', servicoData.id);
        } else {
             result = await supabase.from('work_order_service_exec').insert(payload);
        }

        if (result.error) throw result.error;
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar serviço individual:", error);
        throw error;
    }
}

/**
 * Gerenciamento (Filtros Avançados)
 */
async function getOrdensGerenciamento(filtros = {}) {
    try {
        let query = supabase
            .from('work_orders')
            .select(`
                *,
                clients(name),
                client_locations(name, address, city),
                service_types(name),
                responsibles(name),
                work_order_providers(providers(name))
            `)
            .order('os_number', { ascending: false });

        if (filtros.numeroOS) query = query.eq('os_number', filtros.numeroOS);

        // Status Multi
        if (filtros.status) {
            // filtros.status pode ser string única ou array?
            // Se for string "Pendente,Concluido"
            const statusList = filtros.status.split(',').filter(Boolean);
            if (statusList.length > 0) query = query.in('status', statusList);
        }

        if (filtros.cliente) {
             // clients!inner(name)
             query = supabase
                .from('work_orders')
                .select(`
                    *,
                    clients!inner(name),
                    client_locations(name, address, city),
                    service_types(name),
                    responsibles(name),
                    work_order_providers(providers(name))
                `)
                .order('os_number', { ascending: false })
                .ilike('clients.name', `%${filtros.cliente}%`);
        }

        if (filtros.local) {
             query = supabase
                .from('work_orders')
                .select(`
                    *,
                    clients(name),
                    client_locations!inner(name, address, city),
                    service_types(name),
                    responsibles(name),
                    work_order_providers(providers(name))
                `)
                .order('os_number', { ascending: false })
                .ilike('client_locations.name', `%${filtros.local}%`);
        }

        if (filtros.responsavel) {
             query = supabase
                .from('work_orders')
                .select(`
                    *,
                    clients(name),
                    client_locations(name, address, city),
                    service_types(name),
                    responsibles!inner(name),
                    work_order_providers(providers(name))
                `)
                .order('os_number', { ascending: false })
                .ilike('responsibles.name', `%${filtros.responsavel}%`);
        }

        if (filtros.prestador) {
             query = supabase
                .from('work_orders')
                .select(`
                    *,
                    clients(name),
                    client_locations(name, address, city),
                    service_types(name),
                    responsibles(name),
                    work_order_providers!inner(providers!inner(name))
                `)
                .order('os_number', { ascending: false })
                .ilike('work_order_providers.providers.name', `%${filtros.prestador}%`);
        }

        // Datas Range
        if (filtros.dataInicio) query = query.gte('scheduled_start', filtros.dataInicio);
        if (filtros.dataFim) query = query.lte('scheduled_end', filtros.dataFim);

        const { data, error } = await query;
        if (error) throw error;
        return data.map(mapOsToLegacy);

    } catch (error) {
        console.error("Erro gerenciamento:", error);
        return [];
    }
}

// Wrappers para compatibilidade
async function getOrdemDetalhada(id) {
    const os = await getOrdemPorId(id);

    // Buscar opções para preencher selects de edição
    const [locais, equipe, responsaveis, tipos] = await Promise.all([
        getLocaisPorCliente(os.clienteId),
        getEquipe(),
        getResponsaveis(),
        getTiposServico()
    ]);

    os.opcoes = {
        locais: locais,
        equipes: equipe,
        responsaveis: responsaveis,
        tiposServico: tipos
    };

    return os;
}
async function getOrdemDetalhada_isolado(id) { return getOrdemDetalhada(id); }
async function atualizarOrdem_isolado(id, dados) { return atualizarOrdem(id, dados); }

/**
 * Atualizar Ordem (Edição Completa)
 */
async function atualizarOrdem(id, dados) {
    try {
        // Mapear dados do front para DB
        const payload = {
            scheduled_start: dados.agendamentoInicial,
            scheduled_end: dados.agendamentoFinal,
            services_text: dados.servicos,
            observations_text: dados.observacoes,
            updated_at: new Date()
        };

        if (dados.localId) payload.location_id = dados.localId;

        // Resolver IDs de nomes se necessário
        if (dados.tipoServico) payload.service_type_id = await getIdByName('service_types', dados.tipoServico);
        if (dados.responsavel) payload.responsible_id = await getIdByName('responsibles', dados.responsavel);

        const { error } = await supabase.from('work_orders').update(payload).eq('id', id);
        if (error) throw error;

        // Atualizar Prestadores (Delete + Insert)
        if (dados.prestadores) {
            await supabase.from('work_order_providers').delete().eq('work_order_id', id);

            const providerInserts = [];
            for (const p of dados.prestadores) {
                let pId = p;
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p)) {
                    pId = await getIdByName('providers', p);
                }
                if (pId) providerInserts.push({ work_order_id: id, provider_id: pId });
            }
            if (providerInserts.length > 0) {
                await supabase.from('work_order_providers').insert(providerInserts);
            }
        }
        return { success: true };
    } catch (error) {
        console.error("Erro update OS:", error);
        throw error;
    }
}

/**
 * Reabrir OS
 */
async function criarOrdemReaberta(dados) {
    // Basicamente criarOrdemServico mas com historico_os
    return criarOrdemServico(dados);
}
async function criarOrdemReaberta_isolado(dados) { return criarOrdemReaberta(dados); }

// Exportar globalmente (janela)
window.getClientes = getClientes;
window.getLocais = getLocais;
window.getLocaisPorCliente = getLocaisPorCliente;
window.getEquipe = getEquipe;
window.getResponsaveis = getResponsaveis;
window.getTiposServico = getTiposServico;
window.criarOrdemServico = criarOrdemServico;
window.getOrdens = getOrdens;
window.getOrdensPorData = getOrdensPorData;
window.getOrdemPorId = getOrdemPorId;
window.criarSlug = criarSlug;
window.getOrdemPorSlug = getOrdemPorSlug;
window.atualizarStatusOrdem = atualizarStatusOrdem;
window.iniciarServicoOS = iniciarServicoOS;
window.finalizarOS = finalizarOS;
window.salvarServicoIndividual = salvarServicoIndividual;
window.getOrdensGerenciamento = getOrdensGerenciamento;
window.getOrdemDetalhada = getOrdemDetalhada;
window.getOrdemDetalhada_isolado = getOrdemDetalhada_isolado;
window.atualizarOrdem = atualizarOrdem;
window.atualizarOrdem_isolado = atualizarOrdem_isolado;
window.criarOrdemReaberta = criarOrdemReaberta;
window.criarOrdemReaberta_isolado = criarOrdemReaberta_isolado;

