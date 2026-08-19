// Config centralizado — trocar de ambiente (teste/produção) é editar só este arquivo.
// Decisão 8 do documento de continuidade: nenhuma URL do RAD ou do Worker
// deve aparecer hardcoded em outro lugar do código.

const CONFIG = {
  RAD_BASE_URL: 'https://raddigital.onrender.com',
  WORKER_BASE_URL: 'https://hub-atalhos-worker.andre-luiz.workers.dev',
  TOKEN_STORAGE_KEY: 'portal_acessos_token',
  LAYOUT_STORAGE_KEY: 'portal_acessos_layout',
};
