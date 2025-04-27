/**
 * Point d'entrée principal de l'application
 * Initialise l'application et coordonne les différents modules
 */

// Imports des modules
import { loadNotes, saveNotes, loadRevisitSettings, saveRevisitSettings } from './utils/localStorage.js';
import { exportNotes, importNotes } from './utils/exportImport.js';
import { renderEmptyState, cleanupHighlightedElements } from './utils/domHelpers.js';
import { renderNotes, createNoteElement, deleteNote, saveNote, initNotesManager } from './notes/notesManager.js';
import { initNoteModal, openNoteModal, saveCurrentNote, initModalFunctions } from './notes/noteModal.js';
import { initRevisit, renderRevisitSections, showMoreNotes, openDaysEditModal, saveDaysSettings, initCreateNoteElement } from './notes/revisit.js';
import { initCategoryManager, handleCategoryInput, handleCategoryKeydown, addCategoryTag } from './categories/categoryManager.js';
import { detectHashtags, extractHashtags, extractYoutubeUrls, addHashtagTag } from './categories/hashtagManager.js';
import { initSearchManager, handleSearch, showSearchSuggestions, getCurrentSearchTerms } from './search/searchManager.js';

// Fonctions pour gérer l'arborescence des catégories
function renderCategoryTree(container, notes, createNoteFn, saveNotesFn) {
    // Extraire toutes les catégories des notes
    const allCategories = new Set();
    notes.forEach(note => {
        if (note.categories) {
            note.categories.forEach(category => allCategories.add(category));
        }
    });
    
    // Initialiser les fonctions globales si fournies
    if (createNoteFn) window.createNoteFn = createNoteFn;
    if (saveNotesFn) window.saveNotesFn = saveNotesFn;
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Créer la structure pour l'arborescence
    container.innerHTML = `
        <div class="category-tree-view">
            <div class="category-tree-sidebar">
                <div class="category-tree-header">
                    <h2>Catégories</h2>
                    <button id="add-root-category-btn" class="add-category-btn" title="Ajouter une catégorie">+</button>
                </div>
                <div class="category-tree-container">
                    <!-- L'arborescence sera injectée ici -->
                </div>
            </div>
            <div id="category-notes-container" class="category-notes-container">
                <div class="empty-category-notes">
                    <p>Sélectionnez une catégorie pour afficher ses notes</p>
                </div>
            </div>
        </div>
    `;
    
    // Initialiser l'arborescence de catégories
    const categoryTree = initCategoryTree(notes, allCategories);
    
    // Référence au conteneur d'arborescence
    const treeContainer = container.querySelector('.category-tree-container');
    
    // Vérifier s'il y a des catégories
    if (allCategories.size === 0) {
        treeContainer.innerHTML = `
            <div class="empty-categories">
                <h3>Aucune catégorie</h3>
                <p>Créez des catégories pour organiser vos notes</p>
                <button id="create-first-category">Créer une catégorie</button>
            </div>
        `;
        
        // Écouteur pour créer une première catégorie
        const createBtn = treeContainer.querySelector('#create-first-category');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                promptNewCategory('', notes, allCategories, treeContainer);
            });
        }
    } else {
        // Afficher les catégories racines
        renderCategoryLevel(treeContainer, categoryTree, '', notes, allCategories);
        
        // Ajouter les écouteurs d'événements
        setupCategoryTreeListeners(container, notes, allCategories);
    }
}

// Fonctions auxiliaires pour l'arborescence des catégories
function initCategoryTree(notes, allCategories) {
    // Structure de catégories (initialisation vide)
    const categoryTree = {};
    
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

function renderCategoryLevel(container, levelData, parentPath, notes, allCategories) {
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
            renderCategoryLevel(childrenContainer, levelData[category], fullPath, notes, allCategories);
            
            listItem.appendChild(childrenContainer);
        }
        
        levelList.appendChild(listItem);
    });
}

