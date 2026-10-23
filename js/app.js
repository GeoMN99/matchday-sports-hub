// Global State
let matches = [], filtered = [], page = 1;
const PER_PAGE = 6;
const $ = id => document.getElementById(id);

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  const leagueSel = $('select-league');
  fetchMatches(leagueSel ? leagueSel.value : '4328');

  leagueSel?.addEventListener('change', () => fetchMatches(leagueSel.value));
  $('search-team')?.addEventListener('input', applyFilters);
  $('select-status')?.addEventListener('change', applyFilters);
  $('load-more-btn')?.addEventListener('click', () => { page++; renderMatches(); });
  $('standingsModal')?.addEventListener('show.bs.modal', loadLeagueStandings);

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
    const name = $('select-league')?.selectedOptions[0]?.text || 'selected league';
    displayAlert(`Loaded ${matches.length} fixtures for ${name}.`, 'success');
  } catch {
    displayAlert('Error loading fixture data.', 'danger');
  } finally {
    applyFilters();
  }
}

// Search & Filtering
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

// Standings Loader
async function loadLeagueStandings() {
  const box = $('standings-table-container');
  const leagueSel = $('select-league');
  if (!box || !leagueSel) return;
  const leagueId = leagueSel.value;
  const name = leagueSel.selectedOptions[0]?.text || 'League';

  try {
    box.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info" role="status"></div></div>`;
    const res = await fetch('js/standings.json');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const table = data[leagueId] || [];

    if (!table.length) {
      box.innerHTML = `<div class="text-center py-4 text-white-50">No standings available for ${name}.</div>`;
      return;
    }

    box.innerHTML = `
      <h6 class="text-info mb-3 fw-bold">${name} Standings Table</h6>
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
  } catch {
    box.innerHTML = `<div class="text-center py-4 text-danger">Unable to load standings table.</div>`;
  }
}

// Alert
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