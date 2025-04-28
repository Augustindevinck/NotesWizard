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
export async function initSupabase(url, key) {
    if (!url || !key) {
        console.warn('Paramètres Supabase manquants');
        return null;
    }
    
    try {
        supabaseClient = createClient(url, key);
        
        // Connecter en tant qu'utilisateur anonyme pour que RLS fonctionne
        const { data, error } = await supabaseClient.auth.signInAnonymously();
        if (error) {
            console.error('Erreur lors de la connexion anonyme:', error);
            // Continuer quand même car certaines opérations pourraient fonctionner
        } else {
            console.log('Connecté en tant qu\'utilisateur anonyme avec ID:', data.user?.id);
        }
        
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

/**
 * Initialise les tables nécessaires dans Supabase
 * @returns {Promise<boolean>} - Vrai si l'initialisation a réussi
 */
export async function initializeTables() {
    if (!supabaseClient) {
        console.error('Client Supabase non initialisé');
        return false;
    }
    
    try {
        // Vérifie simplement que la table notes existe et est accessible
        console.log('Vérification de la connexion à Supabase...');
        const { data, error: notesCheckError } = await supabaseClient
            .from('notes')
            .select('id')
            .limit(1);
            
        if (notesCheckError) {
            if (notesCheckError.code === '42P01') { // Relation does not exist
                console.error('La table notes n\'existe pas dans Supabase. Veuillez la créer manuellement.');
                return false;
            } else {
                console.error('Erreur lors de la vérification de la table notes:', notesCheckError);
                return false;
            }
        }
        
        console.log('Connexion à Supabase établie avec succès.');
        console.log('La table notes est accessible.');
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de la connexion à Supabase:', error);
        return false;
    }
}

/**
 * Crée la table notes directement en utilisant l'API Supabase
 * @private
 */
async function createNotesTableDirectly() {
    try {
        // Tentative de création simple via insert
        console.log('Tentative de création de la table notes via insert...');
        const { error: insertError } = await supabaseClient
            .from('notes')
            .insert({ 
                id: 'init_note', 
                title: 'Initialisation', 
                content: 'Table initialisée',
                categories: [],
                hashtags: [],
                videoUrls: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
        if (insertError) {
            if (insertError.code === '23505') { // Erreur de clé dupliquée = la table existe déjà
                console.log('La table notes existe déjà');
            } else if (insertError.code !== '42P01') { // Si ce n'est pas une erreur de relation inexistante
                console.error('Erreur lors de la tentative de création de la table notes:', insertError);
            }
        } else {
            console.log('Table notes créée avec succès');
        }
    } catch (error) {
        console.error('Exception lors de la création de la table notes:', error);
    }
}

/**
 * Crée la table settings directement en utilisant l'API Supabase
 * @private
 */
async function createSettingsTableDirectly() {
    try {
        // Tentative de création simple via insert
        console.log('Tentative de création de la table settings via insert...');
        const { error: insertError } = await supabaseClient
            .from('settings')
            .insert({ 
                key: 'revisitSettings',
                value: { section1: 7, section2: 14 }
            });
            
        if (insertError) {
            if (insertError.code === '23505') { // Erreur de clé dupliquée = la table existe déjà
                console.log('La table settings existe déjà');
            } else if (insertError.code !== '42P01') { // Si ce n'est pas une erreur de relation inexistante
                console.error('Erreur lors de la tentative de création de la table settings:', insertError);
            }
        } else {
            console.log('Table settings créée avec succès');
        }
    } catch (error) {
        console.error('Exception lors de la création de la table settings:', error);
    }
}

/**
 * Active et configure la sécurité au niveau des lignes (RLS)
 * Note: Cette fonctionnalité nécessite des droits administrateur sur Supabase
 * et ne fonctionnera probablement pas avec les clés API publiques.
 * @private
 */
async function enableRowLevelSecurity() {
    // La sécurité RLS devrait être configurée dans l'interface de Supabase
    console.log('Sécurité RLS: doit être configurée manuellement dans l\'interface Supabase');
}