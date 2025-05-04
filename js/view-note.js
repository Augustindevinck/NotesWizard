/**
 * Script pour la page d'affichage d'une note
 * Implémentation directe avec Supabase, indépendante des autres modules
 */

import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { addHashtagTag, extractYoutubeUrls, extractImgurImages } from './scripts/categories/hashtagManager.js';
import { addCategoryTag } from './scripts/categories/categoryManager.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { initNavHeader } from './scripts/navigation/nav-header.js';

// Variables globales
let currentNote = null;
let currentSearchTerms = [];
let fromSearch = false;
let supabaseClient = null;

/**
 * Initialise Supabase avec les informations stockées dans localStorage
 */
async function initSupabase() {
    try {
        const supabaseUrl = localStorage.getItem('supabaseUrl');
        const supabaseKey = localStorage.getItem('supabaseKey');
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('Configuration Supabase non trouvée dans localStorage');
            return null;
        }
        
        console.log('Initialisation du client Supabase...');
        const client = createClient(supabaseUrl, supabaseKey);
        
        // Vérifier que le client est bien créé
        if (!client) {
            console.error('Erreur: Client Supabase non créé');
            return null;
        }
        
        try {
            // Vérifier la session
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                console.log('Connexion anonyme...');
                await client.auth.signInAnonymously();
            }
            
            // Test rapide de connexion pour vérifier que le client fonctionne
            const { data, error } = await client.from('notes').select('id').limit(1);
            
            if (error) {
                console.error('Erreur lors du test de connexion Supabase:', error);
                return null;
            }
            
            console.log('Client Supabase initialisé et testé avec succès');
            return client;
        } catch (testError) {
            console.error('Erreur lors du test de connexion Supabase:', testError);
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Supabase:', error);
        return null;
    }
}

/**
 * Récupère toutes les notes depuis Supabase et le stockage local
 * @returns {Promise<Array>} - Tableau de notes
 */
