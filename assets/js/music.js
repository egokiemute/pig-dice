'use strict';

// ===== PONDICE MUSIC MANAGER =====
// Handles two tracks: menu (modal open) and game (active play).
// Uses HTMLAudioElement for real files; falls back to Web Audio API
// ambient generation when files are absent or fail to load.

const Music = (() => {
  const FADE_STEPS = 40;
  const FADE_MS = 800;   // total fade duration in ms
  const MAX_VOL = 0.28;  // max volume for music tracks

  // ── HTMLAudioElement tracks ──────────────────────────────────────────
  const _menuEl = new Audio('/assets/audio/menu.mp3');
  const _gameEl = new Audio('/assets/audio/game.mp3');
  _menuEl.loop = true;
  _gameEl.loop = true;
  _menuEl.volume = 0;
  _gameEl.volume = 0;

  // ── State ────────────────────────────────────────────────────────────
  let _current = null;        // 'menu' | 'game' | null
  let _enabled = true;
  let _started = false;       // true once first user gesture has fired
  let _menuFailed = false;    // true if menu.mp3 failed to load
  let _gameFailed = false;    // true if game.mp3 failed to load
  let _fallbackCtx = null;    // shared AudioContext for fallback
  let _fallbackNodes = [];    // active oscillator/gain nodes to stop later
  let _usingFallback = false;

  // ── Fallback: Web Audio API ambient music ────────────────────────────

  function _getCtx() {
    if (!_fallbackCtx) {
      _fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _fallbackCtx;
  }

  function _stopFallback() {
    _fallbackNodes.forEach(n => { try { n.stop(); } catch (_) {} });
    _fallbackNodes = [];
    _usingFallback = false;
  }

  // Menu fallback: A-minor chord (A3, C4, E4) with slow tremolo — calm ambient pads
  function _startMenuFallback() {
    _stopFallback();
    const ctx = _getCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    // LFO for tremolo
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.4; // 0.4 Hz tremolo
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfo.start();
    lfoGain.connect(masterGain.gain);

    const chordFreqs = [220, 261.63, 329.63, 440]; // A3, C4, E4, A4
    chordFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq + (i % 2 === 0 ? 0.5 : -0.5); // slight detune
      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      _fallbackNodes.push(osc);
    });
    _fallbackNodes.push(lfo);

    // Fade in
    const step = (MAX_VOL * 0.8) / FADE_STEPS;
    let vol = 0;
    const iv = setInterval(() => {
      vol = Math.min(vol + step, MAX_VOL * 0.8);
      masterGain.gain.value = vol;
      if (vol >= MAX_VOL * 0.8) clearInterval(iv);
    }, FADE_MS / FADE_STEPS);

    _fallbackNodes.push({ stop: () => { clearInterval(iv); masterGain.gain.value = 0; } });
    _usingFallback = true;
    return masterGain;
  }

  // Game fallback: C-major arpeggio at 120 BPM — upbeat, rhythmic
  function _startGameFallback() {
    _stopFallback();
    const ctx = _getCtx();
    const masterGain = ctx.createGain();
    masterGain.gain.value = MAX_VOL * 0.5;
    masterGain.connect(ctx.destination);

    const notes = [261.63, 329.63, 392, 523.25]; // C4, E4, G4, C5
    const bpm = 120;
    const beatSec = 60 / bpm;
    let noteIdx = 0;
    let nextTime = ctx.currentTime + 0.1;

    function scheduleNote() {
      if (!_usingFallback) return;
      const osc = ctx.createOscillator();
      const envGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[noteIdx % notes.length];
      envGain.gain.setValueAtTime(0.0001, nextTime);
      envGain.gain.linearRampToValueAtTime(0.4, nextTime + 0.02);
      envGain.gain.exponentialRampToValueAtTime(0.0001, nextTime + beatSec * 0.8);
      osc.connect(envGain);
      envGain.connect(masterGain);
      osc.start(nextTime);
      osc.stop(nextTime + beatSec);
      noteIdx++;
      nextTime += beatSec;
    }

    // Schedule ahead in a loop
    const schedulerId = setInterval(() => {
      if (!_usingFallback) { clearInterval(schedulerId); return; }
      while (nextTime < ctx.currentTime + 0.5) scheduleNote();
    }, 100);

    _fallbackNodes.push({ stop: () => { clearInterval(schedulerId); masterGain.gain.value = 0; } });
    _usingFallback = true;
  }

  // ── HTMLAudioElement helpers ──────────────────────────────────────────

  function _fadeIn(el) {
    el.volume = 0;
    el.play().catch(() => {});
    const step = MAX_VOL / FADE_STEPS;
    const iv = setInterval(() => {
      el.volume = Math.min(el.volume + step, MAX_VOL);
      if (el.volume >= MAX_VOL) clearInterval(iv);
    }, FADE_MS / FADE_STEPS);
  }

  function _fadeOut(el, onDone) {
    if (el.paused) { if (onDone) onDone(); return; }
    const step = el.volume / FADE_STEPS;
    const iv = setInterval(() => {
      el.volume = Math.max(el.volume - step, 0);
      if (el.volume <= 0) {
        clearInterval(iv);
        el.pause();
        el.volume = 0;
        if (onDone) onDone();
      }
    }, FADE_MS / FADE_STEPS);
  }

  // ── Public API ────────────────────────────────────────────────────────

  function playMenu() {
    if (!_enabled || !_started) return;
    if (_current === 'menu') return;
    _current = 'menu';

    // Stop game track / fallback
    if (_usingFallback) {
      _stopFallback();
    } else {
      _fadeOut(_gameEl);
    }

    if (_menuFailed) {
      _startMenuFallback();
    } else {
      _menuEl.currentTime = 0;
      _fadeIn(_menuEl);
    }
  }

  function playGame() {
    if (!_enabled || !_started) return;
    if (_current === 'game') return;
    _current = 'game';

    // Stop menu track / fallback
    if (_usingFallback) {
      _stopFallback();
    } else {
      _fadeOut(_menuEl);
    }

    if (_gameFailed) {
      _startGameFallback();
    } else {
      _gameEl.currentTime = 0;
      _fadeIn(_gameEl);
    }
  }

  function stop() {
    _current = null;
    if (_usingFallback) {
      _stopFallback();
    } else {
      _fadeOut(_menuEl);
      _fadeOut(_gameEl);
    }
  }

  function toggle() {
    _enabled = !_enabled;
    saveSettings({ musicEnabled: _enabled });

    const btn = document.getElementById('btnMusic');
    if (btn) btn.textContent = _enabled ? '🎵' : '🔇';

    if (_enabled) {
      // Resume whichever was current
      if (_current === 'game') { _current = null; playGame(); }
      else { _current = null; playMenu(); }
    } else {
      stop();
    }
  }

  function init() {
    _enabled = getSettings().musicEnabled !== false;

    // Update button icon
    const btn = document.getElementById('btnMusic');
    if (btn) {
      btn.textContent = _enabled ? '🎵' : '🔇';
      btn.addEventListener('click', toggle);
    }

    // Set up error fallback for real files
    _menuEl.addEventListener('error', () => { _menuFailed = true; });
    _gameEl.addEventListener('error', () => { _gameFailed = true; });

    // Start menu music on FIRST user interaction (satisfies autoplay policy)
    const onFirstInteraction = () => {
      _started = true;
      document.removeEventListener('click', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
      if (_enabled && _current === null) playMenu();
    };

    document.addEventListener('click', onFirstInteraction);
    document.addEventListener('keydown', onFirstInteraction);
  }

  return { init, playMenu, playGame, stop, toggle };
})();
