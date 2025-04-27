/**
 * Fonctions utilitaires pour la manipulation du DOM
 */

/**
 * Nettoie tous les éléments surlignés dans le DOM
 */
export function cleanupHighlightedElements() {
    // Restaurer les inputs originaux
    const highlightedElements = document.querySelectorAll('.highlighted-content');
    highlightedElements.forEach(el => {
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName === 'INPUT' || prev.tagName === 'TEXTAREA')) {
            prev.style.display = '';
        }
        el.parentNode.removeChild(el);
    });

    // Restaurer les tags originaux (catégories et hashtags)
    const highlightedTags = document.querySelectorAll('.category-tag, .hashtag-tag');
    highlightedTags.forEach(tag => {
        if (tag.dataset.originalContent) {
            tag.textContent = tag.dataset.originalContent;
            delete tag.dataset.originalContent;
        }
    });
}

/**
 * Génère un identifiant unique
 * @returns {string} - Identifiant unique
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Affiche un état vide (aucune note) dans le conteneur principal
 * @param {HTMLElement} container - Le conteneur où afficher l'état vide
 */
export function renderEmptyState(container) {
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
}

/**
 * Formate une date au format local
 * @param {Date} date - La date à formater
 * @returns {string} - La date formatée
 */
export function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}