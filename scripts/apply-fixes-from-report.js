#!/usr/bin/env node
/*
 scripts/apply-fixes-from-report.js
 Uso: node scripts/apply-fixes-from-report.js --report path/to/report.json [--serviceAccount path] [--apply true]

Lee un reporte generado (ej. reports/all-sales-report-YYYY-MM-DD.json) y aplica fixes:
 - Para documentos con 'missing tipoVenta': si planPrice coincide con precios 'prepago' -> set tipoVenta='prepago', else set tipoVenta='nueva'.
 - Añade updatedAt = serverTimestamp()

Por seguridad corre en modo dry-run por defecto. Usar --apply true para escribir cambios.
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const reportPath = argv.report || path.join(__dirname, '..', 'reports', `all-sales-report-${new Date().toISOString().slice(0,10)}.json`);
const svcPath = argv.serviceAccount || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const APPLY = argv.apply === 'true' || argv.apply === true;

if (!fs.existsSync(reportPath)) {
  console.error('Report JSON not found:', reportPath);
  process.exit(1);
}
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON not found:', svcPath);
  process.exit(1);
}

const report = require(path.resolve(reportPath));
const serviceAccount = require(path.resolve(svcPath));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// load planes to get prepago prices
const planesPath = path.join(__dirname, '..', 'public', 'data', 'planes.json');
if (!fs.existsSync(planesPath)) {
  console.error('planes.json not found:', planesPath);
  process.exit(1);
}
const planes = require(planesPath);
function loadPrepagoPrices() {
  const prepago = planes && planes.plansMobile && planes.plansMobile.prepago && planes.plansMobile.prepago.planes;
  if (!prepago) return [];
  return prepago.map(p => Number(p.precio));
}
const prepagoPrices = loadPrepagoPrices();

(async () => {
  try {
    const toFix = report.problems.filter(p => p.reasons && p.reasons.some(r => r.includes('missing tipoVenta')));
    console.log(`Found ${toFix.length} docs with missing tipoVenta in report: ${reportPath}`);
    if (toFix.length === 0) return process.exit(0);

    const updates = [];

    for (const item of toFix) {
      const { collection, id } = item;
      const docRef = db.collection(collection).doc(id);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.warn('Doc not found:', collection, id);
        continue;
      }
      const d = snap.data();
      const planPrice = (typeof d.planPrice !== 'undefined' && d.planPrice !== null) ? Number(d.planPrice) : null;

      let inferred = null;
      if (planPrice !== null && prepagoPrices.includes(planPrice)) inferred = 'prepago';
      else inferred = 'nueva';

      const changes = { tipoVenta: inferred, updatedAt: serverTimestamp() };
      updates.push({ ref: docRef, id, collection, changes, before: d });

      console.log(`Will set ${collection}/${id}.tipoVenta = ${inferred} (planPrice=${planPrice})`);
    }

    if (!APPLY) {
      console.log('\nDry-run mode: no writes performed. Re-run with --apply true to commit updates.');
      return process.exit(0);
    }

    // Apply in batches
    const BATCH_SIZE = 200;
    let idx = 0;
    while (idx < updates.length) {
      const batch = db.batch();
      const slice = updates.slice(idx, idx + BATCH_SIZE);
      slice.forEach(u => batch.update(u.ref, u.changes));
      await batch.commit();
      console.log(`Applied batch: updated ${slice.length} documents`);
      idx += BATCH_SIZE;
    }

    // write a small log
    const outLog = path.join(__dirname, '..', 'reports', `applied-fixes-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`);
    const summary = { appliedAt: new Date().toISOString(), count: updates.length, items: updates.map(u => ({ collection: u.collection, id: u.id, changes: u.changes })) };
    fs.writeFileSync(outLog, JSON.stringify(summary, null, 2), 'utf8');
    console.log('Applied fixes summary written to', outLog);
    process.exit(0);
  } catch (err) {
    console.error('Error applying fixes:', err);
    process.exit(1);
  }
})();
