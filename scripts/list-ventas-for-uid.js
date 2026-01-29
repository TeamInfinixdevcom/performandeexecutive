#!/usr/bin/env node
/**
 * list-ventas-for-uid.js
 * Lista documentos en `ventas` y `ventas_hogar` asociados a un `uid` o `email` (uid/agenteId/executiveId).
 * Uso:
 *  node scripts/list-ventas-for-uid.js --serviceAccount=/path/to/sa.json --uid=T8OdsUAbGNfGT4PouAMb6HGePxH2 --email=cnajera@ice.go.cr --out=cnajera-ventas.json
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    }
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const serviceAccount = args.serviceAccount;
  const uid = args.uid;
  const email = args.email;
  const outFile = args.out || `ventas-${uid || email || 'report'}.json`;

  if (!serviceAccount) {
    console.error('ERROR: --serviceAccount required');
    process.exit(1);
  }
  if (!uid && !email) {
    console.error('ERROR: provide --uid or --email');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  const saPath = path.resolve(serviceAccount);
  if (!fs.existsSync(saPath)) {
    console.error('ERROR: serviceAccount file not found:', saPath);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  const db = admin.firestore();

  const collections = ['ventas', 'ventas_hogar'];
  const results = [];
  const seen = new Set();

  for (const coll of collections) {
    // Query by uid
    if (uid) {
      const snap = await db.collection(coll).where('uid', '==', uid).get();
      snap.forEach(doc => {
        if (!seen.has(doc.id + '|' + coll)) {
          seen.add(doc.id + '|' + coll);
          results.push({ id: doc.id, collection: coll, data: doc.data() });
        }
      });
    }

    // Query by agenteId == uid
    if (uid) {
      const snap = await db.collection(coll).where('agenteId', '==', uid).get();
      snap.forEach(doc => {
        if (!seen.has(doc.id + '|' + coll)) {
          seen.add(doc.id + '|' + coll);
          results.push({ id: doc.id, collection: coll, data: doc.data() });
        }
      });
    }

    // Query by agenteId == email
    if (email) {
      const snap = await db.collection(coll).where('agenteId', '==', email).get();
      snap.forEach(doc => {
        if (!seen.has(doc.id + '|' + coll)) {
          seen.add(doc.id + '|' + coll);
          results.push({ id: doc.id, collection: coll, data: doc.data() });
        }
      });
    }

    // Query by executiveId == uid
    if (uid) {
      const snap = await db.collection(coll).where('executiveId', '==', uid).get();
      snap.forEach(doc => {
        if (!seen.has(doc.id + '|' + coll)) {
          seen.add(doc.id + '|' + coll);
          results.push({ id: doc.id, collection: coll, data: doc.data() });
        }
      });
    }
  }

  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: results.length, rows: results }, null, 2));
  console.log(`Wrote ${results.length} documents to ${outFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
