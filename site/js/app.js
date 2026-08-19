// app.js — busca, renderização, e o "cimento" que conecta auth.js, kv.js
// e layout.js. Não fala direto com o RAD nem com o KV — só usa o que os
// outros módulos expõem (decisão 7).

let atalhosAtuais = [];
let versaoAtual = null;

function faviconUrl(url) {
  try {
    const dominio = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${dominio}`;
  } catch (e) {
    return '';
  }
}

function ordenarAtalhos(atalhos) {
  return [...atalhos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
}

function filtrarAtalhos(atalhos, termo) {
  if (!termo) return atalhos;
  const t = termo.toLowerCase();
  return atalhos.filter((a) => a.nome.toLowerCase().includes(t) || a.url.toLowerCase().includes(t));
}

function renderizarAtalhos() {
  const termo = document.querySelector('#busca').value.trim();
  const lista = filtrarAtalhos(ordenarAtalhos(atalhosAtuais), termo);
  const container = document.querySelector('#lista-atalhos');
  const admin = Auth.isAdmin();

  container.innerHTML = '';
  container.classList.toggle('vazio', lista.length === 0);

  if (lista.length === 0) {
    container.innerHTML = '<p class="mensagem-vazia">Nenhum atalho encontrado.</p>';
    return;
  }

  lista.forEach((atalho) => {
    const item = document.createElement('div');
    item.className = 'atalho-item';
    item.innerHTML = `
      <a href="${atalho.url}" target="_blank" rel="noopener" class="atalho-link">
        <img src="${faviconUrl(atalho.url)}" alt="" class="atalho-icone" loading="lazy">
        <span class="atalho-nome">${atalho.nome}</span>
        <span class="atalho-dominio">${new URL(atalho.url).hostname}</span>
      </a>
      ${admin ? `<button class="atalho-excluir" data-id="${atalho.id}" title="Excluir">✕</button>` : ''}
    `;
    container.appendChild(item);
  });

  if (admin) {
    container.querySelectorAll('.atalho-excluir').forEach((btn) => {
      btn.addEventListener('click', () => excluirAtalho(btn.dataset.id));
    });
  }
}

async function carregarAtalhos() {
  const dados = await Kv.listar();
  atalhosAtuais = dados.atalhos || [];
  versaoAtual = dados.versao || null;
  renderizarAtalhos();
}

async function salvarAtalhosAtuais() {
  const resultado = await Kv.salvar(atalhosAtuais, versaoAtual);
  versaoAtual = resultado.versao;
}

async function adicionarAtalho(nome, url) {
  atalhosAtuais.push({
    id: crypto.randomUUID(),
    nome,
    url,
    categoria: null,
    ordem: atalhosAtuais.length,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
  try {
    await salvarAtalhosAtuais();
    renderizarAtalhos();
  } catch (e) {
    if (e instanceof VersionConflictError) {
      alert(e.message);
      await carregarAtalhos(); // recarrega a versão mais recente
    } else {
      alert(e.message);
    }
  }
}

async function excluirAtalho(id) {
  if (!confirm('Excluir este atalho?')) return;
  const anterior = atalhosAtuais;
  atalhosAtuais = atalhosAtuais.filter((a) => a.id !== id);
  try {
    await salvarAtalhosAtuais();
    renderizarAtalhos();
  } catch (e) {
    atalhosAtuais = anterior; // desfaz a remoção local se o Worker recusou
    if (e instanceof VersionConflictError) {
      alert(e.message);
      await carregarAtalhos();
    } else {
      alert(e.message);
    }
  }
}

function atualizarUIAdmin() {
  const admin = Auth.isAdmin();
  document.querySelector('#form-novo-atalho').style.display = admin ? 'flex' : 'none';
  renderizarAtalhos();
}

async function iniciar() {
  Layout.iniciar();

  document.querySelector('#busca').addEventListener('input', renderizarAtalhos);

  document.querySelector('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginValue = document.querySelector('#login-usuario').value;
    const senha = document.querySelector('#login-senha').value;
    try {
      await Auth.login(loginValue, senha);
      document.querySelector('#tela-login').style.display = 'none';
      document.querySelector('#tela-hub').style.display = 'block';
      atualizarUIAdmin();
      await carregarAtalhos();
    } catch (err) {
      document.querySelector('#login-erro').textContent = err.message;
    }
  });

  document.querySelector('#form-novo-atalho').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.querySelector('#novo-nome').value.trim();
    let url = document.querySelector('#novo-url').value.trim();
    if (!nome || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await adicionarAtalho(nome, url);
    e.target.reset();
  });

  if (Auth.isLoggedIn()) {
    document.querySelector('#tela-login').style.display = 'none';
    document.querySelector('#tela-hub').style.display = 'block';
    atualizarUIAdmin();
    await carregarAtalhos();
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
