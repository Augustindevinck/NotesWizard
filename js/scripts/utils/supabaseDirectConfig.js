/**
 * Configuration directe de Supabase sans import/export
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { initSupabase, getClient, testConnection, initializeTables } from './supabaseClient.js';

/**
 * Vérifie si Supabase est configuré en vérifiant les informations de connexion dans le localStorage
 * @returns {boolean} - Vrai si Supabase est configuré
 */
export function isSupabaseConfigured() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');
    return !!(url && key);
}

/**
 * Initialise et retourne le client Supabase
 * @returns {Promise<Object|null>} - Le client Supabase ou null si les paramètres ne sont pas configurés
 */
export async function getSupabaseClient() {
    // Vérifier si le client existe déjà
    const existingClient = getClient();
    if (existingClient) {
        return existingClient;
    }
    
    // Sinon, essayer de l'initialiser avec les paramètres du localStorage
    return await loadSupabaseFromLocalStorage();
}

/**
 * Configure le client Supabase avec les paramètres fournis
 * @param {string} url - URL du projet Supabase
 * @param {string} key - Clé API Supabase (anon/public)
 * @returns {Promise<Object>} - Le client Supabase
 */
export async function configureSupabase(url, key) {
    // Mettre à jour la configuration dans le localStorage
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    
    // Initialiser le client
    return await initSupabase(url, key);
}

/**
 * Charge la configuration Supabase depuis le localStorage
 * @returns {Promise<Object|null>} - Le client Supabase ou null si aucune configuration n'est trouvée
 */
export async function loadSupabaseFromLocalStorage() {
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_key');
    
    if (url && key) {
        return await initSupabase(url, key);
    }
    
    return null;
}

/**
 * Affiche le formulaire de configuration Supabase
 * @param {Function} onConfigCallback - Fonction à appeler après la configuration
 */
export function showSupabaseConfigForm(onConfigCallback) {
    // Vérifier si le modal existe déjà
    let modal = document.getElementById('supabase-config-modal');
    
    if (!modal) {
        // Créer le modal
        modal = document.createElement('div');
        modal.id = 'supabase-config-modal';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        content.innerHTML = `
            <span class="close">&times;</span>
            <h2>Configuration Supabase</h2>
            <p>Entrez les détails de connexion à votre projet Supabase pour synchroniser vos notes.</p>
            
            <div class="form-group">
                <label for="supabase-url">URL du projet Supabase:</label>
                <input type="text" id="supabase-url" placeholder="https://votre-projet-id.supabase.co">
                <small>Format: https://votre-projet-id.supabase.co</small>
            </div>
            
            <div class="form-group">
                <label for="supabase-key">Clé API (anon/public):</label>
                <input type="password" id="supabase-key" placeholder="votre-clé-api">
                <small>Utilisez la clé anon/public de votre projet</small>
            </div>
            
            <div id="connection-status"></div>
            
            <div class="modal-buttons">
                <button id="test-connection-btn">Tester la connexion</button>
                <button id="save-config-btn">Enregistrer</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Charger les valeurs existantes
        const savedUrl = localStorage.getItem('supabase_url') || '';
        const savedKey = localStorage.getItem('supabase_key') || '';
        
        const urlInput = document.getElementById('supabase-url');
        const keyInput = document.getElementById('supabase-key');
        
        if (urlInput) urlInput.value = savedUrl;
        if (keyInput) keyInput.value = savedKey;
        
        // Ajouter les gestionnaires d'événements
        const closeBtn = modal.querySelector('.close');
        const testBtn = document.getElementById('test-connection-btn');
        const saveBtn = document.getElementById('save-config-btn');
        const statusDiv = document.getElementById('connection-status');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // Fermer le modal en cliquant à l'extérieur
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Tester la connexion
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                if (!urlInput || !keyInput || !statusDiv) return;
                
                const url = urlInput.value.trim();
                const key = keyInput.value.trim();
                
                if (!url || !key) {
                    statusDiv.innerHTML = '<p class="error">Veuillez remplir tous les champs</p>';
                    return;
                }
                
                statusDiv.innerHTML = '<p>Test de connexion en cours...</p>';
                
                try {
                    // Créer un client temporaire pour le test
                    const tempClient = createClient(url, key);
                    
                    // D'abord tenter une connexion anonyme pour contourner RLS
                    await tempClient.auth.signInAnonymously();
                    
                    // Tester la connexion en récupérant une note
                    const { data, error } = await tempClient
                        .from('notes')
                        .select('id')
                        .limit(1);
                    
                    if (error) {
                        if (error.code === '42P01') { // Table n'existe pas
                            statusDiv.innerHTML = '<p class="error">La table "notes" n\'existe pas. Vérifiez votre projet Supabase.</p>';
                        } else if (error.code === 'PGRST116') { // Aucune note trouvée mais connexion OK
                            statusDiv.innerHTML = '<p class="success">Connexion établie avec succès. Aucune note trouvée.</p>';
                        } else {
                            statusDiv.innerHTML = `<p class="error">Erreur de connexion: ${error.message || error}</p>`;
                        }
                    } else {
                        const noteCount = data?.length || 0;
                        statusDiv.innerHTML = `<p class="success">Connexion établie avec succès. ${noteCount} note(s) trouvée(s).</p>`;
                    }
                } catch (error) {
                    console.error('Erreur de connexion:', error);
                    statusDiv.innerHTML = `<p class="error">Erreur de connexion: ${error.message || 'Vérifiez vos paramètres'}</p>`;
                }
            });
        }
        
        // Sauvegarder la configuration
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!urlInput || !keyInput || !statusDiv) return;
                
                const url = urlInput.value.trim();
                const key = keyInput.value.trim();
                
                if (!url || !key) {
                    statusDiv.innerHTML = '<p class="error">Veuillez remplir tous les champs</p>';
                    return;
                }
                
                try {
                    // Configurer Supabase avec les nouveaux paramètres
                    const client = await configureSupabase(url, key);
                    
                    if (!client) {
                        statusDiv.innerHTML = '<p class="error">Erreur: Impossible d\'initialiser le client Supabase</p>';
                        return;
                    }
                    
                    // Tester la connexion pour s'assurer que tout fonctionne
                    const isConnected = await testConnection();
                    
                    if (!isConnected) {
                        statusDiv.innerHTML = '<p class="error">Erreur: Connexion échouée après configuration</p>';
                        return;
                    }
                    
                    statusDiv.innerHTML = '<p class="success">Configuration enregistrée avec succès</p>';
                    
                    // Appeler le callback si fourni
                    if (onConfigCallback) {
                        setTimeout(() => {
                            onConfigCallback();
                            modal.style.display = 'none';
                        }, 1000);
                    } else {
                        setTimeout(() => {
                            modal.style.display = 'none';
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde:', error);
                    statusDiv.innerHTML = `<p class="error">Erreur: ${error.message || 'Impossible de sauvegarder la configuration'}</p>`;
                }
            });
        }
    }
    
    // Afficher le modal
    modal.style.display = 'block';
}