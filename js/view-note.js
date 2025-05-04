/**
 * Script pour la page d'affichage d'une note
 * Implémentation directe avec Supabase, indépendante des autres modules
 */

import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { addHashtagTag, extractYoutubeUrls } from './scripts/categories/hashtagManager.js';
import { addCategoryTag } from './scripts/categories/categoryManager.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

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
        
        // Vérifier la session
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            console.log('Connexion anonyme...');
            await client.auth.signInAnonymously();
        }
        
        console.log('Client Supabase initialisé avec succès');
        return client;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Supabase:', error);
        return null;
    }
}

/**
 * Récupère toutes les notes depuis Supabase, avec fallback vers le stockage local uniquement si nécessaire
 * @returns {Promise<Array>} - Tableau de notes
 */
async function fetchAllNotes() {
    try {
        console.log('Récupération des notes depuis Supabase...');
        
        // Tenter d'abord de récupérer depuis Supabase
        if (supabaseClient) {
            try {
                const { data: supabaseNotes, error } = await supabaseClient
                    .from('notes')
                    .select('*');
                
                if (error) {
                    console.error('Erreur lors de la récupération des notes depuis Supabase:', error);
                    throw error; // Passer au fallback
                }
                
                if (!supabaseNotes || !Array.isArray(supabaseNotes)) {
                    console.error('Format de données invalide depuis Supabase:', supabaseNotes);
                    throw new Error('Format de données invalide'); // Passer au fallback
                }
                
                console.log(`${supabaseNotes.length} notes récupérées depuis Supabase.`);
                
                // Mettre à jour le localStorage comme cache seulement
                localStorage.setItem('notes', JSON.stringify(supabaseNotes));
                
                return supabaseNotes;
            } catch (supabaseError) {
                console.error('Exception lors de la récupération depuis Supabase, fallback au localStorage:', supabaseError);
                // Continuer vers le fallback
            }
        } else {
            console.log('Client Supabase non disponible');
        }
        
        // Fallback: Utiliser le localStorage uniquement en cas d'échec de Supabase
        console.log('Utilisation du fallback localStorage');
        const localNotesStr = localStorage.getItem('notes');
        const localNotes = localNotesStr ? JSON.parse(localNotesStr) : [];
        return localNotes;
    } catch (error) {
        console.error('Erreur critique lors de la récupération des notes:', error);
        
        // Dernier recours en cas d'erreur critique
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
            // Créer l'élément tag manuellement pour éviter les comportements indésirables
            const tagElement = document.createElement('span');
            tagElement.className = 'category-tag';
            tagElement.textContent = category;
            tagElement.dataset.value = category;
            // Éviter que les catégories soient cliquables sur la page de visualisation
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            categoriesContainer.appendChild(tagElement);
        });
    }

    // Ajouter les hashtags
    hashtagsContainer.innerHTML = '';
    if (note.hashtags && note.hashtags.length > 0) {
        note.hashtags.forEach(tag => {
            // Créer l'élément hashtag manuellement pour éviter les comportements indésirables
            const tagElement = document.createElement('span');
            tagElement.className = 'hashtag-tag';
            tagElement.textContent = '#' + tag;
            tagElement.dataset.value = tag;
            // Éviter que les hashtags soient cliquables sur la page de visualisation
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
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
                
                // Vérifier d'abord si la note existe toujours
                const { data: existingNote, error: checkError } = await supabaseClient
                    .from('notes')
                    .select('id')
                    .eq('id', noteId)
                    .single();
                
                if (checkError && checkError.code !== 'PGRST116') {
                    console.error(`Erreur lors de la vérification de l'existence de la note ${noteId}:`, checkError);
                }
                
                if (existingNote || checkError?.code !== 'PGRST116') {
                    // Si la note existe ou si l'erreur n'est pas "note non trouvée", procéder à la suppression
                    const { error } = await supabaseClient
                        .from('notes')
                        .delete()
                        .eq('id', noteId);
                    
                    if (error) {
                        console.error(`Erreur lors de la suppression de la note ${noteId} dans Supabase:`, error);
                    } else {
                        console.log(`Note ${noteId} supprimée avec succès dans Supabase.`);
                    }
                } else {
                    console.log(`Note ${noteId} n'existe pas dans Supabase, aucune suppression nécessaire.`);
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
            console.log('Suppression de la note:', currentNote.id);
            
            // Supprimer la note avec notre fonction directe
            const success = await deleteNote(currentNote.id);
            
            if (success) {
                console.log('Note supprimée avec succès');
                
                // La fonction deleteNote gère déjà la suppression dans Supabase et dans le stockage local
                
                window.location.href = 'index.html';
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