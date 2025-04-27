/**
 * Script principal pour la page de recherche
 */

// Imports des modules
import { loadNotes, saveNotes } from './scripts/utils/localStorage.js';
import { exportNotes, importNotes } from './scripts/utils/exportImport.js';
import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { createNoteElement, deleteNote, saveNote, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './scripts/notes/noteModal.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { initSearchManager, performSearch } from './scripts/search/searchManager.js';
import { navigateToPage, getUrlParams } from './scripts/utils/navigation.js';

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchResultsList = document.getElementById('search-results-list');
    const noteModal = document.getElementById('note-modal');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const selectedCategories = document.getElementById('selected-categories');
    const detectedHashtags = document.getElementById('detected-hashtags');
    const categoryInput = document.getElementById('category-input');
    const categorySuggestions = document.getElementById('category-suggestions');
    const addNoteBtn = document.getElementById('add-note-btn');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');


    const appState = {
        notes: loadNotes(),
        allCategories: new Set(),
        searchResults: []
    };

    // Initialiser les composants nécessaires
    initNotesManager(openNoteModal);
    initNoteModal({
        noteModal,
        noteTitle,
        noteContent,
        selectedCategories,
        detectedHashtags,
        deleteNoteBtn,
        saveNoteBtn
    });

    // Configuration des événements
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => navigateToPage('index.html'));
    }

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch(searchInput.value, searchResultsList);
        }
    });

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value, searchResultsList);
        });
    }

    // Vérifier s'il y a une requête dans l'URL
    const params = getUrlParams();
    if (params.query) {
        searchInput.value = params.query;
        performSearch(params.query, searchResultsList);
    }

    // Saisie de catégorie pour l'autocomplétion
    categoryInput.addEventListener('input', (event) => {
        handleCategoryInput(event, categoryInput, categorySuggestions);
    });

    categoryInput.addEventListener('keydown', (event) => {
        handleCategoryKeydown(event, categoryInput, selectedCategories, categorySuggestions);
    });

    // Détection des hashtags pendant la saisie
    noteContent.addEventListener('input', () => {
        detectHashtags(noteContent.value, detectedHashtags);
    });

    // Bouton d'ajout de note
    addNoteBtn.addEventListener('click', () => openNoteModal());

    // Bouton de sauvegarde de note
    saveNoteBtn.addEventListener('click', () => {
        saveCurrentNote(appState.notes);
    });

    // Bouton de suppression de note dans le modal
    deleteNoteBtn.addEventListener('click', () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
            if (currentNoteId) {
                deleteNote(currentNoteId, appState.notes, () => {});
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
            }
        }
    });


    // Import/Export (Preserved from original code)
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportModal = document.getElementById('import-export-modal');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const importStatus = document.getElementById('import-status');
    const modalCloseButtons = document.querySelectorAll('.close');

    importExportBtn.addEventListener('click', () => {
        importExportModal.style.display = 'flex';
    });

    exportBtn.addEventListener('click', () => {
        exportNotes(appState.notes);
    });

    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (event) => {
        importNotes(event, (importedNotes) => {
            appState.notes = [...appState.notes, ...importedNotes];
            saveNotes(appState.notes);

            // Mettre à jour les catégories
            appState.allCategories.clear();
            appState.notes.forEach(note => {
                if (note.categories) {
                    note.categories.forEach(category => appState.allCategories.add(category));
                }
            });

            // Fermer le modal après importation réussie
            setTimeout(() => {
                importExportModal.style.display = 'none';
                importStatus.textContent = '';
                importFile.value = '';
            }, 3000);
        });
    });

    // Fermeture des modals avec le bouton de fermeture ou en cliquant à l'extérieur
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            cleanupHighlightedElements();
            noteModal.style.display = 'none';
            importExportModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === noteModal) {
            cleanupHighlightedElements();
            noteModal.style.display = 'none';
        }
        if (event.target === importExportModal) {
            importExportModal.style.display = 'none';
        }
    });

});