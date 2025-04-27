
// Importer les fonctions nécessaires pour l'arborescence de catégories
import { initCategoryTree, renderCategoryTree, initCategoryTreeFunctions } from '../../scripts/categories/categoryTreeView.js';
import { loadNotes, saveNotes } from '../../scripts/utils/localStorage.js';
import { createNoteElement } from '../../scripts/notes/notesManager.js';

// Fonction pour gérer la navigation vers la vue générale des notes
export function navigateToGeneralView() {
    // Masquer les sections de révision
    const revisitSections = document.querySelector('.revisit-sections');
    if (revisitSections) {
        revisitSections.style.display = 'none';
    }
    
    // Vider et afficher le conteneur principal
    const notesContainer = document.getElementById('notes-container');
    if (notesContainer) {
        // Structure pour l'arborescence de catégories
        notesContainer.innerHTML = `
            <div class="category-tree-view">
                <div class="category-tree-sidebar">
                    <!-- L'arborescence des catégories sera injectée ici -->
                </div>
                <div id="category-notes-container" class="category-notes-container">
                    <div class="empty-category-notes">
                        <p>Sélectionnez une catégorie pour afficher ses notes</p>
                    </div>
                </div>
            </div>
        `;
        notesContainer.style.display = 'block';
        
        // Charger les notes
        const notes = loadNotes();
        
        // Extraire toutes les catégories des notes
        const allCategories = new Set();
        notes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(category => allCategories.add(category));
            }
        });
        
        // Initialiser l'arborescence de catégories
        const categoryTree = initCategoryTree(notes, allCategories);
        
        // Initialiser les fonctions pour l'arborescence
        initCategoryTreeFunctions({
            createNoteFn: createNoteElement,
            addCategoryToGlobal: (category) => {
                // Ajouter la catégorie à l'ensemble global
                allCategories.add(category);
            },
            updateCategoryInGlobal: (oldCategory, newCategory) => {
                // Mettre à jour la catégorie dans l'ensemble global
                if (allCategories.has(oldCategory)) {
                    allCategories.delete(oldCategory);
                    allCategories.add(newCategory);
                }
            },
            removeCategoryFromGlobal: (category) => {
                // Supprimer la catégorie de l'ensemble global
                allCategories.delete(category);
            },
            saveNotesToStorage: (updatedNotes) => {
                // Enregistrer les notes dans le stockage
                saveNotes(updatedNotes);
            }
        });
        
        // Afficher l'arborescence
        const treeSidebar = notesContainer.querySelector('.category-tree-sidebar');
        if (treeSidebar) {
            if (allCategories.size === 0) {
                // Aucune catégorie
                treeSidebar.innerHTML = `
                    <div class="empty-categories">
                        <h3>Aucune catégorie</h3>
                        <p>Créez des catégories pour organiser vos notes</p>
                        <button id="create-first-category">Créer une catégorie</button>
                    </div>
                `;
                
                // Écouteur d'événement pour le bouton de création de catégorie
                const createBtn = treeSidebar.querySelector('#create-first-category');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        const newName = prompt('Nom de la nouvelle catégorie:');
                        if (newName && newName.trim() !== '') {
                            // Ajouter la catégorie
                            allCategories.add(newName.trim());
                            
                            // Mettre à jour l'arborescence
                            const updatedTree = initCategoryTree(notes, allCategories);
                            
                            // Réafficher l'arborescence
                            renderCategoryTree(treeSidebar, notes);
                        }
                    });
                }
            } else {
                // Afficher l'arborescence
                renderCategoryTree(treeSidebar, notes);
            }
        }
    }
}
