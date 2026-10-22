// Global State & Endpoints
let matches = [], filtered = [], predictions = JSON.parse(localStorage.getItem('user_predictions')) || [], page = 1;
const PER_PAGE = 6, POST_API = 'https://jsonplaceholder.typicode.com/posts';
const $ = id => document.getElementById(id);

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  const leagueSel = $('select-league');
  fetchMatches(leagueSel ? leagueSel.value : '4328');

  leagueSel?.addEventListener('change', () => fetchMatches(leagueSel.value));
  $('search-team')?.addEventListener('input', applyFilters);
  $('select-status')?.addEventListener('change', applyFilters);
  $('load-more-btn')?.addEventListener('click', () => { page++; renderMatches(); });
  $('prediction-form')?.addEventListener('submit', handlePredictionSubmit);
  $('viewPredictionsModal')?.addEventListener('show.bs.modal', renderPredictions);
  $('standingsModal')?.addEventListener('show.bs.modal', loadLeagueStandings);

  $('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () => $('back-to-top')?.classList.toggle('hidden', window.scrollY <= 250));

  $('clear-predictions-btn')?.addEventListener('click', () => {
    predictions = [];
    localStorage.removeItem('user_predictions');
    renderPredictions();
    displayAlert('All predictions cleared.', 'info');
  });
});

// Data Fetching & Filtering
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
    populateMatchDropdown();
    applyFilters();
  }
}

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

// Rendering Functions
function renderMatches() {
  const container = $('match-container');
  const loadBtn = $('load-more-btn');
  if (!container) return;
  if (page === 1) container.innerHTML = '';

  if (!filtered.length) {
    container.innerHTML = `<div class="col-12 text-center py-5 text-white-50"><i class="bi bi-exclamation-circle fs-2 d-block mb-2 text-warning"></i>No fixtures match your filters.</div>`;
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

// Prediction Handler
async function handlePredictionSubmit(e) {
  e.preventDefault();
  const btn = $('submit-btn');
  const name = $('user-name')?.value.trim();
  const match = $('match-select')?.value;
  const score = $('predicted-score')?.value.trim();

  if (!name || !match || !score) return displayAlert('Please fill out all fields.', 'warning');

  const payload = { id: Date.now(), user: name, match: match, prediction: score, createdAt: new Date().toISOString() };
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  // Save locally immediately
  predictions.push(payload);
  localStorage.setItem('user_predictions', JSON.stringify(predictions));

  // Background POST attempt
  fetch(POST_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});

  // Close modal safely
  const modalEl = $('predictionModal');
  if (modalEl && window.bootstrap) {
    (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide();
  }

  $('prediction-form')?.reset();
  displayAlert(`Prediction saved for ${match}!`, 'success');
  if (btn) { btn.disabled = false; btn.textContent = 'Submit Prediction'; }
}

function renderPredictions() {
  const box = $('predictions-list-container');
  if (!box) return;
  if (!predictions.length) return box.innerHTML = `<div class="text-center py-4 text-white-50"><i class="bi bi-clipboard-x fs-1 d-block mb-2 text-warning"></i>No saved predictions in local storage.</div>`;

  box.innerHTML = `
    <div class="table-responsive">
      <table class="table table-dark table-hover align-middle mb-0" style="background: transparent;">
        <thead><tr class="text-info border-secondary"><th>#</th><th>User</th><th>Fixture</th><th>Predicted Score</th><th>Saved Date</th></tr></thead>
        <tbody>
          ${predictions.map((p, i) => `
            <tr class="border-secondary">
              <td class="fw-bold">${i + 1}</td>
              <td>${p.user}</td>
              <td><span class="badge bg-secondary">${p.match}</span></td>
              <td><span class="badge bg-primary px-3 py-2 fs-6">${p.prediction}</span></td>
              <td class="small text-white-50">${new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// Standings & Helpers
async function loadLeagueStandings() {
  const box = $('standings-table-container');
  const leagueSel = $('select-league');
  if (!box || !leagueSel) return;
  const leagueId = leagueSel.value;
  const name = leagueSel.selectedOptions[0]?.text || 'League';

  try {
    box.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info"></div></div>`;
    const res = await fetch('js/standings.json');
    const data = await res.json();
    const table = data[leagueId] || [];

    if (!table.length) return box.innerHTML = `<div class="text-center py-4 text-white-50">No standings available.</div>`;

    box.innerHTML = `
      <h6 class="text-info mb-3 fw-bold">${name} Table</h6>
      <div class="table-responsive"><table class="table table-dark table-hover align-middle mb-0" style="background: transparent;">
        <thead><tr class="text-secondary border-secondary"><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th class="text-info fw-bold">Pts</th></tr></thead>
        <tbody>
          ${table.map(s => `<tr class="border-secondary"><td class="fw-bold">${s.rank}</td><td class="fw-semibold text-white">${s.team}</td><td>${s.played}</td><td>${s.won}</td><td>${s.draw}</td><td>${s.loss}</td><td>${s.gd}</td><td class="text-info fw-bold fs-6">${s.points}</td></tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch {
    box.innerHTML = `<div class="text-center py-4 text-danger">Unable to load standings.</div>`;
  }
}

function populateMatchDropdown() {
  const dd = $('match-select');
  if (dd) dd.innerHTML = '<option value="" disabled selected>Select a fixture...</option>' + matches.map(m => `<option value="${m.strHomeTeam} vs ${m.strAwayTeam}">${m.strHomeTeam} vs ${m.strAwayTeam} (${m.strLeague})</option>`).join('');
}

function displayAlert(msg, type) {
  const box = $('alert-box');
  if (box) box.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">${msg}<button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button></div>`;
}