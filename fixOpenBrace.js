const fs = require('fs');
const path = require('path');

// Ruta al archivo a revisar
const filePath = path.resolve(__dirname, 'public/js/sales-form.js');

// Leer el archivo
let code = fs.readFileSync(filePath, 'utf8');

// Contadores de llaves
let openBraces = 0;
let closeBraces = 0;

// Revisar línea por línea
code.split('\n').forEach((line) => {
  for (const char of line) {
    if (char === '{') openBraces++;
    if (char === '}') closeBraces++;
  }
});

// Reporte
console.log(`Llaves abiertas: ${openBraces}`);
console.log(`Llaves cerradas: ${closeBraces}`);

if (openBraces === closeBraces) {
  console.log('✅ Las llaves están balanceadas.');
} else if (openBraces < closeBraces) {
  const missing = closeBraces - openBraces;
  console.log(`❌ Faltan ${missing} llaves de apertura '{'.`);
  // Agregar las llaves de apertura al principio del archivo
  code = '{'.repeat(missing) + '\n' + code;
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Agregadas ${missing} llaves de apertura al inicio del archivo.`);
} else {
  console.log('❌ Hay más llaves de apertura que de cierre. Revisión manual recomendada.');
}
