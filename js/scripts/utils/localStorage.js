/**
 * Gestion du stockage local pour les notes
 */

import { generateUniqueId } from './domHelpers.js';

// Clés de stockage local
const NOTES_STORAGE_KEY = 'notes';
const SETTINGS_STORAGE_KEY = 'settings_';

/**
 * Récupère toutes les notes depuis le stockage local
 * @returns {Array} - Tableau de notes
 */
export function getAllNotes() {
    try {
        const notesJson = localStorage.getItem(NOTES_STORAGE_KEY);
        return notesJson ? JSON.parse(notesJson) : [];
    } catch (error) {
        console.error('Erreur lors de la récupération des notes du localStorage:', error);
        return [];
    }
}

/**
 * Récupère une note spécifique par son ID
 * @param {string} id - ID de la note
 * @returns {Object|null} - Note trouvée ou null
 */
export function getNote(id) {
    try {
        const notes = getAllNotes();
        return notes.find(note => note.id === id) || null;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la note ${id} du localStorage:`, error);
        return null;
    }
}

/**
 * Sauvegarde toutes les notes dans le stockage local
 * @param {Array} notes - Tableau de notes à sauvegarder
 * @returns {boolean} - Vrai si la sauvegarde a réussi
 */
export function saveAllNotes(notes) {
    try {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
        return true;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes dans le localStorage:', error);
        return false;
    }
}

/**
 * Crée une nouvelle note dans le stockage local
 * @param {Object} noteData - Données de la note
 * @returns {Object} - Note créée
 */
export function createNote(noteData) {
    try {
        const notes = getAllNotes();
        
        // Créer la nouvelle note avec un ID unique et des dates
        const newNote = {
            id: generateUniqueId(),
            ...noteData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Ajouter la note au tableau et sauvegarder
        notes.push(newNote);
        saveAllNotes(notes);
        
        return newNote;
    } catch (error) {
        console.error('Erreur lors de la création de la note dans le localStorage:', error);
        return null;
    }
}

/**
 * Met à jour une note existante dans le stockage local
 * @param {string} id - ID de la note à mettre à jour
 * @param {Object} noteData - Nouvelles données de la note
 * @returns {Object|null} - Note mise à jour ou null
 */
export function updateNote(id, noteData) {
    try {
        const notes = getAllNotes();
        const noteIndex = notes.findIndex(note => note.id === id);
        
        if (noteIndex === -1) {
            console.warn(`Note ${id} non trouvée dans le localStorage pour mise à jour`);
            return null;
        }
        
        // Mettre à jour la note
        const updatedNote = {
            ...notes[noteIndex],
            ...noteData,
            updatedAt: new Date().toISOString()
        };
        
        notes[noteIndex] = updatedNote;
        saveAllNotes(notes);
        
        return updatedNote;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la note ${id} dans le localStorage:`, error);
        return null;
    }
}

/**
 * Supprime une note du stockage local
 * @param {string} id - ID de la note à supprimer
 * @returns {boolean} - Vrai si la suppression a réussi
 */
export function deleteNote(id) {
    try {
        const notes = getAllNotes();
        const filteredNotes = notes.filter(note => note.id !== id);
        
        // Si aucune note n'a été supprimée
        if (filteredNotes.length === notes.length) {
            console.warn(`Note ${id} non trouvée dans le localStorage pour suppression`);
            return false;
        }
        
        saveAllNotes(filteredNotes);
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la note ${id} du localStorage:`, error);
        return false;
    }
}

/**
 * Recherche des notes dans le stockage local
 * @param {string} query - Terme de recherche
 * @returns {Array} - Notes correspondant à la recherche
 */
export function searchNotes(query) {
    try {
        if (!query.trim()) {
            return [];
        }
        
        const notes = getAllNotes();
        const lowercasedQuery = query.toLowerCase();
        
        return notes.filter(note => {
            const title = note.title?.toLowerCase() || '';
            const content = note.content?.toLowerCase() || '';
            const categories = Array.isArray(note.categories) ? note.categories.join(' ').toLowerCase() : '';
            const hashtags = Array.isArray(note.hashtags) ? note.hashtags.join(' ').toLowerCase() : '';
            
            return title.includes(lowercasedQuery) || 
                   content.includes(lowercasedQuery) || 
                   categories.includes(lowercasedQuery) || 
                   hashtags.includes(lowercasedQuery);
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des notes dans le localStorage:', error);
        return [];
    }
}

/**
 * Sauvegarde un paramètre dans le stockage local
 * @param {string} key - Clé du paramètre
 * @param {any} value - Valeur du paramètre
 * @returns {boolean} - Vrai si la sauvegarde a réussi
 */
export function saveSettings(key, value) {
    try {
        localStorage.setItem(`${SETTINGS_STORAGE_KEY}${key}`, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde du paramètre ${key} dans le localStorage:`, error);
        return false;
    }
}

/**
 * Récupère un paramètre du stockage local
 * @param {string} key - Clé du paramètre
 * @param {any} defaultValue - Valeur par défaut si le paramètre n'existe pas
 * @returns {any} - Valeur du paramètre
 */
export function getSettings(key, defaultValue = null) {
    try {
        const valueJson = localStorage.getItem(`${SETTINGS_STORAGE_KEY}${key}`);
        return valueJson ? JSON.parse(valueJson) : defaultValue;
    } catch (error) {
        console.error(`Erreur lors de la récupération du paramètre ${key} du localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Supprime un paramètre du stockage local
 * @param {string} key - Clé du paramètre
 * @returns {boolean} - Vrai si la suppression a réussi
 */
export function deleteSettings(key) {
    try {
        localStorage.removeItem(`${SETTINGS_STORAGE_KEY}${key}`);
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression du paramètre ${key} du localStorage:`, error);
        return false;
    }
}

/**
 * Efface toutes les données du stockage local
 * @returns {boolean} - Vrai si l'effacement a réussi
 */
export function clearAllData() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'effacement des données du localStorage:', error);
        return false;
    }
}