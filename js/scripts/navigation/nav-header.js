/**
 * Module pour la barre de navigation commune à toutes les pages
 */

/**
 * Initialise la barre de navigation
 * @param {boolean} withSearchFunctionality - Indique si la barre doit avoir la fonctionnalité de recherche active
 */
export function initNavHeader(withSearchFunctionality = true) {
    setupHomeButtonListener();
    
    if (withSearchFunctionality) {
        setupSearchFunctionality();
    }
}

/**
 * Configure l'écouteur pour le bouton d'accueil
 */
function setupHomeButtonListener() {
    const homeBtn = document.getElementById('nav-home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

/**
 * Configure les fonctionnalités de recherche
 */
function setupSearchFunctionality() {
    const searchInput = document.getElementById('nav-search-input');
    const searchBtn = document.getElementById('nav-search-btn');
    
    if (searchInput && searchBtn) {
        // Rediriger vers la page de recherche lorsque l'utilisateur appuie sur Entrée
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                redirectToSearchPage(searchInput.value.trim());
            }
        });
        
        // Rediriger vers la page de recherche lorsque l'utilisateur clique sur le bouton de recherche
        searchBtn.addEventListener('click', () => {
            if (searchInput.value.trim()) {
                redirectToSearchPage(searchInput.value.trim());
            }
        });
    }
}

/**
 * Redirige vers la page de recherche avec le terme de recherche
 * @param {string} searchTerm - Le terme de recherche
 */
function redirectToSearchPage(searchTerm) {
    const searchUrl = new URL('search.html', window.location.origin);
    searchUrl.searchParams.append('q', searchTerm);
    window.location.href = searchUrl.toString();
}