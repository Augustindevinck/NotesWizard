/**
 * Service Supabase simplifié
 * Version adaptée pour fonctionner avec les nouvelles pages dédiées
 */

import { getClient } from './supabaseClient.js';

// Clé locale pour suivre les notes supprimées
const DELETED_NOTES_KEY = 'deletedNotes';

/**
 * Initialise le suivi des notes supprimées
 */
function initializeDeletedNotes() {
    if (!localStorage.getItem(DELETED_NOTES_KEY)) {
        localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify([]));
    }
}

/**
 * Marque une note comme supprimée
 * @param {string} noteId - ID de la note supprimée
 */
function markNoteAsDeleted(noteId) {
    initializeDeletedNotes();
    try {
        const deletedNotes = JSON.parse(localStorage.getItem(DELETED_NOTES_KEY) || '[]');
        if (!deletedNotes.includes(noteId)) {
            deletedNotes.push(noteId);
            localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(deletedNotes));
            console.log(`Note ${noteId} marquée comme supprimée localement`);
        }
    } catch (error) {
        console.error('Erreur lors du marquage de la note supprimée:', error);
    }
}

/**
 * Vérifie si une note est marquée comme supprimée
 * @param {string} noteId - ID de la note à vérifier
 * @returns {boolean} - True si la note est marquée comme supprimée
 */
function isNoteMarkedAsDeleted(noteId) {
    initializeDeletedNotes();
    try {
        const deletedNotes = JSON.parse(localStorage.getItem(DELETED_NOTES_KEY) || '[]');
        return deletedNotes.includes(noteId);
    } catch (error) {
        console.error('Erreur lors de la vérification des notes supprimées:', error);
        return false;
    }
}

/**
 * Récupère toutes les notes depuis Supabase
 * Filtre les notes supprimées connues localement
 * @returns {Promise<Array>} - Notes récupérées
 */
export async function fetchAllNotes() {
    initializeDeletedNotes();
    
    // Récupérer les notes du stockage local
    const localNotesStr = localStorage.getItem('notes');
    const localNotes = localNotesStr ? JSON.parse(localNotesStr) : [];
    
    // Récupérer les notes de Supabase si disponible
    const client = getClient();
    if (client) {
        try {
            console.log('Récupération des notes depuis Supabase...');
            const { data, error } = await client
                .from('notes')
                .select('*');
                
            if (error) {
                console.error('Erreur lors de la récupération des notes depuis Supabase:', error);
                return filterDeletedNotes(localNotes);
            }
            
            console.log(`${data.length} notes récupérées depuis Supabase.`);
            
            // Filtrer les notes marquées comme supprimées
            const filteredNotes = filterDeletedNotes(data);
            console.log(`${data.length - filteredNotes.length} notes supprimées filtrées`);
            
            // Mettre à jour le stockage local avec les notes filtrées
            localStorage.setItem('notes', JSON.stringify(filteredNotes));
            
            return filteredNotes;
        } catch (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            return filterDeletedNotes(localNotes);
        }
    }
    
    return filterDeletedNotes(localNotes);
}

/**
 * Filtre les notes marquées comme supprimées
 * @param {Array} notes - Notes à filtrer
 * @returns {Array} - Notes filtrées
 */
function filterDeletedNotes(notes) {
    if (!Array.isArray(notes)) return [];
    
    return notes.filter(note => !isNoteMarkedAsDeleted(note.id));
}

/**
 * Crée une note dans Supabase
 * Redirige vers la page dédiée
 * @param {Object} noteData - Données de la note
 */
export function createNote(noteData) {
    window.location.href = 'edit-note.html';
}

/**
 * Met à jour une note dans Supabase
 * Redirige vers la page dédiée
 * @param {string} noteId - ID de la note
 * @param {Object} noteData - Données mises à jour
 */
export function updateNote(noteId, noteData) {
    const params = new URLSearchParams();
    params.append('id', noteId);
    window.location.href = `edit-note.html?${params.toString()}`;
}

