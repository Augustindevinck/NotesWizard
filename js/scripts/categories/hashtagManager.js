/**
 * Gestion des hashtags et leur détection
 */

/**
 * Détecte les hashtags dans le contenu d'une note
 * @param {string} content - Le contenu de la note
 * @param {HTMLElement} detectedHashtags - Le conteneur où afficher les hashtags détectés
 */
export function detectHashtags(content, detectedHashtags) {
    if (!content || !detectedHashtags) return;

    // Vider le conteneur des hashtags
    detectedHashtags.innerHTML = '';

    // Extraire les hashtags
    const hashtags = extractHashtags(content);

    // Afficher les hashtags détectés
    if (hashtags.length > 0) {
        hashtags.forEach(tag => {
            addHashtagTag(tag, detectedHashtags);
        });
    }
}

/**
 * Extrait les hashtags du contenu
 * @param {string} content - Le contenu où chercher les hashtags
 * @returns {Array} - Tableau des hashtags trouvés (sans le #)
 */
export function extractHashtags(content) {
    if (!content) return [];

    const hashtags = new Set();
    const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
        hashtags.add(match[1].toLowerCase());
    }
    
    return Array.from(hashtags);
}

/**
 * Extrait les URLs YouTube du contenu
 * @param {string} content - Le contenu où chercher les URLs
 * @returns {Array} - Tableau des URLs YouTube trouvées
 */
export function extractYoutubeUrls(content) {
    if (!content) return [];

    const videoUrls = [];
    const urlRegex = /https:\/\/(www\.)?youtu(be\.com\/watch\?v=|\.be\/)([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
        const videoId = match[3];
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        videoUrls.push(embedUrl);
    }
    
    return videoUrls;
}

/**
 * Ajoute un tag de hashtag
 * @param {string} tag - Le hashtag à ajouter (sans le #)
 * @param {HTMLElement} container - Le conteneur où ajouter le tag
 */
export function addHashtagTag(tag, container) {
    // Vérifier si le hashtag existe déjà
    const existingTags = container.querySelectorAll('.hashtag-tag');
    for (const existingTag of existingTags) {
        if (existingTag.textContent.trim() === `#${tag}`) {
            return; // Éviter les doublons
        }
    }

    // Créer le tag de hashtag
    const tagElement = document.createElement('span');
    tagElement.className = 'hashtag-tag';
    tagElement.textContent = `#${tag}`;
    container.appendChild(tagElement);
}