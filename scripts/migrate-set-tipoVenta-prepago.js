#!/usr/bin/env node
/*
 scripts/migrate-set-tipoVenta-prepago.js
 Uso: node scripts/migrate-set-tipoVenta-prepago.js [--dryrun true|false] [--serviceAccount path/to.json]

Este script actualiza documentos en la colección `ventas` que tienen un `planPrice`
coincidente con los precios de los planes de `prepago` y que NO tienen `tipoVenta`,
estableciendo `tipoVenta: 'prepago'`.

Se recomienda ejecutar primero con --dryrun true (por defecto) y luego con --dryrun false.
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const dryrun = (argv['dryrun'] === undefined) ? true : (String(argv['dryrun']) !== 'false' ? true : false);
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON no encontrado en', svcPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function loadPrepagoPrices() {
  const jsonPath = path.resolve(__dirname, '..', 'public', 'data', 'planes.json');
  if (!fs.existsSync(jsonPath)) throw new Error('No se encontró planes.json en ' + jsonPath);
  const data = require(jsonPath);
  const prepago = data && data.plansMobile && data.plansMobile.prepago && data.plansMobile.prepago.planes;
  if (!prepago || !Array.isArray(prepago)) throw new Error('Estructura inesperada en planes.json (prepago)');
  return prepago.map(p => p.precio).filter(p => p !== null && p !== undefined);
}

async function run() {
  try {
    const prices = loadPrepagoPrices();
    console.log('Prepago prices loaded:', prices);

    const col = 'ventas';
    // Query by planPrice in prices
    const q = db.collection(col).where('planPrice', 'in', prices).limit(1000);
    const snap = await q.get();
    console.log(`Found ${snap.size} docs in ${col} with planPrice in prepago prices`);

    const toUpdate = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (!d.tipoVenta) {
        toUpdate.push({ id: doc.id, ref: doc.ref, data: d });
      }
    });

    console.log(`Documents missing tipoVenta: ${toUpdate.length}`);
    if (toUpdate.length === 0) {
      console.log('Nada que actualizar. Saliendo.');
      return;
    }

    if (dryrun) {
      console.log('DRY RUN: no se aplicarán cambios. Lista de documentos que se actualizarían:');
      toUpdate.forEach(d => console.log(`- ${d.id}`));
      return;
    }

    // Apply updates in batches of 500
    const BATCH_SIZE = 500;
    let idx = 0;
    while (idx < toUpdate.length) {
      const batch = db.batch();
      const slice = toUpdate.slice(idx, idx + BATCH_SIZE);
      slice.forEach(item => {
        batch.update(item.ref, { tipoVenta: 'prepago', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      console.log(`Applied batch: updated ${slice.length} documents`);
      idx += BATCH_SIZE;
    }
    console.log('Migración completada.');
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  }
}

run();
