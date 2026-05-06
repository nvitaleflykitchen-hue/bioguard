// PDF Export
function exportToPDF(elementId, filename) {
    if (filename === 'Informe_Revision_Gerencial') {
        generateActionPlanReport();
        return;
    }

    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('pdf-export-mode');
    
    const opt = {
        margin:       10,
        filename:     `${filename}_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0B0E14' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-export-mode');
    });
}

async function generateActionPlanReport() {
    const results = getResults();
    const est = establishments.find(e => e.id === activeEstId)?.name || 'FlyKitchen';
    const user = document.getElementById('user-name')?.textContent || 'Responsable de Calidad';
    const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const failures = results.filter(r => r.state === 'error');
    const successRate = ((results.filter(r => r.state === 'success').length / (results.length || 1)) * 100).toFixed(1);

    // Capture chart image if it exists
    const chartCanvas = document.getElementById('trends-chart');
    let chartImageHTML = '';
    if (chartCanvas && typeof Chart !== 'undefined' && Chart.getChart) {
        const chartInstance = Chart.getChart(chartCanvas);
        if (chartInstance) {
            const base64 = chartInstance.toBase64Image();
            chartImageHTML = `
                <div style="margin-top: 25px; text-align: center; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; background: #F8FAFC; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <h3 style="color: #334155; margin-top: 0; margin-bottom: 15px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Gráfico de Tendencias Microbiológicas</h3>
                    <img src="${base64}" style="max-width: 100%; height: auto; max-height: 280px; object-fit: contain;" />
                </div>
            `;
        }
    }

    // Create a temporary container for the report
    const report = document.createElement('div');
    report.className = 'formal-report-container';
    report.style.fontFamily = "'Inter', Arial, sans-serif";
    report.style.color = '#0F172A';
    report.innerHTML = `
        <table class="report-header" style="width: 100%; border-bottom: 4px solid #6366F1; padding-bottom: 20px; margin-bottom: 30px; border-collapse: collapse;">
            <tr>
                <td style="width: 30%; vertical-align: middle; text-align: left;">
                    <img src="data:image/png;base64,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" style="max-height: 85px; width: auto; max-width: 100%;">
                </td>
                <td style="width: 70%; text-align: right; vertical-align: middle;" class="report-title">
                    <h1 style="color: #0F172A; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Acta de Revisión por la Dirección</h1>
                    <p style="color: #475569; margin: 6px 0 0 0; font-size: 14px; font-weight: 600;">Gestión de Inocuidad Microbiológica - IRAM-NM 323</p>
                    <p style="color: #94A3B8; margin: 3px 0 0 0; font-size: 11px; font-weight: 500; text-transform: uppercase;">ISO 9001:2015 Compliance Report</p>
                </td>
            </tr>
        </table>

        <div class="report-meta" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            <div>
                <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px;">Establecimiento</span>
                <strong style="color: #0F172A; font-size: 14px;">${est}</strong>
            </div>
            <div>
                <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px;">Responsable</span>
                <strong style="color: #0F172A; font-size: 14px;">${user}</strong>
            </div>
            <div>
                <span style="font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 4px;">Fecha de Emisión</span>
                <strong style="color: #0F172A; font-size: 14px;">${dateStr}</strong>
            </div>
        </div>

        <div class="report-section" style="margin-bottom: 30px;">
            <h2 style="color: #1E293B; font-size: 16px; font-weight: 700; border-bottom: 1px solid #CBD5E1; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">1. Desempeño y Conformidad del SGC</h2>
            <p style="font-size: 13px; color: #334155; margin-bottom: 15px;">Se ha realizado el análisis de <strong>${results.length}</strong> protocolos en el periodo seleccionado.</p>
            <div class="kpi-box" style="display: flex; gap: 20px;">
                <div class="kpi-item" style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 15px 20px; border-radius: 8px; flex: 1; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <span class="kpi-label" style="display: block; font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Índice de Conformidad</span>
                    <span class="kpi-value" style="display: block; font-size: 28px; font-weight: 800; color: ${successRate > 95 ? '#10B981' : (successRate > 80 ? '#F59E0B' : '#EF4444')};">${successRate}%</span>
                </div>
                <div class="kpi-item" style="background: #FFFFFF; border: 1px solid #E2E8F0; padding: 15px 20px; border-radius: 8px; flex: 1; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                    <span class="kpi-label" style="display: block; font-size: 12px; color: #64748B; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Desvíos Críticos</span>
                    <span class="kpi-value" style="display: block; font-size: 28px; font-weight: 800; color: ${failures.length === 0 ? '#10B981' : '#EF4444'};">${failures.length}</span>
                </div>
            </div>
            ${chartImageHTML}
        </div>

        <div class="report-section" style="margin-bottom: 30px;">
            <h2 style="color: #1E293B; font-size: 16px; font-weight: 700; border-bottom: 1px solid #CBD5E1; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">2. Análisis de Desvíos y Riesgos (No Conformidades)</h2>
            ${failures.length > 0 ? `
                <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #E2E8F0;">
                    <thead>
                        <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                            <th style="padding: 10px; text-align: left; color: #475569; font-weight: 700; text-transform: uppercase;">Fecha</th>
                            <th style="padding: 10px; text-align: left; color: #475569; font-weight: 700; text-transform: uppercase;">Protocolo</th>
                            <th style="padding: 10px; text-align: left; color: #475569; font-weight: 700; text-transform: uppercase;">Muestra</th>
                            <th style="padding: 10px; text-align: left; color: #475569; font-weight: 700; text-transform: uppercase;">Hallazgo Crítico</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${failures.slice(0, 10).map(f => `
                            <tr style="border-bottom: 1px solid #E2E8F0;">
                                <td style="padding: 10px; color: #334155;">${new Date(f.date).toLocaleDateString()}</td>
                                <td style="padding: 10px; color: #334155; font-weight: 500;">${f.protocol}</td>
                                <td style="padding: 10px; color: #334155;">${f.sample}</td>
                                <td style="padding: 10px; color: #EF4444; font-weight: 600;">${f.rawValue}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top:10px; font-size: 11px; color: #94A3B8; font-style: italic;">* Se muestran hasta los últimos 10 desvíos críticos.</p>
            ` : '<p style="font-size: 13px; color: #10B981; font-weight: 500; background: #ECFDF5; padding: 12px; border-radius: 6px; border: 1px solid #A7F3D0;"><i data-lucide="check-circle" style="vertical-align: middle; margin-right: 5px; width: 16px; height: 16px;"></i> No se registran desvíos críticos en el periodo analizado.</p>'}
        </div>

        <div class="report-section" style="margin-bottom: 40px;">
            <h2 style="color: #1E293B; font-size: 16px; font-weight: 700; border-bottom: 1px solid #CBD5E1; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">3. Propuesta de Plan de Acción (Salidas de Revisión)</h2>
            <div class="action-plan-box" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 15px 20px; border-radius: 8px;">
                <p style="margin-top: 0; font-size: 13px; color: #334155;"><strong style="color: #0F172A;">A. Acciones Correctivas:</strong> Reforzar protocolos de higienización en las áreas con mayor recurrencia de desvíos.</p>
                <p style="font-size: 13px; color: #334155;"><strong style="color: #0F172A;">B. Necesidad de Recursos:</strong> Se recomienda revisión de la cadena de frío y capacitación de manipuladores.</p>
                <p style="margin-bottom: 0; font-size: 13px; color: #334155;"><strong style="color: #0F172A;">C. Mejora Continua:</strong> Mantener el monitoreo preventivo de patógenos específicos detectados.</p>
            </div>
        </div>

        <div class="report-footer" style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; page-break-inside: avoid;">
            <div class="signature-line" style="width: 40%; text-align: center;">
                <div class="line" style="border-top: 1px solid #0F172A; margin-bottom: 8px;"></div>
                <span style="font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase;">Firma Responsable de Calidad</span>
            </div>
            <div class="signature-line" style="width: 40%; text-align: center;">
                <div class="line" style="border-top: 1px solid #0F172A; margin-bottom: 8px;"></div>
                <span style="font-size: 11px; color: #475569; font-weight: 600; text-transform: uppercase;">Firma Dirección General / Gerencia</span>
            </div>
        </div>
    `;

    document.body.appendChild(report);

    // Add a class temporarily to fix Chart backgrounds in PDF if needed
    document.body.classList.add('pdf-generating');

    const opt = {
        margin:       15,
        filename:     `Acta_Revision_${est}_${dateStr.replace(/\//g, '-')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        showToast("Generando Acta de Revisión ISO...", "info");
        await html2pdf().set(opt).from(report).save();
        showToast("Acta descargada correctamente", "success");
    } catch(err) {
        showToast("Error al generar PDF: " + err.message, "error");
    } finally {
        document.body.removeChild(report);
        document.body.classList.remove('pdf-generating');
    }
}
