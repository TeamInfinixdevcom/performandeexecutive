/**
 * SCRIPT SIMPLE PARA BUSCAR Y LISTAR TODOS LOS USUARIOS
 */

const admin = require('firebase-admin');
const serviceAccount = require('../executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listAllUsers() {
  try {
    console.log('\n📋 LISTANDO TODOS LOS USUARIOS EN FIRESTORE:\n');

    const usersSnapshot = await db.collection('users').get();

    console.log(`Total de usuarios: ${usersSnapshot.size}\n`);

    usersSnapshot.docs.forEach((doc, index) => {
      const user = doc.data();
      console.log(`${index + 1}. ${user.email || 'Sin email'}`);
      console.log(`   UID: ${doc.id}`);
      console.log(`   Role: ${user.role || 'No especificado'}`);
      console.log(`   isActive: ${user.isActive}`);
      console.log(`   Display Name: ${user.displayName || 'No especificado'}`);
      console.log('');
    });

    process.exit(0);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

listAllUsers();
