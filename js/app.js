// Global State
let matchesList = [];
let filterdmatches = [];
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