// Chart.js Premium Configuration
if (window.Chart) {
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: '600' };
}

function createChartGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color.replace('1)', '0.4)'));
    gradient.addColorStop(0.5, color.replace('1)', '0.1)'));
    gradient.addColorStop(1, color.replace('1)', '0)'));
    return gradient;
}

// ─────────────────────────────────────────────────────────────
// MICROBIOLOGICAL CONTROL CHART — ISO 9001 / IRAM-NM 323
// Replaces the old renderChart() with full scientific display:
// colored points, reference lines, background zones, rich tooltips
// ─────────────────────────────────────────────────────────────

// Criteria table: organism → { m (alert), M (max), unit, label }
const MICRO_CRITERIA = {
    aerobios:      { m: 100000, M: 1000000, unit: 'UFC/g',         label: 'Aerobios Totales' },
    coliformes:    { m: 10,     M: 100,     unit: 'UFC/g',         label: 'Coliformes Totales' },
    ecoli:         { m: 0,      M: 10,      unit: 'UFC/g',         label: 'E. coli' },
    ecoli157:      { m: 0,      M: 0,       unit: 'UFC/25g',       label: 'E. coli O157:H7' },
    salmonella:    { m: 0,      M: 0,       unit: 'ausencia/25g',  label: 'Salmonella spp.' },
    staphylococcus:{ m: 100,    M: 1000,    unit: 'UFC/g',         label: 'Staph. aureus' },
    listeria:      { m: 0,      M: 0,       unit: 'ausencia/25g',  label: 'Listeria m.' },
    clostridium:   { m: 10,     M: 100,     unit: 'UFC/g',         label: 'Clostridium p.' },
    bacillus:      { m: 100,    M: 1000,    unit: 'UFC/g',         label: 'Bacillus cereus' },
    anaerobios:    { m: 10,     M: 100,     unit: 'UFC/g',         label: 'Anaerobios S.R.' },
    mohos:         { m: 10,     M: 100,     unit: 'UFC/g',         label: 'Mohos' },
    levaduras:     { m: 10,     M: 100,     unit: 'UFC/g',         label: 'Levaduras' },
};

function getPointColor(state) {
    if (state === 'success') return '#10b981';
    if (state === 'obs')     return '#f59e0b';
    if (state === 'error')   return '#ef4444';
    return '#64748b';
}

