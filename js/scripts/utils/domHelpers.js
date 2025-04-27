/**
 * Fonctions utilitaires pour la manipulation du DOM
 */

/**
 * Nettoie tous les éléments surlignés dans le DOM
 */
export function cleanupHighlightedElements() {
    // Supprimer tous les conteneurs de surlignage
    const highlightedContainers = document.querySelectorAll('.highlighted-content');
    highlightedContainers.forEach(container => {
        const parent = container.parentNode;
        const originalInput = parent.querySelector('input, textarea');
        if (originalInput) {
            originalInput.style.display = ''; // Réafficher l'élément original
        }
        parent.removeChild(container);
    });
    
    // Restaurer le contenu original des tags
    const highlightedTags = document.querySelectorAll('[data-original-content]');
    highlightedTags.forEach(tag => {
        tag.textContent = tag.dataset.originalContent;
        delete tag.dataset.originalContent;
    });
}

/**
 * Génère un identifiant unique
 * @returns {string} - Identifiant unique
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Affiche un état vide (aucune note) dans le conteneur principal
 * @param {HTMLElement} container - Le conteneur où afficher l'état vide
 */
export function renderEmptyState(container) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <p>Aucune note à afficher.</p>
            <p>Cliquez sur le bouton + pour ajouter une note.</p>
        </div>
    `;
}

/**
 * Formate une date au format local
 * @param {Date} date - La date à formater
 * @returns {string} - La date formatée
 */
export function formatDate(date) {
    if (!date) return '';
    
    // Vérifier si la date est un objet Date valide
    if (!(date instanceof Date) || isNaN(date)) {
        try {
            date = new Date(date);
            if (isNaN(date)) {
                return 'Date invalide';
            }
        } catch (e) {
            return 'Date invalide';
        }
    }
    
    // Formatter la date
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}