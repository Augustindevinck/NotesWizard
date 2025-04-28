/**
 * Service pour gérer les opérations avec Supabase
 * Fournit une interface unifiée entre le stockage local et Supabase
 */

import { getSupabaseClient, loadSupabaseFromLocalStorage, isSupabaseConfigured } from './supabaseDirectConfig.js';
import * as supabaseStorage from './supabaseStorage.js';
import * as localStorage from './localStorage.js';
import { getClient } from './supabaseClient.js';

/**
 * Récupère toutes les notes depuis la source de données appropriée
 * @returns {Promise<Array>} Tableau de notes
 */
export async function fetchAllNotes() {
    try {
        // Vérifier si Supabase est configuré
        if (isSupabaseConfigured()) {
            // Essayer d'utiliser Supabase d'abord
            try {
                const notes = await supabaseStorage.getAllNotes();

                // Si on obtient des notes valides, mettre à jour le stockage local
                if (Array.isArray(notes) && notes.length > 0) {
                    localStorage.saveAllNotes(notes);
                    return notes;
                }
            } catch (supabaseError) {
                console.error('Erreur Supabase, utilisation du stockage local:', supabaseError);
            }
        }

        // Fallback sur le stockage local
        return localStorage.getAllNotes();
    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        return [];
    }
}

/**
 * Crée une nouvelle note
 * @param {Object} noteData - Données de la note
 * @returns {Promise<Object>} La note créée
 */
export async function createNote(noteData) {
    try {
        // Créer la note dans le stockage local pour une réponse rapide
        const localNote = localStorage.createNote(noteData);

        // Vérifier si Supabase est configuré
        if (isSupabaseConfigured()) {
            try {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (!session) {
                        console.log('Connexion anonyme pour la création de note...');
                        await client.auth.signInAnonymously();
                    }
                }

                // S'assurer que categories est un tableau
                const processedData = {
                    ...noteData,
                    categories: Array.isArray(noteData.categories) ? noteData.categories : [],
                    hashtags: Array.isArray(noteData.hashtags) ? noteData.hashtags : [],
                    videoUrls: Array.isArray(noteData.videoUrls) ? noteData.videoUrls : []
                };

                // Créer la note dans Supabase
                const supabaseNote = await supabaseStorage.createNote(processedData);

                // Si la création dans Supabase a réussi, mettre à jour le stockage local
                if (supabaseNote) {
                    // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                    await syncWithSupabase();
                    return supabaseNote;
                }
            } catch (supabaseError) {
                console.error('Erreur lors de la création de la note dans Supabase:', supabaseError);
            }
        }

        return localNote;
    } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        return null;
    }
}

/**
 * Met à jour une note existante
 * @param {string} noteId - ID de la note à mettre à jour
 * @param {Object} noteData - Données de la note à mettre à jour
 * @returns {Promise<Object>} La note mise à jour
 */
export async function updateNote(noteId, noteData) {
    try {
        // Mettre à jour la note dans le stockage local pour une réponse rapide
        const localUpdatedNote = localStorage.updateNote(noteId, noteData);

        // Vérifier si Supabase est configuré
        if (isSupabaseConfigured()) {
            try {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (!session) {
                        console.log('Connexion anonyme pour la mise à jour de note...');
                        await client.auth.signInAnonymously();
                    }
                }

                // Mettre à jour la note dans Supabase
                const supabaseUpdatedNote = await supabaseStorage.updateNote(noteId, noteData);

                // Si la mise à jour dans Supabase a réussi, mettre à jour le stockage local
                if (supabaseUpdatedNote) {
                    // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                    await syncWithSupabase();
                    return supabaseUpdatedNote;
                }
            } catch (supabaseError) {
                console.error('Erreur lors de la mise à jour de la note dans Supabase:', supabaseError);
            }
        }

        return localUpdatedNote;
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la note:', error);
        return null;
    }
}

/**
 * Supprime une note
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteNote(noteId) {
    try {
        // Supprimer de Supabase si configuré
        if (isSupabaseConfigured()) {
            // Vérifier la connexion anonyme
            const client = getClient();
            if (client) {
                const { data: { session } } = await client.auth.getSession();
                if (!session) {
                    console.log('Connexion anonyme pour la suppression...');
                    await client.auth.signInAnonymously();
                }
            }
            
            // Supprimer de Supabase
            const success = await supabaseStorage.deleteNote(noteId);
            if (!success) {
                throw new Error('Échec de la suppression dans Supabase');
            }
        }
        
        // Supprimer du localStorage
        localStorage.deleteNote(noteId);
        
        // Forcer une synchronisation
        await syncWithSupabase();
        
        return true;
            try {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (!session) {
                        console.log('Connexion anonyme pour la suppression de note...');
                        await client.auth.signInAnonymously();
                    }
                }

                // Supprimer la note dans Supabase
                const success = await supabaseStorage.deleteNote(noteId);

                // Si la suppression dans Supabase a réussi, mettre à jour le stockage local
                if (success) {
                    // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                    await syncWithSupabase();
                }

                return success;
            } catch (supabaseError) {
                console.error('Erreur lors de la suppression de la note dans Supabase:', supabaseError);
            }
        }

        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        return false;
    }
}

/**
 * Recherche des notes
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} Notes correspondant à la recherche
 */
