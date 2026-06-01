'use strict';

(function () {
  const settings = getSettings();
  document.body.dataset.theme = settings.theme || 'light';

  const btn = document.getElementById('btnTheme');
  if (!btn) return;

  btn.textContent = settings.theme === 'dark' ? '☀️' : '🌙';

  btn.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    btn.textContent = next === 'dark' ? '☀️' : '🌙';
    saveSettings({ theme: next });
  });
})();
