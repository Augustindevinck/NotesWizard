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

    // Application state
    let notes = [];
    let currentNoteId = null;
    let allCategories = new Set();

    // Initialize the application
    init();

    function init() {
        // Load notes from localStorage
        loadNotes();
        // Display notes
        renderNotes();
        // Set up event listeners
        setupEventListeners();
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

        // Category input for autocomplete
        categoryInput.addEventListener('input', handleCategoryInput);
        categoryInput.addEventListener('keydown', handleCategoryKeydown);

        // Note content for hashtag detection
        noteContent.addEventListener('input', detectHashtags);

        // Search input
        searchInput.addEventListener('input', handleSearch);
        
        // Close modals when clicking on close button or outside
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                noteModal.style.display = 'none';
                importExportModal.style.display = 'none';
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === noteModal) {
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

    function renderNotes(filteredNotes = null) {
        const notesToRender = filteredNotes || notes;
        notesContainer.innerHTML = '';

        if (notesToRender.length === 0) {
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <h2>Pas de notes pour le moment</h2>
                    <p>Cliquez sur le bouton + pour créer votre première note</p>
                </div>
            `;
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
            <p class="note-content">${note.content}</p>
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
            openNoteModal(note);
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
                
                // Re-render notes
                renderNotes();
            }
        }
    }

    function openNoteModal(note = null) {
        // Clear previous note data
        noteTitle.value = '';
        noteContent.value = '';
        selectedCategories.innerHTML = '';
        detectedHashtags.innerHTML = '';
        currentNoteId = null;

        if (note) {
            // Edit existing note
            noteTitle.value = note.title || '';
            noteContent.value = note.content || '';
            currentNoteId = note.id;

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
        }

        // Display the modal
        noteModal.style.display = 'block';
        
        // Focus on title if empty, otherwise focus on content
        if (!noteTitle.value) {
            noteTitle.focus();
        } else {
            noteContent.focus();
        }
    }

    function saveNote() {
        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();
        
        if (!content) {
            alert('Le contenu de la note ne peut pas être vide.');
            return;
        }

        // Extract hashtags from content
        const hashtags = extractHashtags(content);

        // Get selected categories
        const categories = Array.from(selectedCategories.querySelectorAll('.category-tag'))
            .map(tag => tag.dataset.value);

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
                createdAt: now,
                updatedAt: now
            };
            notes.push(newNote);
        }

        // Save to localStorage
        saveNotes();
        
        // Close modal and refresh notes display
        noteModal.style.display = 'none';
        renderNotes();
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

    function addHashtagTag(tag) {
        const tagElement = document.createElement('div');
        tagElement.className = 'hashtag-tag';
        tagElement.textContent = `#${tag}`;
        detectedHashtags.appendChild(tagElement);
    }

    function handleSearch() {
        const query = searchInput.value.trim();
        
        if (query === '') {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            renderNotes();
            return;
        }
        
        // Perform search
        const searchResultItems = performSearch(query);
        
        // Display search results
        if (searchResultItems.length > 0) {
            searchResults.innerHTML = '';
            
            searchResultItems.slice(0, 5).forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = result.note.title || result.note.content.substring(0, 30) + '...';
                resultItem.addEventListener('click', () => {
                    openNoteModal(result.note);
                    searchResults.innerHTML = '';
                    searchResults.classList.remove('active');
                });
                searchResults.appendChild(resultItem);
            });
            
            searchResults.classList.add('active');
            
            // Also filter the main notes view
            renderNotes(searchResultItems.map(result => result.note));
        } else {
            searchResults.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
            searchResults.classList.add('active');
            renderNotes([]);
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
                
                // Replace current notes or merge them
                if (confirm('Voulez-vous remplacer toutes vos notes actuelles par les notes importées ? Cliquez sur Annuler pour ajouter les notes importées à vos notes existantes.')) {
                    notes = importedNotes;
                } else {
                    // Merge while avoiding duplicates by ID
                    const existingIds = new Set(notes.map(note => note.id));
                    importedNotes.forEach(note => {
                        if (!existingIds.has(note.id)) {
                            notes.push(note);
                            existingIds.add(note.id);
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
                renderNotes();
                
                // Show success message
                importStatus.textContent = `Import réussi ! ${importedNotes.length} note(s) importée(s).`;
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
});
