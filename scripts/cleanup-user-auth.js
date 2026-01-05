const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function deleteUserByEmail(email) {
  try {
    console.log(`🔍 Buscando usuario con email: ${email}`);
    
    // Obtener el usuario por email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado - UID: ${userRecord.uid}`);
    console.log(`📧 Email: ${userRecord.email}`);
    console.log(`📝 Nombre: ${userRecord.displayName || 'N/A'}`);
    
    // Eliminar el usuario
    await auth.deleteUser(userRecord.uid);
    console.log(`\n✅ ✅ ✅ Usuario ELIMINADO de Authentication`);
    console.log(`⏳ El email será disponible en 5-10 minutos`);
    console.log(`💡 Intenta crear el usuario nuevamente después\n`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ Usuario no encontrado con ese email`);
      console.log(`✅ El email ya está disponible para usar`);
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  process.exit(0);
}

// Usar: node cleanup-user-auth.js cnajera@ice.go.cr
const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.log('📌 Uso: node cleanup-user-auth.js usuario@email.com');
  console.log('📌 Ejemplo: node cleanup-user-auth.js cnajera@ice.go.cr\n');
  process.exit(1);
}

console.log('🚀 Limpiando usuario de Firebase Authentication...\n');
deleteUserByEmail(emailToDelete);
