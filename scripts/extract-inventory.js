/**
 * SCRIPT PARA EXTRAER MARCAS Y MODELOS DEL INVENTARIO CSV
 * Ejecutar: node extract-inventory.js
 */

const fs = require('fs');
const path = require('path');

// Leer archivo CSV
const csvPath = path.join(__dirname, '..', '..', 'inventario csv.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const lineas = csvContent.split('\n').slice(1); // Saltar header

const marcasModelos = {};

lineas.forEach(linea => {
  if (!linea.trim()) return;
  
  const partes = linea.split(';');
  if (partes.length < 3) return;

  const marca = partes[1]?.trim();
  const modelo = partes[2]?.trim();

  if (!marca || !modelo) return;

  // Agrupar modelos por marca
  if (!marcasModelos[marca]) {
    marcasModelos[marca] = new Set();
  }
  marcasModelos[marca].add(modelo);
});

// Convertir Sets a Arrays y ordenar
const resultado = {};
Object.keys(marcasModelos).sort().forEach(marca => {
  resultado[marca] = Array.from(marcasModelos[marca]).sort();
});

// Mostrar resultado
console.log('📊 MARCAS Y MODELOS EXTRAIDOS DEL INVENTARIO:\n');
console.log(JSON.stringify(resultado, null, 2));

// Guardar en archivo JSON para fácil importación
const outputPath = path.join(__dirname, 'modelos-inventario.json');
fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 2));

console.log(`\n✅ Archivo guardado en: ${outputPath}`);
console.log(`\n📈 ESTADÍSTICAS:`);
console.log(`   Marcas totales: ${Object.keys(resultado).length}`);
console.log(`   Modelos totales: ${Object.values(resultado).reduce((sum, arr) => sum + arr.length, 0)}`);
