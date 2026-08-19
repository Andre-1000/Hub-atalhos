// worker/index.js — Cloudflare Worker.
//
// Único lugar de todo o projeto com acesso ao Cloudflare KV (decisão 8).
// A chave de leitura/escrita do KV nunca aparece no navegador — só existe
// aqui, no binding "ATALHOS_KV" configurado no painel do Cloudflare.
//
// Rotas:
//   GET  /atalhos        -> lista os atalhos, sem autenticação (decisão 11)
//   POST /atalhos        -> salva a lista inteira, exige token de admin
//                           válido no RAD (decisão 10) e checa versão
//                           (decisão 11)

const RAD_BASE_URL = 'https://raddigital.onrender.com';
const CHAVE_KV = 'atalhos:lista';

// Ajustar para o domínio real do Hub depois do deploy no Render (decisão 3)
const ORIGENS_PERMITIDAS = [
  'https://SEU-HUB.onrender.com', // TODO: trocar após o deploy do site/
];

function corsHeaders(origin) {
  const permitido = ORIGENS_PERMITIDAS.includes(origin);
  return {
    'Access-Control-Allow-Origin': permitido ? origin : ORIGENS_PERMITIDAS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

async function handleGet(env) {
  const raw = await env.ATALHOS_KV.get(CHAVE_KV);
  const dados = raw ? JSON.parse(raw) : { atalhos: [], versao: null };
  return Response.json(dados);
}

// Decisão 10: nunca confia no que a página informou — sempre revalida
// o token direto na fonte (RAD) antes de aceitar uma escrita.
async function validarAdmin(token) {
  if (!token) return false;
  const resp = await fetch(`${RAD_BASE_URL}/usuarios/validar-token/`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  return Array.isArray(data.perfis) && data.perfis.includes('administrador');
}

async function handlePost(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Token\s+/i, '');

  const admin = await validarAdmin(token);
  if (!admin) {
    return Response.json({ detail: 'Perfil administrador exigido.' }, { status: 403 });
  }

  const body = await request.json();
  const { atalhos, versao } = body;

  // Decisão 11: controle de versão — recusa se alguém salvou no meio tempo.
  const raw = await env.ATALHOS_KV.get(CHAVE_KV);
  const atual = raw ? JSON.parse(raw) : { atalhos: [], versao: null };

  if (atual.versao && atual.versao !== versao) {
    return Response.json(
      { detail: 'A lista foi alterada por outra pessoa. Recarregue antes de salvar.' },
      { status: 409 }
    );
  }

  const novaVersao = crypto.randomUUID();
  await env.ATALHOS_KV.put(CHAVE_KV, JSON.stringify({ atalhos, versao: novaVersao }));

  return Response.json({ versao: novaVersao });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (url.pathname !== '/atalhos') {
      return new Response('Not found', { status: 404, headers });
    }

    let resposta;
    if (request.method === 'GET') {
      resposta = await handleGet(env);
    } else if (request.method === 'POST') {
      resposta = await handlePost(request, env);
    } else {
      resposta = new Response('Method not allowed', { status: 405 });
    }

    Object.entries(headers).forEach(([k, v]) => resposta.headers.set(k, v));
    return resposta;
  },
};
