/**
 * Fonctions utilitaires pour les migrations de base de données
 */

import { getClient } from './supabaseClient.js';

/**
 * Vérifie si une colonne existe dans une table
 * 
 * @param {string} tableName - Nom de la table
 * @param {string} columnName - Nom de la colonne à vérifier
 * @returns {Promise<boolean>} - True si la colonne existe, false sinon
 */
export async function columnExists(tableName, columnName) {
    const supabase = getClient();
    
    if (!supabase) {
        console.warn('Client Supabase non disponible pour vérifier la colonne');
        return false;
    }
    
    try {
        // Cette requête RPC vérifie l'existence d'une colonne en interrogeant les métadonnées PostgreSQL
        const { data, error } = await supabase.rpc('check_column_exists', { 
            p_table_name: tableName,
            p_column_name: columnName
        });
        
        if (error) {
            console.error(`Erreur lors de la vérification de la colonne ${columnName}:`, error);
            
            // Si la fonction RPC n'existe pas, essayons une autre approche
            if (error.message && error.message.includes('does not exist')) {
                console.log('Fonction RPC check_column_exists non disponible. Création de la fonction...');
                await createCheckColumnFunction();
                
                // Réessayer après avoir créé la fonction
                const retryResult = await supabase.rpc('check_column_exists', { 
                    p_table_name: tableName,
                    p_column_name: columnName
                });
                
                if (retryResult.error) {
                    console.error('Échec de la vérification de colonne même après création de la fonction RPC:', retryResult.error);
                    return false;
                }
                
                return retryResult.data === true;
            }
            
            return false;
        }
        
        return data === true;
    } catch (error) {
        console.error(`Exception lors de la vérification de la colonne ${columnName}:`, error);
        return false;
    }
}

/**
 * Ajoute une colonne à une table si elle n'existe pas déjà
 * 
 * @param {string} tableName - Nom de la table
 * @param {string} columnName - Nom de la colonne à ajouter
 * @param {string} columnType - Type de la colonne (ex: 'text', 'integer', 'timestamp with time zone')
 * @param {boolean} isNullable - Si la colonne peut être NULL
 * @returns {Promise<boolean>} - True si l'opération a réussi, false sinon
 */
export async function addColumnIfNotExists(tableName, columnName, columnType, isNullable = true) {
    const supabase = getClient();
    
    if (!supabase) {
        console.warn('Client Supabase non disponible pour ajouter la colonne');
        return false;
    }
    
    try {
        // Vérifier si la colonne existe déjà
        const exists = await columnExists(tableName, columnName);
        
        if (exists) {
            console.log(`La colonne ${columnName} existe déjà dans la table ${tableName}`);
            return true;
        }
        
        // Si la colonne n'existe pas, l'ajouter via une fonction RPC
        console.log(`Ajout de la colonne ${columnName} à la table ${tableName}...`);
        
        const { data, error } = await supabase.rpc('add_column_if_not_exists', {
            p_table_name: tableName,
            p_column_name: columnName,
            p_column_type: columnType,
            p_is_nullable: isNullable
        });
        
        if (error) {
            console.error(`Erreur lors de l'ajout de la colonne ${columnName}:`, error);
            
            // Si la fonction RPC n'existe pas, essayons de la créer
            if (error.message && error.message.includes('does not exist')) {
                console.log('Fonction RPC add_column_if_not_exists non disponible. Création de la fonction...');
                await createAddColumnFunction();
                
                // Réessayer après avoir créé la fonction
                const retryResult = await supabase.rpc('add_column_if_not_exists', {
                    p_table_name: tableName,
                    p_column_name: columnName,
                    p_column_type: columnType,
                    p_is_nullable: isNullable
                });
                
                if (retryResult.error) {
                    console.error('Échec de l\'ajout de colonne même après création de la fonction RPC:', retryResult.error);
                    
                    // Dernière tentative: exécuter directement l'instruction SQL via une requête brute
                    console.log('Tentative d\'ajout de colonne via requête SQL directe...');
                    const nullableStr = isNullable ? '' : 'NOT NULL';
                    const sqlQuery = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" ${columnType} ${nullableStr};`;
                    
                    try {
                        // Utiliser une fonction SQL pour ajouter la colonne de manière sûre
                        const { error: sqlError } = await supabase.rpc('execute_sql', { sql_query: sqlQuery });
                        
                        if (sqlError) {
                            console.error('Échec de l\'ajout de colonne via SQL direct:', sqlError);
                            return false;
                        }
                        
                        console.log(`Colonne ${columnName} ajoutée avec succès via SQL direct`);
                        return true;
                    } catch (sqlError) {
                        console.error('Exception lors de l\'ajout de colonne via SQL direct:', sqlError);
                        return false;
                    }
                }
                
                console.log(`Colonne ${columnName} ajoutée avec succès`);
                return true;
            }
            
            return false;
        }
        
        console.log(`Colonne ${columnName} ajoutée avec succès`);
        return true;
    } catch (error) {
        console.error(`Exception lors de l'ajout de la colonne ${columnName}:`, error);
        return false;
    }
}

/**
 * Crée la fonction RPC pour vérifier si une colonne existe
 * @private
 */
