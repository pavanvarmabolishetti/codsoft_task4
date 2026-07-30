// Application State Management
const state = {
    activeMovie: null,        // Currently recommended-for movie
    genres: [],               // List of unique genres
    recentSearches: [],       // Saved search histories
    spotlightMovie: null,     // Featured movie in Hero spotlight
    trendingMovies: [],       // List of trending movies
    popularMovies: []         // List of popular movies
};

// DOM Selectors
const searchInput = document.getElementById('search-input');
const suggestionsBox = document.getElementById('suggestions-box');
const clearSearchBtn = document.getElementById('clear-search-btn');
const genreSelect = document.getElementById('genre-select');
const yearStartInput = document.getElementById('year-start');
const yearEndInput = document.getElementById('year-end');
const ratingSlider = document.getElementById('rating-slider');
const ratingValLabel = document.getElementById('rating-val');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const recentTagsContainer = document.getElementById('recent-tags');
const recommendationsHeader = document.getElementById('recommendations-header');
const recSourceTitle = document.getElementById('rec-source-title');
const recResultsCount = document.getElementById('rec-results-count');
const recommendationsContainer = document.getElementById('recommendations-container');
const emptyResultsState = document.getElementById('empty-results-state');
const mainLoader = document.getElementById('main-loader');
const trendingCarousel = document.getElementById('trending-carousel');
const popularCarousel = document.getElementById('popular-carousel');

// Hero Spotlight DOM Selectors
const heroSpotlight = document.getElementById('hero-spotlight');
const heroMovieTitle = document.getElementById('hero-movie-title');
const heroMovieYear = document.getElementById('hero-movie-year');
const heroMovieRating = document.getElementById('hero-movie-rating');
const heroMovieGenres = document.getElementById('hero-movie-genres');
const heroMovieDesc = document.getElementById('hero-movie-desc');
const heroRecBtn = document.getElementById('hero-rec-btn');
const heroDetailsBtn = document.getElementById('hero-details-btn');

// Movie Details Modal DOM Selectors
const detailsModal = document.getElementById('details-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalMovieTitle = document.getElementById('modal-movie-title');
const modalMovieYear = document.getElementById('modal-movie-year');
const modalMovieRating = document.getElementById('modal-movie-rating');
const modalMoviePopularity = document.getElementById('modal-movie-popularity');
const modalMovieGenres = document.getElementById('modal-movie-genres');
const modalMovieDesc = document.getElementById('modal-movie-desc');
const modalMovieDirector = document.getElementById('modal-movie-director');
const modalMovieCast = document.getElementById('modal-movie-cast');
const modalRecBtn = document.getElementById('modal-rec-btn');

// Toast Notification DOM Selectors
const errorToast = document.getElementById('error-toast');
const toastMessage = document.getElementById('toast-message');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadRecentSearches();
    fetchGenres();
    fetchCarousels();
    setupEventListeners();
}

// -------------------------------------------------------------
// EVENT LISTENERS & HANDLERS
// -------------------------------------------------------------
function setupEventListeners() {
    // Search Autocomplete Suggestion Logic
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (query.length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
            suggestionsBox.classList.add('hidden');
        }
        
        debounceTimer = setTimeout(() => {
            if (query.length >= 2) {
                fetchSuggestions(query);
            } else {
                suggestionsBox.classList.add('hidden');
            }
        }, 200);
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        suggestionsBox.classList.add('hidden');
        searchInput.focus();
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
        }
    });

    // Rating Slider Live Update
    ratingSlider.addEventListener('input', (e) => {
        ratingValLabel.textContent = parseFloat(e.target.value).toFixed(1);
    });

    // Apply & Reset Filters Buttons
    applyFiltersBtn.addEventListener('click', () => {
        if (state.activeMovie) {
            getRecommendations(state.activeMovie.id, state.activeMovie.title);
        } else {
            showToast("Search a movie first to generate recommendations.");
        }
    });

    resetFiltersBtn.addEventListener('click', () => {
        genreSelect.value = '';
        yearStartInput.value = '';
        yearEndInput.value = '';
        ratingSlider.value = 5.0;
        ratingValLabel.textContent = '5.0';
        if (state.activeMovie) {
            getRecommendations(state.activeMovie.id, state.activeMovie.title);
        }
    });

    // Hero Spotlight recommendation actions
    heroRecBtn.addEventListener('click', () => {
        if (state.spotlightMovie) {
            triggerRecommendationForMovie(state.spotlightMovie);
        }
    });

    heroDetailsBtn.addEventListener('click', () => {
        if (state.spotlightMovie) {
            openDetailsModal(state.spotlightMovie);
        }
    });

    // Modal Events
    modalCloseBtn.addEventListener('click', closeDetailsModal);
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) closeDetailsModal();
    });

    modalRecBtn.addEventListener('click', () => {
        if (state.activeMovieModal) {
            triggerRecommendationForMovie(state.activeMovieModal);
            closeDetailsModal();
        }
    });

    // Click Brand to Reset Dashboard
    document.getElementById('brand-logo').addEventListener('click', () => {
        resetDashboardToHome();
    });
}

