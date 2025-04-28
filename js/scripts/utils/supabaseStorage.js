/**
 * Fonctions utilitaires pour l'interaction avec Supabase
 */

import { getSupabaseClient, isSupabaseInitialized } from './supabaseClient.js';
import { loadNotes as loadLocalNotes, saveNotes as saveLocalNotes } from './localStorage.js';

/**
 * Charge les notes depuis Supabase
 * @returns {Promise<Array>} Tableau de notes
 */
export async function loadNotes() {
    try {
        // Si Supabase n'est pas initialisé, utiliser le stockage local
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, utilisation du stockage local');
            return loadLocalNotes();
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) {
            console.error('Erreur lors du chargement des notes de Supabase:', error);
            // Fallback vers le stockage local
            return loadLocalNotes();
        }

        // Transformation des données si nécessaire (par exemple, conversion des champs JSON stockés en tant que texte)
        return data.map(note => ({
            ...note,
            categories: typeof note.categories === 'string' ? JSON.parse(note.categories) : (note.categories || []),
            hashtags: typeof note.hashtags === 'string' ? JSON.parse(note.hashtags) : (note.hashtags || []),
            videoUrls: typeof note.videoUrls === 'string' ? JSON.parse(note.videoUrls) : (note.videoUrls || []),
        }));
    } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        // En cas d'erreur, essayer de récupérer les notes depuis le stockage local
        return loadLocalNotes();
    }
}

/**
 * Sauvegarde une note dans Supabase
 * @param {Object} note - Note à sauvegarder
 * @returns {Promise<Object>} La note sauvegardée
 */
export async function saveNote(note) {
    try {
        // Si Supabase n'est pas initialisé, sauvegarder localement
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, sauvegarde locale uniquement');
            const notes = loadLocalNotes();
            const existingIndex = notes.findIndex(n => n.id === note.id);
            
            if (existingIndex >= 0) {
                notes[existingIndex] = note;
            } else {
                notes.push(note);
            }
            
            saveLocalNotes(notes);
            return note;
        }

        const supabase = getSupabaseClient();
        
        // Préparer la note pour la sauvegarde
        const noteToSave = {
            ...note,
            // Convertir les tableaux en JSON si ce n'est pas déjà fait
            categories: Array.isArray(note.categories) ? JSON.stringify(note.categories) : note.categories,
            hashtags: Array.isArray(note.hashtags) ? JSON.stringify(note.hashtags) : note.hashtags,
            videoUrls: Array.isArray(note.videoUrls) ? JSON.stringify(note.videoUrls) : note.videoUrls,
        };

        // Upsert: insertion ou mise à jour si existe déjà
        const { data, error } = await supabase
            .from('notes')
            .upsert(noteToSave)
            .select();

        if (error) {
            console.error('Erreur lors de la sauvegarde de la note dans Supabase:', error);
            throw error;
        }

        // Sauvegarder aussi localement pour la résilience
        const localNotes = loadLocalNotes();
        const existingIndex = localNotes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
            localNotes[existingIndex] = note;
        } else {
            localNotes.push(note);
        }
        
        saveLocalNotes(localNotes);

        return data[0] || note;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la note:', error);
        
        // En cas d'erreur, sauvegarder uniquement dans le stockage local
        const notes = loadLocalNotes();
        const existingIndex = notes.findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
            notes[existingIndex] = note;
        } else {
            notes.push(note);
        }
        
        saveLocalNotes(notes);
        return note;
    }
}

/**
 * Sauvegarde plusieurs notes dans Supabase
 * @param {Array} notes - Tableau de notes à sauvegarder
 */
export async function saveNotes(notes) {
    try {
        // Toujours sauvegarder localement pour la résilience
        saveLocalNotes(notes);
        
        // Si Supabase n'est pas initialisé, s'arrêter ici
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, sauvegarde locale uniquement');
            return;
        }

        const supabase = getSupabaseClient();
        
        // Préparer les notes pour la sauvegarde
        const notesToSave = notes.map(note => ({
            ...note,
            // Convertir les tableaux en JSON si ce n'est pas déjà fait
            categories: Array.isArray(note.categories) ? JSON.stringify(note.categories) : note.categories,
            hashtags: Array.isArray(note.hashtags) ? JSON.stringify(note.hashtags) : note.hashtags,
            videoUrls: Array.isArray(note.videoUrls) ? JSON.stringify(note.videoUrls) : note.videoUrls,
        }));

        // Utiliser upsert pour la sauvegarde en masse
        const { error } = await supabase
            .from('notes')
            .upsert(notesToSave);

        if (error) {
            console.error('Erreur lors de la sauvegarde des notes dans Supabase:', error);
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes:', error);
        // En cas d'erreur, les notes sont déjà sauvegardées localement
    }
}

