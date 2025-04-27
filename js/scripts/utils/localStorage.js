/**
 * Fonctions pour la gestion du localStorage
 */

/**
 * Charge les notes depuis le localStorage
 * @returns {Array} Le tableau des notes ou un tableau vide si aucune note n'est trouvée
 */
export function loadNotes() {
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
        return JSON.parse(storedNotes);
    }
    return [];
}

/**
 * Sauvegarde les notes dans le localStorage
 * @param {Array} notes - Tableau des notes à sauvegarder
 */
export function saveNotes(notes) {
    localStorage.setItem('notes', JSON.stringify(notes));
}

/**
 * Charge les paramètres de révision depuis le localStorage
 * @returns {Object} L'objet contenant les paramètres de révision ou les valeurs par défaut
 */
export function loadRevisitSettings() {
    const storedSettings = localStorage.getItem('revisitSettings');
    if (storedSettings) {
        return JSON.parse(storedSettings);
    }
    // Valeurs par défaut
    return {
        section1: 7,
        section2: 14
    };
}

/**
 * Sauvegarde les paramètres de révision dans le localStorage
 * @param {Object} settings - Objet contenant les paramètres de révision
 */
export function saveRevisitSettings(settings) {
    localStorage.setItem('revisitSettings', JSON.stringify(settings));
}