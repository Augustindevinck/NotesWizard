/**
 * Gestion du modal de note pour la consultation et l'édition
 */

import { cleanupHighlightedElements } from '../utils/domHelpers.js';

// Fonctions à injecter
let extractHashtagsFn = null;
let extractYoutubeUrlsFn = null;
let addCategoryTagFn = null;
let addHashtagTagFn = null;
let saveNoteFn = null;

/**
 * Initialise les fonctions externes nécessaires au module
 * @param {Object} functions - Les fonctions à injecter
 */
export function initModalFunctions(functions) {
    extractHashtagsFn = functions.extractHashtags;
    extractYoutubeUrlsFn = functions.extractYoutubeUrls;
    addCategoryTagFn = functions.addCategoryTag;
    addHashtagTagFn = functions.addHashtagTag;
    saveNoteFn = functions.saveNote;
}

// Variables pour les éléments du modal
let noteModal;
let noteTitle;
let noteContent;
let currentNoteId = null;
let selectedCategories;
let detectedHashtags;
let deleteNoteBtn;
let viewMode;
let editMode;
let viewTitle;
let viewContent;
let editButton;
let saveNoteBtn;

/**
 * Initialise les éléments du modal de note
 * @param {Object} elements - Les éléments DOM nécessaires
 */
export function initNoteModal(elements) {
    noteModal = elements.noteModal;
    noteTitle = elements.noteTitle;
    noteContent = elements.noteContent;
    selectedCategories = elements.selectedCategories;
    detectedHashtags = elements.detectedHashtags;
    deleteNoteBtn = elements.deleteNoteBtn;
    viewMode = elements.viewMode;
    editMode = elements.editMode;
    viewTitle = elements.viewTitle;
    viewContent = elements.viewContent;
    editButton = elements.editButton;
    saveNoteBtn = elements.saveNoteBtn;
}

/**
 * Surligne les termes de recherche dans un élément de texte
 * @param {HTMLElement} inputElement - L'élément contenant le texte à surligner
 * @param {Array} searchTerms - Les termes de recherche à surligner
 */
