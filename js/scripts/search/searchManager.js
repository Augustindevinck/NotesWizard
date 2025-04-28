/**
 * Module de gestion des fonctionnalités de recherche
 */

/**
 * Supprime les accents, met en minuscule et traite le texte pour la recherche
 * @param {string} text - Texte à traiter
 * @returns {string} - Texte nettoyé
 */
export function cleanText(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Vérifie si un terme de recherche est présent dans un texte
 * @param {string} text - Texte où chercher
 * @param {string} searchTerm - Terme de recherche
 * @returns {boolean} - Vrai si le terme est trouvé
 */
export function containsSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return false;
    
    const cleanedText = cleanText(text);
    const cleanedTerm = cleanText(searchTerm);
    
    return cleanedText.includes(cleanedTerm);
}

/**
 * Calcule un score de pertinence pour une note par rapport à une requête
 * Plus le score est élevé, plus la note est pertinente
 * @param {Object} note - La note à évaluer
 * @param {string} query - La requête de recherche
 * @returns {number} - Score de pertinence
 */
export function computeRelevanceScore(note, query) {
    if (!note || !query) return 0;
    
    const cleanedQuery = cleanText(query);
    const searchTerms = cleanedQuery.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) return 0;
    
    let score = 0;
    
    // Vérifier le titre (poids plus important)
    if (note.title) {
        const cleanedTitle = cleanText(note.title);
        
        // Correspondance exacte du titre (très forte pertinence)
        if (cleanedTitle === cleanedQuery) {
            score += 50;
        } 
        // Le titre commence par la requête
        else if (cleanedTitle.startsWith(cleanedQuery)) {
            score += 30;
        }
        // Le titre contient la requête
        else if (cleanedTitle.includes(cleanedQuery)) {
            score += 20;
        }
        
        // Vérifier chaque terme individuellement dans le titre
        for (const term of searchTerms) {
            if (cleanedTitle.includes(term)) {
                score += 5;
            }
        }
    }
    
    // Vérifier le contenu
    if (note.content) {
        const cleanedContent = cleanText(note.content);
        
        // Correspondance exacte du contenu
        if (cleanedContent.includes(cleanedQuery)) {
            score += 10;
        }
        
        // Vérifier chaque terme individuellement dans le contenu
        for (const term of searchTerms) {
            const matches = cleanedContent.split(term).length - 1;
            score += matches * 2; // Plus il y a d'occurrences, plus le score est élevé
        }
    }
    
    // Vérifier les catégories (poids important)
    if (note.categories && Array.isArray(note.categories)) {
        for (const category of note.categories) {
            const cleanedCategory = cleanText(category);
            
            // Correspondance exacte avec une catégorie
            if (cleanedCategory === cleanedQuery) {
                score += 30;
            }
            
            // Vérifier chaque terme individuellement dans les catégories
            for (const term of searchTerms) {
                if (cleanedCategory.includes(term)) {
                    score += 10;
                }
            }
        }
    }
    
    // Vérifier les hashtags
    if (note.hashtags && Array.isArray(note.hashtags)) {
        for (const hashtag of note.hashtags) {
            const cleanedHashtag = cleanText(hashtag);
            
            // Correspondance exacte avec un hashtag
            if (cleanedHashtag === cleanedQuery) {
                score += 20;
            }
            
            // Vérifier chaque terme individuellement dans les hashtags
            for (const term of searchTerms) {
                if (cleanedHashtag.includes(term)) {
                    score += 8;
                }
            }
        }
    }
    
    // Facteur de récence (légère influence)
    if (note.updatedAt) {
        const updatedDate = new Date(note.updatedAt);
        const now = new Date();
        const daysDifference = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24));
        
        // Les notes plus récentes ont un bonus (max 5 points pour les notes de moins d'une semaine)
        if (daysDifference < 7) {
            score += 5 - Math.floor(daysDifference / 2);
        }
    }
    
    return score;
}

/**
 * Effectue une recherche avancée dans un tableau de notes
 * @param {Array} notes - Tableau de notes où effectuer la recherche
 * @param {string} query - Requête de recherche
 * @param {Object} options - Options de recherche (filtres, tri, etc.)
 * @returns {Array} - Notes correspondant aux critères de recherche, triées par pertinence
 */
