'use strict';

// ===== DOM REFERENCES =====
const score0El = document.getElementById('score--0');
const score1El = document.getElementById('score--1');
const current0El = document.getElementById('current--0');
const current1El = document.getElementById('current--1');
const name0El = document.getElementById('name--0');
const name1El = document.getElementById('name--1');
const player0El = document.querySelector('.player--0');
const player1El = document.querySelector('.player--1');

const diceEl = document.getElementById('diceEl');
const rollLogEl = document.getElementById('rollLog');
const targetLabelEl = document.getElementById('targetLabel');

const btnNew = document.getElementById('btnNew');
const btnRoll = document.getElementById('btnRoll');
const btnHold = document.getElementById('btnHold');

const modalOverlay = document.getElementById('modalOverlay');
const btnStart = document.getElementById('btnStart');
const inputName0 = document.getElementById('input--name0');
const inputName1 = document.getElementById('input--name1');
const inputWinScore = document.getElementById('input--winscore');

const btnTheme = document.getElementById('btnTheme');
const btnStatsToggle = document.getElementById('btnStatsToggle');
const statsPanel = document.getElementById('statsPanel');
const statsContent = document.getElementById('statsContent');
const btnResetStats = document.getElementById('btnResetStats');
const btnCloseStats = document.getElementById('btnCloseStats');

// ===== GAME STATE =====
let scores, currentScore, currentPlayer, playing, winScore;
let playerNames = ['Player 1', 'Player 2'];
let rolling = false;

// ===== STATISTICS (localStorage) =====
const STATS_KEY = 'pigGameStats';

function loadStats() {
  return JSON.parse(localStorage.getItem(STATS_KEY)) || { gamesPlayed: 0, wins: {} };
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function recordWin(playerName) {
  const stats = loadStats();
  stats.gamesPlayed++;
  stats.wins[playerName] = (stats.wins[playerName] || 0) + 1;
  saveStats(stats);
}

function renderStats() {
  const stats = loadStats();
  const total = stats.gamesPlayed;

  if (total === 0) {
    statsContent.innerHTML = '<p class="stat-empty">No games played yet.</p>';
    return;
  }

  const winRows = Object.entries(stats.wins)
    .sort((a, b) => b[1] - a[1])
    .map(([name, wins]) => {
      const pct = ((wins / total) * 100).toFixed(0);
      return `<div class="stat-row"><span>${name}</span><span>${wins} win${wins !== 1 ? 's' : ''} (${pct}%)</span></div>`;
    })
    .join('');

  statsContent.innerHTML = `
    <div class="stat-row"><span>Total Games</span><span>${total}</span></div>
    ${winRows}
  `;
}

btnStatsToggle.addEventListener('click', () => {
  const isOpen = statsPanel.classList.toggle('is-open');
  if (isOpen) renderStats();
});

btnCloseStats.addEventListener('click', () => statsPanel.classList.remove('is-open'));

btnResetStats.addEventListener('click', () => {
  localStorage.removeItem(STATS_KEY);
  renderStats();
});

// ===== DARK MODE =====
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
}

btnTheme.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('pigGameTheme', next);
});

// Restore saved theme on page load
applyTheme(localStorage.getItem('pigGameTheme') || 'light');

// ===== ROLL LOG =====
function addLogEntry(text, isDanger = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isDanger) li.classList.add('danger');
  rollLogEl.prepend(li);
  // Cap log at 8 visible entries
  while (rollLogEl.children.length > 8) {
    rollLogEl.removeChild(rollLogEl.lastChild);
  }
}

function clearLog() {
  rollLogEl.innerHTML = '';
}

// ===== GAME INITIALISATION =====
function init(names, targetScore) {
  scores = [0, 0];
  currentScore = 0;
  currentPlayer = 0;
  playing = true;
  winScore = targetScore || 100;
  playerNames = names || ['Player 1', 'Player 2'];

  score0El.textContent = 0;
  score1El.textContent = 0;
  current0El.textContent = 0;
  current1El.textContent = 0;
  name0El.textContent = playerNames[0];
  name1El.textContent = playerNames[1];
  targetLabelEl.textContent = `First to ${winScore} pts`;

  diceEl.classList.add('hidden');
  player0El.classList.remove('player--winner');
  player1El.classList.remove('player--winner');
  player0El.classList.add('player--active');
  player1El.classList.remove('player--active');

  clearLog();
  btnRoll.disabled = false;
  btnHold.disabled = false;
}