function highlightSearchTerms(inputElement, searchTerms) {
    if (!inputElement || !searchTerms || searchTerms.length === 0) {
        return;
    }

    // Create a container for the highlighted content
    const highlightedContainer = document.createElement('div');
    highlightedContainer.className = 'highlighted-content';
    highlightedContainer.style.width = '100%';
    highlightedContainer.style.height = '100%';
    highlightedContainer.style.boxSizing = 'border-box';
    highlightedContainer.style.overflow = 'auto';
    
    // Copy styling from the original element
    if (inputElement.tagName === 'TEXTAREA') {
        highlightedContainer.style.whiteSpace = 'pre-wrap';
        highlightedContainer.style.padding = window.getComputedStyle(inputElement).padding;
    }

    // Get the content and add highlights
    let content = inputElement.value || inputElement.textContent || '';
    
    // Escape HTML special characters to prevent injection
    content = content.replace(/[&<>"']/g, match => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
    
    // Replace line breaks with <br> for proper display in div
    if (inputElement.tagName === 'TEXTAREA') {
        content = content.replace(/\n/g, '<br>');
    }
    
    // Apply highlighting for each search term (case-insensitive)
    searchTerms.forEach(term => {
        if (term.length > 1) {
            const regex = new RegExp(`(${term})`, 'gi');
            content = content.replace(regex, '<span class="highlighted-term">$1</span>');
        }
    });
    
    // Set the highlighted content
    highlightedContainer.innerHTML = content;
    
    // Add the highlighted container after the input element
    inputElement.parentNode.insertBefore(highlightedContainer, inputElement.nextSibling);
    
    // Hide the original input element
    inputElement.style.display = 'none';
}

/**
 * Surligne les termes de recherche dans les tags (catégories et hashtags)
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
 * Ouvre le modal de note pour consultation ou édition
 * @param {Object} note - La note à afficher/éditer (null pour nouvelle note)
 * @param {boolean} fromSearch - Si on vient d'une recherche
 * @param {Array} currentSearchTerms - Les termes de recherche actuels
 */
export function openNoteModal(note = null, fromSearch = false, currentSearchTerms = []) {
    if (!noteModal) {
        console.error('Modal non initialisé - Appelez initNoteModal d\'abord');
        return;
    }

    // Clear previous note data
    noteTitle.value = '';
    noteContent.value = '';
    selectedCategories.innerHTML = '';
    detectedHashtags.innerHTML = '';
    currentNoteId = null;

    // Configure edit button
    editButton.onclick = () => {
        viewMode.classList.add('hidden');
        editMode.classList.remove('hidden');
        noteTitle.focus();
    };

    // Par défaut, masquer le bouton de suppression (pour nouvelle note)
    deleteNoteBtn.classList.add('hidden');

    if (note) {
        // Afficher en mode consultation
        viewMode.classList.remove('hidden');
        editMode.classList.add('hidden');

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

        // Préparer le mode édition
        noteTitle.value = note.title || '';
        noteContent.value = note.content || '';
        currentNoteId = note.id;

        // Afficher le bouton de suppression pour les notes existantes
        deleteNoteBtn.classList.remove('hidden');

        // Add categories
        if (note.categories && note.categories.length > 0) {
            note.categories.forEach(category => {
                if (addCategoryTagFn) {
                    addCategoryTagFn(category, selectedCategories);
                } else {
                    console.error('addCategoryTag non initialisé');
                }
            });
        }

        // Show hashtags
        if (note.hashtags && note.hashtags.length > 0) {
            note.hashtags.forEach(tag => {
                if (addHashtagTagFn) {
                    addHashtagTagFn(tag, detectedHashtags);
                } else {
                    console.error('addHashtagTag non initialisé');
                }
            });
        }

        // Show video URL if present
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

        // Surligner les termes de recherche dans les éléments du mode édition si on vient d'une recherche
        if (fromSearch && currentSearchTerms.length > 0) {
            highlightSearchTerms(noteTitle, currentSearchTerms);
            highlightSearchTerms(noteContent, currentSearchTerms);
            highlightSearchTermsInTags(selectedCategories, '.category-tag', currentSearchTerms);
            highlightSearchTermsInTags(detectedHashtags, '.hashtag-tag', currentSearchTerms);
        }
    } else {
        // Mode création de nouvelle note
        viewMode.classList.add('hidden');
        editMode.classList.remove('hidden');
        noteTitle.focus();
    }

    // Afficher le modal
    noteModal.style.display = 'block';
}

/**
 * Sauvegarde la note actuelle
 * @param {Array} notes - Tableau des notes
 * @param {Function} callback - Fonction à appeler après sauvegarde
 * @returns {string} - ID de la note sauvegardée
 */
export function saveCurrentNote(notes, callback) {
    // Get values from form
    const title = noteTitle.value.trim();
    const content = noteContent.value.trim();

    // Get categories - structure simplifiée
    const categoryElements = selectedCategories.querySelectorAll('.category-tag');
    const categories = Array.from(categoryElements).map(el => {
        // Utiliser l'attribut data-value s'il existe, sinon prendre le contenu textuel
        return el.dataset.value || el.textContent.trim();
    });

    // Get hashtags - structure simplifiée
    const hashtagElements = detectedHashtags.querySelectorAll('.hashtag-tag');
    const hashtags = Array.from(hashtagElements).map(el => {
        // Utiliser l'attribut data-value s'il existe, sinon prendre le contenu textuel sans le #
        return el.dataset.value || el.textContent.trim().substring(1);
    });

    // Extract YouTube URLs from content
    let videoUrls = [];
    if (extractYoutubeUrlsFn) {
        videoUrls = extractYoutubeUrlsFn(content);
    } else {
        console.error('extractYoutubeUrls non initialisé');
    }

    // Create note data
    const noteData = {
        id: currentNoteId,
        title,
        content,
        categories,
        hashtags,
        videoUrls
    };

    // Save the note and get the ID
    let savedNoteId = null;
    
    try {
        if (saveNoteFn) {
            // Si saveNoteFn renvoie une promesse, la gérer correctement
            const result = saveNoteFn(noteData, notes, callback);
            
            if (result && typeof result.then === 'function') {
                // C'est une promesse, l'exécuter
                result.then(savedNote => {
                    if (savedNote && savedNote.id) {
                        savedNoteId = savedNote.id;
                    }
                    // Cacher le modal après la sauvegarde
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                    
                    // Callback si nécessaire
                    if (typeof callback === 'function') {
                        callback(savedNote);
                    }
                }).catch(error => {
                    console.error("Erreur lors de la sauvegarde:", error);
                    // Même en cas d'erreur, fermer le modal car la sauvegarde peut avoir réussi malgré l'erreur
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                });
                
                // Comme nous utilisons des promesses, nous retournons simplement l'ID actuel
                return currentNoteId;
            } else {
                // Si ce n'est pas une promesse, nous pouvons procéder comme avant
                savedNoteId = result;
            }
        } else {
            console.error('saveNote non initialisé');
        }
    } catch (error) {
        console.error("Exception lors de la sauvegarde:", error);
    }
    
    // Hide the modal (seulement si nous n'avons pas exécuté de promesse)
    cleanupHighlightedElements();
    noteModal.style.display = 'none';
    
    return savedNoteId;
}