function setupCategoryTreeListeners(container, notes, allCategories) {
    const treeContainer = container.querySelector('.category-tree-container');
    
    // Écouteur pour le bouton d'ajout de catégorie racine
    const addRootCategoryBtn = container.querySelector('#add-root-category-btn');
    if (addRootCategoryBtn) {
        addRootCategoryBtn.addEventListener('click', () => {
            promptNewCategory('', notes, allCategories, treeContainer);
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
            
            promptNewCategory(parentCategory, notes, allCategories, treeContainer);
        });
    });
    
    // Écouteurs pour les boutons de renommage
    const renameBtns = container.querySelectorAll('.rename-category-btn');
    renameBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const categoryPath = listItem.dataset.category;
            
            promptRenameCategory(categoryPath, notes, allCategories, treeContainer);
        });
    });
    
    // Écouteurs pour les boutons de suppression
    const deleteBtns = container.querySelectorAll('.delete-category-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const listItem = btn.closest('.category-tree-item');
            const categoryPath = listItem.dataset.category;
            
            confirmDeleteCategory(categoryPath, notes, allCategories, treeContainer);
        });
    });
}

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
        
        categoryNotes.forEach(note => {
            // Utiliser la fonction de création de note si disponible
            if (window.createNoteFn) {
                const noteElement = window.createNoteFn(note);
                notesGrid.appendChild(noteElement);
            } else {
                // Fallback simple si la fonction n'est pas disponible
                const noteElement = document.createElement('div');
                noteElement.className = 'note-card';
                noteElement.innerHTML = `
                    <h4>${note.title || 'Sans titre'}</h4>
                    <p>${(note.content || '').substring(0, 100)}${note.content && note.content.length > 100 ? '...' : ''}</p>
                `;
                notesGrid.appendChild(noteElement);
            }
        });
        
        notesContainer.appendChild(notesGrid);
    }
}

function promptNewCategory(parentCategory, notes, allCategories, treeContainer) {
    const newName = prompt('Nom de la nouvelle catégorie:');
    if (!newName || newName.trim() === '') return;
    
    // Construire le chemin complet
    const fullPath = parentCategory ? `${parentCategory}/${newName.trim()}` : newName.trim();
    
    // Ajouter la nouvelle catégorie à l'ensemble global
    allCategories.add(fullPath);
    
    // Mettre à jour l'arborescence
    const categoryTree = initCategoryTree(notes, allCategories);
    
    // Réafficher l'arborescence
    treeContainer.innerHTML = '';
    renderCategoryLevel(treeContainer, categoryTree, '', notes, allCategories);
    setupCategoryTreeListeners(treeContainer.closest('.category-tree-view'), notes, allCategories);
}

