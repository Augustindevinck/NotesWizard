
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
                statusElement.textContent = '❌ Aucune note à exporter';
                statusElement.className = 'status-error';
            }
            return;
        }

        // Créer un objet avec des métadonnées
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            totalNotes: notes.length,
            notes: notes
        };

        // Créer un objet Blob avec les notes
        const notesJSON = JSON.stringify(exportData, null, 2);
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
            statusElement.innerHTML = `✅ Export réussi !<br>
                • ${notes.length} note${notes.length > 1 ? 's' : ''} exportée${notes.length > 1 ? 's' : ''}<br>
                • Taille du fichier: ${(blob.size / 1024).toFixed(2)} Ko`;
            statusElement.className = 'status-success';
        }
    } catch (error) {
        console.error('Erreur lors de l\'exportation:', error);
        if (statusElement) {
            statusElement.textContent = `❌ Erreur lors de l'exportation: ${error.message}`;
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
                statusElement.textContent = '❌ Format de fichier invalide. Veuillez sélectionner un fichier JSON.';
                statusElement.className = 'status-error';
            }
            reject(new Error('Format de fichier invalide'));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                let importedNotes;
                
                // Vérifier si c'est le nouveau format avec métadonnées
                if (importedData.version && importedData.notes) {
                    importedNotes = importedData.notes;
                } else {
                    // Ancien format
                    importedNotes = importedData;
                }
                
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Format invalide: les notes doivent être un tableau');
                }

                // Vérifier la structure des notes
                const invalidNotes = importedNotes.filter(note => !note.id || !note.content);
                if (invalidNotes.length > 0) {
                    throw new Error(`${invalidNotes.length} note(s) mal structurée(s)`);
                }

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
                let notesUpdated = 0;
                
                if (existingNotesToUpdate.length > 0) {
                    const message = `📝 Notes détectées:
• ${newNotes.length} nouvelle(s) note(s)
• ${existingNotesToUpdate.length} note(s) existante(s)

Que souhaitez-vous faire avec les notes existantes ?`;

                    const keepExisting = confirm(message + '\n\nCliquez sur OK pour remplacer les notes existantes par les nouvelles versions, ou sur Annuler pour conserver les versions existantes.');

                    if (keepExisting) {
                        // Remplacer les notes existantes
                        existingNotesToUpdate.forEach(updatedNote => {
                            const index = finalNotes.findIndex(note => note.id === updatedNote.id);
                            if (index !== -1) {
                                finalNotes[index] = updatedNote;
                                notesUpdated++;
                            }
                        });
                    }
                }

                // Ajouter les nouvelles notes
                finalNotes = [...finalNotes, ...newNotes];

                // Sauvegarder dans localStorage
                localStorage.setItem('notes', JSON.stringify(finalNotes));

                if (statusElement) {
                    let message = `✅ Import réussi !<br>`;
                    if (newNotes.length > 0) {
                        message += `• ${newNotes.length} nouvelle(s) note(s) ajoutée(s)<br>`;
                    }
                    if (notesUpdated > 0) {
                        message += `• ${notesUpdated} note(s) mise(s) à jour<br>`;
                    }
                    if (existingNotesToUpdate.length > 0 && notesUpdated === 0) {
                        message += `• ${existingNotesToUpdate.length} note(s) existante(s) conservée(s)<br>`;
                    }
                    message += `• Total: ${finalNotes.length} notes`;
                    
                    statusElement.innerHTML = message;
                    statusElement.className = 'status-success';
                }

                resolve(finalNotes);
                
                // Recharger la page pour actualiser l'affichage
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } catch (error) {
                console.error('Erreur lors de l\'importation:', error);
                if (statusElement) {
                    statusElement.textContent = `❌ Erreur: ${error.message}`;
                    statusElement.className = 'status-error';
                }
                reject(error);
            }
        };

        reader.onerror = () => {
            if (statusElement) {
                statusElement.textContent = '❌ Erreur lors de la lecture du fichier';
                statusElement.className = 'status-error';
            }
            reject(new Error('Erreur de lecture du fichier'));
        };

        reader.readAsText(file);
    });
}
