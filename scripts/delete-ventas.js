/**
 * ELIMINAR VENTAS ESPECÍFICAS
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const db = admin.firestore();

const ventasAEliminar = [
  'kue4W6NPOcspiRSSSKFP',
  'hnkSFlzVgygQEJaTzjAp',
  'o633cEAWlg8Dkpv8NJNo',
  'R352Wax7VQJKBVYvM2Mf',
  'tKNPTePyMBRtCds1Axkp'
];

async function eliminarVentas() {
  try {
    console.log('🗑️  Eliminando ventas...\n');

    for (const ventaId of ventasAEliminar) {
      // Intentar eliminar de ventas primero
      try {
        await db.collection('ventas').doc(ventaId).delete();
        console.log(`✅ Eliminado de 'ventas': ${ventaId}`);
      } catch (error) {
        // Si no existe en ventas, intentar en ventas_hogar
        try {
          await db.collection('ventas_hogar').doc(ventaId).delete();
          console.log(`✅ Eliminado de 'ventas_hogar': ${ventaId}`);
        } catch (error2) {
          console.log(`⚠️  No encontrado: ${ventaId}`);
        }
      }
    }

    console.log('\n✅ ¡Eliminación completada!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

eliminarVentas();
