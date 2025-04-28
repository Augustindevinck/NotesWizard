/**
 * Service pour gérer les opérations avec Supabase
 */

import { getSupabaseClient, loadSupabaseFromLocalStorage } from './supabaseDirectConfig.js';
import { generateUniqueId } from './domHelpers.js';

// Charger le client depuis le localStorage s'il n'est pas initialisé
let supabase = getSupabaseClient();
if (!supabase) {
    supabase = loadSupabaseFromLocalStorage();
}

/**
 * Récupère toutes les notes depuis Supabase
 * @returns {Promise<Array>} Tableau de notes
 */
export async function fetchAllNotes() {
    try {
        // Obtenez le client Supabase
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible');
            return JSON.parse(localStorage.getItem('notes') || '[]');
        }
        
        // Récupérer toutes les notes
        const { data, error } = await client
            .from('notes')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            return JSON.parse(localStorage.getItem('notes') || '[]');
        }
        
        // S'assurer que les tableaux sont correctement formatés
        const formattedNotes = data.map(note => ({
            ...note,
            categories: Array.isArray(note.categories) ? note.categories : [],
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : [],
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : []
        }));
        
        // Mettre à jour le localStorage pour la résilience
        localStorage.setItem('notes', JSON.stringify(formattedNotes));
        
        return formattedNotes;
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        return JSON.parse(localStorage.getItem('notes') || '[]');
    }
}

/**
 * Crée une nouvelle note dans Supabase
 * @param {Object} noteData - Données de la note
 * @returns {Promise<Object>} La note créée
 */
export async function createNote(noteData) {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible');
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const newNote = {
                id: generateUniqueId(),
                ...noteData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.push(newNote);
            localStorage.setItem('notes', JSON.stringify(notes));
            return newNote;
        }
        
        // Préparer les données de la note
        const newNote = {
            id: generateUniqueId(),
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            categories: Array.isArray(noteData.categories) ? noteData.categories : [],
            hashtags: Array.isArray(noteData.hashtags) ? noteData.hashtags : [],
            videoUrls: Array.isArray(noteData.videoUrls) ? noteData.videoUrls : []
        };
        
        // Créer la note dans Supabase
        const { data, error } = await client
            .from('notes')
            .insert(newNote)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur lors de la création de la note:', error);
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            notes.push(newNote);
            localStorage.setItem('notes', JSON.stringify(notes));
            return newNote;
        }
        
        // Mettre à jour le localStorage
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(data);
        localStorage.setItem('notes', JSON.stringify(notes));
        
        return data;
    } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        
        // Fallback sur localStorage
        const newNote = {
            id: generateUniqueId(),
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        
        return newNote;
    }
}

/**
 * Met à jour une note existante dans Supabase
 * @param {string} noteId - ID de la note à mettre à jour
 * @param {Object} noteData - Données de la note à mettre à jour
 * @returns {Promise<Object>} La note mise à jour
 */
export async function updateNote(noteId, noteData) {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible');
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const noteIndex = notes.findIndex(note => note.id === noteId);
            
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    ...noteData,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('notes', JSON.stringify(notes));
                return notes[noteIndex];
            }
            
            return null;
        }
        
        // Préparer les données de mise à jour
        const updates = {
            ...noteData,
            updatedAt: new Date().toISOString()
        };
        
        // Mettre à jour la note dans Supabase
        const { data, error } = await client
            .from('notes')
            .update(updates)
            .eq('id', noteId)
            .select()
            .single();
        
        if (error) {
            console.error('Erreur lors de la mise à jour de la note:', error);
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const noteIndex = notes.findIndex(note => note.id === noteId);
            
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    ...noteData,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('notes', JSON.stringify(notes));
                return notes[noteIndex];
            }
            
            return null;
        }
        
        // Mettre à jour le localStorage
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
            notes[noteIndex] = data;
            localStorage.setItem('notes', JSON.stringify(notes));
        }
        
        return data;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la note:', error);
        
        // Fallback sur localStorage
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
            notes[noteIndex] = {
                ...notes[noteIndex],
                ...noteData,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('notes', JSON.stringify(notes));
            return notes[noteIndex];
        }
        
        return null;
    }
}

/**
 * Supprime une note dans Supabase
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteNote(noteId) {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible');
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const filteredNotes = notes.filter(note => note.id !== noteId);
            localStorage.setItem('notes', JSON.stringify(filteredNotes));
            return true;
        }
        
        // Supprimer la note dans Supabase
        const { error } = await client
            .from('notes')
            .delete()
            .eq('id', noteId);
        
        if (error) {
            console.error('Erreur lors de la suppression de la note:', error);
            // Fallback sur localStorage
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const filteredNotes = notes.filter(note => note.id !== noteId);
            localStorage.setItem('notes', JSON.stringify(filteredNotes));
            return true;
        }
        
        // Mettre à jour le localStorage
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const filteredNotes = notes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        
        // Fallback sur localStorage
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const filteredNotes = notes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        
        return true;
    }
}

/**
 * Recherche des notes dans Supabase
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} Notes correspondant à la recherche
 */
