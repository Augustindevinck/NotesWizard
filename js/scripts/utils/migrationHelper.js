/**
 * Outils pour aider à migrer de localStorage à Supabase
 */

import { loadNotes as loadLocalNotes } from './localStorage.js';
import { saveNotes as saveSupabaseNotes } from './supabaseStorage.js';
import { initSupabaseFromConfig } from './supabaseConfig.js';
import { isSupabaseInitialized } from './supabaseClient.js';

/**
 * Migre toutes les notes de localStorage vers Supabase
 * @returns {Promise<Object>} - Résultat de la migration (success, message, migrated count)
 */
export async function migrateLocalDataToSupabase() {
    try {
        // Vérifier que Supabase est initialisé
        if (!isSupabaseInitialized()) {
            // Tenter une initialisation automatique
            const initialized = initSupabaseFromConfig();
            
            if (!initialized) {
                return {
                    success: false,
                    message: 'Supabase n\'est pas initialisé. Veuillez configurer vos identifiants Supabase.',
                    migrated: 0
                };
            }
        }
        
        // Charger les notes depuis localStorage
        const localNotes = loadLocalNotes();
        
        if (!localNotes || localNotes.length === 0) {
            return {
                success: true,
                message: 'Aucune note locale à migrer.',
                migrated: 0
            };
        }
        
        // Migrer les notes vers Supabase
        await saveSupabaseNotes(localNotes);
        
        return {
            success: true,
            message: `${localNotes.length} note(s) migrée(s) avec succès vers Supabase.`,
            migrated: localNotes.length
        };
    } catch (error) {
        console.error('Erreur lors de la migration des données:', error);
        return {
            success: false,
            message: `Erreur lors de la migration: ${error.message || 'Erreur inconnue'}`,
            migrated: 0
        };
    }
}

/**
 * Affiche le modal de migration vers Supabase
 * @param {Function} onCompletedCallback - Fonction à appeler après la migration
 */
export function showMigrationModal(onCompletedCallback) {
    // Vérifier si le modal existe déjà
    let modal = document.getElementById('migration-modal');
    
    if (!modal) {
        // Créer le modal
        modal = document.createElement('div');
        modal.id = 'migration-modal';
        modal.className = 'modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        content.innerHTML = `
            <span class="close">&times;</span>
            <h2>Migration vers Supabase</h2>
            <p>Cette opération va migrer vos notes locales vers la base de données Supabase.</p>
            <p>Vos notes locales seront conservées après la migration.</p>
            
            <div id="migration-status"></div>
            
            <div class="modal-buttons">
                <button id="start-migration-btn">Démarrer la migration</button>
                <button id="cancel-migration-btn">Annuler</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Récupérer les éléments du modal
        const closeBtn = modal.querySelector('.close');
        const startBtn = document.getElementById('start-migration-btn');
        const cancelBtn = document.getElementById('cancel-migration-btn');
        const statusDiv = document.getElementById('migration-status');
        
        // Gérer les événements
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        startBtn.addEventListener('click', async () => {
            try {
                // Désactiver les boutons pendant la migration
                startBtn.disabled = true;
                cancelBtn.disabled = true;
                startBtn.textContent = 'Migration en cours...';
                
                statusDiv.innerHTML = '<p>Migration en cours...</p>';
                
                // Effectuer la migration
                const result = await migrateLocalDataToSupabase();
                
                if (result.success) {
                    statusDiv.innerHTML = `<p class="success">${result.message}</p>`;
                    
                    // Appeler le callback si fourni
                    if (onCompletedCallback) {
                        setTimeout(() => {
                            onCompletedCallback(result);
                            modal.style.display = 'none';
                        }, 2000);
                    } else {
                        // Activer seulement le bouton d'annulation pour fermer le modal
                        cancelBtn.disabled = false;
                        cancelBtn.textContent = 'Fermer';
                        startBtn.style.display = 'none';
                    }
                } else {
                    statusDiv.innerHTML = `<p class="error">${result.message}</p>`;
                    
                    // Réactiver les boutons
                    startBtn.disabled = false;
                    cancelBtn.disabled = false;
                    startBtn.textContent = 'Réessayer';
                }
            } catch (error) {
                console.error('Erreur lors de la migration:', error);
                statusDiv.innerHTML = `<p class="error">Erreur lors de la migration: ${error.message || 'Erreur inconnue'}</p>`;
                
                // Réactiver les boutons
                startBtn.disabled = false;
                cancelBtn.disabled = false;
                startBtn.textContent = 'Réessayer';
            }
        });
    }
    
    // Afficher le modal
    modal.style.display = 'block';
}