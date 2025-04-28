/**
 * Gestion du stockage avec Supabase
 */

import { getClient } from './supabaseClient.js';
import { generateUniqueId } from './domHelpers.js';

/**
 * Récupère toutes les notes depuis Supabase
 * @returns {Promise<Array>} - Tableau de notes
 */
export async function getAllNotes() {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour récupérer les notes');
        return [];
    }
    
    try {
        const { data, error } = await client
            .from('notes')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            return [];
        }
        
        // S'assurer que les tableaux sont correctement formatés
        return data.map(note => ({
            ...note,
            categories: Array.isArray(note.categories) ? note.categories : [],
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : [],
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : []
        }));
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        return [];
    }
}

/**
 * Récupère une note spécifique par son ID
 * @param {string} id - ID de la note
 * @returns {Promise<Object|null>} - Note trouvée ou null
 */
export async function getNote(id) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour récupérer la note');
        return null;
    }
    
    try {
        const { data, error } = await client
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error(`Erreur lors de la récupération de la note ${id}:`, error);
            return null;
        }
        
        // S'assurer que les tableaux sont correctement formatés
        return {
            ...data,
            categories: Array.isArray(data.categories) ? data.categories : [],
            hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
            videoUrls: Array.isArray(data.videoUrls) ? data.videoUrls : []
        };
    } catch (error) {
        console.error(`Erreur lors de la récupération de la note ${id}:`, error);
        return null;
    }
}

/**
 * Crée une nouvelle note dans Supabase
 * @param {Object} noteData - Données de la note
 * @returns {Promise<Object|null>} - Note créée ou null
 */
export async function createNote(noteData) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour créer la note');
        return null;
    }
    
    try {
        // Préparer les données de la note
        const newNote = {
            id: generateUniqueId(),
            title: noteData.title || '',
            content: noteData.content || '',
            categories: Array.isArray(noteData.categories) ? noteData.categories : [],
            hashtags: Array.isArray(noteData.hashtags) ? noteData.hashtags : [],
            videoUrls: Array.isArray(noteData.videoUrls) ? noteData.videoUrls : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const { data, error } = await client
            .from('notes')
            .insert(newNote)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur lors de la création de la note:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        return null;
    }
}

/**
 * Met à jour une note existante dans Supabase
 * @param {string} id - ID de la note à mettre à jour
 * @param {Object} noteData - Nouvelles données de la note
 * @returns {Promise<Object|null>} - Note mise à jour ou null
 */
export async function updateNote(id, noteData) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour mettre à jour la note');
        return null;
    }
    
    try {
        // Préparer les données de mise à jour
        const updates = {
            ...noteData,
            updatedAt: new Date().toISOString(),
            categories: Array.isArray(noteData.categories) ? noteData.categories : [],
            hashtags: Array.isArray(noteData.hashtags) ? noteData.hashtags : [],
            videoUrls: Array.isArray(noteData.videoUrls) ? noteData.videoUrls : []
        };
        
        const { data, error } = await client
            .from('notes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error(`Erreur lors de la mise à jour de la note ${id}:`, error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la note ${id}:`, error);
        return null;
    }
}

/**
 * Supprime une note dans Supabase
 * @param {string} id - ID de la note à supprimer
 * @returns {Promise<boolean>} - Vrai si la suppression a réussi
 */
export async function deleteNote(id) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour supprimer la note');
        return false;
    }
    
    try {
        const { error } = await client
            .from('notes')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error(`Erreur lors de la suppression de la note ${id}:`, error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la note ${id}:`, error);
        return false;
    }
}

/**
 * Recherche des notes dans Supabase
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} - Notes correspondant à la recherche
 */
export async function searchNotes(query) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour la recherche');
        return [];
    }
    
    try {
        // Format de requête pour une recherche simple (correspondance partielle)
        const { data, error } = await client
            .from('notes')
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`);
        
        if (error) {
            console.error('Erreur lors de la recherche des notes:', error);
            return [];
        }
        
        // S'assurer que les tableaux sont correctement formatés
        return data.map(note => ({
            ...note,
            categories: Array.isArray(note.categories) ? note.categories : [],
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : [],
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : []
        }));
    } catch (error) {
        console.error('Erreur lors de la recherche des notes:', error);
        return [];
    }
}

