/**
 * SCRIPT PARA ELIMINAR CLIENTES DEL ADMIN
 * 
 * Ejecutar con:
 * node delete-clients-admin.js
 * 
 * Este script conecta directamente a Firebase Admin SDK
 * y elimina TODOS los clientes del usuario admin (rmadrigalj@ice.go.cr)
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();

/**
 * Función para eliminar clientes del admin
 */
async function deleteAdminClients() {
  try {
    console.log('🔍 Buscando clientes del admin...\n');

    // UID del admin (rmadrigalj@ice.go.cr) - obtener del Firestore
    // Primero necesitamos buscar el usuario por email
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', 'rmadrigalj@ice.go.cr')
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ No se encontró el usuario admin.');
      process.exit(1);
    }

    const adminUser = usersSnapshot.docs[0].data();
    const adminUid = usersSnapshot.docs[0].id;

    console.log(`✅ Usuario encontrado: ${adminUser.email}`);
    console.log(`   UID: ${adminUid}\n`);

    // Buscar todos los clientes del admin
    const clientsSnapshot = await db
      .collection('clients')
      .where('executiveId', '==', adminUid)
      .get();

    console.log(`📊 Total de clientes encontrados: ${clientsSnapshot.size}\n`);

    if (clientsSnapshot.empty) {
      console.log('✅ No hay clientes para eliminar.');
      process.exit(0);
    }

    // Mostrar clientes a eliminar
    console.log('📋 Clientes a eliminar:\n');
    clientsSnapshot.docs.forEach((doc, index) => {
      const client = doc.data();
      console.log(`${index + 1}. ${client.name} (Cédula: ${client.cedula})`);
    });

    console.log('\n⚠️  CONFIRMACIÓN REQUERIDA\n');
    console.log(`Se van a eliminar ${clientsSnapshot.size} cliente(s).`);
    console.log('Esta acción NO afectará a Cristian ni otros usuarios.');
    console.log('\n🔄 Procediendo con la eliminación en 3 segundos...\n');

    // Esperar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Eliminar en lotes
    const batch = db.batch();
    let deletedCount = 0;

    clientsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    // Ejecutar eliminación
    await batch.commit();

    console.log(`\n✅ ÉXITO: Se eliminaron ${deletedCount} cliente(s) del admin.`);
    console.log('✅ Los clientes de Cristian permanecen intactos.\n');

    // Log de auditoría
    await db.collection('audit_logs').add({
      userId: adminUid,
      action: 'BULK_DELETE_CLIENTS',
      resource: 'clients',
      details: {
        deletedCount: deletedCount,
        timestamp: new Date(),
        note: 'Eliminación masiva de clientes del admin'
      }
    });

    console.log('📝 Auditoría registrada.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
console.log('\n╔════════════════════════════════════════╗');
console.log('║   ELIMINADOR DE CLIENTES - ADMIN SDK   ║');
console.log('╚════════════════════════════════════════╝\n');

deleteAdminClients();
