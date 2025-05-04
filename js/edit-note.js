/**
 * Script pour la page d'édition d'une note
 * Implémentation directe avec Supabase, indépendante des autres modules
 */

import { detectHashtags, extractYoutubeUrls } from './scripts/categories/hashtagManager.js';
import { handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Variables globales
let currentNoteId = null;
let notes = [];
let allCategories = new Set();
let supabaseClient = null;

/**
 * Initialise Supabase avec les informations stockées dans localStorage
 */
async function initSupabase() {
    try {
        const url = localStorage.getItem('supabase_url');
        const key = localStorage.getItem('supabase_key');
        
        if (!url || !key) {
            console.warn('Paramètres Supabase non configurés. Continuant sans Supabase.');
            return null;
        }
        
        console.log('Initialisation de Supabase...');
        supabaseClient = createClient(url, key);
        
        // Vérifier la session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            console.log('Connecté en tant qu\'utilisateur anonyme...');
            await supabaseClient.auth.signInAnonymously();
        } else {
            console.log('Session existante trouvée');
        }
        
        // Vérifier l'accès à la table notes
        const { error } = await supabaseClient
            .from('notes')
            .select('id')
            .limit(1);
            
        if (error && error.code !== 'PGRST116') { // PGRST116 = pas de lignes trouvées
            console.error('Erreur lors de l\'accès à la table notes:', error);
            return null;
        }
        
        console.log('Client Supabase initialisé avec succès');
        return supabaseClient;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Supabase:', error);
        return null;
    }
}

/**
 * Génère un identifiant unique pour une note
 * @returns {string} - ID unique
 */
function generateUniqueId() {
    return Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

/**
 * Récupère toutes les notes exclusivement depuis Supabase
 * @returns {Promise<Array>} - Tableau de notes
 */
async function fetchAllNotes() {
    try {
        console.log('Récupération des notes depuis Supabase...');
        
        if (!supabaseClient) {
            console.error('Client Supabase non disponible pour récupérer les notes');
            return [];
        }
        
        const { data, error } = await supabaseClient
            .from('notes')
            .select('*');
                
        if (error) {
            console.error('Erreur lors de la récupération des notes depuis Supabase:', error);
            return [];
        }
        
        console.log(`${data.length} notes récupérées depuis Supabase.`);
        
        // Traiter les données pour s'assurer que les tableaux sont correctement formatés
        const processedNotes = data.map(note => ({
            ...note,
            categories: ensureArray(note.categories),
            hashtags: ensureArray(note.hashtags),
            videoUrls: ensureArray(note.videoUrls)
        }));
        
        // Filtrer les notes marquées comme supprimées dans la session courante
        const filteredNotes = processedNotes.filter(note => {
            return !sessionStorage.getItem(`deleted_${note.id}`);
        });
        
        if (filteredNotes.length < processedNotes.length) {
            console.log(`${processedNotes.length - filteredNotes.length} notes récemment supprimées filtrées`);
        }
        
        return filteredNotes;
    } catch (error) {
        console.error('Erreur critique lors de la récupération des notes:', error);
        return [];
    }
}

/**
 * S'assure qu'une valeur est un tableau
 * @param {any} value - Valeur à vérifier/convertir
 * @returns {Array} - Tableau résultant
 */
function ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
        } catch {
            return [value];
        }
    }
    return [value];
}

/**
 * Initialise le gestionnaire de catégories
 * @param {Set} categorySet - Ensemble des catégories
 */
function initCategoryManager(categorySet) {
    // Fonction simple pour l'autocomplétion des catégories
    const categorySuggestions = document.getElementById('category-suggestions');
    if (!categorySuggestions) return;
    
    // Afficher des suggestions basées sur les catégories existantes
    allCategories = categorySet;
}

/**
 * Initialise l'application
 */
