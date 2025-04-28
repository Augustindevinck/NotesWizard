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
export function fetchAllNotes() {
    return new Promise((resolve, reject) => {
        try {
            // Vérifier si Supabase est configuré
            if (isSupabaseConfigured()) {
                // Essayer d'utiliser Supabase d'abord
                supabaseStorage.getAllNotes().then(notes => {
                    // Si on obtient des notes valides, mettre à jour le stockage local
                    if (Array.isArray(notes) && notes.length > 0) {
                        localStorage.saveAllNotes(notes);
                        resolve(notes);
                    } else {
                        // Fallback sur le stockage local
                        resolve(localStorage.getAllNotes());
                    }
                }).catch(supabaseError => {
                    console.error('Erreur Supabase, utilisation du stockage local:', supabaseError);
                    // Fallback sur le stockage local
                    resolve(localStorage.getAllNotes());
                });
            } else {
                // Fallback sur le stockage local
                resolve(localStorage.getAllNotes());
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des notes:', error);
            resolve([]);
        }
    });
}

/**
 * Crée une nouvelle note
 * @param {Object} noteData - Données de la note
 * @returns {Promise<Object>} La note créée
 */
export async function createNote(noteData) {
    return new Promise(async (resolve, reject) => {
        try {
            // S'assurer que Supabase est configuré et connecté
            if (isSupabaseConfigured()) {
                const client = getClient();
                if (!client) {
                    await client.auth.signInAnonymously();
                }
            }

            // Créer la note dans le stockage local pour une réponse rapide
            const localNote = localStorage.createNote(noteData);

            // Vérifier si Supabase est configuré
            if (isSupabaseConfigured()) {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    client.auth.getSession().then(({ data: { session } }) => {
                        if (!session) {
                            console.log('Connexion anonyme pour la création de note...');
                            return client.auth.signInAnonymously();
                        }
                        return { data: { session } };
                    }).then(() => {
                        // Créer la note dans Supabase
                        return supabaseStorage.createNote(noteData);
                    }).then(supabaseNote => {
                        // Si la création dans Supabase a réussi, mettre à jour le stockage local
                        if (supabaseNote) {
                            // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                            return syncWithSupabase().then(() => {
                                resolve(supabaseNote);
                            });
                        } else {
                            resolve(localNote);
                        }
                    }).catch(supabaseError => {
                        console.error('Erreur lors de la création de la note dans Supabase:', supabaseError);
                        resolve(localNote);
                    });
                } else {
                    resolve(localNote);
                }
            } else {
                resolve(localNote);
            }
        } catch (error) {
            console.error('Erreur lors de la création de la note:', error);
            resolve(null);
        }
    });
}

/**
 * Met à jour une note existante
 * @param {string} noteId - ID de la note à mettre à jour
 * @param {Object} noteData - Données de la note à mettre à jour
 * @returns {Promise<Object>} La note mise à jour
 */
export function updateNote(noteId, noteData) {
    return new Promise((resolve, reject) => {
        try {
            // Mettre à jour la note dans le stockage local pour une réponse rapide
            const localUpdatedNote = localStorage.updateNote(noteId, noteData);

            // Vérifier si Supabase est configuré
            if (isSupabaseConfigured()) {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    client.auth.getSession().then(({ data: { session } }) => {
                        if (!session) {
                            console.log('Connexion anonyme pour la mise à jour de note...');
                            return client.auth.signInAnonymously();
                        }
                        return { data: { session } };
                    }).then(() => {
                        // Mettre à jour la note dans Supabase
                        return supabaseStorage.updateNote(noteId, noteData);
                    }).then(supabaseUpdatedNote => {
                        // Si la mise à jour dans Supabase a réussi, mettre à jour le stockage local
                        if (supabaseUpdatedNote) {
                            // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                            return syncWithSupabase().then(() => {
                                resolve(supabaseUpdatedNote);
                            });
                        } else {
                            resolve(localUpdatedNote);
                        }
                    }).catch(supabaseError => {
                        console.error('Erreur lors de la mise à jour de la note dans Supabase:', supabaseError);
                        resolve(localUpdatedNote);
                    });
                } else {
                    resolve(localUpdatedNote);
                }
            } else {
                resolve(localUpdatedNote);
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la note:', error);
            resolve(null);
        }
    });
}

