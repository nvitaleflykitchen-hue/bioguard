// Data Management
function getStorageKey() {
    return isDemoMode ? STORAGE_KEY_DEMO : `bioguard_results_real_${activeEstId}`;
}

function getResults() {
    const key = getStorageKey();
    const results = localStorage.getItem(key);
    
    // Migration logic for old data (assuming they belong to default FlyKitchen)
    if (!results && !isDemoMode && activeEstId === 'default') {
        const oldResultsReal = localStorage.getItem(STORAGE_KEY_REAL);
        if (oldResultsReal) {
            localStorage.setItem(key, oldResultsReal);
            localStorage.removeItem(STORAGE_KEY_REAL); // Cleanup old key
            return JSON.parse(oldResultsReal);
        }
    }
    
    return results ? JSON.parse(results) : [];
}

function saveResult(data) {
    if (isDemoMode) {
        showToast("Estás en MODO SIMULACIÓN. Los registros no se guardan en la base real.", "warning");
    }
    const key = getStorageKey();
    const results = getResults();
    results.unshift(data);
    localStorage.setItem(key, JSON.stringify(results));
    requestSyncToSupabase();
}

function getInitialData() {
    // La base de datos original ahora inicia totalmente en 0, sin datos falsos.
    return [];
}
