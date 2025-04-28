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
        // 1. Vérifier si la table notes existe, sinon la créer
        try {
            const { error: notesCheckError } = await supabaseClient
                .from('notes')
                .select('id')
                .limit(1);
                
            if (notesCheckError && notesCheckError.code === '42P01') { // Relation does not exist
                console.log('Création de la table notes...');
                
                // Création de la table notes via SQL
                const { error: createNotesError } = await supabaseClient.rpc('create_notes_table');
                
                if (createNotesError) {
                    console.error('Erreur lors de la création de la table notes:', createNotesError);
                    // Tentons de la créer directement
                    await createNotesTableDirectly();
                }
            }
        } catch (notesError) {
            console.error('Erreur lors de la vérification de la table notes:', notesError);
            await createNotesTableDirectly();
        }
        
        // 2. Vérifier si la table settings existe, sinon la créer
        try {
            const { error: settingsCheckError } = await supabaseClient
                .from('settings')
                .select('key')
                .limit(1);
                
            if (settingsCheckError && settingsCheckError.code === '42P01') { // Relation does not exist
                console.log('Création de la table settings...');
                
                // Création de la table settings via SQL
                const { error: createSettingsError } = await supabaseClient.rpc('create_settings_table');
                
                if (createSettingsError) {
                    console.error('Erreur lors de la création de la table settings:', createSettingsError);
                    // Tentons de la créer directement
                    await createSettingsTableDirectly();
                }
            }
        } catch (settingsError) {
            console.error('Erreur lors de la vérification de la table settings:', settingsError);
            await createSettingsTableDirectly();
        }
        
        // 3. Vérifier l'activation des politiques de sécurité pour l'accès anonyme
        try {
            await enableRowLevelSecurity();
        } catch (rlsError) {
            console.error('Erreur lors de la configuration de la sécurité:', rlsError);
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des tables:', error);
        return false;
    }
}

/**
 * Crée la table notes directement
 * @private
 */
async function createNotesTableDirectly() {
    try {
        const { error } = await supabaseClient.rpc('execute_sql', {
            sql_query: `
                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    content TEXT,
                    categories JSONB,
                    hashtags JSONB,
                    videoUrls JSONB,
                    createdAt TIMESTAMP WITH TIME ZONE,
                    updatedAt TIMESTAMP WITH TIME ZONE
                );
                
                -- Création des index pour la recherche
                CREATE INDEX IF NOT EXISTS idx_notes_title ON notes USING GIN (to_tsvector('french', title));
                CREATE INDEX IF NOT EXISTS idx_notes_content ON notes USING GIN (to_tsvector('french', content));
            `
        });
        
        if (error) {
            console.error('Erreur lors de la création directe de la table notes:', error);
            
            // En dernier recours, essayer d'utiliser une méthode plus simple
            const { error: simpleError } = await supabaseClient
                .from('notes')
                .insert({ id: 'init', title: 'Initialisation', content: 'Table initialisée' })
                .select();
                
            if (simpleError && simpleError.code !== '23505') { // Si ce n'est pas une erreur de violation d'unicité
                console.error('Erreur lors de la tentative simple de création de la table notes:', simpleError);
            }
        }
    } catch (error) {
        console.error('Exception lors de la création de la table notes:', error);
    }
}

/**
 * Crée la table settings directement
 * @private
 */
async function createSettingsTableDirectly() {
    try {
        const { error } = await supabaseClient.rpc('execute_sql', {
            sql_query: `
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value JSONB
                );
            `
        });
        
        if (error) {
            console.error('Erreur lors de la création directe de la table settings:', error);
            
            // En dernier recours, essayer d'utiliser une méthode plus simple
            const { error: simpleError } = await supabaseClient
                .from('settings')
                .insert({ key: 'init', value: { initialized: true } })
                .select();
                
            if (simpleError && simpleError.code !== '23505') { // Si ce n'est pas une erreur de violation d'unicité
                console.error('Erreur lors de la tentative simple de création de la table settings:', simpleError);
            }
        }
    } catch (error) {
        console.error('Exception lors de la création de la table settings:', error);
    }
}

/**
 * Active et configure la sécurité au niveau des lignes (RLS)
 * @private
 */
async function enableRowLevelSecurity() {
    try {
        const { error } = await supabaseClient.rpc('execute_sql', {
            sql_query: `
                -- Activer RLS sur la table notes
                ALTER TABLE IF EXISTS notes ENABLE ROW LEVEL SECURITY;
                
                -- Supprimer les anciennes politiques si elles existent
                DROP POLICY IF EXISTS "Allow anonymous select" ON notes;
                DROP POLICY IF EXISTS "Allow anonymous insert" ON notes;
                DROP POLICY IF EXISTS "Allow anonymous update" ON notes;
                DROP POLICY IF EXISTS "Allow anonymous delete" ON notes;
                
                -- Créer les politiques pour permettre l'accès anonyme
                CREATE POLICY "Allow anonymous select" ON notes FOR SELECT USING (true);
                CREATE POLICY "Allow anonymous insert" ON notes FOR INSERT WITH CHECK (true);
                CREATE POLICY "Allow anonymous update" ON notes FOR UPDATE USING (true);
                CREATE POLICY "Allow anonymous delete" ON notes FOR DELETE USING (true);
                
                -- Activer RLS sur la table settings
                ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
                
                -- Supprimer les anciennes politiques si elles existent
                DROP POLICY IF EXISTS "Allow anonymous select settings" ON settings;
                DROP POLICY IF EXISTS "Allow anonymous insert settings" ON settings;
                DROP POLICY IF EXISTS "Allow anonymous update settings" ON settings;
                DROP POLICY IF EXISTS "Allow anonymous delete settings" ON settings;
                
                -- Créer les politiques pour permettre l'accès anonyme
                CREATE POLICY "Allow anonymous select settings" ON settings FOR SELECT USING (true);
                CREATE POLICY "Allow anonymous insert settings" ON settings FOR INSERT WITH CHECK (true);
                CREATE POLICY "Allow anonymous update settings" ON settings FOR UPDATE USING (true);
                CREATE POLICY "Allow anonymous delete settings" ON settings FOR DELETE USING (true);
            `
        });
        
        if (error) {
            console.error('Erreur lors de la configuration de la sécurité:', error);
        }
    } catch (error) {
        console.error('Exception lors de la configuration de la sécurité:', error);
    }
}