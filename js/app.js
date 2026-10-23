// Global State
let matches = [], filtered = [], page = 1;
const PER_PAGE = 6;
const $ = id => document.getElementById(id);

// Hardcoded Standings Fallback
const fallbackStandings = {
  "4328": [
    { "rank": 1, "team": "Manchester City", "played": 8, "won": 6, "draw": 1, "loss": 1, "gd": "+12", "points": 19 },
    { "rank": 2, "team": "Arsenal", "played": 8, "won": 5, "draw": 2, "loss": 1, "gd": "+9", "points": 17 },
    { "rank": 3, "team": "Liverpool", "played": 8, "won": 5, "draw": 1, "loss": 2, "gd": "+7", "points": 16 },
    { "rank": 4, "team": "Aston Villa", "played": 8, "won": 4, "draw": 3, "loss": 1, "gd": "+5", "points": 15 },
    { "rank": 5, "team": "Chelsea", "played": 8, "won": 4, "draw": 2, "loss": 2, "gd": "+4", "points": 14 }
  ],
  "4335": [
    { "rank": 1, "team": "Real Madrid", "played": 8, "won": 7, "draw": 0, "loss": 1, "gd": "+14", "points": 21 },
    { "rank": 2, "team": "Barcelona", "played": 8, "won": 6, "draw": 1, "loss": 1, "gd": "+11", "points": 19 },
    { "rank": 3, "team": "Atletico Madrid", "played": 8, "won": 5, "draw": 2, "loss": 1, "gd": "+8", "points": 17 },
    { "rank": 4, "team": "Athletic Bilbao", "played": 8, "won": 4, "draw": 2, "loss": 2, "gd": "+3", "points": 14 }
  ],
  "4331": [
    { "rank": 1, "team": "Bayern Munich", "played": 7, "won": 5, "draw": 2, "loss": 0, "gd": "+15", "points": 17 },
    { "rank": 2, "team": "RB Leipzig", "played": 7, "won": 5, "draw": 2, "loss": 0, "gd": "+9", "points": 17 },
    { "rank": 3, "team": "Bayer Leverkusen", "played": 7, "won": 4, "draw": 2, "loss": 1, "gd": "+6", "points": 14 }
  ],
  "4332": [
    { "rank": 1, "team": "Napoli", "played": 8, "won": 6, "draw": 1, "loss": 1, "gd": "+10", "points": 19 },
    { "rank": 2, "team": "Inter Milan", "played": 8, "won": 5, "draw": 2, "loss": 1, "gd": "+8", "points": 17 },
    { "rank": 3, "team": "Juventus", "played": 8, "won": 4, "draw": 4, "loss": 0, "gd": "+10", "points": 16 }
  ],
  "4480": [
    { "rank": 1, "team": "Real Madrid", "played": 3, "won": 3, "draw": 0, "loss": 0, "gd": "+6", "points": 9 },
    { "rank": 2, "team": "Bayern Munich", "played": 3, "won": 2, "draw": 1, "loss": 0, "gd": "+4", "points": 7 },
    { "rank": 3, "team": "Arsenal", "played": 3, "won": 2, "draw": 0, "loss": 1, "gd": "+3", "points": 6 }
  ]
};

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  const leagueSel = $('select-league');
  fetchMatches(leagueSel ? leagueSel.value : '4328');

  leagueSel?.addEventListener('change', () => fetchMatches(leagueSel.value));
  $('search-team')?.addEventListener('input', applyFilters);
  $('select-status')?.addEventListener('change', applyFilters);
  $('load-more-btn')?.addEventListener('click', () => { page++; renderMatches(); });

  const standingsModal = $('standingsModal');
  if (standingsModal) {
    standingsModal.addEventListener('show.bs.modal', loadLeagueStandings);
  }

  document.querySelector('[data-bs-target="#standingsModal"]')?.addEventListener('click', loadLeagueStandings);

  $('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => $('back-to-top')?.classList.toggle('hidden', window.scrollY <= 250));
});

// Async Fixture Fetching
async function fetchMatches(leagueId) {
  try {
    displayAlert('Loading matchday fixtures...', 'info');
    const res = await fetch('js/fixtures.json');
    if (!res.ok) throw new Error();
    const data = await res.json();
    matches = data.filter(m => m.idLeague === leagueId);
    const leagueSel = $('select-league');
    const name = leagueSel && leagueSel.options[leagueSel.selectedIndex] ? leagueSel.options[leagueSel.selectedIndex].text : 'selected league';
    displayAlert(`Loaded ${matches.length} fixtures for ${name}.`, 'success');
  } catch {
    displayAlert('Error loading fixture data.', 'danger');
  } finally {
    applyFilters();
  }
}

