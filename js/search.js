/**
 * Script principal pour la page de recherche avec intégration Supabase
 */

// Imports des modules
import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { createNoteElement, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, initModalFunctions } from './scripts/notes/noteModal.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { getCurrentSearchTerms, cleanText, initSearchManager } from './scripts/search/searchManager.js';
import { navigateToPage, getUrlParams } from './scripts/utils/navigation.js';
import { 
    fetchAllNotes, 
    createNote, 
    updateNote, 
    deleteNote, 
    searchNotes 
} from './scripts/utils/supabaseService.js';

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

    // Vérification des éléments essentiels uniquement
    if (!searchResultsList || !advancedSearchInput || !advancedSearchBtn) {
        console.error('Éléments essentiels à la recherche manquants - Initialisation impossible');
        return;
    }
    
    // Vérification des autres éléments et utilisation conditionnelle
    const hasSearchElements = searchInput && searchResults;
    const hasNoteModal = noteModal && noteTitle && noteContent && saveNoteBtn && deleteNoteBtn && 
                         categoryInput && categorySuggestions && selectedCategories && detectedHashtags;

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
    async function init() {
        // Afficher un message de chargement
        searchResultsList.innerHTML = '<div class="loading">Chargement des notes...</div>';
        
        try {
            // Charger les notes depuis Supabase
            appState.notes = await fetchAllNotes();
            
            // Extraire toutes les catégories des notes
            appState.notes.forEach(note => {
                if (note.categories) {
                    note.categories.forEach(category => appState.allCategories.add(category));
                }
            });
    
            // Initialisation des modules
            initCategoryManager(appState.allCategories);
            
            // Initialiser les éléments du modal seulement s'ils existent
            if (hasNoteModal) {
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
                            // Sauvegarder la note avec Supabase
                            let savedNote;
                            if (noteData.id) {
                                savedNote = await updateNote(noteData.id, noteData);
                            } else {
                                savedNote = await createNote(noteData);
                            }
                            
                            // Mettre à jour l'état de l'application
                            if (savedNote) {
                                const index = appState.notes.findIndex(n => n.id === savedNote.id);
                                if (index !== -1) {
                                    appState.notes[index] = savedNote;
                                } else {
                                    appState.notes.push(savedNote);
                                }
                                
                                // Rafraîchir les résultats de recherche si nécessaire
                                if (appState.lastQuery) {
                                    executeSearch(appState.lastQuery);
                                }
                            }
                            
                            return savedNote;
                        } catch (error) {
                            console.error('Erreur lors de la sauvegarde de la note:', error);
                            return null;
                        }
                    }
                });
            }
            
            // Initialiser les fonctions notesManager seulement si les éléments nécessaires existent
            if (hasNoteModal) {
                initNotesManager(
                    // Fonction d'ouverture du modal
                    (note, fromSearch, searchTerms) => {
                        openNoteModal(note, fromSearch, searchTerms);
                    },
                    // Fonction de mise à jour
                    () => {
                        // Rafraîchir les résultats de recherche si nécessaire
                        if (appState.lastQuery) {
                            executeSearch(appState.lastQuery);
                        }
                    }
                );
            }
    
            // Remplir le filtre de catégories
            populateCategoryFilter();
    
            // Vérifier s'il y a une requête de recherche dans l'URL
            const params = getUrlParams();
            if (params.query) {
                const query = params.query;
                
                // Remplir les deux champs de recherche si disponibles
                if (hasSearchElements) {
                    searchInput.value = query;
                }
                advancedSearchInput.value = query;
                
                // Exécuter la recherche
                executeSearch(query);
                
                console.log(`Recherche exécutée avec la requête: ${query}`);
            } else {
                console.log("Aucune requête trouvée dans l'URL");
                searchResultsList.innerHTML = '<div class="empty-search-results"><p>Entrez un terme de recherche pour commencer</p></div>';
            }
    
            // Configurer les écouteurs d'événements
            setupEventListeners();
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            searchResultsList.innerHTML = '<div class="error">Erreur lors du chargement des notes. Veuillez vérifier votre connexion.</div>';
        }
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
    async function executeSearch(query) {
        if (!query.trim()) {
            searchResultsList.innerHTML = `
                <div class="empty-search-results">
                    <p>Veuillez entrer un terme de recherche</p>
                </div>
            `;
            return;
        }
        
        // Afficher un indicateur de chargement
        searchResultsList.innerHTML = '<div class="loading">Recherche en cours...</div>';
        
        // Enregistrer la dernière requête
        appState.lastQuery = query;
        
        try {
            // Options de recherche
            const options = {
                searchInTitle: searchTitles.checked,
                searchInContent: searchContent.checked,
                searchInCategories: searchCategories.checked,
                searchInHashtags: searchTags.checked,
                filterByCategory: categoryFilter.value !== 'all' ? categoryFilter.value : null
            };
            
            // Essayer d'abord avec Supabase
            let results = [];
            try {
                // Recherche via Supabase
                results = await searchNotes(query);
                
                // Appliquer un filtrage local supplémentaire si nécessaire selon les options
                if (results && Array.isArray(results) && results.length > 0) {
                    // Filtrage par catégorie
                    if (options.filterByCategory) {
                        results = results.filter(note => 
                            note.categories && note.categories.includes(options.filterByCategory)
                        );
                    }
                    
                    // Si des options spécifiques sont désactivées, filtrer davantage
                    if (!options.searchInTitle || !options.searchInContent || 
                        !options.searchInCategories || !options.searchInHashtags) {
                        
                        const searchTerms = getCurrentSearchTerms(query);
                        results = results.filter(note => {
                            // Par défaut, aucune correspondance
                            let matchesSearchCriteria = false;
                            
                            // Vérifier le titre si l'option est activée
                            if (options.searchInTitle && note.title) {
                                const cleanTitle = cleanText(note.title);
                                for (const term of searchTerms) {
                                    if (cleanTitle.includes(cleanText(term))) {
                                        matchesSearchCriteria = true;
                                        break;
                                    }
                                }
                            }
                            
                            // Vérifier le contenu si l'option est activée
                            if (!matchesSearchCriteria && options.searchInContent && note.content) {
                                const cleanContent = cleanText(note.content);
                                for (const term of searchTerms) {
                                    if (cleanContent.includes(cleanText(term))) {
                                        matchesSearchCriteria = true;
                                        break;
                                    }
                                }
                            }
                            
                            // Vérifier les catégories si l'option est activée
                            if (!matchesSearchCriteria && options.searchInCategories && note.categories) {
                                for (const category of note.categories) {
                                    const cleanCategory = cleanText(category);
                                    for (const term of searchTerms) {
                                        if (cleanCategory.includes(cleanText(term))) {
                                            matchesSearchCriteria = true;
                                            break;
                                        }
                                    }
                                    if (matchesSearchCriteria) break;
                                }
                            }
                            
                            // Vérifier les hashtags si l'option est activée
                            if (!matchesSearchCriteria && options.searchInHashtags && note.hashtags) {
                                for (const hashtag of note.hashtags) {
                                    const cleanHashtag = cleanText(hashtag);
                                    for (const term of searchTerms) {
                                        if (cleanHashtag.includes(cleanText(term))) {
                                            matchesSearchCriteria = true;
                                            break;
                                        }
                                    }
                                    if (matchesSearchCriteria) break;
                                }
                            }
                            
                            return matchesSearchCriteria;
                        });
                    }
                }
            } catch (supabaseError) {
                console.error('Erreur lors de la recherche via Supabase:', supabaseError);
                
                // En cas d'erreur, utiliser la recherche locale
                results = advancedSearch(query, options);
            }
            
            // Si Supabase ne retourne rien ou une erreur s'est produite, utiliser la recherche locale
            if (!results || results.length === 0) {
                console.log('Pas de résultats via Supabase, utilisation de la recherche locale');
                results = advancedSearch(query, options);
            }
            
            // Afficher les résultats
            appState.searchResults = results;
            displaySearchResults(results, query);
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            searchResultsList.innerHTML = `
                <div class="error-message">
                    <p>Une erreur s'est produite lors de la recherche. Veuillez réessayer.</p>
                </div>
            `;
        }
    }

    /**
     * Effectue une recherche avancée dans les notes
     * @param {string} query - La requête de recherche
     * @param {Object} options - Options de recherche
     * @returns {Array} - Notes correspondant à la recherche
     */
    function advancedSearch(query, options) {
        // Nettoyer la requête
        const cleanedQuery = cleanText(query);
        
        // Filtrer par catégorie si nécessaire
        let filteredNotes = appState.notes;
        if (options.categoryFilter) {
            filteredNotes = filteredNotes.filter(note => 
                note.categories && note.categories.includes(options.categoryFilter)
            );
        }
        
        // Utiliser le système de recherche avancé existant avec scoring
        const searchResults = [];
        
        // Filtrer selon les options de recherche
        filteredNotes.forEach(note => {
            let shouldProcess = false;
            
            if (options.searchInTitles && note.title) {
                shouldProcess = true;
            }
            
            if (options.searchInContent && note.content) {
                shouldProcess = true;
            }
            
            if (options.searchInCategories && note.categories && note.categories.length > 0) {
                shouldProcess = true;
            }
            
            if (options.searchInTags && note.content) {
                // Les hashtags sont extraits du contenu
                shouldProcess = true;
            }
            
            if (shouldProcess) {
                // Effectuer la recherche avec le système de scoring
                const results = performSearch(query, [note]);
                if (results.length > 0) {
                    searchResults.push(...results);
                }
            }
        });
        
        // Trier par score (le scoring est déjà fait dans performSearch) et préserver les scores
        searchResults.sort((a, b) => b.score - a.score);
        
        // Transformer les résultats pour correspondre au format attendu tout en gardant le score
        const formattedResults = searchResults.map(result => {
            return { 
                ...result.note, 
                searchScore: result.score  // Conserver le score pour pouvoir le visualiser si nécessaire
            };
        });
        
        return formattedResults;
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
        
        // Préparer les termes de recherche pour la mise en évidence
        const searchTerms = query.trim().toLowerCase().split(/\s+/);
        
        // Mettre à jour les termes de recherche dans le gestionnaire de recherche
        initSearchManager(searchTerms);
        
        // Ajouter chaque résultat à la grille
        results.forEach(note => {
            // Créer l'élément de note
            const noteElement = createNoteElement(note, searchTerms);
            
            // Ajouter l'information de score si disponible (pour le débogage)
            if (note.searchScore !== undefined) {
                const scoreInfo = document.createElement('div');
                scoreInfo.className = 'search-score';
                scoreInfo.textContent = `Score: ${note.searchScore.toFixed(2)}`;
                scoreInfo.style.fontSize = '0.75rem';
                scoreInfo.style.color = '#777';
                scoreInfo.style.textAlign = 'right';
                scoreInfo.style.padding = '0.25rem';
                
                // Ajouter l'info de score au début de l'élément
                noteElement.insertBefore(scoreInfo, noteElement.firstChild);
            }
            
            // Ajouter l'élément à la grille
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
        
        // Recherche depuis la barre principale (si elle existe)
        if (hasSearchElements) {
            // Synchroniser la recherche en temps réel
            searchInput.addEventListener('input', () => {
                // Synchroniser avec le champ de recherche avancée (caché)
                advancedSearchInput.value = searchInput.value;
            });
            
            // Exécuter la recherche quand on appuie sur Entrée
            searchInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const query = searchInput.value.trim();
                    if (query) {
                        // Exécuter la recherche
                        executeSearch(query);
                    }
                }
            });
        }
        
        // Bouton de recherche principal (si les éléments existent)
        if (hasSearchElements) {
            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    const query = searchInput.value.trim();
                    if (query) {
                        // Exécuter la recherche (advancedSearchInput est déjà synchronisé)
                        executeSearch(query);
                    }
                });
            }
        }

        // Écouteurs d'événements pour les éléments de notes (seulement s'ils existent)
        if (hasNoteModal) {
            // Bouton d'ajout de note
            if (addNoteBtn) {
                addNoteBtn.addEventListener('click', () => openNoteModal());
            }
            
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
        }

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
        if (modalCloseButtons && modalCloseButtons.length > 0) {
            modalCloseButtons.forEach(button => {
                button.addEventListener('click', () => {
                    cleanupHighlightedElements();
                    if (noteModal) noteModal.style.display = 'none';
                    if (importExportModal) importExportModal.style.display = 'none';
                });
            });
        }

        window.addEventListener('click', (event) => {
            if (hasNoteModal && event.target === noteModal) {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
            }
            if (importExportModal && event.target === importExportModal) {
                importExportModal.style.display = 'none';
            }
        });

        // Import/Export désactivé pour Supabase 
        if (importExportBtn) {
            importExportBtn.style.display = 'none';
        }
        
        // Cacher le bouton d'import/export qui est désactivé avec Supabase
        const importExportHeaderBtn = document.querySelector('.header-button[title="Import/Export"]');
        if (importExportHeaderBtn) {
            importExportHeaderBtn.style.display = 'none';
        }
    }
});