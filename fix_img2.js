const fs = require('fs');

let appJs = fs.readFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', 'utf8');

const microData = fs.readFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/ecoli_micrograph.jpg');
const base64Micro = 'data:image/jpeg;base64,' + microData.toString('base64');

appJs = appJs.replace(/\"ecoli_micrograph\.jpg\"/g, '"' + base64Micro + '"');

fs.writeFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', appJs, 'utf8');
console.log('Successfully injected base64 ecoli_micrograph image into app.js');
