'use strict';

const STATS_KEY = 'pigGameStats_v2';
const LEADERBOARD_KEY = 'pigGameLeaderboard';
const SETTINGS_KEY = 'pigGameSettings';

function getStats() {
  return JSON.parse(localStorage.getItem(STATS_KEY)) || {
    gamesPlayed: 0,
    wins: {},
    highestTurn: 0,
    totalRolls: 0,
  };
}

function saveStats(data) {
  localStorage.setItem(STATS_KEY, JSON.stringify(data));
}

function getLeaderboard() {
  return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
}

function saveLeaderboard(data) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
}

function getSettings() {
  return Object.assign(
    { winScore: 50, soundEnabled: true, musicEnabled: true, theme: 'light' },
    JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}
  );
}

function saveSettings(patch) {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(Object.assign(current, patch)));
}

function recordWin(playerName, highTurnScore) {
  // Update stats
  const stats = getStats();
  stats.gamesPlayed++;
  stats.wins[playerName] = (stats.wins[playerName] || 0) + 1;
  if (highTurnScore > stats.highestTurn) stats.highestTurn = highTurnScore;
  saveStats(stats);

  // Update leaderboard
  const lb = getLeaderboard();
  const existing = lb.find(p => p.name === playerName);
  if (existing) {
    existing.wins++;
    existing.games++;
  } else {
    lb.push({ name: playerName, wins: 1, games: 1 });
  }
  // Update games count for the loser side is done at game end for all players
  lb.sort((a, b) => b.wins - a.wins);
  saveLeaderboard(lb);
}

function recordGame(loserName) {
  const lb = getLeaderboard();
  const existing = lb.find(p => p.name === loserName);
  if (existing) {
    existing.games++;
  } else {
    lb.push({ name: loserName, wins: 0, games: 1 });
  }
  saveLeaderboard(lb);
}

function resetStats() {
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(LEADERBOARD_KEY);
}
