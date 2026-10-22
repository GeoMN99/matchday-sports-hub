// Global Application State
let matchesList = [];
let filteredMatches = [];
let userPredictions = [];
let currentPage = 1;
const PER_PAGE = 6;

const POST_API_URL = 'https://jsonplaceholder.typicode.com/posts';

// DOM Elements
const searchInput = document.getElementById('search-team');
const leagueSelect = document.getElementById('select-league');
const statusSelect = document.getElementById('select-status');
const matchContainer = document.getElementById('match-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const backToTopBtn = document.getElementById('back-to-top');
const alertBox = document.getElementById('alert-box');
const predictionForm = document.getElementById('prediction-form');
const matchSelectDropdown = document.getElementById('match-select');

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    loadSavedPredictions();
    fetchMatches(leagueSelect.value || '4328');
});

function setupEvents() {
    leagueSelect.addEventListener('change', () => fetchMatches(leagueSelect.value));
    searchInput.addEventListener('input', applyFilters);
    statusSelect.addEventListener('change', applyFilters);

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderMatches();
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 250) {
            backToTopBtn.classList.remove('hidden');
        } else {
            backToTopBtn.classList.add('hidden');
        }
    });

    predictionForm.addEventListener('submit', handlePredictionSubmit);
}

function loadSavedPredictions() {
    const stored = localStorage.getItem('user_predictions');
    if (stored) {
        try {
            userPredictions = JSON.parse(stored);
        } catch (e) {
            userPredictions = [];
        }
    }
}

// Fetch Fixtures from Local JSON Dataset
async function fetchMatches(leagueId) {
    try {
        displayAlert('Loading matchday fixtures...', 'info');

        const response = await fetch('js/fixtures.json');
        if (!response.ok) throw new Error('Could not load fixtures dataset');

        const allFixtures = await response.json();
        matchesList = allFixtures.filter(item => item.idLeague === leagueId);

        const leagueName = leagueSelect.options[leagueSelect.selectedIndex]?.text || 'selected league';
        displayAlert(`Loaded ${matchesList.length} fixtures for ${leagueName}.`, 'success');

    } catch (err) {
        console.error('Fetch error:', err.message);
        displayAlert('Error loading fixture data.', 'danger');
    } finally {
        populateMatchDropdown(matchesList);
        applyFilters();
    }
}

// Multi-Criteria Search & Filter
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const chosenStatus = statusSelect.value;

    filteredMatches = matchesList.filter(item => {
        const home = (item.strHomeTeam || '').toLowerCase();
        const away = (item.strAwayTeam || '').toLowerCase();
        const matchSearch = home.includes(query) || away.includes(query);

        const matchStatus = item.strStatus || 'FT';
        const statusOk = chosenStatus === 'all' || matchStatus === chosenStatus;

        return matchSearch && statusOk;
    });

    currentPage = 1;
    renderMatches();
}

// Helper: Format Dates to Clean Display (e.g. Sun, Sep 6, 2026)
function formatDate(dateStr) {
    if (!dateStr) return 'Scheduled';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// Card Renderer with Team Crests & Badges
function renderMatches() {
    if (currentPage === 1) {
        matchContainer.innerHTML = '';
    }

    if (filteredMatches.length === 0) {
        matchContainer.innerHTML = `
          <div class="col-12 text-center py-5 text-muted">
            <i class="bi bi-exclamation-circle fs-2 d-block mb-2 text-warning"></i>
            No fixtures match your selected filters. 
          </div>`;
        loadMoreBtn.classList.add('d-none');
        return;  
    }

    const itemsToShow = filteredMatches.slice(0, currentPage * PER_PAGE);
    matchContainer.innerHTML = '';

    itemsToShow.forEach(match => {
        const isFinished = match.strStatus === 'FT' || (match.intHomeScore !== null && match.intHomeScore !== "");
        const badgeClass = isFinished ? 'bg-success text-white' : 'bg-warning text-dark';
        const scoreDisplay = isFinished ? `${match.intHomeScore} - ${match.intAwayScore}` : 'VS';
        const formattedDate = formatDate(match.dateEvent);

        const homeLogo = match.strHomeBadge || 'https://via.placeholder.com/40';
        const awayLogo = match.strAwayBadge || 'https://via.placeholder.com/40';

        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-6 col-lg-4 mb-4';
        cardCol.innerHTML = `
          <div class="card h-100 match-card text-white shadow">
            <div class="card-body d-flex flex-column justify-content-between p-3">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-secondary border border-secondary text-light">${match.strLeague}</span>
                <span class="badge ${badgeClass} fw-bold">${isFinished ? 'Finished' : 'Upcoming'}</span>
              </div>
              
              <div class="d-flex justify-content-around align-items-center my-2 text-center">
                <div class="team-col flex-fill">
                  <img src="${homeLogo}" alt="${match.strHomeTeam}" class="team-badge mb-2 d-block mx-auto">
                  <span class="fw-bold fs-6 d-block">${match.strHomeTeam}</span>
                </div>
                
                <div class="px-2">
                  <span class="badge bg-primary score-badge px-3 py-2">${scoreDisplay}</span>
                </div>
                
                <div class="team-col flex-fill">
                  <img src="${awayLogo}" alt="${match.strAwayTeam}" class="team-badge mb-2 d-block mx-auto">
                  <span class="fw-bold fs-6 d-block">${match.strAwayTeam}</span>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2 mt-3 small text-muted">
                <span>📍 ${match.strVenue || 'Stadium'}</span>
                <span>📅 ${formattedDate}</span>
              </div>
            </div>
          </div>
        `;
        matchContainer.appendChild(cardCol);        
    });

    if (itemsToShow.length < filteredMatches.length) {
        loadMoreBtn.textContent = `Load More (${filteredMatches.length - itemsToShow.length} remaining)`;
        loadMoreBtn.classList.remove('d-none');
    } else {
        loadMoreBtn.classList.add('d-none');
    }
}

// Prediction Form Handler
async function handlePredictionSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const nameInput = document.getElementById('user-name').value;
    const selectedFixture = matchSelectDropdown.value;
    const scoreInput = document.getElementById('predicted-score').value;

    const payload = {
        user: nameInput,
        match: selectedFixture,
        prediction: scoreInput,
        createdAt: new Date().toISOString()
    };

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const res = await fetch(POST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)   
        });

        if (!res.ok) throw new Error('Failed to post prediction');

        const result = await res.json();
        const newPrediction = { id: result.id || Date.now(), ...payload };
        userPredictions.push(newPrediction);
        localStorage.setItem('user_predictions', JSON.stringify(userPredictions));

        const modalElement = document.getElementById('predictionModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        displayAlert(`Prediction saved for ${selectedFixture}! Total stored: ${userPredictions.length}`, 'success');
        predictionForm.reset();

    } catch (error) {
        displayAlert(`Could not submit prediction: ${error.message}`, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Prediction';
    }
}

function populateMatchDropdown(matches) {
    matchSelectDropdown.innerHTML = '<option value="" disabled selected>Select a fixture...</option>';
    matches.forEach(m => {
        const option = document.createElement('option');
        option.value = `${m.strHomeTeam} vs ${m.strAwayTeam}`;
        option.textContent = `${m.strHomeTeam} vs ${m.strAwayTeam} (${m.strLeague})`;
        matchSelectDropdown.appendChild(option);
    });
}

function displayAlert(message, type) {
    alertBox.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
}