/**
 * Supprime une note
 * @param {string} noteId - ID de la note à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export function deleteNote(noteId) {
    return new Promise((resolve, reject) => {
        try {
            // Supprimer la note du stockage local pour une réponse rapide
            localStorage.deleteNote(noteId);

            // Vérifier si Supabase est configuré
            if (isSupabaseConfigured()) {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    client.auth.getSession().then(({ data: { session } }) => {
                        if (!session) {
                            console.log('Connexion anonyme pour la suppression de note...');
                            return client.auth.signInAnonymously();
                        }
                        return { data: { session } };
                    }).then(() => {
                        // Supprimer la note dans Supabase
                        return supabaseStorage.deleteNote(noteId);
                    }).then(success => {
                        // Si la suppression dans Supabase a réussi, mettre à jour le stockage local
                        if (success) {
                            // Mettre à jour toutes les notes locales pour s'assurer que tout est synchronisé
                            return syncWithSupabase().then(() => {
                                resolve(true);
                            });
                        } else {
                            resolve(true);
                        }
                    }).catch(supabaseError => {
                        console.error('Erreur lors de la suppression de la note dans Supabase:', supabaseError);
                        resolve(true);
                    });
                } else {
                    resolve(true);
                }
            } else {
                resolve(true);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la note:', error);
            resolve(false);
        }
    });
}

/**
 * Recherche des notes
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>} Notes correspondant à la recherche
 */
export function searchNotes(query) {
    return new Promise((resolve, reject) => {
        try {
            if (!query.trim()) {
                resolve([]);
                return;
            }

            // Vérifier si Supabase est configuré
            if (isSupabaseConfigured()) {
                // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
                const client = getClient();
                if (client) {
                    client.auth.getSession().then(({ data: { session } }) => {
                        if (!session) {
                            console.log('Connexion anonyme pour la recherche...');
                            return client.auth.signInAnonymously();
                        }
                        return { data: { session } };
                    }).then(() => {
                        // Rechercher dans Supabase pour de meilleurs résultats
                        return supabaseStorage.searchNotes(query);
                    }).then(supabaseResults => {
                        // Si la recherche dans Supabase a réussi, retourner les résultats
                        if (Array.isArray(supabaseResults) && supabaseResults.length > 0) {
                            resolve(supabaseResults);
                        } else {
                            // Fallback sur le stockage local
                            resolve(localStorage.searchNotes(query));
                        }
                    }).catch(supabaseError => {
                        console.error('Erreur lors de la recherche dans Supabase:', supabaseError);
                        // Fallback sur le stockage local
                        resolve(localStorage.searchNotes(query));
                    });
                } else {
                    // Fallback sur le stockage local
                    resolve(localStorage.searchNotes(query));
                }
            } else {
                // Fallback sur le stockage local
                resolve(localStorage.searchNotes(query));
            }
        } catch (error) {
            console.error('Erreur lors de la recherche des notes:', error);
            resolve([]);
        }
    });
}

/**
 * Synchronise les notes entre le stockage local et Supabase
 * @returns {Promise<boolean>} True si la synchronisation a réussi
 */