// Reset Dashboard helper
function resetDashboardToHome() {
    state.activeMovie = null;
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    suggestionsBox.classList.add('hidden');
    recommendationsHeader.classList.add('hidden');
    
    // Clear recommendations, show empty state
    recommendationsContainer.innerHTML = '';
    recommendationsContainer.appendChild(emptyResultsState);
    emptyResultsState.classList.remove('hidden');
    
    // Reset inputs
    genreSelect.value = '';
    yearStartInput.value = '';
    yearEndInput.value = '';
    ratingSlider.value = 5.0;
    ratingValLabel.textContent = '5.0';
}

// -------------------------------------------------------------
// API FETCH OPERATIONS
// -------------------------------------------------------------

// Fetch Autocomplete Suggestions
async function fetchSuggestions(query) {
    try {
        const response = await fetch(`/suggest?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Search suggestion request failed.");
        const data = await response.json();
        renderSuggestions(data);
    } catch (err) {
        console.error("Suggestions Error:", err);
    }
}

// Fetch Genres for Dropdown Filter
async function fetchGenres() {
    try {
        const response = await fetch('/genres');
        if (!response.ok) throw new Error("Could not retrieve genres list.");
        const genres = await response.json();
        state.genres = genres;
        
        genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            genreSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Genres fetch error:", err);
    }
}

// Fetch Trending and Popular Movies (Carousels)
async function fetchCarousels() {
    try {
        const response = await fetch('/popular');
        if (!response.ok) throw new Error("Could not load popular sections.");
        const data = await response.json();
        
        state.trendingMovies = data.trending || [];
        state.popularMovies = data.popular || [];
        
        renderCarousel(trendingCarousel, state.trendingMovies);
        renderCarousel(popularCarousel, state.popularMovies);
        
        // Select random trending movie for Spotlight Hero
        if (state.trendingMovies.length > 0) {
            const idx = Math.floor(Math.random() * Math.min(5, state.trendingMovies.length));
            setSpotlightHero(state.trendingMovies[idx]);
        }
    } catch (err) {
        console.error("Popular carousels load error:", err);
        showToast("Failed to fetch trending movies dashboard.");
    }
}

// Request AI Recommendations
async function getRecommendations(movieId, movieTitle) {
    // Show spinner & hide elements
    mainLoader.classList.remove('hidden');
    recommendationsContainer.classList.add('hidden');
    emptyResultsState.classList.add('hidden');
    recommendationsHeader.classList.add('hidden');
    
    // Read current filter settings
    const bodyPayload = {
        movie_id: movieId,
        title: movieTitle,
        genre: genreSelect.value,
        year_start: yearStartInput.value ? parseInt(yearStartInput.value) : null,
        year_end: yearEndInput.value ? parseInt(yearEndInput.value) : null,
        min_rating: parseFloat(ratingSlider.value)
    };
    
    try {
        const response = await fetch('/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || "Recommendation error.");
        }
        
        state.activeMovie = data.query_movie;
        saveSearchTag(data.query_movie.title, data.query_movie.id);
        
        renderRecommendations(data.recommendations);
    } catch (err) {
        console.error(err);
        showToast(err.message);
        mainLoader.classList.add('hidden');
        recommendationsContainer.classList.remove('hidden');
        if (recommendationsContainer.children.length === 0) {
            recommendationsContainer.appendChild(emptyResultsState);
            emptyResultsState.classList.remove('hidden');
        }
    }
}

// -------------------------------------------------------------
// UI RENDERING FUNCTIONS
// -------------------------------------------------------------

// Hero Spotlight Movie setup
function setSpotlightHero(movie) {
    state.spotlightMovie = movie;
    heroMovieTitle.textContent = movie.title;
    heroMovieYear.textContent = movie.year;
    heroMovieRating.innerHTML = `<i class="fa-solid fa-star text-gold"></i> ${movie.rating}`;
    heroMovieGenres.textContent = movie.genre;
    heroMovieDesc.textContent = movie.description;
}

// Render Autocomplete Suggestions list
function renderSuggestions(list) {
    suggestionsBox.innerHTML = '';
    
    if (list.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }
    
    list.forEach(m => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <span class="title">${m.title}</span>
            <div class="meta">
                <span>${m.year}</span>
                <span>•</span>
                <span>${m.genre}</span>
                <span>•</span>
                <span><i class="fa-solid fa-star text-gold"></i> ${m.rating}</span>
            </div>
        `;
        item.addEventListener('click', () => {
            searchInput.value = m.title;
            suggestionsBox.classList.add('hidden');
            clearSearchBtn.classList.remove('hidden');
            triggerRecommendationForMovie(m);
        });
        suggestionsBox.appendChild(item);
    });
    
    suggestionsBox.classList.remove('hidden');
}

