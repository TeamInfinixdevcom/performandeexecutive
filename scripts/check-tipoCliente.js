#!/usr/bin/env node
/*
 scripts/check-tipoCliente.js
 Uso: node scripts/check-tipoCliente.js [--serviceAccount path/to.json]
 Muestra clientes que tengan `tipoCliente === 'juridico'`.
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON no encontrado en', svcPath);
  process.exit(1);
}
const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  try {
    const col = 'clients';
    const q = db.collection(col).where('tipoCliente', '==', 'juridico').limit(1000);
    const snap = await q.get();
    console.log(`Found ${snap.size} clients with tipoCliente='juridico'`);
    snap.forEach(doc => {
      const d = doc.data();
      console.log(JSON.stringify({ id: doc.id, cedula: d.cedula, name: d.name || d.nombre || null }));
    });
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
