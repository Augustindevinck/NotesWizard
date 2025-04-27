/**
 * Utilitaire de navigation entre les pages
 */

/**
 * Navigue vers une page avec des paramètres optionnels
 * @param {string} page - Le chemin vers la page (ex: 'search.html')
 * @param {Object} params - Les paramètres à passer dans l'URL (optionnel)
 */
export function navigateToPage(page, params = null) {
    let url = page;
    
    // Ajouter les paramètres à l'URL si nécessaire
    if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        for (const key in params) {
            searchParams.append(key, params[key]);
        }
        url += `?${searchParams.toString()}`;
    }
    
    // Naviguer vers la page
    window.location.href = url;
}

/**
 * Récupère les paramètres de l'URL actuelle
 * @returns {Object} - Les paramètres de l'URL sous forme d'objet
 */
export function getUrlParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams.entries()) {
        params[key] = value;
    }
    
    return params;
}

/**
 * Navigue vers la vue générale des notes
 */
export function navigateToGeneralView() {
    navigateToPage('categories.html');
}