/**
 * Gestionnaire d'arborescence de catégories pour la vue générale
 */

// Structure de catégories (initialisation vide)
let categoryTree = {};

/**
 * Initialise l'arborescence de catégories
 * @param {Array} notes - Tableau de toutes les notes
 * @param {Set} allCategories - Ensemble de toutes les catégories
 */
export function initCategoryTree(notes, allCategories) {
    // Réinitialiser l'arborescence
    categoryTree = {};
    
    // Convertir les catégories simples en structure d'arborescence
    Array.from(allCategories).forEach(category => {
        // Vérifier si c'est une catégorie hiérarchique (avec des "/")
        if (category.includes('/')) {
            const parts = category.split('/');
            let current = categoryTree;
            
            // Créer la structure imbriquée pour chaque niveau
            parts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            });
        } else {
            // Catégorie simple (niveau racine)
            if (!categoryTree[category]) {
                categoryTree[category] = {};
            }
        }
    });
    
    return categoryTree;
}

/**
 * Affiche l'arborescence de catégories dans le conteneur
 * @param {HTMLElement} container - Conteneur où afficher l'arborescence
 * @param {Array} notes - Tableau de toutes les notes
 */
export function renderCategoryTree(container, notes) {
    // Vider le conteneur
    container.innerHTML = '';
    
    // Créer un header
    const header = document.createElement('div');
    header.className = 'category-tree-header';
    header.innerHTML = `
        <h2>Catégories</h2>
        <button id="add-root-category-btn" class="add-category-btn" title="Ajouter une catégorie">+</button>
    `;
    container.appendChild(header);
    
    // Créer le conteneur d'arborescence
    const treeContainer = document.createElement('div');
    treeContainer.className = 'category-tree-container';
    container.appendChild(treeContainer);
    
    // Afficher les catégories racines
    renderCategoryLevel(treeContainer, categoryTree, '', notes);
    
    // Ajouter les écouteurs d'événements
    setupCategoryTreeListeners(container, notes);
}

/**
 * Affiche un niveau de l'arborescence de catégories
 * @param {HTMLElement} container - Conteneur où afficher le niveau
 * @param {Object} levelData - Données du niveau actuel
 * @param {string} parentPath - Chemin du parent (vide pour la racine)
 * @param {Array} notes - Tableau de toutes les notes
 */
