/**
 * scripts/migrate-set-month.js
 *
 * Uso:
 *  node migrate-set-month.js --month 0 --year 2026 --collections ventas,ventas_hogar --dry-run --serviceAccount path/to/serviceAccount.json
 *
 * Opciones:
 *  --month: 0-11 (0 = Enero). Default: 0
 *  --year: año objetivo. Default: current year
 *  --collections: lista separada por comas de colecciones a procesar. Default: ventas,ventas_hogar
 *  --batchSize: tamaño del batch (default 200)
 *  --dry-run: no aplica cambios, solo lista
 *  --serviceAccount: ruta al service account JSON (si no está en repo root)
 *
 * Precaución: ejecutar primero con --dry-run.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const targetMonth = typeof argv.month !== 'undefined' ? parseInt(argv.month, 10) : 0; // Enero por defecto
const targetYear = typeof argv.year !== 'undefined' ? parseInt(argv.year, 10) : (new Date()).getFullYear();
const collectionsArg = argv.collections || 'ventas,ventas_hogar';
const collections = collectionsArg.split(',').map(s => s.trim()).filter(Boolean);
const batchSize = parseInt(argv.batchSize || 200, 10);
const dryRun = !!argv['dry-run'] || !!argv['dryrun'];
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!fs.existsSync(svcPath)) {
  console.error(`Service account not found at ${svcPath}. Please provide --serviceAccount path or place the JSON in project root.`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function toDateObj(raw) {
  if (!raw) return null;
  if (raw.toDate && typeof raw.toDate === 'function') return raw.toDate();
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
}

async function processCollection(colName) {
  console.log(`\nProcessing collection: ${colName}`);
  let lastDoc = null;
  let total = 0;
  let toApply = [];

  while (true) {
    let q = db.collection(colName).orderBy('__name__').limit(batchSize);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    for (const docSnap of snap.docs) {
      const id = docSnap.id;
      const data = docSnap.data();

      const rawDate = data.createdAt || data.fecha || data.created || data.created_at || null;
      let dateObj = toDateObj(rawDate);

      if (!dateObj) {
        // If no date, assign first of target month (stagger day by index)
        dateObj = new Date(targetYear, targetMonth, 1);
      } else {
        // Keep day/time but move to target month/year
        const day = Math.min(dateObj.getDate(), 28); // avoid invalid days
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const seconds = dateObj.getSeconds();
        dateObj = new Date(targetYear, targetMonth, day, hours, minutes, seconds, dateObj.getMilliseconds());
      }

      // Prepare update payload
      const newFechaISO = dateObj.toISOString();
      const newCreatedAt = admin.firestore.Timestamp.fromDate(dateObj);

      toApply.push({ id, collection: colName, newFechaISO, newCreatedAt });
      total++;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }

  console.log(`Found ${total} documents in ${colName}.`);

  if (toApply.length === 0) return 0;

  if (dryRun) {
    toApply.slice(0, 50).forEach((u, i) => console.log(`[DRY] ${u.collection}/${u.id} => fecha=${u.newFechaISO}`));
    if (toApply.length > 50) console.log(`[DRY] ... and ${toApply.length - 50} more`);
    return toApply.length;
  }

  // Apply updates in batches
  let applied = 0;
  let batch = db.batch();
  for (let i = 0; i < toApply.length; i++) {
    const u = toApply[i];
    const ref = db.collection(u.collection).doc(u.id);
    batch.update(ref, { fecha: u.newFechaISO, createdAt: u.newCreatedAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    applied++;
    if (applied % batchSize === 0) {
      console.log(`Committing batch of ${batchSize}...`);
      await batch.commit();
      batch = db.batch();
    }
  }

  // commit remaining
  await batch.commit();
  console.log(`Applied updates to ${applied} documents in ${colName}.`);
  return applied;
}

async function run() {
  console.log(`Starting migrate-set-month (month=${targetMonth}, year=${targetYear}, dryRun=${dryRun})`);
  let grandTotal = 0;
  for (const col of collections) {
    try {
      const applied = await processCollection(col);
      grandTotal += applied;
    } catch (err) {
      console.error(`Error processing ${col}:`, err);
    }
  }

  console.log(`\nDone. Total documents processed: ${grandTotal}`);
}

run().then(() => process.exit(0)).catch(err => { console.error('Migration failed:', err); process.exit(1); });
