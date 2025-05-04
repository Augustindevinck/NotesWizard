/**
 * Script principal pour la page des catégories avec synchronisation entre onglets
 */

// Imports des modules
import { loadNotes, saveNotes, setOnStorageUpdateCallback } from './scripts/utils/localStorage.js';
import { exportNotes, importNotes } from './scripts/utils/exportImport.js';
import { cleanupHighlightedElements } from './scripts/utils/domHelpers.js';
import { createNoteElement, deleteNote, saveNote, initNotesManager } from './scripts/notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './scripts/notes/noteModal.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './scripts/categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './scripts/categories/hashtagManager.js';
import { initSearchManager, getCurrentSearchTerms } from './scripts/search/searchManager.js';
import { levenshteinDistance } from './scripts/search/searchUtils.js';
import { navigateToPage } from './scripts/utils/navigation.js';
import { showSupabaseConfigForm } from './scripts/utils/supabaseDirectConfig.js';

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const addNoteBtn = document.getElementById('add-note-btn');
    const noteModal = document.getElementById('note-modal');
    const noteTitle = document.getElementById('note-title');
    const noteContent = document.getElementById('note-content');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const categoryInput = document.getElementById('category-input');
    const categorySuggestions = document.getElementById('category-suggestions');
    const selectedCategories = document.getElementById('selected-categories');
    const detectedHashtags = document.getElementById('detected-hashtags');
    const importExportBtn = document.getElementById('import-export-btn');
    const importExportModal = document.getElementById('import-export-modal');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const importStatus = document.getElementById('import-status');
    const modalCloseButtons = document.querySelectorAll('.close');
    const viewMode = document.getElementById('note-view-mode');
    const editMode = document.getElementById('note-edit-mode');
    const viewTitle = document.getElementById('note-view-title');
    const viewContent = document.getElementById('note-view-content');
    const editButton = document.getElementById('edit-note-btn');
    const categoryTreeContainer = document.getElementById('category-tree-container');
    const categoryNotesContainer = document.getElementById('category-notes-container');

    // Vérification que tous les éléments requis sont présents
    if (!searchInput || !searchResults || !addNoteBtn || !noteModal ||
        !noteTitle || !noteContent || !saveNoteBtn || !deleteNoteBtn || !categoryInput ||
        !categorySuggestions || !selectedCategories || !detectedHashtags || !categoryTreeContainer) {
        console.error('Éléments DOM manquants - Initialisation impossible');
        return;
    }

    // État de l'application
    const appState = {
        notes: [],
        allCategories: new Set()
    };

    // Initialisation de l'application
    init();

    /**
     * Initialise l'application
     */
    function init() {
        // Charger les notes depuis localStorage
        appState.notes = loadNotes();
        
        // Extraire toutes les catégories des notes
        appState.notes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(category => appState.allCategories.add(category));
            }
        });
        
        // Configurer la synchronisation entre les onglets
        setOnStorageUpdateCallback((updatedNotes) => {
            console.log('Mise à jour des notes détectée dans un autre onglet, rechargement...');
            // Mettre à jour l'état local
            appState.notes = updatedNotes;
            
            // Mettre à jour l'arborescence des catégories
            renderCategoryTree();
            
            // Si une catégorie est actuellement sélectionnée, rafraîchir son affichage
            const selectedCategoryItem = document.querySelector('.category-tree-item.selected');
            if (selectedCategoryItem) {
                const categoryPath = selectedCategoryItem.dataset.category;
                showNotesForCategory(categoryPath);
            }
        });

        // Initialisation des modules
        initCategoryManager(appState.allCategories);
        initSearchManager();
        
        // Initialiser les éléments du modal
        initNoteModal({
            noteModal,
            noteTitle,
            noteContent,
            selectedCategories,
            detectedHashtags,
            deleteNoteBtn,
            viewMode,
            editMode,
            viewTitle,
            viewContent,
            editButton,
            saveNoteBtn
        });
        
        // Injecter les fonctions nécessaires au noteModal
        initModalFunctions({
            extractHashtags: extractHashtags,
            extractYoutubeUrls: extractYoutubeUrls,
            addCategoryTag: addCategoryTag,
            addHashtagTag: addHashtagTag,
            saveNote: (noteData) => saveNote(noteData, appState.notes, () => {
                renderCategoryTree();
            })
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, () => {
            renderCategoryTree();
        });

        // Afficher l'arborescence des catégories
        renderCategoryTree();

        // Vérifier s'il y a un paramètre de catégorie dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        
        // Si une catégorie est spécifiée dans l'URL, l'afficher directement
        if (categoryParam) {
            console.log(`Catégorie spécifiée dans l'URL: ${categoryParam}`);
            // Sélectionner visuellement la catégorie dans l'arborescence si elle existe
            const categoryItems = document.querySelectorAll('.category-tree-item');
            let categoryFound = false;
            
            categoryItems.forEach(item => {
                if (item.dataset.category === categoryParam) {
                    // Mettre en évidence cette catégorie
                    categoryItems.forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    categoryFound = true;
                    
                    // Ouvrir les parents si nécessaire
                    let parent = item.parentElement;
                    while (parent && !parent.classList.contains('category-tree-view')) {
                        if (parent.classList.contains('category-tree-children')) {
                            parent.style.display = 'block';
                            const expandBtn = parent.parentElement.querySelector('.category-tree-expand-btn');
                            if (expandBtn) {
                                expandBtn.innerHTML = '▼';
                                expandBtn.dataset.expanded = 'true';
                            }
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Afficher les notes de cette catégorie
                    showNotesForCategory(categoryParam);
                }
            });
            
            // Si la catégorie n'existe pas encore dans l'arborescence
            if (!categoryFound) {
                // On peut ajouter cette partie si besoin pour créer une nouvelle catégorie
                // appState.allCategories.add(categoryParam);
                // renderCategoryTree();
                // showNotesForCategory(categoryParam);
                
                // Ou simplement afficher un message
                categoryNotesContainer.innerHTML = `
                    <div class="empty-category-notes">
                        <p>La catégorie "${categoryParam}" n'existe pas encore.</p>
                    </div>
                `;
            }
        }

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }

    /**
     * Affiche l'arborescence des catégories
     */
    function renderCategoryTree() {
        // Vider le conteneur
        categoryTreeContainer.innerHTML = '';
        
        // Extraire toutes les catégories des notes
        appState.allCategories.clear();
        appState.notes.forEach(note => {
            if (note.categories) {
                note.categories.forEach(category => appState.allCategories.add(category));
            }
        });
        
        // Initialiser l'arborescence de catégories
        const categoryTree = initCategoryTree();
        
        // Vérifier s'il y a des catégories
        if (appState.allCategories.size === 0) {
            categoryTreeContainer.innerHTML = `
                <div class="empty-categories">
                    <h3>Aucune catégorie</h3>
                    <p>Créez des catégories pour organiser vos notes</p>
                    <button id="create-first-category">Créer une catégorie</button>
                </div>
            `;
            
            // Écouteur pour créer une première catégorie
            const createBtn = categoryTreeContainer.querySelector('#create-first-category');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    promptNewCategory('');
                });
            }
        } else {
            // Afficher les catégories racines
            renderCategoryLevel(categoryTreeContainer, categoryTree, '');
            
            // Ajouter les écouteurs d'événements
            setupCategoryTreeListeners();
        }
    }
    
    /**
     * Initialise la structure de l'arborescence de catégories
     * @returns {Object} - Structure hiérarchique des catégories
     */
    function initCategoryTree() {
        // Structure de catégories (initialisation vide)
        const categoryTree = {};
        
        // Convertir les catégories simples en structure d'arborescence
        Array.from(appState.allCategories).forEach(category => {
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
     * Affiche un niveau de l'arborescence de catégories
     * @param {HTMLElement} container - Conteneur où afficher le niveau
     * @param {Object} levelData - Données du niveau actuel
     * @param {string} parentPath - Chemin du parent (vide pour la racine)
     */
    function renderCategoryLevel(container, levelData, parentPath) {
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
            const categoryNotes = countNotesInCategory(fullPath, hasChildren);
            
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
                renderCategoryLevel(childrenContainer, levelData[category], fullPath);
                
                listItem.appendChild(childrenContainer);
            }
            
            levelList.appendChild(listItem);
        });
    }

    /**
     * Ajoute les écouteurs d'événements pour l'arborescence de catégories
     */
    function setupCategoryTreeListeners() {
        const container = document.querySelector('.category-tree-view');
        
        // Écouteur pour le bouton d'ajout de catégorie racine
        const addRootCategoryBtn = document.getElementById('add-root-category-btn');
        if (addRootCategoryBtn) {
            addRootCategoryBtn.addEventListener('click', () => {
                promptNewCategory('');
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
                showNotesForCategory(categoryPath);
            });
        });
        
        // Écouteurs pour les boutons d'ajout de sous-catégorie
        const addSubcategoryBtns = container.querySelectorAll('.add-subcategory-btn');
        addSubcategoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listItem = btn.closest('.category-tree-item');
                const parentCategory = listItem.dataset.category;
                
                promptNewCategory(parentCategory);
            });
        });
        
        // Écouteurs pour les boutons de renommage
        const renameBtns = container.querySelectorAll('.rename-category-btn');
        renameBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listItem = btn.closest('.category-tree-item');
                const categoryPath = listItem.dataset.category;
                
                promptRenameCategory(categoryPath);
            });
        });
        
        // Écouteurs pour les boutons de suppression
        const deleteBtns = container.querySelectorAll('.delete-category-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listItem = btn.closest('.category-tree-item');
                const categoryPath = listItem.dataset.category;
                
                confirmDeleteCategory(categoryPath);
            });
        });
    }

    /**
     * Compte le nombre de notes dans une catégorie
     * @param {string} categoryPath - Chemin de la catégorie
     * @param {boolean} includeSubcategories - Inclure les sous-catégories
     * @returns {number} - Nombre de notes
     */
    function countNotesInCategory(categoryPath, includeSubcategories = false) {
        return appState.notes.filter(note => {
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
     * Affiche les notes d'une catégorie spécifique
     * @param {string} categoryPath - Chemin de la catégorie
     */
    function showNotesForCategory(categoryPath) {
        // Trouver les notes appartenant à cette catégorie
        const categoryNotes = appState.notes.filter(note => {
            if (!note.categories) return false;
            return note.categories.includes(categoryPath);
        });
        
        // Vider le conteneur
        categoryNotesContainer.innerHTML = '';
        
        // Créer un en-tête
        const header = document.createElement('div');
        header.className = 'category-notes-header';
        header.innerHTML = `
            <h3>Notes dans "${categoryPath}"</h3>
            <span>${categoryNotes.length} note(s) trouvée(s)</span>
        `;
        categoryNotesContainer.appendChild(header);
        
        // Afficher les notes
        if (categoryNotes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-category-notes';
            emptyMsg.textContent = 'Aucune note dans cette catégorie';
            categoryNotesContainer.appendChild(emptyMsg);
        } else {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'category-notes-grid';
            
            categoryNotes.forEach(note => {
                const noteElement = createNoteElement(note);
                notesGrid.appendChild(noteElement);
            });
            
            categoryNotesContainer.appendChild(notesGrid);
        }
    }

    /**
     * Demande le nom d'une nouvelle catégorie
     * @param {string} parentCategory - Catégorie parente (vide pour la racine)
     */
    function promptNewCategory(parentCategory) {
        const newName = prompt('Nom de la nouvelle catégorie:');
        if (!newName || newName.trim() === '') return;
        
        // Construire le chemin complet
        const fullPath = parentCategory ? `${parentCategory}/${newName.trim()}` : newName.trim();
        
        // Ajouter la nouvelle catégorie à l'ensemble global
        appState.allCategories.add(fullPath);
        
        // Rafraîchir l'arborescence
        renderCategoryTree();
    }

    /**
     * Demande un nouveau nom pour une catégorie existante
     * @param {string} categoryPath - Chemin de la catégorie à renommer
     */
    function promptRenameCategory(categoryPath) {
        // Extraire le nom actuel de la catégorie (dernière partie du chemin)
        const parts = categoryPath.split('/');
        const currentName = parts[parts.length - 1];
        
        const newName = prompt(`Renommer "${currentName}" en:`, currentName);
        if (!newName || newName.trim() === '' || newName === currentName) return;
        
        // Construire le nouveau chemin complet
        parts[parts.length - 1] = newName.trim();
        const newPath = parts.join('/');
        
        // Mettre à jour les notes qui utilisent cette catégorie
        appState.notes.forEach(note => {
            if (note.categories) {
                const index = note.categories.indexOf(categoryPath);
                if (index !== -1) {
                    note.categories[index] = newPath;
                }
            }
        });
        
        // Mettre à jour l'ensemble de catégories
        appState.allCategories.delete(categoryPath);
        appState.allCategories.add(newPath);
        
        // Enregistrer les modifications
        saveNotes(appState.notes);
        
        // Rafraîchir l'arborescence
        renderCategoryTree();
    }

    /**
     * Demande confirmation avant de supprimer une catégorie
     * @param {string} categoryPath - Chemin de la catégorie à supprimer
     */
    function confirmDeleteCategory(categoryPath) {
        // Compter les notes dans cette catégorie
        const categoryNotes = countNotesInCategory(categoryPath, true);
        
        let message = `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryPath}"?`;
        if (categoryNotes > 0) {
            message += `\n\nAttention: ${categoryNotes} note(s) ${categoryNotes > 1 ? 'utilisent' : 'utilise'} cette catégorie.`;
        }
        
        if (confirm(message)) {
            // Supprimer la catégorie des notes
            appState.notes.forEach(note => {
                if (note.categories) {
                    // Supprimer la catégorie exacte
                    note.categories = note.categories.filter(cat => cat !== categoryPath);
                    
                    // Supprimer également les sous-catégories
                    note.categories = note.categories.filter(cat => !cat.startsWith(`${categoryPath}/`));
                }
            });
            
            // Supprimer la catégorie et ses sous-catégories de l'ensemble global
            appState.allCategories.delete(categoryPath);
            Array.from(appState.allCategories).forEach(cat => {
                if (cat.startsWith(`${categoryPath}/`)) {
                    appState.allCategories.delete(cat);
                }
            });
            
            // Enregistrer les modifications
            saveNotes(appState.notes);
            
            // Rafraîchir l'arborescence
            renderCategoryTree();
        }
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'accueil
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                navigateToPage('index.html');
            });
        }
        
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(appState.notes, () => {
                renderCategoryTree();
            });
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
                if (currentNoteId) {
                    deleteNote(currentNoteId, appState.notes, () => {});
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                    renderCategoryTree();
                }
            }
        });

        // Saisie de catégorie pour l'autocomplétion
        categoryInput.addEventListener('input', (event) => {
            handleCategoryInput(event, categoryInput, categorySuggestions);
        });
        
        categoryInput.addEventListener('keydown', (event) => {
            handleCategoryKeydown(event, categoryInput, selectedCategories, categorySuggestions);
        });

        // Détection des hashtags pendant la saisie
        noteContent.addEventListener('input', () => {
            detectHashtags(noteContent.value, detectedHashtags);
        });

        // Suggestions de recherche en temps réel
        searchInput.addEventListener('input', () => {
            // Implémentation locale de showSearchSuggestions
            const query = searchInput.value.trim();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                return;
            }
            
            // Utiliser la fonction performSearch du searchManager
            const results = appState.notes.filter(note => {
                return (note.title && note.title.toLowerCase().includes(query.toLowerCase())) || 
                       (note.content && note.content.toLowerCase().includes(query.toLowerCase()));
            }).slice(0, 5);
            
            if (results.length > 0) {
                searchResults.innerHTML = '';
                results.forEach(note => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = note.title || 'Sans titre';
                    item.addEventListener('click', () => {
                        openNoteModal(note, true, getCurrentSearchTerms(query));
                        searchInput.value = '';
                        searchResults.style.display = 'none';
                    });
                    searchResults.appendChild(item);
                });
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = '<div class="no-results">Aucun résultat</div>';
                searchResults.style.display = 'block';
            }
        });

        // Bouton de recherche
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                // Naviguer vers la page de recherche avec la requête
                if (searchInput.value.trim()) {
                    navigateToPage('search.html', { query: searchInput.value.trim() });
                } else {
                    navigateToPage('search.html');
                }
            });
        }

        // Recherche avec la touche Entrée
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && searchInput.value.trim()) {
                event.preventDefault();
                navigateToPage('search.html', { query: searchInput.value.trim() });
            }
        });

        // Fermeture des modals avec le bouton de fermeture ou en cliquant à l'extérieur
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
                importExportModal.style.display = 'none';
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === noteModal) {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
            }
            if (event.target === importExportModal) {
                importExportModal.style.display = 'none';
            }
        });

        // Configuration Supabase
        const supabaseConfigBtn = document.getElementById('supabase-config-btn');
        if (supabaseConfigBtn) {
            supabaseConfigBtn.addEventListener('click', () => {
                showSupabaseConfigForm(() => {
                    // Recharger les notes après configuration
                    appState.notes = loadNotes();
                    
                    // Mettre à jour les catégories
                    appState.allCategories.clear();
                    appState.notes.forEach(note => {
                        if (note.categories) {
                            note.categories.forEach(category => appState.allCategories.add(category));
                        }
                    });
                    
                    // Actualiser l'affichage
                    renderCategoryTree();
                });
            });
        }
    }
});