function renderCategoryLevel(container, levelData, parentPath, notes) {
    // Créer une liste pour ce niveau
    const levelList = document.createElement('ul');
    levelList.className = 'category-tree-list';
    container.appendChild(levelList);
    
    // Parcourir chaque catégorie de ce niveau
    Object.keys(levelData).sort().forEach(category => {
        const fullPath = parentPath ? `${parentPath}/${category}` : category;
        
        // Créer l'élément de liste pour cette catégorie
        const listItem = document.createElement('li');
        listItem.className = 'category-tree-item';
        listItem.dataset.category = fullPath;
        
        // Déterminer si cette catégorie a des enfants
        const hasChildren = Object.keys(levelData[category]).length > 0;
        
        // Compter les notes dans cette catégorie (et ses sous-catégories)
        const categoryNotes = countNotesInCategory(notes, fullPath, hasChildren);
        
        // Créer le contenu de l'élément
        const itemContent = document.createElement('div');
        itemContent.className = 'category-tree-item-content';
        
        // Ajouter un indicateur d'expansion si nécessaire
        if (hasChildren) {
            const expandBtn = document.createElement('span');
            expandBtn.className = 'category-tree-expand-btn';
            expandBtn.innerHTML = '▶';
            expandBtn.dataset.expanded = 'false';
            itemContent.appendChild(expandBtn);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'category-tree-spacer';
            spacer.innerHTML = '&nbsp;&nbsp;';
            itemContent.appendChild(spacer);
        }
        
        // Ajouter le nom de la catégorie et le compteur
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-tree-name';
        nameSpan.textContent = category;
        itemContent.appendChild(nameSpan);
        
        const countSpan = document.createElement('span');
        countSpan.className = 'category-tree-count';
        countSpan.textContent = `(${categoryNotes})`;
        itemContent.appendChild(countSpan);
        
        // Ajouter les boutons d'action
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'category-tree-actions';
        
        // Bouton pour ajouter une sous-catégorie
        const addBtn = document.createElement('button');
        addBtn.className = 'add-subcategory-btn';
        addBtn.title = 'Ajouter une sous-catégorie';
        addBtn.textContent = '+';
        actionsDiv.appendChild(addBtn);
        
        // Bouton pour renommer la catégorie
        const renameBtn = document.createElement('button');
        renameBtn.className = 'rename-category-btn';
        renameBtn.title = 'Renommer la catégorie';
        renameBtn.innerHTML = '✏️';
        actionsDiv.appendChild(renameBtn);
        
        // Bouton pour supprimer la catégorie
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-category-btn';
        deleteBtn.title = 'Supprimer la catégorie';
        deleteBtn.innerHTML = '🗑️';
        actionsDiv.appendChild(deleteBtn);
        
        itemContent.appendChild(actionsDiv);
        listItem.appendChild(itemContent);
        
        // Si cette catégorie a des enfants, préparer un conteneur pour eux
        if (hasChildren) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'category-tree-children';
            childrenContainer.style.display = 'none';
            
            // Afficher les catégories enfants dans ce conteneur
            renderCategoryLevel(childrenContainer, levelData[category], fullPath, notes);
            
            listItem.appendChild(childrenContainer);
        }
        
        levelList.appendChild(listItem);
    });
}

/**
 * Compte le nombre de notes dans une catégorie (et ses sous-catégories si récursif)
 * @param {Array} notes - Tableau de toutes les notes
 * @param {string} categoryPath - Chemin de la catégorie
 * @param {boolean} includeSubcategories - Inclure les sous-catégories
 * @returns {number} - Nombre de notes
 */
function countNotesInCategory(notes, categoryPath, includeSubcategories = false) {
    return notes.filter(note => {
        if (!note.categories) return false;
        
        if (includeSubcategories) {
            // Inclure les notes dans cette catégorie ou dans une sous-catégorie
            return note.categories.some(cat => 
                cat === categoryPath || cat.startsWith(`${categoryPath}/`)
            );
        } else {
            // Uniquement les notes exactement dans cette catégorie
            return note.categories.includes(categoryPath);
        }
    }).length;
}

/**
 * Configure les écouteurs d'événements pour l'arborescence de catégories
 * @param {HTMLElement} container - Conteneur de l'arborescence
 * @param {Array} notes - Tableau de toutes les notes
 */