export function advancedSearch(notes, query, options = {}) {
    if (!notes || !Array.isArray(notes) || !query) {
        return [];
    }
    
    const cleanedQuery = cleanText(query);
    
    if (!cleanedQuery) {
        return [];
    }
    
    // Options par défaut
    const defaultOptions = {
        searchInTitle: true,
        searchInContent: true,
        searchInCategories: true,
        searchInHashtags: true,
        filterByCategory: null,
        onlyRecentNotes: false,
        limit: null,
    };
    
    // Fusionner les options par défaut avec les options fournies
    const searchOptions = { ...defaultOptions, ...options };
    
    // Termes de recherche individuels
    const searchTerms = cleanedQuery.split(/\s+/).filter(term => term.length > 0);
    
    // Filtrer les notes selon les critères
    const filteredNotes = notes.filter(note => {
        // Vérifier si la note est définie
        if (!note) return false;
        
        // Filtrer par catégorie si spécifié
        if (searchOptions.filterByCategory && note.categories) {
            if (!note.categories.includes(searchOptions.filterByCategory)) {
                return false;
            }
        }
        
        // Filtrer par date si l'option est activée (notes des 30 derniers jours)
        if (searchOptions.onlyRecentNotes && note.createdAt) {
            const createdDate = new Date(note.createdAt);
            const now = new Date();
            const daysDifference = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
            
            if (daysDifference > 30) {
                return false;
            }
        }
        
        // Créer des versions nettoyées des champs de note
        const cleanedTitle = note.title ? cleanText(note.title) : '';
        const cleanedContent = note.content ? cleanText(note.content) : '';
        
        // Vérifier si l'un des termes de recherche est présent dans le titre
        if (searchOptions.searchInTitle && cleanedTitle) {
            for (const term of searchTerms) {
                if (cleanedTitle.includes(term)) {
                    return true;
                }
            }
        }
        
        // Vérifier si l'un des termes de recherche est présent dans le contenu
        if (searchOptions.searchInContent && cleanedContent) {
            for (const term of searchTerms) {
                if (cleanedContent.includes(term)) {
                    return true;
                }
            }
        }
        
        // Vérifier les catégories
        if (searchOptions.searchInCategories && note.categories && Array.isArray(note.categories)) {
            for (const category of note.categories) {
                const cleanedCategory = cleanText(category);
                
                for (const term of searchTerms) {
                    if (cleanedCategory.includes(term)) {
                        return true;
                    }
                }
            }
        }
        
        // Vérifier les hashtags
        if (searchOptions.searchInHashtags && note.hashtags && Array.isArray(note.hashtags)) {
            for (const hashtag of note.hashtags) {
                const cleanedHashtag = cleanText(hashtag);
                
                for (const term of searchTerms) {
                    if (cleanedHashtag.includes(term)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    });
    
    // Calculer le score de pertinence pour chaque note
    const scoredNotes = filteredNotes.map(note => ({
        ...note,
        relevanceScore: computeRelevanceScore(note, cleanedQuery)
    }));
    
    // Trier par score de pertinence (du plus élevé au plus bas)
    scoredNotes.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limiter le nombre de résultats si demandé
    if (searchOptions.limit && typeof searchOptions.limit === 'number') {
        return scoredNotes.slice(0, searchOptions.limit);
    }
    
    return scoredNotes;
}

/**
 * Surligne les termes de recherche dans un texte
 * @param {string} text - Texte où surligner les termes
 * @param {Array} searchTerms - Termes à surligner
 * @returns {string} - HTML avec les termes surlignés
 */
export function highlightSearchTerms(text, searchTerms) {
    if (!text || !searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
        return text;
    }
    
    let highlightedText = text;
    
    // Échapper le texte pour une utilisation sans danger dans une regex
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Pour chaque terme de recherche, le surligner dans le texte
    for (const term of searchTerms) {
        if (!term) continue;
        
        const cleanedTerm = cleanText(term);
        if (!cleanedTerm) continue;
        
        // Créer une expression régulière qui correspond au terme, insensible à la casse
        const regex = new RegExp(`(${escapeRegExp(cleanedTerm)})`, 'gi');
        
        // Remplacer toutes les occurrences du terme par une version surlignée
        highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
    }
    
    return highlightedText;
}