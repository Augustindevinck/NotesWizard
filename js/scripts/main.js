/**
 * Point d'entrée principal de l'application
 * Initialise l'application et coordonne les différents modules
 */

// Imports des modules
import { loadNotes, saveNotes, loadRevisitSettings, saveRevisitSettings } from './utils/localStorage.js';
import { exportNotes, importNotes } from './utils/exportImport.js';
import { renderEmptyState, cleanupHighlightedElements } from './utils/domHelpers.js';
import { renderNotes, createNoteElement, deleteNote, saveNote, initNotesManager } from './notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './notes/noteModal.js';
import { initRevisit, renderRevisitSections, showMoreNotes, openDaysEditModal, saveDaysSettings, initCreateNoteElement } from './notes/revisit.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './categories/hashtagManager.js';
import { initSearchManager, handleSearch, showSearchSuggestions, getCurrentSearchTerms } from './search/searchManager.js';
import { renderCategoryTree } from '../categoryTree.js';

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const notesContainer = document.getElementById('notes-container');
    const addNoteBtn = document.getElementById('add-note-btn');
    const noteModal = document.getElementById('note-modal');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const categoryInput = document.getElementById('category-input');
    const categorySuggestions = document.getElementById('category-suggestions');
    const selectedCategories = document.getElementById('selected-categories');
    const detectedHashtags = document.getElementById('detected-hashtags');
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportModal = document.getElementById('import-export-modal');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const importStatus = document.getElementById('import-status');
    const modalCloseButtons = document.querySelectorAll('.close');
    const viewMode = document.getElementById('note-view-mode');
    const editMode = document.getElementById('note-edit-mode');
    const viewTitle = document.getElementById('note-view-title');
    const viewContent = document.getElementById('note-view-content');
    const editButton = document.getElementById('edit-note-btn');

    // Éléments pour les sections de révision
    const revisitSectionToday = document.getElementById('revisit-section-today');
    const revisitSection1 = document.getElementById('revisit-section-1');
    const revisitSection2 = document.getElementById('revisit-section-2');
    const revisitNotesToday = document.getElementById('revisit-notes-today');
    const revisitNotes1 = document.getElementById('revisit-notes-1');
    const revisitNotes2 = document.getElementById('revisit-notes-2');
    const showMoreBtnToday = document.getElementById('show-more-today');
    const showMoreBtn1 = document.getElementById('show-more-1');
    const showMoreBtn2 = document.getElementById('show-more-2');
    const editDaysBtns = document.querySelectorAll('.edit-days-btn');
    const daysEditModal = document.getElementById('days-edit-modal');
    const daysInput = document.getElementById('days-input');
    const saveDaysBtn = document.getElementById('save-days-btn');
    const revisitSections = document.querySelector('.revisit-sections');

    // Vérification que tous les éléments requis sont présents
    if (!searchInput || !searchResults || !notesContainer || !addNoteBtn || !noteModal ||
        !noteTitle || !noteContent || !saveNoteBtn || !deleteNoteBtn || !categoryInput ||
        !categorySuggestions || !selectedCategories || !detectedHashtags) {
        console.error('Éléments DOM manquants - Initialisation impossible');
        return;
    }

    // État de l'application
    const appState = {
        notes: [],
        allCategories: new Set()
    };

    // Initialisation de l'application
    init();

    /**
     * Initialise l'application
     */
    function init() {
        // Charger les notes depuis localStorage
        appState.notes = loadNotes();
        
        // Extraire toutes les catégories des notes
        appState.notes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(category => appState.allCategories.add(category));
            }
        });

        // Charger les paramètres de révision
        const revisitSettings = loadRevisitSettings();

        // Initialisation des modules
        initCategoryManager(appState.allCategories);
        initSearchManager();
        
        // Initialiser les éléments du modal
        initNoteModal({
            noteModal,
            noteTitle,
            noteContent,
            selectedCategories,
            detectedHashtags,
            deleteNoteBtn,
            viewMode,
            editMode,
            viewTitle,
            viewContent,
            editButton,
            saveNoteBtn
        });
        
        // Injecter les fonctions nécessaires au noteModal
        initModalFunctions({
            extractHashtags: extractHashtags,
            extractYoutubeUrls: extractYoutubeUrls,
            addCategoryTag: addCategoryTag,
            addHashtagTag: addHashtagTag,
            saveNote: saveNote
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, renderRevisitSections);
        
        // Initialiser les révisitations
        initRevisit({
            containers: {
                today: revisitNotesToday,
                section1: revisitNotes1,
                section2: revisitNotes2
            },
            showMoreBtns: {
                today: showMoreBtnToday,
                section1: showMoreBtn1,
                section2: showMoreBtn2
            }
        }, revisitSettings);
        
        // Injecter la fonction createNoteElement dans le module revisit
        initCreateNoteElement(createNoteElement);

        // Ajouter l'écouteur pour le bouton de vue générale
        const generalViewBtn = document.getElementById('general-view-btn');
        if (generalViewBtn) {
            generalViewBtn.addEventListener('click', () => {
                // Masquer les sections de révision
                revisitSections.style.display = 'none';
                notesContainer.style.display = 'block';
                
                // Afficher l'arborescence des catégories
                renderCategoryTree(
                    notesContainer, 
                    appState.notes, 
                    createNoteElement, 
                    (notes) => saveNotes(notes)
                );
            });
        }

        // Affiche un état vide au démarrage (pas de notes) dans la section principale
        renderEmptyState(notesContainer);

        // Afficher les notes à revisiter
        renderRevisitSections(appState.notes);

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(appState.notes, () => {
                renderRevisitSections(appState.notes);
            });
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
                if (currentNoteId) {
                    deleteNote(currentNoteId, appState.notes, () => renderEmptyState(notesContainer));
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                }
            }
        });

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

        // Suggestions de recherche en temps réel
        searchInput.addEventListener('input', () => {
            showSearchSuggestions(
                searchInput.value, 
                appState.notes, 
                searchResults, 
                (note) => {
                    openNoteModal(note, true, getCurrentSearchTerms());
                    searchInput.value = '';
                }
            );
        });

        // Bouton de recherche
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const results = handleSearch(
                    searchInput.value,
                    appState.notes,
                    searchResults,
                    notesContainer,
                    revisitSections
                );
                
                if (results && results.length > 0) {
                    renderNotes(notesContainer, appState.notes, results, getCurrentSearchTerms());
                }
            });
        }

        // Recherche avec la touche Entrée
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const results = handleSearch(
                    searchInput.value,
                    appState.notes,
                    searchResults,
                    notesContainer,
                    revisitSections
                );
                
                if (results && results.length > 0) {
                    renderNotes(notesContainer, appState.notes, results, getCurrentSearchTerms());
                }
            }
        });

        // Bouton d'accueil
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                // Afficher les sections de révision
                revisitSections.style.display = 'flex';
                
                // Vider et masquer le conteneur principal
                renderEmptyState(notesContainer);
                
                // Vider la recherche
                searchInput.value = '';
            });
        }

        // Fermeture des modals avec le bouton de fermeture ou en cliquant à l'extérieur
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
                importExportModal.style.display = 'none';
                daysEditModal.style.display = 'none';
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
            if (event.target === daysEditModal) {
                daysEditModal.style.display = 'none';
            }
        });

        // Fonctionnalités d'import/export
        importExportBtn.addEventListener('click', () => {
            importExportModal.style.display = 'block';
        });

        exportBtn.addEventListener('click', () => {
            exportNotes(appState.notes, importStatus);
        });
        
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (event) => {
            importNotes(
                event, 
                appState.notes, 
                () => {
                    renderRevisitSections(appState.notes);
                }, 
                importStatus
            );
        });

        // Fonctions pour les sections de révision
        editDaysBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const section = `section${index + 1}`;
                openDaysEditModal(section);
            });
        });

        // Écouteurs pour les boutons "Voir plus"
        if (showMoreBtnToday) {
            showMoreBtnToday.addEventListener('click', () => {
                console.log("Clic sur Voir plus (today)");
                const noteIds = JSON.parse(revisitNotesToday.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('today', notesToShow);
            });
        }
        
        if (showMoreBtn1) {
            showMoreBtn1.addEventListener('click', () => {
                const noteIds = JSON.parse(revisitNotes1.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('section1', notesToShow);
            });
        }
        
        if (showMoreBtn2) {
            showMoreBtn2.addEventListener('click', () => {
                const noteIds = JSON.parse(revisitNotes2.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('section2', notesToShow);
            });
        }

        if (saveDaysBtn) {
            saveDaysBtn.addEventListener('click', () => {
                saveDaysSettings(appState.notes);
            });
        }
    }
});