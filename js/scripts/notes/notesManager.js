/**
 * Gestionnaire des notes (création, édition, suppression)
 */

import { saveNotes, saveNote as saveSupabaseNote, deleteNote as deleteSupabaseNote } from '../utils/supabaseStorage.js';
import { generateUniqueId, formatDate } from '../utils/domHelpers.js';

// Variable pour stocker la fonction openNoteModal (à initialiser)
let openNoteModalFn = null;
let renderRevisitSectionsFn = null;

/**
 * Initialise les fonctions externes nécessaires au module
 * @param {Function} openModal - Fonction pour ouvrir le modal de note
 * @param {Function} renderRevisit - Fonction pour rendre les sections de révision
 */
export function initNotesManager(openModal, renderRevisit) {
    openNoteModalFn = openModal;
    renderRevisitSectionsFn = renderRevisit;
}

/**
 * Crée un élément DOM pour une note
 * @param {Object} note - La note à afficher
 * @param {Array} currentSearchTerms - Termes de recherche actifs
 * @returns {HTMLElement} - L'élément DOM de la note
 */
export function createNoteElement(note, currentSearchTerms) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-card';

    // Masquer les liens [[...]] pour l'affichage
    const displayContent = note.content.replace(/\[\[.*?\]\]/g, '');

    // Ajouter une classe spéciale pour les résultats de recherche
    if (note.isSearchResult) {
        noteDiv.className += ' is-search-result';
    }

    noteDiv.dataset.id = note.id;

    // Format date from ISO string to a more readable format
    const createdDate = new Date(note.createdAt);
    const formattedDate = formatDate(createdDate);

    // Create categories HTML
    const categoriesHTML = note.categories && note.categories.length > 0
        ? note.categories.map(cat => `<span class="note-category">${cat}</span>`).join('')
        : '';

    // Create hashtags HTML
    const hashtagsHTML = note.hashtags && note.hashtags.length > 0
        ? note.hashtags.map(tag => `<span class="note-hashtag">#${tag}</span>`).join('')
        : '';

    // Générer le score pour les résultats de recherche
    let scoreHTML = '';
    if ((note.searchScore !== undefined || note.relevanceScore !== undefined) && 
        (note.searchScore > 0 || note.relevanceScore > 0)) {

        const score = note.searchScore !== undefined ? note.searchScore : note.relevanceScore;
        const roundedScore = Math.round(score);

        // Classes CSS pour le score
        let scoreClasses = "search-score";
        if (note._scoreDetails) {
            if (note._scoreDetails.categories > 0) {
                scoreClasses += " has-category-score";
            }
            if (note._scoreDetails.hashtags > 0) {
                scoreClasses += " has-hashtag-score";
            }
        }

        // Titre détaillé pour l'infobulle
        let detailsTitle = `Score: ${score.toFixed(1)} points`;

        if (note._scoreDetails) {
            const details = [];
            if (note._scoreDetails.title > 0) {
                details.push(`Titre: ${note._scoreDetails.title} pts`);
            }
            if (note._scoreDetails.content > 0) {
                details.push(`Contenu: ${note._scoreDetails.content} pts`);
            }
            if (note._scoreDetails.categories > 0) {
                details.push(`Catégories: ${note._scoreDetails.categories} pts`);
            }
            if (note._scoreDetails.hashtags > 0) {
                details.push(`Hashtags: ${note._scoreDetails.hashtags} pts`);
            }
            if (note._scoreDetails.recency > 0) {
                details.push(`Récence: ${note._scoreDetails.recency} pts`);
            }

            if (details.length > 0) {
                detailsTitle += '\n' + details.join('\n');
            }
        }

        scoreHTML = `<div class="${scoreClasses}" title="${detailsTitle}">${roundedScore}</div>`;
    }

    // Add delete button, score indicator, and only the title (no content, categories or hashtags)
    noteDiv.innerHTML = `
        <div class="delete-note" title="Supprimer cette note">&times;</div>
        ${scoreHTML}
        <h3 class="note-title">${note.title || 'Sans titre'}</h3>
        <div class="note-date">Créée le ${formattedDate}</div>
    `;

    // Add click event to open the note for editing
    noteDiv.addEventListener('click', (event) => {
        // If clicking on the delete button, don't open the modal
        if (event.target.classList.contains('delete-note')) {
            event.stopPropagation();
            deleteNote(note.id);
            return;
        }

        // Vérifier si on vient d'une recherche (si des termes de recherche sont actifs)
        const fromSearch = currentSearchTerms && currentSearchTerms.length > 0;
        if (openNoteModalFn) {
            openNoteModalFn(note, fromSearch, currentSearchTerms);
        } else {
            console.error('openNoteModal n\'est pas initialisé');
        }
    });

    // Add specific click handler for delete button
    const deleteBtn = noteDiv.querySelector('.delete-note');
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteNote(note.id);
    });

    return noteDiv;
}

