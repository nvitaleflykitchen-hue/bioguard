const fs = require('fs');

let appJs = fs.readFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', 'utf8');

const logoData = fs.readFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/brand_logo.png');
const base64Logo = 'data:image/png;base64,' + logoData.toString('base64');

appJs = appJs.replace(/src="brand_logo\.png"/g, 'src="' + base64Logo + '"');

fs.writeFileSync('c:/Users/nicol/OneDrive/Desktop/DEBORA/BIOGUARD/app.js', appJs, 'utf8');
console.log('Successfully injected base64 image into app.js');