function renderControlChart(canvasId, allResults) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // ── 1. Filter: only aerobios with numeric values, sorted by date ──
    const aerobiosResults = allResults
        .filter(r => r.organism === 'aerobios' && r.value != null && !isNaN(r.value))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Fallback: if no aerobios data, show any numeric organism
    const working = aerobiosResults.length > 0
        ? aerobiosResults
        : allResults
            .filter(r => r.value != null && !isNaN(r.value) && r.value > 0)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

    const organism = working.length > 0 ? (working[0].organism || 'aerobios') : 'aerobios';
    const criteria = MICRO_CRITERIA[organism];
    const hasCriteria = criteria && (criteria.m > 0 || criteria.M > 0);
    const unit = (working.length > 0 && working[0].unit) ? working[0].unit
               : (criteria ? criteria.unit : 'UFC/g');

    // ── 2. Build deduplicated X-axis labels (date + index if repeated) ──
    const labels = [];
    const seenDates = {};
    working.forEach(r => {
        const dateStr = new Date(r.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        if (!seenDates[dateStr]) {
            seenDates[dateStr] = 0;
            labels.push(dateStr);
        } else {
            seenDates[dateStr]++;
            labels.push(dateStr + ' (' + seenDates[dateStr] + ')');
        }
    });

    const values    = working.map(r => r.value);
    const colors    = working.map(r => getPointColor(r.state));
    const protocols = working.map(r => r.protocol || '—');
    const samples   = working.map(r => r.sample || '—');
    const rawVals   = working.map(r => r.rawValue || String(r.value));
    const units     = working.map(r => r.unit || unit);
    const states    = working.map(r => r.state);

    // ── 3. Determine Y scale ──
    const maxVal = Math.max(...values, hasCriteria ? criteria.M * 1.5 : 0, 1);
    const useLog = maxVal > 10000;

    // ── 4. Destroy previous instance ──
    if (charts[canvasId]) { charts[canvasId].destroy(); }

    // ── 5. Background plugin: colored zones ──
    const bgZonesPlugin = {
        id: 'bgZones',
        beforeDraw(chart) {
            if (!hasCriteria) return;
            const { ctx: c, chartArea: { top, bottom, left, right }, scales } = chart;
            const yScale = scales.y;
            if (!yScale) return;

            const yM = yScale.getPixelForValue(criteria.M);
            const ym = yScale.getPixelForValue(criteria.m);
            const yT = top;
            const yB = bottom;

            // Red zone: above M
            c.fillStyle = 'rgba(239,68,68,0.06)';
            c.fillRect(left, yT, right - left, Math.max(0, yM - yT));

            // Yellow zone: between m and M
            c.fillStyle = 'rgba(245,158,11,0.06)';
            c.fillRect(left, yM, right - left, Math.max(0, ym - yM));

            // Green zone: below m
            c.fillStyle = 'rgba(16,185,129,0.06)';
            c.fillRect(left, ym, right - left, Math.max(0, yB - ym));
        }
    };

    // ── 6. Build datasets ──
    const datasets = [];

    // Main data line
    datasets.push({
        label: criteria ? criteria.label : 'Carga Microbiológica',
        data: working.length ? values : [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.05)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 9,
        pointBackgroundColor: colors,
        pointBorderColor: colors.map(c => c + 'cc'),
        pointBorderWidth: 2,
        order: 3,
    });

    // Reference line: alert (m)
    if (hasCriteria && criteria.m > 0) {
        datasets.push({
            label: `Alerta (m = ${formatNumber(criteria.m)} ${unit})`,
            data: labels.map(() => criteria.m),
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderDash: [6, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 2,
        });
    }

    // Reference line: limit (M)
    if (hasCriteria && criteria.M > 0) {
        datasets.push({
            label: `Límite Máx. (M = ${formatNumber(criteria.M)} ${unit})`,
            data: labels.map(() => criteria.M),
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0,
            fill: false,
            tension: 0,
            order: 1,
        });
    }

    // ── 7. Subtitle text ──
    const subtitleLines = hasCriteria
        ? [`Parámetro: ${criteria.label} | Unidad: ${unit} | Criterio: m=${formatNumber(criteria.m)} / M=${formatNumber(criteria.M)}`]
        : ['Sin criterio cargado para este parámetro — mostrando evolución histórica'];

    // ── 8. Build chart ──
    charts[canvasId] = new Chart(canvas, {
        type: 'line',
        plugins: [bgZonesPlugin],
        data: { labels: working.length ? labels : ['Sin datos'], datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { color: '#64748b', font: { size: 10 }, usePointStyle: true, boxWidth: 20, padding: 12 }
                },
                subtitle: {
                    display: true,
                    text: subtitleLines,
                    color: '#475569',
                    font: { size: 10 },
                    padding: { bottom: 6 }
                },
                tooltip: {
                    backgroundColor: 'rgba(8,12,24,0.97)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    padding: 14,
                    cornerRadius: 10,
                    callbacks: {
                        title: (items) => {
                            const i = items[0].dataIndex;
                            return labels[i] || '';
                        },
                        beforeBody: (items) => {
                            const i = items[0].dataIndex;
                            return [
                                `Protocolo: ${protocols[i]}`,
                                `Muestra: ${samples[i]}`,
                            ];
                        },
                        label: (item) => {
                            if (item.datasetIndex !== 0) {
                                // Reference lines
                                return item.dataset.label;
                            }
                            const i = item.dataIndex;
                            const st = states[i];
                            const stLabel = st === 'success' ? '✅ APTO'
                                         : st === 'error'   ? '🔴 FUERA DE RANGO'
                                         : st === 'obs'     ? '🟡 OBSERVADO'
                                         : '⚪ Sin criterio';
                            const lines = [
                                `Valor: ${rawVals[i]} ${units[i]}`,
                            ];
                            if (hasCriteria) {
                                if (criteria.m > 0) lines.push(`Alerta (m): ${formatNumber(criteria.m)} ${unit}`);
                                if (criteria.M > 0) lines.push(`Límite máx (M): ${formatNumber(criteria.M)} ${unit}`);
                            } else {
                                lines.push('Sin criterio de referencia');
                            }
                            lines.push(`Estado: ${stLabel}`);
                            return lines;
                        },
                        labelColor: (item) => {
                            if (item.datasetIndex !== 0) return { borderColor: 'transparent', backgroundColor: 'transparent' };
                            const i = item.dataIndex;
                            const c = getPointColor(states[i]);
                            return { borderColor: c, backgroundColor: c, borderRadius: 3 };
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: useLog ? 'logarithmic' : 'linear',
                    beginAtZero: !useLog,
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: {
                        color: '#64748b',
                        callback: v => formatNumber(v)
                    },
                    title: {
                        display: true,
                        text: unit,
                        color: '#475569',
                        font: { size: 10 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 }
                }
            }
        }
    });
}

// Keep a stub for backward compatibility (Trends view may still call it)
function renderChart(canvasId, data) {
    // No longer used for dashboard — kept for safety
    renderControlChart(canvasId, data);
}

function updateTrends() {
    const allResults = getResults();
    const filterSelect = document.getElementById('semester-filter');
    if (!filterSelect) return;

    // Initialize/Update dynamic filter options if empty or changed
    if (filterSelect.options.length <= 1) {
        const years = [...new Set(allResults.map(r => new Date(r.date).getFullYear()))].sort((a,b) => b-a);
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="recent">Últimos 6 Meses</option>';
        years.forEach(y => {
            filterSelect.innerHTML += `<option value="S1-${y}">1° Semestre ${y}</option>`;
            filterSelect.innerHTML += `<option value="S2-${y}">2° Semestre ${y}</option>`;
        });
        filterSelect.innerHTML += '<option value="all">Todo el Historial</option>';
        if (currentVal) filterSelect.value = currentVal;
    }

    const filter = filterSelect.value;
    let filteredData = allResults;
    const now = new Date();

    if (filter === 'recent') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        filteredData = allResults.filter(r => new Date(r.date) >= sixMonthsAgo);
    } else if (filter.startsWith('S')) {
        const [sem, year] = filter.split('-');
        const targetYear = parseInt(year);
        filteredData = allResults.filter(r => {
            const d = new Date(r.date);
            if (d.getFullYear() !== targetYear) return false;
            return sem === 'S1' ? d.getMonth() < 6 : d.getMonth() >= 6;
        });
    }

    setTimeout(() => renderManagementDashboard(filteredData), 100);
}

function renderManagementDashboard(data) {
    updatePlantStatus(data);
    
    renderChartA_ZoneTrends(data);
    renderChartB_CriticalPoints(data);
    renderChartC_GlobalCompliance(data);
    renderChartD_PathogenEvolution(data);
    renderChartE_MatrixRisk(data);
    
    lucide.createIcons();
}

// Chart A: Tendencia por Zona (ISO 9001:2015)
function renderChartA_ZoneTrends(data) {
    const canvas = document.getElementById('chartZoneTrends');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const months = [...new Set(data.map(d => new Date(d.date).toLocaleString('es-ES', { month: 'short' })))].reverse();
    const zones = ['zona1', 'zona2', 'zona3'];
    const datasets = zones.map((z, idx) => {
        const colors = ['#6366F1', '#10B981', '#F59E0B'];
        const zData = months.map(m => {
            const samples = data.filter(d => d.zona === z && new Date(d.date).toLocaleString('es-ES', { month: 'short' }) === m);
            if (samples.length === 0) return 0;
            return samples.filter(s => s.state === 'error').length;
        });
        return {
            label: z.toUpperCase(),
            data: zData,
            borderColor: colors[idx],
            backgroundColor: colors[idx] + '20',
            borderWidth: 2,
            tension: 0.4,
            fill: true
        };
    });

    if (charts['chartZoneTrends']) charts['chartZoneTrends'].destroy();
    charts['chartZoneTrends'] = new Chart(ctx, {
        type: 'line',
        data: { labels: months, datasets: datasets },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { color: '#94A3B8', boxWidth: 10 } } },
            scales: { y: { beginAtZero: true, ticks: { color: '#64748B', precision: 0 } }, x: { ticks: { color: '#64748B' } } }
        }
    });
}

