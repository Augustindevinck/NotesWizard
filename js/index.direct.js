/**
 * Script principal pour la page d'accueil avec synchronisation automatique Supabase
 */

// Imports des modules
import { renderEmptyState, cleanupHighlightedElements, generateUniqueId } from './scripts/utils/domHelpers.js';
import { createNoteElement, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, initModalFunctions } from './scripts/notes/noteModal.js';
import { initRevisit, renderRevisitSections, showMoreNotes, openDaysEditModal, saveDaysSettings, initCreateNoteElement } from './scripts/notes/revisit.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { cleanText } from './scripts/search/searchManager.js';
import { navigateToPage } from './scripts/utils/navigation.js';
import { 
    fetchAllNotes, 
    createNote, 
    updateNote, 
    deleteNote, 
    searchNotes, 
    syncWithSupabase, 
    loadRevisitSettings, 
    saveRevisitSettings 
} from './scripts/utils/supabaseService.js';
import { showSupabaseConfigForm, loadSupabaseFromLocalStorage, isSupabaseConfigured } from './scripts/utils/supabaseDirectConfig.js';
import { initializeTables } from './scripts/utils/supabaseClient.js';

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
    const supabaseConfigBtn = document.getElementById('supabase-config-btn');
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
        allCategories: new Set(),
        currentSearchTerms: [],
        currentNote: null
    };
    
    // Exposer l'état de l'application pour les autres modules
    window.appState = appState;

    // Initialisation de l'application
    await init();

    /**
     * Initialise l'application
     */
    async function init() {
        // Afficher un indicateur de chargement
        notesContainer.innerHTML = '<div class="loading">Chargement des notes...</div>';
        
        // Charger les notes depuis Supabase
        try {
            // Vérifier si Supabase est configuré
            const client = loadSupabaseFromLocalStorage();
            
            if (!client) {
                // Si Supabase n'est pas configuré, afficher le formulaire de configuration
                showSupabaseConfigForm(async () => {
                    // Une fois configuré, initialiser les tables dans Supabase
                    await initializeTables();
                    
                    // Puis charger les notes
                    appState.notes = await fetchAllNotes();
                    
                    // Mise à jour de l'affichage
                    initializeUI();
                });
            } else {
                // Si Supabase est configuré, initialiser les tables si nécessaire
                if (isSupabaseConfigured()) {
                    try {
                        await initializeTables();
                        console.log('Tables Supabase initialisées');
                    } catch (initError) {
                        console.error('Erreur lors de l\'initialisation des tables:', initError);
                    }
                }
                
                // Charger les notes
                appState.notes = await fetchAllNotes();
                
                // Initialiser l'interface
                initializeUI();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des notes:', error);
            notesContainer.innerHTML = '<div class="error">Erreur lors du chargement des notes. Veuillez vérifier votre connexion.</div>';
        }
    }
    
    /**
     * Initialise l'interface utilisateur après le chargement des données
     */
    async function initializeUI() {
        // Extraire toutes les catégories des notes
        appState.allCategories.clear();
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
                    let savedNote;
                    
                    if (noteData.id) {
                        // Mise à jour d'une note existante
                        savedNote = await updateNote(noteData.id, noteData);
                    } else {
                        // Création d'une nouvelle note
                        savedNote = await createNote(noteData);
                    }
                    
                    // Mettre à jour la liste des notes
                    if (savedNote) {
                        // Trouver l'index de la note si elle existe déjà
                        const noteIndex = appState.notes.findIndex(note => note.id === savedNote.id);
                        
                        if (noteIndex !== -1) {
                            // Mettre à jour la note existante
                            appState.notes[noteIndex] = savedNote;
                        } else {
                            // Ajouter la nouvelle note
                            appState.notes.push(savedNote);
                        }
                        
                        // Mettre à jour les catégories
                        if (savedNote.categories) {
                            savedNote.categories.forEach(category => appState.allCategories.add(category));
                        }
                        
                        // Actualiser l'affichage
                        await renderRevisitSections(appState.notes);
                    }
                    
                    return savedNote;
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde de la note:', error);
                    alert('Erreur lors de la sauvegarde de la note. Veuillez vérifier votre connexion.');
                    return null;
                }
            }
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(
            // Fonction d'ouverture du modal
            (note, fromSearch, searchTerms) => {
                appState.currentNote = note;
                appState.currentSearchTerms = searchTerms || [];
                openNoteModal(note, fromSearch, searchTerms);
            },
            // Fonction de rendu des sections de révision
            async () => await renderRevisitSections(appState.notes)
        );
        
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

        // Afficher un état vide (pas de notes) ou les notes
        if (appState.notes.length === 0) {
            renderEmptyState(notesContainer);
        }

        // Afficher les notes à revisiter
        await renderRevisitSections(appState.notes);

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }
    
    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de configuration Supabase
        if (supabaseConfigBtn) {
            supabaseConfigBtn.addEventListener('click', () => {
                showSupabaseConfigForm(async () => {
                    // Initialiser les tables dans Supabase
                    try {
                        await initializeTables();
                        console.log('Tables Supabase initialisées');
                    } catch (initError) {
                        console.error('Erreur lors de l\'initialisation des tables:', initError);
                    }
                    
                    // Recharger les notes après la configuration
                    appState.notes = await fetchAllNotes();
                    
                    // Actualiser l'affichage
                    await renderRevisitSections(appState.notes);
                });
            });
        }

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', async () => {
            // Récupérer les données du formulaire
            const id = appState.currentNote ? appState.currentNote.id : null;
            const title = noteTitle.value.trim();
            const content = noteContent.value.trim();
            
            // Récupérer les catégories sélectionnées
            const categoriesElements = selectedCategories.querySelectorAll('.category-tag');
            const categories = Array.from(categoriesElements).map(el => el.textContent.trim());
            
            // Récupérer les hashtags détectés
            const hashtagsElements = detectedHashtags.querySelectorAll('.hashtag-tag');
            const hashtags = Array.from(hashtagsElements).map(el => el.textContent.trim().substring(1)); // Enlever le # au début
            
            // Extraire les URLs YouTube
            const videoUrls = extractYoutubeUrls(content);
            
            // Créer l'objet de note
            const noteData = {
                id,
                title,
                content,
                categories,
                hashtags,
                videoUrls
            };
            
            try {
                let savedNote;
                
                if (id) {
                    // Mise à jour d'une note existante
                    savedNote = await updateNote(id, noteData);
                } else {
                    // Création d'une nouvelle note
                    savedNote = await createNote(noteData);
                }
                
                if (savedNote) {
                    // Mettre à jour la liste des notes
                    const noteIndex = appState.notes.findIndex(note => note.id === savedNote.id);
                    
                    if (noteIndex !== -1) {
                        appState.notes[noteIndex] = savedNote;
                    } else {
                        appState.notes.push(savedNote);
                    }
                    
                    // Mettre à jour les catégories
                    if (savedNote.categories) {
                        savedNote.categories.forEach(category => appState.allCategories.add(category));
                    }
                    
                    // Fermer le modal
                    noteModal.style.display = 'none';
                    
                    // Actualiser l'affichage
                    await renderRevisitSections(appState.notes);
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde de la note:', error);
                alert('Erreur lors de la sauvegarde de la note. Veuillez vérifier votre connexion.');
            }
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', async () => {
            if (!appState.currentNote) return;
            
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                try {
                    const success = await deleteNote(appState.currentNote.id);
                    
                    if (success) {
                        // Supprimer la note de la liste des notes
                        appState.notes = appState.notes.filter(note => note.id !== appState.currentNote.id);
                        
                        // Fermer le modal
                        noteModal.style.display = 'none';
                        
                        // Actualiser l'affichage
                        if (appState.notes.length === 0) {
                            renderEmptyState(notesContainer);
                        }
                        
                        await renderRevisitSections(appState.notes);
                    }
                } catch (error) {
                    console.error('Erreur lors de la suppression de la note:', error);
                    alert('Erreur lors de la suppression de la note. Veuillez vérifier votre connexion.');
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
                let searchResults;
                
                // Essayer d'abord la recherche via Supabase
                const supabaseResults = await searchNotes(query);
                
                if (supabaseResults) {
                    searchResults = supabaseResults;
                } else {
                    // Recherche locale (fallback)
                    const cleanedQuery = cleanText(query);
                    
                    searchResults = appState.notes.filter(note => {
                        const cleanTitle = cleanText(note.title || '');
                        const cleanContent = cleanText(note.content || '');
                        
                        return cleanTitle.includes(cleanedQuery) || cleanContent.includes(cleanedQuery);
                    });
                }
                
                // Mettre à jour les termes de recherche actuels
                appState.currentSearchTerms = query.trim().toLowerCase().split(/\s+/);
                
                // Limiter à 5 suggestions
                const topResults = searchResults.slice(0, 5);
                
                // Afficher les suggestions
                if (topResults.length > 0) {
                    searchResults.innerHTML = '';
                    
                    topResults.forEach(result => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'search-suggestion';
                        
                        // Extraire le titre
                        const title = result.title || 'Sans titre';
                        
                        // Ajouter uniquement le titre (sans contenu)
                        suggestionItem.innerHTML = `
                            <div class="suggestion-title">${title}</div>
                        `;
                        
                        // Ajouter l'écouteur d'événement pour le clic
                        suggestionItem.addEventListener('click', () => {
                            openNoteModal(result, true, appState.currentSearchTerms);
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
                
                // Fermer tous les modals
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                cleanupHighlightedElements();
                event.target.style.display = 'none';
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
            try {
                await saveDaysSettings(appState.notes);
                await renderRevisitSections(appState.notes);
            } catch (error) {
                console.error('Erreur lors de la sauvegarde des paramètres:', error);
                alert('Erreur lors de la sauvegarde des paramètres. Veuillez vérifier votre connexion.');
            }
        });

        // Afficher plus de notes dans les sections de révision
        showMoreBtnToday.addEventListener('click', () => showMoreNotes('today'));
        showMoreBtn1.addEventListener('click', () => showMoreNotes('section1'));
        showMoreBtn2.addEventListener('click', () => showMoreNotes('section2'));
        
        // Synchronisation périodique avec Supabase (toutes les 30 secondes)
        setInterval(async () => {
            try {
                await syncWithSupabase();
                
                // Recharger les notes
                appState.notes = await fetchAllNotes();
                
                // Actualiser l'affichage si nécessaire
                await renderRevisitSections(appState.notes);
            } catch (error) {
                console.error('Erreur lors de la synchronisation avec Supabase:', error);
            }
        }, 30000); // 30 secondes
    }
});