// ===== START MODAL =====
// Show modal on page load
modalOverlay.classList.remove('hidden');

btnStart.addEventListener('click', () => {
  const name0 = inputName0.value.trim() || 'Player 1';
  const name1 = inputName1.value.trim() || 'Player 2';
  const target = Number(inputWinScore.value);
  init([name0, name1], target);
  modalOverlay.classList.add('hidden');
});

// Allow Enter key to confirm from any modal field
[inputName0, inputName1, inputWinScore].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnStart.click();
  });
});

// ===== SWITCH PLAYER =====
function switchPlayer() {
  document.getElementById(`current--${currentPlayer}`).textContent = 0;
  currentScore = 0;
  currentPlayer = currentPlayer === 0 ? 1 : 0;
  player0El.classList.toggle('player--active');
  player1El.classList.toggle('player--active');
  clearLog();
}

// ===== ANIMATED DICE ROLL =====
function rollDice(callback) {
  if (!playing || rolling) return;

  rolling = true;
  btnRoll.disabled = true;
  btnHold.disabled = true;
  diceEl.classList.remove('hidden');

  let cycles = 0;
  const totalCycles = 7;

  const interval = setInterval(() => {
    diceEl.src = `dice-${Math.trunc(Math.random() * 6) + 1}.png`;
    cycles++;

    if (cycles >= totalCycles) {
      clearInterval(interval);
      const finalFace = Math.trunc(Math.random() * 6) + 1;
      diceEl.src = `dice-${finalFace}.png`;

      diceEl.classList.add('dice--rolling');
      diceEl.addEventListener('animationend', () => {
        diceEl.classList.remove('dice--rolling');
        rolling = false;
        btnRoll.disabled = false;
        btnHold.disabled = false;
        callback(finalFace);
      }, { once: true });
    }
  }, 80);
}

// ===== ROLL BUTTON =====
btnRoll.addEventListener('click', () => {
  rollDice(dice => {
    if (dice !== 1) {
      currentScore += dice;
      document.getElementById(`current--${currentPlayer}`).textContent = currentScore;
      addLogEntry(`🎲 Rolled ${dice} → total ${currentScore}`);
    } else {
      addLogEntry(`💥 Rolled 1 — lost turn!`, true);
      // Brief pause so the player can see the bad roll before switching
      btnRoll.disabled = true;
      btnHold.disabled = true;
      setTimeout(() => {
        switchPlayer();
        if (playing) {
          btnRoll.disabled = false;
          btnHold.disabled = false;
        }
      }, 700);
    }
  });
});

// ===== HOLD BUTTON =====
btnHold.addEventListener('click', () => {
  if (!playing || rolling) return;

  scores[currentPlayer] += currentScore;
  document.getElementById(`score--${currentPlayer}`).textContent = scores[currentPlayer];

  if (scores[currentPlayer] >= winScore) {
    // Game over — this player wins
    playing = false;
    diceEl.classList.add('hidden');
    document.querySelector(`.player--${currentPlayer}`).classList.add('player--winner');
    document.querySelector(`.player--${currentPlayer}`).classList.remove('player--active');
    recordWin(playerNames[currentPlayer]);
    clearLog();
    addLogEntry(`🏆 ${playerNames[currentPlayer]} wins!`);
    btnRoll.disabled = true;
    btnHold.disabled = true;
  } else {
    switchPlayer();
  }
});

// ===== NEW GAME BUTTON ===== Re-opens the modal so players can change names / target
btnNew.addEventListener('click', () => {
  modalOverlay.classList.remove('hidden');
  inputName0.value = playerNames[0] !== 'Player 1' ? playerNames[0] : '';
  inputName1.value = playerNames[1] !== 'Player 2' ? playerNames[1] : '';
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  // Ignore keystrokes when typing in an input or select
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') btnRoll.click();
  if (e.key === 'h' || e.key === 'H') btnHold.click();
  if (e.key === 'n' || e.key === 'N') btnNew.click();
});
