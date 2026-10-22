// Global State
let matchesList = [];
let filteredMatches = [];
let userPredictions = [];
let currentPage = 1;
const PER_PAGE = 6;

// Get Active Season (eg 2020-2027)
function getCurrentSeasonStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getFullMonth() + 1;
    return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;// Euro season begin in Aug(month 8)
}

const CURRENT_SEASON_STR = getCurrentSeasonStr();
const POST_API_URL = 'https://jsonplaceholder.typicode.com/posts';

// DOM Element References
const searchInput = document.getElementById('search-team');
const leagueSelect = document.getElementById('select-league');
const statusSelect = document.getElementById('select-status');
const matchContainer = document.getElementById('match-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const backToTopBtn = document.getElementById('back-to-top');
const alertBox = document.getElementById('alert-box');
const predictionForm = document.getElementById('prediction-form');
const matchSelectDropdown = document.getElementById('match-select');

// App Init
document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    loadSavedPredictions();
    fetchMatches(leagueSelect.value || '4328'); // Starts by fetching Pl who's id is 4328
});

// Event Listeners
function setupEvents() {
    leagueSelect.addEventListener('change', () => {
        fetchMatches(leagueSelect.value);
    });

    searchInput.addEventListener('input', applyFilters);
    statusSelect.addEventListener('change', applyFilters);

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderMatches();
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth '});
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

// Load Predictions Stored in localStorage
function loadSavedPredictions() {
    const stored = localStorage.getItem('user_prediction');
    if (stored) {
        try {
            userPredictions = JSON.parse(stored);
            console.log(`Loaded ${userPredictions.length} saved presdiction(s) from localStorage.`);
        } catch (e) {
            console.error('Failed to parse saved predictions:', e);
            userPredictions = [];
        }
    }
}

// Fetching data from API
async function fetchMatches(leagueId) {
    const endpoint = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${leagueId}&s=${CURRENT_SEASON_STR}`;

    try {
        displayAlert('Fetching season fixtures from sports network...', 'info');

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to reach sports network');

        const data = await response.json();
        matchesList = (data && data.events) ? data.events : getBackupData();

        localStorage.setItem(`cached_league_${leagueId}`, JSON.stringify(matchesList));

        const leagueName = leagueSelect.options[leagueSelect.selectedIndex]?.text || 'selected league';
        displayAlert(`Loaded ${matchesList.length} fixtures for ${leagueName} (${CURRENT_SEASON_STR} season).`, 'success');

    } catch (err) {
        console.log(`API call failed for league ${leagueId}, checking cache:`, err.message);
        const saved = localStorage.getItem(`cached_league_${leagueId}`);
        matchesList = saved ? JSON.parse(saved) : getBackupData();
        displayAlert('Could not fetch live API data. Displaying cached records.', 'warning');

    } finally {
        populateMatchDropdown(matchesList);
        applyFilters();
    }
}

// Multi league filtering
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    const chosenStatus = statusSelect.value;

    filteredMatches = matchesList.filter(item => {
        const home = (item.strHomeTeam || '').toLowerCase();
        const away = (item.strAwayTeam || '').toLowerCase();
        const matchSearch = home.includes(query) || away.includes(query);

        const matchStatus = item.StrStatus || 'FT';
        const statusOk = chosenStatus === 'all' || matchStatus === chosenStatus;

        return matchStatus && statusOk;
    });

    currentPage = 1;
    renderMatches();
}

// Matches Rendering
function renderMatches() {
    if (currentPage === 1) {
        matchContainer.innerHTML = '';
    }

    if (filteredMatches.length === 0) {
        matchContainer.innerHTML = `
          <div class="col-12 text-center py-5 text-muted">
            <i class="bi bi-exclamation-circle fs-2 d-block mb-2"></i>
            No fixtures match your selected filters. 
          </div>`;
        loadMoreBtn.classList,add('d-none');
        return;  
    }

    const itemsToShow = filteredMatches.slice(0, currentPage * PER_PAGE);

    matchContainer.innerHTML = '';

    itemsToShow.forEach(match => {
        const isFinished = match.StrStatus === 'FT' || (match.intHomeScore !== null && match.intHomeScore !== "");
        const badgeClass = isFinished ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis';
        const scoreDisplay = isFinished ? `${match.intHomeScore} - ${match.intAwayScore}` : 'VS';

        const cardCol = document.createElement('div');
        cardCol.className = 'col';
        cardCol.innerHTML = `
         <div class="card h-100 border-0 shadow-sm match-card">
          <div class="card-body d-flex flex-column justify-content-between">
            <div class="d-flex justify-content-between align-items-center mb-2">
             <span class="badge bg-light text-secondary border small">${match.strLeague || 'League'}</span>
             <span class="badge ${badgeClass} fw-bold">${isFinished ? 'Finished' : 'Upcoming'}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center my-3 text-center fw-bold fs-5">
               <span class="flex-fill text-start">${match.strHomeTeam}</span>
               <span class="badge bg-primary fs-6 px-3 py-2 mx-2">${scoreDisplay}</span>
               <span class="flex-fill text-end">${match.strAwayTeam}</span>
            </div>
            <div class="text-end small text-muted">
              📅 ${match.dateEvent || 'Scheduled'}
            </div>
           </div>
          </div>
        `;
        matchContainer.appendChild(cardCol);        
    });

    if (itemsToShow.length < filteredMatches.length) {
        loadMoreBtn.textContent = `Load More (${filteredMatches.length - itemsToShow.length} left)`;
        loadMoreBtn.classList.remove('d-none');
    } else {
        loadMoreBtn.classList.add('d-none');
    }
}