function promptRenameCategory(categoryPath, notes, allCategories, treeContainer) {
    // Extraire le nom actuel de la catégorie (dernière partie du chemin)
    const parts = categoryPath.split('/');
    const currentName = parts[parts.length - 1];
    
    const newName = prompt(`Renommer "${currentName}" en:`, currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    
    // Construire le nouveau chemin complet
    parts[parts.length - 1] = newName.trim();
    const newPath = parts.join('/');
    
    // Mettre à jour les notes qui utilisent cette catégorie
    notes.forEach(note => {
        if (note.categories) {
            const index = note.categories.indexOf(categoryPath);
            if (index !== -1) {
                note.categories[index] = newPath;
            }
        }
    });
    
    // Mettre à jour l'ensemble de catégories
    allCategories.delete(categoryPath);
    allCategories.add(newPath);
    
    // Enregistrer les modifications
    if (window.saveNotesFn) window.saveNotesFn(notes);
    
    // Mettre à jour l'arborescence
    const categoryTree = initCategoryTree(notes, allCategories);
    
    // Réafficher l'arborescence
    treeContainer.innerHTML = '';
    renderCategoryLevel(treeContainer, categoryTree, '', notes, allCategories);
    setupCategoryTreeListeners(treeContainer.closest('.category-tree-view'), notes, allCategories);
}

function confirmDeleteCategory(categoryPath, notes, allCategories, treeContainer) {
    // Compter les notes dans cette catégorie
    const categoryNotes = countNotesInCategory(notes, categoryPath, true);
    
    let message = `Êtes-vous sûr de vouloir supprimer la catégorie "${categoryPath}"?`;
    if (categoryNotes > 0) {
        message += `\n\nAttention: ${categoryNotes} note(s) ${categoryNotes > 1 ? 'utilisent' : 'utilise'} cette catégorie.`;
    }
    
    if (confirm(message)) {
        // Supprimer la catégorie des notes
        notes.forEach(note => {
            if (note.categories) {
                // Supprimer la catégorie exacte
                note.categories = note.categories.filter(cat => cat !== categoryPath);
                
                // Supprimer également les sous-catégories
                note.categories = note.categories.filter(cat => !cat.startsWith(`${categoryPath}/`));
            }
        });
        
        // Supprimer la catégorie et ses sous-catégories de l'ensemble global
        allCategories.delete(categoryPath);
        Array.from(allCategories).forEach(cat => {
            if (cat.startsWith(`${categoryPath}/`)) {
                allCategories.delete(cat);
            }
        });
        
        // Enregistrer les modifications
        if (window.saveNotesFn) window.saveNotesFn(notes);
        
        // Mettre à jour l'arborescence
        const categoryTree = initCategoryTree(notes, allCategories);
        
        // Réafficher l'arborescence
        treeContainer.innerHTML = '';
        renderCategoryLevel(treeContainer, categoryTree, '', notes, allCategories);
        setupCategoryTreeListeners(treeContainer.closest('.category-tree-view'), notes, allCategories);
    }
}

// Initialisation de l'application lorsque le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const notesContainer = document.getElementById('notes-container');
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

    // Éléments pour les sections de révision
    const revisitSectionToday = document.getElementById('revisit-section-today');
    const revisitSection1 = document.getElementById('revisit-section-1');
    const revisitSection2 = document.getElementById('revisit-section-2');
    const revisitNotesToday = document.getElementById('revisit-notes-today');
    const revisitNotes1 = document.getElementById('revisit-notes-1');
    const revisitNotes2 = document.getElementById('revisit-notes-2');
    const showMoreBtnToday = document.getElementById('show-more-today');
    const showMoreBtn1 = document.getElementById('show-more-1');
    const showMoreBtn2 = document.getElementById('show-more-2');
    const editDaysBtns = document.querySelectorAll('.edit-days-btn');
    const daysEditModal = document.getElementById('days-edit-modal');
    const daysInput = document.getElementById('days-input');
    const saveDaysBtn = document.getElementById('save-days-btn');
    const revisitSections = document.querySelector('.revisit-sections');

    // Vérification que tous les éléments requis sont présents
    if (!searchInput || !searchResults || !notesContainer || !addNoteBtn || !noteModal ||
        !noteTitle || !noteContent || !saveNoteBtn || !deleteNoteBtn || !categoryInput ||
        !categorySuggestions || !selectedCategories || !detectedHashtags) {
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

        // Charger les paramètres de révision
        const revisitSettings = loadRevisitSettings();

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
            saveNote: saveNote
        });
        
        // Initialiser les fonctions notesManager
        initNotesManager(openNoteModal, renderRevisitSections);
        
        // Initialiser les révisitations
        initRevisit({
            containers: {
                today: revisitNotesToday,
                section1: revisitNotes1,
                section2: revisitNotes2
            },
            showMoreBtns: {
                today: showMoreBtnToday,
                section1: showMoreBtn1,
                section2: showMoreBtn2
            }
        }, revisitSettings);
        
        // Injecter la fonction createNoteElement dans le module revisit
        initCreateNoteElement(createNoteElement);

        // Ajouter l'écouteur pour le bouton de vue générale
        const generalViewBtn = document.getElementById('general-view-btn');
        if (generalViewBtn) {
            generalViewBtn.addEventListener('click', () => {
                // Masquer les sections de révision
                revisitSections.style.display = 'none';
                notesContainer.style.display = 'block';
                
                // Afficher l'arborescence des catégories
                renderCategoryTree(
                    notesContainer, 
                    appState.notes, 
                    createNoteElement, 
                    (notes) => saveNotes(notes)
                );
            });
        }

        // Affiche un état vide au démarrage (pas de notes) dans la section principale
        renderEmptyState(notesContainer);

        // Afficher les notes à revisiter
        renderRevisitSections(appState.notes);

        // Configurer les écouteurs d'événements
        setupEventListeners();
    }

    /**
     * Configure tous les écouteurs d'événements
     */
    function setupEventListeners() {
        // Bouton d'ajout de note
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Bouton de sauvegarde de note
        saveNoteBtn.addEventListener('click', () => {
            saveCurrentNote(appState.notes, () => {
                renderRevisitSections(appState.notes);
            });
        });

        // Bouton de suppression de note dans le modal
        deleteNoteBtn.addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                const currentNoteId = deleteNoteBtn.dataset.currentNoteId;
                if (currentNoteId) {
                    deleteNote(currentNoteId, appState.notes, () => renderEmptyState(notesContainer));
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
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
            showSearchSuggestions(
                searchInput.value, 
                appState.notes, 
                searchResults, 
                (note) => {
                    openNoteModal(note, true, getCurrentSearchTerms());
                    searchInput.value = '';
                }
            );
        });

        // Bouton de recherche
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const results = handleSearch(
                    searchInput.value,
                    appState.notes,
                    searchResults,
                    notesContainer,
                    revisitSections
                );
                
                if (results && results.length > 0) {
                    renderNotes(notesContainer, appState.notes, results, getCurrentSearchTerms());
                }
            });
        }

        // Recherche avec la touche Entrée
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const results = handleSearch(
                    searchInput.value,
                    appState.notes,
                    searchResults,
                    notesContainer,
                    revisitSections
                );
                
                if (results && results.length > 0) {
                    renderNotes(notesContainer, appState.notes, results, getCurrentSearchTerms());
                }
            }
        });

        // Bouton d'accueil
        const homeBtn = document.getElementById('home-btn');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                // Afficher les sections de révision
                revisitSections.style.display = 'flex';
                
                // Vider et masquer le conteneur principal
                renderEmptyState(notesContainer);
                
                // Vider la recherche
                searchInput.value = '';
            });
        }

        // Fermeture des modals avec le bouton de fermeture ou en cliquant à l'extérieur
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                cleanupHighlightedElements();
                noteModal.style.display = 'none';
                importExportModal.style.display = 'none';
                daysEditModal.style.display = 'none';
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
            if (event.target === daysEditModal) {
                daysEditModal.style.display = 'none';
            }
        });

        // Fonctionnalités d'import/export
        importExportBtn.addEventListener('click', () => {
            importExportModal.style.display = 'block';
        });

        exportBtn.addEventListener('click', () => {
            exportNotes(appState.notes, importStatus);
        });
        
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        importFile.addEventListener('change', (event) => {
            importNotes(
                event, 
                appState.notes, 
                () => {
                    renderRevisitSections(appState.notes);
                }, 
                importStatus
            );
        });

        // Fonctions pour les sections de révision
        editDaysBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const section = `section${index + 1}`;
                openDaysEditModal(section);
            });
        });

        // Écouteurs pour les boutons "Voir plus"
        if (showMoreBtnToday) {
            showMoreBtnToday.addEventListener('click', () => {
                console.log("Clic sur Voir plus (today)");
                const noteIds = JSON.parse(revisitNotesToday.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('today', notesToShow);
            });
        }
        
        if (showMoreBtn1) {
            showMoreBtn1.addEventListener('click', () => {
                const noteIds = JSON.parse(revisitNotes1.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('section1', notesToShow);
            });
        }
        
        if (showMoreBtn2) {
            showMoreBtn2.addEventListener('click', () => {
                const noteIds = JSON.parse(revisitNotes2.dataset.allNotes || '[]');
                const notesToShow = appState.notes.filter(note => noteIds.includes(note.id));
                showMoreNotes('section2', notesToShow);
            });
        }

        if (saveDaysBtn) {
            saveDaysBtn.addEventListener('click', () => {
                saveDaysSettings(appState.notes);
            });
        }
    }
});