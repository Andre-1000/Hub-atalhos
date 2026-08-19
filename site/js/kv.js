// kv.js — TODA comunicação com os atalhos passa pelo Worker (decisão 8).
// Este arquivo NUNCA fala direto com o Cloudflare KV — só o Worker tem a
// chave de acesso a ele.

const Kv = (() => {
  // Decisão 11: leitura simples, sem autenticação (visualizar atalhos não
  // depende do RAD nem exige perfil administrador).
  async function listar() {
    const resp = await fetch(`${CONFIG.WORKER_BASE_URL}/atalhos`);
    if (!resp.ok) throw new Error('Não foi possível carregar os atalhos.');
    return resp.json(); // { atalhos: [...], versao: "..." }
  }

  // Decisão 10 + 11: escrita exige token (o Worker revalida com o RAD antes
  // de aceitar) e envia a versão que o cliente tinha ao carregar a lista,
  // pro Worker detectar sobrescrita concorrente.
  async function salvar(atalhos, versaoConhecida) {
    const token = Auth.getToken();
    const resp = await fetch(`${CONFIG.WORKER_BASE_URL}/atalhos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ atalhos, versao: versaoConhecida }),
    });

    if (resp.status === 409) {
      throw new VersionConflictError('A lista foi alterada por outra pessoa. Recarregue antes de salvar.');
    }
    if (resp.status === 403) {
      throw new Error('Você não tem permissão de administrador para editar.');
    }
    if (!resp.ok) {
      throw new Error('Não foi possível salvar os atalhos.');
    }
    return resp.json(); // { versao: "nova-versao" }
  }

  return { listar, salvar };
})();

class VersionConflictError extends Error {}
