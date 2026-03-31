// cadastros.js

// Estado global para caches simples
let clientesCache = [];

document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados da aba inicial
    carregarClientes();

    // Listeners para troca de abas
    const triggerTabList = document.querySelectorAll('#cadastroTabs button, #cadastroTabs a');
    triggerTabList.forEach(triggerEl => {
        triggerEl.addEventListener('shown.bs.tab', event => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#clientes') carregarClientes();
            else if (targetId === '#locais') carregarLocais();
            else if (targetId === '#responsaveis') carregarResponsaveis();
            else if (targetId === '#tipos') carregarTipos();
            else if (targetId === '#prestadores') carregarPrestadores();
        });
    });
});

// --- Utilitários ---
function toast(msg, tipo = 'success') {
    const el = document.getElementById('mensagem-sistema');
    el.textContent = msg;
    el.className = `alert alert-${tipo === 'erro' ? 'danger' : 'success'}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// --- Clientes ---
async function carregarClientes() {
    const busca = document.getElementById('buscaCliente').value.toLowerCase();

    let query = supabaseClient.from('clients').select('*').order('name');
    if (busca) query = query.ilike('name', `%${busca}%`);

    const { data, error } = await query;
    if (error) return toast('Erro ao carregar clientes', 'erro');

    clientesCache = data; // Atualiza cache

    const tbody = document.getElementById('listaClientes');
    tbody.innerHTML = '';

    data.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${c.name}</td>
                <td><span class="badge bg-${c.active ? 'success' : 'secondary'}">${c.active ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarCliente('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-${c.active ? 'danger' : 'success'}" onclick="toggleAtivo('clients', '${c.id}', ${c.active}, carregarClientes)">
                        <i class="fas fa-${c.active ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function editarCliente(id) {
    const { data, error } = await supabaseClient.from('clients').select('*').eq('id', id).single();
    if (error) return toast('Erro ao buscar cliente', 'erro');

    document.getElementById('clienteId').value = data.id;
    document.getElementById('clienteNome').value = data.name;
    document.getElementById('clienteAtivo').checked = data.active;

    // Esconder seção de local rápido na edição
    document.getElementById('secaoLocaisRapidos').style.display = 'none';

    document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
    new bootstrap.Modal(document.getElementById('modalCliente')).show();
}

function abrirModalCliente() {
    document.getElementById('clienteId').value = '';
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteAtivo').checked = true;
    document.getElementById('localRapidoNome').value = '';
    document.getElementById('localRapidoEndereco').value = '';
    document.getElementById('localRapidoCidade').value = '';

    document.getElementById('secaoLocaisRapidos').style.display = 'block';

    document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
    new bootstrap.Modal(document.getElementById('modalCliente')).show();
}

async function salvarCliente() {
    const id = document.getElementById('clienteId').value;
    const name = document.getElementById('clienteNome').value;
    const active = document.getElementById('clienteAtivo').checked;

    if (!name) return toast('Nome obrigatório', 'erro');

    const dados = { name, active, updated_at: new Date() };

    let novoId = id;

    if (id) {
        const { error } = await supabaseClient.from('clients').update(dados).eq('id', id);
        if (error) return toast('Erro ao atualizar', 'erro');
    } else {
        const { data, error } = await supabaseClient.from('clients').insert(dados).select().single();
        if (error) return toast('Erro ao criar', 'erro');
        novoId = data.id;

        // Criar local rápido se preenchido
        const locNome = document.getElementById('localRapidoNome').value;
        const locEnd = document.getElementById('localRapidoEndereco').value;
        const locCid = document.getElementById('localRapidoCidade').value;

        if (locNome && locEnd && locCid) {
            await supabaseClient.from('client_locations').insert({
                client_id: novoId,
                name: locNome,
                address: locEnd,
                city: locCid
            });
        }
    }

    bootstrap.Modal.getInstance(document.getElementById('modalCliente')).hide();
    toast('Cliente salvo com sucesso');
    carregarClientes();
}

// --- Locais ---
async function carregarLocais() {
    const busca = document.getElementById('buscaLocal').value.toLowerCase();
    const filtroCliente = document.getElementById('filtroLocalCliente').value;

    // Atualizar dropdown de clientes se vazio
    if (document.getElementById('filtroLocalCliente').options.length <= 1) {
        const { data: clientes } = await supabaseClient.from('clients').select('id, name').order('name');
        const select = document.getElementById('filtroLocalCliente');
        const selectModal = document.getElementById('localClienteId');

        select.innerHTML = '<option value="">Todos os Clientes</option>';
        selectModal.innerHTML = '<option value="">Selecione...</option>';

        clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            selectModal.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    let query = supabaseClient.from('client_locations').select('*, clients(name)');
    if (busca) query = query.ilike('name', `%${busca}%`);
    if (filtroCliente) query = query.eq('client_id', filtroCliente);

    query = query.order('created_at', { ascending: false }); // Mostrar mais recentes primeiro

    const { data, error } = await query;
    if (error) return toast('Erro ao carregar locais', 'erro');

    const tbody = document.getElementById('listaLocais');
    tbody.innerHTML = '';

    data.forEach(l => {
        tbody.innerHTML += `
            <tr>
                <td>${l.name}</td>
                <td>${l.clients?.name || '-'}</td>
                <td>${l.address}</td>
                <td>${l.city}</td>
                <td><span class="badge bg-${l.active ? 'success' : 'secondary'}">${l.active ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarLocal('${l.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-${l.active ? 'danger' : 'success'}" onclick="toggleAtivo('client_locations', '${l.id}', ${l.active}, carregarLocais)">
                        <i class="fas fa-${l.active ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function abrirModalLocal() {
    document.getElementById('localId').value = '';
    document.getElementById('localClienteId').value = '';
    document.getElementById('localNome').value = '';
    document.getElementById('localEndereco').value = '';
    document.getElementById('localCidade').value = '';
    document.getElementById('localAtivo').checked = true;
    document.getElementById('modalLocalTitulo').textContent = 'Novo Local';
    new bootstrap.Modal(document.getElementById('modalLocal')).show();
}

async function editarLocal(id) {
    const { data, error } = await supabaseClient.from('client_locations').select('*').eq('id', id).single();
    if (error) return toast('Erro ao buscar local', 'erro');

    document.getElementById('localId').value = data.id;
    document.getElementById('localClienteId').value = data.client_id;
    document.getElementById('localNome').value = data.name;
    document.getElementById('localEndereco').value = data.address;
    document.getElementById('localCidade').value = data.city;
    document.getElementById('localAtivo').checked = data.active;
    document.getElementById('modalLocalTitulo').textContent = 'Editar Local';
    new bootstrap.Modal(document.getElementById('modalLocal')).show();
}

async function salvarLocal() {
    const id = document.getElementById('localId').value;
    const client_id = document.getElementById('localClienteId').value;
    const name = document.getElementById('localNome').value;
    const address = document.getElementById('localEndereco').value;
    const city = document.getElementById('localCidade').value;
    const active = document.getElementById('localAtivo').checked;

    if (!client_id || !name || !address || !city) return toast('Preencha todos os campos obrigatórios', 'erro');

    const dados = { client_id, name, address, city, active, updated_at: new Date() };

    if (id) {
        const { error } = await supabaseClient.from('client_locations').update(dados).eq('id', id);
        if (error) return toast('Erro ao atualizar', 'erro');
    } else {
        const { error } = await supabaseClient.from('client_locations').insert(dados);
        if (error) return toast('Erro ao criar', 'erro');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalLocal')).hide();
    toast('Local salvo com sucesso');
    carregarLocais();
}

// --- Responsáveis ---
async function carregarResponsaveis() {
    genericLoad('responsibles', 'listaResponsaveis', 'editarResponsavel', 'responsibles', 'buscaResponsavel');
}
function abrirModalResponsavel() { genericOpenModal('Responsavel'); }
async function editarResponsavel(id) { genericEdit('responsibles', id, 'Responsavel'); }
async function salvarResponsavel() { genericSave('responsibles', 'Responsavel'); }

// --- Tipos ---
async function carregarTipos() {
    genericLoad('service_types', 'listaTipos', 'editarTipo', 'service_types', 'buscaTipo');
}
function abrirModalTipo() { genericOpenModal('Tipo'); }
async function editarTipo(id) { genericEdit('service_types', id, 'Tipo'); }
async function salvarTipo() { genericSave('service_types', 'Tipo'); }

// --- Prestadores ---
async function carregarPrestadores() {
    genericLoad('providers', 'listaPrestadores', 'editarPrestador', 'providers', 'buscaPrestador');
}
function abrirModalPrestador() {
    genericOpenModal('Prestador');
    document.getElementById('prestadorLogin').value = '';
    document.getElementById('prestadorSenha').value = '';
}
async function editarPrestador(id) {
    // Custom edit for provider to include login/pass
    const { data, error } = await supabaseClient.from('providers').select('*').eq('id', id).single();
    if (error) return toast('Erro ao buscar', 'erro');

    document.getElementById('prestadorId').value = data.id;
    document.getElementById('prestadorNome').value = data.name;
    document.getElementById('prestadorLogin').value = data.login || '';
    document.getElementById('prestadorSenha').value = data.password || '';
    document.getElementById('prestadorAtivo').checked = data.active;
    document.getElementById('modalPrestadorTitulo').textContent = 'Editar Prestador';
    new bootstrap.Modal(document.getElementById('modalPrestador')).show();
}
async function salvarPrestador() {
    // Custom save for provider
    const id = document.getElementById('prestadorId').value;
    const name = document.getElementById('prestadorNome').value;
    const login = document.getElementById('prestadorLogin').value;
    const password = document.getElementById('prestadorSenha').value;
    const active = document.getElementById('prestadorAtivo').checked;

    if (!name || !login || !password) return toast('Todos os campos são obrigatórios', 'erro');
    if (password.length !== 4) return toast('A senha deve ter 4 dígitos', 'erro');

    const dados = { name, login, password, active, updated_at: new Date() };

    if (id) {
        const { error } = await supabaseClient.from('providers').update(dados).eq('id', id);
        if (error) return toast('Erro ao atualizar: ' + error.message, 'erro');
    } else {
        const { error } = await supabaseClient.from('providers').insert(dados);
        if (error) return toast('Erro ao criar: ' + error.message, 'erro');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalPrestador')).hide();
    toast('Salvo com sucesso');
    carregarPrestadores();
}


// --- Genéricos para tabelas simples (Nome/Ativo) ---
async function genericLoad(table, tbodyId, editFunc, callbackName, searchInputId) {
    const busca = document.getElementById(searchInputId).value.toLowerCase();
    let query = supabaseClient.from(table).select('*').order('name');
    if (busca) query = query.ilike('name', `%${busca}%`);

    const { data, error } = await query;
    if (error) return toast('Erro ao carregar dados', 'erro');

    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    // Mapear nome da função de callback para recarregar
    let reloadFunc;
    if (callbackName === 'responsibles') reloadFunc = carregarResponsaveis;
    if (callbackName === 'service_types') reloadFunc = carregarTipos;
    if (callbackName === 'providers') reloadFunc = carregarPrestadores;

    data.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${d.name}</td>
                <td><span class="badge bg-${d.active ? 'success' : 'secondary'}">${d.active ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="${editFunc}('${d.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-${d.active ? 'danger' : 'success'}" onclick="toggleAtivo('${table}', '${d.id}', ${d.active}, ${reloadFunc.name})">
                        <i class="fas fa-${d.active ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function genericOpenModal(type) {
    document.getElementById(type.toLowerCase() + 'Id').value = '';
    document.getElementById(type.toLowerCase() + 'Nome').value = '';
    document.getElementById(type.toLowerCase() + 'Ativo').checked = true;
    document.getElementById('modal' + type + 'Titulo').textContent = 'Novo ' + type;
    new bootstrap.Modal(document.getElementById('modal' + type)).show();
}

async function genericEdit(table, id, type) {
    const { data, error } = await supabaseClient.from(table).select('*').eq('id', id).single();
    if (error) return toast('Erro ao buscar', 'erro');

    const prefix = type.toLowerCase();
    document.getElementById(prefix + 'Id').value = data.id;
    document.getElementById(prefix + 'Nome').value = data.name;
    document.getElementById(prefix + 'Ativo').checked = data.active;
    document.getElementById('modal' + type + 'Titulo').textContent = 'Editar ' + type;
    new bootstrap.Modal(document.getElementById('modal' + type)).show();
}

async function genericSave(table, type) {
    const prefix = type.toLowerCase();
    const id = document.getElementById(prefix + 'Id').value;
    const name = document.getElementById(prefix + 'Nome').value;
    const active = document.getElementById(prefix + 'Ativo').checked;

    if (!name) return toast('Nome é obrigatório', 'erro');

    const dados = { name, active, updated_at: new Date() };

    if (id) {
        const { error } = await supabaseClient.from(table).update(dados).eq('id', id);
        if (error) return toast('Erro ao atualizar', 'erro');
    } else {
        const { error } = await supabaseClient.from(table).insert(dados);
        if (error) return toast('Erro ao criar', 'erro');
    }

    bootstrap.Modal.getInstance(document.getElementById('modal' + type)).hide();
    toast('Salvo com sucesso');

    if (type === 'Responsavel') carregarResponsaveis();
    if (type === 'Tipo') carregarTipos();
    if (type === 'Prestador') carregarPrestadores();
}

async function toggleAtivo(table, id, currentStatus, callback) {
    if (!confirm('Tem certeza que deseja alterar o status?')) return;

    const { error } = await supabaseClient.from(table).update({ active: !currentStatus }).eq('id', id);
    if (error) return toast('Erro ao atualizar status', 'erro');

    toast('Status atualizado');
    if (callback) callback();
    else if (typeof callback === 'string') window[callback](); // Handle string name
}
