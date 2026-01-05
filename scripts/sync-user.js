const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function syncUserToFirestore(email) {
  try {
    console.log(`🔍 Buscando usuario en Authentication: ${email}`);
    
    // 1. Obtener usuario de Authentication
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado en Auth - UID: ${userRecord.uid}`);
    
    // 2. Verificar si existe en Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (userDoc.exists) {
      console.log(`✅ Usuario ya existe en Firestore`);
      console.log(userDoc.data());
      return;
    }
    
    // 3. Crear documento en Firestore
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || email.split('@')[0],
      role: 'executive', // o 'admin' si quieres
      createdAt: new Date(),
      isActive: true,
      lastLogin: new Date()
    };
    
    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log(`\n✅ ✅ ✅ Usuario creado en Firestore`);
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Nombre: ${userData.name}`);
    console.log(`🔐 Rol: ${userData.role}`);
    console.log(`\n💡 Ya puedes acceder a la app`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }

  process.exit(0);
}

const email = process.argv[2];

if (!email) {
  console.log('📌 Uso: node sync-user.js usuario@email.com');
  console.log('📌 Ejemplo: node sync-user.js admin@ice.cr\n');
  process.exit(1);
}

console.log('🚀 Sincronizando usuario a Firestore...\n');
syncUserToFirestore(email);
