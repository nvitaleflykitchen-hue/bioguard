// Navigation Logic
function setupNavigation() {
    window.addEventListener('hashchange', () => {
        handleRoute(window.location.hash || '#dashboard');
    });

    // Default view
    if (!window.location.hash) window.location.hash = '#dashboard';
}

// User Profile Integration
function setupProfile() {
    renderEstablishmentDropdown();
}

function renderEstablishmentDropdown() {
    const headerLeft = document.querySelector('.establishment-info');
    if (!headerLeft) return;

    const activeEst = establishments.find(e => e.id === activeEstId) || establishments[0];
    
    // CASO ESPECIAL: Si estamos en el caso NotebookLM, anonimizamos Planta
    const displayName = (isDemoMode && activeScenarioId === 'notebooklm') ? 'Planta X (Caso Hipotético)' : activeEst.name;
    
    let html = `
        <select id="est-selector" class="est-dropdown" ${isDemoMode && activeScenarioId === 'notebooklm' ? 'disabled' : ''} onchange="changeEstablishment()">
            ${isDemoMode && activeScenarioId === 'notebooklm' 
                ? `<option value="special">📍 Planta X (Caso Hipotético)</option>`
                : establishments.map(e => `<option value="${e.id}" ${e.id === activeEstId ? 'selected' : ''}>📍 ${e.name}</option>`).join('')
            }
            ${isDemoMode && activeScenarioId === 'notebooklm' ? '' : `
                <option disabled>──────────</option>
                <option value="NEW">➕ Agregar Establecimiento...</option>
            `}
        </select>
        <span id="active-scenario-tag" class="hidden">MODO SIMULACIÓN: <span id="scenario-name"></span></span>
    `;
    headerLeft.innerHTML = html;
}

function changeEstablishment() {
    const sel = document.getElementById('est-selector');
    if (sel.value === 'NEW') {
        showCustomModal({
            title: 'Nuevo Establecimiento',
            message: 'Ingresá el nombre del nuevo establecimiento (Ej. Escala Rosario):',
            isPrompt: true,
            confirmText: 'Crear Planta',
            onConfirm: (estName) => {
                if (estName && estName.trim() !== '') {
                    const newId = 'est_' + Date.now();
                    establishments.push({id: newId, name: estName.trim()});
                    localStorage.setItem('bioguard_establishments', JSON.stringify(establishments));
                    activeEstId = newId;
                    localStorage.setItem('bioguard_active_est_id', activeEstId);
                    finalizeChangeEst();
                    showToast('Establecimiento agregado con éxito', 'success');
                } else {
                    // Restore previous selection if cancelled
                    sel.value = activeEstId;
                }
            }
        });
        return;
    } else {
        activeEstId = sel.value;
        localStorage.setItem('bioguard_active_est_id', activeEstId);
        finalizeChangeEst();
    }
    
    function finalizeChangeEst() {
        // Al cambiar de establecimiento, salimos del modo demo para ver datos reales del destino
        isDemoMode = false;
        activeScenarioName = '';
        activeScenarioId = '';
        if (typeof updateDemoUI === 'function') updateDemoUI(null);
        
        renderEstablishmentDropdown();
        handleRoute(window.location.hash); // Refresh data
        loadFromSupabase(); // Cargar datos del establecimiento en Supabase
    }
}

function updateAvatar(name) {
    const parts = name.trim().split(' ');
    let init = parts[0] ? parts[0].charAt(0).toUpperCase() : 'R';
    if (parts.length > 1 && parts[1]) init += parts[1].charAt(0).toUpperCase();
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) avatarEl.innerText = init;
}
