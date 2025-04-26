
export function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    
    return matrix[b.length][a.length];
}

export function performSearch(query, notes) {
    const searchTerms = query.toLowerCase().split(/\s+/);
    const results = [];
    
    notes.forEach(note => {
        let score = 0;
        const noteText = (note.title + ' ' + note.content).toLowerCase();
        
        searchTerms.forEach(term => {
            if (noteText.includes(term)) {
                score += 2;
            } else {
                const distance = levenshteinDistance(term, noteText);
                if (distance < 3) {
                    score += 1;
                }
            }
        });
        
        if (score > 0) {
            results.push({ note, score });
        }
    });
    
    return results.sort((a, b) => b.score - a.score);
}
