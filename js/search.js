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
import { initSearchManager, performSearch, getCurrentSearchTerms } from './scripts/search/searchManager.js';
import { levenshteinDistance } from './scripts/search/searchUtils.js';
import { navigateToPage, getUrlParams } from './scripts/utils/navigation.js';

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Éléments spécifiques à la recherche
    const advancedSearchInput = document.getElementById('advanced-search-input');
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    const searchTitles = document.getElementById('search-titles');
    const searchContent = document.getElementById('search-content');
    const searchCategories = document.getElementById('search-categories');
    const searchTags = document.getElementById('search-tags');
    const categoryFilter = document.getElementById('category-filter');
    const searchResultsList = document.getElementById('search-results-list');
    const searchResultsTitle = document.getElementById('search-results-title');

    // Vérification que tous les éléments requis sont présents
    if (!searchInput || !searchResults || !addNoteBtn || !noteModal ||
        !noteTitle || !noteContent || !saveNoteBtn || !deleteNoteBtn || !categoryInput ||
        !categorySuggestions || !selectedCategories || !detectedHashtags ||
        !advancedSearchInput || !advancedSearchBtn || !searchResultsList) {
        console.error('Éléments DOM manquants - Initialisation impossible');
        return;
    }

    // État de l'application
    const appState = {
        notes: [],
        allCategories: new Set(),
        searchResults: [],
        lastQuery: ''
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
                // Rafraîchir les résultats de recherche si nécessaire
                if (appState.lastQuery) {
                    executeSearch(appState.lastQuery);
                }
            })
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, () => {
            // Rafraîchir les résultats de recherche si nécessaire
            if (appState.lastQuery) {
                executeSearch(appState.lastQuery);
            }
        });

        // Remplir le filtre de catégories
        populateCategoryFilter();

        // Vérifier s'il y a une requête de recherche dans l'URL
        const params = getUrlParams();
        if (params.query) {
            advancedSearchInput.value = params.query;
            executeSearch(params.query);
        }

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }

    /**
     * Remplit le filtre de catégories avec les catégories disponibles
     */
    function populateCategoryFilter() {
        // Vider le select sauf la première option
        while (categoryFilter.options.length > 1) {
            categoryFilter.remove(1);
        }
        
        // Ajouter chaque catégorie comme option
        const sortedCategories = Array.from(appState.allCategories).sort();
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    /**
     * Exécute une recherche et affiche les résultats
     * @param {string} query - La requête de recherche
     */
    function executeSearch(query) {
        if (!query.trim()) {
            searchResultsList.innerHTML = `
                <div class="empty-search-results">
                    <p>Veuillez entrer un terme de recherche</p>
                </div>
            `;
            return;
        }
        
        // Enregistrer la dernière requête
        appState.lastQuery = query;
        
        // Options de recherche
        const options = {
            searchInTitles: searchTitles.checked,
            searchInContent: searchContent.checked,
            searchInCategories: searchCategories.checked,
            searchInTags: searchTags.checked,
            categoryFilter: categoryFilter.value
        };
        
        // Effectuer la recherche
        const results = advancedSearch(query, options);
        appState.searchResults = results;
        
        // Afficher les résultats
        displaySearchResults(results, query);
    }

    /**
     * Effectue une recherche avancée dans les notes
     * @param {string} query - La requête de recherche
     * @param {Object} options - Options de recherche
     * @returns {Array} - Notes correspondant à la recherche
     */
    function advancedSearch(query, options) {
        // Nettoyer la requête
        const cleanedQuery = query.trim().toLowerCase();
        
        // Filtrer par catégorie si nécessaire
        let filteredNotes = appState.notes;
        if (options.categoryFilter) {
            filteredNotes = filteredNotes.filter(note => 
                note.categories && note.categories.includes(options.categoryFilter)
            );
        }
        
        // Recherche directe (correspondance exacte)
        let results = filteredNotes.filter(note => {
            if (options.searchInTitles && note.title && note.title.toLowerCase().includes(cleanedQuery)) {
                return true;
            }
            
            if (options.searchInContent && note.content && note.content.toLowerCase().includes(cleanedQuery)) {
                return true;
            }
            
            if (options.searchInCategories && note.categories) {
                for (const category of note.categories) {
                    if (category.toLowerCase().includes(cleanedQuery)) {
                        return true;
                    }
                }
            }
            
            if (options.searchInTags) {
                const hashtags = extractHashtags(note.content || '');
                for (const tag of hashtags) {
                    if (tag.toLowerCase().includes(cleanedQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
        
        // Si pas assez de résultats, essayer une recherche floue
        if (results.length < 5) {
            // Ensemble des notes déjà trouvées
            const foundNoteIds = new Set(results.map(note => note.id));
            
            // Recherche floue
            const fuzzyResults = filteredNotes
                .filter(note => !foundNoteIds.has(note.id)) // Exclure les notes déjà trouvées
                .filter(note => {
                    // Distance de Levenshtein maximale acceptable (proportionnelle à la longueur de la requête)
                    const maxDistance = Math.max(Math.floor(cleanedQuery.length * 0.3), 2);
                    
                    if (options.searchInTitles && note.title) {
                        const words = note.title.toLowerCase().split(/\s+/);
                        for (const word of words) {
                            if (levenshteinDistance(word, cleanedQuery) <= maxDistance) {
                                return true;
                            }
                        }
                    }
                    
                    if (options.searchInContent && note.content) {
                        const words = note.content.toLowerCase().split(/\s+/);
                        for (const word of words) {
                            if (levenshteinDistance(word, cleanedQuery) <= maxDistance) {
                                return true;
                            }
                        }
                    }
                    
                    if (options.searchInCategories && note.categories) {
                        for (const category of note.categories) {
                            const parts = category.toLowerCase().split('/');
                            for (const part of parts) {
                                if (levenshteinDistance(part, cleanedQuery) <= maxDistance) {
                                    return true;
                                }
                            }
                        }
                    }
                    
                    if (options.searchInTags) {
                        const hashtags = extractHashtags(note.content || '');
                        for (const tag of hashtags) {
                            if (levenshteinDistance(tag.toLowerCase(), cleanedQuery) <= maxDistance) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                });
            
            // Ajouter les résultats flous aux résultats directs
            results = [...results, ...fuzzyResults];
        }
        
        return results;
    }

    /**
     * Affiche les résultats de recherche
     * @param {Array} results - Les résultats de recherche
     * @param {string} query - La requête de recherche
     */
    function displaySearchResults(results, query) {
        // Mettre à jour le titre
        searchResultsTitle.textContent = `Résultats pour "${query}" (${results.length})`;
        
        // Vider le conteneur
        searchResultsList.innerHTML = '';
        
        if (results.length === 0) {
            // Aucun résultat
            searchResultsList.innerHTML = `
                <div class="empty-search-results">
                    <p>Aucun résultat trouvé pour "${query}"</p>
                </div>
            `;
            return;
        }
        
        // Créer une grille pour les résultats
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'notes-grid';
        
        // Ajouter chaque résultat à la grille
        results.forEach(note => {
            const noteElement = createNoteElement(note, query.split(/\s+/));
            resultsGrid.appendChild(noteElement);
        });
        
        // Ajouter la grille au conteneur
        searchResultsList.appendChild(resultsGrid);
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'accueil
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                navigateToPage('index.html');
            });
        }
        
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(appState.notes, () => {
                // Rafraîchir les résultats de recherche si nécessaire
                if (appState.lastQuery) {
                    executeSearch(appState.lastQuery);
                }
            });
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
                if (currentNoteId) {
                    deleteNote(currentNoteId, appState.notes, () => {});
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                    
                    // Rafraîchir les résultats de recherche
                    if (appState.lastQuery) {
                        executeSearch(appState.lastQuery);
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

        // Bouton de recherche avancée
        advancedSearchBtn.addEventListener('click', () => {
            executeSearch(advancedSearchInput.value);
        });
        
        // Recherche avancée avec la touche Entrée
        advancedSearchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                executeSearch(advancedSearchInput.value);
            }
        });
        
        // Filtres de recherche
        [searchTitles, searchContent, searchCategories, searchTags, categoryFilter].forEach(filter => {
            filter.addEventListener('change', () => {
                if (appState.lastQuery) {
                    executeSearch(appState.lastQuery);
                }
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
            importNotes(event, (importedNotes) => {
                // Fusionner les notes importées avec les existantes
                appState.notes = [...appState.notes, ...importedNotes];
                saveNotes(appState.notes);
                
                // Mettre à jour les catégories
                appState.allCategories.clear();
                appState.notes.forEach(note => {
                    if (note.categories) {
                        note.categories.forEach(category => appState.allCategories.add(category));
                    }
                });
                
                // Rafraîchir les résultats de recherche
                populateCategoryFilter();
                if (appState.lastQuery) {
                    executeSearch(appState.lastQuery);
                }
                
                // Fermer le modal après importation réussie
                setTimeout(() => {
                    importExportModal.style.display = 'none';
                    importStatus.textContent = '';
                    importFile.value = '';
                }, 3000);
            });
        });
    }
});