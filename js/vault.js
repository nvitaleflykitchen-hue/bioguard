// IndexedDB Vault for PDF evidence
let db;
function initVault() {
    const request = indexedDB.open('BioGuardVault', 1);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('evidence')) {
            db.createObjectStore('evidence', { keyPath: 'id' });
        }
    };
    request.onsuccess = (e) => { db = e.target.result; };
}

async function storeEvidence(file) {
    if (!db) return null;
    const id = 'vlt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['evidence'], 'readwrite');
        const store = transaction.objectStore('evidence');
        store.put({ id: id, name: file.name, blob: file, type: file.type });
        transaction.oncomplete = () => resolve(id);
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getEvidence(id) {
    if (!db || !id) return null;
    return new Promise((resolve) => {
        const transaction = db.transaction(['evidence'], 'readonly');
        const store = transaction.objectStore('evidence');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

window.downloadEvidence = async function(id) {
    const data = await getEvidence(id);
    if (!data) {
        showToast("Evidencia no encontrada en la bóveda local.", "error");
        return;
    }
    const url = URL.createObjectURL(data.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
};