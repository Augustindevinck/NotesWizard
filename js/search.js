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
import { initSearchManager, handleSearch } from './scripts/search/searchManager.js';
import { navigateToPage, getUrlParams } from './scripts/utils/navigation.js';

document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const searchInput = document.getElementById('advanced-search-input');
    const searchResults = document.getElementById('search-results');
    const searchResultsContainer = document.getElementById('search-results-container');
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

    // État de l'application
    const appState = {
        notes: loadNotes() || [],
        allCategories: new Set()
    };

    // Initialisation de la recherche
    initSearchManager();

    // Configuration des événements de recherche
    function performSearch(query) {
        const results = handleSearch(
            query,
            appState.notes,
            searchResults,
            searchResultsContainer,
            document.querySelector('.revisit-sections')
        );

        if (Array.isArray(results) && results.length > 0) {
            displaySearchResults(results);
        }
    }

    // Affichage des résultats de recherche
    function displaySearchResults(results) {
        const searchResultsContainer = document.getElementById('search-results-list');
        if (!searchResultsContainer || !Array.isArray(results)) return;

        searchResultsContainer.innerHTML = '';
        results.forEach(note => {
            const noteElement = createNoteElement(note);
            searchResultsContainer.appendChild(noteElement);
        });
    }

    // Initialisation des gestionnaires d'événements
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch(searchInput.value);
            }
        });
    }

    const searchBtn = document.getElementById('advanced-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
    }

    // Vérifier s'il y a une requête dans l'URL
    const params = getUrlParams();
    if (params.query && searchInput) {
        searchInput.value = params.query;
        performSearch(params.query);
    }

    // Configuration des autres événements
    if (categoryInput) {
        categoryInput.addEventListener('input', (event) => {
            handleCategoryInput(event, categoryInput, categorySuggestions);
        });

        categoryInput.addEventListener('keydown', (event) => {
            handleCategoryKeydown(event, categoryInput, selectedCategories, categorySuggestions);
        });
    }

    if (noteContent) {
        noteContent.addEventListener('input', () => {
            detectHashtags(noteContent.value, detectedHashtags);
        });
    }

    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => openNoteModal());
    }

    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(appState.notes);
        });
    }

    if (deleteNoteBtn) {
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
    }

    // Configuration des modales
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportModal = document.getElementById('import-export-modal');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const importStatus = document.getElementById('import-status');
    const modalCloseButtons = document.querySelectorAll('.close');

    if (importExportBtn) {
        importExportBtn.addEventListener('click', () => {
            importExportModal.style.display = 'flex';
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportNotes(appState.notes);
        });
    }

    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });

        importFile.addEventListener('change', (event) => {
            importNotes(event, (importedNotes) => {
                appState.notes = [...appState.notes, ...importedNotes];
                saveNotes(appState.notes);

                if (importExportModal && importStatus) {
                    setTimeout(() => {
                        importExportModal.style.display = 'none';
                        importStatus.textContent = '';
                        importFile.value = '';
                    }, 3000);
                }
            });
        });
    }

    // Gestion de la fermeture des modales
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (noteModal) {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
            }
            if (importExportModal) {
                importExportModal.style.display = 'none';
            }
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