/**
 * Supprime une note
 * @param {string} noteId - L'identifiant de la note à supprimer
 * @param {Array} notes - Le tableau des notes
 * @param {Function} renderEmptyState - Fonction pour afficher l'état vide
 * @returns {Promise<boolean>} - True si la note a été supprimée, false sinon
 */
export async function deleteNote(noteId, notes = [], renderEmptyState = null) {
    // Ask for confirmation before deleting
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        try {
            console.log(`Début de la suppression de la note ${noteId}...`);

            // Supprimer la note via Supabase
            const success = await deleteSupabaseNote(noteId);

            if (success) {
                console.log(`Note ${noteId} supprimée avec succès dans Supabase`);

                // Mise à jour synchrone du stockage local via localStorage
                try {
                    const localStorage = await import('../utils/localStorage.js');
                    // Supprimer toutes les notes avec cet ID pour éviter des problèmes de doublons
                    const localNotes = localStorage.getAllNotes();

                    // Filtrer strictement avec triple égalité pour garantir une correspondance exacte
                    const updatedLocalNotes = localNotes.filter(note => note.id !== noteId);

                    // Vérifier si des notes ont été supprimées
                    const deletedCount = localNotes.length - updatedLocalNotes.length;

                    localStorage.saveAllNotes(updatedLocalNotes);
                    console.log(`${deletedCount} note(s) avec ID ${noteId} supprimée(s) du stockage local, ${updatedLocalNotes.length} notes restantes`);
                } catch (localStorageError) {
                    console.error('Erreur lors de la mise à jour du stockage local:', localStorageError);
                }

                // Si des notes sont fournies, mettre à jour l'état local aussi
                if (notes && notes.length > 0) {
                    const noteIndex = notes.findIndex(note => note.id === noteId);
                    if (noteIndex !== -1) {
                        notes.splice(noteIndex, 1);
                        console.log(`Note ${noteId} supprimée du tableau local, ${notes.length} notes restantes`);
                    }
                }

                // Mettre à jour les sections de révision si la fonction est disponible
                if (renderRevisitSectionsFn) {
                    await renderRevisitSectionsFn(notes);
                    console.log('Sections de révision mises à jour après suppression');
                }

                try {
                    // Forcer une synchronisation complète avec Supabase pour mettre à jour l'état local
                    const supabaseService = await import('../utils/supabaseService.js');
                    await supabaseService.syncWithSupabase();
                    console.log('Synchronisation avec Supabase terminée après suppression');

                    // Vérifier que la suppression a bien été prise en compte en faisant une vérification supplémentaire
                    const verificationCheck = async () => {
                        try {
                            console.log('Vérification finale de la suppression...');
                            const supabaseStorage = await import('../utils/supabaseStorage.js');
                            const noteStillExists = await supabaseStorage.getNote(noteId);
                            
                            if (noteStillExists) {
                                console.warn(`La note ${noteId} existe toujours dans Supabase après suppression, nouvel essai...`);
                                await supabaseStorage.deleteNote(noteId);
                                // Une suppression supplémentaire pour s'assurer que la note est bien supprimée
                                await supabaseService.syncWithSupabase();
                            } else {
                                console.log(`Vérification réussie : la note ${noteId} n'existe plus dans Supabase`);
                            }
                        } catch (error) {
                            console.error('Erreur lors de la vérification finale:', error);
                        }
                    };
                    
                    await verificationCheck();
                    
                    // Attendre que la suppression soit complètement terminée avant de recharger
                    console.log('Attente supplémentaire pour garantir la suppression complète...');
                    return new Promise(resolve => {
                        setTimeout(() => {
                            console.log('Rechargement de la page pour actualiser l\'affichage');
                            window.location.href = window.location.href;
                            resolve(true);
                        }, 1500); // Délai de 1.5 secondes pour s'assurer que la suppression est terminée
                    });
                } catch (syncError) {
                    console.error('Erreur lors de la synchronisation après suppression:', syncError);
                    // En cas d'erreur de synchronisation, attendre aussi avant le rechargement
                    return new Promise(resolve => {
                        setTimeout(() => {
                            window.location.href = window.location.href;
                            resolve(true);
                        }, 1000);
                    });
                }
            } else {
                console.error(`Échec de la suppression de la note ${noteId} dans Supabase`);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression de la note:', error);
        }
    }
    return false;
}

/**
 * Sauvegarde une note (nouvelle ou mise à jour)
 * @param {Object} noteData - Données de la note à sauvegarder
 * @param {Array} notes - Le tableau des notes
 * @param {Function} callback - Fonction à appeler après la sauvegarde
 * @returns {Promise<string|null>} - L'identifiant de la note sauvegardée ou null en cas d'erreur
 */
