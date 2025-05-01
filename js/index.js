/**
 * Script principal pour la page d'accueil
 */

// Imports des modules
import { loadNotes, saveNotes, loadRevisitSettings, saveRevisitSettings } from './scripts/utils/localStorage.js';
import { exportNotes, importNotes } from './scripts/utils/exportImport.js';
import { renderEmptyState, cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { renderNotes, createNoteElement, deleteNote, saveNote, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './scripts/notes/noteModal.js';
import { initRevisit, renderRevisitSections, showMoreNotes, openDaysEditModal, saveDaysSettings, initCreateNoteElement } from './scripts/notes/revisit.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { initSearchManager, handleSearch, showSearchSuggestions, getCurrentSearchTerms } from './scripts/search/searchManager.js';
import { navigateToPage } from './scripts/utils/navigation.js';

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    // Gestionnaire pour le bouton Vue générale
    const generalViewBtn = document.getElementById('general-view-btn');
    if (generalViewBtn) {
        generalViewBtn.addEventListener('click', () => {
            window.location.href = 'categories.html';
        });
    }
    // Récupération des éléments du DOM
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
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
            saveNote: (noteData) => saveNote(noteData, appState.notes, () => {
                renderRevisitSections(appState.notes);
            })
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, () => renderRevisitSections(appState.notes));
        
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
                    renderRevisitSections(appState.notes);
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
                // Naviguer vers la page de recherche avec la requête
                if (searchInput.value.trim()) {
                    navigateToPage('search.html', { query: searchInput.value.trim() });
                } else {
                    navigateToPage('search.html');
                }
            });
        }

        // Recherche avec la touche Entrée
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && searchInput.value.trim()) {
                event.preventDefault();
                navigateToPage('search.html', { query: searchInput.value.trim() });
            }
        });

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

        // Import/Export
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
            importNotes(event, appState.notes, (importedNotes) => {
                if (importedNotes && Array.isArray(importedNotes)) {
                    // Mettre à jour les catégories
                    appState.allCategories.clear();
                    appState.notes.forEach(note => {
                        if (note.categories) {
                            note.categories.forEach(category => appState.allCategories.add(category));
                        }
                    });
                    
                    // Actualiser l'affichage
                    renderRevisitSections(appState.notes);
                }
                
                // Fermer le modal après importation réussie
                setTimeout(() => {
                    importExportModal.style.display = 'none';
                    importStatus.textContent = '';
                    importFile.value = '';
                }, 3000);
            }, importStatus);
        });

        // Édition du nombre de jours pour les sections de révision
        editDaysBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Ouvrir la modal d'édition du nombre de jours pour la section correspondante
                openDaysEditModal(index === 0 ? 'section1' : 'section2');
            });
        });

        // Sauvegarde du nombre de jours
        saveDaysBtn.addEventListener('click', () => {
            saveDaysSettings();
            renderRevisitSections(appState.notes);
        });

        // Afficher plus de notes dans les sections de révision
        showMoreBtnToday.addEventListener('click', () => showMoreNotes('today'));
        showMoreBtn1.addEventListener('click', () => showMoreNotes('section1'));
        showMoreBtn2.addEventListener('click', () => showMoreNotes('section2'));
    }
});