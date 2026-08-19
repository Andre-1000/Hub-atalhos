# Hub-atalhos

Portal de atalhos internos (Hub / Ferramenta de Atalhos / FA).
Reaproveita o login do RAD Digital — sem sistema de autenticação próprio.

Ver `Hub_Trivia_Trens_continuidade.md` pra todo o histórico de decisões.

## Estrutura

- `site/` — front-end estático, deploy no Render.
- `worker/` — Cloudflare Worker, único ponto com acesso ao Cloudflare KV.

## Rodar localmente

`site/` não precisa de build — abrir `site/index.html` num navegador já funciona,
contanto que `site/js/config.js` aponte pro Worker já publicado (o Worker precisa
estar no ar; não dá pra rodar o KV localmente sem `wrangler dev`).

## Deploy do site/ (Render)

1. Criar um novo **Static Site** no Render, apontando pra pasta `site/` deste repositório.
2. Sem build command — é HTML/CSS/JS puro.
3. Depois do primeiro deploy, copiar a URL gerada (ex: `https://hub-atalhos-xxxx.onrender.com`)
   e atualizar em dois lugares:
   - `worker/index.js` → array `ORIGENS_PERMITIDAS`
   - `config/settings.py` do **RAD** → `CORS_ALLOWED_ORIGINS` (pendência técnica do documento de continuidade)

## Deploy do worker/ (Cloudflare Workers)

Requer conta Cloudflare e `wrangler` (CLI oficial).

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create ATALHOS_KV
# copiar o ID retornado pro wrangler.toml (criar esse arquivo, ver abaixo)
npx wrangler deploy
```

Criar `worker/wrangler.toml`:

```toml
name = "hub-atalhos-worker"
main = "index.js"
compatibility_date = "2026-08-19"

[[kv_namespaces]]
binding = "ATALHOS_KV"
id = "COLAR-O-ID-AQUI"
```

Depois do deploy, copiar a URL do Worker (ex: `https://hub-atalhos-worker.SEU-SUBDOMINIO.workers.dev`)
e atualizar em `site/js/config.js` → `WORKER_BASE_URL`.

## Pendências no lado do RAD (repositório separado, ver decisão 1)

Estas rotas ainda **não existem** no RAD e precisam ser implementadas lá
(não fazem parte deste repositório):

- `POST /usuarios/gerar-codigo-acesso/` — decisão 9
- `GET /usuarios/entrar-com-codigo/` — decisão 9
- `CORS_ALLOWED_ORIGINS` liberando o domínio do Hub — pendência de CORS

`POST /usuarios/login/` e `GET /usuarios/validar-token/` **já existem** e são
usadas como estão.
<!-- deploy inicial do worker -->
Trigger primeiro deploy do worker
<!-- deploy inicial do worker -->
correção do formato wrangler.toml
tentando denovo

