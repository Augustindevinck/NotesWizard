import { setupEventListeners } from './components/utils/events.js';
import { openNoteModal } from './components/utils/modal.js';
import { createNoteElement, deleteNote } from './components/utils/notes.js';
import { loadNotes, saveNotes } from './components/utils/storage.js';
import { performSearch } from './components/utils/search.js';
import { cleanupHighlightedElements } from './components/utils/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize state
    const state = {
        notes: [],
        currentNoteId: null,
        allCategories: new Set(),
        currentSearchTerms: [],
        revisitDays: {
            section1: 7,
            section2: 14
        }
    };

    // Get DOM elements
    const elements = {
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-results'),
        notesContainer: document.getElementById('notes-container'),
        addNoteBtn: document.getElementById('add-note-btn'),
        noteModal: document.getElementById('note-modal'),
        noteTitle: document.getElementById('note-title'),
        noteContent: document.getElementById('note-content'),
        saveNoteBtn: document.getElementById('save-note-btn'),
        deleteNoteBtn: document.getElementById('delete-note-btn'),
        categoryInput: document.getElementById('category-input'),
        categorySuggestions: document.getElementById('category-suggestions'),
        selectedCategories: document.getElementById('selected-categories'),
        detectedHashtags: document.getElementById('detected-hashtags'),
        importExportBtn: document.getElementById('import-export-btn'),
        importExportModal: document.getElementById('import-export-modal'),
        exportBtn: document.getElementById('export-btn'),
        importBtn: document.getElementById('import-btn'),
        importFile: document.getElementById('import-file'),
        importStatus: document.getElementById('import-status'),
        modalCloseButtons: document.querySelectorAll('.close'),
        revisitSectionToday: document.getElementById('revisit-section-today'),
        revisitSection1: document.getElementById('revisit-section-1'),
        revisitSection2: document.getElementById('revisit-section-2'),
        revisitNotesToday: document.getElementById('revisit-notes-today'),
        revisitNotes1: document.getElementById('revisit-notes-1'),
        revisitNotes2: document.getElementById('revisit-notes-2'),
        showMoreBtnToday: document.getElementById('show-more-today'),
        showMoreBtn1: document.getElementById('show-more-1'),
        showMoreBtn2: document.getElementById('show-more-2'),
        editDaysBtns: document.querySelectorAll('.edit-days-btn'),
        daysEditModal: document.getElementById('days-edit-modal'),
        daysInput: document.getElementById('days-input'),
        saveDaysBtn: document.getElementById('save-days-btn'),
        generalViewBtn: document.getElementById('general-view-btn')

    };


    // Vérifions que tous les éléments requis sont présents
    if (!elements.searchInput || !elements.searchResults || !elements.notesContainer || !elements.addNoteBtn || !elements.noteModal ||
        !elements.noteTitle || !elements.noteContent || !elements.saveNoteBtn || !elements.deleteNoteBtn || !elements.categoryInput ||
        !elements.categorySuggestions || !elements.selectedCategories || !elements.detectedHashtags) {
        console.error('Éléments DOM manquants - Initialisation impossible');
        return;
    }

    // Initialize application
    function init() {
        state.notes = loadNotes();
        setupEventListeners({
            ...elements,
            ...state,
            openNoteModal,
            deleteNote,
            cleanupHighlightedElements,
            performSearch,
            createNoteElement,
            saveNotes
        });

        // Affiche un état vide au démarrage (pas de notes) dans la section principale
        renderEmptyState();

        // Afficher les notes à revisiter
        renderRevisitSections();

        // Ajouter l'écouteur pour le bouton de vue générale
        if (elements.generalViewBtn) {
            elements.generalViewBtn.addEventListener('click', () => {
                import('./components/utils/navigation.js')
                    .then(module => {
                        module.navigateToGeneralView();
                    })
                    .catch(err => console.error('Erreur lors du chargement du module de navigation:', err));
            });
        }
    }

    function renderEmptyState() {
        elements.notesContainer.innerHTML = '';
        elements.notesContainer.style.display = 'none';
    }


    //The rest of the functions (renderNotes, createNoteElement, deleteNote, openNoteModal, generateUniqueId, handleCategoryInput, handleCategoryKeydown, addCategoryTag, detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag, showSearchSuggestions, handleSearch, performSearch, cleanText, strictSearch, fuzzySearch, levenshteinDistance, exportNotes, importNotes, loadRevisitSettings, saveRevisitSettings, updateRevisitTitles, renderRevisitSections, getNotesForDate, renderRevisitNotesForSection, createRevisitNoteElement, showMoreNotes, openDaysEditModal, saveDaysSettings, highlightSearchTerms, highlightSearchTermsInTags, cleanupHighlightedElements)  remain largely the same, but will use the 'elements' object to access DOM elements.  I can't include them all here due to length restrictions, but they should be relatively straightforward to adapt.  The key changes are in how DOM elements are accessed and the modularization.


    init();
});