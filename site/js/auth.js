// auth.js — TODA comunicação com o RAD fica isolada aqui (decisão 7 do
// documento de continuidade). Nenhum outro arquivo deve chamar o RAD
// diretamente. Se um dia trocar o provedor de login, é este o único
// arquivo a reescrever.
//
// O token do RAD é tratado como uma string opaca em todo o projeto —
// nenhuma lógica aqui ou em outro lugar tenta decodificar ou assumir
// formato dele (decisão 7).

const Auth = (() => {
  function getToken() {
    return localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY);
  }

  function getPerfis() {
    const raw = localStorage.getItem(CONFIG.TOKEN_STORAGE_KEY + '_perfis');
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function isAdmin() {
    return getPerfis().includes('administrador');
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function saveSession(token, perfis) {
    localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY, token);
    localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY + '_perfis', JSON.stringify(perfis || []));
  }

  function clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(CONFIG.TOKEN_STORAGE_KEY + '_perfis');
  }

  // Decisão 2: POST /usuarios/login/ — login/senha, devolve token + perfis.
  async function login(loginValue, senha) {
    const resp = await fetch(`${CONFIG.RAD_BASE_URL}/usuarios/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginValue, senha }),
    });

    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      throw new AuthError(resp.status, erro);
    }

    const data = await resp.json();
    saveSession(data.token, data.perfis);
    return data;
  }

  // Decisão 6: reconfirma o perfil na hora de editar, não confia no que
  // já está salvo localmente. Usa GET /usuarios/validar-token/.
  async function revalidarToken() {
    const token = getToken();
    if (!token) throw new AuthError(401, { detail: 'Sem sessão ativa.' });

    const resp = await fetch(`${CONFIG.RAD_BASE_URL}/usuarios/validar-token/`, {
      headers: { Authorization: `Token ${token}` },
    });

    if (!resp.ok) {
      clearSession();
      throw new AuthError(resp.status, await resp.json().catch(() => ({})));
    }

    const data = await resp.json();
    // mantém a lista de perfis local sincronizada com o que o RAD confirmou agora
    if (data.perfis) {
      localStorage.setItem(CONFIG.TOKEN_STORAGE_KEY + '_perfis', JSON.stringify(data.perfis));
    }
    return data;
  }

  // Decisão 9: handoff de sessão pro RAD via código de uso único.
  // Chamado só no momento em que o usuário clica no card do RAD.
  async function entrarNoRad() {
    const token = getToken();
    if (!token) throw new AuthError(401, { detail: 'Sem sessão ativa.' });

    const resp = await fetch(`${CONFIG.RAD_BASE_URL}/usuarios/gerar-codigo-acesso/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    });

    if (!resp.ok) {
      throw new AuthError(resp.status, await resp.json().catch(() => ({})));
    }

    const { codigo } = await resp.json();
    // O navegador visita essa URL; o RAD troca o código pela sessão dele
    // mesmo e redireciona pro painel. O Hub nunca escreve no storage do RAD.
    window.open(`${CONFIG.RAD_BASE_URL}/usuarios/entrar-com-codigo/?codigo=${encodeURIComponent(codigo)}`, '_blank');
  }

  function logout() {
    clearSession();
  }

  return { login, logout, isLoggedIn, isAdmin, getToken, getPerfis, revalidarToken, entrarNoRad };
})();

class AuthError extends Error {
  constructor(status, body) {
    super(body?.detail || `Erro de autenticação (${status})`);
    this.status = status;
    this.body = body;
  }
}
