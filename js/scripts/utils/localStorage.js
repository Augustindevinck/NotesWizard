/**
 * Gestionnaire simplifié du stockage local
 * Version adaptée pour éviter les problèmes de synchronisation
 */

import { DELETED_NOTES_KEY } from './constants.js';

/**
 * Initialise le suivi des notes supprimées
 */
function initializeDeletedNotes() {
    if (!localStorage.getItem(DELETED_NOTES_KEY)) {
        localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify([]));
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
 * Filtre les notes marquées comme supprimées
 * @param {Array} notes - Notes à filtrer
 * @returns {Array} - Notes filtrées
 */
function filterDeletedNotes(notes) {
    if (!Array.isArray(notes)) return [];
    
    return notes.filter(note => !isNoteMarkedAsDeleted(note.id));
}

/**
 * Récupère toutes les notes du stockage local
 * Filtre les notes supprimées
 * @returns {Array} - Tableau de notes
 */
export function getAllNotes() {
    try {
        const notesStr = localStorage.getItem('notes');
        const notes = notesStr ? JSON.parse(notesStr) : [];
        return filterDeletedNotes(notes);
    } catch (error) {
        console.error('Erreur lors de la récupération des notes du stockage local:', error);
        return [];
    }
}

/**
 * Récupère une note par son ID
 * Prend en compte les notes supprimées
 * @param {string} noteId - ID de la note à récupérer
 * @returns {Object|null} - La note ou null si non trouvée ou supprimée
 */
export function getNote(noteId) {
    if (isNoteMarkedAsDeleted(noteId)) {
        console.log(`Note ${noteId} est marquée comme supprimée, ignorée`);
        return null;
    }
    
    try {
        const notes = getAllNotes();
        return notes.find(note => note.id === noteId) || null;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la note ${noteId}:`, error);
        return null;
    }
}

/**
 * Crée une nouvelle note dans le stockage local
 * @param {Object} note - La note à créer
 * @returns {string|null} - ID de la note créée ou null en cas d'erreur
 */
export function createNote(note) {
    try {
        if (!note || !note.id) {
            console.error('Note invalide pour la création');
            return null;
        }
        
        // Vérifier si la note est marquée comme supprimée
        if (isNoteMarkedAsDeleted(note.id)) {
            console.log(`Note ${note.id} est marquée comme supprimée, création ignorée`);
            return null;
        }
        
        const notes = getAllNotes();
        notes.push(note);
        
        localStorage.setItem('notes', JSON.stringify(notes));
        return note.id;
    } catch (error) {
        console.error('Erreur lors de la création de la note dans le stockage local:', error);
        return null;
    }
}

/**
 * Met à jour une note dans le stockage local
 * @param {string} noteId - ID de la note à mettre à jour
 * @param {Object} updatedNote - Données mises à jour
 * @returns {Object|null} - La note mise à jour ou null en cas d'erreur
 */
export function updateNote(noteId, updatedNote) {
    try {
        if (!noteId) {
            console.error('ID de note non fourni pour la mise à jour');
            return null;
        }
        
        // Vérifier si la note est marquée comme supprimée
        if (isNoteMarkedAsDeleted(noteId)) {
            console.log(`Note ${noteId} est marquée comme supprimée, mise à jour ignorée`);
            return null;
        }
        
        const notes = getAllNotes();
        const index = notes.findIndex(note => note.id === noteId);
        
        if (index === -1) {
            console.error(`Note ${noteId} non trouvée pour la mise à jour`);
            return null;
        }
        
        notes[index] = { ...notes[index], ...updatedNote };
        localStorage.setItem('notes', JSON.stringify(notes));
        
        return notes[index];
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la note ${noteId}:`, error);
        return null;
    }
}

/**
 * Supprime une note du stockage local
 * Marque également la note comme supprimée
 * @param {string} noteId - ID de la note à supprimer
 * @returns {boolean} - True si la suppression a réussi
 */
export function deleteNote(noteId) {
    try {
        if (!noteId) {
            console.error('ID de note non fourni pour la suppression');
            return false;
        }
        
        // Marquer la note comme supprimée
        initializeDeletedNotes();
        const deletedNotes = JSON.parse(localStorage.getItem(DELETED_NOTES_KEY) || '[]');
        if (!deletedNotes.includes(noteId)) {
            deletedNotes.push(noteId);
            localStorage.setItem(DELETED_NOTES_KEY, JSON.stringify(deletedNotes));
            console.log(`Note ${noteId} marquée comme supprimée`);
        }
        
        // Supprimer la note de la liste
        const notes = getAllNotes();
        const filteredNotes = notes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        
        console.log(`${notes.length - filteredNotes.length} note(s) avec ID ${noteId} supprimée(s) du stockage local, ${filteredNotes.length} notes restantes`);
        
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression de la note ${noteId}:`, error);
        return false;
    }
}