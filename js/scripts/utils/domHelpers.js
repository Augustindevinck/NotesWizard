/**
 * Fonctions utilitaires pour manipuler le DOM
 */

/**
 * Affiche un message indiquant qu'aucune note n'existe
 * @param {HTMLElement} container - Conteneur où afficher le message
 */
export function renderEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h2>Aucune note</h2>
            <p>Cliquez sur le bouton + pour créer votre première note</p>
        </div>
    `;
}

/**
 * Génère un identifiant unique
 * @returns {string} - Identifiant unique
 */
export function generateUniqueId() {
    // Format: timestamp-random
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Retire tous les éléments surlignés dans le document
 */
export function cleanupHighlightedElements() {
    // Supprimer les éléments avec la classe highlight
    document.querySelectorAll('.highlight').forEach(el => {
        const parent = el.parentNode;
        if (parent) {
            // Remplacer l'élément surligné par son contenu
            parent.replaceChild(document.createTextNode(el.textContent), el);
            // Normaliser pour fusionner les nœuds de texte adjacents
            parent.normalize();
        }
    });
}

/**
 * Formate une date pour l'affichage
 * @param {string|Date} date - Date à formater
 * @param {boolean} includeTime - Inclure l'heure
 * @returns {string} - Date formatée
 */
export function formatDate(date, includeTime = false) {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) return '';
    
    // Options pour le format de date
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    };
    
    // Ajouter les options d'heure si demandé
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString('fr-FR', options);
}

/**
 * Calcule le nombre de jours écoulés depuis une date
 * @param {string|Date} date - Date de référence
 * @returns {number} - Nombre de jours
 */
export function getDaysElapsed(date) {
    if (!date) return 0;
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) return 0;
    
    const now = new Date();
    
    // Calculer la différence en millisecondes
    const diffTime = Math.abs(now - dateObj);
    
    // Convertir en jours (arrondi à l'entier inférieur)
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Crée un élément avec des classes
 * @param {string} tag - Type d'élément à créer (div, span, etc.)
 * @param {string|Array} classes - Classes CSS à ajouter
 * @param {string} text - Texte à insérer dans l'élément
 * @returns {HTMLElement} - Élément créé
 */
export function createElement(tag, classes = '', text = '') {
    const element = document.createElement(tag);
    
    // Ajouter les classes
    if (classes) {
        if (Array.isArray(classes)) {
            element.classList.add(...classes);
        } else {
            element.classList.add(classes);
        }
    }
    
    // Ajouter le texte
    if (text) {
        element.textContent = text;
    }
    
    return element;
}

/**
 * Nettoie les nœuds de texte adjacents dans un élément
 * @param {HTMLElement} element - Élément à nettoyer
 */
export function normalizeElement(element) {
    if (element) {
        element.normalize();
    }
}

/**
 * Affiche un message d'erreur temporaire
 * @param {string} message - Message d'erreur
 * @param {number} duration - Durée d'affichage en millisecondes
 */
export function showError(message, duration = 3000) {
    // Créer l'élément d'erreur
    const errorElement = createElement('div', 'error-message', message);
    
    // Ajouter au corps du document
    document.body.appendChild(errorElement);
    
    // Afficher avec une animation
    setTimeout(() => {
        errorElement.classList.add('show');
    }, 10);
    
    // Supprimer après la durée spécifiée
    setTimeout(() => {
        errorElement.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(errorElement);
        }, 300); // Attendre la fin de l'animation
    }, duration);
}

/**
 * Génère un slug à partir d'une chaîne de caractères
 * @param {string} text - Texte à transformer en slug
 * @returns {string} - Slug généré
 */
export function slugify(text) {
    return text
        .toString()
        .normalize('NFD')                   // Décomposer les caractères accentués
        .replace(/[\u0300-\u036f]/g, '')    // Supprimer les accents
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')               // Remplacer les espaces par des tirets
        .replace(/[^\w-]+/g, '')            // Supprimer les caractères non alphanumériques
        .replace(/--+/g, '-');              // Remplacer les tirets multiples par un seul
}