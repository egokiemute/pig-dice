'use strict';

const lb = getLeaderboard(); // sorted by wins desc

if (lb.length === 0) {
  document.getElementById('podium').classList.add('hidden');
  document.getElementById('tableCard').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
} else {
  // Podium — show top 3
  const podiumEl = document.getElementById('podium');
  const medals = ['🥇', '🥈', '🥉'];
  const positions = ['2nd', '1st', '3rd']; // visual order: 2nd left, 1st middle, 3rd right
  const visualOrder = [lb[1], lb[0], lb[2]]; // rearrange for DOM order
  const posClasses = ['podium-slot--2nd', 'podium-slot--1st', 'podium-slot--3rd'];

  visualOrder.forEach((player, i) => {
    if (!player) return;
    const rankLabel = positions[i];
    const medalIndex = posClasses[i] === 'podium-slot--1st' ? 0
      : posClasses[i] === 'podium-slot--2nd' ? 1 : 2;
    const medal = medals[medalIndex];
    const rate = player.games > 0
      ? ((player.wins / player.games) * 100).toFixed(0) + '%'
      : '—';

    const slot = document.createElement('div');
    slot.className = `podium-slot ${posClasses[i]}`;
    slot.innerHTML = `
      <div class="podium-slot__avatar">${medal}</div>
      <p class="podium-slot__name">${player.name}</p>
      <p class="podium-slot__wins">${player.wins} win${player.wins !== 1 ? 's' : ''} · ${rate}</p>
      <div class="podium-slot__block">${rankLabel === '1st' ? '🏆' : rankLabel === '2nd' ? '🥈' : '🥉'}</div>
    `;
    podiumEl.appendChild(slot);
  });

  // Full table
  const tbody = document.getElementById('lbTableBody');
  lb.forEach((player, i) => {
    const rate = player.games > 0
      ? ((player.wins / player.games) * 100).toFixed(0) + '%'
      : '—';
    const rankBadge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-badge">${rankBadge}</td>
      <td><strong>${player.name}</strong></td>
      <td>${player.wins}</td>
      <td>${player.games}</td>
      <td>${rate}</td>
    `;
    tbody.appendChild(tr);
  });
}
