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
        
        // Générer un nom de fichier avec la date et l'heure
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        const noteCount = notes.length;
        a.download = `notes_export_${dateStr}_${timeStr}_${noteCount}notes.json`;
        
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
    // Vérification sécurisée (certains champs peuvent ne pas exister)
    const title1 = note1.title || '';
    const title2 = note2.title || '';
    const content1 = note1.content || '';
    const content2 = note2.content || '';
    
    // Comparaison des champs essentiels
    if (title1 !== title2 || content1 !== content2) {
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
    
    // Ignorer les différences de dates (createdAt, updatedAt) et autres champs non essentiels
    
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
            let importedNotes = JSON.parse(e.target.result);
            
            // Convertir en tableau si ce n'est pas déjà un tableau
            if (!Array.isArray(importedNotes)) {
                importedNotes = [importedNotes];
            }
            
            // Vérifier la structure minimale des notes importées
            if (importedNotes.length === 0) {
                throw new Error('Le fichier ne contient aucune note');
            }
            
            let notesWithoutId = 0;
            let notesWithoutContent = 0;
            
            importedNotes.forEach(note => {
                if (!note.id) {
                    notesWithoutId++;
                }
                if (!note.content && !note.title) {
                    notesWithoutContent++;
                }
            });
            
            if (notesWithoutId > 0) {
                throw new Error(`Format invalide: ${notesWithoutId} note(s) n'ont pas d'identifiant`);
            }
            
            if (notesWithoutContent > 0) {
                console.warn(`Attention: ${notesWithoutContent} note(s) n'ont ni titre ni contenu`);
            }
            
            // S'assurer que les dates sont au format ISO ou les corriger
            importedNotes.forEach(note => {
                // Ajouter les dates manquantes
                if (!note.createdAt) {
                    note.createdAt = new Date().toISOString();
                }
                if (!note.updatedAt) {
                    note.updatedAt = note.createdAt;
                }
                
                // Vérifier que les dates sont au format ISO
                try {
                    const createdDate = new Date(note.createdAt);
                    const updatedDate = new Date(note.updatedAt);
                    
                    // Si les dates ne sont pas valides, les remplacer
                    if (isNaN(createdDate.getTime())) {
                        note.createdAt = new Date().toISOString();
                    }
                    if (isNaN(updatedDate.getTime())) {
                        note.updatedAt = note.createdAt;
                    }
                } catch (e) {
                    // En cas d'erreur, utiliser la date actuelle
                    note.createdAt = new Date().toISOString();
                    note.updatedAt = note.createdAt;
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
            let statusMessage = '';
            
            // Résumé en une ligne pour un aperçu rapide
            const totalProcessed = newNotes.length + identicalNotes.length + differentContentNotes.length;
            statusMessage = `Import réussi : ${totalProcessed} note(s) traitée(s)`;
            
            // Détails par catégorie
            if (newNotes.length > 0 || identicalNotes.length > 0 || updatedNotes > 0) {
                statusMessage += '<div class="import-details">';
                if (newNotes.length > 0) {
                    statusMessage += `<div>✅ ${newNotes.length} nouvelle(s) note(s) ajoutée(s)</div>`;
                }
                if (identicalNotes.length > 0) {
                    statusMessage += `<div>ℹ️ ${identicalNotes.length} note(s) déjà existante(s) (contenu identique)</div>`;
                }
                if (differentContentNotes.length > 0) {
                    statusMessage += `<div>${updatedNotes > 0 ? '🔄' : '⏸️'} ${updatedNotes} / ${differentContentNotes.length} note(s) existante(s) mise(s) à jour</div>`;
                }
                statusMessage += '</div>';
            }
            
            if (statusElement) {
                statusElement.innerHTML = statusMessage;
                statusElement.className = 'status-success';
            }
            
            // Exécuter le callback si fourni
            if (callback) {
                callback();
            }
        } catch (error) {
            console.error('Erreur lors de l\'importation des notes:', error);
            if (statusElement) {
                let errorMessage = 'Une erreur s\'est produite lors de l\'importation';
                
                // Essayer d'extraire un message d'erreur plus spécifique
                if (error && typeof error === 'object') {
                    if (error.message) {
                        errorMessage = error.message;
                    } else if (error.toString() !== '[object Object]') {
                        errorMessage = error.toString();
                    }
                } else if (error) {
                    errorMessage = String(error);
                }
                
                statusElement.textContent = `Erreur: ${errorMessage}`;
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