function setupCategoryTreeListeners(container, notes) {
    // Écouteur pour le bouton d'ajout de catégorie racine
    const addRootCategoryBtn = container.querySelector('#add-root-category-btn');
    if (addRootCategoryBtn) {
        addRootCategoryBtn.addEventListener('click', () => {
            promptNewCategory('', container, notes);
        });
    }
    
    // Écouteurs pour les boutons d'expansion
    const expandBtns = container.querySelectorAll('.category-tree-expand-btn');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const childrenContainer = listItem.querySelector('.category-tree-children');
            
            if (btn.dataset.expanded === 'false') {
                // Ouvrir
                childrenContainer.style.display = 'block';
                btn.innerHTML = '▼';
                btn.dataset.expanded = 'true';
            } else {
                // Fermer
                childrenContainer.style.display = 'none';
                btn.innerHTML = '▶';
                btn.dataset.expanded = 'false';
            }
        });
    });
    
    // Écouteurs pour les noms de catégories (pour afficher les notes)
    const categoryNames = container.querySelectorAll('.category-tree-name');
    categoryNames.forEach(name => {
        name.addEventListener('click', () => {
            const listItem = name.closest('.category-tree-item');
            const categoryPath = listItem.dataset.category;
            
            // Mettre en évidence la catégorie sélectionnée
            container.querySelectorAll('.category-tree-item').forEach(item => {
                item.classList.remove('selected');
            });
            listItem.classList.add('selected');
            
            // Afficher les notes de cette catégorie
            showNotesForCategory(categoryPath, notes);
        });
    });
    
    // Écouteurs pour les boutons d'ajout de sous-catégorie
    const addSubcategoryBtns = container.querySelectorAll('.add-subcategory-btn');
    addSubcategoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const parentCategory = listItem.dataset.category;
            
            promptNewCategory(parentCategory, container, notes);
        });
    });
    
    // Écouteurs pour les boutons de renommage
    const renameBtns = container.querySelectorAll('.rename-category-btn');
    renameBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const categoryPath = listItem.dataset.category;
            
            promptRenameCategory(categoryPath, container, notes);
        });
    });
    
    // Écouteurs pour les boutons de suppression
    const deleteBtns = container.querySelectorAll('.delete-category-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const categoryPath = listItem.dataset.category;
            
            confirmDeleteCategory(categoryPath, container, notes);
        });
    });
}

/**
 * Affiche les notes d'une catégorie spécifique
 * @param {string} categoryPath - Chemin de la catégorie
 * @param {Array} notes - Tableau de toutes les notes
 */
function showNotesForCategory(categoryPath, notes) {
    // Trouver les notes appartenant à cette catégorie
    const categoryNotes = notes.filter(note => {
        if (!note.categories) return false;
        return note.categories.includes(categoryPath);
    });
    
    // Trouver le conteneur pour afficher les notes
    const notesContainer = document.getElementById('category-notes-container');
    if (!notesContainer) return;
    
    // Vider le conteneur
    notesContainer.innerHTML = '';
    
    // Créer un en-tête
    const header = document.createElement('div');
    header.className = 'category-notes-header';
    header.innerHTML = `
        <h3>Notes dans "${categoryPath}"</h3>
        <span>${categoryNotes.length} note(s) trouvée(s)</span>
    `;
    notesContainer.appendChild(header);
    
    // Afficher les notes
    if (categoryNotes.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-category-notes';
        emptyMsg.textContent = 'Aucune note dans cette catégorie';
        notesContainer.appendChild(emptyMsg);
    } else {
        const notesGrid = document.createElement('div');
        notesGrid.className = 'category-notes-grid';
        
        // Utiliser la fonction createNoteElement du module notesManager
        // (Cette fonction doit être injectée via une fonction d'initialisation)
        if (window.createNoteFn) {
            categoryNotes.forEach(note => {
                const noteElement = window.createNoteFn(note);
                notesGrid.appendChild(noteElement);
            });
        } else {
            // Fallback si createNoteElement n'est pas disponible
            categoryNotes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-card';
                noteElement.innerHTML = `
                    <h4>${note.title || 'Sans titre'}</h4>
                    <p>${(note.content || '').substring(0, 100)}${note.content && note.content.length > 100 ? '...' : ''}</p>
                `;
                notesGrid.appendChild(noteElement);
            });
        }
        
        notesContainer.appendChild(notesGrid);
    }
}

/**
 * Demande le nom d'une nouvelle catégorie
 * @param {string} parentCategory - Catégorie parente (vide pour la racine)
 * @param {HTMLElement} container - Conteneur de l'arborescence
 * @param {Array} notes - Tableau de toutes les notes
 */
function promptNewCategory(parentCategory, container, notes) {
    const newName = prompt('Nom de la nouvelle catégorie:');
    if (!newName || newName.trim() === '') return;
    
    // Construire le chemin complet
    const fullPath = parentCategory ? `${parentCategory}/${newName.trim()}` : newName.trim();
    
    // Ajouter la nouvelle catégorie à l'arborescence
    addCategoryToTree(fullPath);
    
    // Mettre à jour l'affichage
    const treeContainer = container.querySelector('.category-tree-container');
    if (treeContainer) {
        treeContainer.innerHTML = '';
        renderCategoryLevel(treeContainer, categoryTree, '', notes);
        setupCategoryTreeListeners(container, notes);
    }
    
    // Retourner le chemin complet pour utilisation externe
    return fullPath;
}

