/**
 * Gestionnaire des notes (création, édition, suppression)
 */

import { saveNotes } from '../utils/localStorage.js';
import { generateUniqueId, formatDate } from '../utils/domHelpers.js';

// Variable pour stocker la fonction openNoteModal (à initialiser)
let openNoteModalFn = null;
let renderRevisitSectionsFn = null;

/**
 * Initialise les fonctions externes nécessaires au module
 * @param {Function} openModal - Fonction pour ouvrir le modal de note
 * @param {Function} renderRevisit - Fonction pour rendre les sections de révision
 */
export function initNotesManager(openModal, renderRevisit) {
    openNoteModalFn = openModal;
    renderRevisitSectionsFn = renderRevisit;
}

/**
 * Crée un élément DOM pour une note
 * @param {Object} note - La note à afficher
 * @param {Array} currentSearchTerms - Termes de recherche actifs
 * @returns {HTMLElement} - L'élément DOM de la note
 */
export function createNoteElement(note, currentSearchTerms) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-card';

    // Masquer les liens [[...]] pour l'affichage
    const displayContent = note.content.replace(/\[\[.*?\]\]/g, '');

    // Ajouter une classe spéciale pour les résultats de recherche
    if (note.isSearchResult) {
        noteDiv.className += ' is-search-result';
    }

    noteDiv.dataset.id = note.id;

    // Format date from ISO string to a more readable format
    const createdDate = new Date(note.createdAt);
    const formattedDate = formatDate(createdDate);

    // Create categories HTML
    const categoriesHTML = note.categories && note.categories.length > 0
        ? note.categories.map(cat => `<span class="note-category">${cat}</span>`).join('')
        : '';

    // Create hashtags HTML
    const hashtagsHTML = note.hashtags && note.hashtags.length > 0
        ? note.hashtags.map(tag => `<span class="note-hashtag">#${tag}</span>`).join('')
        : '';

    // Add delete button and only the title (no content, categories or hashtags)
    noteDiv.innerHTML = `
        <div class="delete-note" title="Supprimer cette note">&times;</div>
        <h3 class="note-title">${note.title || 'Sans titre'}</h3>
        <div class="note-date">Créée le ${formattedDate}</div>
    `;

    // Add click event to open the note for editing
    noteDiv.addEventListener('click', (event) => {
        // If clicking on the delete button, don't open the modal
        if (event.target.classList.contains('delete-note')) {
            event.stopPropagation();
            deleteNote(note.id);
            return;
        }

        // Vérifier si on vient d'une recherche (si des termes de recherche sont actifs)
        const fromSearch = currentSearchTerms && currentSearchTerms.length > 0;
        if (openNoteModalFn) {
            openNoteModalFn(note, fromSearch, currentSearchTerms);
        } else {
            console.error('openNoteModal n\'est pas initialisé');
        }
    });

    // Add specific click handler for delete button
    const deleteBtn = noteDiv.querySelector('.delete-note');
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteNote(note.id);
    });

    return noteDiv;
}

/**
 * Supprime une note
 * @param {string} noteId - L'identifiant de la note à supprimer
 * @param {Array} notes - Le tableau des notes
 * @param {Function} renderEmptyState - Fonction pour afficher l'état vide
 * @returns {boolean} - True si la note a été supprimée, false sinon
 */
export function deleteNote(noteId, notes, renderEmptyState) {
    // Ask for confirmation before deleting
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        // Find the note index by id
        const noteIndex = notes.findIndex(note => note.id === noteId);

        if (noteIndex !== -1) {
            // Remove the note from the array
            notes.splice(noteIndex, 1);

            // Save to localStorage
            saveNotes(notes);

            // Revenir à l'état vide
            if (renderEmptyState) {
                renderEmptyState();
            }

            // Mettre à jour les sections de révision
            if (renderRevisitSectionsFn) {
                renderRevisitSectionsFn(notes);
            } else {
                console.error('renderRevisitSections n\'est pas initialisé');
            }
            
            return true;
        }
    }
    return false;
}

/**
 * Sauvegarde une note (nouvelle ou mise à jour)
 * @param {Object} noteData - Données de la note à sauvegarder
 * @param {Array} notes - Le tableau des notes
 * @param {Function} callback - Fonction à appeler après la sauvegarde
 * @returns {string} - L'identifiant de la note sauvegardée
 */
export function saveNote(noteData, notes, callback) {
    const { id, title, content, categories, hashtags, videoUrls } = noteData;
    
    if (id) {
        // Mise à jour d'une note existante
        const existingNote = notes.find(note => note.id === id);
        if (existingNote) {
            existingNote.title = title;
            existingNote.content = content;
            existingNote.categories = categories || [];
            existingNote.hashtags = hashtags || [];
            existingNote.videoUrls = videoUrls || [];
            existingNote.updatedAt = new Date().toISOString();
        }
    } else {
        // Création d'une nouvelle note
        const newNote = {
            id: generateUniqueId(),
            title,
            content,
            categories: categories || [],
            hashtags: hashtags || [],
            videoUrls: videoUrls || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.push(newNote);
    }

    // Sauvegarder les notes dans le localStorage
    saveNotes(notes);

    // Mettre à jour les sections de révision
    if (renderRevisitSectionsFn) {
        renderRevisitSectionsFn(notes);
    } else {
        console.error('renderRevisitSections n\'est pas initialisé');
    }

    // Exécuter le callback si fourni
    if (callback) {
        callback();
    }

    return id || notes[notes.length - 1].id;
}

/**
 * Affiche les notes dans un conteneur
 * @param {HTMLElement} container - Le conteneur où afficher les notes
 * @param {Array} notes - Le tableau des notes à afficher
 * @param {Array} filteredNotes - Optionnel - Tableau de notes filtrées à afficher
 * @param {Array} currentSearchTerms - Termes de recherche actifs
 */
export function renderNotes(container, notes, filteredNotes = null, currentSearchTerms = []) {
    const notesToRender = filteredNotes || notes;
    container.innerHTML = '';

    if (notesToRender.length === 0) {
        container.innerHTML = '';
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = createNoteElement(note, currentSearchTerms);
        container.appendChild(noteElement);
    });
}