/**
 * Supprime une note de Supabase
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteNote(noteId) {
    try {
        // Supprimer localement d'abord pour la résilience
        const localNotes = loadLocalNotes();
        const updatedNotes = localNotes.filter(note => note.id !== noteId);
        saveLocalNotes(updatedNotes);
        
        // Si Supabase n'est pas initialisé, s'arrêter ici
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, suppression locale uniquement');
            return true;
        }

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) {
            console.error('Erreur lors de la suppression de la note dans Supabase:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        return false;
    }
}

/**
 * Recherche des notes dans Supabase
 * @param {string} query - Requête de recherche
 * @returns {Promise<Array>} Tableau de notes correspondant à la recherche
 */
export async function searchNotes(query) {
    try {
        // Si Supabase n'est pas initialisé, rechercher localement
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, recherche locale uniquement');
            // La recherche locale sera effectuée par le gestionnaire de recherche
            return null;
        }

        const supabase = getSupabaseClient();
        
        // Utiliser la fonction de recherche full-text de Postgres si disponible
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .textSearch('content', query, {
                config: 'french',  // Utiliser la configuration française pour la recherche
                type: 'plain'      // Utiliser la recherche en texte brut
            });

        if (error) {
            console.error('Erreur lors de la recherche des notes dans Supabase:', error);
            return null;  // La recherche locale sera utilisée comme fallback
        }

        // Transformation des données si nécessaire
        return data.map(note => ({
            ...note,
            categories: typeof note.categories === 'string' ? JSON.parse(note.categories) : (note.categories || []),
            hashtags: typeof note.hashtags === 'string' ? JSON.parse(note.hashtags) : (note.hashtags || []),
            videoUrls: typeof note.videoUrls === 'string' ? JSON.parse(note.videoUrls) : (note.videoUrls || []),
        }));
    } catch (error) {
        console.error('Erreur lors de la recherche des notes:', error);
        return null;  // La recherche locale sera utilisée comme fallback
    }
}

/**
 * Synchronise les notes locales avec Supabase
 * Utile lors de la connexion initiale ou après une période hors ligne
 * @returns {Promise<boolean>} True si la synchronisation a réussi
 */
export async function syncNotes() {
    try {
        // Si Supabase n'est pas initialisé, impossible de synchroniser
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, impossible de synchroniser');
            return false;
        }

        // Charger les notes locales
        const localNotes = loadLocalNotes();
        
        // Charger les notes de Supabase
        const supabase = getSupabaseClient();
        const { data: remoteNotes, error } = await supabase
            .from('notes')
            .select('*');

        if (error) {
            console.error('Erreur lors de la récupération des notes depuis Supabase:', error);
            return false;
        }

        // Mapper les notes distantes pour faciliter la comparaison
        const remoteNotesMap = new Map();
        remoteNotes.forEach(note => {
            // Transformer les données si nécessaire
            const transformedNote = {
                ...note,
                categories: typeof note.categories === 'string' ? JSON.parse(note.categories) : (note.categories || []),
                hashtags: typeof note.hashtags === 'string' ? JSON.parse(note.hashtags) : (note.hashtags || []),
                videoUrls: typeof note.videoUrls === 'string' ? JSON.parse(note.videoUrls) : (note.videoUrls || []),
            };
            remoteNotesMap.set(note.id, transformedNote);
        });

        // Notes à ajouter ou mettre à jour dans Supabase
        const notesToUpsert = [];
        
        // Comparer les notes locales avec les notes distantes
        localNotes.forEach(localNote => {
            const remoteNote = remoteNotesMap.get(localNote.id);
            
            // Si la note n'existe pas à distance ou si la version locale est plus récente
            if (!remoteNote || new Date(localNote.updatedAt) > new Date(remoteNote.updatedAt)) {
                notesToUpsert.push({
                    ...localNote,
                    // Convertir les tableaux en JSON
                    categories: JSON.stringify(localNote.categories || []),
                    hashtags: JSON.stringify(localNote.hashtags || []),
                    videoUrls: JSON.stringify(localNote.videoUrls || []),
                });
            }
        });

        // Notes à ajouter localement
        const notesToAddLocally = [];
        
        // Identifier les notes distantes qui n'existent pas localement
        remoteNotesMap.forEach((remoteNote, id) => {
            const exists = localNotes.some(note => note.id === id);
            if (!exists) {
                notesToAddLocally.push(remoteNote);
            }
        });

        // Effectuer la synchronisation

        // 1. Mettre à jour Supabase avec les nouvelles notes locales
        if (notesToUpsert.length > 0) {
            const { error: upsertError } = await supabase
                .from('notes')
                .upsert(notesToUpsert);

            if (upsertError) {
                console.error('Erreur lors de la mise à jour des notes dans Supabase:', upsertError);
            }
        }

        // 2. Ajouter les notes distantes manquantes au stockage local
        if (notesToAddLocally.length > 0) {
            const updatedLocalNotes = [...localNotes, ...notesToAddLocally];
            saveLocalNotes(updatedLocalNotes);
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la synchronisation des notes:', error);
        return false;
    }
}

