import { createNoteElement } from './notes.js';

function openNoteModal(note, date) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${note.title || 'Sans titre'}</h2>
                <span class="close">&times;</span>
            </div>
            <div class="note-content">${note.content}</div>
            <div class="modal-footer">
                <button class="confirm-button">Marquer comme lu</button>
            </div>
        </div>
    `;

    const confirmBtn = modal.querySelector('.confirm-button');
    confirmBtn.addEventListener('click', () => {
        confirmRevisitNote(note.id, date);
        const noteElement = document.querySelector(`[data-id="${note.id}"]`);
        if (noteElement) {
            noteElement.remove();
            const container = noteElement.parentElement;
            if (container && container.children.length === 0) {
                container.innerHTML = '<div class="empty-revisit">Aucune note pour cette période</div>';
            }
        }
        modal.remove();
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => modal.remove());

    document.body.appendChild(modal);
}

function confirmRevisitNote(noteId, date) {
    const REVISIT_CONFIRMATIONS_KEY = 'revisitConfirmations';
    const confirmations = JSON.parse(localStorage.getItem(REVISIT_CONFIRMATIONS_KEY) || '{}');
    const dateKey = new Date(date).toDateString();

    if (!confirmations[dateKey]) {
        confirmations[dateKey] = [];
    }
    confirmations[dateKey].push(noteId);
    localStorage.setItem(REVISIT_CONFIRMATIONS_KEY, JSON.stringify(confirmations));
}

function isNoteConfirmedForDate(noteId, date) {
    const REVISIT_CONFIRMATIONS_KEY = 'revisitConfirmations';
    const confirmations = JSON.parse(localStorage.getItem(REVISIT_CONFIRMATIONS_KEY) || '{}');
    const dateKey = new Date(date).toDateString();
    return confirmations[dateKey]?.includes(noteId) || false;
}

function createRevisitNoteElement(note, date) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'revisit-note';
    noteDiv.dataset.id = note.id;
    noteDiv.textContent = note.title || note.content.substring(0, 40) + '...';

    noteDiv.addEventListener('click', () => {
        openNoteModal(note, date);
    });

    return noteDiv;
}

export function renderRevisitSections(notes, containers, settings) {
    const { revisitNotesToday, revisitNotes1, revisitNotes2 } = containers;

    const now = new Date();
    const today = new Date(now);

    const date1 = new Date(now);
    date1.setDate(date1.getDate() - settings.section1);

    const date2 = new Date(now);
    date2.setDate(date2.getDate() - settings.section2);

    const notesForToday = getNotesForDate(notes, today);
    const notesForSection1 = getNotesForDate(notes, date1);
    const notesForSection2 = getNotesForDate(notes, date2);

    renderRevisitNotesForSection(notesForToday, revisitNotesToday, today);
    renderRevisitNotesForSection(notesForSection1, revisitNotes1, date1);
    renderRevisitNotesForSection(notesForSection2, revisitNotes2, date2);
}

function getNotesForDate(notes, targetDate) {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    return notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        return noteDate.getFullYear() === targetYear && 
               noteDate.getMonth() === targetMonth && 
               noteDate.getDate() === targetDay &&
               !isNoteConfirmedForDate(note.id, targetDate);
    });
}

function renderRevisitNotesForSection(notesToRender, container, date) {
    if (!container) return;

    container.innerHTML = '';

    if (notesToRender.length === 0) {
        container.innerHTML = '<div class="empty-revisit">Aucune note pour cette période</div>';
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = createRevisitNoteElement(note, date);
        container.appendChild(noteElement);
    });
}