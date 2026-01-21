/*
 scripts/fix-ventas-fecha-by-uid.js
 Uso: node scripts/fix-ventas-fecha-by-uid.js --uid <UID> [--dry-run] [--serviceAccount path/to/serviceAccount.json]

 Actualiza documentos en `ventas` y `ventas_hogar` donde `uid == <UID>` y `fecha` es ausente o no corresponde al mes de `createdAt`.
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const uid = argv['uid'];
const dryRun = !!argv['dry-run'] || !!argv['dryrun'];
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!uid) { console.error('Uso: --uid <UID>'); process.exit(1); }
if (!fs.existsSync(svcPath)) { console.error('Service account JSON no encontrado:', svcPath); process.exit(1); }
const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function toDateObj(raw) {
  if (!raw) return null;
  if (raw.toDate && typeof raw.toDate === 'function') return raw.toDate();
  try { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; } catch (e) { return null; }
}

function isSameMonthYear(a, b) {
  if (!a || !b) return false;
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

async function run() {
  console.log('Running fix (dryRun=%s) for uid=%s', dryRun, uid);
  const cols = ['ventas','ventas_hogar'];
  const updates = [];

  for (const col of cols) {
    const snap = await db.collection(col).where('uid','==',uid).get();
    console.log(`Found ${snap.size} in ${col}`);
    snap.forEach(doc => {
      const d = doc.data();
      const fechaRaw = d.fecha || null;
      const createdRaw = d.createdAt || d.created || null;
      const fechaDate = toDateObj(fechaRaw);
      const createdDate = toDateObj(createdRaw);
      if (!createdDate) return; // nothing to use
      if (!fechaDate || !isSameMonthYear(fechaDate, createdDate)) {
        updates.push({ collection: col, id: doc.id, setFecha: createdDate.toISOString(), oldFecha: fechaRaw });
      }
    });
  }

  console.log(`Detected ${updates.length} docs to update.`);
  updates.forEach(u => console.log(`${u.collection}/${u.id}: set fecha=${u.setFecha} (old: ${u.oldFecha})`));

  if (dryRun) { console.log('Dry-run complete. No changes applied.'); return; }

  // apply updates in batches
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;
  for (const u of updates) {
    const ref = db.collection(u.collection).doc(u.id);
    batch.update(ref, { fecha: u.setFecha, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    count++;
    if (count % BATCH_SIZE === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (count % BATCH_SIZE !== 0) await batch.commit();
  console.log(`Applied updates to ${updates.length} documents.`);
}

run().then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1);});