// Chart B: Identificación de Áreas Críticas
function renderChartB_CriticalPoints(data) {
    const canvas = document.getElementById('chartCriticalPoints');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const points = {};
    data.filter(d => d.state === 'error').forEach(d => {
        points[d.sample] = (points[d.sample] || 0) + 1;
    });

    const sortedLabels = Object.keys(points).sort((a,b) => points[b] - points[a]).slice(0, 10);
    const sortedVals = sortedLabels.map(l => points[l]);

    const gradient = ctx.createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');

    if (charts['chartCriticalPoints']) charts['chartCriticalPoints'].destroy();
    charts['chartCriticalPoints'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{ label: 'Desvíos', data: sortedVals, backgroundColor: gradient, borderRadius: 5 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

// Chart C: KPI Global Conformidad
function renderChartC_GlobalCompliance(data) {
    const canvas = document.getElementById('chartGlobalCompliance');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const success = data.filter(d => d.state === 'success').length;
    const errors = data.filter(d => d.state === 'error').length;

    if (charts['chartGlobalCompliance']) charts['chartGlobalCompliance'].destroy();
    charts['chartGlobalCompliance'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['CUMPLE', 'NO CUMPLE'],
            datasets: [{
                data: [success, errors],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94A3B8', padding: 20 } } },
            cutout: '70%'
        }
    });
}

// Chart D: Evolución de Patógenos (Dinámico)
function renderChartD_PathogenEvolution(data) {
    const canvas = document.getElementById('chartPathogenEvolution');
    const selector = document.getElementById('pathogen-evolution-filter');
    if (!canvas || !selector) return;
    const ctx = canvas.getContext('2d');
    const targetMicro = selector.value;

    const microData = data.filter(d => d.organism === targetMicro)
                         .sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const labels = microData.map(d => new Date(d.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));
    const values = microData.map(d => d.value);

    const gradient = createChartGradient(ctx, 'rgba(99, 102, 241, 1)');

    if (charts['chartPathogenEvolution']) charts['chartPathogenEvolution'].destroy();
    charts['chartPathogenEvolution'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: formatOrganism(targetMicro),
                data: values,
                borderColor: '#6366F1',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 10 } } }
        }
    });
}