export async function searchNotes(query) {
    try {
        if (!query.trim()) {
            return [];
        }

        // Vérifier si Supabase est configuré
        if (isSupabaseConfigured()) {
            try {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    const { data: { session } } = await client.auth.getSession();
                    if (!session) {
                        console.log('Connexion anonyme pour la recherche...');
                        await client.auth.signInAnonymously();
                    }
                }

                // Rechercher dans Supabase pour de meilleurs résultats
                const supabaseResults = await supabaseStorage.searchNotes(query);

                // Si la recherche dans Supabase a réussi, retourner les résultats
                if (Array.isArray(supabaseResults) && supabaseResults.length > 0) {
                    return supabaseResults;
                }
            } catch (supabaseError) {
                console.error('Erreur lors de la recherche dans Supabase:', supabaseError);
            }
        }

        // Fallback sur le stockage local
        return localStorage.searchNotes(query);
    } catch (error) {
        console.error('Erreur lors de la recherche des notes:', error);
        return [];
    }
}

/**
 * Synchronise les notes entre le stockage local et Supabase
 * @returns {Promise<boolean>} True si la synchronisation a réussi
 */
export async function syncWithSupabase() {
    try {
        // Vérifier si Supabase est configuré
        if (!isSupabaseConfigured()) {
            return false;
        }

        // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
        const client = getClient();
        if (client) {
            const { data: { session } } = await client.auth.getSession();
            if (!session) {
                console.log('Connexion anonyme pour la synchronisation...');
                await client.auth.signInAnonymously();
            }
        }

        // Récupérer les notes locales
        const localNotes = localStorage.getAllNotes();

        // Récupérer les notes de Supabase
        const supabaseNotes = await supabaseStorage.getAllNotes();

        // Créer un map des notes Supabase pour faciliter la recherche
        const supabaseNotesMap = new Map();
        supabaseNotes.forEach(note => supabaseNotesMap.set(note.id, note));

        // Traiter les notes locales
        for (const localNote of localNotes) {
            const supabaseNote = supabaseNotesMap.get(localNote.id);

            if (!supabaseNote) {
                // La note locale n'existe pas dans Supabase, la créer
                await supabaseStorage.createNote({
                    ...localNote,
                    // Préserver les dates originales
                    createdAt: localNote.createdAt,
                    updatedAt: localNote.updatedAt
                });
            } else {
                // Comparer les dates de mise à jour pour déterminer quelle version est la plus récente
                const localUpdatedAt = new Date(localNote.updatedAt).getTime();
                const supabaseUpdatedAt = new Date(supabaseNote.updatedAt).getTime();

                if (localUpdatedAt > supabaseUpdatedAt) {
                    // La version locale est plus récente, mettre à jour Supabase
                    await supabaseStorage.updateNote(localNote.id, localNote);
                }
            }

            // Supprimer de la map pour garder trace des notes qui n'existent que dans Supabase
            supabaseNotesMap.delete(localNote.id);
        }

        // Les notes restantes dans supabaseNotesMap existent uniquement dans Supabase
        // Les ajouter au stockage local
        for (const [id, note] of supabaseNotesMap.entries()) {
            // Ajouter la note au stockage local, mais ne pas la créer à nouveau dans Supabase
            const allNotes = localStorage.getAllNotes();
            allNotes.push(note);
            localStorage.saveAllNotes(allNotes);
        }

        // Récupérer les notes mises à jour de Supabase
        const updatedSupabaseNotes = await supabaseStorage.getAllNotes();

        // Mettre à jour le stockage local avec les notes mises à jour
        localStorage.saveAllNotes(updatedSupabaseNotes);

        return true;
    } catch (error) {
        console.error('Erreur lors de la synchronisation avec Supabase:', error);
        return false;
    }
}

/**
 * Sauvegarde les paramètres de révision
 * @param {Object} settings - Paramètres de révision
 * @returns {Promise<boolean>} True si la sauvegarde a réussi
 */
export async function saveRevisitSettings(settings) {
    try {
        // Sauvegarder uniquement dans le stockage local
        console.log('Sauvegarde des paramètres de révision dans le stockage local');
        localStorage.saveSettings('revisitSettings', settings);

        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
        return false;
    }
}

/**
 * Charge les paramètres de révision
 * @returns {Promise<Object>} Paramètres de révision
 */
export async function loadRevisitSettings() {
    try {
        // Paramètres par défaut
        const defaultSettings = { section1: 7, section2: 14 };

        // Utiliser seulement le stockage local, car Supabase n'a pas de table settings
        console.log('Chargement des paramètres de révision depuis le stockage local');
        const localSettings = localStorage.getSettings('revisitSettings', defaultSettings);

        return localSettings;
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        return { section1: 7, section2: 14 };
    }
}