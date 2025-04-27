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