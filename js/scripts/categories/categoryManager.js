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
        categories = new Set(existingCategories);
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
    } else if (event.key === 'Backspace' && categoryInput.value === '') {
        // Si le champ est vide et qu'on appuie sur Backspace, supprimer la dernière catégorie
        const categoryTags = selectedCategories.querySelectorAll('.category-tag');
        if (categoryTags.length > 0) {
            selectedCategories.removeChild(categoryTags[categoryTags.length - 1]);
        }
    }
}

/**
 * Ajoute un tag de catégorie
 * @param {string} category - Le nom de la catégorie à ajouter
 * @param {HTMLElement} container - Le conteneur où ajouter le tag
 */
export function addCategoryTag(category, container) {
    // Vérifier si la catégorie ou une variation existe déjà
    const existingTags = container.querySelectorAll('.category-tag');
    const baseName = category.replace(/x$/, '');
    for (let tag of existingTags) {
        const tagBaseName = tag.textContent.replace(/x$/, '');
        if (tagBaseName === baseName) {
            return; // Éviter les doublons et variations
        }
    }
    
    // Créer le tag
    const categoryTag = document.createElement('span');
    categoryTag.className = 'category-tag';
    categoryTag.textContent = category;
    
    // Ajouter un bouton de suppression
    const removeBtn = document.createElement('span');
    removeBtn.className = 'remove-tag';
    removeBtn.innerHTML = '🗑️';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.removeChild(categoryTag);
    });
    
    categoryTag.appendChild(removeBtn);
    container.appendChild(categoryTag);
}