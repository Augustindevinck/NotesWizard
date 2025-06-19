/**
 * Script pour la page de révision des notes les plus anciennes
 */

import { extractYoutubeUrls, extractImgurImages } from './scripts/categories/hashtagManager.js';

// État de l'application
const appState = {
    currentNote: null
};

// Éléments DOM
let reviewNoteDisplay;
let nextReviewBtn;
let backToHomeBtn;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', init);

/**
 * Initialise l'application
 */
async function init() {
    console.log('Initialisation de la page de révision...');

    // Initialiser les références DOM
    reviewNoteDisplay = document.getElementById('review-note-display');
    nextReviewBtn = document.getElementById('next-review-btn');
    backToHomeBtn = document.getElementById('back-to-home');

    // Afficher un message de chargement
    if (reviewNoteDisplay) {
        reviewNoteDisplay.innerHTML = '<div class="loading">Chargement de la note à réviser...</div>';
    }

    // Configurer les écouteurs d'événements
    setupEventListeners();

    try {
        // Charger la note à réviser
        await loadNoteForReview();
    } catch (error) {
        console.error("Erreur lors du chargement de la note:", error);
        displayErrorMessage("Une erreur est survenue lors du chargement de la note à réviser.");
    }
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
    // Retour à l'accueil
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Bouton pour passer à la note suivante
    if (nextReviewBtn) {
        nextReviewBtn.addEventListener('click', async () => {
            await updateCurrentNoteReviewTimestamp();
            await loadNoteForReview();
        });
    }

    // Bouton pour éditer la note courante
    const editCurrentNoteBtn = document.getElementById('edit-current-note-btn');
    if (editCurrentNoteBtn) {
        editCurrentNoteBtn.addEventListener('click', () => {
            if (appState.currentNote && appState.currentNote.id) {
                window.location.href = `edit-note.html?id=${appState.currentNote.id}`;
            }
        });
    }
}

/**
 * Charge la note la plus ancienne pour révision
 */
