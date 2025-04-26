
export function cleanupHighlightedElements() {
    const highlightedElements = document.querySelectorAll('.highlighted-content');
    highlightedElements.forEach(el => {
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName === 'INPUT' || prev.tagName === 'TEXTAREA')) {
            prev.style.display = '';
        }
        el.parentNode.removeChild(el);
    });
    
    const highlightedTags = document.querySelectorAll('.category-tag, .hashtag-tag');
    highlightedTags.forEach(tag => {
        if (tag.dataset.originalContent) {
            tag.textContent = tag.dataset.originalContent;
            delete tag.dataset.originalContent;
        }
    });
}

export function highlightSearchTerms(inputElement, currentSearchTerms) {
    const startPos = inputElement.selectionStart;
    const endPos = inputElement.selectionEnd;
    let content = inputElement.value;
    
    currentSearchTerms.forEach(term => {
        if (term.length > 1) {
            const regex = new RegExp(term, 'gi');
            content = content.replace(regex, match => {
                return `§§HIGHLIGHT_START§§${match}§§HIGHLIGHT_END§§`;
            });
        }
    });
    
    // Reste de la fonction...
}
