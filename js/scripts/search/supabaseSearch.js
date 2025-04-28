/**
 * Adaptation du gestionnaire de recherche pour utiliser Supabase
 */

import { cleanText, strictSearch, fuzzySearch } from './searchManager.js';
import { searchNotes as searchNotesFromSupabase } from '../utils/supabaseStorage.js';
import { isSupabaseInitialized } from '../utils/supabaseClient.js';

// Termes de recherche actuels (partagés avec searchManager.js)
let currentSearchTerms = [];

/**
 * Initialise le gestionnaire de recherche Supabase
 * @param {Array} terms - Termes de recherche initiaux
 */
export function initSupabaseSearchManager(terms = []) {
    currentSearchTerms = terms;
}

/**
 * Effectue une recherche dans les notes via Supabase ou en local
 * @param {string} query - La requête de recherche
 * @param {Array} notes - Le tableau des notes (pour fallback local)
 * @returns {Promise<Array>} - Résultats de recherche avec score
 */
export async function performSearch(query, notes) {
    if (!query || !notes || notes.length === 0) {
        return [];
    }
    
    const cleanedQuery = cleanText(query);
    
    // Si Supabase est initialisé, tenter une recherche via la base de données
    if (isSupabaseInitialized()) {
        try {
            const supabaseResults = await searchNotesFromSupabase(cleanedQuery);
            
            // Si des résultats de Supabase sont disponibles, les utiliser
            if (supabaseResults && supabaseResults.length > 0) {
                // Calculer les scores avec notre système de scoring existant
                const scoredResults = [];
                
                // Essayer d'abord une recherche stricte
                const strictResults = strictSearch(cleanedQuery, supabaseResults);
                
                // Si aucun résultat strict, essayer une recherche floue
                if (strictResults.length === 0) {
                    const fuzzyResults = fuzzySearch(cleanedQuery, supabaseResults);
                    return fuzzyResults;
                }
                
                return strictResults;
            }
        } catch (error) {
            console.error('Erreur lors de la recherche Supabase, utilisation de la recherche locale:', error);
        }
    }
    
    // Recherche locale (fallback)
    
    // Essayer d'abord une recherche stricte
    const strictResults = strictSearch(cleanedQuery, notes);
    
    // Si aucun résultat strict, essayer une recherche floue
    if (strictResults.length === 0) {
        return fuzzySearch(cleanedQuery, notes);
    }
    
    return strictResults;
}

/**
 * Récupère les termes de recherche actuels
 * @returns {Array} - Termes de recherche
 */
export function getCurrentSearchTerms() {
    return currentSearchTerms;
}

/**
 * Définit les termes de recherche actuels
 * @param {Array} terms - Nouveaux termes de recherche
 */
export function setCurrentSearchTerms(terms) {
    currentSearchTerms = terms;
}