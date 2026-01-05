/**
 * Script para eliminar colecciones legacy de Firestore: ventas, Pedidos, MetasVentasAnuales, metas, execution_metas
 * NO elimina la colección de clientes.
 * Uso: node delete-legacy-collections.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Cambia el nombre del archivo de credenciales si es necesario
const serviceAccount = require(path.join(__dirname, 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const collectionsToDelete = [
  'ventas',
  'Pedidos',
  'MetasVentasAnuales',
  'metas',
  'execution_metas'
];

async function deleteCollection(collName) {
  const snapshot = await db.collection(collName).get();
  if (snapshot.empty) {
    console.log(`✅ Colección vacía o no existe: ${collName}`);
    return;
  }
  let deleted = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    deleted++;
  }
  console.log(`🗑️ Eliminados ${deleted} documentos de ${collName}`);
}

(async () => {
  for (const coll of collectionsToDelete) {
    try {
      await deleteCollection(coll);
    } catch (err) {
      console.error(`❌ Error eliminando ${coll}:`, err.message);
    }
  }
  console.log('🎉 Limpieza de colecciones legacy completada.');
  process.exit(0);
})();
