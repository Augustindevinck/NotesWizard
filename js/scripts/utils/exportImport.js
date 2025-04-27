/**
 * Fonctions pour l'exportation et l'importation des notes
 */

import { saveNotes } from './localStorage.js';

/**
 * Exporte les notes au format JSON dans un fichier téléchargeable
 * @param {Array} notes - Tableau des notes à exporter
 * @param {HTMLElement} statusElement - Élément pour afficher le statut de l'opération
 */
export function exportNotes(notes, statusElement) {
    if (!notes || notes.length === 0) {
        if (statusElement) {
            statusElement.textContent = 'Aucune note à exporter';
            statusElement.className = 'status-error';
        }
        return;
    }

    try {
        // Créer un objet Blob avec les notes
        const notesJSON = JSON.stringify(notes, null, 2);
        const blob = new Blob([notesJSON], { type: 'application/json' });

        // Créer un lien de téléchargement
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Générer un nom de fichier avec la date
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        a.download = `notes_export_${dateStr}.json`;

        // Déclencher le téléchargement
        document.body.appendChild(a);
        a.click();

        // Nettoyer
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (statusElement) {
            statusElement.textContent = `${notes.length} notes exportées avec succès`;
            statusElement.className = 'status-success';
        }
    } catch (error) {
        console.error('Erreur lors de l\'exportation des notes:', error);
        if (statusElement) {
            statusElement.textContent = 'Erreur lors de l\'exportation';
            statusElement.className = 'status-error';
        }
    }
}

/**
 * Importe des notes depuis un fichier JSON
 * @param {Event} event - Événement de sélection de fichier
 * @param {Array} notes - Tableau des notes actuel
 * @param {Function} callback - Fonction à appeler après l'importation
 * @param {HTMLElement} statusElement - Élément pour afficher le statut de l'opération
 */
export function importNotes(event, notes, callback, statusElement) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Vérifier le type de fichier
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        if (statusElement) {
            statusElement.textContent = 'Format de fichier invalide. Veuillez sélectionner un fichier JSON.';
            statusElement.className = 'status-error';
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedNotes = JSON.parse(e.target.result);

            if (!Array.isArray(importedNotes)) {
                throw new Error('Format invalide: les notes doivent être un tableau');
            }

            // Vérifier la structure des notes importées
            importedNotes.forEach(note => {
                if (!note.id || !note.createdAt) {
                    throw new Error('Format invalide: certaines notes sont mal structurées');
                }
            });

            // Fusionner avec les notes existantes (en évitant les doublons)
            const existingIds = new Set(notes.map(note => note.id));
            let importCount = 0;

            importedNotes.forEach(importedNote => {
                if (!existingIds.has(importedNote.id)) {
                    notes.push(importedNote);
                    importCount++;
                }
            });

            // Sauvegarder dans localStorage
            saveNotes(notes);

            // Actualiser l'affichage
            const notesContainer = document.getElementById('notes-container');
            if (notesContainer) {
                renderNotes(notesContainer, notes);
            }

            // Actualiser les sections de révision
            const revisitSections = document.querySelector('.revisit-sections');
            if (revisitSections) {
                renderRevisitSections(notes);
            }

            if (statusElement) {
                statusElement.textContent = `${importCount} notes importées avec succès`;
                statusElement.className = 'status-success';
            }

            // Exécuter le callback si fourni
            if (callback) {
                callback();
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation des notes:', error);
            if (statusElement) {
                statusElement.textContent = `Erreur: ${error.message}`;
                statusElement.className = 'status-error';
            }
        }
    };

    reader.onerror = function() {
        if (statusElement) {
            statusElement.textContent = 'Erreur lors de la lecture du fichier';
            statusElement.className = 'status-error';
        }
    };

    reader.readAsText(file);
}