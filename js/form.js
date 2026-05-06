// Form Handling
window.addManualAssay = function(prefill = null, suffix = '') {
    const tbody = document.getElementById('assay-matrix-body' + suffix);
    const emptyRow = document.getElementById('empty-matrix-row' + suffix);
    if (emptyRow) emptyRow.style.display = 'none';

    const tr = document.createElement('tr');
    tr.className = 'assay-row';
    tr.innerHTML = `
        <td>
            <select class="matrix-micro" required>
                <option value="aerobios" ${prefill?.org==='aerobios'?'selected':''}>Aerobios Totales</option>
                <option value="coliformes" ${prefill?.org==='coliformes'?'selected':''}>Coliformes Totales</option>
                <option value="ecoli" ${prefill?.org==='ecoli'?'selected':''}>E. coli</option>
                <option value="ecoli157" ${prefill?.org==='ecoli157'?'selected':''}>E. coli O157:H7/NM</option>
                <option value="salmonella" ${prefill?.org==='salmonella'?'selected':''}>Salmonella spp.</option>
                <option value="staphylococcus" ${prefill?.org==='staphylococcus'?'selected':''}>Staph. aureus</option>
                <option value="listeria" ${prefill?.org==='listeria'?'selected':''}>Listeria monocytogenes</option>
                <option value="clostridium" ${prefill?.org==='clostridium'?'selected':''}>Clostridium perfringens</option>
                <option value="bacillus" ${prefill?.org==='bacillus'?'selected':''}>Bacillus cereus</option>
                <option value="anaerobios" ${prefill?.org==='anaerobios'?'selected':''}>Anaerobios Sulfitos Red.</option>
                <option value="mohos" ${prefill?.org==='mohos'?'selected':''}>Mohos</option>
                <option value="levaduras" ${prefill?.org==='levaduras'?'selected':''}>Levaduras</option>
            </select>
        </td>
        <td>
            <input type="text" class="input matrix-val-raw" required value="${prefill?.raw || ''}" placeholder="Ej: <10, Ausencia" style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; color: white; width: 100%;">
            <input type="hidden" class="matrix-val-num" value="${prefill?.num || 0}">
        </td>
        <td>
            <input type="text" class="input matrix-unit" value="${prefill?.unit || ''}" placeholder="Ej: UFC/g" style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; color: white; width: 100%;">
        </td>
        <td style="text-align:center;">
             <button type="button" class="btn btn-error btn-small" onclick="this.closest('tr').remove()" style="padding: 6px 10px;">Borrar</button>
        </td>
    `;
    tbody.appendChild(tr);
};

window.clearAssays = function(suffix = '') {
    const tbody = document.getElementById('assay-matrix-body' + suffix);
    if (tbody) tbody.innerHTML = `<tr id="empty-matrix-row${suffix}"><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px; font-style:italic">Extrae los datos desde un PDF o usa el botón agregar.</td></tr>`;
};

function setupForm() {
    const form = document.getElementById('audit-form');
    if (!form) return;

    // Set today as default date
    document.getElementById('audit-date').valueAsDate = new Date();

    // Toggle Zona Ambiental visibility based on sample type
    const sampleTypeSelect = document.getElementById('sample-type');
    const zonaFieldGroup = document.getElementById('zona-field-group');
    
    const toggleZonaVisibility = () => {
        if (sampleTypeSelect.value === 'hisopado_superficie') {
            zonaFieldGroup.classList.remove('hidden-form-group');
            document.getElementById('zona-ambiental').setAttribute('required', 'required');
        } else {
            zonaFieldGroup.classList.add('hidden-form-group');
            document.getElementById('zona-ambiental').removeAttribute('required');
        }
    };

    if (sampleTypeSelect && zonaFieldGroup) {
        sampleTypeSelect.addEventListener('change', toggleZonaVisibility);
        // Initial check in case of prefill/edit
        toggleZonaVisibility();
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const rows = document.querySelectorAll('#assay-matrix-body tr.assay-row');
        if (rows.length === 0) {
            showToast("Agregá al menos un ensayo microbiológico a la matriz antes de registrar.", "warning");
            return;
        }

        const baseData = {
            date: document.getElementById('audit-date').value,
            protocol: document.getElementById('protocol-id').value,
            sample: document.getElementById('sample-desc').value,
            type: document.getElementById('sample-type').value,
            zona: document.getElementById('zona-ambiental').value || 'zona1',
            evidence: document.getElementById('evidence-file').value || null,
            vaultId: document.getElementById('vault-id')?.value || null,
            notes: document.getElementById('notes').value
        };
        
        const isCumpleForce = baseData.notes.toUpperCase().includes('CUMPLE');

        if (formIsEditing) {
            const key = getStorageKey();
            let allResults = getResults();
            allResults = allResults.filter(r => !(r.protocol === formIsEditing.protocol && r.date === formIsEditing.date));
            localStorage.setItem(key, JSON.stringify(allResults));
            formIsEditing = null;
            document.querySelector('#view-register h2').innerText = "Nuevo Registro de Auditoría";
            document.querySelector('#audit-form button[type="submit"]').innerText = "Registrar Análisis";
        }

        const rowsToSave = document.querySelectorAll('#assay-matrix-body tr.assay-row');
        rowsToSave.forEach(tr => {
            const micro = tr.querySelector('.matrix-micro').value;
            const rawVal = tr.querySelector('.matrix-val-raw').value;
            let numValue = cleanNumericValue(rawVal);
            
            let threshold = 10;
            if (micro === 'aerobios') threshold = (baseData.type === 'hisopado_superficie') ? 100 : 10000;
            if (micro === 'salmonella' || micro === 'listeria') threshold = 0;
            if (micro === 'coliformes') threshold = (baseData.type === 'hisopado_superficie') ? 10 : 100;
            if (micro === 'mohos' || micro === 'levaduras') threshold = (baseData.type === 'hisopado_superficie') ? 10 : 100;

            let state = (numValue <= threshold) ? 'success' : 'error';
            if ((micro === 'salmonella' || micro === 'listeria' || micro === 'ecoli157') && numValue > 0) state = 'error';

            if (isCumpleForce) state = 'success';
            if (rawVal.toLowerCase().includes('no cumple')) state = 'error';
            if (rawVal.toLowerCase().includes('ausencia')) state = 'success';

            const newResult = {
                ...baseData,
                organism: micro,
                value: numValue,
                rawValue: rawVal,
                state: state,
                threshold: threshold
            };
            
            saveResult(newResult);
        });

        form.reset();
        clearAssays();
        window.location.hash = '#dashboard';
        showToast(`Carga registrada: Se guardaron ${rows.length} ensayos en el sistema ISO.`, 'success');
    });
}
