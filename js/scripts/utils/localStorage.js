/**
 * Fonctions utilitaires pour l'interaction avec localStorage
 */

/**
 * Charge les notes depuis localStorage
 * @returns {Array} Tableau de notes
 */
export function loadNotes() {
    try {
        const notesJSON = localStorage.getItem('notes');
        return notesJSON ? JSON.parse(notesJSON) : [];
    } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        return [];
    }
}

/**
 * Sauvegarde les notes dans localStorage
 * @param {Array} notes - Tableau de notes à sauvegarder
 */
export function saveNotes(notes) {
    try {
        localStorage.setItem('notes', JSON.stringify(notes));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des notes:', error);
    }
}

/**
 * Charge les paramètres de révision depuis localStorage
 * @returns {Object} Paramètres de révision
 */
export function loadRevisitSettings() {
    try {
        const settingsJSON = localStorage.getItem('revisitSettings');
        return settingsJSON ? JSON.parse(settingsJSON) : { section1: 7, section2: 14 };
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres de révision:', error);
        return { section1: 7, section2: 14 };
    }
}

/**
 * Sauvegarde les paramètres de révision dans localStorage
 * @param {Object} settings - Paramètres de révision à sauvegarder
 */
export function saveRevisitSettings(settings) {
    try {
        localStorage.setItem('revisitSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres de révision:', error);
    }
}