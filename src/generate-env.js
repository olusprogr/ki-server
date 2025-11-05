const fs = require('fs');
const path = require('path');
require('dotenv').config();

function escapeString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const filePath = path.resolve(__dirname, 'env.ts');

// Alte Datei löschen, falls sie existiert
if (fs.existsSync(filePath)) {
  fs.unlinkSync(filePath);
}

const envContent = `export const environment = {
  production: ${process.env.NODE_ENV === 'production'},
  API_KEY: '${escapeString(process.env.API_KEY)}',
  VAR_A: '${escapeString(process.env.VAR_A)}',
  VAR_B: '${escapeString(process.env.VAR_B)}'
};
`;

fs.writeFileSync(filePath, envContent);
console.log('✅ env.ts generated');
