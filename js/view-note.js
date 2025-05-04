/**
 * Script pour la page d'affichage d'une note
 */

import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { deleteNote as deleteStorageNote } from './scripts/notes/notesManager.js';
import { addHashtagTag } from './scripts/categories/hashtagManager.js';
import { addCategoryTag } from './scripts/categories/categoryManager.js';
import { fetchAllNotes } from './scripts/utils/supabaseService.js';

// Variables globales
let currentNote = null;
let currentSearchTerms = [];
let fromSearch = false;

/**
 * Initialise l'application
 */
function init() {
    // Récupérer l'ID de la note depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const noteId = urlParams.get('id');
    
    fromSearch = urlParams.get('fromSearch') === 'true';
    
    // Récupérer les termes de recherche s'ils existent
    if (urlParams.has('searchTerms')) {
        try {
            currentSearchTerms = JSON.parse(decodeURIComponent(urlParams.get('searchTerms')));
        } catch (e) {
            console.error('Erreur lors du décodage des termes de recherche:', e);
            currentSearchTerms = [];
        }
    }

    if (!noteId) {
        // Rediriger vers la page d'accueil si aucun ID n'est spécifié
        window.location.href = 'index.html';
        return;
    }

    // Récupérer toutes les notes de manière asynchrone
    fetchAllNotes().then(notes => {
        // Trouver la note avec l'ID spécifié
        currentNote = notes.find(note => note.id === noteId);
        
        if (!currentNote) {
            // Rediriger vers la page d'accueil si la note n'existe pas
            window.location.href = 'index.html';
            return;
        }

        // Afficher la note
        displayNote(currentNote);
        // Configuration des écouteurs d'événements
        setupEventListeners();
    }).catch(error => {
        console.error('Erreur lors de la récupération des notes:', error);
        window.location.href = 'index.html';
    });
}

/**
 * Affiche une note dans l'interface
 * @param {Object} note - La note à afficher
 */
function displayNote(note) {
    const viewTitle = document.getElementById('note-view-title');
    const viewContent = document.getElementById('note-view-content');
    const categoriesContainer = document.getElementById('note-categories');
    const hashtagsContainer = document.getElementById('note-hashtags');

    // Créer le contenu avec mise en évidence si c'est un résultat de recherche
    const displayContent = (note.content || '').replace(/\[\[.*?\]\]/g, '');

    if (fromSearch && currentSearchTerms.length > 0) {
        // Mise en évidence du titre
        let highlightedTitle = note.title || 'Sans titre';
        currentSearchTerms.forEach(term => {
            if (term.length > 1) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedTitle = highlightedTitle.replace(regex, '<span class="highlighted-term">$1</span>');
            }
        });
        viewTitle.innerHTML = highlightedTitle;

        // Mise en évidence du contenu
        let highlightedContent = displayContent;
        currentSearchTerms.forEach(term => {
            if (term.length > 1) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedContent = highlightedContent.replace(regex, '<span class="highlighted-term">$1</span>');
            }
        });
        viewContent.innerHTML = highlightedContent;
    } else {
        // Affichage normal sans mise en évidence
        viewTitle.textContent = note.title || 'Sans titre';
        viewContent.textContent = displayContent;
    }

    // Ajouter les catégories
    categoriesContainer.innerHTML = '';
    if (note.categories && note.categories.length > 0) {
        note.categories.forEach(category => {
            addCategoryTag(category, categoriesContainer);
        });
    }

    // Ajouter les hashtags
    hashtagsContainer.innerHTML = '';
    if (note.hashtags && note.hashtags.length > 0) {
        note.hashtags.forEach(tag => {
            addHashtagTag(tag, hashtagsContainer);
        });
    }

    // Surligner les termes de recherche dans les tags si on vient d'une recherche
    if (fromSearch && currentSearchTerms.length > 0) {
        highlightSearchTermsInTags(categoriesContainer, '.category-tag', currentSearchTerms);
        highlightSearchTermsInTags(hashtagsContainer, '.hashtag-tag', currentSearchTerms);
    }

    // Afficher les vidéos YouTube si présentes
    if (note.videoUrls && note.videoUrls.length > 0) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'note-videos';
        note.videoUrls.forEach(url => {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.width = '100%';
            iframe.height = '315';
            iframe.frameBorder = '0';
            iframe.allowFullscreen = true;
            videoContainer.appendChild(iframe);
        });
        viewContent.appendChild(videoContainer);
    }
}

/**
 * Surligne les termes de recherche dans les tags
 * @param {HTMLElement} container - Conteneur des tags
 * @param {string} selector - Sélecteur CSS pour trouver les tags
 * @param {Array} searchTerms - Termes de recherche à surligner
 */
function highlightSearchTermsInTags(container, selector, searchTerms) {
    if (!container || !searchTerms || searchTerms.length === 0) {
        return;
    }

    const tags = container.querySelectorAll(selector);
    
    tags.forEach(tag => {
        const originalText = tag.textContent;
        
        // Store original content for later restoration
        tag.dataset.originalContent = originalText;
        
        let highlightedText = originalText;
        
        // Apply highlighting for each search term
        searchTerms.forEach(term => {
            if (term.length > 1) {
                const regex = new RegExp(`(${term})`, 'gi');
                highlightedText = highlightedText.replace(regex, '<span class="highlighted-term">$1</span>');
            }
        });
        
        // Set the highlighted content
        if (highlightedText !== originalText) {
            tag.innerHTML = highlightedText;
        }
    });
}

/**
 * Supprime la note actuelle et redirection vers l'accueil
 */
function deleteCurrentNote() {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        deleteStorageNote(currentNote.id);
        window.location.href = 'index.html';
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
            window.location.href = 'index.html';
        });
    }

    // Bouton d'édition
    const editButton = document.getElementById('edit-note-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            const params = new URLSearchParams();
            params.append('id', currentNote.id);
            window.location.href = `edit-note.html?${params.toString()}`;
        });
    }

    // Bouton de suppression
    const deleteButton = document.getElementById('delete-note-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', deleteCurrentNote);
    }
}

// Initialiser l'application au chargement du document
document.addEventListener('DOMContentLoaded', init);