/**
 * Demande un nouveau nom pour une catégorie existante
 * @param {string} categoryPath - Chemin de la catégorie à renommer
 * @param {HTMLElement} container - Conteneur de l'arborescence
 * @param {Array} notes - Tableau de toutes les notes
 */
function promptRenameCategory(categoryPath, container, notes) {
    // Extraire le nom actuel de la catégorie (dernière partie du chemin)
    const parts = categoryPath.split('/');
    const currentName = parts[parts.length - 1];
    
    const newName = prompt(`Renommer "${currentName}" en:`, currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    
    // Construire le nouveau chemin complet
    parts[parts.length - 1] = newName.trim();
    const newPath = parts.join('/');
    
    // Mettre à jour les notes qui utilisent cette catégorie
    updateCategoryInNotes(categoryPath, newPath, notes);
    
    // Mettre à jour l'arborescence
    renameCategoryInTree(categoryPath, newPath);
    
    // Mettre à jour l'affichage
    const treeContainer = container.querySelector('.category-tree-container');
    if (treeContainer) {
        treeContainer.innerHTML = '';
        renderCategoryLevel(treeContainer, categoryTree, '', notes);
        setupCategoryTreeListeners(container, notes);
    }
    
    // Retourner le nouveau chemin pour utilisation externe
    return newPath;
}

/**
 * Demande confirmation avant de supprimer une catégorie
 * @param {string} categoryPath - Chemin de la catégorie à supprimer
 * @param {HTMLElement} container - Conteneur de l'arborescence
 * @param {Array} notes - Tableau de toutes les notes
 */
function confirmDeleteCategory(categoryPath, container, notes) {
    // Compter les notes dans cette catégorie
    const categoryNotes = countNotesInCategory(notes, categoryPath, true);
    
    let message = `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryPath}"?`;
    if (categoryNotes > 0) {
        message += `\n\nAttention: ${categoryNotes} note(s) ${categoryNotes > 1 ? 'utilisent' : 'utilise'} cette catégorie.`;
    }
    
    if (confirm(message)) {
        // Supprimer la catégorie des notes
        removeCategoryFromNotes(categoryPath, notes);
        
        // Supprimer la catégorie de l'arborescence
        deleteCategoryFromTree(categoryPath);
        
        // Mettre à jour l'affichage
        const treeContainer = container.querySelector('.category-tree-container');
        if (treeContainer) {
            treeContainer.innerHTML = '';
            renderCategoryLevel(treeContainer, categoryTree, '', notes);
            setupCategoryTreeListeners(container, notes);
        }
    }
}

/**
 * Ajoute une catégorie à l'arborescence
 * @param {string} categoryPath - Chemin complet de la catégorie
 */
function addCategoryToTree(categoryPath) {
    const parts = categoryPath.split('/');
    let current = categoryTree;
    
    parts.forEach((part, index) => {
        if (!current[part]) {
            current[part] = {};
        }
        current = current[part];
    });
    
    // Ajouter à l'ensemble global des catégories (doit être fourni par l'application)
    if (window.addCategoryToGlobal) {
        window.addCategoryToGlobal(categoryPath);
    }
}

/**
 * Renomme une catégorie dans l'arborescence
 * @param {string} oldPath - Ancien chemin de la catégorie
 * @param {string} newPath - Nouveau chemin de la catégorie
 */
function renameCategoryInTree(oldPath, newPath) {
    // Supprimer l'ancienne catégorie
    deleteCategoryFromTree(oldPath);
    
    // Ajouter la nouvelle catégorie
    addCategoryToTree(newPath);
    
    // Mettre à jour l'ensemble global des catégories
    if (window.updateCategoryInGlobal) {
        window.updateCategoryInGlobal(oldPath, newPath);
    }
}

/**
 * Supprime une catégorie de l'arborescence
 * @param {string} categoryPath - Chemin de la catégorie à supprimer
 */
function deleteCategoryFromTree(categoryPath) {
    const parts = categoryPath.split('/');
    
    // Cas spécial: catégorie racine
    if (parts.length === 1) {
        delete categoryTree[parts[0]];
        return;
    }
    
    // Catégorie imbriquée
    const lastPart = parts.pop();
    let current = categoryTree;
    
    // Naviguer jusqu'au parent
    for (let i = 0; i < parts.length; i++) {
        if (current[parts[i]]) {
            current = current[parts[i]];
        } else {
            // Chemin invalide, arrêter
            return;
        }
    }
    
    // Supprimer la catégorie
    delete current[lastPart];
    
    // Supprimer de l'ensemble global des catégories
    if (window.removeCategoryFromGlobal) {
        window.removeCategoryFromGlobal(categoryPath);
    }
}

/**
 * Met à jour la catégorie dans toutes les notes
 * @param {string} oldCategory - Ancien nom de catégorie
 * @param {string} newCategory - Nouveau nom de catégorie
 * @param {Array} notes - Tableau de toutes les notes
 */
function updateCategoryInNotes(oldCategory, newCategory, notes) {
    notes.forEach(note => {
        if (note.categories && note.categories.includes(oldCategory)) {
            // Remplacer l'ancienne catégorie par la nouvelle
            const index = note.categories.indexOf(oldCategory);
            if (index !== -1) {
                note.categories[index] = newCategory;
            }
        }
    });
    
    // Enregistrer les modifications
    if (window.saveNotesToStorage) {
        window.saveNotesToStorage(notes);
    }
}

/**
 * Supprime une catégorie de toutes les notes
 * @param {string} categoryPath - Chemin de la catégorie à supprimer
 * @param {Array} notes - Tableau de toutes les notes
 */
function removeCategoryFromNotes(categoryPath, notes) {
    notes.forEach(note => {
        if (note.categories) {
            // Supprimer la catégorie exacte
            note.categories = note.categories.filter(cat => cat !== categoryPath);
            
            // Supprimer également les sous-catégories
            note.categories = note.categories.filter(cat => !cat.startsWith(`${categoryPath}/`));
        }
    });
    
    // Enregistrer les modifications
    if (window.saveNotesToStorage) {
        window.saveNotesToStorage(notes);
    }
}

/**
 * Injecte les fonctions externes nécessaires
 * @param {Function} createNoteFn - Fonction pour créer un élément de note
 * @param {Function} addCategoryToGlobal - Fonction pour ajouter une catégorie à l'ensemble global
 * @param {Function} updateCategoryInGlobal - Fonction pour mettre à jour une catégorie dans l'ensemble global
 * @param {Function} removeCategoryFromGlobal - Fonction pour supprimer une catégorie de l'ensemble global
 * @param {Function} saveNotesToStorage - Fonction pour enregistrer les notes dans le stockage
 */
export function initCategoryTreeFunctions(functions) {
    if (functions.createNoteFn) {
        window.createNoteFn = functions.createNoteFn;
    }
    
    if (functions.addCategoryToGlobal) {
        window.addCategoryToGlobal = functions.addCategoryToGlobal;
    }
    
    if (functions.updateCategoryInGlobal) {
        window.updateCategoryInGlobal = functions.updateCategoryInGlobal;
    }
    
    if (functions.removeCategoryFromGlobal) {
        window.removeCategoryFromGlobal = functions.removeCategoryFromGlobal;
    }
    
    if (functions.saveNotesToStorage) {
        window.saveNotesToStorage = functions.saveNotesToStorage;
    }
}