/**
 * Supprime une note dans Supabase
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} - True si la suppression a réussi
 */
export async function deleteNote(noteId) {
    if (!noteId) return false;
    
    try {
        console.log(`Suppression de la note ${noteId}...`);
        
        // Marquer la note comme supprimée localement
        markNoteAsDeleted(noteId);
        
        // Supprimer la note du stockage local
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        const updatedNotes = localNotes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(updatedNotes));
        
        // Supprimer la note de Supabase si disponible
        const client = getClient();
        if (client) {
            try {
                const { error } = await client
                    .from('notes')
                    .delete()
                    .eq('id', noteId);
                
                if (error) {
                    console.error(`Erreur lors de la suppression de la note ${noteId} dans Supabase:`, error);
                    // Continuer quand même car on a marqué la note comme supprimée localement
                } else {
                    console.log(`Note ${noteId} supprimée avec succès dans Supabase.`);
                }
            } catch (error) {
                console.error(`Exception lors de la suppression dans Supabase:`, error);
                // Continuer quand même car on a marqué la note comme supprimée localement
            }
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la note ${noteId}:`, error);
        return false;
    }
}

/**
 * Recherche des notes en fonction d'un terme de recherche
 * @param {string} searchTerm - Terme de recherche
 * @param {Object} options - Options de recherche
 * @returns {Promise<Array>} - Notes correspondant à la recherche
 */
export async function searchNotes(searchTerm, options = {}) {
    try {
        // Récupérer toutes les notes d'abord
        const allNotes = await fetchAllNotes();
        
        if (!searchTerm || searchTerm.trim() === '') {
            return allNotes;
        }
        
        // Recherche simple dans le titre et le contenu
        const term = searchTerm.toLowerCase().trim();
        return allNotes.filter(note => {
            const title = (note.title || '').toLowerCase();
            const content = (note.content || '').toLowerCase();
            
            if (title.includes(term) || content.includes(term)) {
                return true;
            }
            
            // Recherche dans les hashtags
            if (note.hashtags && Array.isArray(note.hashtags)) {
                for (const tag of note.hashtags) {
                    if (tag.toLowerCase().includes(term)) {
                        return true;
                    }
                }
            }
            
            // Recherche dans les catégories
            if (note.categories && Array.isArray(note.categories)) {
                for (const category of note.categories) {
                    if (category.toLowerCase().includes(term)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        return [];
    }
}

/**
 * Synchronise les notes entre Supabase et le stockage local
 * Cette fonction est maintenant simplement un alias pour fetchAllNotes
 * pour éviter les problèmes de resynchronisation de notes supprimées
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
export async function syncWithSupabase() {
    console.log('Synchronisation simplifiée avec Supabase...');
    
    try {
        // La fonction fetchAllNotes se charge déjà de filtrer les notes supprimées
        const notes = await fetchAllNotes();
        
        return {
            success: true,
            notes,
            message: 'Synchronisation réussie'
        };
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        return {
            success: false,
            notes: [],
            message: 'Erreur de synchronisation: ' + error.message
        };
    }
}

/**
 * Charge les paramètres de révision depuis le stockage local
 * @returns {Object} - Paramètres de révision
 */
export function loadRevisitSettings() {
    try {
        const settingsStr = localStorage.getItem('revisitSettings');
        if (settingsStr) {
            return JSON.parse(settingsStr);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres de révision:', error);
    }
    
    // Valeurs par défaut
    return {
        today: 0,
        yesterday: 1,
        week: 7,
        month: 30,
        older: 9999
    };
}

/**
 * Sauvegarde les paramètres de révision dans le stockage local
 * @param {Object} settings - Paramètres de révision
 * @returns {boolean} - True si la sauvegarde a réussi
 */
export function saveRevisitSettings(settings) {
    try {
        localStorage.setItem('revisitSettings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres de révision:', error);
        return false;
    }
}