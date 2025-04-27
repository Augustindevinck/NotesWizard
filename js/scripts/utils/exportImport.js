
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
                
                // Séparer les notes nouvelles et existantes
                const newNotes = [];
                const existingNotesToUpdate = [];

                importedNotes.forEach(importedNote => {
                    if (existingIds.has(importedNote.id)) {
                        existingNotesToUpdate.push(importedNote);
                    } else {
                        newNotes.push(importedNote);
                    }
                });

                // Si des notes existantes sont trouvées, demander confirmation
                let finalNotes = [...existingNotes];
                if (existingNotesToUpdate.length > 0) {
                    const keepExisting = confirm(
                        `${existingNotesToUpdate.length} note(s) existante(s) trouvée(s). ` +
                        'Cliquez sur OK pour remplacer les notes existantes par les nouvelles versions, ' +
                        'ou sur Annuler pour conserver les versions existantes.'
                    );

                    if (keepExisting) {
                        // Remplacer les notes existantes
                        existingNotesToUpdate.forEach(updatedNote => {
                            const index = finalNotes.findIndex(note => note.id === updatedNote.id);
                            if (index !== -1) {
                                finalNotes[index] = updatedNote;
                            }
                        });
                    }
                }

                // Ajouter les nouvelles notes
                finalNotes = [...finalNotes, ...newNotes];

                // Sauvegarder dans localStorage
                localStorage.setItem('notes', JSON.stringify(finalNotes));

                if (statusElement) {
                    const message = `Import réussi ! ${newNotes.length} nouvelle(s) note(s)` +
                        (existingNotesToUpdate.length > 0 ? 
                            ` et ${existingNotesToUpdate.length} note(s) existante(s) traitée(s)` : 
                            '');
                    statusElement.textContent = message;
                    statusElement.className = 'status-success';
                }

                resolve(finalNotes);
                
                // Recharger la page pour actualiser l'affichage
                location.reload();
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
