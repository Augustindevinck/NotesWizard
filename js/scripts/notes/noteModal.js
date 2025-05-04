/**
 * Gestionnaire simplifié de modal de note
 * Adaptation pour fonctionner avec les nouvelles pages dédiées
 */

/**
 * Initialise les fonctions du modal de note
 * Version simplifiée pour compatibilité avec l'ancien code
 */
export function initModalFunctions() {
    // Cette fonction ne fait plus rien mais reste pour la compatibilité
    console.log('Modal de note remplacé par les pages dédiées');
    return {};
}

/**
 * Initialise le modal de note
 * Version simplifiée pour compatibilité avec l'ancien code
 */
export function initNoteModal() {
    // Cette fonction ne fait plus rien mais reste pour la compatibilité
    console.log('Modal de note remplacé par les pages dédiées');
    return {
        openNoteModal: redirectToCreateNote,
    };
}

/**
 * Ouvre le modal de note pour créer ou éditer une note
 * @param {Object} options - Options pour le modal
 */
export function openNoteModal(options = {}) {
    // Redirige vers la page d'édition
    const noteId = options.noteId || null;
    if (noteId) {
        // Si on a un ID, c'est une édition
        redirectToEditNote(noteId);
    } else {
        // Sinon, c'est une création
        redirectToCreateNote();
    }
}

// Fonctions de redirection vers les pages dédiées

/**
 * Redirige vers la page de création de note
 */
function redirectToCreateNote() {
    window.location.href = 'edit-note.html';
}

/**
 * Redirige vers la page d'édition de note
 * @param {string} noteId - ID de la note à éditer
 */
function redirectToEditNote(noteId) {
    if (!noteId) return;
    const params = new URLSearchParams();
    params.append('id', noteId);
    window.location.href = `edit-note.html?${params.toString()}`;
}