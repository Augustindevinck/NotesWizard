import { cleanupHighlightedElements } from './ui.js';
import { saveNotes } from './storage.js';

export function createNoteElement(note, isEditable = true) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-card';
    noteDiv.dataset.id = note.id;

    const displayContent = note.content.replace(/\[\[.*?\]\]/g, '');

    const createdDate = new Date(note.createdAt);
    const formattedDate = createdDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const categoriesHTML = note.categories?.map(cat => `<span class="note-category">${cat}</span>`).join('') || '';
    const hashtagsHTML = note.hashtags?.map(tag => `<span class="note-hashtag">#${tag}</span>`).join('') || '';

    noteDiv.innerHTML = `
        ${isEditable ? '<div class="delete-note" title="Supprimer cette note">&times;</div>' : ''}
        <h3 class="note-title">${note.title || 'Sans titre'}</h3>
        <p class="note-content">${displayContent}</p>
        <div class="note-meta">
            ${categoriesHTML}
            ${hashtagsHTML}
        </div>
        <div class="note-date">Créée le ${formattedDate}</div>
    `;

    return noteDiv;
}

export function deleteNote(noteId, notes) {
    const noteIndex = notes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
        notes.splice(noteIndex, 1);
        saveNotes(notes);
        return true;
    }
    return false;
}