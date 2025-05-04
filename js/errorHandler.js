
/**
 * Script pour la gestion des erreurs de chargement de ressources
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation du gestionnaire d\'erreurs...');
    
    // Écouter les erreurs de chargement de ressources
    window.addEventListener('error', function(e) {
        // Vérifier si c'est une erreur de ressource
        if (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG') {
            console.error(`Erreur de chargement de ressource: ${e.target.src || e.target.href}`);
            
            // Afficher un message d'erreur visible dans la console
            console.error(`ERREUR 404: La ressource ${e.target.src || e.target.href} n'a pas été trouvée. Vérifiez le chemin.`);
            
            // Créer un élément pour afficher l'erreur à l'utilisateur si nécessaire
            // Uniquement si un conteneur d'erreur existe
            const errorContainer = document.getElementById('error-container');
            if (errorContainer) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.textContent = `Erreur de chargement: ${e.target.src || e.target.href}`;
                errorContainer.appendChild(errorMessage);
            }
        }
    }, true);
    
    console.log('Gestionnaire d\'erreurs initialisé');
});
