/**
 * Gestion de la recherche des notes
 */

import { levenshteinDistance } from './searchUtils.js';
import { highlightSearchResults } from './highlight.js';

// Termes de recherche actuels
let currentSearchTerms = [];

/**
 * Initialise le gestionnaire de recherche
 * @param {Array} terms - Termes de recherche initiaux
 */
export function initSearchManager(terms = []) {
    currentSearchTerms = terms;
}

/**
 * Nettoie le texte pour la recherche (minuscules, sans accents, espaces extra)
 * @param {string} text - Texte à nettoyer
 * @returns {string} - Texte nettoyé
 */
export function cleanText(text) {
    if (!text) return '';
    
    return text.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
        .replace(/\s+/g, ' ')            // Normalise les espaces
        .trim();
}

/**
 * Affiche les suggestions de recherche en temps réel
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Tableau des notes
 * @param {HTMLElement} searchResults - Conteneur pour les résultats de recherche
 * @param {Function} onSuggestionClick - Fonction à appeler lors du clic sur une suggestion
 */
export function showSearchSuggestions(query, notes, searchResults, onSuggestionClick) {
    if (!searchResults) return;
    
    // Masquer les suggestions si la requête est vide
    if (!query.trim()) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        return;
    }
    
    // Effectuer la recherche
    const results = performSearch(query, notes);
    
    // Limiter à 5 suggestions
    const topResults = results.slice(0, 5);
    
    // Mettre à jour les termes de recherche actuels
    currentSearchTerms = query.trim().toLowerCase().split(/\s+/);
    
    // Afficher les suggestions
    if (topResults.length > 0) {
        searchResults.innerHTML = '';
        
        topResults.forEach(result => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'search-suggestion';
            
            // Mettre en évidence les termes dans le titre
            const title = result.note.title || 'Sans titre';
            const highlightedTitle = highlightSearchResults(title, currentSearchTerms);
            
            // Extraire un extrait du contenu avec le terme trouvé
            let content = result.note.content || '';
            
            // Limiter la longueur de l'extrait
            if (content.length > 100) {
                content = content.substring(0, 100) + '...';
            }
            
            // Mettre en évidence les termes dans le contenu
            const highlightedContent = highlightSearchResults(content, currentSearchTerms);
            
            // Ajouter uniquement le titre (sans contenu)
            suggestionItem.innerHTML = `
                <div class="suggestion-title">${highlightedTitle}</div>
            `;
            
            // Ajouter l'écouteur d'événement pour le clic
            suggestionItem.addEventListener('click', () => {
                if (onSuggestionClick) {
                    onSuggestionClick(result.note);
                }
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
            });
            
            searchResults.appendChild(suggestionItem);
        });
        
        searchResults.style.display = 'block';
    } else {
        searchResults.innerHTML = '<div class="no-results">Aucun résultat</div>';
        searchResults.style.display = 'block';
    }
}

/**
 * Gère l'action de recherche complète
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Le tableau des notes
 * @param {HTMLElement} searchResults - Le conteneur des suggestions de recherche
 * @param {HTMLElement} notesContainer - Le conteneur principal des notes
 * @param {HTMLElement} revisitSections - Le conteneur des sections de révision
 */
export function handleSearch(query, notes, searchResults, notesContainer, revisitSections) {
    // Masquer les suggestions
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    
    if (!query.trim()) {
        // Si la recherche est vide, afficher l'état par défaut
        revisitSections.style.display = 'flex';
        notesContainer.style.display = 'none';
        return;
    }
    
    // Masquer les sections de révision et afficher le conteneur de notes
    revisitSections.style.display = 'none';
    notesContainer.style.display = 'grid';
    
    // Mettre à jour les termes de recherche actuels
    currentSearchTerms = query.trim().toLowerCase().split(/\s+/);
    
    // Effectuer la recherche
    const results = performSearch(query, notes);
    
    if (results.length > 0) {
        // Créer une copie des notes trouvées avec la propriété isSearchResult
        const markedResults = results.map(result => {
            return {
                ...result.note,
                isSearchResult: true,
                searchScore: result.score
            };
        });
        
        // Afficher les résultats
        markedResults.sort((a, b) => b.searchScore - a.searchScore);
        notesContainer.innerHTML = '';
        
        // Créer un en-tête pour les résultats de recherche
        const searchHeader = document.createElement('div');
        searchHeader.className = 'search-results-header';
        searchHeader.innerHTML = `${results.length} résultat(s) pour "${query}"`;
        notesContainer.appendChild(searchHeader);
        
        // Afficher toutes les notes (le filtrage est géré par renderNotes)
        return markedResults;
    } else {
        notesContainer.innerHTML = `
            <div class="empty-search">
                <p>Aucun résultat trouvé pour "${query}"</p>
                <p>Essayez d'autres termes de recherche.</p>
            </div>
        `;
        return [];
    }
}

