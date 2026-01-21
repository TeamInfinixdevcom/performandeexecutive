/*
 scripts/list-ventas-by-uid.js
 Uso: node scripts/list-ventas-by-uid.js --uid <UID> [--serviceAccount path/to/serviceAccount.json]
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const uid = argv['uid'];
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!uid) {
  console.error('Uso: node scripts/list-ventas-by-uid.js --uid <UID>');
  process.exit(1);
}
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON no encontrado en', svcPath);
  process.exit(1);
}
const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
  const cols = ['ventas', 'ventas_hogar'];
  let total = 0;
  for (const col of cols) {
    const q = db.collection(col).where('uid', '==', uid);
    const snap = await q.get();
    console.log(`\nCollection: ${col} - found ${snap.size}`);
    snap.forEach(doc => {
      const d = doc.data();
      const fecha = d.fecha && d.fecha.toDate ? d.fecha.toDate().toISOString() : d.fecha || null;
      const created = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || null;
      console.log(JSON.stringify({ id: doc.id, collection: col, fecha, createdAt: created, planPrice: d.planPrice, tipoVenta: d.tipoVenta, tipoPedido: d.tipoPedido, cedulaCliente: d.cedulaCliente }));
      total++;
    });
  }
  console.log(`\nTotal documents found: ${total}`);
}

run().then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1);});