// Helper to trigger recommended action for a chosen movie
function triggerRecommendationForMovie(movie) {
    state.activeMovie = movie;
    getRecommendations(movie.id, movie.title);
}

// Render Recommendations Grid Results
function renderRecommendations(recs) {
    mainLoader.classList.add('hidden');
    recommendationsContainer.innerHTML = '';
    
    // Set Header
    recSourceTitle.textContent = state.activeMovie.title;
    recResultsCount.textContent = `${recs.length} movie${recs.length === 1 ? '' : 's'} recommended`;
    recommendationsHeader.classList.remove('hidden');
    
    if (recs.length === 0) {
        // No results empty state
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'empty-state';
        noResultsDiv.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation empty-icon"></i>
            <h3>No recommendations match your filters</h3>
            <p>Try widening the Release Year range, decreasing the Minimum Rating, or selecting another Genre.</p>
        `;
        recommendationsContainer.appendChild(noResultsDiv);
        recommendationsContainer.classList.remove('hidden');
        return;
    }
    
    recs.forEach(m => {
        const card = document.createElement('article');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="card-backdrop-stub">
                <i class="fa-solid fa-film"></i>
                <span class="card-rating-badge"><i class="fa-solid fa-star text-gold"></i> ${m.rating}</span>
                <span class="card-similarity-badge">${m.similarity_percentage}% match</span>
            </div>
            <div class="card-content">
                <div class="card-genre-list">${m.genre}</div>
                <h3 class="card-title">${m.title}</h3>
                <div class="card-year-director">${m.year} • Directed by ${m.director}</div>
                <p class="card-description">${m.description}</p>
                <div class="card-ai-explanation">
                    <i class="fa-solid fa-quote-left" style="color: var(--accent); margin-right: 4px; font-size: 10px;"></i>
                    ${m.explanation}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => openDetailsModal(m));
        recommendationsContainer.appendChild(card);
    });
    
    recommendationsContainer.classList.remove('hidden');
    
    // Auto scroll down to recommendation results
    recommendationsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render Mini Cards in Carousels
function renderCarousel(carouselElement, movies) {
    carouselElement.innerHTML = '';
    
    if (movies.length === 0) {
        carouselElement.innerHTML = '<span class="no-recent">No movies available</span>';
        return;
    }
    
    movies.forEach(m => {
        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.innerHTML = `
            <div class="carousel-stub">
                <span class="carousel-rating"><i class="fa-solid fa-star text-gold"></i> ${m.rating}</span>
            </div>
            <div class="carousel-content">
                <div class="carousel-genres">${m.genre}</div>
                <h4 class="carousel-title">${m.title}</h4>
                <div class="carousel-meta">${m.year} • Dir: ${m.director}</div>
                <p class="carousel-desc">${m.description}</p>
            </div>
        `;
        
        card.addEventListener('click', () => openDetailsModal(m));
        carouselElement.appendChild(card);
    });
}

// -------------------------------------------------------------
// RECENT SEARCHES HANDLING
// -------------------------------------------------------------
function loadRecentSearches() {
    try {
        const raw = localStorage.getItem('flixrecs_recent');
        state.recentSearches = raw ? JSON.parse(raw) : [];
        renderRecentTags();
    } catch (e) {
        state.recentSearches = [];
    }
}

function saveSearchTag(title, id) {
    // Remove if already exists
    state.recentSearches = state.recentSearches.filter(item => item.id !== id);
    // Add to front
    state.recentSearches.unshift({ title, id });
    // Limit to 5
    if (state.recentSearches.length > 5) {
        state.recentSearches.pop();
    }
    
    localStorage.setItem('flixrecs_recent', JSON.stringify(state.recentSearches));
    renderRecentTags();
}

function deleteRecentTag(e, id) {
    e.stopPropagation();
    state.recentSearches = state.recentSearches.filter(item => item.id !== id);
    localStorage.setItem('flixrecs_recent', JSON.stringify(state.recentSearches));
    renderRecentTags();
}

function renderRecentTags() {
    recentTagsContainer.innerHTML = '';
    
    if (state.recentSearches.length === 0) {
        recentTagsContainer.innerHTML = '<span class="no-recent">No recent searches</span>';
        return;
    }
    
    state.recentSearches.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'recent-tag';
        tag.innerHTML = `
            ${item.title}
            <i class="fa-solid fa-xmark remove-tag-btn" data-id="${item.id}"></i>
        `;
        
        tag.addEventListener('click', () => {
            searchInput.value = item.title;
            clearSearchBtn.classList.remove('hidden');
            getRecommendations(item.id, item.title);
        });
        
        const deleteBtn = tag.querySelector('.remove-tag-btn');
        deleteBtn.addEventListener('click', (e) => deleteRecentTag(e, item.id));
        
        recentTagsContainer.appendChild(tag);
    });
}

// -------------------------------------------------------------
// DETAILS MODAL CONTROL
// -------------------------------------------------------------
function openDetailsModal(movie) {
    state.activeMovieModal = movie;
    
    modalMovieTitle.textContent = movie.title;
    modalMovieYear.textContent = movie.year;
    modalMovieRating.innerHTML = `<i class="fa-solid fa-star" style="color: var(--gold); margin-right: 4px;"></i> ${movie.rating}`;
    modalMoviePopularity.innerHTML = `<i class="fa-solid fa-heart" style="color: var(--accent); margin-right: 4px;"></i> ${movie.popularity}% Popular`;
    
    // Split and render genres as pills
    modalMovieGenres.innerHTML = '';
    movie.genre.split(',').forEach(g => {
        const span = document.createElement('span');
        span.textContent = g.strip ? g.strip() : g.trim();
        modalMovieGenres.appendChild(span);
    });
    
    modalMovieDesc.textContent = movie.description;
    modalMovieDirector.textContent = movie.director;
    modalMovieCast.textContent = movie.cast;
    
    detailsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock body scrolling
}

function closeDetailsModal() {
    detailsModal.classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restore body scrolling
    state.activeMovieModal = null;
}

// -------------------------------------------------------------
// TOAST ERRORS NOTIFICATIONS
// -------------------------------------------------------------
let toastTimer;
function showToast(message) {
    toastMessage.textContent = message;
    errorToast.classList.remove('hidden');
    
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        errorToast.classList.add('hidden');
    }, 4000);
}
