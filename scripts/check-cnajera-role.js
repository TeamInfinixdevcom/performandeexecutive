const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../firebase-SEGURO.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://servicio-tecnico-8d0e2.firebaseio.com'
});

const db = admin.firestore();

async function checkCnajeraRole() {
  try {
    console.log('🔍 Buscando a cnajera...\n');

    const snapshot = await db.collection('users')
      .where('email', '==', 'cnajera@ice.go.cr')
      .get();

    if (snapshot.empty) {
      console.error('❌ Usuario no encontrado');
      process.exit(1);
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('📋 DATOS DE CNAJERA:');
    console.log(`   UID: ${userId}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nombre: ${userData.displayName || userData.name || 'N/A'}`);
    console.log(`   Rol ACTUAL: ${userData.role}`);
    console.log(`   Es Admin: ${userData.role === 'admin' ? '🚨 SÍ (INCORRECTO)' : '✅ No (correcto)'}`);
    console.log(`   Activo: ${userData.isActive}`);

    if (userData.role === 'admin') {
      console.log('\n⚠️ ERROR: cnajera tiene rol de admin cuando NO debería ser admin');
      console.log('\n💡 SOLUCIÓN: Cambiar rol a "ejecutivo_standard"');
      
      // Preguntar si cambiar
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\n¿Cambiar rol a ejecutivo_standard? (s/n): ', async (answer) => {
        if (answer.toLowerCase() === 's') {
          await db.collection('users').doc(userId).update({
            role: 'ejecutivo_standard',
            fixedAt: admin.firestore.FieldValue.serverTimestamp(),
            fixedBy: 'check-cnajera-role'
          });
          console.log('\n✅ Rol cambiado a ejecutivo_standard');
        }
        rl.close();
        process.exit(0);
      });
    } else {
      console.log('\n✅ cnajera tiene el rol correcto');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCnajeraRole();
