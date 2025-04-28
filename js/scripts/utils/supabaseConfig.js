/**
 * Configuration de Supabase et gestion des paramètres
 */

import { initSupabase, getSupabaseClient } from './supabaseClient.js';
import { syncNotes } from './supabaseStorage.js';

// Clés de stockage local pour les paramètres Supabase
const SUPABASE_URL_KEY = 'supabaseUrl';
const SUPABASE_KEY_KEY = 'supabaseKey';

/**
 * Charge les paramètres Supabase depuis le stockage local
 * @returns {Object} - Paramètres Supabase (url et key)
 */
export function loadSupabaseConfig() {
    return {
        url: localStorage.getItem(SUPABASE_URL_KEY) || '',
        key: localStorage.getItem(SUPABASE_KEY_KEY) || ''
    };
}

/**
 * Sauvegarde les paramètres Supabase dans le stockage local
 * @param {string} url - URL du projet Supabase
 * @param {string} key - Clé API Supabase
 */
export function saveSupabaseConfig(url, key) {
    localStorage.setItem(SUPABASE_URL_KEY, url);
    localStorage.setItem(SUPABASE_KEY_KEY, key);
}

/**
 * Initialise Supabase avec les paramètres du stockage local
 * @returns {boolean} - True si l'initialisation a réussi
 */
export function initSupabaseFromConfig() {
    const config = loadSupabaseConfig();
    
    if (config.url && config.key) {
        initSupabase(config.url, config.key);
        return true;
    }
    
    return false;
}

/**
 * Teste la connexion à Supabase
 * @param {string} url - URL du projet Supabase
 * @param {string} key - Clé API Supabase
 * @returns {Promise<Object>} - Résultat du test (success, message)
 */
export async function testSupabaseConnection(url, key) {
    try {
        // Initialiser temporairement Supabase avec les paramètres de test
        initSupabase(url, key);
        
        const supabase = getSupabaseClient();
        
        // Tester une requête simple
        const { data, error } = await supabase
            .from('notes')
            .select('id')
            .limit(1);
            
        if (error) {
            // Vérifier le type d'erreur
            if (error.code === 'PGRST116') {
                // Aucune note trouvée, mais la connexion fonctionne
                return { success: true, message: 'Connexion établie avec succès. Aucune note trouvée.' };
            } else if (error.code === '42P01') {
                // Table inexistante, nous devons la créer
                return { 
                    success: false, 
                    message: 'La table "notes" n\'existe pas. Vous devez initialiser la base de données.',
                    needInit: true
                };
            } else {
                // Autre erreur
                return { success: false, message: `Erreur: ${error.message}` };
            }
        }
        
        // La connexion a réussi
        return { 
            success: true, 
            message: `Connexion établie avec succès. ${data.length} note(s) trouvée(s).`,
            count: data.length
        };
    } catch (error) {
        console.error('Erreur lors du test de connexion Supabase:', error);
        return { 
            success: false, 
            message: `Erreur de connexion: ${error.message || 'Erreur inconnue'}` 
        };
    }
}

/**
 * Initialise la base de données Supabase (création des tables)
 * @returns {Promise<Object>} - Résultat de l'initialisation (success, message)
 */
export async function initSupabaseDatabase() {
    try {
        const supabase = getSupabaseClient();
        
        if (!supabase) {
            return { 
                success: false, 
                message: 'Client Supabase non initialisé. Configurez d\'abord les paramètres de connexion.' 
            };
        }
        
        // Créer la table notes
        const { error: notesError } = await supabase.rpc('create_notes_table');
        
        if (notesError && !notesError.message.includes('already exists')) {
            return { success: false, message: `Erreur lors de la création de la table notes: ${notesError.message}` };
        }
        
        // Créer la table settings
        const { error: settingsError } = await supabase.rpc('create_settings_table');
        
        if (settingsError && !settingsError.message.includes('already exists')) {
            return { success: false, message: `Erreur lors de la création de la table settings: ${settingsError.message}` };
        }
        
        // Synchroniser les notes locales avec la base de données
        await syncNotes();
        
        return { success: true, message: 'Base de données initialisée avec succès' };
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données Supabase:', error);
        return { 
            success: false, 
            message: `Erreur lors de l'initialisation: ${error.message || 'Erreur inconnue'}` 
        };
    }
}