/**
 * Charge les paramètres de révision depuis Supabase ou localStorage
 * @returns {Promise<Object>} Paramètres de révision
 */
export async function loadRevisitSettings() {
    try {
        // Si Supabase n'est pas initialisé, utiliser le stockage local
        if (!isSupabaseInitialized()) {
            return JSON.parse(localStorage.getItem('revisitSettings') || '{"section1": 7, "section2": 14}');
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'revisitSettings')
            .single();

        if (error) {
            // Si la configuration n'existe pas encore dans Supabase, utiliser la configuration locale
            if (error.code === 'PGRST116') { // "No rows found" error
                const localSettings = JSON.parse(localStorage.getItem('revisitSettings') || '{"section1": 7, "section2": 14}');
                // Créer la configuration dans Supabase pour la prochaine fois
                await supabase
                    .from('settings')
                    .insert({
                        key: 'revisitSettings',
                        value: localSettings
                    });
                return localSettings;
            }
            
            console.error('Erreur lors du chargement des paramètres de révision:', error);
            return JSON.parse(localStorage.getItem('revisitSettings') || '{"section1": 7, "section2": 14}');
        }

        return data.value;
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres de révision:', error);
        return JSON.parse(localStorage.getItem('revisitSettings') || '{"section1": 7, "section2": 14}');
    }
}

/**
 * Sauvegarde les paramètres de révision dans Supabase et localStorage
 * @param {Object} settings - Paramètres de révision à sauvegarder
 */
export async function saveRevisitSettings(settings) {
    try {
        // Sauvegarder localement en premier pour la résilience
        localStorage.setItem('revisitSettings', JSON.stringify(settings));
        
        // Si Supabase n'est pas initialisé, s'arrêter ici
        if (!isSupabaseInitialized()) {
            return;
        }

        const supabase = getSupabaseClient();
        
        // Essayer de mettre à jour d'abord
        const { error: updateError } = await supabase
            .from('settings')
            .update({ value: settings })
            .eq('key', 'revisitSettings');

        // Si la mise à jour échoue (probablement parce que la clé n'existe pas), insérer
        if (updateError) {
            const { error: insertError } = await supabase
                .from('settings')
                .insert({
                    key: 'revisitSettings',
                    value: settings
                });

            if (insertError) {
                console.error('Erreur lors de l\'insertion des paramètres de révision:', insertError);
            }
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres de révision:', error);
    }
}

/**
 * Importe des notes depuis un fichier JSON et les synchronise avec Supabase
 * @param {Array} importedNotes - Notes importées depuis un fichier JSON
 * @returns {Promise<boolean>} True si l'importation a réussi
 */
export async function importNotesFromJson(importedNotes) {
    try {
        // Si Supabase n'est pas initialisé, utiliser uniquement le stockage local
        if (!isSupabaseInitialized()) {
            console.warn('Supabase non initialisé, importation locale uniquement');
            // Importer localement
            const localNotes = loadLocalNotes();
            const combinedNotes = [...localNotes, ...importedNotes];
            saveLocalNotes(combinedNotes);
            return true;
        }

        // Préparer les notes pour la sauvegarde dans Supabase
        const notesToSave = importedNotes.map(note => ({
            ...note,
            // Convertir les tableaux en JSON si ce n'est pas déjà fait
            categories: Array.isArray(note.categories) ? JSON.stringify(note.categories) : note.categories,
            hashtags: Array.isArray(note.hashtags) ? JSON.stringify(note.hashtags) : note.hashtags,
            videoUrls: Array.isArray(note.videoUrls) ? JSON.stringify(note.videoUrls) : note.videoUrls,
        }));

        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('notes')
            .upsert(notesToSave);

        if (error) {
            console.error('Erreur lors de l\'importation des notes dans Supabase:', error);
            
            // En cas d'erreur, sauvegarder uniquement en local
            const localNotes = loadLocalNotes();
            const combinedNotes = [...localNotes, ...importedNotes];
            saveLocalNotes(combinedNotes);
        }

        // Synchroniser pour s'assurer que tout est cohérent
        await syncNotes();
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'importation des notes:', error);
        
        // En cas d'erreur, essayer de sauvegarder localement
        try {
            const localNotes = loadLocalNotes();
            const combinedNotes = [...localNotes, ...importedNotes];
            saveLocalNotes(combinedNotes);
            return true;
        } catch (localError) {
            console.error('Erreur lors de la sauvegarde locale des notes importées:', localError);
            return false;
        }
    }
}