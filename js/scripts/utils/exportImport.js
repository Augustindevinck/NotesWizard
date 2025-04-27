/**
 * Fonctions pour l'exportation et l'importation des notes
 */

import { saveNotes } from './localStorage.js';

/**
 * Exporte les notes au format JSON
 * @param {Array} notes - Tableau des notes à exporter
 * @returns {boolean} - True si l'exportation a réussi, false sinon
 */
export function exportNotes(notes, importStatus) {
    if (notes.length === 0) {
        alert('Aucune note à exporter');
        return false;
    }

    const dataStr = JSON.stringify(notes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'notes-' + new Date().toISOString().slice(0, 10) + '.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    // Afficher un message de succès si l'élément importStatus est fourni
    if (importStatus) {
        importStatus.textContent = 'Export réussi !';
        importStatus.className = 'success';
        importStatus.style.display = 'block';

        setTimeout(() => {
            importStatus.style.display = 'none';
        }, 3000);
    }

    return true;
}

/**
 * Importe des notes depuis un fichier JSON
 * @param {Event} event - L'événement de changement du fichier
 * @param {Array} notes - Le tableau de notes actuel
 * @param {Function} callback - Fonction à appeler après l'importation pour mettre à jour l'interface
 * @param {HTMLElement} importStatus - Élément pour afficher le statut de l'importation
 */
export function importNotes(event, notes, callback, importStatus) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedNotes = JSON.parse(e.target.result);

            // Valider les données importées
            if (!Array.isArray(importedNotes)) {
                throw new Error('Format invalide : les données importées ne sont pas un tableau');
            }

            // Validation basique de chaque note
            importedNotes.forEach(note => {
                if (!note.id || !note.content) {
                    throw new Error('Format invalide : certaines notes n\'ont pas d\'ID ou de contenu');
                }
            });

            // Identifier les notes en double
            const existingNoteIds = new Map();
            notes.forEach(note => existingNoteIds.set(note.id, note));

            // Fusionner les notes importées avec les notes existantes
            let addedCount = 0;
            let updatedCount = 0;

            importedNotes.forEach(importedNote => {
                if (existingNoteIds.has(importedNote.id)) {
                    // Mettre à jour la note existante
                    const existingNote = existingNoteIds.get(importedNote.id);
                    Object.assign(existingNote, importedNote);
                    updatedCount++;
                } else {
                    // Ajouter une nouvelle note
                    notes.push(importedNote);
                    addedCount++;
                }
            });

            // Enregistrer le tableau de notes mis à jour
            saveNotes(notes);

            // Afficher un message de succès
            if (importStatus) {
                importStatus.textContent = `Import réussi : ${addedCount} notes ajoutées, ${updatedCount} notes mises à jour.`;
                importStatus.className = 'success';
                importStatus.style.display = 'block';

                setTimeout(() => {
                    importStatus.style.display = 'none';
                }, 3000);
            }

            // Mettre à jour l'interface utilisateur
            if (callback) {
                callback();
            }

        } catch (error) {
            console.error('Erreur lors de l\'importation :', error);
            
            if (importStatus) {
                importStatus.textContent = `Erreur : ${error.message}`;
                importStatus.className = 'error';
                importStatus.style.display = 'block';

                setTimeout(() => {
                    importStatus.style.display = 'none';
                }, 3000);
            }
        }
    };

    reader.readAsText(file);
}