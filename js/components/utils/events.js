
// Configuration des écouteurs d'événements
export function setupEventListeners(addNoteBtn, searchInput, searchResults, noteModal, noteTitle, 
    noteContent, saveNoteBtn, deleteNoteBtn, categoryInput, categorySuggestions, 
    selectedCategories, detectedHashtags, importExportBtn, importExportModal, daysEditModal,
    modalCloseButtons, importFile, importStatus, editDaysBtns, notes, cleanupHighlightedElements, 
    openNoteModal, handleCategoryInput, handleCategoryKeydown, detectHashtags, 
    showSearchSuggestions, handleSearch, deleteNote, exportNotes, importNotes, 
    saveDaysSettings) {

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
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

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

    // Import/Export functionality
    importExportBtn.addEventListener('click', () => {
        importExportModal.style.display = 'block';
    });

    exportBtn.addEventListener('click', exportNotes);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importNotes);
}