// Multi-Criteria Search & Filtering
function applyFilters() {
  const query = ($('search-team')?.value || '').toLowerCase().trim();
  const status = $('select-status')?.value || 'all';
  filtered = matches.filter(m => {
    const matchName = `${m.strHomeTeam} ${m.strAwayTeam}`.toLowerCase();
    return matchName.includes(query) && (status === 'all' || (m.strStatus || 'FT') === status);
  });
  page = 1;
  renderMatches();
}

// Match Cards Renderer
function renderMatches() {
  const container = $('match-container');
  const loadBtn = $('load-more-btn');
  if (!container) return;
  if (page === 1) container.innerHTML = '';

  if (!filtered.length) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-white-50"><i class="bi bi-exclamation-circle fs-2 d-block mb-2 text-warning"></i>No fixtures match your selected filters.</div>`;
    loadBtn?.classList.add('d-none');
    return;
  }

  const items = filtered.slice(0, page * PER_PAGE);
  container.innerHTML = items.map(m => {
    const isFT = m.strStatus === 'FT' || (m.intHomeScore !== null && m.intHomeScore !== "");
    const date = m.dateEvent ? new Date(m.dateEvent).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled';
    return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 match-card text-white shadow">
        <div class="card-body d-flex flex-column justify-content-between p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge bg-secondary border border-secondary text-light">${m.strLeague}</span>
            <span class="badge ${isFT ? 'bg-success text-white' : 'bg-warning text-dark'} fw-bold">${isFT ? 'Finished' : 'Upcoming'}</span>
          </div>
          <div class="d-flex justify-content-around align-items-center text-center my-2">
            <div class="team-col flex-fill">
              <img src="${m.strHomeBadge || 'https://via.placeholder.com/40'}" alt="${m.strHomeTeam}" class="team-badge mb-2 d-block mx-auto" referrerpolicy="no-referrer">
              <span class="fw-bold fs-6 d-block">${m.strHomeTeam}</span>
            </div>
            <div class="px-2"><span class="badge bg-primary score-badge px-3 py-2">${isFT ? `${m.intHomeScore} - ${m.intAwayScore}` : 'VS'}</span></div>
            <div class="team-col flex-fill">
              <img src="${m.strAwayBadge || 'https://via.placeholder.com/40'}" alt="${m.strAwayTeam}" class="team-badge mb-2 d-block mx-auto" referrerpolicy="no-referrer">
              <span class="fw-bold fs-6 d-block">${m.strAwayTeam}</span>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2 mt-3 small text-white-50">
            <span>📍 ${m.strVenue || 'Stadium'}</span><span>📅 ${date}</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (loadBtn) {
    loadBtn.classList.toggle('d-none', items.length >= filtered.length);
    if (items.length < filtered.length) loadBtn.textContent = `Load More (${filtered.length - items.length} remaining)`;
  }
}

// Standings Modal Loader with Automatic Fallback
async function loadLeagueStandings() {
  const box = $('standings-table-container');
  const leagueSel = $('select-league');
  if (!box) return;

  const selectedLeagueId = leagueSel ? leagueSel.value : '4328';
  const leagueName = leagueSel && leagueSel.options[leagueSel.selectedIndex] ? leagueSel.options[leagueSel.selectedIndex].text : 'League';

  let table = [];

  try {
    box.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info" role="status"></div></div>`;
    const res = await fetch('js/standings.json');
    if (res.ok) {
      const data = await res.json();
      table = data[selectedLeagueId] || [];
    } else {
      table = fallbackStandings[selectedLeagueId] || [];
    }
  } catch (err) {
    table = fallbackStandings[selectedLeagueId] || [];
  }

  if (!table.length) {
    box.innerHTML = `<div class="text-center py-4 text-white-50">No standings available for ${leagueName}.</div>`;
    return;
  }

  box.innerHTML = `
    <h6 class="text-info mb-3 fw-bold">${leagueName} Standings Table</h6>
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle mb-0" style="background: transparent;">
        <thead>
          <tr class="text-secondary border-secondary">
            <th>Pos</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th class="text-info fw-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${table.map(s => `
            <tr class="border-secondary">
              <td class="fw-bold">${s.rank}</td>
              <td class="fw-semibold text-white">${s.team}</td>
              <td>${s.played}</td>
              <td>${s.won}</td>
              <td>${s.draw}</td>
              <td>${s.loss}</td>
              <td>${s.gd}</td>
              <td class="text-info fw-bold fs-6">${s.points}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Alert Helper
function displayAlert(msg, type) {
  const box = $('alert-box');
  if (box) {
    box.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
        ${msg}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>
      </div>`;
  }
}