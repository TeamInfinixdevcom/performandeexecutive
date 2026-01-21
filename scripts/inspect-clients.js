/*
  scripts/inspect-clients.js
  Lista los primeros N documentos de `clients` mostrando si tienen `executiveId`
  y los campos candidatos para la migración: uid, createdBy, ownerUid, executiveUid.

  Uso: node scripts/inspect-clients.js [N]
*/

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const svcPath = process.argv.slice(2).find(a => !isNaN(parseInt(a)) === false && a !== '--') || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const limitArg = parseInt(process.argv[2]) || 10;

if (!fs.existsSync(svcPath)) {
  console.error(`Service account not found at ${svcPath}. Place it in repo root or pass --serviceAccount path.`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('clients').limit(limitArg).get();
  console.log(`Inspecting ${snapshot.size} clients:`);
  let i = 0;
  snapshot.forEach(doc => {
    i++;
    const d = doc.data() || {};
    console.log(`\n[${i}] id=${doc.id}`);
    console.log(`  executiveId: ${d.executiveId || '(missing)'}`);
    console.log(`  uid: ${d.uid || '(missing)'}; createdBy: ${d.createdBy || '(missing)'}; ownerUid: ${d.ownerUid || '(missing)'}; executiveUid: ${d.executiveUid || '(missing)'}`);
    console.log(`  createdAt: ${d.createdAt ? d.createdAt.toDate?.().toISOString?.() || String(d.createdAt) : '(no createdAt)'}`);
  });
  if (snapshot.size === 0) console.log('No client documents found.');
}

run().then(() => process.exit(0)).catch(err => { console.error('Error:', err); process.exit(1); });
