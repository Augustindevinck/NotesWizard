/**
 * Gestion des catégories et suggestions
 */

// Ensemble de toutes les catégories existantes
let allCategories = new Set();

/**
 * Initialise le gestionnaire de catégories
 * @param {Set} categories - Ensemble des catégories existantes
 */
export function initCategoryManager(categories) {
    if (categories) {
        allCategories = categories;
    }
}

/**
 * Gère l'événement d'entrée dans le champ de catégorie (autocomplétion)
 * @param {Event} event - L'événement d'entrée
 * @param {HTMLElement} categoryInput - Le champ de saisie des catégories
 * @param {HTMLElement} categorySuggestions - Le conteneur pour les suggestions
 */
export function handleCategoryInput(event, categoryInput, categorySuggestions) {
    const inputText = categoryInput.value.trim();
    categorySuggestions.innerHTML = '';

    if (inputText.length === 0) {
        categorySuggestions.style.display = 'none';
        return;
    }

    // Afficher les suggestions de catégories existantes
    const matchingCategories = Array.from(allCategories).filter(cat => 
        cat.toLowerCase().includes(inputText.toLowerCase())
    );

    if (matchingCategories.length > 0) {
        categorySuggestions.style.display = 'block';

        matchingCategories.forEach(category => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'category-suggestion';
            suggestionItem.textContent = category;
            
            suggestionItem.addEventListener('click', () => {
                addCategoryTag(category, categoryInput.parentElement.previousElementSibling);
                categoryInput.value = '';
                categorySuggestions.style.display = 'none';
            });
            
            categorySuggestions.appendChild(suggestionItem);
        });
    } else {
        categorySuggestions.style.display = 'none';
    }
}

/**
 * Gère les événements de touche dans le champ de catégorie
 * @param {Event} event - L'événement clavier
 * @param {HTMLElement} categoryInput - Le champ de saisie des catégories
 * @param {HTMLElement} selectedCategories - Le conteneur des catégories sélectionnées
 * @param {HTMLElement} categorySuggestions - Le conteneur pour les suggestions
 */
export function handleCategoryKeydown(event, categoryInput, selectedCategories, categorySuggestions) {
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        
        const inputText = categoryInput.value.trim();
        if (inputText.length > 0) {
            addCategoryTag(inputText, selectedCategories);
            categoryInput.value = '';
            categorySuggestions.style.display = 'none';
        }
    } else if (event.key === 'Escape') {
        categorySuggestions.style.display = 'none';
    }
}

/**
 * Ajoute un tag de catégorie
 * @param {string} category - Le nom de la catégorie à ajouter
 * @param {HTMLElement} container - Le conteneur où ajouter le tag
 */
export function addCategoryTag(category, container) {
    // Vérifier si la catégorie existe déjà
    const existingTags = container.querySelectorAll('.category-tag');
    for (const tag of existingTags) {
        if (tag.textContent.trim() === category) {
            return; // Éviter les doublons
        }
    }
    
    // Créer le tag de catégorie
    const tagElement = document.createElement('span');
    tagElement.className = 'category-tag';
    tagElement.textContent = category;
    
    // Ajouter un bouton de suppression
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-tag';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Éviter la propagation au conteneur
        container.removeChild(tagElement);
    });
    
    tagElement.appendChild(removeBtn);
    container.appendChild(tagElement);
    
    // Ajouter à l'ensemble des catégories
    allCategories.add(category);
}