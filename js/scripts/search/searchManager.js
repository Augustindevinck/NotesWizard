/**
 * Gestion de la recherche des notes
 */

import { levenshteinDistance } from './searchUtils.js';
import { renderNotes } from '../notes/notesManager.js';
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
    
    // Convertir en minuscules
    let cleaned = text.toLowerCase();
    
    // Supprimer les accents
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Supprimer les espaces multiples
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
}

/**
 * Affiche les suggestions de recherche en temps réel
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Tableau des notes
 * @param {HTMLElement} searchResults - Conteneur pour les résultats de recherche
 * @param {Function} onSuggestionClick - Fonction à appeler lors du clic sur une suggestion
 */
export function showSearchSuggestions(query, notes, searchResults, onSuggestionClick) {
    if (!query || !searchResults) return;

    query = query.trim();

    if (query === '') {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        return;
    }

    // Effectuer la recherche avec le texte actuel
    const searchResultItems = performSearch(query, notes);

    // Afficher les suggestions de recherche
    if (searchResultItems.length > 0) {
        searchResults.innerHTML = '';

        searchResultItems.slice(0, 5).forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';

            // Préparer le texte à afficher (titre ou début du contenu)
            let displayText = result.note.title || result.note.content.substring(0, 30) + '...';

            // Mettre en surbrillance le terme recherché dans le texte de suggestion
            const queryTerms = query.split(/\s+/).filter(term => term.length > 1);
            queryTerms.forEach(term => {
                if (term.length > 1) {
                    const regex = new RegExp(`(${term})`, 'gi');
                    displayText = displayText.replace(regex, '<span class="highlighted-term">$1</span>');
                }
            });

            resultItem.innerHTML = displayText;

            // Ajouter un événement de clic pour ouvrir la note
            resultItem.addEventListener('click', () => {
                if (onSuggestionClick) {
                    onSuggestionClick(result.note);
                }
                searchResults.innerHTML = '';
                searchResults.classList.remove('active');
            });

            searchResults.appendChild(resultItem);
        });

        searchResults.classList.add('active');
    } else {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
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
    if (!query || !notesContainer) return;

    query = query.trim();

    if (query === '') {
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }
        currentSearchTerms = []; // Réinitialiser les termes de recherche
        
        // Revenir à l'état vide au lieu d'afficher toutes les notes
        notesContainer.innerHTML = '';
        notesContainer.style.display = 'none';
        
        // Réafficher les sections de révision
        if (revisitSections) {
            revisitSections.style.display = 'flex';
        }
        return;
    }

    // Masquer les sections de révision pendant la recherche
    if (revisitSections) {
        revisitSections.style.display = 'none';
    }

    // Enregistrer les termes de recherche (mots individuels)
    currentSearchTerms = query.split(/\s+/).filter(term => term.length > 1);

    // Perform search
    const searchResultItems = performSearch(query, notes);

    // Display search results
    if (searchResultItems.length > 0) {
        // Masquer les suggestions après la recherche
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }

        // Marquer chaque note comme résultat de recherche
        searchResultItems.forEach(result => {
            result.note.isSearchResult = true;
        });

        // Afficher les résultats dans la vue principale
        if (notesContainer) {
            notesContainer.style.display = 'grid';
            renderNotes(notesContainer, notes, searchResultItems.map(result => result.note), currentSearchTerms);
        }
    } else {
        // Aucun résultat trouvé
        if (searchResults) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
        }
        if (notesContainer) {
            notesContainer.style.display = 'block';
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <h2>Aucune note trouvée</h2>
                    <p>Aucune note ne correspond à votre recherche.</p>
                </div>
            `;
        }
    }
}

/**
 * Effectue une recherche dans les notes
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Le tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function performSearch(query, notes) {
    // Clean the query: lowercase, remove accents, remove extra spaces
    const cleanedQuery = cleanText(query);

    // First try strict search
    let results = strictSearch(cleanedQuery, notes);

    // If no results, try fuzzy search with Levenshtein distance
    if (results.length === 0) {
        results = fuzzySearch(cleanedQuery, notes);
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
}

/**
 * Recherche stricte (correspondance exacte)
 * @param {string} cleanedQuery - Requête nettoyée
 * @param {Array} notes - Tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function strictSearch(cleanedQuery, notes) {
    const results = [];
    const queryTerms = cleanedQuery.split(/\s+/).filter(term => term.length > 0);

    notes.forEach(note => {
        // Prepare note content for search (lowercase, no accents)
        const cleanedContent = cleanText(note.content);
        const cleanedTitle = cleanText(note.title || '');
        
        // Check for exact matches in content and title
        let score = 0;
        
        queryTerms.forEach(term => {
            // Title match (higher weight)
            if (cleanedTitle.includes(term)) {
                score += 3;
            }
            
            // Content match
            if (cleanedContent.includes(term)) {
                score += 2;
            }
            
            // Category match
            if (note.categories) {
                note.categories.forEach(category => {
                    if (cleanText(category).includes(term)) {
                        score += 2;
                    }
                });
            }
            
            // Hashtag match
            if (note.hashtags) {
                note.hashtags.forEach(tag => {
                    if (cleanText(tag).includes(term)) {
                        score += 2;
                    }
                });
            }
        });

        if (score > 0) {
            results.push({ note, score });
        }
    });

    return results;
}

/**
 * Recherche floue avec distance de Levenshtein
 * @param {string} cleanedQuery - Requête nettoyée
 * @param {Array} notes - Tableau des notes
 * @returns {Array} - Résultats de recherche avec score
 */
export function fuzzySearch(cleanedQuery, notes) {
    const results = [];
    const queryTerms = cleanedQuery.split(/\s+/).filter(term => term.length > 0);
    
    notes.forEach(note => {
        // Prepare note content for search
        const cleanedContent = cleanText(note.content);
        const cleanedTitle = cleanText(note.title || '');
        const contentWords = cleanedContent.split(/\s+/);
        const titleWords = cleanedTitle.split(/\s+/);
        
        let score = 0;
        
        queryTerms.forEach(queryTerm => {
            // Skip very short terms
            if (queryTerm.length < 2) return;
            
            // Check content words
            contentWords.forEach(word => {
                if (word.length < 3) return; // Skip very short words
                
                const distance = levenshteinDistance(queryTerm, word);
                // Score based on similarity (lower distance = higher score)
                if (distance <= 2) {
                    // More exact matches get higher scores
                    score += (3 - distance);
                }
            });
            
            // Check title words (higher weight)
            titleWords.forEach(word => {
                if (word.length < 3) return;
                
                const distance = levenshteinDistance(queryTerm, word);
                if (distance <= 2) {
                    score += (3 - distance) * 1.5; // Higher weight for title matches
                }
            });
            
            // Check categories
            if (note.categories) {
                note.categories.forEach(category => {
                    const cleanedCategory = cleanText(category);
                    if (cleanedCategory.includes(queryTerm) || levenshteinDistance(queryTerm, cleanedCategory) <= 2) {
                        score += 2;
                    }
                });
            }
            
            // Check hashtags
            if (note.hashtags) {
                note.hashtags.forEach(tag => {
                    const cleanedTag = cleanText(tag);
                    if (cleanedTag.includes(queryTerm) || levenshteinDistance(queryTerm, cleanedTag) <= 2) {
                        score += 2;
                    }
                });
            }
        });

        if (score > 0) {
            results.push({ note, score });
        }
    });

    return results;
}

/**
 * Récupère les termes de recherche actuels
 * @returns {Array} - Termes de recherche
 */
export function getCurrentSearchTerms() {
    return currentSearchTerms;
}