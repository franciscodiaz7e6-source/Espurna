let _lang = localStorage.getItem('fs_lang') || 'ca';
let _t = {};
const _labels = {ca:'CA', en:'EN', es:'ES'};
const _names = {ca:'Català', en:'English', es:'Español'};

async function loadLang(lang) {
  try {
    const r = await fetch(`/Espvrna/locales/${lang}.json?v=2`);
    _t = await r.json();
    _lang = lang;
    localStorage.setItem('fs_lang', lang);
    applyAll();
    updateSelector();
  } catch(e) { console.warn('i18n error:', e); }
}

function t(key) { return _t[key] || key; }

function applyAll() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
}

function updateSelector() {
  const flag = document.getElementById('lang-flag');
  const label = document.getElementById('lang-label');
  if (flag) flag.src = `/Espvrna/assets/flags/${_lang}.svg`;
  if (label) label.textContent = _labels[_lang];
  const menu = document.getElementById('lang-menu');
  if (menu) menu.innerHTML = ['ca','en','es'].filter(l => l !== _lang).map(l =>
    `<div class="lang-opt" onclick="loadLang('${l}')">
      <img src="/Espvrna/assets/flags/${l}.svg"> ${_names[l]}
    </div>`).join('');
}

function toggleLang() {
  document.getElementById('lang-sel')?.classList.toggle('open');
  document.getElementById('lang-menu')?.classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#lang-sel')) {
    document.getElementById('lang-sel')?.classList.remove('open');
    document.getElementById('lang-menu')?.classList.remove('open');
  }
});

document.addEventListener('DOMContentLoaded', () => loadLang(_lang));
