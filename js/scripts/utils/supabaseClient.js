/**
 * Client Supabase partagé pour l'application
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Variable pour stocker le client Supabase
let supabaseClient = null;

/**
 * Initialise le client Supabase avec les paramètres donnés
 * @param {string} url - URL du projet Supabase
 * @param {string} key - Clé API publique/anon
 * @returns {Object} - Client Supabase
 */
export function initSupabase(url, key) {
    if (!url || !key) {
        console.warn('Paramètres Supabase manquants');
        return null;
    }
    
    try {
        supabaseClient = createClient(url, key);
        return supabaseClient;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Supabase:', error);
        return null;
    }
}

/**
 * Retourne le client Supabase existant ou null
 * @returns {Object|null} - Client Supabase
 */
export function getClient() {
    return supabaseClient;
}

/**
 * Vérifie si le client Supabase est initialisé
 * @returns {boolean} - Vrai si le client est initialisé
 */
export function isInitialized() {
    return !!supabaseClient;
}

/**
 * Exécute une requête pour tester la connexion Supabase
 * @returns {Promise<boolean>} - Vrai si la connexion est établie
 */
export async function testConnection() {
    if (!supabaseClient) {
        return false;
    }
    
    try {
        // Tester la connexion en récupérant une note
        const { data, error } = await supabaseClient
            .from('notes')
            .select('id')
            .limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = "No rows found"
            console.error('Erreur de connexion Supabase:', error);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors du test de connexion Supabase:', error);
        return false;
    }
}