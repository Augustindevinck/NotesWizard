/**
 * Gestion des catégories
 */

// Ensemble des catégories existantes
let categories = new Set();

/**
 * Initialise le gestionnaire de catégories
 * @param {Set} existingCategories - Ensemble des catégories existantes
 */
export function initCategoryManager(existingCategories) {
    if (existingCategories) {
        categories = existingCategories;
    }
}

/**
 * Gère l'événement d'entrée dans le champ de catégorie (autocomplétion)
 * @param {Event} event - L'événement d'entrée
 * @param {HTMLElement} categoryInput - Le champ de saisie des catégories
 * @param {HTMLElement} categorySuggestions - Le conteneur pour les suggestions
 */
export function handleCategoryInput(event, categoryInput, categorySuggestions) {
    const input = categoryInput.value.trim();
    categorySuggestions.innerHTML = '';

    if (!input) {
        categorySuggestions.style.display = 'none';
        return;
    }

    const matchingCategories = Array.from(categories).filter(category => 
        category.toLowerCase().includes(input.toLowerCase())
    );

    if (matchingCategories.length > 0) {
        matchingCategories.forEach(category => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'category-suggestion';
            suggestionItem.textContent = category;

            suggestionItem.addEventListener('click', () => {
                addCategoryTag(category, document.getElementById('selected-categories'));
                categoryInput.value = '';
                categorySuggestions.innerHTML = '';
                categorySuggestions.style.display = 'none';
            });

            categorySuggestions.appendChild(suggestionItem);
        });

        categorySuggestions.style.display = 'block';
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
    if (event.key === 'Enter' && categoryInput.value.trim()) {
        event.preventDefault();
        const newCategory = categoryInput.value.trim();

        // Ajouter la catégorie
        addCategoryTag(newCategory, selectedCategories);

        // Mettre à jour l'ensemble des catégories
        categories.add(newCategory);

        // Réinitialiser le champ de saisie
        categoryInput.value = '';
        categorySuggestions.innerHTML = '';
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
    for (let tag of existingTags) {
        const tagName = tag.querySelector('.tag-name');
        if (tagName && tagName.textContent.trim() === category) {
            return; // Éviter les doublons
        }
    }

    // Créer un span pour le tag (structure simplifiée)
    const categoryTag = document.createElement('span');
    categoryTag.className = 'category-tag';
    categoryTag.dataset.value = category; // Stocker la valeur dans un attribut data
    
    // Ajouter directement le texte de la catégorie
    categoryTag.textContent = category;
    
    // Ajouter un événement de clic pour la suppression
    categoryTag.addEventListener('click', (e) => {
        e.stopPropagation();
        categoryTag.remove();
    });
    
    // Ajouter le tag au conteneur
    container.appendChild(categoryTag);
}