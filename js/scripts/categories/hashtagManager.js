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

    // Extraire les hashtags du contenu
    const hashtags = extractHashtags(content);

    // Vider le conteneur des hashtags détectés
    detectedHashtags.innerHTML = '';

    // Ajouter chaque hashtag comme un tag
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

    // Utiliser une regex pour trouver tous les hashtags
    // un hashtag commence par # et est suivi d'un ou plusieurs caractères qui ne sont pas des espaces ou des ponctuations
    const regex = /#([a-zA-Z0-9_\u00C0-\u017F]+)/g;
    const matches = content.match(regex) || [];

    // Retirer le # et éliminer les doublons
    return [...new Set(matches.map(tag => tag.substring(1)))];
}

/**
 * Extrait les URLs YouTube du contenu
 * @param {string} content - Le contenu où chercher les URLs
 * @returns {Array} - Tableau des URLs YouTube trouvées
 */
export function extractYoutubeUrls(content) {
    if (!content) return [];

    // Regex pour trouver les URLs YouTube (supporte les formats courts et longs)
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    const matches = content.matchAll(regex);
    const urls = [];

    // Extraire les IDs vidéo et créer des URLs intégrables
    for (const match of matches) {
        const videoId = match[1];
        if (videoId) {
            urls.push(`https://www.youtube.com/embed/${videoId}`);
        }
    }

    // Éliminer les doublons
    return [... new Set(urls)];
}

/**
 * Extrait les liens d'images et d'albums Imgur du contenu entre [[ ]]
 * @param {string} content - Le contenu où chercher les liens Imgur
 * @returns {Array} - Tableau d'objets contenant les informations des médias Imgur trouvés
 */
export function extractImgurImages(content) {
    if (!content) return [];

    // Regex pour trouver les liens Imgur entre [[ ]]
    const regex = /\[\[(https?:\/\/(?:i\.|m\.|)imgur\.com\/(?:a\/|gallery\/)?[a-zA-Z0-9]+(?:\.[a-zA-Z]{3,4})?)\]\]/g;
    const matches = content.matchAll(regex);
    const imgurMedia = [];

    // Extraire les URLs des images
    for (const match of matches) {
        const imgUrl = match[1];
        if (imgUrl) {
            // Détecter si c'est un album, une galerie ou une image simple
            const isAlbum = imgUrl.includes('/a/') || imgUrl.includes('/gallery/');
            
            if (isAlbum) {
                // Extraire l'ID de l'album ou de la galerie
                const albumIdMatch = imgUrl.match(/\/(?:a|gallery)\/([a-zA-Z0-9]+)/);
                if (albumIdMatch && albumIdMatch[1]) {
                    const albumId = albumIdMatch[1];
                    
                    // Pour les albums, nous allons créer un iframe avec l'URL correcte d'intégration
                    imgurMedia.push({
                        type: 'album',
                        id: albumId,
                        originalUrl: imgUrl,
                        embedUrl: `https://imgur.com/a/${albumId}/embed?pub=true`,
                        thumbnailUrl: `https://i.imgur.com/${albumId}h.jpg`
                    });
                }
            } else {
                // C'est une image simple
                // Extraire l'ID de l'image, qu'il y ait une extension ou non
                let imageId;
                const imgIdMatch = imgUrl.match(/imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-zA-Z]{3,4})?$/);
                if (imgIdMatch && imgIdMatch[1]) {
                    imageId = imgIdMatch[1];
                    
                    // Créer une URL directe vers l'image
                    const directUrl = `https://i.imgur.com/${imageId}.jpg`;
                    
                    imgurMedia.push({
                        type: 'image',
                        id: imageId,
                        url: directUrl,
                        originalUrl: imgUrl
                    });
                }
            }
        }
    }

    return imgurMedia;
}

/**
 * Ajoute un tag de hashtag
 * @param {string} tag - Le hashtag à ajouter (sans le #)
 * @param {HTMLElement} container - Le conteneur où ajouter le tag
 */
export function addHashtagTag(tag, container) {
    // Vérifier si le hashtag existe déjà
    const existingTags = container.querySelectorAll('.hashtag-tag');
    for (let existingTag of existingTags) {
        const tagName = existingTag.querySelector('.tag-name');
        if (tagName && tagName.textContent === `#${tag}` || existingTag.textContent === `#${tag}`) {
            return; // Éviter les doublons
        }
    }

    // Créer un span pour le tag (structure simplifiée)
    const hashtagTag = document.createElement('span');
    hashtagTag.className = 'hashtag-tag';
    hashtagTag.dataset.value = tag; // Stocker la valeur dans un attribut data
    hashtagTag.textContent = `#${tag}`;

    container.appendChild(hashtagTag);
}