'use strict';

const stats = getStats();
const lb = getLeaderboard();

const totalGames = stats.gamesPlayed;
const winsMap = stats.wins || {};
const players = Object.keys(winsMap);
const topWins = players.length > 0 ? Math.max(...Object.values(winsMap)) : 0;

document.getElementById('statGames').textContent = totalGames;
document.getElementById('statPlayers').textContent = players.length;
document.getElementById('statHighTurn').textContent = stats.highestTurn || 0;
document.getElementById('statTopWins').textContent = topWins;

if (totalGames === 0 || players.length === 0) {
  document.getElementById('summaryCards').classList.add('hidden');
  document.getElementById('chartsSection').classList.add('hidden');
  document.querySelector('[id="btnReset"]').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
} else {
  // Build bar chart
  const barChart = document.getElementById('barChart');
  const sortedPlayers = [...players].sort((a, b) => winsMap[b] - winsMap[a]);
  const maxWins = winsMap[sortedPlayers[0]];

  sortedPlayers.forEach(name => {
    const wins = winsMap[name];
    const pct = maxWins > 0 ? (wins / maxWins) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-row__name" title="${name}">${name}</span>
      <div class="bar-row__track">
        <div class="bar-row__fill" style="width: ${pct}%"></div>
      </div>
      <span class="bar-row__count">${wins}</span>
    `;
    barChart.appendChild(row);
  });

  // Build table
  const tbody = document.getElementById('statsTableBody');
  sortedPlayers.forEach(name => {
    const wins = winsMap[name];
    const lbEntry = lb.find(p => p.name === name);
    const games = lbEntry ? lbEntry.games : wins;
    const rate = games > 0 ? ((wins / games) * 100).toFixed(0) + '%' : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td><strong>${wins}</strong></td>
      <td>${games}</td>
      <td>${rate}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnReset').addEventListener('click', () => {
  if (confirm('Reset ALL statistics and leaderboard data? This cannot be undone.')) {
    resetStats();
    location.reload();
  }
});
