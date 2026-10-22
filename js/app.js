// Global State & API Endpoint
let matchesList = [], filteredMatches = [], userPredictions = [], currentPage = 1;
const PER_PAGE = 6, POST_API = 'https://jsonplaceholder.typicode.com/posts';

// Helper Selector & DOM Map
const $ = id => document.getElementById(id);
const elements = {
    search: $('search-team'), league: $('select-league'), status: $('select-status'),
    container: $('match-container'), loadMore: $('load-more-btn'), backTop: $('back-to-top'),
    alert: $('alert-box'), form: $('prediction-form'), matchDropdown: $('match-select'),
    viewModal: $('viewPredictionsModal'), standingsModal: $('standingsModal')
};

// App Initialization & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    userPredictions = JSON.parse(localStorage.getItem('user_predictions')) || [];
    fetchMatches(elements.league.value);

    elements.league.addEventListener('change', () => fetchMatches(elements.league.value));
    elements.search.addEventListener('input', applyFilters);
    elements.status.addEventListener('change', applyFilters);
    elements.loadMore.addEventListener('click', () => { currentPage++; renderMatches(); });
    elements.backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    elements.form.addEventListener('submit', handlePredictionSubmit);

    window.addEventListener('scroll', () => elements.backTop.classList.toggle('hidden', window.scrollY <= 250));
    elements.viewModal?.addEventListener('show.bs.modal', renderPredictions);
    elements.standingsModal?.addEventListener('show.bs.modal', loadLeagueStandings);
    
    $('clear-predictions-btn')?.addEventListener('click', () => {
        userPredictions = [];
        localStorage.removeItem('user_predictions');
        renderPredictions();
        displayAlert('All predictions cleared from storage.', 'info');
    });
});

// Async Fixture Data Fetching
async function fetchMatches(leagueId) {
    try {
        displayAlert('Loading matchday fixtures...', 'info');
        const res = await fetch('js/fixtures.json');
        const data = await res.json();
        matchesList = data.filter(m => m.idLeague === leagueId);
        displayAlert(`Loaded ${matchesList.length} fixtures.`, 'success');
    } catch {
        displayAlert('Error loading fixture data.', 'danger');
    } finally {
        populateMatchDropdown();
        applyFilters();
    }
}

// Multi-Criteria Filtering
function applyFilters() {
    const query = elements.search.value.toLowerCase().trim();
    const status = elements.status.value;
    filteredMatches = matchesList.filter(m => {
        const matchName = `${m.strHomeTeam} ${m.strAwayTeam}`.toLowerCase();
        return matchName.includes(query) && (status === 'all' || (m.strStatus || 'FT') === status);
    });
    currentPage = 1;
    renderMatches();
}

