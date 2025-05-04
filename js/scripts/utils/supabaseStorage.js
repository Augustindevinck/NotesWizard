/**
 * Interface de stockage Supabase pour l'application
 * Nouvelle implémentation qui utilise exclusivement Supabase, minimisant localStorage
 */

import { getClient } from './supabaseClient.js';

/**
 * Vérifie si une note est marquée comme supprimée dans la session
 * @param {string} noteId - ID de la note à vérifier
 * @returns {boolean} - True si la note est marquée comme supprimée
 */
function isNoteDeletedInSession(noteId) {
    return !!sessionStorage.getItem(`deleted_${noteId}`);
}

/**
 * Récupère toutes les notes depuis Supabase
 * @returns {Promise<Array>} - Tableau de notes
 */
export async function getAllNotes() {
    try {
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return [];
        }
        
        const { data, error } = await client
            .from('notes')
            .select('*');
            
        if (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            return [];
        }
        
        // Filtrer les notes marquées comme supprimées dans la session
        const filteredNotes = data.filter(note => !isNoteDeletedInSession(note.id));
        
        return filteredNotes;
    } catch (error) {
        console.error('Exception lors de la récupération des notes:', error);
        return [];
    }
}

/**
 * Charge toutes les notes depuis Supabase
 * Alias de getAllNotes pour compatibilité
 * @returns {Promise<Array>} - Tableau de notes
 */
export const loadNotes = getAllNotes;

/**
 * Sauvegarde une note dans Supabase
 * @param {Object} note - La note à sauvegarder
 * @returns {Promise<string|null>} - ID de la note ou null
 */
export async function saveNote(note) {
    try {
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return null;
        }
        
        // S'assurer que la note a un ID
        const noteToSave = { ...note };
        if (!noteToSave.id) {
            noteToSave.id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        }
        
        // Mettre à jour les timestamps
        const now = new Date().toISOString();
        noteToSave.updatedAt = now;
        if (!noteToSave.createdAt) {
            noteToSave.createdAt = now;
        }
        
        // Sauvegarder dans Supabase
        const { error } = await client
            .from('notes')
            .upsert(noteToSave);
            
        if (error) {
            console.error('Erreur lors de la sauvegarde de la note:', error);
            return null;
        }
        
        // Si la note était marquée comme supprimée, enlever cette marque
        sessionStorage.removeItem(`deleted_${noteToSave.id}`);
        
        return noteToSave.id;
    } catch (error) {
        console.error('Exception lors de la sauvegarde de la note:', error);
        return null;
    }
}

/**
 * Sauvegarde plusieurs notes dans Supabase
 * @param {Array} notes - Tableau de notes à sauvegarder
 * @returns {Promise<boolean>} - True si la sauvegarde a réussi
 */
export async function saveNotes(notes) {
    try {
        if (!Array.isArray(notes) || notes.length === 0) {
            return false;
        }
        
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return false;
        }
        
        // Upsert toutes les notes
        const { error } = await client
            .from('notes')
            .upsert(notes);
            
        if (error) {
            console.error('Erreur lors de la sauvegarde des notes:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Exception lors de la sauvegarde des notes:', error);
        return false;
    }
}

/**
 * Supprime une note de Supabase
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} - True si la suppression a réussi
 */
export async function deleteNote(noteId) {
    try {
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return false;
        }
        
        // Supprimer de Supabase
        const { error } = await client
            .from('notes')
            .delete()
            .eq('id', noteId);
            
        if (error) {
            console.error('Erreur lors de la suppression de la note:', error);
            return false;
        }
        
        // Marquer comme supprimée dans la session
        sessionStorage.setItem(`deleted_${noteId}`, 'true');
        
        return true;
    } catch (error) {
        console.error('Exception lors de la suppression de la note:', error);
        return false;
    }
}

/**
 * Supprime plusieurs notes de Supabase
 * @param {Array} noteIds - IDs des notes à supprimer
 * @returns {Promise<boolean>} - True si la suppression a réussi
 */
export async function deleteNotes(noteIds) {
    try {
        if (!Array.isArray(noteIds) || noteIds.length === 0) {
            return false;
        }
        
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return false;
        }
        
        // Supprimer de Supabase
        const { error } = await client
            .from('notes')
            .delete()
            .in('id', noteIds);
            
        if (error) {
            console.error('Erreur lors de la suppression des notes:', error);
            return false;
        }
        
        // Marquer comme supprimées dans la session
        noteIds.forEach(id => sessionStorage.setItem(`deleted_${id}`, 'true'));
        
        return true;
    } catch (error) {
        console.error('Exception lors de la suppression des notes:', error);
        return false;
    }
}

/**
 * Recherche des notes dans Supabase
 * @param {string} searchTerm - Terme de recherche
 * @param {Object} options - Options de recherche
 * @returns {Promise<Array>} - Notes correspondant à la recherche
 */
export async function searchNotes(searchTerm, options = {}) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return getAllNotes();
        }
        
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible');
            return [];
        }
        
        // Récupérer toutes les notes et filtrer côté client
        // Une implémentation plus avancée ferait la recherche côté serveur
        const allNotes = await getAllNotes();
        
        const term = searchTerm.toLowerCase().trim();
        return allNotes.filter(note => {
            // Recherche dans le titre
            if ((note.title || '').toLowerCase().includes(term)) {
                return true;
            }
            
            // Recherche dans le contenu
            if ((note.content || '').toLowerCase().includes(term)) {
                return true;
            }
            
            // Recherche dans les catégories
            if (note.categories && Array.isArray(note.categories)) {
                for (const category of note.categories) {
                    if (category.toLowerCase().includes(term)) {
                        return true;
                    }
                }
            }
            
            // Recherche dans les hashtags
            if (note.hashtags && Array.isArray(note.hashtags)) {
                for (const tag of note.hashtags) {
                    if (tag.toLowerCase().includes(term)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    } catch (error) {
        console.error('Exception lors de la recherche:', error);
        return [];
    }
}

/**
 * Synchronise les notes avec Supabase
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
export async function syncNotes() {
    console.log('Démarrage de la synchronisation avec Supabase...');
    
    try {
        const notes = await getAllNotes();
        
        console.log(`Synchronisation terminée, ${notes.length} notes récupérées.`);
        
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
            message: 'Erreur lors de la synchronisation: ' + error.message
        };
    }
}

/**
 * Importe des notes depuis un fichier JSON
 * @param {Array} notes - Notes à importer
 * @returns {Promise<boolean>} - True si l'import a réussi
 */
export async function importNotesFromJson(notes) {
    try {
        if (!Array.isArray(notes) || notes.length === 0) {
            return false;
        }
        
        // Sauvegarder toutes les notes dans Supabase
        return await saveNotes(notes);
    } catch (error) {
        console.error('Exception lors de l\'import des notes:', error);
        return false;
    }
}

/**
 * Charge les paramètres de révision
 * @returns {Object} - Paramètres de révision
 */
export function loadRevisitSettings() {
    try {
        // Les paramètres de révision sont stockés dans localStorage
        // car ils sont spécifiques à l'utilisateur et non aux données
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
 * Sauvegarde les paramètres de révision
 * @param {Object} settings - Paramètres de révision
 * @returns {boolean} - True si la sauvegarde a réussi
 */
export function saveRevisitSettings(settings) {
    try {
        // Les paramètres de révision sont stockés dans localStorage
        // car ils sont spécifiques à l'utilisateur et non aux données
        localStorage.setItem('revisitSettings', JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres de révision:', error);
        return false;
    }
}