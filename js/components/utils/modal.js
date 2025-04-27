
import { cleanupHighlightedElements } from './ui.js';
import { createNoteElement } from './notes.js';

export function openNoteModal(note = null, fromSearch = false, dependencies) {
    const {
        noteModal,
        noteTitle,
        noteContent,
        selectedCategories,
        detectedHashtags,
        deleteNoteBtn,
        currentSearchTerms
    } = dependencies;

    // Reset modal state
    noteTitle.value = '';
    noteContent.value = '';
    selectedCategories.innerHTML = '';
    detectedHashtags.innerHTML = '';
    dependencies.currentNoteId = null;
    deleteNoteBtn.classList.add('hidden');

    if (note) {
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        dependencies.currentNoteId = note.id;
        deleteNoteBtn.classList.remove('hidden');

        if (note.categories) {
            note.categories.forEach(category => dependencies.addCategoryTag(category));
        }

        if (note.hashtags) {
            note.hashtags.forEach(tag => dependencies.addHashtagTag(tag));
        }

        if (fromSearch && currentSearchTerms.length > 0) {
            dependencies.highlightSearchTerms(noteTitle);
            dependencies.highlightSearchTerms(noteContent);
        }
    }

    noteModal.style.display = 'block';
}