async function fetchAllNotes() {
    try {
        console.log('Récupération de toutes les notes...');
        
        // Récupérer les notes du stockage local
        const localNotesStr = localStorage.getItem('notes');
        const localNotes = localNotesStr ? JSON.parse(localNotesStr) : [];
        
        console.log(`${localNotes.length} notes trouvées dans le stockage local.`);
        
        // Si Supabase n'est pas configuré, retourner uniquement les notes locales
        if (!supabaseClient) {
            console.log('Client Supabase non disponible, retour des notes locales uniquement.');
            return localNotes;
        }
        
        // Récupérer les notes depuis Supabase
        try {
            console.log('Récupération des notes depuis Supabase...');
            const { data: supabaseNotes, error } = await supabaseClient
                .from('notes')
                .select('*');
            
            if (error) {
                console.error('Erreur lors de la récupération des notes depuis Supabase:', error);
                return localNotes;
            }
            
            if (!supabaseNotes || !Array.isArray(supabaseNotes)) {
                console.error('Format de données invalide depuis Supabase:', supabaseNotes);
                return localNotes;
            }
            
            console.log(`${supabaseNotes.length} notes récupérées depuis Supabase.`);
            
            // Créer un ensemble pour éliminer les doublons (par ID)
            const notesSet = new Map();
            
            // D'abord ajouter les notes Supabase (priorité)
            supabaseNotes.forEach(note => {
                notesSet.set(note.id, note);
            });
            
            // Ensuite ajouter les notes locales (si elles n'existent pas déjà)
            localNotes.forEach(note => {
                if (!notesSet.has(note.id)) {
                    notesSet.set(note.id, note);
                }
            });
            
            // Convertir la Map en tableau
            const mergedNotes = Array.from(notesSet.values());
            console.log(`Total: ${mergedNotes.length} notes uniques après fusion.`);
            
            // Mettre à jour les notes locales pour qu'elles soient synchronisées
            localStorage.setItem('notes', JSON.stringify(mergedNotes));
            
            return mergedNotes;
        } catch (supabaseError) {
            console.error('Exception lors de la récupération des notes depuis Supabase:', supabaseError);
            return localNotes;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        
        // En cas d'erreur, essayer de récupérer au moins les notes locales
        try {
            const notesStr = localStorage.getItem('notes');
            return notesStr ? JSON.parse(notesStr) : [];
        } catch (e) {
            console.error('Erreur lors de la récupération des notes locales:', e);
            return [];
        }
    }
}

/**
 * Initialise l'application
 */
async function init() {
    // Initialiser la barre de navigation commune
    initNavHeader();
    
    // Initialiser Supabase
    supabaseClient = await initSupabase();
    
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

    try {
        // Récupérer toutes les notes de manière asynchrone
        const notes = await fetchAllNotes();
        
        // Trouver la note avec l'ID spécifié
        currentNote = notes.find(note => note.id === noteId);
        
        if (!currentNote) {
            // Rediriger vers la page d'accueil si la note n'existe pas
            console.error(`Note avec ID ${noteId} non trouvée.`);
            window.location.href = 'index.html';
            return;
        }
        
        // Extraire les URLs YouTube et Imgur du contenu de la note
        if (currentNote.content) {
            currentNote.videoUrls = extractYoutubeUrls(currentNote.content);
            currentNote.imgurUrls = extractImgurImages(currentNote.content);
        }

        // Afficher la note
        displayNote(currentNote);
        // Configuration des écouteurs d'événements
        setupEventListeners();
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        window.location.href = 'index.html';
    }
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
            // Créer l'élément tag manuellement
            const tagElement = document.createElement('span');
            tagElement.className = 'category-tag';
            tagElement.textContent = category;
            tagElement.dataset.value = category;
            // Rendre la catégorie cliquable pour rediriger vers la page des catégories
            tagElement.style.cursor = 'pointer';
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Rediriger vers la page des catégories avec cette catégorie sélectionnée
                window.location.href = `categories.html?category=${encodeURIComponent(category)}`;
            });
            categoriesContainer.appendChild(tagElement);
        });
    }

    // Ajouter les hashtags
    hashtagsContainer.innerHTML = '';
    if (note.hashtags && note.hashtags.length > 0) {
        note.hashtags.forEach(tag => {
            // Créer l'élément hashtag manuellement
            const tagElement = document.createElement('span');
            tagElement.className = 'hashtag-tag';
            tagElement.textContent = '#' + tag;
            tagElement.dataset.value = tag;
            // Rendre les hashtags cliquables pour rediriger vers la recherche
            tagElement.style.cursor = 'pointer';
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Rediriger vers la page de recherche avec ce hashtag comme terme de recherche
                window.location.href = `search.html?q=${encodeURIComponent(tag)}`;
            });
            hashtagsContainer.appendChild(tagElement);
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
    
    // Afficher les images et albums Imgur si présents
    if (note.imgurUrls && note.imgurUrls.length > 0) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'note-images';
        
        note.imgurUrls.forEach(imgurItem => {
            if (imgurItem.type === 'image') {
                // Afficher une image simple
                const img = document.createElement('img');
                img.src = imgurItem.url;
                img.className = 'imgur-image';
                img.alt = 'Image Imgur';
                img.loading = 'lazy';
                
                // Rendre l'image cliquable pour l'ouvrir dans Imgur
                const linkElement = document.createElement('a');
                linkElement.href = imgurItem.originalUrl;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.appendChild(img);
                
                imgContainer.appendChild(linkElement);
            } else if (imgurItem.type === 'album') {
                // Créer un conteneur pour l'album avec iframe
                const albumContainer = document.createElement('div');
                albumContainer.className = 'imgur-album-container';
                
                // Créer un iframe pour l'album
                const iframe = document.createElement('iframe');
                iframe.className = 'imgur-album-iframe';
                iframe.src = imgurItem.embedUrl;
                iframe.width = '100%';
                iframe.height = '500px';
                iframe.frameBorder = '0';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                iframe.style.backgroundColor = '#2e2e2e';
                
                // Ajouter un texte informatif
                const albumInfo = document.createElement('div');
                albumInfo.className = 'imgur-album-info';
                albumInfo.textContent = 'Album Imgur';
                
                // Assembler les éléments
                albumContainer.appendChild(iframe);
                albumContainer.appendChild(albumInfo);
                imgContainer.appendChild(albumContainer);
            }
        });
        
        viewContent.appendChild(imgContainer);
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
 * Supprime une note par son ID
 * @param {string} noteId - ID de la note à supprimer 
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
async function deleteNote(noteId) {
    try {
        console.log(`Suppression de la note ${noteId}...`);
        
        // Supprimer la note du stockage local
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        const updatedNotes = localNotes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(updatedNotes));
        console.log(`Note ${noteId} supprimée du stockage local`);
        
        // Supprimer la note de Supabase si configuré
        if (supabaseClient) {
            try {
                // Supprimer dans Supabase
                console.log(`Suppression de la note ${noteId} dans Supabase...`);
                
                const { error } = await supabaseClient
                    .from('notes')
                    .delete()
                    .eq('id', noteId);
                
                if (error) {
                    console.error(`Erreur lors de la suppression de la note ${noteId} dans Supabase:`, error);
                } else {
                    console.log(`Note ${noteId} supprimée avec succès dans Supabase.`);
                }
            } catch (supabaseError) {
                console.error(`Exception lors de la suppression dans Supabase:`, supabaseError);
                // Continuer quand même - la note est déjà supprimée localement
            }
        } else {
            console.warn('Client Supabase non disponible pour supprimer la note');
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la note ${noteId}:`, error);
        return false;
    }
}

/**
 * Supprime la note actuelle et redirection vers l'accueil
 */
async function deleteCurrentNote() {
    if (!currentNote || !currentNote.id) {
        alert("Aucune note à supprimer.");
        return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        try {
            // Désactiver les boutons pour éviter les actions multiples
            const deleteBtn = document.getElementById('delete-note-btn');
            const editBtn = document.getElementById('edit-note-btn');
            
            if (deleteBtn) deleteBtn.disabled = true;
            if (editBtn) editBtn.disabled = true;
            
            // Afficher une indication visuelle
            const noteContainer = document.querySelector('.note-page-container');
            if (noteContainer) {
                const loadingOverlay = document.createElement('div');
                loadingOverlay.style.position = 'absolute';
                loadingOverlay.style.top = '0';
                loadingOverlay.style.left = '0';
                loadingOverlay.style.width = '100%';
                loadingOverlay.style.height = '100%';
                loadingOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                loadingOverlay.style.display = 'flex';
                loadingOverlay.style.justifyContent = 'center';
                loadingOverlay.style.alignItems = 'center';
                loadingOverlay.style.zIndex = '1000';
                loadingOverlay.innerHTML = '<div>Suppression en cours...</div>';
                noteContainer.style.position = 'relative';
                noteContainer.appendChild(loadingOverlay);
            }
            
            console.log('Suppression de la note:', currentNote.id);
            
            // Supprimer la note avec notre fonction directe
            const success = await deleteNote(currentNote.id);
            
            if (success) {
                console.log('Note supprimée avec succès');
                
                // Augmenter le délai avant la redirection pour s'assurer que la suppression est terminée
                setTimeout(() => {
                    console.log('Redirection vers la page d\'accueil après suppression...');
                    // Forcer le rechargement complet pour s'assurer que les changements sont reflétés
                    window.location.href = 'index.html?t=' + new Date().getTime();
                }, 1500); // Augmenter à 1.5 secondes pour être sûr
            } else {
                throw new Error('Échec de la suppression de la note.');
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la note:', error);
            alert('Erreur lors de la suppression de la note: ' + error.message);
        }
    }
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
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