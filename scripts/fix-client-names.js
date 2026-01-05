// Script para corregir nombres de clientes en Firestore
// Busca clientes sin 'name' y copia el valor de 'nombre' si existe

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Usa el archivo de credenciales y el projectId correcto
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

async function fixClientNames() {
  const snapshot = await db.collection('clients').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Si no tiene 'name' pero sí 'nombre', actualiza
    if ((!data.name || data.name === '') && data.nombre && data.nombre !== '') {
      await db.collection('clients').doc(doc.id).update({ name: data.nombre });
      console.log(`Actualizado cliente ${doc.id}: name <- nombre (${data.nombre})`);
      updated++;
    }
    // Si no tiene ninguno, muestra advertencia
    if ((!data.name || data.name === '') && (!data.nombre || data.nombre === '')) {
      console.warn(`Cliente ${doc.id} sin nombre ni name.`);
    }
  }
  console.log(`Total clientes actualizados: ${updated}`);
}

fixClientNames().catch(console.error);