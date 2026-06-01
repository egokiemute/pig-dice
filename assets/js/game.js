'use strict';

// ===== DOM REFERENCES =====
const score0El = document.getElementById('score0');
const score1El = document.getElementById('score1');
const current0El = document.getElementById('current0');
const current1El = document.getElementById('current1');
const name0El = document.getElementById('name0');
const name1El = document.getElementById('name1');
const avatar0El = document.getElementById('avatar0');
const avatar1El = document.getElementById('avatar1');
const player0El = document.getElementById('player0El');
const player1El = document.getElementById('player1El');

const diceEl = document.getElementById('diceEl');
const rollLogEl = document.getElementById('rollLog');
const targetLabelEl = document.getElementById('targetLabel');

const btnNew = document.getElementById('btnNew');
const btnRoll = document.getElementById('btnRoll');
const btnHold = document.getElementById('btnHold');

const modalOverlay = document.getElementById('modalOverlay');
const btnStart = document.getElementById('btnStart');
const inputName0 = document.getElementById('inputName0');
const inputName1 = document.getElementById('inputName1');
const inputWinScore = document.getElementById('inputWinScore');

// ===== GAME STATE =====
let scores, currentScore, currentPlayer, playing, winScore;
let playerNames = ['Player 1', 'Player 2'];
let playerAvatars = ['🦁', '🦊'];
let rolling = false;
let highTurnScore = 0;

// ===== AVATAR PICKERS =====
function setupAvatarPicker(pickerId, avatarIndex) {
  const picker = document.getElementById(pickerId);
  picker.addEventListener('click', e => {
    const btn = e.target.closest('.avatar-btn');
    if (!btn) return;
    picker.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    playerAvatars[avatarIndex] = btn.dataset.avatar;
  });
}

setupAvatarPicker('avatarPicker0', 0);
setupAvatarPicker('avatarPicker1', 1);

// ===== WEB AUDIO SOUNDS =====
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', vol = 0.18) {
  if (!getSettings().soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function soundRoll() { playTone(320, 0.08, 'square', 0.12); }

function soundLose() {
  playTone(180, 0.12, 'sawtooth', 0.15);
  setTimeout(() => playTone(140, 0.2, 'sawtooth', 0.12), 100);
}

function soundWin() {
  playTone(523, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 160);
  setTimeout(() => playTone(784, 0.4, 'sine', 0.2), 320);
}

function soundClick() { playTone(800, 0.05, 'sine', 0.08); }

// ===== CONFETTI =====
function fireConfetti() {
  if (typeof confetti !== 'function') return;
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } });
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 } }), 400);
}

// ===== ROLL LOG =====
function addLog(text, isDanger = false) {
  const li = document.createElement('li');
  li.textContent = text;
  if (isDanger) li.classList.add('danger');
  rollLogEl.prepend(li);
  while (rollLogEl.children.length > 8) rollLogEl.removeChild(rollLogEl.lastChild);
}

function clearLog() { rollLogEl.innerHTML = ''; }

// ===== GAME INIT =====
function init(names, avatars, targetScore) {
  scores = [0, 0];
  currentScore = 0;
  currentPlayer = 0;
  playing = true;
  highTurnScore = 0;
  winScore = targetScore || 50;
  playerNames = names || ['Player 1', 'Player 2'];
  playerAvatars = avatars || ['🦁', '🦊'];

  score0El.textContent = 0;
  score1El.textContent = 0;
  current0El.textContent = 0;
  current1El.textContent = 0;
  name0El.textContent = playerNames[0];
  name1El.textContent = playerNames[1];
  avatar0El.textContent = playerAvatars[0];
  avatar1El.textContent = playerAvatars[1];
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
// Pre-fill win score from saved settings
const savedSettings = getSettings();
inputWinScore.value = savedSettings.winScore;

modalOverlay.classList.remove('hidden');

// Initialise music system (starts menu music on first interaction)
Music.init();

btnStart.addEventListener('click', () => {
  soundClick();
  const name0 = inputName0.value.trim() || 'Player 1';
  const name1 = inputName1.value.trim() || 'Player 2';
  const target = Number(inputWinScore.value);
  saveSettings({ winScore: target });
  init([name0, name1], [...playerAvatars], target);
  modalOverlay.classList.add('hidden');
  Music.playGame();
});

[inputName0, inputName1, inputWinScore].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') btnStart.click(); });
});

// ===== SWITCH PLAYER =====
function switchPlayer() {
  document.getElementById(`current${currentPlayer}`).textContent = 0;
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
  const total = 7;
  const interval = setInterval(() => {
    const face = Math.trunc(Math.random() * 6) + 1;
    diceEl.src = `/assets/images/dice-${face}.png`;
    soundRoll();
    cycles++;
    if (cycles >= total) {
      clearInterval(interval);
      const final = Math.trunc(Math.random() * 6) + 1;
      diceEl.src = `/assets/images/dice-${final}.png`;
      diceEl.classList.add('dice--rolling');
      diceEl.addEventListener('animationend', () => {
        diceEl.classList.remove('dice--rolling');
        rolling = false;
        btnRoll.disabled = false;
        btnHold.disabled = false;
        callback(final);
      }, { once: true });
    }
  }, 80);
}

// ===== ROLL BUTTON =====
btnRoll.addEventListener('click', () => {
  rollDice(dice => {
    if (dice !== 1) {
      currentScore += dice;
      if (currentScore > highTurnScore) highTurnScore = currentScore;
      document.getElementById(`current${currentPlayer}`).textContent = currentScore;
      addLog(`🎲 Rolled ${dice} → total ${currentScore}`);
    } else {
      soundLose();
      addLog(`💥 Rolled 1 — lost turn!`, true);
      btnRoll.disabled = true;
      btnHold.disabled = true;
      setTimeout(() => {
        switchPlayer();
        if (playing) { btnRoll.disabled = false; btnHold.disabled = false; }
      }, 700);
    }
  });
});

// ===== HOLD BUTTON =====
btnHold.addEventListener('click', () => {
  if (!playing || rolling) return;
  soundClick();

  scores[currentPlayer] += currentScore;
  document.getElementById(`score${currentPlayer}`).textContent = scores[currentPlayer];

  if (scores[currentPlayer] >= winScore) {
    playing = false;
    diceEl.classList.add('hidden');
    document.querySelector(`.player--${currentPlayer}`).classList.add('player--winner');
    document.querySelector(`.player--${currentPlayer}`).classList.remove('player--active');

    const winnerName = playerNames[currentPlayer];
    const loserName = playerNames[currentPlayer === 0 ? 1 : 0];
    recordWin(winnerName, highTurnScore);
    recordGame(loserName);

    clearLog();
    addLog(`🏆 ${winnerName} wins!`);
    soundWin();
    fireConfetti();
    btnRoll.disabled = true;
    btnHold.disabled = true;
  } else {
    switchPlayer();
  }
});

// ===== NEW GAME =====
btnNew.addEventListener('click', () => {
  soundClick();
  inputName0.value = playerNames[0] !== 'Player 1' ? playerNames[0] : '';
  inputName1.value = playerNames[1] !== 'Player 2' ? playerNames[1] : '';
  modalOverlay.classList.remove('hidden');
  Music.playMenu();
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') btnRoll.click();
  if (e.key === 'h' || e.key === 'H') btnHold.click();
  if (e.key === 'n' || e.key === 'N') btnNew.click();
});
