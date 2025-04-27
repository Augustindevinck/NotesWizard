/**
 * Fonctions pour la mise en évidence des résultats de recherche
 */

/**
 * Met en évidence les termes de recherche dans un élément HTML
 * @param {string} content - Le contenu à mettre en évidence
 * @param {Array} searchTerms - Les termes à mettre en évidence
 * @returns {string} - Contenu avec termes mis en évidence
 */
export function highlightSearchResults(content, searchTerms) {
    if (!content || !searchTerms || searchTerms.length === 0) {
        return content;
    }
    
    // Échapper les caractères spéciaux pour éviter les injections HTML
    let escapedContent = content.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
    
    // Appliquer la mise en évidence pour chaque terme de recherche (insensible à la casse)
    searchTerms.forEach(term => {
        if (term.length > 1) { // Ignorer les termes trop courts
            const regex = new RegExp(`(${term})`, 'gi');
            escapedContent = escapedContent.replace(regex, '<span class="highlighted-term">$1</span>');
        }
    });
    
    return escapedContent;
}

/**
 * Met en évidence les termes de recherche dans un élément d'entrée (input/textarea)
 * @param {HTMLElement} inputElement - L'élément d'entrée
 * @param {Array} searchTerms - Les termes à mettre en évidence
 */
export function highlightSearchTermsInInput(inputElement, searchTerms) {
    if (!inputElement || !searchTerms || searchTerms.length === 0) {
        return;
    }

    // Créer un conteneur pour le contenu mis en évidence
    const highlightedContainer = document.createElement('div');
    highlightedContainer.className = 'highlighted-content';
    highlightedContainer.style.width = '100%';
    highlightedContainer.style.height = '100%';
    highlightedContainer.style.boxSizing = 'border-box';
    highlightedContainer.style.overflow = 'auto';
    
    // Copier le style de l'élément original
    if (inputElement.tagName === 'TEXTAREA') {
        highlightedContainer.style.whiteSpace = 'pre-wrap';
        highlightedContainer.style.padding = window.getComputedStyle(inputElement).padding;
    }

    // Obtenir le contenu et ajouter les mises en évidence
    let content = inputElement.value || inputElement.textContent || '';
    
    // Remplacer les sauts de ligne par <br> pour l'affichage correct dans div
    if (inputElement.tagName === 'TEXTAREA') {
        content = content.replace(/\n/g, '<br>');
    }
    
    // Mettre en évidence les termes
    highlightedContainer.innerHTML = highlightSearchResults(content, searchTerms);
    
    // Ajouter le conteneur après l'élément d'entrée
    inputElement.parentNode.insertBefore(highlightedContainer, inputElement.nextSibling);
    
    // Masquer l'élément d'entrée original
    inputElement.style.display = 'none';
}

/**
 * Met en évidence les termes de recherche dans les tags (catégories et hashtags)
 * @param {HTMLElement} container - Conteneur des tags
 * @param {string} selector - Sélecteur CSS pour trouver les tags
 * @param {Array} searchTerms - Termes de recherche à mettre en évidence
 */
export function highlightSearchTermsInTags(container, selector, searchTerms) {
    if (!container || !searchTerms || searchTerms.length === 0) {
        return;
    }

    const tags = container.querySelectorAll(selector);
    
    tags.forEach(tag => {
        const originalText = tag.textContent;
        
        // Stocker le contenu original pour restauration ultérieure
        tag.dataset.originalContent = originalText;
        
        // Mettre en évidence les termes
        tag.innerHTML = highlightSearchResults(originalText, searchTerms);
    });
}