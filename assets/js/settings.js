'use strict';

const settings = getSettings();
const toast = document.getElementById('savedToast');
let toastTimer;

function showToast() {
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== Win Score =====
const winScoreRadios = document.querySelectorAll('input[name="winScore"]');
winScoreRadios.forEach(radio => {
  if (Number(radio.value) === settings.winScore) radio.checked = true;
});

winScoreRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    saveSettings({ winScore: Number(radio.value) });
    showToast();
  });
});

// ===== Dark Mode Toggle =====
const toggleDark = document.getElementById('toggleDark');
toggleDark.checked = settings.theme === 'dark';

toggleDark.addEventListener('change', () => {
  const next = toggleDark.checked ? 'dark' : 'light';
  document.body.dataset.theme = next;
  const btn = document.getElementById('btnTheme');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
  saveSettings({ theme: next });
  showToast();
});

// ===== Sound Toggle =====
const toggleSound = document.getElementById('toggleSound');
toggleSound.checked = settings.soundEnabled !== false;

toggleSound.addEventListener('change', () => {
  saveSettings({ soundEnabled: toggleSound.checked });
  showToast();
});

// ===== Music Toggle =====
const toggleMusic = document.getElementById('toggleMusic');
toggleMusic.checked = settings.musicEnabled !== false;

toggleMusic.addEventListener('change', () => {
  saveSettings({ musicEnabled: toggleMusic.checked });
  showToast();
});

// ===== Reset All =====
document.getElementById('btnResetAll').addEventListener('click', () => {
  if (confirm('This will delete ALL statistics and leaderboard data. Are you sure?')) {
    resetStats();
    alert('All data has been reset.');
  }
});