/**
 * Effectue une recherche dans les notes
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Le tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function performSearch(query, notes) {
    if (!query || !notes || notes.length === 0) {
        return [];
    }
    
    const cleanedQuery = cleanText(query);
    
    // Essayer d'abord une recherche stricte
    const strictResults = strictSearch(cleanedQuery, notes);
    
    // Si aucun résultat strict, essayer une recherche floue
    if (strictResults.length === 0) {
        return fuzzySearch(cleanedQuery, notes);
    }
    
    return strictResults;
}

/**
 * Recherche stricte (correspondance exacte)
 * @param {string} cleanedQuery - Requête nettoyée
 * @param {Array} notes - Tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function strictSearch(cleanedQuery, notes) {
    const queryTerms = cleanedQuery.split(/\s+/);
    const results = [];
    
    notes.forEach(note => {
        let score = 0;
        const cleanTitle = cleanText(note.title || '');
        const cleanContent = cleanText(note.content || '');
        
        // Rechercher chaque terme dans le titre et le contenu
        queryTerms.forEach(term => {
            if (term.length < 2) return; // Ignorer les termes trop courts
            
            // Points pour le titre (titre a plus de poids)
            if (cleanTitle.includes(term)) {
                score += 10;
            }
            
            // Points pour le contenu
            if (cleanContent.includes(term)) {
                score += 5;
            }
            
            // Points pour les catégories
            if (note.categories && note.categories.length > 0) {
                note.categories.forEach(category => {
                    if (cleanText(category).includes(term)) {
                        score += 8;
                    }
                });
            }
            
            // Points pour les hashtags
            if (note.hashtags && note.hashtags.length > 0) {
                note.hashtags.forEach(tag => {
                    if (cleanText(tag).includes(term)) {
                        score += 8;
                    }
                });
            }
        });
        
        if (score > 0) {
            results.push({ note, score });
        }
    });
    
    // Trier par score décroissant
    return results.sort((a, b) => b.score - a.score);
}

/**
 * Recherche floue avec distance de Levenshtein
 * @param {string} cleanedQuery - Requête nettoyée
 * @param {Array} notes - Tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function fuzzySearch(cleanedQuery, notes) {
    const queryTerms = cleanedQuery.split(/\s+/);
    const results = [];
    
    notes.forEach(note => {
        let score = 0;
        const cleanTitle = cleanText(note.title || '');
        const cleanContent = cleanText(note.content || '');
        
        // Diviser le contenu en mots pour la recherche floue
        const titleWords = cleanTitle.split(/\s+/);
        const contentWords = cleanContent.split(/\s+/);
        
        // Rechercher chaque terme avec distance de Levenshtein
        queryTerms.forEach(term => {
            if (term.length < 3) return; // Ignorer les termes trop courts pour éviter les faux positifs
            
            // Recherche floue dans le titre
            titleWords.forEach(word => {
                if (word.length >= 3) {
                    const distance = levenshteinDistance(term, word);
                    // Si la distance est faible par rapport à la longueur du mot
                    if (distance <= Math.min(2, Math.floor(word.length / 3))) {
                        // Plus la distance est petite, plus le score est élevé
                        score += 10 * (1 - distance / Math.max(term.length, word.length));
                    }
                }
            });
            
            // Recherche floue dans le contenu (limiter aux 200 premiers mots pour l'efficacité)
            const limitedContentWords = contentWords.slice(0, 200);
            limitedContentWords.forEach(word => {
                if (word.length >= 3) {
                    const distance = levenshteinDistance(term, word);
                    if (distance <= Math.min(2, Math.floor(word.length / 3))) {
                        score += 5 * (1 - distance / Math.max(term.length, word.length));
                    }
                }
            });
            
            // Recherche floue dans les catégories
            if (note.categories && note.categories.length > 0) {
                note.categories.forEach(category => {
                    const cleanCategory = cleanText(category);
                    const distance = levenshteinDistance(term, cleanCategory);
                    if (distance <= Math.min(2, Math.floor(cleanCategory.length / 3))) {
                        score += 8 * (1 - distance / Math.max(term.length, cleanCategory.length));
                    }
                });
            }
            
            // Recherche floue dans les hashtags
            if (note.hashtags && note.hashtags.length > 0) {
                note.hashtags.forEach(tag => {
                    const cleanTag = cleanText(tag);
                    const distance = levenshteinDistance(term, cleanTag);
                    if (distance <= Math.min(2, Math.floor(cleanTag.length / 3))) {
                        score += 8 * (1 - distance / Math.max(term.length, cleanTag.length));
                    }
                });
            }
        });
        
        // N'ajouter que les notes avec un score minimum
        if (score >= 3) {
            results.push({ note, score });
        }
    });
    
    // Trier par score décroissant
    return results.sort((a, b) => b.score - a.score);
}

/**
 * Récupère les termes de recherche actuels
 * @returns {Array} - Termes de recherche
 */
export function getCurrentSearchTerms() {
    return currentSearchTerms;
}