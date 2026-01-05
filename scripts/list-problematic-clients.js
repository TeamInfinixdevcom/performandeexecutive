// Script para listar clientes con name vacío o igual a 'undefined'
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

async function listProblematicClients() {
  const snapshot = await db.collection('clients').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.name || data.name === '' || data.name === 'undefined') {
      console.log(`Cliente problemático: id=${doc.id}, name='${data.name}', nombre='${data.nombre || ''}'`);
      count++;
    }
  }
  console.log(`Total clientes problemáticos: ${count}`);
}

listProblematicClients().catch(console.error);