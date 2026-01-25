/*
  scripts/migrate-add-updatedAt.js

  Uso: node migrate-add-updatedAt.js [--dry-run] [--serviceAccount path/to/serviceAccount.json]

  - Busca documentos en `clients` que no tengan `updatedAt` y propone/añade un valor.
  - Valor propuesto: `createdAt` si existe, sino `serverTimestamp()`.
  - Tiene `--dry-run` para listar los cambios sin aplicarlos.
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
  console.log('Starting update-updatedAt migration (dryRun=%s)...', dryRun);

  const snapshot = await db.collection('clients').get();
  console.log(`Found ${snapshot.size} client documents`);

  let updates = 0;
  let skipped = 0;
  const toUpdate = [];

  const BATCH_SIZE = 500;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.updatedAt) continue; // ya tiene updatedAt

    // Usar createdAt si existe, sino indicar que usaremos serverTimestamp()
    const useCreatedAt = !!data.createdAt;
    toUpdate.push({ id: doc.id, createdAt: data.createdAt ? data.createdAt.toDate ? data.createdAt : data.createdAt : null, useCreatedAt });

    if (!dryRun) {
      const updatePayload = {};
      if (useCreatedAt) updatePayload.updatedAt = data.createdAt;
      else updatePayload.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      batch.update(db.collection('clients').doc(doc.id), updatePayload);
      batchCount++;
      updates++;
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

  console.log('Dry-run=%s -> Candidates=%d, Applied=%d, Skipped=%d', dryRun, toUpdate.length, updates, skipped);
  if (toUpdate.length > 0) {
    console.log('Sample of documents to update (first 20):');
    toUpdate.slice(0,20).forEach(item => {
      console.log(`  - ${item.id} -> useCreatedAt=${item.useCreatedAt}`);
    });
  }

  console.log('Done.');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
