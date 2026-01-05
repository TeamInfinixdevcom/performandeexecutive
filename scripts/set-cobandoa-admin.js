/**
 * CAMBIAR ROL DE USUARIO A ADMIN
 * Cambiar cobandoa de executive a admin
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const db = admin.firestore();

async function cambiarRolAdmin() {
  try {
    const email = 'cobandoa@ice.go.cr';
    
    console.log(`🔄 Buscando usuario: ${email}...\n`);

    // Buscar usuario por email
    const snapshot = await db.collection('users').where('email', '==', email).get();

    if (snapshot.empty) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    console.log('📋 Datos actuales:');
    console.log(`   Nombre: ${userData.name}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Rol actual: ${userData.role}`);
    console.log(`   UID: ${userDoc.id}\n`);

    // Cambiar rol a admin
    await db.collection('users').doc(userDoc.id).update({
      role: 'admin'
    });

    console.log('✅ Rol cambiado exitosamente a: admin');
    console.log('\n👨‍💼 cobandoa ahora tiene permisos de administrador');
    console.log('   - Verá el botón "Panel Admin"');
    console.log('   - Verá la pestaña "Todas las Ventas"');
    console.log('   - Debe cerrar sesión y volver a entrar para ver los cambios\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cambiarRolAdmin();
