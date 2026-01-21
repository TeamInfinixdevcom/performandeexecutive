/*
 scripts/migrate-ventas-fecha.js

 Uso: node migrate-ventas-fecha.js --uid <USER_UID> [--dry-run] [--serviceAccount path/to/serviceAccount.json]
    o: node migrate-ventas-fecha.js --cedula <CEDULA> [--dry-run]

 Este script busca documentos en `ventas` y `ventas_hogar` para un executive (por `executiveId`/`uid`) o por `cedulaCliente`.
 Si `fecha` está ausente o no corresponde a enero mientras `createdAt` sí es enero, actualizará `fecha` con el valor de `createdAt`.

 Opciones:
  --dry-run    : sólo listar acciones, no aplicar
  --serviceAccount : ruta al JSON de service account (si no está en repo root)

 Precauciones: siempre ejecutar con --dry-run primero.
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const dryRun = !!argv['dry-run'] || !!argv['dryrun'];
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const uid = argv['uid'] || null;
const cedula = argv['cedula'] || null;

if (!uid && !cedula) {
  console.error('Debe indicar --uid <USER_UID> o --cedula <CEDULA>');
  process.exit(1);
}

if (!fs.existsSync(svcPath)) {
  console.warn(`Service account not found at ${svcPath}. Please provide --serviceAccount path or place the JSON in project root.`);
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

async function findVentas() {
  const collections = ['ventas', 'ventas_hogar'];
  const results = [];

  for (const col of collections) {
    let q;
    if (uid) {
      q = db.collection(col).where('executiveId', '==', uid);
    } else {
      q = db.collection(col).where('cedulaCliente', '==', cedula);
    }

    const snap = await q.get();
    snap.forEach(doc => results.push({ id: doc.id, collection: col, data: doc.data() }));
  }
  return results;
}

function isJanuary(date) {
  if (!date) return false;
  return date.getMonth() === 0; // Enero = 0
}

async function run() {
  console.log('Starting ventas fecha migration (dryRun=%s)...', dryRun);
  const ventas = await findVentas();
  console.log(`Found ${ventas.length} ventas for ${uid ? 'uid:'+uid : 'cedula:'+cedula}`);

  const toUpdate = [];

  for (const v of ventas) {
    const doc = v;
    const data = doc.data || doc.data;

    const fechaRaw = data.fecha || null;
    const createdRaw = data.createdAt || data.created_at || data.created || null;

    const fechaDate = toDateObj(fechaRaw);
    const createdDate = toDateObj(createdRaw);

    // Si createdDate es Enero y (fecha ausente o no enero) -> corregir
    if (createdDate && isJanuary(createdDate) && (!fechaDate || !isJanuary(fechaDate))) {
      toUpdate.push({ docId: doc.id, collection: doc.collection, setFechaISO: createdDate.toISOString(), createdDateStr: createdDate.toISOString(), oldFecha: fechaRaw });
    }
  }

  console.log(`Detected ${toUpdate.length} documents to update.`);
  if (toUpdate.length === 0) return;

  toUpdate.forEach(u => console.log(`Would update ${u.collection}/${u.docId}: set fecha=${u.setFechaISO} (old: ${u.oldFecha})`));

  if (dryRun) {
    console.log('Dry-run finished. No changes applied.');
    return;
  }

  // Apply updates in batches
  const BATCH_SIZE = 500;
  let batch = db.batch();
  let count = 0;

  for (const u of toUpdate) {
    const ref = db.collection(u.collection).doc(u.docId);
    batch.update(ref, { fecha: u.setFechaISO, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    count++;
    if (count % BATCH_SIZE === 0) {
      console.log('Committing batch...');
      await batch.commit();
      batch = db.batch();
    }
  }
  // commit remaining
  if (count % BATCH_SIZE !== 0) await batch.commit();

  console.log(`Applied updates to ${toUpdate.length} documents.`);
}

run().then(() => process.exit(0)).catch(err => { console.error('Migration failed:', err); process.exit(1); });
