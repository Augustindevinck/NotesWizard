/**
 * SCRIPT D'URGENCE POUR RÉINITIALISER COMPLÈTEMENT SUPABASE
 * Ce script va supprimer TOUTES les notes dans Supabase et le stockage local
 */

// Configuration Supabase à récupérer depuis localStorage
const supabaseUrl = localStorage.getItem('supabase_url');
const supabaseKey = localStorage.getItem('supabase_key');

// Vérifier que les informations de configuration sont disponibles
if (!supabaseUrl || !supabaseKey) {
    alert('Configuration Supabase non trouvée. Veuillez configurer Supabase avant d\'utiliser ce script.');
} else {
    // Confirmation de l'utilisateur
    if (confirm('⚠️ ATTENTION: Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT TOUTES les notes.\n\nCette action est irréversible et ne peut pas être annulée.\n\nÊtes-vous absolument sûr de vouloir continuer?')) {
        
        // Message de chargement
        const loadingDiv = document.createElement('div');
        loadingDiv.style.position = 'fixed';
        loadingDiv.style.top = '0';
        loadingDiv.style.left = '0';
        loadingDiv.style.width = '100%';
        loadingDiv.style.height = '100%';
        loadingDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingDiv.style.color = 'white';
        loadingDiv.style.fontSize = '24px';
        loadingDiv.style.display = 'flex';
        loadingDiv.style.alignItems = 'center';
        loadingDiv.style.justifyContent = 'center';
        loadingDiv.style.zIndex = '9999';
        loadingDiv.innerHTML = 'NETTOYAGE TOTAL EN COURS...<br>Veuillez ne pas fermer cette page.';
        document.body.appendChild(loadingDiv);
        
        // Fonction pour effectuer les requêtes
        async function resetDatabase() {
            try {
                console.log('=== DÉBUT DE LA RÉINITIALISATION D\'URGENCE ===');
                
                // 1. Suppression de toutes les notes dans Supabase
                console.log('Connexion à Supabase...');
                
                // Créer une connexion Supabase utilisant uniquement fetch
                const deleteFetch = fetch(`${supabaseUrl}/rest/v1/notes?select=id`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const deleteResponse = await deleteFetch;
                console.log('Résultat de la suppression:', deleteResponse.status);
                
                if (deleteResponse.status >= 200 && deleteResponse.status < 300) {
                    console.log('Toutes les notes ont été supprimées avec succès de Supabase');
                } else {
                    console.error('Erreur lors de la suppression des notes:', await deleteResponse.text());
                    throw new Error('Échec de la suppression dans Supabase');
                }
                
                // 2. Vérification que toutes les notes ont bien été supprimées
                console.log('Vérification de la suppression...');
                
                const checkFetch = fetch(`${supabaseUrl}/rest/v1/notes?select=id`, {
                    method: 'GET',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                
                const checkResponse = await checkFetch;
                const remainingNotes = await checkResponse.json();
                
                if (Array.isArray(remainingNotes) && remainingNotes.length === 0) {
                    console.log('Vérification réussie: Aucune note ne reste dans Supabase');
                } else {
                    console.warn(`Il reste ${remainingNotes.length} notes dans Supabase`);
                    // Nous continuons quand même
                }
                
                // 3. Nettoyage du localStorage
                console.log('Nettoyage du stockage local...');
                localStorage.setItem('notes', JSON.stringify([]));
                
                console.log('=== RÉINITIALISATION D\'URGENCE TERMINÉE AVEC SUCCÈS ===');
                alert('Base de données réinitialisée avec succès. La page va être rechargée.');
                
                // Recharger la page après un court délai
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                console.error('Erreur critique lors de la réinitialisation:', error);
                alert(`Une erreur critique est survenue: ${error.message}`);
                document.body.removeChild(loadingDiv);
            }
        }
        
        // Exécuter la réinitialisation
        resetDatabase();
    }
}