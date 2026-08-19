// layout.js — alternância entre os 3 layouts (cards/grid/lista) e
// persistência via localStorage, por dispositivo (não por pessoa).

const Layout = (() => {
  const LAYOUTS = ['cards', 'grid', 'lista'];
  const PADRAO = 'grid';

  function obterAtual() {
    const salvo = localStorage.getItem(CONFIG.LAYOUT_STORAGE_KEY);
    return LAYOUTS.includes(salvo) ? salvo : PADRAO;
  }

  function definir(layout) {
    if (!LAYOUTS.includes(layout)) return;
    localStorage.setItem(CONFIG.LAYOUT_STORAGE_KEY, layout);
    document.body.dataset.layout = layout;
    document.querySelectorAll('[data-layout-btn]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layoutBtn === layout);
    });
  }

  function iniciar() {
    definir(obterAtual());
    document.querySelectorAll('[data-layout-btn]').forEach((btn) => {
      btn.addEventListener('click', () => definir(btn.dataset.layoutBtn));
    });
  }

  return { iniciar, definir, obterAtual };
})();
