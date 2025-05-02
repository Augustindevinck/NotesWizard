/**
 * Utilitaire pour nettoyer la base de données et résoudre les problèmes de synchronisation
 */

import * as supabaseStorage from './supabaseStorage.js';
import * as localStorage from './localStorage.js';
import { getClient } from './supabaseClient.js';
import { isSupabaseConfigured } from './supabaseDirectConfig.js';

/**
 * Nettoie entièrement la base de données Supabase et le stockage local
 * @param {boolean} preserveLocal - Si true, préserve les notes locales et les synchronise vers Supabase
 * @returns {Promise<boolean>} True si le nettoyage a réussi
 */
export async function cleanDatabase(preserveLocal = false) {
    console.log('=== DÉBUT DU NETTOYAGE DE LA BASE DE DONNÉES ===');
    
    try {
        if (!isSupabaseConfigured()) {
            console.error('Supabase n\'est pas configuré - Nettoyage impossible');
            return false;
        }
        
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible - Nettoyage impossible');
            return false;
        }
        
        // 1. Sauvegarde des notes locales si nécessaire
        let localNotes = [];
        if (preserveLocal) {
            console.log('Sauvegarde des notes locales avant nettoyage...');
            localNotes = localStorage.getAllNotes();
            console.log(`${localNotes.length} notes locales sauvegardées.`);
        }
        
        // 2. Supprimer toutes les notes de Supabase
        console.log('Suppression de toutes les notes dans Supabase...');
        const { error: deleteError } = await client
            .from('notes')
            .delete()
            .neq('id', 'placeholder'); // Supprime toutes les notes
            
        if (deleteError) {
            console.error('Erreur lors de la suppression des notes dans Supabase:', deleteError);
            return false;
        }
        
        console.log('Toutes les notes ont été supprimées de Supabase avec succès.');
        
        // 3. Vider le stockage local
        console.log('Nettoyage du stockage local...');
        localStorage.saveAllNotes([]);
        console.log('Stockage local vidé avec succès.');
        
        // 4. Si préservation des notes locales, les recréer dans Supabase
        if (preserveLocal && localNotes.length > 0) {
            console.log(`Restauration des ${localNotes.length} notes locales dans Supabase...`);
            
            const createPromises = [];
            for (const note of localNotes) {
                createPromises.push(supabaseStorage.createNote(note));
            }
            
            await Promise.all(createPromises);
            console.log('Notes locales restaurées dans Supabase avec succès.');
            
            // Récupérer les notes depuis Supabase pour mettre à jour le stockage local
            const finalNotes = await supabaseStorage.getAllNotes();
            localStorage.saveAllNotes(finalNotes);
            console.log(`Stockage local mis à jour avec ${finalNotes.length} notes.`);
        }
        
        console.log('=== NETTOYAGE DE LA BASE DE DONNÉES TERMINÉ AVEC SUCCÈS ===');
        return true;
    } catch (error) {
        console.error('Erreur lors du nettoyage de la base de données:', error);
        return false;
    }
}

/**
 * Supprime une note spécifique en s'assurant qu'elle est complètement supprimée
 * @param {string} noteId - ID de la note à supprimer définitivement
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteNotePermanently(noteId) {
    console.log(`=== DÉBUT DE LA SUPPRESSION DÉFINITIVE DE LA NOTE ${noteId} ===`);
    
    try {
        if (!isSupabaseConfigured()) {
            console.error('Supabase n\'est pas configuré - Suppression impossible');
            return false;
        }
        
        const client = getClient();
        if (!client) {
            console.error('Client Supabase non disponible - Suppression impossible');
            return false;
        }
        
        // 1. Vérifier si la note existe dans Supabase
        console.log('Vérification de l\'existence de la note dans Supabase...');
        const { data, error } = await client
            .from('notes')
            .select('id')
            .eq('id', noteId);
            
        if (error) {
            console.error('Erreur lors de la vérification de la note:', error);
            return false;
        }
        
        // 2. Si elle existe, la supprimer
        if (data && data.length > 0) {
            console.log(`La note ${noteId} existe dans Supabase, suppression...`);
            
            const { error: deleteError } = await client
                .from('notes')
                .delete()
                .eq('id', noteId);
                
            if (deleteError) {
                console.error('Erreur lors de la suppression de la note dans Supabase:', deleteError);
                return false;
            }
            
            console.log(`La note ${noteId} a été supprimée de Supabase avec succès.`);
        } else {
            console.log(`La note ${noteId} n'existe pas dans Supabase.`);
        }
        
        // 3. Supprimer la note du stockage local
        console.log('Suppression de la note du stockage local...');
        const localNotes = localStorage.getAllNotes();
        const updatedNotes = localNotes.filter(note => note.id !== noteId);
        localStorage.saveAllNotes(updatedNotes);
        
        const deletedCount = localNotes.length - updatedNotes.length;
        if (deletedCount > 0) {
            console.log(`La note ${noteId} a été supprimée du stockage local (${deletedCount} occurrence(s)).`);
        } else {
            console.log(`La note ${noteId} n'existait pas dans le stockage local.`);
        }
        
        // 4. Vérifier que la suppression a été effectuée
        console.log('Vérification finale de la suppression...');
        
        // 4.1 Vérifier dans Supabase
        const { data: checkData } = await client
            .from('notes')
            .select('id')
            .eq('id', noteId);
            
        if (checkData && checkData.length > 0) {
            console.error(`Échec critique: La note ${noteId} existe toujours dans Supabase après suppression!`);
            return false;
        }
        
        // 4.2 Vérifier dans le stockage local
        const checkLocalNotes = localStorage.getAllNotes();
        const noteStillExists = checkLocalNotes.some(note => note.id === noteId);
        
        if (noteStillExists) {
            console.error(`Échec critique: La note ${noteId} existe toujours dans le stockage local après suppression!`);
            return false;
        }
        
        console.log(`=== SUPPRESSION DÉFINITIVE DE LA NOTE ${noteId} TERMINÉE AVEC SUCCÈS ===`);
        return true;
    } catch (error) {
        console.error(`Erreur lors de la suppression définitive de la note ${noteId}:`, error);
        return false;
    }
}

/**
 * Réinitialise la synchronisation en définissant Supabase comme source de vérité
 * @returns {Promise<boolean>} True si la réinitialisation a réussi
 */
export async function resetSynchronization() {
    console.log('=== DÉBUT DE LA RÉINITIALISATION DE LA SYNCHRONISATION ===');
    
    try {
        if (!isSupabaseConfigured()) {
            console.error('Supabase n\'est pas configuré - Réinitialisation impossible');
            return false;
        }
        
        // 1. Obtenir toutes les notes de Supabase
        console.log('Récupération des notes depuis Supabase...');
        const supabaseNotes = await supabaseStorage.getAllNotes();
        console.log(`${supabaseNotes.length} notes récupérées depuis Supabase.`);
        
        // 2. Remplacer complètement le stockage local
        console.log('Remplacement du stockage local par les données de Supabase...');
        localStorage.saveAllNotes(supabaseNotes);
        console.log(`Stockage local mis à jour avec ${supabaseNotes.length} notes.`);
        
        console.log('=== RÉINITIALISATION DE LA SYNCHRONISATION TERMINÉE AVEC SUCCÈS ===');
        return true;
    } catch (error) {
        console.error('Erreur lors de la réinitialisation de la synchronisation:', error);
        return false;
    }
}