
// Gestion des notes
export function createNoteElement(note, openNoteModal, deleteNote) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-card';
    
    if (note.isSearchResult) {
        noteDiv.className += ' is-search-result';
    }
    
    noteDiv.dataset.id = note.id;

    const createdDate = new Date(note.createdAt);
    const formattedDate = createdDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const categoriesHTML = note.categories && note.categories.length > 0
        ? note.categories.map(cat => `<span class="note-category">${cat}</span>`).join('')
        : '';

    const hashtagsHTML = note.hashtags && note.hashtags.length > 0
        ? note.hashtags.map(tag => `<span class="note-hashtag">#${tag}</span>`).join('')
        : '';

    noteDiv.innerHTML = `
        <div class="delete-note" title="Supprimer cette note">&times;</div>
        <h3 class="note-title">${note.title || 'Sans titre'}</h3>
        <p class="note-content">${note.content}</p>
        <div class="note-meta">
            ${categoriesHTML}
            ${hashtagsHTML}
        </div>
        <div class="note-date">Créée le ${formattedDate}</div>
    `;

    noteDiv.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-note')) {
            event.stopPropagation();
            deleteNote(note.id);
            return;
        }
        openNoteModal(note, false);
    });

    return noteDiv;
}

export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function extractHashtags(content) {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? [...new Set(matches.map(match => match.substring(1)))] : [];
}
