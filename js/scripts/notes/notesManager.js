/**
 * Gestionnaire simplifié des notes
 * Adaptation pour fonctionner avec les nouvelles pages dédiées
 */

/**
 * Initialise le gestionnaire de notes
 * Version simplifiée pour compatibilité avec l'ancien code
 */
export function initNotesManager() {
    console.log('Initialisation du gestionnaire de notes simplifié');
    // Cette fonction est maintenant simplifiée
    return {
        createNote: redirectToCreateNote,
        updateNote: redirectToEditNote,
        deleteNote: redirectToDeleteNote,
        fetchAll: () => []
    };
}

/**
 * Crée un élément DOM pour une note
 * @param {Object} note - La note à afficher
 * @param {Function} onClick - Fonction à exécuter au clic sur la note
 * @returns {HTMLElement} - Élément DOM représentant la note
 */
export function createNoteElement(note, onClick) {
    // Créer l'élément de la note
    const noteElement = document.createElement('div');
    noteElement.className = 'note-card';
    noteElement.setAttribute('data-id', note.id);
    
    // Créer le titre de la note
    const title = document.createElement('h3');
    title.className = 'note-title';
    title.textContent = note.title || 'Sans titre';
    
    // Créer le contenu de la note
    const content = document.createElement('div');
    content.className = 'note-content';
    
    // Limiter le contenu à 150 caractères pour l'aperçu
    const maxLength = 150;
    const contentText = note.content || '';
    content.textContent = contentText.length > maxLength ? 
        contentText.substring(0, maxLength) + '...' : contentText;
    
    // Ajouter les éléments au conteneur de la note
    noteElement.appendChild(title);
    noteElement.appendChild(content);
    
    // Optionnellement, ajouter des catégories ou hashtags
    if (note.categories && note.categories.length > 0) {
        const categories = document.createElement('div');
        categories.className = 'note-categories';
        
        note.categories.forEach(category => {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = category;
            categories.appendChild(tag);
        });
        
        noteElement.appendChild(categories);
    }
    
    if (note.hashtags && note.hashtags.length > 0) {
        const hashtags = document.createElement('div');
        hashtags.className = 'note-hashtags';
        
        note.hashtags.forEach(tag => {
            const hashtagElement = document.createElement('span');
            hashtagElement.className = 'hashtag-tag';
            hashtagElement.textContent = '#' + tag;
            hashtags.appendChild(hashtagElement);
        });
        
        noteElement.appendChild(hashtags);
    }
    
    // Ajouter un gestionnaire d'événements pour ouvrir la note
    noteElement.addEventListener('click', (event) => {
        event.preventDefault();
        if (typeof onClick === 'function') {
            onClick(note);
        } else {
            redirectToViewNote(note.id);
        }
    });
    
    // Ajouter les actions (éditer, supprimer)
    const actions = document.createElement('div');
    actions.className = 'note-actions';
    
    // Bouton d'édition
    const editButton = document.createElement('button');
    editButton.className = 'edit-button';
    editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
    `;
    editButton.setAttribute('aria-label', 'Éditer la note');
    editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        redirectToEditNote(note.id);
    });
    
    // Bouton de suppression
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    `;
    deleteButton.setAttribute('aria-label', 'Supprimer la note');
    deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            redirectToDeleteNote(note.id);
        }
    });
    
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    noteElement.appendChild(actions);
    
    return noteElement;
}

// Fonctions de redirection vers les pages dédiées

/**
 * Redirige vers la page de création de note
 */
function redirectToCreateNote() {
    window.location.href = 'edit-note.html';
}

/**
 * Redirige vers la page d'édition de note
 * @param {string} noteId - ID de la note à éditer
 */
function redirectToEditNote(noteId) {
    if (!noteId) return;
    const params = new URLSearchParams();
    params.append('id', noteId);
    window.location.href = `edit-note.html?${params.toString()}`;
}

/**
 * Redirige vers la page de visualisation de note
 * @param {string} noteId - ID de la note à visualiser
 */
function redirectToViewNote(noteId) {
    if (!noteId) return;
    const params = new URLSearchParams();
    params.append('id', noteId);
    window.location.href = `view-note.html?${params.toString()}`;
}

/**
 * Gestion de la suppression d'une note
 * @param {string} noteId - ID de la note à supprimer
 */
function redirectToDeleteNote(noteId) {
    if (!noteId) return;
    window.location.href = `view-note.html?id=${noteId}`;
}