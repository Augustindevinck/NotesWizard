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
 * Vérifie si deux notes ont un contenu identique
 * @param {Object} note1 - Première note à comparer
 * @param {Object} note2 - Deuxième note à comparer
 * @returns {boolean} - True si le contenu est identique, false sinon
 */
function areNotesContentIdentical(note1, note2) {
    // Comparaison des champs essentiels
    if (note1.title !== note2.title || note1.content !== note2.content) {
        return false;
    }
    
    // Comparaison des catégories (indépendamment de l'ordre)
    const categories1 = new Set(note1.categories || []);
    const categories2 = new Set(note2.categories || []);
    if (categories1.size !== categories2.size) {
        return false;
    }
    for (const category of categories1) {
        if (!categories2.has(category)) {
            return false;
        }
    }
    
    // Comparaison des hashtags (indépendamment de l'ordre)
    const hashtags1 = new Set(note1.hashtags || []);
    const hashtags2 = new Set(note2.hashtags || []);
    if (hashtags1.size !== hashtags2.size) {
        return false;
    }
    for (const hashtag of hashtags1) {
        if (!hashtags2.has(hashtag)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Importe des notes depuis un fichier JSON avec gestion améliorée des doublons
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
            
            // Créer un Map des notes existantes pour comparaison rapide
            const existingNotesMap = new Map();
            notes.forEach(note => existingNotesMap.set(note.id, note));
            
            // Catégoriser les notes importées
            const newNotes = [];                   // Notes avec de nouveaux IDs
            const identicalNotes = [];             // Notes avec même ID et contenu identique
            const differentContentNotes = [];      // Notes avec même ID mais contenu différent
            
            importedNotes.forEach(importedNote => {
                if (existingNotesMap.has(importedNote.id)) {
                    const existingNote = existingNotesMap.get(importedNote.id);
                    if (areNotesContentIdentical(existingNote, importedNote)) {
                        identicalNotes.push(importedNote);
                    } else {
                        differentContentNotes.push({
                            existing: existingNote,
                            imported: importedNote
                        });
                    }
                } else {
                    newNotes.push(importedNote);
                }
            });
            
            // Ajouter immédiatement les nouvelles notes
            notes.push(...newNotes);
            let updatedNotes = 0;
            
            // Gérer les notes avec contenu différent
            if (differentContentNotes.length > 0) {
                // Demander à l'utilisateur quoi faire avec les notes existantes
                const message = `${differentContentNotes.length} note(s) avec des identifiants existants ont un contenu différent.\n` +
                                `Cliquez sur OK pour remplacer les versions existantes par les nouvelles.\n` +
                                `Cliquez sur Annuler pour conserver les versions existantes.`;
                
                const replaceExisting = confirm(message);
                
                if (replaceExisting) {
                    // Remplacer les notes existantes par les versions importées
                    differentContentNotes.forEach(pair => {
                        const noteIndex = notes.findIndex(note => note.id === pair.existing.id);
                        if (noteIndex !== -1) {
                            notes[noteIndex] = pair.imported;
                            updatedNotes++;
                        }
                    });
                }
            }
            
            // Sauvegarder dans localStorage
            saveNotes(notes);
            
            // Générer le message de statut
            let statusMessage = `Import réussi:\n`;
            if (newNotes.length > 0) {
                statusMessage += `- ${newNotes.length} nouvelle(s) note(s) ajoutée(s)\n`;
            }
            if (identicalNotes.length > 0) {
                statusMessage += `- ${identicalNotes.length} note(s) déjà existante(s) (contenu identique)\n`;
            }
            if (differentContentNotes.length > 0) {
                statusMessage += `- ${updatedNotes} note(s) existante(s) mise(s) à jour\n`;
            }
            
            if (statusElement) {
                statusElement.textContent = statusMessage.trim();
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