async function init() {
    try {
        // Initialiser Supabase
        await initSupabase();
        
        // Récupérer toutes les notes
        const fetchedNotes = await fetchAllNotes();
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
        
        // Continuer l'initialisation
        continueInit();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        notes = [];
        allCategories = new Set();
        continueInit();
    }
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
 * Sauvegarde une note exclusivement dans Supabase
 * @param {Object} note - La note à sauvegarder
 * @returns {Promise<string|null>} - ID de la note ou null en cas d'erreur
 */
async function saveNote(note) {
    try {
        console.log('Début de la sauvegarde de la note dans Supabase...');
        
        if (!supabaseClient) {
            console.error('Client Supabase non disponible, impossible de sauvegarder la note');
            return null;
        }
        
        // S'assurer que toutes les propriétés sont correctement formatées
        const processedNote = {
            ...note,
            title: note.title || '',
            content: note.content || '',
            categories: ensureArray(note.categories),
            hashtags: ensureArray(note.hashtags),
            videoUrls: ensureArray(note.videoUrls)
        };
        
        // Si la note a un ID, la mettre à jour, sinon la créer
        if (processedNote.id) {
            console.log(`Mise à jour de la note existante avec ID: ${processedNote.id}`);
            
            const now = new Date().toISOString();
            const noteUpdate = {
                ...processedNote,
                updatedAt: now
            };
            
            // Utiliser upsert pour garantir la mise à jour
            console.log('Mise à jour directe dans Supabase:', noteUpdate);
            const { data, error } = await supabaseClient
                .from('notes')
                .upsert(noteUpdate)
                .select();
            
            if (error) {
                console.error('Erreur lors de l\'upsert dans Supabase:', error);
                
                // Essayer explicitement une mise à jour
                console.log('Tentative de mise à jour explicite...');
                const { error: updateError } = await supabaseClient
                    .from('notes')
                    .update(noteUpdate)
                    .eq('id', processedNote.id);
                
                if (updateError) {
                    console.error('Échec de la mise à jour explicite:', updateError);
                    return null;
                } else {
                    console.log('Note mise à jour explicitement dans Supabase');
                    return processedNote.id;
                }
            } else {
                console.log('Note mise à jour avec succès dans Supabase:', data);
                return processedNote.id;
            }
        } else {
            // Création d'une nouvelle note
            const newId = generateUniqueId();
            const now = new Date().toISOString();
            
            const newNote = {
                ...processedNote,
                id: newId,
                createdAt: now,
                updatedAt: now
            };
            
            console.log(`Création d'une nouvelle note avec ID: ${newId}`);
            
            console.log('Création directe dans Supabase:', newNote);
            
            // Insérer la nouvelle note
            const { error } = await supabaseClient
                .from('notes')
                .insert(newNote);
            
            if (error) {
                console.error('Erreur lors de l\'insertion dans Supabase:', error);
                
                // Essayer avec upsert comme alternative
                console.log('Tentative d\'upsert comme alternative...');
                const { error: upsertError } = await supabaseClient
                    .from('notes')
                    .upsert(newNote);
                
                if (upsertError) {
                    console.error('Échec de l\'upsert alternatif:', upsertError);
                    return null;
                } else {
                    console.log('Note créée via upsert dans Supabase');
                    
                    // Ajouter à la liste en mémoire pour la session courante
                    notes.push(newNote);
                    
                    return newId;
                }
            } else {
                console.log('Note créée avec succès dans Supabase');
                
                // Ajouter à la liste en mémoire pour la session courante
                notes.push(newNote);
                
                return newId;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la note:', error);
        return null;
    }
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
        
        // Sauvegarder la note avec notre fonction directe
        const savedNoteId = await saveNote(noteData);
        
        console.log('ID de la note sauvegardée:', savedNoteId);
        
        if (savedNoteId) {
            console.log('Note sauvegardée avec succès, ID:', savedNoteId);
            
            // Notre fonction saveNote gère déjà la synchronisation directe avec Supabase
            // Pas besoin d'appeler syncWithSupabase
            
            // Rediriger vers la page d'affichage de la note
            const params = new URLSearchParams();
            params.append('id', savedNoteId);
            window.location.href = `view-note.html?${params.toString()}`;
            return true;
        } else {
            console.error('Sauvegarde échouée: ID null ou undefined');
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