async function loadNoteForReview() {
    try {
        console.log('Récupération de la note la plus ancienne à réviser...');

        // Obtenir un client Supabase
        const supabase = await getSupabaseClient();

        if (!supabase) {
            console.error('Client Supabase non disponible');
            displayErrorMessage('Client Supabase non disponible. Veuillez configurer la connexion Supabase dans la page d\'accueil.');
            return;
        }

        // D'abord, essayer de récupérer une note où lastReviewedViaButton est NULL
        let { data: nullData, error: nullError } = await supabase
            .from('notes')
            .select('*')
            .is('lastReviewedViaButton', null)
            .order('createdAt', { ascending: true })
            .limit(1);

        // Si aucune note avec lastReviewedViaButton NULL n'est trouvée, récupérer celle avec la date la plus ancienne
        if ((!nullData || nullData.length === 0) && !nullError) {
            console.log('Aucune note avec lastReviewedViaButton NULL trouvée, recherche de la plus ancienne...');

            const { data: oldestData, error: oldestError } = await supabase
                .from('notes')
                .select('*')
                .order('lastReviewedViaButton', { ascending: true })
                .limit(1);

            if (oldestError) {
                console.error('Erreur lors de la récupération de la note la plus ancienne:', oldestError);

                // Si l'erreur persiste, récupérer simplement la note la plus ancienne par date de création
                console.log('Récupération de la note la plus ancienne par date de création...');
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('notes')
                    .select('*')
                    .order('createdAt', { ascending: true })
                    .limit(1);

                if (fallbackError) {
                    console.error('Erreur lors de la récupération de secours:', fallbackError);
                    displayErrorMessage('Erreur lors de la récupération des notes. Veuillez réessayer.');
                    return;
                }

                nullData = fallbackData;
            } else {
                nullData = oldestData;
            }
        } else if (nullError) {
            console.error('Erreur lors de la recherche de notes non révisées:', nullError);
            displayErrorMessage('Erreur lors de la récupération des notes. Veuillez réessayer.');
            return;
        }

        // Afficher la note récupérée ou un message si aucune note n'est disponible
        if (nullData && nullData.length > 0) {
            console.log('Note trouvée pour révision:', nullData[0].title);
            appState.currentNote = nullData[0];

            // Extraire les URLs YouTube et Imgur du contenu de la note
            if (appState.currentNote.content) {
                appState.currentNote.videoUrls = extractYoutubeUrls(appState.currentNote.content);
                appState.currentNote.imgurUrls = extractImgurImages(appState.currentNote.content);
            }

            displayNote(appState.currentNote);
        } else {
            console.log('Aucune note disponible pour révision');
            displayNoNotesMessage();
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la note pour révision:', error);
        displayErrorMessage('Une erreur est survenue lors du chargement des notes. Veuillez réessayer.');
    }
}

/**
 * Met à jour le timestamp de révision pour la note courante
 */
async function updateCurrentNoteReviewTimestamp() {
    if (!appState.currentNote) {
        console.warn('Aucune note courante à mettre à jour');
        return false;
    }

    try {
        const supabase = await getSupabaseClient();

        if (!supabase) {
            console.warn('Client Supabase non disponible pour la mise à jour');
            return false;
        }

        // Mettre à jour le timestamp de dernière révision
        const now = new Date().toISOString();
        console.log(`Mise à jour du timestamp de révision pour la note ${appState.currentNote.id} à ${now}`);

        const { data, error } = await supabase
            .from('notes')
            .update({ lastReviewedViaButton: now })
            .eq('id', appState.currentNote.id)
            .select()
            .single();

        if (error) {
            console.error('Erreur lors de la mise à jour du timestamp de révision:', error);
            return false;
        }

        console.log(`Note ${appState.currentNote.id} marquée comme révisée à ${now}`);
        return true;
    } catch (error) {
        console.error('Exception lors de la mise à jour du timestamp de révision:', error);
        return false;
    }
}

/**
 * Traite le texte masqué avec la syntaxe //texte//
 * @param {string} content - Le contenu à traiter
 * @returns {string} - Le contenu avec les éléments masqués
 */
function processHiddenText(content) {
    if (!content) return '';
    
    // Remplacer //texte// par des éléments masqués cliquables (incluant les retours à la ligne)
    // Utiliser une regex plus précise qui capture tout le contenu entre // //
    return content.replace(/\/\/([\s\S]*?)\/\//g, (match, hiddenText) => {
        const id = `hidden-${Math.random().toString(36).substr(2, 9)}`;
        // Nettoyer le texte masqué en préservant la structure mais en supprimant les espaces superflus
        const cleanHiddenText = hiddenText.trim();
        return `<span class="hidden-text-container"><span class="hidden-text-placeholder" onclick="revealHiddenText('${id}')" title="Cliquer pour révéler le texte masqué">[●●●]</span><span class="hidden-text-content" id="${id}" style="display: none;" onclick="hideText('${id}')">${cleanHiddenText}</span></span>`;
    });
}

/**
 * Affiche la note courante dans l'interface
 * @param {Object} note - La note à afficher
 */
