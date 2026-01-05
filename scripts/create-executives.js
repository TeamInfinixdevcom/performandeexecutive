const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const auth = admin.auth();
const db = admin.firestore();

async function createExecutive(name, email, password) {
  try {
    console.log(`\n📝 Creando ejecutivo: ${name}`);
    console.log(`   Email: ${email}\n`);

    // Crear usuario en Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    console.log(`✅ Usuario creado en Firebase Auth`);
    console.log(`   UID: ${userRecord.uid}`);

    // Guardar en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'executive',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: 'admin-system'
    });

    console.log(`✅ Usuario guardado en Firestore con rol: executive\n`);
    console.log(`🎯 Credenciales para login:`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}\n`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
    return false;
  }
}

// Crear 2 ejecutivos de ejemplo
async function main() {
  console.log('🚀 Creando ejecutivos ICE...\n');

  await createExecutive('Gerente Ejecutivo 1', 'ejecutivo1@ice.go.cr', 'Ejecutivo@123');
  await createExecutive('Gerente Ejecutivo 2', 'ejecutivo2@ice.go.cr', 'Ejecutivo@456');

  console.log('✅ ¡Ejecutivos creados exitosamente!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