export async function saveNote(noteData, notes = [], callback = null) {
    try {
        console.log('Début de la sauvegarde de la note...');

        // Normaliser toutes les propriétés pour s'assurer qu'elles sont correctement formatées
        // S'assurer que les propriétés sont des tableaux
        const processedNoteData = {
            ...noteData,
            title: noteData.title || '',
            content: noteData.content || '',
            categories: normalizeArray(noteData.categories),
            hashtags: normalizeArray(noteData.hashtags),
            videoUrls: normalizeArray(noteData.videoUrls)
        };

        const { id, title, content } = processedNoteData;
        let noteToSave;

        if (id) {
            // Mise à jour d'une note existante
            console.log(`Mise à jour de la note existante avec ID: ${id}`);
            const existingNote = notes.find(note => note.id === id);
            if (existingNote) {
                existingNote.title = title;
                existingNote.content = content;
                existingNote.categories = processedNoteData.categories;
                existingNote.hashtags = processedNoteData.hashtags;
                existingNote.videoUrls = processedNoteData.videoUrls;
                existingNote.updatedAt = new Date().toISOString();

                noteToSave = existingNote;
                console.log('Note existante mise à jour dans le tableau local');
            } else {
                // La note n'existe pas dans l'état local, créer une nouvelle note avec l'ID fourni
                console.log(`Création d'une nouvelle note avec ID fourni: ${id}`);
                noteToSave = {
                    id,
                    title,
                    content,
                    categories: processedNoteData.categories,
                    hashtags: processedNoteData.hashtags,
                    videoUrls: processedNoteData.videoUrls,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                notes.push(noteToSave);
                console.log('Nouvelle note avec ID fourni ajoutée au tableau local');
            }
        } else {
            // Création d'une nouvelle note
            const newId = generateUniqueId();
            console.log(`Création d'une nouvelle note avec ID généré: ${newId}`);
            noteToSave = {
                id: newId,
                title,
                content,
                categories: processedNoteData.categories,
                hashtags: processedNoteData.hashtags,
                videoUrls: processedNoteData.videoUrls,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.push(noteToSave);
            console.log('Nouvelle note ajoutée au tableau local');
        }

        // Vérification et log des catégories avant sauvegarde
        console.log('Catégories avant sauvegarde Supabase:', 
            Array.isArray(noteToSave.categories) ? noteToSave.categories : 'Pas un tableau');

        // Sauvegarder la note dans Supabase
        console.log('Sauvegarde de la note dans Supabase...');
        const savedNote = await saveSupabaseNote(noteToSave);

        if (!savedNote) {
            console.error('Échec de la sauvegarde dans Supabase, mais la note est sauvegardée localement');
        } else {
            console.log('Note sauvegardée avec succès dans Supabase avec ID:', savedNote.id);
        }

        // Mettre à jour les sections de révision si la fonction est disponible
        if (renderRevisitSectionsFn) {
            console.log('Mise à jour des sections de révision...');
            await renderRevisitSectionsFn(notes);
        }

        // Exécuter le callback si fourni
        if (callback) {
            console.log('Exécution du callback après sauvegarde...');
            callback();
        }

        console.log('Sauvegarde de la note terminée avec succès');
        return savedNote?.id || noteToSave.id;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la note:', error);
        return null;
    }
}

/**
 * Normalise un tableau ou une valeur en un tableau
 * @param {any} value - Valeur à normaliser
 * @returns {Array} - Tableau normalisé
 */
function normalizeArray(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.filter(Boolean); // Filtrer les valeurs falsy
    }

    if (typeof value === 'string') {
        // Si c'est une chaîne qui ressemble à un tableau JSON, essayer de la parser
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed.filter(Boolean);
                }
            } catch (e) {
                // Si le parsing échoue, traiter comme une chaîne simple
                console.warn('Erreur lors du parsing d\'une chaîne en tableau:', e);
            }
        }
        // Retourner un tableau avec la chaîne comme élément unique
        return [value];
    }

    // Pour les autres types, essayer de les convertir en chaîne puis les mettre dans un tableau
    return [String(value)];
}

/**
 * Affiche les notes dans un conteneur
 * @param {HTMLElement} container - Le conteneur où afficher les notes
 * @param {Array} notes - Le tableau des notes à afficher
 * @param {Array} filteredNotes - Optionnel - Tableau de notes filtrées à afficher
 * @param {Array} currentSearchTerms - Termes de recherche actifs
 */
export function renderNotes(container, notes, filteredNotes = null, currentSearchTerms = []) {
    const notesToRender = filteredNotes || notes;
    container.innerHTML = '';

    if (notesToRender.length === 0) {
        container.innerHTML = '';
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = createNoteElement(note, currentSearchTerms);
        container.appendChild(noteElement);
    });
}