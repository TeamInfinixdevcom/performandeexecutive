/**
 * Limpiar datos de prueba
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function cleanup() {
    console.log('🧹 Limpiando datos de prueba...\n');

    try {
        // Eliminar todas las ventas y metas de prueba
        const testUserId = '1234567890';

        const salesSnapshot = await db.collection('pedidos_ventas')
            .where('executiveId', '==', testUserId)
            .get();

        console.log(`Eliminando ${salesSnapshot.size} ventas de prueba...`);
        for (const doc of salesSnapshot.docs) {
            await doc.ref.delete();
        }

        const metaDoc = await db.collection('metas_ventas_anuales').doc(testUserId).get();
        if (metaDoc.exists) {
            await metaDoc.ref.delete();
            console.log('Meta de prueba eliminada');
        }

        console.log('✅ Limpieza completada\n');
    } catch (error) {
        console.error('Error:', error);
    }

    process.exit(0);
}

cleanup();
