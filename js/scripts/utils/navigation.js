/**
 * Utilitaires de navigation entre les pages
 */

/**
 * Navigue vers une autre page en passant des paramètres
 * @param {string} page - Chemin de la page
 * @param {Object} params - Paramètres à passer dans l'URL
 */
export function navigateToPage(page, params = {}) {
    // Construire l'URL avec les paramètres
    let url = page;
    const queryParams = [];
    
    // Ajouter chaque paramètre à l'URL
    for (const key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
            queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
        }
    }
    
    // Ajouter les paramètres à l'URL s'il y en a
    if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
    }
    
    // Naviguer vers la nouvelle URL
    window.location.href = url;
}

/**
 * Récupère les paramètres de l'URL courante
 * @returns {Object} - Objet contenant les paramètres de l'URL
 */
export function getUrlParams() {
    // Objet pour stocker les paramètres
    const params = {};
    
    // Récupérer la chaîne de requête (tout ce qui suit le ? dans l'URL)
    const queryString = window.location.search.substring(1);
    
    // Si la chaîne de requête est vide, retourner un objet vide
    if (!queryString) {
        return params;
    }
    
    // Diviser la chaîne de requête en paires clé-valeur
    const pairs = queryString.split('&');
    
    // Pour chaque paire, extraire la clé et la valeur
    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        
        // Décoder la clé et la valeur pour gérer les caractères spéciaux
        const decodedKey = decodeURIComponent(key);
        const decodedValue = value ? decodeURIComponent(value) : '';
        
        // Ajouter la paire clé-valeur à l'objet de paramètres
        params[decodedKey] = decodedValue;
    }
    
    return params;
}

/**
 * Met à jour un paramètre dans l'URL sans recharger la page
 * @param {string} key - Clé du paramètre
 * @param {string} value - Valeur du paramètre
 */
export function updateUrlParam(key, value) {
    // Récupérer l'URL actuelle
    const url = new URL(window.location.href);
    
    // Mettre à jour ou ajouter le paramètre
    if (value === null || value === undefined || value === '') {
        // Supprimer le paramètre s'il n'a pas de valeur
        url.searchParams.delete(key);
    } else {
        // Mettre à jour ou ajouter le paramètre
        url.searchParams.set(key, value);
    }
    
    // Mettre à jour l'URL dans la barre d'adresse sans recharger la page
    window.history.pushState({}, '', url);
}

/**
 * Supprime un paramètre de l'URL sans recharger la page
 * @param {string} key - Clé du paramètre à supprimer
 */
export function removeUrlParam(key) {
    updateUrlParam(key, null);
}

/**
 * Vérifie si l'utilisateur est sur une page spécifique
 * @param {string} pageName - Nom de la page à vérifier
 * @returns {boolean} - Vrai si l'utilisateur est sur la page spécifiée
 */
export function isOnPage(pageName) {
    // Récupérer le chemin actuel
    const currentPath = window.location.pathname;
    
    // Extraire le nom de fichier du chemin
    const fileName = currentPath.split('/').pop();
    
    // Vérifier si le nom de fichier correspond à la page spécifiée
    return fileName === pageName;
}