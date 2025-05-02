/**
 * Script principal pour la page de révision des notes les plus anciennes
 */

// Imports des modules
import { getClient } from './scripts/utils/supabaseClient.js';
import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './scripts/notes/noteModal.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';

// Éléments DOM
let reviewNoteDisplay;
let nextReviewBtn;
let backToHomeBtn;

// Éléments du modal
let noteModal, noteTitle, noteContent, saveNoteBtn, deleteNoteBtn;
let categoryInput, categorySuggestions, selectedCategories, detectedHashtags;
let viewMode, editMode, viewTitle, viewContent, editButton;

// État de l'application
const appState = {
    notes: [],
    allCategories: new Set(),
    currentNote: null,
    currentSearchTerms: []
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialise l'application
 */
async function init() {
    // Initialiser les références DOM
    reviewNoteDisplay = document.getElementById('review-note-display');
    nextReviewBtn = document.getElementById('next-review-btn');
    backToHomeBtn = document.getElementById('back-to-home');
    
    // Éléments du modal
    noteModal = document.getElementById('note-modal');
    noteTitle = document.getElementById('note-title');
    noteContent = document.getElementById('note-content');
    saveNoteBtn = document.getElementById('save-note-btn');
    deleteNoteBtn = document.getElementById('delete-note-btn');
    categoryInput = document.getElementById('category-input');
    categorySuggestions = document.getElementById('category-suggestions');
    selectedCategories = document.getElementById('selected-categories');
    detectedHashtags = document.getElementById('detected-hashtags');
    viewMode = document.getElementById('note-view-mode');
    editMode = document.getElementById('note-edit-mode');
    viewTitle = document.getElementById('note-view-title');
    viewContent = document.getElementById('note-view-content');
    editButton = document.getElementById('edit-note-btn');
    
    // Afficher un message de chargement
    if (reviewNoteDisplay) {
        reviewNoteDisplay.innerHTML = '<div class="loading">Chargement de la note à réviser...</div>';
    }
    
    // Initialiser le modal de note si présent
    if (noteModal) {
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
        
        // Injecter les fonctions nécessaires au modal
        initModalFunctions({
            extractHashtags: extractHashtags,
            extractYoutubeUrls: extractYoutubeUrls,
            addCategoryTag: addCategoryTag,
            addHashtagTag: addHashtagTag,
            saveNote: saveNoteWithReviewUpdate
        });
    }
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // La colonne lastReviewedViaButton existe déjà dans la base de données
    console.log('Chargement des notes pour révision...');
    
    // Charger la note à réviser
    await loadNoteForReview();
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
    // Retour à l'accueil
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Bouton pour passer à la note suivante
    if (nextReviewBtn) {
        nextReviewBtn.addEventListener('click', async () => {
            await updateCurrentNoteReviewTimestamp();
            await loadNoteForReview();
        });
    }
}

/**
 * Charge la note la plus ancienne pour révision
 */
async function loadNoteForReview() {
    try {
        const supabase = getClient();
        
        if (!supabase) {
            console.error('Client Supabase non disponible - Redirection vers la page d\'accueil');
            displayErrorMessage('Client Supabase non disponible. Redirection vers la page d\'accueil...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
        
        // La colonne lastReviewedViaButton existe déjà, pas besoin de la vérifier
        console.log('Récupération de la note la plus ancienne à réviser...');
        
        // D'abord, essayer de récupérer une note où lastReviewedViaButton est NULL
        let { data: nullData, error: nullError } = await supabase
            .from('notes')
            .select('*')
            .is('lastReviewedViaButton', null)
            .order('createdAt', { ascending: true })
            .limit(1);
        
        // Si aucune note avec lastReviewedViaButton NULL n'est trouvée, récupérer celle avec la date la plus ancienne
        if ((!nullData || nullData.length === 0) && !nullError) {
            console.log('Aucune note avec lastReviewedViaButton NULL trouvée, recherche de la plus ancienne...');
            
            const { data: oldestData, error: oldestError } = await supabase
                .from('notes')
                .select('*')
                .order('lastReviewedViaButton', { ascending: true })
                .limit(1);
                
            if (oldestError) {
                console.error('Erreur lors de la récupération de la note la plus ancienne:', oldestError);
                
                // Si l'erreur persiste, récupérer simplement la note la plus ancienne par date de création
                console.log('Récupération de la note la plus ancienne par date de création...');
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('notes')
                    .select('*')
                    .order('createdAt', { ascending: true })
                    .limit(1);
                    
                if (fallbackError) {
                    console.error('Erreur lors de la récupération de secours:', fallbackError);
                    displayErrorMessage('Erreur lors de la récupération des notes. Veuillez réessayer.');
                    return;
                }
                
                nullData = fallbackData;
            } else {
                nullData = oldestData;
            }
        } else if (nullError) {
            console.error('Erreur lors de la recherche de notes non révisées:', nullError);
            
            // Si l'erreur persiste, récupérer simplement la note la plus ancienne par date de création
            console.log('Récupération de la note la plus ancienne par date de création...');
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('notes')
                .select('*')
                .order('createdAt', { ascending: true })
                .limit(1);
                
            if (fallbackError) {
                console.error('Erreur lors de la récupération de secours:', fallbackError);
                displayErrorMessage('Erreur lors de la récupération des notes. Veuillez réessayer.');
                return;
            }
            
            nullData = fallbackData;
        }
        
        // Afficher la note récupérée ou un message si aucune note n'est disponible
        if (nullData && nullData.length > 0) {
            console.log('Note trouvée pour révision:', nullData[0].title);
            appState.currentNote = nullData[0];
            displayNote(appState.currentNote);
        } else {
            console.log('Aucune note disponible pour révision');
            displayNoNotesMessage();
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la note pour révision:', error);
        displayErrorMessage('Une erreur est survenue lors du chargement des notes. Veuillez réessayer.');
    }
}

/**
 * Met à jour le timestamp de révision pour la note courante
 */
async function updateCurrentNoteReviewTimestamp() {
    if (!appState.currentNote) {
        console.warn('Aucune note courante à mettre à jour');
        return false;
    }
    
    try {
        const supabase = getClient();
        
        if (!supabase) {
            console.warn('Client Supabase non disponible pour la mise à jour');
            return false;
        }
        
        // La colonne lastReviewedViaButton existe déjà, pas besoin de la vérifier
        
        // Mettre à jour le timestamp de dernière révision
        const now = new Date().toISOString();
        console.log(`Mise à jour du timestamp de révision pour la note ${appState.currentNote.id} à ${now}`);
        
        const { data, error } = await supabase
            .from('notes')
            .update({ lastReviewedViaButton: now })
            .eq('id', appState.currentNote.id)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur lors de la mise à jour du timestamp de révision:', error);
            return false;
        }
        
        console.log(`Note ${appState.currentNote.id} marquée comme révisée à ${now}`);
        return true;
    } catch (error) {
        console.error('Exception lors de la mise à jour du timestamp de révision:', error);
        return false;
    }
}

/**
 * Sauvegarde une note avec mise à jour du timestamp de révision
 * @param {Object} noteData - Données de la note
 * @returns {Promise<Object>} - Note sauvegardée
 */
async function saveNoteWithReviewUpdate(noteData) {
    try {
        const supabase = getClient();
        
        if (!supabase) {
            console.warn('Client Supabase non disponible pour la sauvegarde');
            return null;
        }
        
        // Préparer les données de mise à jour
        const updates = {
            ...noteData,
            updatedAt: new Date().toISOString(),
            // Ne pas modifier lastReviewedViaButton car l'édition n'est pas une révision
            categories: Array.isArray(noteData.categories) ? noteData.categories : [],
            hashtags: Array.isArray(noteData.hashtags) ? noteData.hashtags : [],
            videoUrls: Array.isArray(noteData.videoUrls) ? noteData.videoUrls : []
        };
        
        // Supprimer lastReviewedViaButton pour éviter qu'il ne soit réinitialisé
        delete updates.lastReviewedViaButton;
        
        // Sauvegarder la note
        let savedNote;
        if (noteData.id) {
            const { data, error } = await supabase
                .from('notes')
                .update(updates)
                .eq('id', noteData.id)
                .select()
                .single();
                
            if (error) {
                console.error('Erreur lors de la mise à jour de la note:', error);
                return null;
            }
            
            savedNote = data;
        } else {
            // Cas rare, mais possible si on crée une nouvelle note
            updates.createdAt = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('notes')
                .insert(updates)
                .select()
                .single();
                
            if (error) {
                console.error('Erreur lors de la création de la note:', error);
                return null;
            }
            
            savedNote = data;
        }
        
        // Mettre à jour la note courante
        if (savedNote && appState.currentNote && savedNote.id === appState.currentNote.id) {
            appState.currentNote = savedNote;
            displayNote(appState.currentNote);
        }
        
        return savedNote;
    } catch (error) {
        console.error('Exception lors de la sauvegarde de la note:', error);
        return null;
    }
}

/**
 * Affiche la note courante dans l'interface
 * @param {Object} note - La note à afficher
 */
function displayNote(note) {
    if (!note) {
        displayNoNotesMessage();
        return;
    }
    
    // Créer l'élément HTML pour la note
    const noteElement = document.createElement('div');
    noteElement.className = 'review-note-container';
    
    // Ajouter le titre
    const titleElement = document.createElement('h2');
    titleElement.className = 'review-note-title';
    titleElement.textContent = note.title || 'Sans titre';
    noteElement.appendChild(titleElement);
    
    // Ajouter les catégories
    if (note.categories && note.categories.length > 0) {
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'review-categories';
        
        note.categories.forEach(category => {
            const categoryTag = document.createElement('span');
            categoryTag.className = 'review-category';
            categoryTag.textContent = category;
            categoriesContainer.appendChild(categoryTag);
        });
        
        noteElement.appendChild(categoriesContainer);
    }
    
    // Ajouter les hashtags
    if (note.hashtags && note.hashtags.length > 0) {
        const hashtagsContainer = document.createElement('div');
        hashtagsContainer.className = 'review-hashtags';
        
        note.hashtags.forEach(tag => {
            const hashtagTag = document.createElement('span');
            hashtagTag.className = 'review-hashtag';
            hashtagTag.textContent = `#${tag}`;
            hashtagsContainer.appendChild(hashtagTag);
        });
        
        noteElement.appendChild(hashtagsContainer);
    }
    
    // Ajouter le contenu
    const contentElement = document.createElement('div');
    contentElement.className = 'review-note-content';
    contentElement.textContent = note.content || '';
    noteElement.appendChild(contentElement);
    
    // Ajouter les dates de création et dernière révision
    const datesElement = document.createElement('div');
    datesElement.className = 'review-note-dates';
    datesElement.style.fontSize = '0.85rem';
    datesElement.style.color = 'var(--text-muted)';
    datesElement.style.marginTop = '15px';
    
    const createdDate = new Date(note.createdAt).toLocaleDateString();
    datesElement.innerHTML = `Créé le: ${createdDate}`;
    
    if (note.lastReviewedViaButton) {
        const reviewedDate = new Date(note.lastReviewedViaButton).toLocaleDateString();
        datesElement.innerHTML += `<br>Dernière révision: ${reviewedDate}`;
    } else {
        datesElement.innerHTML += '<br>Jamais révisée';
    }
    
    noteElement.appendChild(datesElement);
    
    // Ajouter un gestionnaire d'événements pour ouvrir le modal au clic
    noteElement.addEventListener('click', () => {
        if (typeof openNoteModal === 'function') {
            openNoteModal(note, false, []);
        }
    });
    
    // Remplacer le contenu actuel par la nouvelle note
    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(noteElement);
    
    // Activer le bouton suivant
    nextReviewBtn.disabled = false;
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function displayErrorMessage(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'empty-state';
    errorElement.innerHTML = `
        <h2>Erreur</h2>
        <p>${message}</p>
        <button id="retry-btn" class="review-next-btn">Réessayer</button>
    `;
    
    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(errorElement);
    
    // Désactiver le bouton suivant
    nextReviewBtn.disabled = true;
    
    // Ajouter un gestionnaire pour le bouton "Réessayer"
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNoteForReview);
    }
}

/**
 * Affiche un message quand aucune note n'est disponible
 */
function displayNoNotesMessage() {
    const emptyElement = document.createElement('div');
    emptyElement.className = 'empty-state';
    emptyElement.innerHTML = `
        <h2>Aucune note à réviser</h2>
        <p>Toutes vos notes ont été révisées récemment ou vous n'avez pas encore créé de notes.</p>
        <button id="go-create-btn" class="review-next-btn">Créer une note</button>
    `;
    
    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(emptyElement);
    
    // Désactiver le bouton suivant
    nextReviewBtn.disabled = true;
    
    // Ajouter un gestionnaire pour le bouton "Créer une note"
    const goCreateBtn = document.getElementById('go-create-btn');
    if (goCreateBtn) {
        goCreateBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}