export async function searchNotes(query) {
    try {
        if (!query.trim()) {
            return [];
        }
        
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible, recherche locale');
            // La recherche locale sera gérée par le moteur de recherche existant
            return null;
        }
        
        // Recherche dans Supabase via la recherche plein texte PostgreSQL
        const { data, error } = await client
            .from('notes')
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`);
        
        if (error) {
            console.error('Erreur lors de la recherche des notes:', error);
            return null; // La recherche locale sera utilisée comme fallback
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
        return null; // La recherche locale sera utilisée comme fallback
    }
}

/**
 * Synchronise les notes locales avec Supabase
 * @returns {Promise<boolean>} True si la synchronisation a réussi
 */
export async function syncWithSupabase() {
    try {
        const client = getSupabaseClient();
        
        if (!client) {
            console.warn('Client Supabase non disponible');
            return false;
        }
        
        // Récupérer les notes locales
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        
        if (localNotes.length === 0) {
            return true; // Rien à synchroniser
        }
        
        // Pour chaque note locale, vérifier si elle existe dans Supabase
        for (const note of localNotes) {
            const { data, error } = await client
                .from('notes')
                .select('id, updatedAt')
                .eq('id', note.id)
                .single();
            
            if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
                console.error(`Erreur lors de la vérification de la note ${note.id}:`, error);
                continue;
            }
            
            if (!data) {
                // La note n'existe pas dans Supabase, la créer
                const { error: insertError } = await client
                    .from('notes')
                    .insert(note);
                
                if (insertError) {
                    console.error(`Erreur lors de la création de la note ${note.id}:`, insertError);
                }
            } else {
                // La note existe, vérifier quelle version est la plus récente
                const localUpdatedAt = new Date(note.updatedAt).getTime();
                const remoteUpdatedAt = new Date(data.updatedAt).getTime();
                
                if (localUpdatedAt > remoteUpdatedAt) {
                    // La version locale est plus récente, mettre à jour Supabase
                    const { error: updateError } = await client
                        .from('notes')
                        .update(note)
                        .eq('id', note.id);
                    
                    if (updateError) {
                        console.error(`Erreur lors de la mise à jour de la note ${note.id}:`, updateError);
                    }
                }
            }
        }
        
        // Récupérer toutes les notes de Supabase pour mettre à jour le localStorage
        const { data: supabaseNotes, error: fetchError } = await client
            .from('notes')
            .select('*');
        
        if (fetchError) {
            console.error('Erreur lors de la récupération des notes de Supabase:', fetchError);
            return false;
        }
        
        // Mettre à jour le localStorage avec les notes de Supabase
        localStorage.setItem('notes', JSON.stringify(supabaseNotes));
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la synchronisation avec Supabase:', error);
        return false;
    }
}

/**
 * Sauvegarde les paramètres de révision dans Supabase
 * @param {Object} settings - Paramètres de révision
 * @returns {Promise<boolean>} True si la sauvegarde a réussi
 */
export async function saveRevisitSettings(settings) {
    try {
        // Toujours sauvegarder localement
        localStorage.setItem('revisitSettings', JSON.stringify(settings));
        
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Client Supabase non disponible');
            return true; // Sauvegarde locale réussie
        }
        
        // Vérifier si les paramètres existent déjà
        const { data, error } = await client
            .from('settings')
            .select('*')
            .eq('key', 'revisitSettings')
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
            console.error('Erreur lors de la vérification des paramètres:', error);
            return true; // Sauvegarde locale réussie
        }
        
        if (!data) {
            // Les paramètres n'existent pas, les créer
            const { error: insertError } = await client
                .from('settings')
                .insert({
                    key: 'revisitSettings',
                    value: settings
                });
            
            if (insertError) {
                console.error('Erreur lors de la création des paramètres:', insertError);
                return true; // Sauvegarde locale réussie
            }
        } else {
            // Les paramètres existent, les mettre à jour
            const { error: updateError } = await client
                .from('settings')
                .update({ value: settings })
                .eq('key', 'revisitSettings');
            
            if (updateError) {
                console.error('Erreur lors de la mise à jour des paramètres:', updateError);
                return true; // Sauvegarde locale réussie
            }
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
        return true; // Sauvegarde locale réussie
    }
}

/**
 * Charge les paramètres de révision depuis Supabase
 * @returns {Promise<Object>} Paramètres de révision
 */
export async function loadRevisitSettings() {
    try {
        // Paramètres par défaut
        const defaultSettings = { section1: 7, section2: 14 };
        
        // Charger depuis localStorage d'abord
        const localSettings = localStorage.getItem('revisitSettings');
        const parsedLocalSettings = localSettings ? JSON.parse(localSettings) : defaultSettings;
        
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Client Supabase non disponible');
            return parsedLocalSettings;
        }
        
        // Charger depuis Supabase
        const { data, error } = await client
            .from('settings')
            .select('value')
            .eq('key', 'revisitSettings')
            .single();
        
        if (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            return parsedLocalSettings;
        }
        
        if (!data || !data.value) {
            // Les paramètres n'existent pas dans Supabase, utiliser les paramètres locaux
            // et les créer dans Supabase
            const { error: insertError } = await client
                .from('settings')
                .insert({
                    key: 'revisitSettings',
                    value: parsedLocalSettings
                });
            
            if (insertError) {
                console.error('Erreur lors de la création des paramètres:', insertError);
            }
            
            return parsedLocalSettings;
        }
        
        // Mettre à jour le localStorage
        localStorage.setItem('revisitSettings', JSON.stringify(data.value));
        
        return data.value;
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        
        // Paramètres par défaut
        const defaultSettings = { section1: 7, section2: 14 };
        
        // Essayer de charger depuis localStorage
        const localSettings = localStorage.getItem('revisitSettings');
        return localSettings ? JSON.parse(localSettings) : defaultSettings;
    }
}