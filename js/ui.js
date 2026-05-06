// =============================================
// CUSTOM UI SYSTEM (Toasts & Modals)
// =============================================
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle-2';
    if (type === 'error') icon = 'alert-octagon';
    if (type === 'warning') icon = 'alert-triangle';

    toast.innerHTML = `
        <div class="toast-icon"><i data-lucide="${icon}"></i></div>
        <div class="toast-content">${message}</div>
    `;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons({root: toast});
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

window.showCustomModal = function(options) {
    const { title = 'Confirmar', message = '', type = 'info', isPrompt = false, confirmText = 'Aceptar', cancelText = 'Cancelar', onConfirm } = options;
    const overlay = document.getElementById('custom-modal-overlay');
    if (!overlay) return;
    
    document.getElementById('custom-modal-title').innerHTML = `
        <i data-lucide="${type === 'error' ? 'alert-octagon' : type === 'warning' ? 'alert-triangle' : 'info'}" style="color:var(--${type === 'info' ? 'accent' : type})"></i>
        <span>${title}</span>
    `;
    document.getElementById('custom-modal-message').innerHTML = message;
    
    const inputContainer = document.getElementById('custom-modal-input-container');
    const inputField = document.getElementById('custom-modal-input');
    if (isPrompt) {
        inputContainer.classList.remove('hidden');
        inputField.value = '';
        setTimeout(() => inputField.focus(), 100);
    } else {
        inputContainer.classList.add('hidden');
    }
    
    document.getElementById('custom-modal-cancel').innerText = cancelText;
    const confirmBtn = document.getElementById('custom-modal-confirm');
    confirmBtn.innerText = confirmText;
    
    if (type === 'error') {
        confirmBtn.className = 'btn btn-error';
    } else {
        confirmBtn.className = 'btn btn-primary';
    }
    
    if (window.lucide) lucide.createIcons({root: overlay});
    overlay.classList.remove('hidden');
    
    const handleConfirm = () => {
        closeCustomModal();
        if (onConfirm) {
            onConfirm(isPrompt ? inputField.value : true);
        }
    };
    
    confirmBtn.onclick = handleConfirm;
    
    if (isPrompt) {
        inputField.onkeydown = (e) => {
            if (e.key === 'Enter') handleConfirm();
        };
    }
};

window.closeCustomModal = function() {
    const overlay = document.getElementById('custom-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
};

// =============================================
// Supabase Sync Logic
// =============================================
let syncTimer = null;
function requestSyncToSupabase() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        syncToSupabase();
    }, 1500);
}

async function syncToSupabase() {
    if (isDemoMode || !supabaseClient) return;
    const key = `bioguard_results_real_${activeEstId}`;
    const results = JSON.parse(localStorage.getItem(key) || '[]');
    try {
        await supabaseClient.from('bioguard_records').delete().eq('est_id', activeEstId);
        if (results.length > 0) {
            const batch = results.map(r => ({
                est_id: activeEstId,
                record_data: r
            }));
            await supabaseClient.from('bioguard_records').insert(batch);
        }
    } catch (e) {
        console.error("Supabase sync err:", e);
    }
}

async function loadFromSupabase() {
    if (isDemoMode || !supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('bioguard_records').select('*').eq('est_id', activeEstId);
        if (error) return console.error("Supabase load err:", error);
        if (data && data.length > 0) {
            const results = data.map(d => d.record_data);
            results.sort((a,b) => new Date(b.date) - new Date(a.date));
            localStorage.setItem(`bioguard_results_real_${activeEstId}`, JSON.stringify(results));
            handleRoute(window.location.hash);
        }
    } catch (e) { console.error(e); }
}