/**
 * Sauvegarde un paramètre dans Supabase
 * @param {string} key - Clé du paramètre
 * @param {any} value - Valeur du paramètre
 * @returns {Promise<boolean>} - Vrai si la sauvegarde a réussi
 */
export async function saveSettings(key, value) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour sauvegarder les paramètres');
        return false;
    }
    
    try {
        // Vérifier si le paramètre existe déjà
        const { data, error } = await client
            .from('settings')
            .select('*')
            .eq('key', key)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
            console.error(`Erreur lors de la vérification du paramètre ${key}:`, error);
            return false;
        }
        
        if (!data) {
            // Le paramètre n'existe pas, le créer
            const { error: insertError } = await client
                .from('settings')
                .insert({ key, value });
            
            if (insertError) {
                console.error(`Erreur lors de la création du paramètre ${key}:`, insertError);
                return false;
            }
        } else {
            // Le paramètre existe, le mettre à jour
            const { error: updateError } = await client
                .from('settings')
                .update({ value })
                .eq('key', key);
            
            if (updateError) {
                console.error(`Erreur lors de la mise à jour du paramètre ${key}:`, updateError);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde du paramètre ${key}:`, error);
        return false;
    }
}

/**
 * Récupère un paramètre depuis Supabase
 * @param {string} key - Clé du paramètre
 * @param {any} defaultValue - Valeur par défaut si le paramètre n'existe pas
 * @returns {Promise<any>} - Valeur du paramètre
 */
export async function getSettings(key, defaultValue = null) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour récupérer les paramètres');
        return defaultValue;
    }
    
    try {
        const { data, error } = await client
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();
        
        if (error) {
            console.error(`Erreur lors de la récupération du paramètre ${key}:`, error);
            return defaultValue;
        }
        
        return data.value;
    } catch (error) {
        console.error(`Erreur lors de la récupération du paramètre ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Sauvegarde un tableau de notes dans Supabase
 * @param {Array} notes - Tableau de notes à sauvegarder
 * @returns {Promise<boolean>} - Vrai si la sauvegarde a réussi
 */
export async function saveNotes(notes) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour sauvegarder les notes');
        return false;
    }
    
    try {
        // Préparer toutes les notes pour l'insertion/mise à jour (upsert)
        const notesWithTimestamps = notes.map(note => ({
            ...note,
            categories: Array.isArray(note.categories) ? note.categories : [],
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : [],
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : [],
            updatedAt: new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString()
        }));
        
        // Suppression de toutes les notes existantes
        const { error: deleteError } = await client
            .from('notes')
            .delete()
            .neq('id', 'placeholder'); // Supprime toutes les notes
        
        if (deleteError) {
            console.error('Erreur lors de la suppression des notes existantes:', deleteError);
            return false;
        }
        
        // Si aucune note à sauvegarder, on retourne true (opération réussie)
        if (notesWithTimestamps.length === 0) {
            return true;
        }
        
        // Insertion des nouvelles notes
        const { error: insertError } = await client
            .from('notes')
            .insert(notesWithTimestamps);
        
        if (insertError) {
            console.error('Erreur lors de l\'insertion des notes:', insertError);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes:', error);
        return false;
    }
}

/**
 * Sauvegarde une seule note dans Supabase (création ou mise à jour)
 * @param {Object} note - La note à sauvegarder
 * @returns {Promise<Object|null>} - La note sauvegardée ou null en cas d'erreur
 */
export async function saveNote(note) {
    const client = getClient();
    
    if (!client) {
        console.warn('Client Supabase non disponible pour sauvegarder la note');
        return null;
    }
    
    try {
        // Préparer la note avec les données correctes
        const noteToSave = {
            ...note,
            categories: Array.isArray(note.categories) ? note.categories : [],
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : [],
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : [],
            updatedAt: new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString()
        };
        
        if (note.id) {
            // C'est une mise à jour
            const { data, error } = await client
                .from('notes')
                .update(noteToSave)
                .eq('id', note.id)
                .select()
                .single();
            
            if (error) {
                console.error(`Erreur lors de la mise à jour de la note ${note.id}:`, error);
                return null;
            }
            
            return data;
        } else {
            // C'est une création
            noteToSave.id = generateUniqueId();
            
            const { data, error } = await client
                .from('notes')
                .insert(noteToSave)
                .select()
                .single();
            
            if (error) {
                console.error('Erreur lors de la création de la note:', error);
                return null;
            }
            
            return data;
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la note:', error);
        return null;
    }
}