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
        // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            console.log('Connexion anonyme pour récupérer les notes...');
            try {
                const { error: authError } = await client.auth.signInAnonymously();
                if (authError) {
                    console.error('Erreur lors de la connexion anonyme:', authError);
                    return [];
                }
            } catch (authError) {
                console.error('Exception lors de la connexion anonyme:', authError);
                return [];
            }
        }
        
        console.log('Récupération des notes depuis Supabase...');
        const { data, error } = await client
            .from('notes')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            // Vérifier si l'erreur est liée à la structure de table
            if (error.code === '42P01') {
                console.error('Table notes inexistante. Veuillez vérifier votre configuration Supabase.');
            }
            return [];
        }
        
        if (!data || !Array.isArray(data)) {
            console.warn('Données invalides reçues de Supabase:', data);
            return [];
        }
        
        console.log(`${data.length} notes récupérées depuis Supabase.`);
        
        // S'assurer que les tableaux sont correctement formatés
        return data.map(note => {
            if (!note) return null;
            
            return {
                ...note,
                id: note.id || generateUniqueId(),
                title: note.title || '',
                content: note.content || '',
                categories: Array.isArray(note.categories) ? note.categories : 
                          (typeof note.categories === 'string' ? 
                           (note.categories ? [note.categories] : []) : []),
                hashtags: Array.isArray(note.hashtags) ? note.hashtags : 
                         (typeof note.hashtags === 'string' ? 
                          (note.hashtags ? [note.hashtags] : []) : []),
                videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : 
                          (typeof note.videoUrls === 'string' ? 
                           (note.videoUrls ? [note.videoUrls] : []) : []),
                createdAt: note.createdAt || new Date().toISOString(),
                updatedAt: note.updatedAt || new Date().toISOString()
            };
        }).filter(note => note !== null); // Éliminer les notes nulles
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
    
    if (!id) {
        console.error('ID de note invalide pour la suppression');
        return false;
    }
    
    try {
        // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            console.log('Connexion anonyme pour supprimer la note...');
            try {
                const { error: authError } = await client.auth.signInAnonymously();
                if (authError) {
                    console.error('Erreur lors de la connexion anonyme pour la suppression:', authError);
                    return false;
                }
            } catch (authError) {
                console.error('Exception lors de la connexion anonyme pour la suppression:', authError);
                return false;
            }
        }
        
        console.log(`Suppression de la note ${id} dans Supabase...`);
        
        const { error } = await client
            .from('notes')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error(`Erreur lors de la suppression de la note ${id}:`, error);
            return false;
        }
        
        console.log(`Note ${id} supprimée avec succès dans Supabase.`);
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
    
    // Si la requête est vide, retourner un tableau vide
    if (!query || !query.trim()) {
        return [];
    }
    
    try {
        // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            console.log('Connexion anonyme pour la recherche...');
            try {
                const { error: authError } = await client.auth.signInAnonymously();
                if (authError) {
                    console.error('Erreur lors de la connexion anonyme pour la recherche:', authError);
                    return [];
                }
            } catch (authError) {
                console.error('Exception lors de la connexion anonyme pour la recherche:', authError);
                return [];
            }
        }
        
        // Nettoyer la requête pour éviter les problèmes d'injection SQL
        const cleanQuery = query.trim().replace(/'/g, "''");
        
        console.log(`Recherche des notes contenant "${cleanQuery}" dans Supabase...`);
        
        // Format de requête pour une recherche avancée (correspondance partielle dans plusieurs champs)
        const { data, error } = await client
            .from('notes')
            .select('*')
            .or(`title.ilike.%${cleanQuery}%,content.ilike.%${cleanQuery}%`);
        
        if (error) {
            console.error('Erreur lors de la recherche des notes:', error);
            // Vérifier si l'erreur est liée à la structure de table
            if (error.code === '42P01') {
                console.error('Table notes inexistante. Veuillez vérifier votre configuration Supabase.');
            }
            return [];
        }
        
        if (!data || !Array.isArray(data)) {
            console.warn('Données invalides reçues de Supabase lors de la recherche:', data);
            return [];
        }
        
        console.log(`${data.length} notes trouvées dans Supabase pour la recherche "${cleanQuery}".`);
        
        // S'assurer que les tableaux sont correctement formatés
        return data.map(note => {
            if (!note) return null;
            
            return {
                ...note,
                id: note.id || generateUniqueId(),
                title: note.title || '',
                content: note.content || '',
                categories: Array.isArray(note.categories) ? note.categories : 
                          (typeof note.categories === 'string' ? 
                           (note.categories ? [note.categories] : []) : []),
                hashtags: Array.isArray(note.hashtags) ? note.hashtags : 
                         (typeof note.hashtags === 'string' ? 
                          (note.hashtags ? [note.hashtags] : []) : []),
                videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : 
                          (typeof note.videoUrls === 'string' ? 
                           (note.videoUrls ? [note.videoUrls] : []) : [])
            };
        }).filter(note => note !== null); // Éliminer les notes nulles
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
        // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            console.log('Connexion anonyme pour sauvegarder la note...');
            await client.auth.signInAnonymously();
        }

        // Préparer la note avec les données correctes
        const noteToSave = {
            ...note,
            // S'assurer que toutes les propriétés sont correctement formatées
            categories: Array.isArray(note.categories) ? note.categories : 
                       (note.categories ? [note.categories] : []),
            hashtags: Array.isArray(note.hashtags) ? note.hashtags : 
                     (note.hashtags ? [note.hashtags] : []),
            videoUrls: Array.isArray(note.videoUrls) ? note.videoUrls : 
                      (note.videoUrls ? [note.videoUrls] : []),
            updatedAt: new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString()
        };
        
        if (note.id) {
            // C'est une mise à jour
            console.log(`Mise à jour de la note ${note.id} dans Supabase...`);
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
            
            console.log(`Note ${note.id} mise à jour avec succès dans Supabase.`);
            return data;
        } else {
            // C'est une création
            noteToSave.id = generateUniqueId();
            console.log(`Création d'une nouvelle note dans Supabase avec ID ${noteToSave.id}...`);
            
            const { data, error } = await client
                .from('notes')
                .insert(noteToSave)
                .select()
                .single();
            
            if (error) {
                console.error('Erreur lors de la création de la note:', error);
                // Vérifier si l'erreur est liée à la structure de table
                if (error.code === '42P01') {
                    console.error('Table notes inexistante. Veuillez vérifier votre configuration Supabase.');
                } else if (error.code === '42703') {
                    console.error('Colonne inexistante. Vérifiez que votre table a toutes les colonnes nécessaires: id, title, content, categories, hashtags, videoUrls, createdAt, updatedAt');
                }
                return null;
            }
            
            console.log(`Note créée avec succès dans Supabase avec ID ${data?.id || noteToSave.id}.`);
            return data;
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la note:', error);
        return null;
    }
}

// Paramètres de révision stockés en mémoire puisque la table settings n'existe pas
const revisitSettingsMemory = {
    section1: 7,  // valeur par défaut: 7 jours
    section2: 14  // valeur par défaut: 14 jours
};

/**
 * Charge les paramètres de révision 
 * @returns {Promise<Object>} - Les paramètres de révision (toujours depuis la mémoire)
 */
export async function loadRevisitSettings() {
    // Puisque la table settings n'existe pas, on utilise les valeurs en mémoire
    console.log('Chargement des paramètres de révision (depuis la mémoire)');
    return Promise.resolve(revisitSettingsMemory);
}

/**
 * Sauvegarde les paramètres de révision en mémoire
 * @param {Object} settings - Les paramètres de révision à sauvegarder
 * @returns {Promise<boolean>} - Toujours vrai
 */
export async function saveRevisitSettings(settings) {
    // Stocker les valeurs en mémoire
    console.log('Sauvegarde des paramètres de révision (en mémoire uniquement)');
    Object.assign(revisitSettingsMemory, settings);
    return Promise.resolve(true);
}