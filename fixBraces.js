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
code.split('\n').forEach((line, idx) => {
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
} else {
  console.log('❌ Desbalance detectado.');
  if (openBraces > closeBraces) {
    console.log(`Faltan ${openBraces - closeBraces} llaves de cierre '}' al final.`);
    // Corregir agregando las llaves faltantes al final
    code += '\n' + '}'.repeat(openBraces - closeBraces);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('Archivo corregido agregando llaves de cierre al final.');
  } else {
    console.log(`Faltan ${closeBraces - openBraces} llaves de apertura '{'. Revisión manual recomendada.`);
  }
}
