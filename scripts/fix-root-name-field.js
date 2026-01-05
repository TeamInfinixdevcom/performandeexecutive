// Script para corregir el campo 'name' en la raíz del documento cliente
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

async function fixRootNameField() {
  const snapshot = await db.collection('clients').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let newName = data.nombre || '';
    // Si no hay 'nombre', intenta usar el primer 'interactions.name'
    if (!newName && Array.isArray(data.interactions) && data.interactions.length > 0) {
      newName = data.interactions[0].name || '';
    }
    // Si el campo raíz 'name' está vacío, lo actualiza
    if (!data.name || data.name === '' || data.name === 'undefined') {
      if (newName) {
        await db.collection('clients').doc(doc.id).update({ name: newName });
        console.log(`Actualizado cliente ${doc.id}: name <- '${newName}'`);
        updated++;
      } else {
        console.warn(`Cliente ${doc.id} sin nombre disponible.`);
      }
    }
  }
  console.log(`Total clientes actualizados: ${updated}`);
}

fixRootNameField().catch(console.error);