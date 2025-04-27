/**
 * Utilitaires pour la recherche
 */

/**
 * Calcule la distance de Levenshtein entre deux chaînes de caractères
 * @param {string} a - Première chaîne
 * @param {string} b - Deuxième chaîne
 * @returns {number} - Distance de Levenshtein
 */
export function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Matrice pour stocker les distances
    const matrix = [];

    // Initialisation de la matrice
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Calcul de la distance
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // suppression
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}