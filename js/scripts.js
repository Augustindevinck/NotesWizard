// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
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

    // Application state
    let notes = [];
    let currentNoteId = null;
    let allCategories = new Set();
    let currentSearchTerms = []; // Pour stocker les mots de la recherche actuelle
    let editingDaysForSection = null; // Pour savoir quelle section est en cours d'édition

    // Valeurs par défaut pour le nombre de jours à revisiter
    let revisitDays = {
        section1: 7,
        section2: 14
    };

    // Initialize the application
    init();

    function init() {
        // Load notes from localStorage
        loadNotes();

        // Charger les paramètres de révision depuis localStorage
        loadRevisitSettings();

        // Affiche un état vide au démarrage (pas de notes) dans la section principale
        renderEmptyState();

        // Afficher les notes à revisiter
        renderRevisitSections();

        // Set up event listeners
        setupEventListeners();
    }

    function renderEmptyState() {
        notesContainer.innerHTML = '';
        notesContainer.style.display = 'none';
    }

    function loadNotes() {
        const storedNotes = localStorage.getItem('notes');
        if (storedNotes) {
            notes = JSON.parse(storedNotes);
            // Extract all categories from notes
            notes.forEach(note => {
                if (note.categories) {
                    note.categories.forEach(category => allCategories.add(category));
                }
            });
        }
    }

    function saveNotes() {
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function setupEventListeners() {
        // Add note button
        addNoteBtn.addEventListener('click', () => openNoteModal());

        // Save note button
        saveNoteBtn.addEventListener('click', saveNote);

        // Delete note button in modal
        deleteNoteBtn.addEventListener('click', () => {
            if (currentNoteId) {
                if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                    deleteNote(currentNoteId);
                    cleanupHighlightedElements();
                    noteModal.style.display = 'none';
                }
            }
        });

        // Category input for autocomplete
        categoryInput.addEventListener('input', handleCategoryInput);
        categoryInput.addEventListener('keydown', handleCategoryKeydown);

        // Note content for hashtag detection
        noteContent.addEventListener('input', detectHashtags);

        // Search suggestions en temps réel lorsqu'on tape
        searchInput.addEventListener('input', showSearchSuggestions);

        // Search button - pour la recherche complète
        const searchBtn = document.getElementById('search-btn');
        searchBtn.addEventListener('click', handleSearch);

        // Search input - submit on Enter
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
            }
        });

        // Close modals when clicking on close button or outside
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

        // Import/Export functionality
        importExportBtn.addEventListener('click', () => {
            importExportModal.style.display = 'block';
        });

        exportBtn.addEventListener('click', exportNotes);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importNotes);
    }

    // Fonction pour nettoyer tous les éléments surlignés
    function cleanupHighlightedElements() {
        // Restaurer les inputs originaux
        const highlightedElements = document.querySelectorAll('.highlighted-content');
        highlightedElements.forEach(el => {
            const prev = el.previousElementSibling;
            if (prev && (prev.tagName === 'INPUT' || prev.tagName === 'TEXTAREA')) {
                prev.style.display = '';
            }
            el.parentNode.removeChild(el);
        });

        // Restaurer les tags originaux (catégories et hashtags)
        const highlightedTags = document.querySelectorAll('.category-tag, .hashtag-tag');
        highlightedTags.forEach(tag => {
            if (tag.dataset.originalContent) {
                tag.textContent = tag.dataset.originalContent;
                delete tag.dataset.originalContent;
            }
        });
    }

    function renderNotes(filteredNotes = null) {
        const notesToRender = filteredNotes || notes;
        notesContainer.innerHTML = '';

        if (notesToRender.length === 0) {
            notesContainer.innerHTML = '';
            return;
        }

        notesToRender.forEach(note => {
            const noteElement = createNoteElement(note);
            notesContainer.appendChild(noteElement);
        });
    }

    function createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-card';

        // Masquer les liens [[...]] pour l'affichage
        const displayContent = note.content.replace(/\[\[.*?\]\]/g, '');

        // Ajouter une classe spéciale pour les résultats de recherche
        if (note.isSearchResult) {
            noteDiv.className += ' is-search-result';
        }

        noteDiv.dataset.id = note.id;

        // Format date from ISO string to a more readable format
        const createdDate = new Date(note.createdAt);
        const formattedDate = createdDate.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Create categories HTML
        const categoriesHTML = note.categories && note.categories.length > 0
            ? note.categories.map(cat => `<span class="note-category">${cat}</span>`).join('')
            : '';

        // Create hashtags HTML
        const hashtagsHTML = note.hashtags && note.hashtags.length > 0
            ? note.hashtags.map(tag => `<span class="note-hashtag">#${tag}</span>`).join('')
            : '';

        // Add delete button and note content
        noteDiv.innerHTML = `
            <div class="delete-note" title="Supprimer cette note">&times;</div>
            <h3 class="note-title">${note.title || 'Sans titre'}</h3>
            <p class="note-content">${displayContent}</p>
            <div class="note-meta">
                ${categoriesHTML}
                ${hashtagsHTML}
            </div>
            <div class="note-date">Créée le ${formattedDate}</div>
        `;

        // Add click event to open the note for editing
        noteDiv.addEventListener('click', (event) => {
            // If clicking on the delete button, don't open the modal
            if (event.target.classList.contains('delete-note')) {
                event.stopPropagation();
                deleteNote(note.id);
                return;
            }

            // Vérifier si on vient d'une recherche (si des termes de recherche sont actifs)
            const fromSearch = currentSearchTerms.length > 0;
            openNoteModal(note, fromSearch);
        });

        // Add specific click handler for delete button
        const deleteBtn = noteDiv.querySelector('.delete-note');
        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            deleteNote(note.id);
        });

        return noteDiv;
    }

    function deleteNote(noteId) {
        // Ask for confirmation before deleting
        if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
            // Find the note index by id
            const noteIndex = notes.findIndex(note => note.id === noteId);

            if (noteIndex !== -1) {
                // Remove the note from the array
                notes.splice(noteIndex, 1);

                // Save to localStorage
                saveNotes();

                // Revenir à l'état vide
                renderEmptyState();

                // Mettre à jour les sections de révision
                renderRevisitSections();
            }
        }
    }

    function openNoteModal(note = null, fromSearch = false) {
        const viewMode = document.getElementById('note-view-mode');
        const editMode = document.getElementById('note-edit-mode');
        const viewTitle = document.getElementById('note-view-title');
        const viewContent = document.getElementById('note-view-content');
        const editButton = document.getElementById('edit-note-btn');

        // Clear previous note data
        noteTitle.value = '';
        noteContent.value = '';
        selectedCategories.innerHTML = '';
        detectedHashtags.innerHTML = '';
        currentNoteId = null;

        // Configure edit button
        editButton.onclick = () => {
            viewMode.classList.add('hidden');
            editMode.classList.remove('hidden');
            noteTitle.focus();
        };

        // Par défaut, masquer le bouton de suppression (pour nouvelle note)
        deleteNoteBtn.classList.add('hidden');

        if (note) {
            // Afficher en mode consultation
            viewMode.classList.remove('hidden');
            editMode.classList.add('hidden');
            viewTitle.textContent = note.title || 'Sans titre';
            // Masquer les URLs YouTube dans le contenu affiché
            const displayContent = (note.content || '').replace(/\[\[.*?\]\]/g, '');
            viewContent.textContent = displayContent;

            // Préparer le mode édition
            noteTitle.value = note.title || '';
            noteContent.value = note.content || '';
            currentNoteId = note.id;

            // Afficher le bouton de suppression pour les notes existantes
            deleteNoteBtn.classList.remove('hidden');

            // Add categories
            if (note.categories && note.categories.length > 0) {
                note.categories.forEach(category => {
                    addCategoryTag(category);
                });
            }

            // Show hashtags
            if (note.hashtags && note.hashtags.length > 0) {
                note.hashtags.forEach(tag => {
                    addHashtagTag(tag);
                });
            }

            // Show video URL if present
            if (note.videoUrls && note.videoUrls.length > 0) {
                const videoContainer = document.createElement('div');
                videoContainer.className = 'note-videos';
                note.videoUrls.forEach(url => {
                    const iframe = document.createElement('iframe');
                    iframe.src = url;
                    iframe.width = '100%';
                    iframe.height = '315';
                    iframe.frameBorder = '0';
                    iframe.allowFullscreen = true;
                    videoContainer.appendChild(iframe);
                });
                viewContent.appendChild(videoContainer);
            }

            // Si on vient d'une recherche et qu'il y a des termes à surligner
            if (fromSearch && currentSearchTerms.length > 0) {
                // Surligner les termes dans le titre et le contenu
                highlightSearchTerms(noteTitle);
                highlightSearchTerms(noteContent);

                // Surligner dans les catégories et hashtags
                highlightSearchTermsInTags(selectedCategories, '.category-tag');
                highlightSearchTermsInTags(detectedHashtags, '.hashtag-tag');
            }
        }

        // Pour une nouvelle note, afficher directement en mode édition
        if (!note) {
            viewMode.classList.add('hidden');
            editMode.classList.remove('hidden');
        }

        // Display the modal
        noteModal.style.display = 'block';

        // Focus on title if in edit mode and empty
        if (!viewMode.classList.contains('hidden')) {
            viewContent.focus();
        } else if (!noteTitle.value) {
            noteTitle.focus();
        } else {
            noteContent.focus();
        }
    }

    // Fonction pour surligner les termes de recherche dans un élément input/textarea
    function highlightSearchTerms(inputElement) {
        // Sauvegarder la position du curseur
        const startPos = inputElement.selectionStart;
        const endPos = inputElement.selectionEnd;

        // Récupérer la valeur de l'élément
        let content = inputElement.value;

        // Surligner chaque terme de recherche
        currentSearchTerms.forEach(term => {
            if (term.length > 1) {
                // Créer une expression régulière pour trouver le terme (insensible à la casse)
                const regex = new RegExp(term, 'gi');

                // Construire un wrapper temporaire autour du terme trouvé
                content = content.replace(regex, match => {
                    return `§§HIGHLIGHT_START§§${match}§§HIGHLIGHT_END§§`;
                });
            }
        });

        // Si des surlignages ont été ajoutés
        if (content.includes('§§HIGHLIGHT_START§§')) {
            // Créer un div pour afficher le contenu surligné
            const highlightedDiv = document.createElement('div');
            highlightedDiv.className = 'highlighted-content';
            highlightedDiv.contentEditable = true;
            highlightedDiv.style.width = '100%';
            highlightedDiv.style.minHeight = inputElement.offsetHeight + 'px';
            highlightedDiv.style.padding = window.getComputedStyle(inputElement).padding;
            highlightedDiv.style.border = inputElement.style.border;
            highlightedDiv.style.borderRadius = inputElement.style.borderRadius;
            highlightedDiv.style.fontFamily = window.getComputedStyle(inputElement).fontFamily;
            highlightedDiv.style.fontSize = window.getComputedStyle(inputElement).fontSize;
            highlightedDiv.style.lineHeight = window.getComputedStyle(inputElement).lineHeight;
            highlightedDiv.style.overflowY = 'auto';

            // Remplacer les marqueurs par des spans avec la classe CSS pour le surlignage
            content = content.replace(/§§HIGHLIGHT_START§§(.*?)§§HIGHLIGHT_END§§/g, '<span class="highlighted-term">$1</span>');

            // Définir le contenu surligné
            highlightedDiv.innerHTML = content;

            // Cacher l'élément original et ajouter le div surligné
            inputElement.style.display = 'none';
            inputElement.parentNode.insertBefore(highlightedDiv, inputElement.nextSibling);

            // Synchroniser le contenu lors de l'édition
            highlightedDiv.addEventListener('input', () => {
                // Mettre à jour la valeur de l'input original
                inputElement.value = highlightedDiv.innerText;

                // Déclencher l'événement input pour les fonctions comme detectHashtags
                const event = new Event('input', { bubbles: true });
                inputElement.dispatchEvent(event);
            });

            // Restaurer l'input original lorsque le modal est fermé
            const restoreInput = () => {
                if (highlightedDiv.parentNode) {
                    inputElement.style.display = '';
                    highlightedDiv.parentNode.removeChild(highlightedDiv);
                }
            };

            // Ajouter un gestionnaire pour restaurer l'input lors de la fermeture du modal
            modalCloseButtons.forEach(btn => {
                const originalHandler = btn.onclick;
                btn.onclick = () => {
                    restoreInput();
                    if (originalHandler) originalHandler();
                };
            });

            // Également restaurer lors du clic sur le bouton Enregistrer
            const originalSaveHandler = saveNoteBtn.onclick;
            saveNoteBtn.onclick = () => {
                restoreInput();
                if (originalSaveHandler) originalSaveHandler();
            };
        }
    }

    // Fonction pour surligner les termes de recherche dans les tags (catégories et hashtags)
    function highlightSearchTermsInTags(container, selector) {
        if (!container) return;

        const tags = container.querySelectorAll(selector);

        tags.forEach(tag => {
            const originalText = tag.textContent;
            let newText = originalText;

            currentSearchTerms.forEach(term => {
                if (term.length > 1) {
                    // Créer une expression régulière pour trouver le terme (insensible à la casse)
                    const regex = new RegExp(term, 'gi');

                    // Remplacer par le terme surligné
                    newText = newText.replace(regex, match => {
                        return `<span class="highlighted-term">${match}</span>`;
                    });
                }
            });

            // Si des modifications ont été apportées
            if (newText !== originalText) {
                // Sauvegarder le contenu original pour restauration ultérieure
                tag.dataset.originalContent = originalText;
                // Appliquer le nouveau contenu avec surlignage
                tag.innerHTML = newText;
            }
        });
    }

    function saveNote() {
        // Nettoyer les éléments surlignés en premier pour s'assurer d'avoir les données originales
        cleanupHighlightedElements();

        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();

        if (!content) {
            alert('Le contenu de la note ne peut pas être vide.');
            return;
        }

        // Extraire les URLs YouTube du contenu
        const videoUrls = extractYoutubeUrls(content);

        // Extract hashtags from content
        const hashtags = extractHashtags(content);

        // Get selected categories
        const categories = Array.from(selectedCategories.querySelectorAll('.category-tag'))
            .map(tag => tag.dataset.value || tag.textContent.replace(/×$/, '').trim());

        // Add categories to the global set
        categories.forEach(category => allCategories.add(category));

        const now = new Date().toISOString();

        if (currentNoteId) {
            // Update existing note
            const noteIndex = notes.findIndex(note => note.id === currentNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    title,
                    content,
                    categories,
                    hashtags,
                    videoUrls, // Add videoUrls array to the updated note
                    updatedAt: now
                };
            }
        } else {
            // Create new note
            const newNote = {
                id: generateUniqueId(),
                title,
                content,
                categories,
                hashtags,
                videoUrls, // Add videoUrls array to the new note
                createdAt: now,
                updatedAt: now
            };
            notes.push(newNote);
        }

        // Save to localStorage
        saveNotes();

        // Close modal and revenir à l'état vide
        noteModal.style.display = 'none';
        renderEmptyState();

        // Mettre à jour les sections de révision
        renderRevisitSections();
    }

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    function handleCategoryInput(event) {
        const input = event.target.value.trim();

        if (input === '') {
            categorySuggestions.innerHTML = '';
            categorySuggestions.classList.remove('active');
            return;
        }

        // Filter categories that match input
        const filteredCategories = Array.from(allCategories)
            .filter(category => category.toLowerCase().includes(input.toLowerCase()));

        // Display suggestions
        if (filteredCategories.length > 0) {
            categorySuggestions.innerHTML = '';
            filteredCategories.forEach(category => {
                const suggestion = document.createElement('div');
                suggestion.className = 'category-suggestion';
                suggestion.textContent = category;
                suggestion.addEventListener('click', () => {
                    addCategoryTag(category);
                    categoryInput.value = '';
                    categorySuggestions.innerHTML = '';
                    categorySuggestions.classList.remove('active');
                });
                categorySuggestions.appendChild(suggestion);
            });
            categorySuggestions.classList.add('active');
        } else {
            categorySuggestions.innerHTML = '';
            categorySuggestions.classList.remove('active');
        }
    }

    function handleCategoryKeydown(event) {
        const input = event.target.value.trim();

        // Add category on semicolon or enter
        if ((event.key === ';' || event.key === 'Enter') && input !== '') {
            event.preventDefault();

            // Remove semicolon if present
            const category = input.replace(/;$/, '');

            // Check if already added
            const existingTags = Array.from(selectedCategories.querySelectorAll('.category-tag'))
                .map(tag => tag.dataset.value);

            if (!existingTags.includes(category)) {
                addCategoryTag(category);
            }

            // Clear input and suggestions
            categoryInput.value = '';
            categorySuggestions.innerHTML = '';
            categorySuggestions.classList.remove('active');
        }
    }

    function addCategoryTag(category) {
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.dataset.value = category;
        tag.innerHTML = `
            ${category}
            <span class="remove-tag">&times;</span>
        `;

        // Add event listener to remove tag
        tag.querySelector('.remove-tag').addEventListener('click', (e) => {
            e.stopPropagation();
            tag.remove();
        });

        selectedCategories.appendChild(tag);
    }

    function detectHashtags() {
        const content = noteContent.value;
        const hashtags = extractHashtags(content);

        // Update hashtags display
        detectedHashtags.innerHTML = '';
        hashtags.forEach(tag => {
            addHashtagTag(tag);
        });
    }

    function extractHashtags(content) {
        const hashtagRegex = /#(\w+)/g;
        const matches = content.match(hashtagRegex);

        if (!matches) return [];

        // Extract just the tag text (without the # symbol) and remove duplicates
        return [...new Set(matches.map(match => match.substring(1)))];
    }

    function extractYoutubeUrls(content) {
        const youtubeRegex = /\[\[(.*?)\]\]/g;
        const matches = content.match(youtubeRegex);

        if (!matches) return [];

        return matches.map(match => {
            const url = match.slice(2, -2);
            // Extraire l'ID de la vidéo YouTube
            const videoId = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
            if (videoId) {
                return `https://www.youtube.com/embed/${videoId[1]}`;
            }
            return url;
        });
    }

    function addHashtagTag(tag) {
        const tagElement = document.createElement('div');
        tagElement.className = 'hashtag-tag';
        tagElement.textContent = `#${tag}`;
        detectedHashtags.appendChild(tagElement);
    }

    // Fonction pour afficher les suggestions de recherche en temps réel
    function showSearchSuggestions() {
        const query = searchInput.value.trim();

        if (query === '') {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }

        // Effectuer la recherche avec le texte actuel
        const searchResultItems = performSearch(query);

        // Afficher les suggestions de recherche
        if (searchResultItems.length > 0) {
            searchResults.innerHTML = '';

            searchResultItems.slice(0, 5).forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';

                // Préparer le texte à afficher (titre ou début du contenu)
                let displayText = result.note.title || result.note.content.substring(0, 30) + '...';

                // Mettre en surbrillance le terme recherché dans le texte de suggestion
                const queryTerms = query.split(/\s+/).filter(term => term.length > 1);
                queryTerms.forEach(term => {
                    if (term.length > 1) {
                        const regex = new RegExp(`(${term})`, 'gi');
                        displayText = displayText.replace(regex, '<span class="highlighted-term">$1</span>');
                    }
                });

                resultItem.innerHTML = displayText;

                // Ajouter l'événement click pour ouvrir la note
                resultItem.addEventListener('click', () => {
                    // Mettre à jour les termes de recherche actuels
                    currentSearchTerms = queryTerms;

                    // Marquer la note comme résultat de recherche
                    result.note.isSearchResult = true;

                    // Ouvrir la note avec surlignage des termes
                    openNoteModal(result.note, true);

                    // Nettoyer les suggestions
                    searchResults.innerHTML = '';
                    searchResults.classList.remove('active');
                });

                searchResults.appendChild(resultItem);
            });

            searchResults.classList.add('active');
        } else {
            searchResults.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
            searchResults.classList.add('active');
        }
    }

    function handleSearch() {
        const query = searchInput.value.trim();
        const revisitSections = document.querySelector('.revisit-sections');

        if (query === '') {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            currentSearchTerms = []; // Réinitialiser les termes de recherche
            renderEmptyState(); // Afficher l'état vide au lieu de toutes les notes
            revisitSections.style.display = 'flex'; // Réafficher les sections de révision
            return;
        }

        // Masquer les sections de révision pendant la recherche
        revisitSections.style.display = 'none';

        // Enregistrer les termes de recherche (mots individuels)
        currentSearchTerms = query.split(/\s+/).filter(term => term.length > 1);

        // Perform search
        const searchResultItems = performSearch(query);

        // Display search results
        if (searchResultItems.length > 0) {
            // Masquer les suggestions après la recherche
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');

            // Marquer chaque note comme résultat de recherche
            searchResultItems.forEach(result => {
                result.note.isSearchResult = true;
            });

            // Afficher les résultats dans la vue principale
            renderNotes(searchResultItems.map(result => result.note));
        } else {
            // Aucun résultat trouvé
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            renderNotes([]);

            // Afficher un message d'information
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <h2>Aucune note trouvée</h2>
                    <p>Aucune note ne correspond à votre recherche.</p>
                </div>
            `;
        }
    }

    function performSearch(query) {
        // Clean the query: lowercase, remove accents, remove extra spaces
        const cleanedQuery = cleanText(query);

        // First try strict search
        let results = strictSearch(cleanedQuery);

        // If no results, try fuzzy search with Levenshtein distance
        if (results.length === 0) {
            results = fuzzySearch(cleanedQuery);
        }

        // Sort results by score (higher score = better match)
        return results.sort((a, b) => b.score - a.score);
    }

    function cleanText(text) {
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/\s+/g, ' ')            // Replace multiple spaces with a single space
            .trim();
    }

    function strictSearch(cleanedQuery) {
        const results = [];

        notes.forEach(note => {
            let score = 0;
            const cleanTitle = cleanText(note.title || '');
            const cleanContent = cleanText(note.content || '');

            // Check for matches in title
            if (cleanTitle.includes(cleanedQuery)) {
                score += 3;
            }

            // Check for matches in content
            if (cleanContent.includes(cleanedQuery)) {
                score += 2;
            }

            // Check for matches in hashtags
            if (note.hashtags) {
                note.hashtags.forEach(tag => {
                    const cleanTag = cleanText(tag);
                    if (cleanTag.includes(cleanedQuery) || cleanedQuery.includes(cleanTag)) {
                        score += 2;
                    }
                });
            }

            // Check for matches in categories
            if (note.categories) {
                note.categories.forEach(category => {
                    const cleanCategory = cleanText(category);
                    if (cleanCategory.includes(cleanedQuery) || cleanedQuery.includes(cleanCategory)) {
                        score += 2;
                    }
                });
            }

            if (score > 0) {
                results.push({ note, score });
            }
        });

        return results;
    }

    function fuzzySearch(cleanedQuery) {
        const results = [];
        const queryWords = cleanedQuery.split(' ');

        notes.forEach(note => {
            let score = 0;
            const cleanTitle = cleanText(note.title || '');
            const cleanContent = cleanText(note.content || '');
            const titleWords = cleanTitle.split(' ');
            const contentWords = cleanContent.split(' ');

            // Check each word in the query against title words
            queryWords.forEach(queryWord => {
                if (queryWord.length <= 1) return; // Skip very short words

                titleWords.forEach(titleWord => {
                    const distance = levenshteinDistance(queryWord, titleWord);
                    if (distance <= 2) {
                        // Closer matches score higher
                        score += 3 - distance * 0.5;
                    }
                });

                // Check against content words
                contentWords.forEach(contentWord => {
                    const distance = levenshteinDistance(queryWord, contentWord);
                    if (distance <= 2) {
                        score += 2 - distance * 0.5;
                    }
                });

                // Check against hashtags
                if (note.hashtags) {
                    note.hashtags.forEach(tag => {
                        const cleanTag = cleanText(tag);
                        const distance = levenshteinDistance(queryWord, cleanTag);
                        if (distance <= 2) {
                            score += 2 - distance * 0.5;
                        }
                    });
                }

                // Check against categories
                if (note.categories) {
                    note.categories.forEach(category => {
                        const cleanCategory = cleanText(category);
                        const distance = levenshteinDistance(queryWord, cleanCategory);
                        if (distance <= 2) {
                            score += 2 - distance * 0.5;
                        }
                    });
                }
            });

            if (score > 0) {
                results.push({ note, score });
            }
        });

        return results;
    }

    // Levenshtein distance algorithm implementation
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let i = 0; i <= a.length; i++) {
            matrix[0][i] = i;
        }

        // Fill matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,       // deletion
                    matrix[i][j - 1] + 1,       // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return matrix[b.length][a.length];
    }

    function exportNotes() {
        if (notes.length === 0) {
            alert('Aucune note à exporter');
            return;
        }

        const dataStr = JSON.stringify(notes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'notes-' + new Date().toISOString().slice(0, 10) + '.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        // Show success message
        importStatus.textContent = 'Export réussi !';
        importStatus.className = 'success';
        importStatus.style.display = 'block';

        setTimeout(() => {
            importStatus.style.display = 'none';
        }, 3000);
    }

    function importNotes(event) {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const importedNotes = JSON.parse(e.target.result);

                // Validate the imported data
                if (!Array.isArray(importedNotes)) {
                    throw new Error('Format invalide : les données importées ne sont pas un tableau');
                }

                // Basic validation of each note
                importedNotes.forEach(note => {
                    if (!note.id || !note.content) {
                        throw new Error('Format invalide : certaines notes n\'ont pas d\'ID ou de contenu');
                    }
                });

                // Identifier les notes en double
                const existingNoteIds = new Map();
                notes.forEach(note => existingNoteIds.set(note.id, note));

                // Séparer les notes nouvelles et existantes
                const newNotes = [];
                const overlappingNotes = [];



                importedNotes.forEach(importedNote => {
                    if (existingNoteIds.has(importedNote.id)) {
                        overlappingNotes.push({
                            existing: existingNoteIds.get(importedNote.id),
                            imported: importedNote
                        });
                    } else {
                        newNotes.push(importedNote);
                    }
                });

                // Ajouter les nouvelles notes
                notes.push(...newNotes);

                // Demander quoi faire pour les notes existantes avec le même ID
                let notesUpdated = 0;
                if (overlappingNotes.length > 0) {
                    const keepExisting = confirm(
                        `${overlappingNotes.length} note(s) avec des identifiants existants ont été trouvées. ` +
                        `Cliquez sur OK pour conserver les notes existantes, ou sur Annuler pour les remplacer par les versions importées.`
                    );

                    overlappingNotes.forEach(pair => {
                        const noteIndex = notes.findIndex(note => note.id === pair.existing.id);
                        if (noteIndex !== -1) {
                            if (!keepExisting) {
                                // Remplacer par la note importée
                                notes[noteIndex] = pair.imported;
                                notesUpdated++;
                            }
                            // Si keepExisting est true, on ne fait rien (garde la note existante)
                        }
                    });
                }

                // Update categories set
                allCategories = new Set();
                notes.forEach(note => {
                    if (note.categories) {
                        note.categories.forEach(category => allCategories.add(category));
                    }
                });

                // Save to localStorage and refresh display
                saveNotes();
                renderEmptyState();
                renderRevisitSections();

                // Show success message
                importStatus.textContent = `Import réussi ! ${newNotes.length} nouvelle(s) note(s) ajoutée(s)` + 
                    (overlappingNotes.length > 0 ? ` et ${notesUpdated} note(s) existante(s) mise(s) à jour.` : '.');
                importStatus.className = 'success';
                importStatus.style.display = 'block';

                // Reset file input
                importFile.value = '';

            } catch (error) {
                console.error('Import error:', error);
                importStatus.textContent = `Erreur d'import : ${error.message}`;
                importStatus.className = 'error';
                importStatus.style.display = 'block';
            }
        };

        reader.readAsText(file);
    }

    // Fonctions pour les sections de révision

    function loadRevisitSettings() {
        // Charger les paramètres de révision depuis localStorage
        const storedSettings = localStorage.getItem('revisitDays');
        if (storedSettings) {
            revisitDays = JSON.parse(storedSettings);
        }
        updateRevisitTitles();

        // Ajouter les écouteurs d'événements pour les boutons d'édition
        editDaysBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const section = `section${index + 1}`;
                openDaysEditModal(section);
            });
        });

        // Ajouter les écouteurs pour les boutons "Voir plus"
        if (showMoreBtnToday) {
            showMoreBtnToday.addEventListener('click', () => showMoreNotes('today'));
        }
        if (showMoreBtn1) {
            showMoreBtn1.addEventListener('click', () => showMoreNotes('section1'));
        }
        if (showMoreBtn2) {
            showMoreBtn2.addEventListener('click', () => showMoreNotes('section2'));
        }

        // Écouteur pour fermer le modal d'édition de jours
        const daysModalCloseBtn = document.querySelector('#days-edit-modal .close');
        if (daysModalCloseBtn) {
            daysModalCloseBtn.addEventListener('click', () => {
                daysEditModal.style.display = 'none';
            });
        }

        // Écouteur pour enregistrer les modifications
        if (saveDaysBtn) {
            saveDaysBtn.addEventListener('click', saveDaysSettings);
        }

        // Fermer le modal si clic à l'extérieur
        window.addEventListener('click', (event) => {
            if (event.target === daysEditModal) {
                daysEditModal.style.display = 'none';
            }
        });
    }

    function saveRevisitSettings() {
        localStorage.setItem('revisitDays', JSON.stringify(revisitDays));
    }

    function updateRevisitTitles() {
        // Mettre à jour les titres des sections avec le nombre de jours configuré
        const title1 = revisitSection1?.querySelector('.revisit-title');
        const title2 = revisitSection2?.querySelector('.revisit-title');

        // Mettre à jour les titres avec le nombre de jours
        if (title1) {
            title1.textContent = `Notes d'il y a ${revisitDays.section1} jours`;
        }
        if (title2) {
            title2.textContent = `Notes d'il y a ${revisitDays.section2} jours`;
        }
    }

    function renderRevisitSections() {
        if (!revisitNotesToday || !revisitNotes1 || !revisitNotes2) return;

        // Vider les conteneurs de notes
        revisitNotesToday.innerHTML = '';
        revisitNotes1.innerHTML = '';
        revisitNotes2.innerHTML = '';

        // Calculer les dates de référence pour chaque section
        const now = new Date();

        // Date du jour (aujourd'hui)
        const today = new Date(now);

        // Dates pour les sections configurables
        const date1 = new Date(now);
        date1.setDate(date1.getDate() - revisitDays.section1);

        const date2 = new Date(now);
        date2.setDate(date2.getDate() - revisitDays.section2);

        // Filtrer les notes pour chaque section
        const notesForToday = getNotesForDate(today);
        const notesForSection1 = getNotesForDate(date1);
        const notesForSection2 = getNotesForDate(date2);

        // Afficher les notes (max 3 visibles par défaut)
        renderRevisitNotesForSection(notesForToday, revisitNotesToday, showMoreBtnToday, 'today');
        renderRevisitNotesForSection(notesForSection1, revisitNotes1, showMoreBtn1, 'section1');
        renderRevisitNotesForSection(notesForSection2, revisitNotes2, showMoreBtn2, 'section2');
    }

    function getNotesForDate(targetDate) {
        // Obtenir les notes créées exactement à la date cible
        // Format de date pour comparaison (YYYY-MM-DD)
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const targetDay = targetDate.getDate();

        return notes.filter(note => {
            const noteDate = new Date(note.createdAt);
            return noteDate.getFullYear() === targetYear && 
                   noteDate.getMonth() === targetMonth && 
                   noteDate.getDate() === targetDay;
        });
    }

    function renderRevisitNotesForSection(notesToRender, container, showMoreBtn, sectionId) {
        if (notesToRender.length === 0) {
            container.innerHTML = '<div class="empty-revisit">Aucune note pour cette période</div>';
            if (showMoreBtn) {
                showMoreBtn.style.display = 'none';
            }
            return;
        }

        // Pour l'affichage compact, montrer max 3 notes par défaut
        const initialCount = Math.min(3, notesToRender.length);
        const hasMore = notesToRender.length > initialCount;

        // Créer les éléments pour les 3 premières notes
        notesToRender.slice(0, initialCount).forEach(note => {
            const noteElement = createRevisitNoteElement(note);
            container.appendChild(noteElement);
        });

        // Afficher ou masquer le bouton "Voir plus"
        if (showMoreBtn) {
            showMoreBtn.style.display = hasMore ? 'block' : 'none';
        }

        // Stocker toutes les notes pour ce jour dans un attribut data pour "Voir plus"
        container.dataset.allNotes = JSON.stringify(notesToRender.map(note => note.id));
        container.dataset.expandedView = 'false';
    }

    function createRevisitNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'revisit-note';
        noteDiv.dataset.id = note.id;
        noteDiv.textContent = note.title || note.content.substring(0, 40) + '...';

        // Ajouter un écouteur d'événements pour ouvrir la note
        noteDiv.addEventListener('click', () => {
            openNoteModal(note, false);
        });

        return noteDiv;
    }

    function showMoreNotes(sectionId) {
        let container, showMoreBtn;

        if (sectionId === 'today') {
            container = revisitNotesToday;
            showMoreBtn = showMoreBtnToday;
        } else if (sectionId === 'section1') {
            container = revisitNotes1;
            showMoreBtn = showMoreBtn1;
        } else if (sectionId === 'section2') {
            container = revisitNotes2;
            showMoreBtn = showMoreBtn2;
        }

        if (!container || !showMoreBtn) return;

        // Vérifier si on est déjà en vue étendue
        if (container.dataset.expandedView === 'true') {
            // Réduire la vue
            container.dataset.expandedView = 'false';

            // Supprimer toutes les notes actuelles
            container.innerHTML = '';

            // Récupérer les IDs de toutes les notes et les objets correspondants
            const noteIds = JSON.parse(container.dataset.allNotes);
            const notesToRender = noteIds.map(id => notes.find(note => note.id === id)).filter(Boolean);

            // Afficher seulement les 3 premières
            const initialCount = Math.min(3, notesToRender.length);
            notesToRender.slice(0, initialCount).forEach(note => {
                const noteElement = createRevisitNoteElement(note);
                container.appendChild(noteElement);
            });

            // Changer le texte du bouton
            showMoreBtn.textContent = 'Voir plus';
        } else {
            // Étendre la vue
            container.dataset.expandedView = 'true';

            // Récupérer toutes les notes et les afficher
            const noteIds = JSON.parse(container.dataset.allNotes);
            const notesToRender = noteIds.map(id => notes.find(note => note.id === id)).filter(Boolean);

            // Supprimer les notes actuelles
            container.innerHTML = '';

            // Ajouter toutes les notes
            notesToRender.forEach(note => {
                const noteElement = createRevisitNoteElement(note);
                container.appendChild(noteElement);
            });

            // Changer le texte du bouton
            showMoreBtn.textContent = 'Voir moins';
        }
    }

    function openDaysEditModal(sectionId) {
        // Stocker la section en cours d'édition
        editingDaysForSection = sectionId;

        // Préremplir avec la valeur actuelle
        daysInput.value = revisitDays[sectionId];

        // Afficher le modal
        daysEditModal.style.display = 'block';

        // Focus sur l'input
        daysInput.focus();
    }

    function saveDaysSettings() {
        if (!editingDaysForSection) return;

        // Récupérer la nouvelle valeur
        const newDays = parseInt(daysInput.value, 10);

        // Vérifier que c'est un nombre valide
        if (isNaN(newDays) || newDays < 1 || newDays > 365) {
            alert('Veuillez entrer un nombre de jours valide (entre 1 et 365).');
            return;
        }

        // Enregistrer la nouvelle valeur
        revisitDays[editingDaysForSection] = newDays;

        // Sauvegarder dans localStorage
        saveRevisitSettings();

        // Mettre à jour les titres
        updateRevisitTitles();

        // Mettre à jour l'affichage des notes
        renderRevisitSections();

        // Fermer le modal
        daysEditModal.style.display = 'none';

        // Réinitialiser la section en cours d'édition
        editingDaysForSection = null;
    }
});