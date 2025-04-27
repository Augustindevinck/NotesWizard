/**
 * Gestion des sections de révision
 */

import { formatDate } from '../utils/domHelpers.js';
import { saveRevisitSettings } from '../utils/localStorage.js';

// Fonction pour créer un élément de note (sera injectée)
let createNoteElementFn = null;

// Paramètres de révision par défaut
let revisitSettings = {
    section1: 7,
    section2: 14
};

// Éléments DOM pour les sections de révision
let revisitContainers = {};
let showMoreBtns = {};

/**
 * Initialise la fonction de création d'élément de note
 * @param {Function} createNoteElement - Fonction pour créer un élément de note
 */
export function initCreateNoteElement(createNoteElement) {
    createNoteElementFn = createNoteElement;
}

/**
 * Initialise les éléments pour les sections de révision
 * @param {Object} elements - Les éléments DOM pour les sections de révision
 * @param {Object} settings - Les paramètres de révision
 */
export function initRevisit(elements, settings) {
    revisitContainers = elements.containers;
    showMoreBtns = elements.showMoreBtns;
    
    if (settings) {
        revisitSettings = settings;
    }
}

/**
 * Affiche les sections de révision avec les notes correspondantes
 * @param {Array} notes - Le tableau des notes
 */
export function renderRevisitSections(notes) {
    if (!revisitContainers || !notes) {
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Section "Aujourd'hui"
    const todayNotes = getNotesForDate(notes, today);
    renderRevisitNotesForSection(todayNotes, revisitContainers.today, showMoreBtns.today, 'today');

    // Section 1 (par défaut 7 jours)
    const section1Date = new Date(today);
    section1Date.setDate(today.getDate() - revisitSettings.section1);
    const section1Notes = getNotesForDate(notes, section1Date);
    renderRevisitNotesForSection(section1Notes, revisitContainers.section1, showMoreBtns.section1, 'section1');

    // Section 2 (par défaut 14 jours)
    const section2Date = new Date(today);
    section2Date.setDate(today.getDate() - revisitSettings.section2);
    const section2Notes = getNotesForDate(notes, section2Date);
    renderRevisitNotesForSection(section2Notes, revisitContainers.section2, showMoreBtns.section2, 'section2');

    // Mettre à jour les titres des sections
    updateRevisitTitles();
}

/**
 * Met à jour les titres des sections de révision
 */
function updateRevisitTitles() {
    const section1Title = document.querySelector('#revisit-section-1 .revisit-title');
    const section2Title = document.querySelector('#revisit-section-2 .revisit-title');

    if (section1Title) {
        section1Title.textContent = `Il y a ${revisitSettings.section1} jours`;
    }
    
    if (section2Title) {
        section2Title.textContent = `Il y a ${revisitSettings.section2} jours`;
    }
}

/**
 * Récupère les notes créées à une date spécifique
 * @param {Array} notes - Le tableau des notes
 * @param {Date} targetDate - La date cible
 * @returns {Array} - Les notes créées à la date cible
 */
function getNotesForDate(notes, targetDate) {
    return notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        noteDate.setHours(0, 0, 0, 0);
        return noteDate.getTime() === targetDate.getTime();
    });
}

/**
 * Affiche les notes pour une section de révision
 * @param {Array} notesToRender - Notes à afficher
 * @param {HTMLElement} container - Conteneur où afficher les notes
 * @param {HTMLElement} showMoreBtn - Bouton "Voir plus"
 * @param {string} sectionId - Identifiant de la section
 */
function renderRevisitNotesForSection(notesToRender, container, showMoreBtn, sectionId) {
    if (!container) return;

    container.innerHTML = '';
    
    // Stocker tous les IDs de notes pour le bouton "Voir plus"
    const allNoteIds = notesToRender.map(note => note.id);
    container.dataset.allNotes = JSON.stringify(allNoteIds);
    
    if (notesToRender.length === 0) {
        container.innerHTML = '';
        if (showMoreBtn) {
            showMoreBtn.style.display = 'none';
        }
        return;
    }
    
    // Afficher les 3 premières notes
    const visibleNotes = notesToRender.slice(0, 3);
    
    visibleNotes.forEach(note => {
        const noteElement = createRevisitNoteElement(note);
        container.appendChild(noteElement);
    });
    
    // Afficher ou masquer le bouton "Voir plus"
    if (showMoreBtn) {
        showMoreBtn.style.display = notesToRender.length > 3 ? 'block' : 'none';
    }
}

/**
 * Crée un élément DOM pour une note dans les sections de révision
 * @param {Object} note - La note à afficher
 * @returns {HTMLElement} - L'élément DOM de la note
 */
function createRevisitNoteElement(note) {
    // Afficher une erreur si la fonction createNoteElement n'est pas injectée
    if (!createNoteElementFn) {
        console.error('createNoteElement n\'est pas initialisé dans revisit.js');
        const div = document.createElement('div');
        div.className = 'revisit-note error-note';
        div.textContent = 'Erreur de chargement de la note';
        return div;
    }
    
    // On réutilise la fonction createNoteElement mais avec une classe spécifique
    const noteElement = createNoteElementFn(note, []);
    noteElement.classList.add('revisit-note');
    return noteElement;
}

/**
 * Affiche plus de notes dans une section
 * @param {string} sectionId - Identifiant de la section
 * @param {Array} notesToShow - Notes à afficher
 */
export function showMoreNotes(sectionId, notesToShow) {
    const container = revisitContainers[sectionId];
    const showMoreBtn = showMoreBtns[sectionId];
    
    if (!container || !showMoreBtn) return;
    
    // Afficher toutes les notes
    container.innerHTML = '';
    notesToShow.forEach(note => {
        const noteElement = createRevisitNoteElement(note);
        container.appendChild(noteElement);
    });
    
    // Masquer le bouton après avoir affiché toutes les notes
    showMoreBtn.style.display = 'none';
}

/**
 * Ouvre le modal d'édition du nombre de jours
 * @param {string} sectionId - Identifiant de la section à modifier
 */
export function openDaysEditModal(sectionId) {
    const daysEditModal = document.getElementById('days-edit-modal');
    const daysInput = document.getElementById('days-input');
    
    if (!daysEditModal || !daysInput) return;
    
    // Définir la valeur actuelle
    daysInput.value = revisitSettings[sectionId] || 7;
    
    // Stocker l'ID de section en cours d'édition
    daysEditModal.dataset.editingSection = sectionId;
    
    // Afficher le modal
    daysEditModal.style.display = 'block';
}

/**
 * Sauvegarde les paramètres de révision
 * @param {Array} notes - Le tableau des notes pour mettre à jour les sections
 */
export function saveDaysSettings(notes) {
    const daysEditModal = document.getElementById('days-edit-modal');
    const daysInput = document.getElementById('days-input');
    
    if (!daysEditModal || !daysInput) return;
    
    const sectionId = daysEditModal.dataset.editingSection;
    const newDaysValue = parseInt(daysInput.value);
    
    if (!sectionId || isNaN(newDaysValue) || newDaysValue < 1) {
        alert('Valeur invalide');
        return;
    }
    
    // Mettre à jour le paramètre
    revisitSettings[sectionId] = newDaysValue;
    
    // Sauvegarder dans localStorage
    saveRevisitSettings(revisitSettings);
    
    // Mettre à jour les sections
    renderRevisitSections(notes);
    
    // Fermer le modal
    daysEditModal.style.display = 'none';
}