function displayNote(note) {
    if (!note) {
        displayNoNotesMessage();
        return;
    }

    // Créer l'élément HTML pour la note
    const noteElement = document.createElement('div');
    noteElement.className = 'review-note-container';

    // Ajouter le titre
    const titleElement = document.createElement('h2');
    titleElement.className = 'review-note-title';
    titleElement.textContent = note.title || 'Sans titre';
    noteElement.appendChild(titleElement);

    // Ajouter les catégories
    if (note.categories && note.categories.length > 0) {
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'review-categories';

        note.categories.forEach(category => {
            const categoryTag = document.createElement('span');
            categoryTag.className = 'review-category';
            categoryTag.textContent = category;
            categoryTag.style.cursor = 'pointer';
            // Ajouter un événement de clic pour rediriger vers la page des catégories
            categoryTag.addEventListener('click', () => {
                window.location.href = `categories.html?category=${encodeURIComponent(category)}`;
            });
            categoriesContainer.appendChild(categoryTag);
        });

        noteElement.appendChild(categoriesContainer);
    }

    // Ajouter le contenu (en masquant les liens [[...]] et en traitant le texte masqué)
    const contentElement = document.createElement('div');
    contentElement.className = 'review-note-content';
    // Masquer les liens [[...]] comme dans view-note.js
    let displayContent = (note.content || '').replace(/\[\[.*?\]\]/g, '');
    // Traiter le texte masqué
    displayContent = processHiddenText(displayContent);
    contentElement.innerHTML = displayContent;
    noteElement.appendChild(contentElement);

    // Ajouter les vidéos YouTube si présentes
    if (note.videoUrls && note.videoUrls.length > 0) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'note-videos';
        note.videoUrls.forEach(url => {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.width = '100%';
            iframe.height = '315';
            iframe.frameBorder = '0';
            iframe.allowFullscreen = true;
            videoContainer.appendChild(iframe);
        });
        noteElement.appendChild(videoContainer);
    }

    // Ajouter les images et albums Imgur si présents
    if (note.imgurUrls && note.imgurUrls.length > 0) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'note-images';
        
        note.imgurUrls.forEach(imgurItem => {
            if (imgurItem.type === 'image') {
                // Afficher une image simple
                const img = document.createElement('img');
                img.src = imgurItem.url;
                img.className = 'imgur-image';
                img.alt = 'Image Imgur';
                img.loading = 'lazy';
                
                // Rendre l'image cliquable pour l'ouvrir dans Imgur
                const linkElement = document.createElement('a');
                linkElement.href = imgurItem.originalUrl;
                linkElement.target = '_blank';
                linkElement.rel = 'noopener noreferrer';
                linkElement.appendChild(img);
                
                imgContainer.appendChild(linkElement);
            } else if (imgurItem.type === 'album') {
                // Créer un conteneur pour l'album avec iframe
                const albumContainer = document.createElement('div');
                albumContainer.className = 'imgur-album-container';
                
                // Créer un iframe pour l'album
                const iframe = document.createElement('iframe');
                iframe.className = 'imgur-album-iframe';
                iframe.src = imgurItem.embedUrl;
                iframe.width = '100%';
                iframe.height = '500px';
                iframe.frameBorder = '0';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';
                iframe.style.backgroundColor = '#2e2e2e';
                
                // Ajouter un texte informatif
                const albumInfo = document.createElement('div');
                albumInfo.className = 'imgur-album-info';
                albumInfo.textContent = 'Album Imgur';
                
                // Assembler les éléments
                albumContainer.appendChild(iframe);
                albumContainer.appendChild(albumInfo);
                imgContainer.appendChild(albumContainer);
            }
        });
        
        noteElement.appendChild(imgContainer);
    }

    // Ajouter les hashtags en bas du contenu, après le texte
    if (note.hashtags && note.hashtags.length > 0) {
        const hashtagsContainer = document.createElement('div');
        hashtagsContainer.className = 'review-hashtags';

        note.hashtags.forEach(tag => {
            const hashtagTag = document.createElement('span');
            hashtagTag.className = 'review-hashtag';
            hashtagTag.textContent = `#${tag}`;
            hashtagTag.style.cursor = 'pointer';
            // Ajouter un événement de clic pour rediriger vers la page de recherche
            hashtagTag.addEventListener('click', () => {
                window.location.href = `search.html?q=${encodeURIComponent(tag)}`;
            });
            hashtagsContainer.appendChild(hashtagTag);
        });

        noteElement.appendChild(hashtagsContainer);
    }

    // Ajouter les dates de création et dernière révision
    const datesElement = document.createElement('div');
    datesElement.className = 'review-note-dates';

    const createdDate = new Date(note.createdAt).toLocaleDateString();
    datesElement.innerHTML = `Créé le: ${createdDate}`;

    if (note.lastReviewedViaButton) {
        const reviewedDate = new Date(note.lastReviewedViaButton).toLocaleDateString();
        datesElement.innerHTML += `<br>Dernière révision: ${reviewedDate}`;
    } else {
        datesElement.innerHTML += '<br>Jamais révisée';
    }

    noteElement.appendChild(datesElement);

    // Remplacer le contenu actuel par la nouvelle note
    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(noteElement);

    // Activer les boutons
    nextReviewBtn.disabled = false;

    // Activer aussi le bouton d'édition
    const editCurrentNoteBtn = document.getElementById('edit-current-note-btn');
    if (editCurrentNoteBtn) {
        editCurrentNoteBtn.disabled = false;
    }
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur à afficher
 */