/**
 * Affiche le modal de configuration Supabase
 * @param {Function} onSaveCallback - Fonction à appeler après sauvegarde
 */
export function showSupabaseConfigModal(onSaveCallback) {
    // Récupérer ou créer le modal
    let modal = document.getElementById('supabase-config-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'supabase-config-modal';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        content.innerHTML = `
            <span class="close">&times;</span>
            <h2>Configuration Supabase</h2>
            <p>Entrez vos informations de connexion Supabase pour activer la synchronisation des notes.</p>
            
            <div class="form-group">
                <label for="supabase-url">URL Supabase:</label>
                <input type="text" id="supabase-url" placeholder="https://votre-projet.supabase.co">
            </div>
            
            <div class="form-group">
                <label for="supabase-key">Clé API Supabase:</label>
                <input type="password" id="supabase-key" placeholder="votre-clé-api">
                <small>Utilisez la clé anon/public, pas la clé secrète</small>
            </div>
            
            <div id="connection-status"></div>
            
            <div class="modal-buttons">
                <button id="test-connection-btn">Tester la connexion</button>
                <button id="save-config-btn">Enregistrer</button>
                <button id="init-db-btn" style="display: none;">Initialiser la base de données</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Récupérer les éléments du modal
        const closeBtn = modal.querySelector('.close');
        const testBtn = document.getElementById('test-connection-btn');
        const saveBtn = document.getElementById('save-config-btn');
        const initDbBtn = document.getElementById('init-db-btn');
        const urlInput = document.getElementById('supabase-url');
        const keyInput = document.getElementById('supabase-key');
        const statusDiv = document.getElementById('connection-status');
        
        // Charger la configuration existante
        const config = loadSupabaseConfig();
        urlInput.value = config.url;
        keyInput.value = config.key;
        
        // Gérer les événements
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        testBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            
            if (!url || !key) {
                statusDiv.innerHTML = '<p class="error">Veuillez remplir tous les champs</p>';
                return;
            }
            
            statusDiv.innerHTML = '<p>Test de connexion en cours...</p>';
            
            const result = await testSupabaseConnection(url, key);
            
            if (result.success) {
                statusDiv.innerHTML = `<p class="success">${result.message}</p>`;
                
                // Cacher le bouton d'initialisation si des données existent déjà
                initDbBtn.style.display = 'none';
            } else {
                statusDiv.innerHTML = `<p class="error">${result.message}</p>`;
                
                // Afficher le bouton d'initialisation si nécessaire
                if (result.needInit) {
                    initDbBtn.style.display = 'inline-block';
                } else {
                    initDbBtn.style.display = 'none';
                }
            }
        });
        
        saveBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            
            if (!url || !key) {
                statusDiv.innerHTML = '<p class="error">Veuillez remplir tous les champs</p>';
                return;
            }
            
            saveSupabaseConfig(url, key);
            initSupabase(url, key);
            
            statusDiv.innerHTML = '<p class="success">Configuration enregistrée</p>';
            
            // Exécuter le callback si fourni
            if (onSaveCallback) {
                onSaveCallback();
            }
            
            // Fermer le modal après un court délai
            setTimeout(() => {
                modal.style.display = 'none';
            }, 1500);
        });
        
        initDbBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            const key = keyInput.value.trim();
            
            if (!url || !key) {
                statusDiv.innerHTML = '<p class="error">Veuillez remplir tous les champs</p>';
                return;
            }
            
            // Sauvegarder et initialiser d'abord
            saveSupabaseConfig(url, key);
            initSupabase(url, key);
            
            statusDiv.innerHTML = '<p>Initialisation de la base de données en cours...</p>';
            
            const result = await initSupabaseDatabase();
            
            if (result.success) {
                statusDiv.innerHTML = `<p class="success">${result.message}</p>`;
                initDbBtn.style.display = 'none';
                
                // Exécuter le callback si fourni
                if (onSaveCallback) {
                    onSaveCallback();
                }
                
                // Fermer le modal après un court délai
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 1500);
            } else {
                statusDiv.innerHTML = `<p class="error">${result.message}</p>`;
            }
        });
    }
    
    // Afficher le modal
    modal.style.display = 'block';
}