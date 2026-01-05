/**
 * VERIFICAR ROLES DE USUARIOS
 * Muestra todos los usuarios y sus roles
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const db = admin.firestore();

async function verificarRoles() {
  try {
    console.log('🔍 Verificando roles de usuarios...\n');

    const snapshot = await db.collection('users').get();

    console.log(`Total usuarios: ${snapshot.size}\n`);
    console.log('=' .repeat(80));

    snapshot.forEach(doc => {
      const data = doc.data();
      const role = data.role || 'sin rol';
      const name = data.name || data.email || 'Sin nombre';
      const email = data.email || 'Sin email';
      const region = data.region || 'Sin región';

      const icon = role === 'admin' ? '👨‍💼' : '👤';
      const roleColor = role === 'admin' ? 'ADMIN' : role;

      console.log(`${icon} ${name}`);
      console.log(`   Email: ${email}`);
      console.log(`   Rol: ${roleColor}`);
      console.log(`   Región: ${region}`);
      console.log(`   UID: ${doc.id}`);
      console.log('-'.repeat(80));
    });

    console.log('\n✅ Verificación completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarRoles();
