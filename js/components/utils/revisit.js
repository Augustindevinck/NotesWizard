
import { createNoteElement } from './notes.js';

const REVISIT_CONFIRMATIONS_KEY = 'revisitConfirmations';

function getRevisitConfirmations() {
    const stored = localStorage.getItem(REVISIT_CONFIRMATIONS_KEY);
    return stored ? JSON.parse(stored) : {};
}

function confirmRevisitNote(noteId, date) {
    const confirmations = getRevisitConfirmations();
    const dateKey = new Date(date).toDateString();
    if (!confirmations[dateKey]) {
        confirmations[dateKey] = [];
    }
    confirmations[dateKey].push(noteId);
    localStorage.setItem(REVISIT_CONFIRMATIONS_KEY, JSON.stringify(confirmations));
}

function isNoteConfirmedForDate(noteId, date) {
    const confirmations = getRevisitConfirmations();
    const dateKey = new Date(date).toDateString();
    return confirmations[dateKey]?.includes(noteId) || false;
}

function createRevisitNoteElement(note, date) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'revisit-note';
    noteDiv.dataset.id = note.id;
    noteDiv.textContent = note.title || note.content.substring(0, 40) + '...';

    const confirmButton = document.createElement('button');
    confirmButton.className = 'confirm-revisit-btn';
    confirmButton.textContent = '✓';
    confirmButton.title = 'Marquer comme lu';
    confirmButton.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmRevisitNote(note.id, date);
        noteDiv.remove();
        if (noteDiv.parentElement && noteDiv.parentElement.children.length === 0) {
            noteDiv.parentElement.innerHTML = '<div class="empty-revisit">Aucune note pour cette période</div>';
        }
    });

    noteDiv.appendChild(confirmButton);

    noteDiv.addEventListener('click', () => {
        openNoteModal(note, date);
    });

    return noteDiv;
}

export function renderRevisitSections(notes, containers, settings, showMoreBtns) {
    const { revisitNotesToday, revisitNotes1, revisitNotes2 } = containers;
    const { showMoreBtnToday, showMoreBtn1, showMoreBtn2 } = showMoreBtns;

    const now = new Date();
    const today = new Date(now);

    const date1 = new Date(now);
    date1.setDate(date1.getDate() - settings.section1);

    const date2 = new Date(now);
    date2.setDate(date2.getDate() - settings.section2);

    const notesForToday = getNotesForDate(notes, today);
    const notesForSection1 = getNotesForDate(notes, date1);
    const notesForSection2 = getNotesForDate(notes, date2);

    renderRevisitNotesForSection(notesForToday, revisitNotesToday, showMoreBtnToday, 'today');
    renderRevisitNotesForSection(notesForSection1, revisitNotes1, showMoreBtn1, 'section1');
    renderRevisitNotesForSection(notesForSection2, revisitNotes2, showMoreBtn2, 'section2');
}

function getNotesForDate(notes, targetDate) {
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
    if (!container) return;

    container.innerHTML = '';

    if (notesToRender.length === 0) {
        container.innerHTML = '<div class="empty-revisit">Aucune note pour cette période</div>';
        if (showMoreBtn) {
            showMoreBtn.style.display = 'none';
        }
        return;
    }

    const initialCount = Math.min(3, notesToRender.length);
    const hasMore = notesToRender.length > initialCount;

    notesToRender.slice(0, initialCount).forEach(note => {
        const noteElement = createRevisitNoteElement(note, sectionId);
        container.appendChild(noteElement);
    });

    if (showMoreBtn) {
        showMoreBtn.style.display = hasMore ? 'block' : 'none';
    }

    container.dataset.allNotes = JSON.stringify(notesToRender.map(note => note.id));
    container.dataset.expandedView = 'false';
}

function openNoteModal(note, date) {
    console.log("Note opened:", note, "Date:", date);
    // Add your modal opening logic here.
}
