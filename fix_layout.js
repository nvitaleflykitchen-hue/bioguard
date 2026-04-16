const fs = require('fs');
let appJs = fs.readFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', 'utf8');

// The base64 logo is huge, so we match it dynamically.
appJs = appJs.replace(
    /<div class="report-header" style="display: flex;[\s\S]*?<img src="([^"]+)"[\s\S]*?ACTA DE REVISIÓN POR LA DIRECCIÓN[\s\S]*?<\/div>[\s]*<\/div>/g,
    `        <table class="report-header" style="width: 100%; border-bottom: 3px solid #1E293B; padding-bottom: 20px; margin-bottom: 30px; border-collapse: collapse;">
            <tr>
                <td style="width: 30%; vertical-align: middle; text-align: left;">
                    <img src="$1" style="max-height: 80px; width: auto; max-width: 100%;">
                </td>
                <td style="width: 70%; text-align: right; vertical-align: middle;" class="report-title">
                    <h1 style="color: #1E293B; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">ACTA DE REVISIÓN POR LA DIRECCIÓN</h1>
                    <p style="color: #64748B; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Gestión de Inocuidad Microbiológica - IRAM-NM 323</p>
                    <p style="color: #94A3B8; margin: 2px 0 0 0; font-size: 12px;">ISO 9001:2015 Compliance Report</p>
                </td>
            </tr>
        </table>`
);

appJs = appJs.replace(
    /<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1E293B;[\s\S]*?<img src="([^"]+)"[\s\S]*?INFORME DE AUDITORÍA[\s\S]*?<\/div>[\s]*<\/div>/g,
    `        <table style="width: 100%; border-bottom: 3px solid #1E293B; padding-bottom: 20px; margin-bottom: 30px; border-collapse: collapse;">
            <tr>
                <td style="width: 30%; vertical-align: middle; text-align: left;">
                    <img src="$1" style="max-height: 80px; width: auto; max-width: 100%;">
                </td>
                <td style="width: 70%; text-align: right; vertical-align: middle;">
                    <h1 style="color: #1E293B; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">INFORME DE AUDITORÍA</h1>
                    <p style="color: #64748B; margin: 5px 0 0 0; font-size: 15px; font-weight: 500;">Incidencia Operativa y Análisis de Riesgo</p>
                    <div style="margin-top: 8px; display: inline-block; background: #F1F5F9; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #475569;">\${dateStr} | NORMA ISO 9001:2015</div>
                </td>
            </tr>
        </table>`
);

fs.writeFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', appJs, 'utf8');
console.log('App.js layouts fixed to tables.');
