
/**
 * Fonctions pour l'exportation et l'importation des notes
 */

import { saveNotes } from './localStorage.js';

/**
 * Exporte les notes au format JSON dans un fichier téléchargeable
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

        // Créer le fichier
        const notesJSON = JSON.stringify(exportData, null, 2);
        const blob = new Blob([notesJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Créer le lien de téléchargement
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
            statusElement.textContent = `❌ Erreur: ${error.message}`;
            statusElement.className = 'status-error';
        }
    }
}

/**
 * Compare deux notes pour détecter les différences
 */
function compareNotes(note1, note2) {
    const fields = ['title', 'content', 'categories', 'hashtags', 'videoUrls'];
    const differences = [];
    
    fields.forEach(field => {
        if (Array.isArray(note1[field])) {
            if (JSON.stringify(note1[field]) !== JSON.stringify(note2[field])) {
                differences.push(field);
            }
        } else if (note1[field] !== note2[field]) {
            differences.push(field);
        }
    });
    
    return differences;
}

/**
 * Importe des notes depuis un fichier JSON
 */
export function importNotes(file, statusElement) {
    return new Promise((resolve, reject) => {
        if (!file) {
            const error = new Error('Aucun fichier sélectionné');
            if (statusElement) {
                statusElement.textContent = `❌ Erreur: ${error.message}`;
                statusElement.className = 'status-error';
            }
            reject(error);
            return;
        }

        if (!file.type.includes('json')) {
            const error = new Error('Format de fichier invalide. Veuillez sélectionner un fichier JSON.');
            if (statusElement) {
                statusElement.textContent = `❌ Erreur: ${error.message}`;
                statusElement.className = 'status-error';
            }
            reject(error);
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                let importedData;
                try {
                    importedData = JSON.parse(e.target.result);
                } catch (error) {
                    throw new Error('Le fichier n\'est pas un JSON valide');
                }

                let importedNotes;

                // Vérifier le format
                if (Array.isArray(importedData)) {
                    // Format simple tableau
                    importedNotes = importedData;
                } else if (importedData && typeof importedData === 'object' && importedData.notes) {
                    // Format avec métadonnées
                    importedNotes = importedData.notes;
                } else {
                    throw new Error('Format invalide - Le fichier doit contenir un tableau de notes ou un objet avec une propriété "notes"');
                }

                // Vérifier la structure des notes
                if (!Array.isArray(importedNotes) || importedNotes.length === 0) {
                    throw new Error('Aucune note à importer');
                }

                // Vérifier chaque note
                const invalidNotes = importedNotes.filter(note => 
                    !note || typeof note !== 'object' || !note.id || !note.content
                );
                if (invalidNotes.length > 0) {
                    throw new Error(`${invalidNotes.length} note(s) mal structurée(s)`);
                }

                // Récupérer les notes existantes
                const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                
                // Analyser les notes
                let newNotes = [];
                let identicalNotes = [];
                let conflictingNotes = [];

                for (const importedNote of importedNotes) {
                    const existingNote = existingNotes.find(n => n.id === importedNote.id);
                    
                    if (!existingNote) {
                        newNotes.push(importedNote);
                    } else {
                        const differences = compareNotes(existingNote, importedNote);
                        if (differences.length === 0) {
                            identicalNotes.push(importedNote);
                        } else {
                            conflictingNotes.push({
                                existing: existingNote,
                                imported: importedNote,
                                differences
                            });
                        }
                    }
                }

                // Gérer les conflits
                let updatedNotes = 0;
                if (conflictingNotes.length > 0) {
                    const message = `📝 Analyse des notes:\n
• ${newNotes.length} nouvelle(s) note(s)
• ${identicalNotes.length} note(s) identique(s)
• ${conflictingNotes.length} note(s) avec des modifications\n
Détails des modifications:
${conflictingNotes.map(conflict => 
    `- Note "${conflict.existing.title || 'Sans titre'}"
     Champs modifiés: ${conflict.differences.join(', ')}`
).join('\n')}\n
Voulez-vous remplacer les notes existantes par les versions importées ?`;

                    if (confirm(message)) {
                        conflictingNotes.forEach(({existing, imported}) => {
                            const index = existingNotes.findIndex(n => n.id === existing.id);
                            if (index !== -1) {
                                existingNotes[index] = imported;
                                updatedNotes++;
                            }
                        });
                    }
                }

                // Fusionner les notes
                const finalNotes = [...existingNotes, ...newNotes];

                // Sauvegarder
                localStorage.setItem('notes', JSON.stringify(finalNotes));

                // Afficher le statut
                if (statusElement) {
                    let message = `✅ Import réussi !<br>`;
                    if (newNotes.length > 0) {
                        message += `• ${newNotes.length} nouvelle(s) note(s) ajoutée(s)<br>`;
                    }
                    if (identicalNotes.length > 0) {
                        message += `• ${identicalNotes.length} note(s) identique(s)<br>`;
                    }
                    if (updatedNotes > 0) {
                        message += `• ${updatedNotes} note(s) mise(s) à jour<br>`;
                    }
                    if (conflictingNotes.length > 0 && updatedNotes === 0) {
                        message += `• ${conflictingNotes.length} note(s) conservée(s) sans modification<br>`;
                    }
                    message += `• Total final: ${finalNotes.length} notes`;

                    statusElement.innerHTML = message;
                    statusElement.className = 'status-success';
                }

                resolve(finalNotes);

                // Recharger la page après un court délai
                setTimeout(() => location.reload(), 2000);
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
            const error = new Error('Erreur lors de la lecture du fichier');
            if (statusElement) {
                statusElement.textContent = `❌ Erreur: ${error.message}`;
                statusElement.className = 'status-error';
            }
            reject(error);
        };

        reader.readAsText(file);
    });
}
