/**
 * Script simplifié pour la page d'accueil - gère uniquement les boutons essentiels
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation du script simplifié...');
    
    // Récupérer les boutons principaux
    const generalViewBtn = document.getElementById('general-view-btn');
    const addNoteBtn = document.getElementById('add-note-btn');
    const searchBtn = document.getElementById('search-btn');
    const supabaseConfigBtn = document.getElementById('supabase-config-btn');
    
    // Configuration du bouton Vue générale
    if (generalViewBtn) {
        console.log('Bouton Vue générale trouvé, ajout de l\'écouteur');
        generalViewBtn.addEventListener('click', () => {
            console.log('Navigation vers la vue des catégories');
            window.location.href = 'categories.html';
        });
    } else {
        console.warn('Bouton Vue générale non trouvé');
    }
    
    // Configuration du bouton de recherche
    if (searchBtn) {
        console.log('Bouton de recherche trouvé, ajout de l\'écouteur');
        searchBtn.addEventListener('click', () => {
            console.log('Navigation vers la page de recherche');
            window.location.href = 'search.html';
        });
    } else {
        console.warn('Bouton de recherche non trouvé');
    }
    
    // Configuration du bouton d'ajout de note
    if (addNoteBtn) {
        console.log('Bouton d\'ajout de note trouvé, ajout de l\'écouteur');
        addNoteBtn.addEventListener('click', () => {
            console.log('Ouverture du modal de note');
            const noteModal = document.getElementById('note-modal');
            if (noteModal) {
                noteModal.style.display = 'flex';
            } else {
                alert('Le modal de note n\'est pas disponible');
            }
        });
    } else {
        console.warn('Bouton d\'ajout de note non trouvé');
    }
    
    // Configuration du bouton Supabase
    if (supabaseConfigBtn) {
        console.log('Bouton de configuration Supabase trouvé, ajout de l\'écouteur');
        supabaseConfigBtn.addEventListener('click', () => {
            console.log('Ouverture de la configuration Supabase');
            // Créer un modal de configuration Supabase à la volée
            createSupabaseConfigModal();
        });
    } else {
        console.warn('Bouton de configuration Supabase non trouvé');
    }
    
    // Gérer les boutons de fermeture des modals
    const closeButtons = document.querySelectorAll('.close');
    if (closeButtons.length > 0) {
        console.log('Boutons de fermeture trouvés, ajout des écouteurs');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Trouver le modal parent
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    } else {
        console.warn('Aucun bouton de fermeture trouvé');
    }
    
    // Gérer les clics en dehors des modals pour les fermer
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Création du modal de configuration Supabase
    function createSupabaseConfigModal() {
        // Vérifier si le modal existe déjà
        let modal = document.getElementById('supabase-config-modal');
        if (modal) {
            modal.style.display = 'flex';
            return;
        }
        
        // Créer le modal s'il n'existe pas
        modal = document.createElement('div');
        modal.id = 'supabase-config-modal';
        modal.className = 'modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Ajouter le bouton de fermeture
        const closeButton = document.createElement('span');
        closeButton.className = 'close';
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Ajouter le contenu du formulaire
        modalContent.innerHTML += `
            <h2>Configuration de Supabase</h2>
            <div class="form-group">
                <label for="supabase-url">URL du projet Supabase</label>
                <input type="text" id="supabase-url" placeholder="https://votre-projet.supabase.co">
                <small>Disponible dans les paramètres du projet Supabase</small>
            </div>
            <div class="form-group">
                <label for="supabase-key">Clé d'API (anon, public)</label>
                <input type="text" id="supabase-key" placeholder="Votre clé anon/public">
                <small>Disponible dans les paramètres du projet Supabase</small>
            </div>
            <div id="connection-status"></div>
            <button id="test-connection-btn">Tester la connexion</button>
            <button id="save-config-btn">Enregistrer</button>
        `;
        
        // Ajouter le contenu au modal
        modalContent.prepend(closeButton);
        modal.appendChild(modalContent);
        
        // Ajouter le modal au body
        document.body.appendChild(modal);
        
        // Afficher le modal
        modal.style.display = 'flex';
        
        // Ajouter les écouteurs pour les boutons
        const testConnectionBtn = document.getElementById('test-connection-btn');
        const saveConfigBtn = document.getElementById('save-config-btn');
        
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                alert('Fonctionnalité de test non implémentée dans cette version simplifiée');
            });
        }
        
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                alert('Fonctionnalité de sauvegarde non implémentée dans cette version simplifiée');
                modal.style.display = 'none';
            });
        }
    }
    
    console.log('Initialisation du script simplifié terminée');
});