// Chart E: Distribución por Matriz — usa formatType() directo (misma lógica que columna TIPO del historial)
function renderChartE_MatrixRisk(data) {
    const canvas = document.getElementById('chartMatrixRisk');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const matrixLabels = ['Alimento T1', 'Alimento T2', 'Alimento T3', 'Superficies', 'Manipuladores'];
    
    // Contar registros por la etiqueta exacta de formatType (la misma que la columna TIPO)
    const countByLabel = (label, state) => {
        return data.filter(d => {
            // Usa formatType para clasificar — idéntico a lo que muestra la tabla
            if (formatType(d.type) !== label) return false;
            
            const st = d.state || 'success';
            if (state === 'success') return st === 'success';
            if (state === 'obs') return st === 'obs';
            if (state === 'error') return st === 'error';
            return false;
        }).length;
    };

    const successData = matrixLabels.map(l => countByLabel(l, 'success'));
    const obsData = matrixLabels.map(l => countByLabel(l, 'obs'));
    const errorData = matrixLabels.map(l => countByLabel(l, 'error'));

    // Debug: mostrar distribución real en consola
    console.log('Chart E — Distribución por Matriz:', matrixLabels.map((l, i) => 
        `${l}: OK=${successData[i]} OBS=${obsData[i]} ERR=${errorData[i]}`
    ));
    // También loguear los tipos raw para diagnóstico
    const typeCounts = {};
    data.forEach(d => { const t = d.type || '(vacío)'; typeCounts[t] = (typeCounts[t] || 0) + 1; });
    console.log('Chart E — Tipos raw en datos:', typeCounts);

    if (charts['chartMatrixRisk']) charts['chartMatrixRisk'].destroy();
    charts['chartMatrixRisk'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: matrixLabels,
            datasets: [
                { label: 'CUMPLE', data: successData, backgroundColor: '#10B981BB' },
                { label: 'OBSERVADO', data: obsData, backgroundColor: '#F59E0BBB' },
                { label: 'NO CUMPLE', data: errorData, backgroundColor: '#EF4444BB' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { color: '#64748B' } },
                y: { stacked: true, beginAtZero: true, ticks: { color: '#64748B', precision: 0 } }
            },
            plugins: { 
                legend: { position: 'top', labels: { color: '#94A3B8', boxWidth: 12, padding: 15 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += context.parsed.y;
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function exportData() {
    const results = getResults();
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Fecha,Protocolo,Tipo,Elemento,Resultado,Estado\n"
        + results.map(r => `${r.date},${r.protocol},${r.type},${r.sample},${r.value},${r.state}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bioguard_export.csv");
    document.body.appendChild(link);
    link.click();
}

// Plant Status
function updatePlantStatus(data) {
    const statusText = document.getElementById('plant-status-text');
    const statusDot = document.getElementById('plant-status-dot');
    if (!statusText || !statusDot) return;

    if (data.length === 0) {
        statusText.innerText = 'Sin registros en el periodo seleccionado';
        statusDot.className = 'status-indicator status-yellow';
        return;
    }

    const failures = data.filter(d => d.state === 'error').length;
    const total = data.length;
    
    statusDot.className = 'status-indicator'; // reset
    const failRate = failures / total;
    if (failRate === 0) {
        statusText.innerText = 'Cumplimiento Total (Excelente desempeño en el periodo)';
        statusDot.classList.add('status-green');
    } else if (failRate < 0.1) {
        statusText.innerText = 'Riesgo Controlado (Incidencias aisladas en el periodo)';
        statusDot.classList.add('status-yellow');
    } else {
        statusText.innerText = 'Acción Requerida (Desvíos críticos detectados en el periodo)';
        statusDot.classList.add('status-red');
    }
}
