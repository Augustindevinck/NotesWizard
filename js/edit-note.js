/**
 * Script pour la page d'édition d'une note
 */

import { saveNote } from './scripts/notes/notesManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls } from './scripts/categories/hashtagManager.js';
import { handleCategoryInput, handleCategoryKeydown, addCategoryTag, initCategoryManager } from './scripts/categories/categoryManager.js';
import { fetchAllNotes, syncWithSupabase } from './scripts/utils/supabaseService.js';

// Variables globales
let currentNoteId = null;
let notes = [];
let allCategories = new Set();

/**
 * Initialise l'application
 */
function init() {
    // Récupérer toutes les notes de manière asynchrone
    fetchAllNotes().then(fetchedNotes => {
        notes = fetchedNotes;
        
        // Extraire toutes les catégories des notes
        allCategories = new Set();
        notes.forEach(note => {
            if (note.categories && Array.isArray(note.categories)) {
                note.categories.forEach(category => {
                    allCategories.add(category);
                });
            }
        });
        
        // Initialiser le gestionnaire de catégories
        initCategoryManager(allCategories);
        
        // Continuer l'initialisation avec les données chargées
        continueInit();
    }).catch(error => {
        console.error("Erreur lors de la récupération des notes:", error);
        // Initialiser avec des tableaux vides en cas d'erreur
        notes = [];
        allCategories = new Set();
        continueInit();
    });
}

/**
 * Continue l'initialisation après le chargement des notes
 */
function continueInit() {
    // Récupérer l'ID de la note depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    
    // Éléments du DOM
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const selectedCategories = document.getElementById('selected-categories');
    const detectedHashtags = document.getElementById('detected-hashtags');
    
    // Configurer la détection des hashtags
    if (noteContent) {
        noteContent.addEventListener('input', (event) => {
            detectHashtags(event.target.value, detectedHashtags);
        });
    }
    
    // Configurer la gestion des catégories
    const categoryInput = document.getElementById('category-input');
    const categorySuggestions = document.getElementById('category-suggestions');
    
    if (categoryInput && categorySuggestions && selectedCategories) {
        categoryInput.addEventListener('input', (event) => {
            handleCategoryInput(event, categoryInput, categorySuggestions);
        });
        
        categoryInput.addEventListener('keydown', (event) => {
            handleCategoryKeydown(event, categoryInput, selectedCategories, categorySuggestions);
        });
        
        categorySuggestions.addEventListener('click', (event) => {
            if (event.target.classList.contains('category-suggestion')) {
                const category = event.target.textContent.trim();
                addCategoryTag(category, selectedCategories);
                categoryInput.value = '';
                categorySuggestions.innerHTML = '';
                categoryInput.focus();
            }
        });
    }

    if (noteId) {
        // Mode édition d'une note existante
        currentNoteId = noteId;
        const existingNote = notes.find(note => note.id === noteId);
        
        if (existingNote) {
            // Remplir les champs avec les données de la note
            if (noteTitle) noteTitle.value = existingNote.title || '';
            if (noteContent) noteContent.value = existingNote.content || '';
            
            // Ajouter les catégories
            if (selectedCategories && existingNote.categories && existingNote.categories.length > 0) {
                existingNote.categories.forEach(category => {
                    addCategoryTag(category, selectedCategories);
                });
            }
            
            // Détecter les hashtags dans le contenu
            if (detectedHashtags && noteContent) {
                detectHashtags(noteContent.value, detectedHashtags);
            }
        } else {
            // Rediriger vers la création si la note n'existe pas
            currentNoteId = null;
        }
    } else {
        // Mode création d'une nouvelle note
        currentNoteId = null;
    }
    
    // Configuration des écouteurs d'événements
    setupEventListeners();
}

/**
 * Sauvegarde la note actuelle
 * @returns {Promise<boolean>} - Indique si la sauvegarde a réussi
 */
async function saveCurrentNote() {
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const selectedCategories = document.getElementById('selected-categories');
    const detectedHashtags = document.getElementById('detected-hashtags');
    
    // Get values from form
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    // Get categories
    const categoryElements = selectedCategories.querySelectorAll('.category-tag');
    let categories = Array.from(categoryElements).map(el => {
        return el.dataset.value || el.textContent.trim();
    });
    
    // Assurez-vous que categories est toujours un tableau
    if (!Array.isArray(categories)) {
        console.error("Les catégories ne sont pas un tableau, conversion forcée:", categories);
        categories = categories ? [categories] : [];
    }

    // Get hashtags
    const hashtagElements = detectedHashtags.querySelectorAll('.hashtag-tag');
    let hashtags = Array.from(hashtagElements).map(el => {
        // Utilisez substring uniquement si le texte commence par # 
        const text = el.textContent.trim();
        return el.dataset.value || (text.startsWith('#') ? text.substring(1) : text);
    });
    
    // Assurez-vous que hashtags est toujours un tableau
    if (!Array.isArray(hashtags)) {
        console.error("Les hashtags ne sont pas un tableau, conversion forcée:", hashtags);
        hashtags = hashtags ? [hashtags] : [];
    }

    // Extract YouTube URLs from content
    const videoUrls = extractYoutubeUrls(content);

    // Create note data
    const noteData = {
        id: currentNoteId,
        title,
        content,
        categories,
        hashtags,
        videoUrls
    };

    try {
        console.log('Préparation de la sauvegarde avec les données:', {
            id: noteData.id,
            title: noteData.title,
            contentLength: noteData.content?.length,
            categories: noteData.categories,
            hashtags: noteData.hashtags,
            videoUrls: noteData.videoUrls
        });
        
        // Sauvegarder la note
        const savedNoteId = await saveNote(noteData, notes);
        
        console.log('Résultat de saveNote:', savedNoteId);
        
        if (savedNoteId) {
            console.log('Note sauvegardée avec succès, ID:', savedNoteId);
            
            // Synchroniser avec Supabase pour s'assurer que toutes les notes sont à jour
            try {
                console.log('Synchronisation avec Supabase après sauvegarde...');
                await syncWithSupabase();
                console.log('Synchronisation terminée.');
            } catch (syncError) {
                console.error('Erreur lors de la synchronisation après sauvegarde:', syncError);
                // Continuer malgré l'erreur de synchronisation
            }
            
            // Rediriger vers la page d'affichage de la note
            const params = new URLSearchParams();
            params.append('id', savedNoteId);
            window.location.href = `view-note.html?${params.toString()}`;
            return true;
        } else {
            console.error('saveNote a retourné null ou undefined');
            alert('Erreur lors de la sauvegarde de la note.');
            return false;
        }
    } catch (error) {
        console.error('Exception lors de la sauvegarde de la note:', error);
        alert('Erreur lors de la sauvegarde de la note: ' + error.message);
        return false;
    }
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
    // Bouton de retour à l'accueil
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (confirm('Abandonner les modifications ?')) {
                window.location.href = 'index.html';
            }
        });
    }

    // Bouton de sauvegarde
    const saveButton = document.getElementById('save-note-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveCurrentNote);
    }

    // Bouton d'annulation
    const cancelButton = document.getElementById('cancel-edit-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            if (currentNoteId) {
                // Retourner à la page d'affichage de la note
                const params = new URLSearchParams();
                params.append('id', currentNoteId);
                window.location.href = `view-note.html?${params.toString()}`;
            } else {
                // Retourner à l'accueil
                window.location.href = 'index.html';
            }
        });
    }
}

// Initialiser l'application au chargement du document
document.addEventListener('DOMContentLoaded', init);