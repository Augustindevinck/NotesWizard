/**
 * Script principal pour la page d'accueil avec support Supabase
 */

// Imports des modules
import { exportNotes, importNotes } from './scripts/utils/supabaseExportImport.js';
import { renderEmptyState, cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { renderNotes, createNoteElement, deleteNote, saveNote, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './scripts/notes/noteModal.js';
import { initRevisit, renderRevisitSections, showMoreNotes, openDaysEditModal, saveDaysSettings, initCreateNoteElement } from './scripts/notes/revisit.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { initSupabaseSearchManager, performSearch, getCurrentSearchTerms, setCurrentSearchTerms } from './scripts/search/supabaseSearch.js';
import { navigateToPage } from './scripts/utils/navigation.js';
import { loadNotes, saveNotes, loadRevisitSettings, saveRevisitSettings, syncNotes, deleteNote as deleteSupabaseNote } from './scripts/utils/supabaseStorage.js';
import { initSupabaseFromConfig, showSupabaseConfigModal } from './scripts/utils/supabaseConfig.js';

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', async () => {
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
    await init();

    /**
     * Initialise l'application
     */
    async function init() {
        // Afficher un indicateur de chargement
        notesContainer.innerHTML = '<div class="loading">Chargement des notes...</div>';
        
        // Initialiser Supabase à partir de la configuration
        const supabaseInitialized = initSupabaseFromConfig();
        
        // Créer le bouton de configuration Supabase s'il n'existe pas déjà
        createSupabaseConfigButton();
        
        // Charger les notes depuis Supabase ou localStorage
        try {
            appState.notes = await loadNotes();
            
            // Si Supabase est initialisé, synchroniser les notes
            if (supabaseInitialized) {
                await syncNotes();
                
                // Recharger les notes après synchronisation
                appState.notes = await loadNotes();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des notes:', error);
            appState.notes = [];
        }
        
        // Extraire toutes les catégories des notes
        appState.notes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(category => appState.allCategories.add(category));
            }
        });

        // Charger les paramètres de révision
        let revisitSettings;
        try {
            revisitSettings = await loadRevisitSettings();
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres de révision:', error);
            revisitSettings = { section1: 7, section2: 14 };
        }

        // Initialisation des modules
        initCategoryManager(appState.allCategories);
        initSupabaseSearchManager();
        
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
            saveNote: async (noteData) => {
                try {
                    const savedNote = await saveNote(noteData, appState.notes);
                    await renderRevisitSections(appState.notes);
                    return savedNote;
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde de la note:', error);
                    return null;
                }
            }
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, async () => await renderRevisitSections(appState.notes));
        
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

        // Afficher un état vide (pas de notes)
        if (appState.notes.length === 0) {
            renderEmptyState(notesContainer);
        }

        // Afficher les notes à revisiter
        await renderRevisitSections(appState.notes);

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }

    /**
     * Crée le bouton de configuration Supabase s'il n'existe pas
     */
    function createSupabaseConfigButton() {
        let supabaseConfigBtn = document.getElementById('supabase-config-btn');
        
        if (!supabaseConfigBtn) {
            const headerActions = document.querySelector('.header-actions');
            
            if (headerActions) {
                supabaseConfigBtn = document.createElement('button');
                supabaseConfigBtn.id = 'supabase-config-btn';
                supabaseConfigBtn.className = 'icon-button';
                supabaseConfigBtn.title = 'Configurer Supabase';
                supabaseConfigBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                `;
                
                headerActions.insertBefore(supabaseConfigBtn, headerActions.firstChild);
                
                // Ajouter un gestionnaire d'événement pour ce bouton
                supabaseConfigBtn.addEventListener('click', async () => {
                    // Afficher le modal de configuration Supabase
                    showSupabaseConfigModal(async () => {
                        // Après sauvegarde, recharger les notes
                        try {
                            await syncNotes();
                            appState.notes = await loadNotes();
                            
                            // Actualiser l'affichage
                            await renderRevisitSections(appState.notes);
                        } catch (error) {
                            console.error('Erreur lors de la synchronisation des notes:', error);
                        }
                    });
                });
            }
        }
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', async () => {
            await saveCurrentNote(appState.notes, async () => {
                await renderRevisitSections(appState.notes);
            });
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', async () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
                if (currentNoteId) {
                    try {
                        await deleteSupabaseNote(currentNoteId);
                        
                        // Supprimer également de l'état local
                        const noteIndex = appState.notes.findIndex(note => note.id === currentNoteId);
                        if (noteIndex !== -1) {
                            appState.notes.splice(noteIndex, 1);
                        }
                        
                        cleanupHighlightedElements();
                        noteModal.style.display = 'none';
                        
                        if (appState.notes.length === 0) {
                            renderEmptyState(notesContainer);
                        }
                        
                        await renderRevisitSections(appState.notes);
                    } catch (error) {
                        console.error('Erreur lors de la suppression de la note:', error);
                        alert('Erreur lors de la suppression de la note. Veuillez réessayer.');
                    }
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
        searchInput.addEventListener('input', async () => {
            try {
                const query = searchInput.value;
                
                // Si la requête est vide, masquer les suggestions
                if (!query.trim()) {
                    searchResults.innerHTML = '';
                    searchResults.style.display = 'none';
                    return;
                }
                
                // Effectuer la recherche
                const results = await performSearch(query, appState.notes);
                
                // Mettre à jour les termes de recherche actuels
                setCurrentSearchTerms(query.trim().toLowerCase().split(/\s+/));
                
                // Limiter à 5 suggestions
                const topResults = results.slice(0, 5);
                
                // Afficher les suggestions
                if (topResults.length > 0) {
                    searchResults.innerHTML = '';
                    
                    topResults.forEach(result => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'search-suggestion';
                        
                        // Extraire le titre
                        const title = result.note.title || 'Sans titre';
                        
                        // Ajouter uniquement le titre (sans contenu)
                        suggestionItem.innerHTML = `
                            <div class="suggestion-title">${title}</div>
                        `;
                        
                        // Ajouter l'écouteur d'événement pour le clic
                        suggestionItem.addEventListener('click', () => {
                            openNoteModal(result.note, true, getCurrentSearchTerms());
                            searchInput.value = '';
                            searchResults.innerHTML = '';
                            searchResults.style.display = 'none';
                        });
                        
                        searchResults.appendChild(suggestionItem);
                    });
                    
                    searchResults.style.display = 'block';
                } else {
                    searchResults.innerHTML = '<div class="no-results">Aucun résultat</div>';
                    searchResults.style.display = 'block';
                }
            } catch (error) {
                console.error('Erreur lors de la recherche:', error);
                searchResults.innerHTML = '<div class="error">Erreur lors de la recherche</div>';
                searchResults.style.display = 'block';
            }
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

        exportBtn.addEventListener('click', async () => {
            try {
                await exportNotes(appState.notes, importStatus);
            } catch (error) {
                console.error('Erreur lors de l\'exportation des notes:', error);
                importStatus.textContent = 'Erreur lors de l\'exportation';
                importStatus.className = 'status-error';
            }
        });

        importBtn.addEventListener('click', () => {
            importFile.click();
        });

        importFile.addEventListener('change', async (event) => {
            try {
                await importNotes(event, appState.notes, async () => {
                    // Recharger les notes après importation
                    appState.notes = await loadNotes();
                    
                    // Mettre à jour les catégories
                    appState.allCategories.clear();
                    appState.notes.forEach(note => {
                        if (note.categories) {
                            note.categories.forEach(category => appState.allCategories.add(category));
                        }
                    });
                    
                    // Actualiser l'affichage
                    await renderRevisitSections(appState.notes);
                    
                    // Fermer le modal après importation réussie
                    setTimeout(() => {
                        importExportModal.style.display = 'none';
                        importStatus.textContent = '';
                        importFile.value = '';
                    }, 3000);
                }, importStatus);
            } catch (error) {
                console.error('Erreur lors de l\'importation des notes:', error);
                importStatus.textContent = 'Erreur lors de l\'importation';
                importStatus.className = 'status-error';
            }
        });

        // Édition du nombre de jours pour les sections de révision
        editDaysBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Ouvrir la modal d'édition du nombre de jours pour la section correspondante
                openDaysEditModal(index === 0 ? 'section1' : 'section2');
            });
        });

        // Sauvegarde du nombre de jours
        saveDaysBtn.addEventListener('click', async () => {
            await saveDaysSettings(appState.notes);
            await renderRevisitSections(appState.notes);
        });

        // Afficher plus de notes dans les sections de révision
        showMoreBtnToday.addEventListener('click', () => showMoreNotes('today'));
        showMoreBtn1.addEventListener('click', () => showMoreNotes('section1'));
        showMoreBtn2.addEventListener('click', () => showMoreNotes('section2'));
    }
});