function displayErrorMessage(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'empty-state';
    errorElement.innerHTML = `
        <h2>Erreur</h2>
        <p>${message}</p>
        <button id="retry-btn" class="review-next-btn">Réessayer</button>
    `;

    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(errorElement);

    // Désactiver les boutons
    nextReviewBtn.disabled = true;

    // Désactiver aussi le bouton d'édition
    const editCurrentNoteBtn = document.getElementById('edit-current-note-btn');
    if (editCurrentNoteBtn) {
        editCurrentNoteBtn.disabled = true;
    }

    // Ajouter un gestionnaire pour le bouton "Réessayer"
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNoteForReview);
    }
}

/**
 * Affiche un message quand aucune note n'est disponible
 */
function displayNoNotesMessage() {
    const emptyElement = document.createElement('div');
    emptyElement.className = 'empty-state';
    emptyElement.innerHTML = `
        <h2>Aucune note à réviser</h2>
        <p>Toutes vos notes ont été révisées récemment ou vous n'avez pas encore créé de notes.</p>
        <button id="go-create-btn" class="review-next-btn">Créer une note</button>
    `;

    reviewNoteDisplay.innerHTML = '';
    reviewNoteDisplay.appendChild(emptyElement);

    // Désactiver les boutons
    nextReviewBtn.disabled = true;

    // Désactiver aussi le bouton d'édition
    const editCurrentNoteBtn = document.getElementById('edit-current-note-btn');
    if (editCurrentNoteBtn) {
        editCurrentNoteBtn.disabled = true;
    }

    // Ajouter un gestionnaire pour le bouton "Créer une note"
    const goCreateBtn = document.getElementById('go-create-btn');
    if (goCreateBtn) {
        goCreateBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

/**
 * Révèle un texte masqué
 * @param {string} id - L'identifiant de l'élément à révéler
 */
function revealHiddenText(id) {
    const placeholder = document.querySelector(`[onclick="revealHiddenText('${id}')"]`);
    const content = document.getElementById(id);
    
    if (placeholder && content) {
        placeholder.style.display = 'none';
        content.style.display = 'inline';
    }
}

/**
 * Masque un texte révélé
 * @param {string} id - L'identifiant de l'élément à masquer
 */
function hideText(id) {
    const placeholder = document.querySelector(`[onclick="revealHiddenText('${id}')"]`);
    const content = document.getElementById(id);
    
    if (placeholder && content) {
        content.style.display = 'none';
        placeholder.style.display = 'inline';
    }
}

/**
 * Obtient le client Supabase à partir des paramètres stockés dans localStorage
 * @returns {Object|null} - Client Supabase ou null
 */
async function getSupabaseClient() {
    try {
        // Vérifier si le client est disponible globalement
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            const url = localStorage.getItem('supabase_url');
            const key = localStorage.getItem('supabase_key');

            if (url && key) {
                return supabase.createClient(url, key);
            }
        }

        console.error('Client Supabase ou paramètres de connexion non disponibles');
        return null;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du client Supabase:', error);
        return null;
    }
}

// Rendre les fonctions globales pour les onclick
window.revealHiddenText = revealHiddenText;
window.hideText = hideText;