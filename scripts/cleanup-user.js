const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://executiveperformancek.firebaseio.com"
});

const auth = admin.auth();
const db = admin.firestore();

async function deleteUserByEmail(email) {
  try {
    // 1. Obtener el UID del usuario
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado: ${userRecord.uid}`);

    // 2. Eliminar de Firestore (si existe)
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`✅ Documento de Firestore eliminado`);

    // 3. Eliminar de Authentication
    await auth.deleteUser(userRecord.uid);
    console.log(`✅ Usuario eliminado completamente`);
    console.log(`⏳ Email será disponible en 5-10 minutos`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  process.exit(0);
}

// Usar: node cleanup-user.js cnajera@ice.go.cr
const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.log('Uso: node cleanup-user.js usuario@email.com');
  process.exit(1);
}

deleteUserByEmail(emailToDelete);