export function syncWithSupabase() {
    return new Promise((resolve, reject) => {
        try {
            // Vérifier si Supabase est configuré
            if (!isSupabaseConfigured()) {
                resolve(false);
                return;
            }

            // Vérifier si l'utilisateur est connecté, sinon se connecter de manière anonyme
            const client = getClient();
            if (client) {
                client.auth.getSession().then(({ data: { session } }) => {
                    if (!session) {
                        console.log('Connexion anonyme pour la synchronisation...');
                        return client.auth.signInAnonymously();
                    }
                    return { data: { session } };
                }).then(() => {
                    // Récupérer les notes locales et de Supabase
                    const localNotes = localStorage.getAllNotes();
                    return supabaseStorage.getAllNotes().then(supabaseNotes => {
                        return { localNotes, supabaseNotes };
                    });
                }).then(({ localNotes, supabaseNotes }) => {
                    // Créer un map des notes Supabase pour faciliter la recherche
                    const supabaseNotesMap = new Map();
                    supabaseNotes.forEach(note => supabaseNotesMap.set(note.id, note));

                    // Traiter les notes locales
                    const promises = [];
                    for (const localNote of localNotes) {
                        const supabaseNote = supabaseNotesMap.get(localNote.id);

                        if (!supabaseNote) {
                            // La note locale n'existe pas dans Supabase, la créer
                            promises.push(supabaseStorage.createNote({
                                ...localNote,
                                // Préserver les dates originales
                                createdAt: localNote.createdAt,
                                updatedAt: localNote.updatedAt
                            }));
                        } else {
                            // Comparer les dates de mise à jour pour déterminer quelle version est la plus récente
                            const localUpdatedAt = new Date(localNote.updatedAt).getTime();
                            const supabaseUpdatedAt = new Date(supabaseNote.updatedAt).getTime();

                            if (localUpdatedAt > supabaseUpdatedAt) {
                                // La version locale est plus récente, mettre à jour Supabase
                                promises.push(supabaseStorage.updateNote(localNote.id, localNote));
                            }
                        }

                        // Supprimer de la map pour garder trace des notes qui n'existent que dans Supabase
                        supabaseNotesMap.delete(localNote.id);
                    }

                    // Les notes restantes dans supabaseNotesMap existent uniquement dans Supabase
                    // Les ajouter au stockage local
                    const allNotes = localStorage.getAllNotes();
                    for (const [id, note] of supabaseNotesMap.entries()) {
                        allNotes.push(note);
                    }
                    localStorage.saveAllNotes(allNotes);

                    // Attendre que toutes les opérations soient terminées
                    return Promise.all(promises).then(() => {
                        // Récupérer les notes mises à jour de Supabase
                        return supabaseStorage.getAllNotes();
                    }).then(updatedSupabaseNotes => {
                        // Mettre à jour le stockage local avec les notes mises à jour
                        localStorage.saveAllNotes(updatedSupabaseNotes);
                        resolve(true);
                    });
                }).catch(error => {
                    console.error('Erreur lors de la synchronisation avec Supabase:', error);
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        } catch (error) {
            console.error('Erreur lors de la synchronisation avec Supabase:', error);
            resolve(false);
        }
    });
}

/**
 * Sauvegarde les paramètres de révision
 * @param {Object} settings - Paramètres de révision
 * @returns {Promise<boolean>} True si la sauvegarde a réussi
 */
export function saveRevisitSettings(settings) {
    return new Promise((resolve, reject) => {
        try {
            // Sauvegarder uniquement dans le stockage local
            console.log('Sauvegarde des paramètres de révision dans le stockage local');
            localStorage.saveSettings('revisitSettings', settings);
            resolve(true);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des paramètres:', error);
            resolve(false);
        }
    });
}

/**
 * Charge les paramètres de révision
 * @returns {Promise<Object>} Paramètres de révision
 */
export function loadRevisitSettings() {
    return new Promise((resolve, reject) => {
        try {
            // Paramètres par défaut
            const defaultSettings = { section1: 7, section2: 14 };

            // Utiliser seulement le stockage local, car Supabase n'a pas de table settings
            console.log('Chargement des paramètres de révision depuis le stockage local');
            const localSettings = localStorage.getSettings('revisitSettings', defaultSettings);

            resolve(localSettings);
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            resolve({ section1: 7, section2: 14 });
        }
    });
}