async function createCheckColumnFunction() {
    const supabase = getClient();
    
    if (!supabase) {
        console.warn('Client Supabase non disponible pour créer la fonction');
        return false;
    }
    
    try {
        const functionSQL = `
            CREATE OR REPLACE FUNCTION check_column_exists(p_table_name text, p_column_name text)
            RETURNS boolean
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
                column_exists boolean;
            BEGIN
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = p_table_name
                    AND column_name = p_column_name
                ) INTO column_exists;
                
                RETURN column_exists;
            END;
            $$;
        `;
        
        const { error } = await supabase.rpc('execute_sql', { sql_query: functionSQL });
        
        if (error) {
            console.error('Erreur lors de la création de la fonction check_column_exists:', error);
            return false;
        }
        
        console.log('Fonction check_column_exists créée avec succès');
        return true;
    } catch (error) {
        console.error('Exception lors de la création de la fonction check_column_exists:', error);
        return false;
    }
}

/**
 * Crée la fonction RPC pour ajouter une colonne si elle n'existe pas
 * @private
 */
async function createAddColumnFunction() {
    const supabase = getClient();
    
    if (!supabase) {
        console.warn('Client Supabase non disponible pour créer la fonction');
        return false;
    }
    
    try {
        const functionSQL = `
            CREATE OR REPLACE FUNCTION add_column_if_not_exists(
                p_table_name text,
                p_column_name text,
                p_column_type text,
                p_is_nullable boolean DEFAULT true
            )
            RETURNS boolean
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            DECLARE
                column_exists boolean;
                nullable_text text;
            BEGIN
                -- Vérifier si la colonne existe déjà
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = p_table_name
                    AND column_name = p_column_name
                ) INTO column_exists;
                
                -- Si la colonne n'existe pas, l'ajouter
                IF NOT column_exists THEN
                    nullable_text := CASE WHEN p_is_nullable THEN '' ELSE 'NOT NULL' END;
                    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s %s',
                                   p_table_name, p_column_name, p_column_type, nullable_text);
                    RETURN true;
                ELSE
                    -- La colonne existe déjà
                    RETURN false;
                END IF;
            END;
            $$;
        `;
        
        const { error } = await supabase.rpc('execute_sql', { sql_query: functionSQL });
        
        if (error) {
            console.error('Erreur lors de la création de la fonction add_column_if_not_exists:', error);
            return false;
        }
        
        console.log('Fonction add_column_if_not_exists créée avec succès');
        return true;
    } catch (error) {
        console.error('Exception lors de la création de la fonction add_column_if_not_exists:', error);
        return false;
    }
}

/**
 * Crée une fonction RPC pour exécuter du SQL arbitraire (à utiliser avec précaution)
 * @private
 */
export async function createExecuteSqlFunction() {
    const supabase = getClient();
    
    if (!supabase) {
        console.warn('Client Supabase non disponible pour créer la fonction execute_sql');
        return false;
    }
    
    try {
        const functionSQL = `
            CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                EXECUTE sql_query;
            END;
            $$;
        `;
        
        // Exécuter la requête SQL directement via l'API RESTful de PostgreSQL
        const { error } = await supabase.rpc('execute_sql', { sql_query: functionSQL });
        
        if (error) {
            // Si la fonction execute_sql n'existe pas encore, nous ne pouvons pas l'utiliser pour se créer elle-même
            console.error('Erreur lors de la création de la fonction execute_sql:', error);
            
            if (error.message && error.message.includes('does not exist')) {
                console.log('La fonction execute_sql doit être créée manuellement dans la console Supabase.');
                
                // Afficher les instructions pour créer la fonction manuellement
                console.log(`
                    Pour créer la fonction execute_sql, exécutez manuellement le SQL suivant dans la console SQL de Supabase:
                    
                    CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
                    RETURNS void
                    LANGUAGE plpgsql
                    SECURITY DEFINER
                    AS $$
                    BEGIN
                        EXECUTE sql_query;
                    END;
                    $$;
                `);
            }
            
            return false;
        }
        
        console.log('Fonction execute_sql créée avec succès');
        return true;
    } catch (error) {
        console.error('Exception lors de la création de la fonction execute_sql:', error);
        return false;
    }
}

/**
 * Ajoute la colonne lastReviewedViaButton à la table notes
 * C'est la fonction principale à appeler pour préparer la base de données pour la fonctionnalité de révision
 */
export async function addLastReviewedViaButtonColumn() {
    console.log('Vérification et ajout de la colonne lastReviewedViaButton à la table notes...');
    
    // D'abord, s'assurer que la fonction execute_sql existe
    await createExecuteSqlFunction();
    
    // Ensuite, ajouter la colonne lastReviewedViaButton si elle n'existe pas
    const result = await addColumnIfNotExists(
        'notes',
        'lastReviewedViaButton',
        'timestamp with time zone',
        true // nullable
    );
    
    if (result) {
        console.log('Colonne lastReviewedViaButton disponible et prête à être utilisée');
    } else {
        console.error('Impossible d\'ajouter la colonne lastReviewedViaButton, vérifiez les droits d\'accès à Supabase');
    }
    
    return result;
}