/*
  scripts/migrate-add-executiveid.js

  Uso: node migrate-add-executiveid.js [--dry-run] [--serviceAccount path/to/serviceAccount.json]

  - Lee todos los documentos de la colección `clients` y para cada documento que NO tenga
    el campo `executiveId` intenta inferir un candidato seguro (ej: `uid`, `createdBy`, `ownerUid`, `executiveUid`) y
    lo escribe como `executiveId`.
  - Tiene `--dry-run` para listar los cambios sin aplicarlos.

  Requisitos:
  - Node.js instalado
  - Instalar dependencias: `npm install firebase-admin` (en el workspace raíz)
  - Si corres localmente y tienes el service account JSON en la raíz del repo, no necesitas pasar --serviceAccount
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));
const dryRun = !!argv['dry-run'] || !!argv['dryrun'];
const svcPath = argv['serviceAccount'] || argv['serviceaccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!fs.existsSync(svcPath)) {
  console.warn(`Service account not found at ${svcPath}. Please provide --serviceAccount path or place the JSON in project root.`);
  process.exitCode = 1;
}

const serviceAccount = require(path.resolve(svcPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  console.log('Starting migration (dryRun=%s)...', dryRun);

  const snapshot = await db.collection('clients').get();
  console.log(`Found ${snapshot.size} client documents`);

  let updates = 0;
  let skipped = 0;
  let toSkipList = [];

  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.executiveId) continue; // ya tiene executiveId

    // Heurísticas seguras (ordenadas)
    const candidate = data.uid || data.createdBy || data.ownerUid || data.executiveUid || data.executiveId || null;

    if (candidate && typeof candidate === 'string' && candidate.length > 0) {
      console.log(`[PATCH] ${doc.id} -> executiveId = ${candidate}`);
      if (!dryRun) {
        batch.update(db.collection('clients').doc(doc.id), { executiveId: candidate });
        batchCount++;
        updates++;
      }
    } else {
      console.log(`[SKIP ] ${doc.id} -> no candidate found`);
      skipped++;
      toSkipList.push(doc.id);
    }

    if (batchCount >= BATCH_SIZE) {
      console.log('Committing batch...');
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (!dryRun && batchCount > 0) {
    console.log('Committing final batch...');
    await batch.commit();
  }

  console.log('Done. Updates=%d, Skipped=%d', updates, skipped);
  if (skipped > 0) {
    console.log('Skipped document IDs (inspect manually):');
    console.log(toSkipList.join('\n'));
  }
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
