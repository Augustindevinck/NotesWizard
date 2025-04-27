
// Event handling module
export function setupEventListeners(dependencies) {
    const {
        searchInput,
        searchResults,
        addNoteBtn,
        noteModal,
        saveNoteBtn,
        deleteNoteBtn,
        categoryInput,
        importExportBtn,
        importExportModal,
        exportBtn,
        importBtn,
        importFile,
        modalCloseButtons,
        editDaysBtns,
        daysEditModal,
        daysInput,
        saveDaysBtn,
        showMoreBtnToday,
        showMoreBtn1,
        showMoreBtn2
    } = dependencies;

    // Add note button
    addNoteBtn.addEventListener('click', () => dependencies.openNoteModal());

    // Save note button
    saveNoteBtn.addEventListener('click', dependencies.saveNote);

    // Delete note button
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', () => {
            if (dependencies.currentNoteId && confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
                dependencies.deleteNote(dependencies.currentNoteId);
                dependencies.cleanupHighlightedElements();
                noteModal.style.display = 'none';
            }
        });
    }

    // Category input events
    categoryInput.addEventListener('input', dependencies.handleCategoryInput);
    categoryInput.addEventListener('keydown', dependencies.handleCategoryKeydown);

    // Search events
    searchInput.addEventListener('input', dependencies.showSearchSuggestions);
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            dependencies.handleSearch();
        }
    });

    // Modal close events
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            dependencies.cleanupHighlightedElements();
            noteModal.style.display = 'none';
            importExportModal.style.display = 'none';
            daysEditModal.style.display = 'none';
        });
    });

    // Import/Export events
    importExportBtn.addEventListener('click', () => importExportModal.style.display = 'block');
    exportBtn.addEventListener('click', dependencies.exportNotes);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', dependencies.importNotes);

    // Revisit section events
    editDaysBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const section = `section${index + 1}`;
            dependencies.openDaysEditModal(section);
        });
    });

    // Show more buttons
    if (showMoreBtnToday) showMoreBtnToday.addEventListener('click', () => dependencies.showMoreNotes('today'));
    if (showMoreBtn1) showMoreBtn1.addEventListener('click', () => dependencies.showMoreNotes('section1'));
    if (showMoreBtn2) showMoreBtn2.addEventListener('click', () => dependencies.showMoreNotes('section2'));

    // Days settings
    if (saveDaysBtn) saveDaysBtn.addEventListener('click', dependencies.saveDaysSettings);
}