// Compact Card Renderer
function renderMatches() {
    if (currentPage === 1) elements.container.innerHTML = '';
    if (!filteredMatches.length) {
        elements.container.innerHTML = `<div class="col-12 text-center py-5 text-white-50">No matching fixtures found.</div>`;
        elements.loadMore.classList.add('d-none');
        return;
    }

    const items = filteredMatches.slice(0, currentPage * PER_PAGE);
    elements.container.innerHTML = items.map(m => {
        const isFT = m.strStatus === 'FT' || m.intHomeScore !== null;
        const date = m.dateEvent ? new Date(m.dateEvent).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
        return `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card h-100 match-card text-white shadow">
            <div class="card-body d-flex flex-column justify-content-between p-3">
              <div class="d-flex justify-content-between mb-3">
                <span class="badge bg-secondary border border-secondary text-light">${m.strLeague}</span>
                <span class="badge ${isFT ? 'bg-success' : 'bg-warning'} fw-bold">${isFT ? 'Finished' : 'Upcoming'}</span>
              </div>
              <div class="d-flex justify-content-around align-items-center text-center my-2">
                <div>
                  <img src="${m.strHomeBadge}" alt="${m.strHomeTeam}" class="team-badge mb-1 d-block mx-auto" referrerpolicy="no-referrer">
                  <small class="fw-bold d-block">${m.strHomeTeam}</small>
                </div>
                <span class="badge bg-primary score-badge px-3 py-2">${isFT ? `${m.intHomeScore} - ${m.intAwayScore}` : 'VS'}</span>
                <div>
                  <img src="${m.strAwayBadge}" alt="${m.strAwayTeam}" class="team-badge mb-1 d-block mx-auto" referrerpolicy="no-referrer">
                  <small class="fw-bold d-block">${m.strAwayTeam}</small>
                </div>
              </div>
              <div class="d-flex justify-content-between border-top border-secondary pt-2 mt-3 small text-white-50">
                <span>📍 ${m.strVenue || 'Stadium'}</span><span>📅 ${date}</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    elements.loadMore.classList.toggle('d-none', items.length >= filteredMatches.length);
    if (items.length < filteredMatches.length) {
        elements.loadMore.textContent = `Load More (${filteredMatches.length - items.length} remaining)`;
    }
}

// Prediction Handler with Async POST & LocalStorage Sync
async function handlePredictionSubmit(e) {
    e.preventDefault();
    const submitBtn = $('submit-btn');
    const payload = {
        user: $('user-name').value,
        match: elements.matchDropdown.value,
        prediction: $('predicted-score').value,
        createdAt: new Date().toISOString()
    };

    try {
        submitBtn.disabled = true;
        const res = await fetch(POST_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        userPredictions.push({ id: data.id || Date.now(), ...payload });
        localStorage.setItem('user_predictions', JSON.stringify(userPredictions));

        bootstrap.Modal.getInstance($('predictionModal')).hide();
        displayAlert(`Prediction saved for ${payload.match}!`, 'success');
        elements.form.reset();
    } catch {
        displayAlert('Failed to submit prediction.', 'danger');
    } finally {
        submitBtn.disabled = false;
    }
}

// Render Prediction Table in Modal
function renderPredictions() {
    const box = $('predictions-list-container');
    if (!box) return;
    if (!userPredictions.length) {
        box.innerHTML = `<div class="text-center py-4 text-white-50">No saved predictions in local storage.</div>`;
        return;
    }
    box.innerHTML = `
      <div class="table-responsive">
        <table class="table table-dark table-hover align-middle mb-0">
          <thead><tr class="text-info"><th>#</th><th>User</th><th>Match</th><th>Score</th><th>Saved</th></tr></thead>
          <tbody>
            ${userPredictions.map((p, i) => `
              <tr>
                <td>${i + 1}</td><td>${p.user}</td>
                <td><span class="badge bg-secondary">${p.match}</span></td>
                <td><span class="badge bg-primary px-3 py-1">${p.prediction}</span></td>
                <td class="small text-white-50">${new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
}

// Render League Standings Table
async function loadLeagueStandings() {
    const box = $('standings-table-container');
    const leagueId = elements.league.value;
    const leagueName = elements.league.options[elements.league.selectedIndex].text;
    try {
        box.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info"></div></div>`;
        const res = await fetch('js/standings.json');
        const data = await res.json();
        const table = data[leagueId] || [];
        box.innerHTML = `
          <h6 class="text-info mb-3 fw-bold">${leagueName} Table</h6>
          <div class="table-responsive"><table class="table table-dark table-hover align-middle mb-0">
            <thead><tr class="text-secondary"><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th class="text-info">Pts</th></tr></thead>
            <tbody>
              ${table.map(s => `<tr><td class="fw-bold">${s.rank}</td><td class="fw-semibold">${s.team}</td><td>${s.played}</td><td>${s.won}</td><td>${s.draw}</td><td>${s.loss}</td><td>${s.gd}</td><td class="text-info fw-bold">${s.points}</td></tr>`).join('')}
            </tbody>
          </table></div>`;
    } catch {
        box.innerHTML = `<div class="text-center py-4 text-danger">Unable to load standings.</div>`;
    }
}

// Helpers
function populateMatchDropdown() {
    elements.matchDropdown.innerHTML = '<option value="" disabled selected>Select a fixture...</option>' + 
        matchesList.map(m => `<option value="${m.strHomeTeam} vs ${m.strAwayTeam}">${m.strHomeTeam} vs ${m.strAwayTeam} (${m.strLeague})</option>`).join('');
}

function displayAlert(msg, type) {
    elements.alert.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
        ${msg}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>
      </div>`;
}