// UI Updates
function updateDashboard() {
    const results = getResults();
    
    // 1. Calculate Core Metrics
    const total = results.length;
    const aptoCount = results.filter(r => (r.state || 'success') === 'success').length;
    const obsCount = results.filter(r => (r.state === 'obs') || ((r.state || 'success') === 'success' && r.rawValue?.toLowerCase().includes('obs'))).length;
    const dangerCount = results.filter(r => r.state === 'error').length;
    const compliancePct = total > 0 ? ((aptoCount / total) * 100).toFixed(1) : 0;

    // 2. Update KPI Cards (PCCLAB 2.0 Layout)
    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    setEl('stat-total', total);
    setEl('stat-apto', aptoCount);
    setEl('stat-apto-pct', total > 0 ? Math.round((aptoCount/total)*100) + '%' : '0%');
    setEl('stat-obs', obsCount);
    setEl('stat-obs-pct', total > 0 ? Math.round((obsCount/total)*100) + '%' : '0%');
    setEl('stat-danger', dangerCount);
    setEl('stat-danger-pct', total > 0 ? Math.round((dangerCount/total)*100) + '%' : '0%');
    
    // Update Donut Stats
    setEl('stat-compliance-pct', compliancePct + '%');
    setEl('stat-count-apto', aptoCount);
    setEl('stat-count-obs', obsCount);
    setEl('stat-count-danger', dangerCount);

    // 3. Update Compliance Donut Chart
    renderComplianceDonut(aptoCount, obsCount, dangerCount);

    // 4. Update Recent Results Table
    const tbody = document.getElementById('recent-results');
    if (tbody) {
        tbody.innerHTML = '';
        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:var(--text-secondary);">No hay registros aún.</td></tr>';
        } else {
            results.slice(0, 5).forEach(res => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(res.date).toLocaleDateString('es-ES')}</td>
                    <td><strong>${res.protocol}</strong></td>
                    <td>${formatType(res.type)}</td>
                    <td>${res.sample}</td>
                    <td>${res.rawValue || res.value}</td>
                    <td><span class="status-pill status-${res.state}">${res.state==='success'?'APTO':(res.state==='obs'?'OBS':'NO APTO')}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // 5. Update Evolution Chart — ISO Microbiological Control Chart
    renderControlChart('trendChart', results);
}

function renderComplianceDonut(apto, obs, danger) {
    const ctx = document.getElementById('chartComplianceDonut');
    if (!ctx) return;
    
    if (charts['complianceDonut']) charts['complianceDonut'].destroy();
    
    charts['complianceDonut'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Apto', 'Observado', 'No Apto'],
            datasets: [{
                data: [apto, obs, danger],
                backgroundColor: ['#38B2A3', '#FBC02D', '#E53935'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            animation: { duration: 800 }
        }
    });
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString('es-ES');
}

function updateHistory() {
    let results = getResults();
    const searchInput = document.getElementById('history-search');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    // Apply Global Period Filter (same as dashboard)
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter && periodFilter.value !== 'all') {
        const now = new Date();
        let cutoff = new Date();
        const p = periodFilter.value;
        if (p === '6m') cutoff.setMonth(now.getMonth() - 6);
        else if (p === '3m') cutoff.setMonth(now.getMonth() - 3);
        else if (p === '12m') cutoff.setFullYear(now.getFullYear() - 1);
        
        results = results.filter(r => {
            const rd = new Date(r.date);
            return rd >= cutoff && rd <= now; // Solo fechas pasadas válidas dentro del corte
        });
    }

    const tbody = document.getElementById('history-results');
    if (!tbody) return;
    
    if (term) {
        results = results.filter(r => 
            r.protocol?.toLowerCase().includes(term) ||
            r.sample?.toLowerCase().includes(term) ||
            formatType(r.type)?.toString().toLowerCase().includes(term) ||
            formatOrganism(r.organism)?.toString().toLowerCase().includes(term)
        );
    }
    
    tbody.innerHTML = '';
    
    if (results.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="10" style="text-align: center; padding: 2rem;">No se encontraron registros para el período/criterio seleccionado. (Verifique los años ingresados)</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    // Ordenar de más reciente a más antiguo para que quede claro
    results.sort((a,b) => new Date(b.date) - new Date(a.date));

    results.forEach(res => {
        const tr = document.createElement('tr');
        const displayVal = res.rawValue ? res.rawValue : `${formatNumber(res.value)} <small>UFC</small>`;
        tr.innerHTML = `
            <td>${new Date(res.date).toLocaleDateString('es-ES')}</td>
            <td><strong>${res.protocol}</strong></td>
            <td>${formatType(res.type)} ${res.zona ? `<br><small style="color:var(--text-muted)">(${res.zona})</small>`:''}</td>
            <td>${res.sample}</td>
            <td>${formatOrganism(res.organism)}</td>
            <td>${displayVal}</td>
            <td>${res.unit || '-'}</td>
            <td style="text-align:center;"><span class="badge badge-${res.state}" style="cursor:help" title="Límite permitido: ${res.threshold === 0 ? 'Ausencia máxima en muestra' : '<= ' + res.threshold + ' ' + (res.unit || '')}">${res.state === 'success' ? 'Cumple' : 'Fuera de Rango'}</span></td>
            <td style="text-align:center;">${res.vaultId ? `<div class="evidence-badge clickable" onclick="downloadEvidence('${res.vaultId}')" title="Descargar Evidencia: ${res.evidence}"><i data-lucide="file-text"></i> PDF</div>` : (res.evidence ? `<div class="evidence-badge" title="${res.evidence}"><i data-lucide="paperclip"></i> ${res.evidence.substring(0, 12)}</div>` : '<span style="color: grey; font-size: 0.8rem;">Sin adjuntos</span>')}</td>
            <td style="text-align:right;">
                <div class="table-actions-cell">
                    <button class="btn-icon" onclick="editResult('${res.protocol}', '${res.date}')" title="Editar"><i data-lucide="edit-3"></i></button>
                    <button class="btn-icon btn-icon-error" onclick="deleteResult('${res.protocol}', '${res.date}')" title="Eliminar"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.deleteResult = function(protocol, date) {
    if (!confirm(`¿Confirmás la eliminación del registro ${protocol} del ${date}? Esta acción es irreversible.`)) return;
    
    const key = getStorageKey();
    let results = getResults();
    results = results.filter(r => !(r.protocol === protocol && r.date === date));
    localStorage.setItem(key, JSON.stringify(results));
    
    requestSyncToSupabase();
    updateHistory();
    alert("Registro eliminado del sistema.");
};

window.editResult = function(protocol, date) {
    const results = getResults();
    const record = results.find(r => r.protocol === protocol && r.date === date);
    if (!record) return;

    // Prefill form and switch view
    window.location.hash = '#register';
    
    setTimeout(() => {
        document.getElementById('audit-date').value = record.date;
        document.getElementById('protocol-id').value = record.protocol;
        document.getElementById('sample-desc').value = record.sample;
        document.getElementById('sample-type').value = record.type;
        document.getElementById('zona-ambiental').value = record.zona || 'zona1';
        document.getElementById('notes').value = record.notes || '';
        document.getElementById('vault-id').value = record.vaultId || '';
        document.getElementById('evidence-file').value = record.evidence || '';
        
        // Find all sibling results of same protocol/date to fill assays
        const siblings = results.filter(r => r.protocol === protocol && r.date === date);
        clearAssays();
        siblings.forEach(s => {
            window.addManualAssay({ org: s.organism, raw: s.rawValue, num: s.value });
        });
        
        // Mark as "Update" by temporarily removing old records on next save
        // We'll handle this by filtering out same protocol/date in the submit handler if edit mode
        formIsEditing = { protocol, date };
        document.querySelector('#view-register h2').innerText = "Editar Registro: " + protocol;
        document.querySelector('#audit-form button[type="submit"]').innerText = "Actualizar Registro";
    }, 100);
};

let formIsEditing = null;

function formatType(type) {
    if (!type) return type;
    const cleanType = String(type).toLowerCase().trim();
    const types = { 
        'alimento': 'Alimento T1', 
        'alimento_t1': 'Alimento T1', 
        'alimento_t2': 'Alimento T2',
        'alimento_t3': 'Alimento T3',
        'hisopado_superficie': 'Superficies', 
        'superficie': 'Superficies', 
        'hisopado_manipulador': 'Manipuladores',
        'manipulador': 'Manipuladores'
    };
    return types[cleanType] || type;
}

function formatOrganism(org) {
    const orgs = { 
        'aerobios': 'Aerobios T.', 
        'coliformes': 'Coliformes', 
        'ecoli': 'E. coli', 
        'ecoli157': 'E. coli O157',
        'salmonella': 'Salmonella', 
        'staphylococcus': 'Staph. aureus',
        'listeria': 'Listeria m.',
        'clostridium': 'Clostridium p.',
        'bacillus': 'Bacillus cereus',
        'anaerobios': 'Anaerobios S.R.'
    };
    return orgs[org] || org;
}
