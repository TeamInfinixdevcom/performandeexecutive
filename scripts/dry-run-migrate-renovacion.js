#!/usr/bin/env node
/*
 scripts/dry-run-migrate-renovacion.js
 Uso: node scripts/dry-run-migrate-renovacion.js [--dryrun true|false] [--serviceAccount path/to.json]

Este script hace un "dry-run" para listar documentos en `ventas` y `ventas_hogar`
que tienen `renovacion === true` pero que no tienen `tipoVenta: 'renovacion'`,
o que tienen `tipoVenta: 'renovacion'` pero no incluyen la categoría 'renovacion'.
No aplica cambios cuando se ejecuta con --dryrun true (por defecto).
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const dryrun = (argv['dryrun'] === undefined) ? true : (String(argv['dryrun']) !== 'false' ? true : false);
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8068060.json';

// Allow using the common filename present in the repo as default
const defaultSvcA = 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const resolvedSvc = argv['serviceAccount'] || defaultSvcA;

if (!fs.existsSync(resolvedSvc)) {
  console.error('Service account JSON no encontrado en', resolvedSvc);
  process.exit(1);
}

const serviceAccount = require(path.resolve(resolvedSvc));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function inspectCollection(col) {
  const snap = await db.collection(col).get();
  console.log(`Scanning ${col}: found ${snap.size} documents`);
  const candidates = [];
  const inconsistent = [];
  snap.forEach(doc => {
    const d = doc.data();
    const hasRenovBool = d && (d.renovacion === true || d.renovacion === 'true');
    const tipoVenta = d && d.tipoVenta;
    const categories = Array.isArray(d && d.categories) ? d.categories : [];

    if (hasRenovBool && tipoVenta !== 'renovacion') {
      candidates.push({ id: doc.id, collection: col, tipoVenta, renovacion: d.renovacion });
    }

    if (tipoVenta === 'renovacion' && !categories.includes('renovacion')) {
      inconsistent.push({ id: doc.id, collection: col, categories });
    }
  });

  return { candidates, inconsistent };
}

async function run() {
  try {
    // Renovaciones sólo aplican a la colección `ventas` (móvil). No tocar `ventas_hogar`.
    const cols = ['ventas'];
    let totalCandidates = 0;
    let totalInconsistent = 0;
    for (const col of cols) {
      const res = await inspectCollection(col);
      console.log(`\nCollection: ${col}`);
      console.log(`  Documents with renovacion===true but tipoVenta !== 'renovacion': ${res.candidates.length}`);
      res.candidates.slice(0, 200).forEach(c => console.log(`   - ${c.id} (tipoVenta=${c.tipoVenta} renovacion=${c.renovacion})`));
      if (res.candidates.length > 200) console.log(`   ...and ${res.candidates.length - 200} more`);

      console.log(`  Documents with tipoVenta==='renovacion' but missing 'renovacion' category: ${res.inconsistent.length}`);
      res.inconsistent.slice(0,200).forEach(c => console.log(`   - ${c.id} (categories=${JSON.stringify(c.categories)})`));
      if (res.inconsistent.length > 200) console.log(`   ...and ${res.inconsistent.length - 200} more`);

      totalCandidates += res.candidates.length;
      totalInconsistent += res.inconsistent.length;
    }

    console.log('\nSummary:');
    console.log(`  Total documents to consider updating (renovacion boolean -> tipoVenta): ${totalCandidates}`);
    console.log(`  Total documents with inconsistent categories: ${totalInconsistent}`);

    if (dryrun) {
      console.log('\nDRY RUN: no se harán cambios. Para aplicar los updates, ejecute con --dryrun false');
      return;
    }

    console.log('\nAplicando actualizaciones en batches...');
    const BATCH_SIZE = 500;
    // First: for documents that have renovacion boolean but missing tipoVenta
    for (const col of cols) {
      const snap = await db.collection(col).where('renovacion', '==', true).get();
      const toUpdate = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.tipoVenta || d.tipoVenta !== 'renovacion') {
          toUpdate.push({ ref: doc.ref, id: doc.id, data: d });
        }
      });
      console.log(`  ${col}: will update ${toUpdate.length} docs from renovacion boolean -> tipoVenta`);
      let idx = 0;
      while (idx < toUpdate.length) {
        const batch = db.batch();
        const slice = toUpdate.slice(idx, idx + BATCH_SIZE);
        slice.forEach(item => {
          batch.update(item.ref, { tipoVenta: 'renovacion', categories: admin.firestore.FieldValue.arrayUnion('renovacion'), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();
        console.log(`    Applied batch: updated ${slice.length} documents in ${col}`);
        idx += BATCH_SIZE;
      }
    }

    // Second: for documents that have tipoVenta==='renovacion' but missing category 'renovacion'
    for (const col of cols) {
      const snap = await db.collection(col).where('tipoVenta', '==', 'renovacion').get();
      const toFix = [];
      snap.forEach(doc => {
        const d = doc.data();
        const categories = Array.isArray(d && d.categories) ? d.categories : [];
        if (!categories.includes('renovacion')) {
          toFix.push({ ref: doc.ref, id: doc.id });
        }
      });
      console.log(`  ${col}: will add 'renovacion' category to ${toFix.length} docs`);
      let idx2 = 0;
      while (idx2 < toFix.length) {
        const batch = db.batch();
        const slice = toFix.slice(idx2, idx2 + BATCH_SIZE);
        slice.forEach(item => {
          batch.update(item.ref, { categories: admin.firestore.FieldValue.arrayUnion('renovacion'), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
        await batch.commit();
        console.log(`    Applied batch: fixed ${slice.length} documents in ${col}`);
        idx2 += BATCH_SIZE;
      }
    }

    console.log('Actualización completada.');
  } catch (err) {
    console.error('Error durante dry-run:', err);
    process.exit(1);
  }
}

run();
