

function formatTime(ms) {
  const t   = Math.floor(ms/1000);
  const h   = Math.floor(t/3600);
  const m   = Math.floor((t%3600)/60);
  const s   = t % 60;
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}

function renderStats(stats) {
  const c = document.getElementById('site-list');
  c.innerHTML = '';
  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('div');
    title.className = 'site';
    title.textContent = s.base + (s.running ? ' ⏱' : '');
    card.appendChild(title);

    const time = document.createElement('div');
    time.className = 'time';
    time.textContent = formatTime(s.totalMs)
      + (s.limit ? ` / ${formatTime(s.limit*1000)}` : '');
    card.appendChild(time);

    if (s.limit) {
      const pct = Math.min(100, s.totalMs / (s.limit*1000) * 100);
      const p   = document.createElement('div');
      p.className = 'progress';
      const b   = document.createElement('div');
      b.className = 'bar';
      b.style.width = `${pct}%`;
      p.appendChild(b);
      card.appendChild(p);
    }

    c.appendChild(card);
  });
}

function fetchAndRender() {
  chrome.runtime.sendMessage({ action: 'getStats' }, resp => {
    if (resp && resp.stats) renderStats(resp.stats);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRender();
  setInterval(fetchAndRender, 1000);
});
