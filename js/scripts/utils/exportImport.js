
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
    try {
        if (!notes || notes.length === 0) {
            if (statusElement) {
                statusElement.textContent = 'Aucune note à exporter';
                statusElement.className = 'status-error';
            }
            return;
        }

        // Créer un objet Blob avec les notes
        const notesJSON = JSON.stringify(notes, null, 2);
        const blob = new Blob([notesJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Créer un lien de téléchargement
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `notes_export_${date}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (statusElement) {
            statusElement.textContent = `${notes.length} notes exportées avec succès`;
            statusElement.className = 'status-success';
        }
    } catch (error) {
        console.error('Erreur lors de l\'exportation:', error);
        if (statusElement) {
            statusElement.textContent = 'Erreur lors de l\'exportation';
            statusElement.className = 'status-error';
        }
    }
}

/**
 * Importe des notes depuis un fichier JSON
 * @param {File} file - Fichier à importer
 * @param {HTMLElement} statusElement - Élément pour afficher le statut
 * @returns {Promise} - Promise résolvant les notes importées
 */
export function importNotes(file, statusElement) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.includes('json')) {
            if (statusElement) {
                statusElement.textContent = 'Format de fichier invalide. Veuillez sélectionner un fichier JSON.';
                statusElement.className = 'status-error';
            }
            reject(new Error('Format de fichier invalide'));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedNotes = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Format invalide: les notes doivent être un tableau');
                }

                // Vérifier la structure des notes
                importedNotes.forEach(note => {
                    if (!note.id || !note.content) {
                        throw new Error('Format invalide: certaines notes sont mal structurées');
                    }
                });

                // Récupérer les notes existantes
                const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                const existingIds = new Set(existingNotes.map(note => note.id));
                
                // Fusionner les notes
                const mergedNotes = [...existingNotes];
                let newCount = 0;
                let updatedCount = 0;

                importedNotes.forEach(importedNote => {
                    if (existingIds.has(importedNote.id)) {
                        // Mettre à jour la note existante
                        const index = mergedNotes.findIndex(n => n.id === importedNote.id);
                        mergedNotes[index] = importedNote;
                        updatedCount++;
                    } else {
                        // Ajouter la nouvelle note
                        mergedNotes.push(importedNote);
                        newCount++;
                    }
                });

                // Sauvegarder les notes fusionnées
                saveNotes(mergedNotes);

                if (statusElement) {
                    statusElement.textContent = `Import réussi ! ${newCount} nouvelle(s) note(s), ${updatedCount} note(s) mise(s) à jour`;
                    statusElement.className = 'status-success';
                }

                resolve(mergedNotes);
            } catch (error) {
                console.error('Erreur lors de l\'importation:', error);
                if (statusElement) {
                    statusElement.textContent = `Erreur: ${error.message}`;
                    statusElement.className = 'status-error';
                }
                reject(error);
            }
        };

        reader.onerror = () => {
            if (statusElement) {
                statusElement.textContent = 'Erreur lors de la lecture du fichier';
                statusElement.className = 'status-error';
            }
            reject(new Error('Erreur de lecture du fichier'));
        };

        reader.readAsText(file);
    });
}
