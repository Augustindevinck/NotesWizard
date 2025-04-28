/**
 * Client Supabase pour l'interaction avec la base de données
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuration du client Supabase
// Remarque: Ces valeurs seront configurées dans l'URL
let supabaseUrl = '';
let supabaseKey = '';

// Fonction pour initialiser le client avec les informations de connexion
export function initSupabase(url, key) {
    supabaseUrl = url;
    supabaseKey = key;
}

// Création du client Supabase (sera initialisé plus tard)
let supabaseClient = null;

// Obtenir le client Supabase (création paresseuse)
export function getSupabaseClient() {
    if (!supabaseClient && supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
    return supabaseClient;
}

// Vérifier si le client est initialisé
export function isSupabaseInitialized() {
    return !!supabaseClient;
}