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
 * Importe des notes depuis un fichier JSON
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
                let importedData;
                try {
                    importedData = JSON.parse(e.target.result);
                } catch (error) {
                    throw new Error('Le fichier n\'est pas un JSON valide');
                }

                let importedNotes;

                // Vérifier le format
                if (importedData && typeof importedData === 'object') {
                    if (importedData.version && Array.isArray(importedData.notes)) {
                        importedNotes = importedData.notes;
                    } else if (Array.isArray(importedData)) {
                        importedNotes = importedData;
                    } else {
                        throw new Error('Format de fichier invalide - Le fichier doit contenir un tableau de notes ou un objet avec une propriété "notes"');
                    }
                } else {
                    throw new Error('Format de fichier invalide - Le contenu n\'est pas un objet JSON valide');
                }

                // Vérifier la structure des notes
                if (!Array.isArray(importedNotes) || importedNotes.length === 0) {
                    throw new Error('Format de fichier invalide - Aucune note trouvée');
                }

                // Vérifier chaque note
                const invalidNotes = importedNotes.filter(note => !note || typeof note !== 'object' || !note.id || !note.content);
                if (invalidNotes.length > 0) {
                    throw new Error(`${invalidNotes.length} note(s) sont mal structurées - Chaque note doit avoir un ID et un contenu`);
                }

                // Récupérer les notes existantes
                const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');

                // Analyser les notes
                let newNotes = [];
                let identicalNotes = [];
                let modifiedNotes = [];

                importedNotes.forEach(importedNote => {
                    const existingNote = existingNotes.find(n => n.id === importedNote.id);
                    if (!existingNote) {
                        newNotes.push(importedNote);
                    } else if (JSON.stringify(existingNote) === JSON.stringify(importedNote)) {
                        identicalNotes.push(importedNote);
                    } else {
                        modifiedNotes.push({
                            existing: existingNote,
                            imported: importedNote
                        });
                    }
                });

                // Gérer les notes modifiées
                let updatedNotes = 0;
                if (modifiedNotes.length > 0) {
                    const message = `📝 Analyse des notes:\n
• ${newNotes.length} nouvelle(s) note(s)
• ${identicalNotes.length} note(s) identique(s)
• ${modifiedNotes.length} note(s) avec des modifications\n
Voulez-vous remplacer les notes existantes par les versions importées ?`;

                    if (confirm(message)) {
                        modifiedNotes.forEach(({existing, imported}) => {
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
                    if (modifiedNotes.length > 0 && updatedNotes === 0) {
                        message += `• ${modifiedNotes.length} note(s) non modifiée(s)<br>`;
                    }
                    message += `• Total: ${finalNotes.length} notes`;

                    statusElement.innerHTML = message;
                    statusElement.className = 'status-success';
                }

                resolve(finalNotes);

                // Recharger la page
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
            if (statusElement) {
                statusElement.textContent = '❌ Erreur lors de la lecture du fichier';
                statusElement.className = 'status-error';
            }
            reject(new Error('Erreur de lecture du fichier'));
        };

        reader.readAsText(file);
    });
}