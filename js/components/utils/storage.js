
// Fonctions de gestion du stockage
export function loadNotes() {
    const storedNotes = localStorage.getItem('notes');
    return storedNotes ? JSON.parse(storedNotes) : [];
}

export function saveNotes(notes) {
    localStorage.setItem('notes', JSON.stringify(notes));
}

export function loadRevisitSettings() {
    const storedSettings = localStorage.getItem('revisitDays');
    return storedSettings ? JSON.parse(storedSettings) : {
        section1: 7,
        section2: 14
    };
}

export function saveRevisitSettings(settings) {
    localStorage.setItem('revisitDays', JSON.stringify(settings));
}
