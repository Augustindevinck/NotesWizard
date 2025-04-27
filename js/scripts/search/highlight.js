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

    let highlightedContent = content;

    // Mettre en évidence chaque terme de recherche
    searchTerms.forEach(term => {
        if (term.length > 1) {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedContent = highlightedContent.replace(regex, '<span class="highlighted-term">$1</span>');
        }
    });

    return highlightedContent;
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

    // Create a container for the highlighted content
    const highlightedContainer = document.createElement('div');
    highlightedContainer.className = 'highlighted-content';
    highlightedContainer.style.width = '100%';
    highlightedContainer.style.height = '100%';
    highlightedContainer.style.boxSizing = 'border-box';
    highlightedContainer.style.overflow = 'auto';
    
    // Copy styling from the original element
    if (inputElement.tagName === 'TEXTAREA') {
        highlightedContainer.style.whiteSpace = 'pre-wrap';
        highlightedContainer.style.padding = window.getComputedStyle(inputElement).padding;
    }

    // Get the content and add highlights
    let content = inputElement.value || inputElement.textContent || '';
    
    // Escape HTML special characters to prevent injection
    content = content.replace(/[&<>"']/g, match => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
    
    // Replace line breaks with <br> for proper display in div
    if (inputElement.tagName === 'TEXTAREA') {
        content = content.replace(/\n/g, '<br>');
    }
    
    // Apply highlighting for each search term (case-insensitive)
    searchTerms.forEach(term => {
        if (term.length > 1) {
            const regex = new RegExp(`(${term})`, 'gi');
            content = content.replace(regex, '<span class="highlighted-term">$1</span>');
        }
    });
    
    // Set the highlighted content
    highlightedContainer.innerHTML = content;
    
    // Add the highlighted container after the input element
    inputElement.parentNode.insertBefore(highlightedContainer, inputElement.nextSibling);
    
    // Hide the original input element
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
        
        // Store original content for later restoration
        tag.dataset.originalContent = originalText;
        
        let highlightedText = originalText;
        
        // Apply highlighting for each search term
        searchTerms.forEach(term => {
            if (term.length > 1) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<span class="highlighted-term">$1</span>');
            }
        });
        
        // Set the highlighted content
        if (highlightedText !== originalText) {
            tag.innerHTML = highlightedText;
        }
    });
}