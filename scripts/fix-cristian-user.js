/**
 * SCRIPT PARA VERIFICAR Y CORREGIR USUARIO CRISTIAN
 * 
 * Ejecutar con:
 * node fix-cristian-user.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();
const auth = admin.auth();

/**
 * Función para verificar y corregir Cristian
 */
async function fixCristianUser() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   VERIFICADOR Y CORRECTOR DE USUARIOS   ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('🔍 Buscando usuario Cristian en Auth...\n');

    // Buscar Cristian en Firebase Auth por email
    let cristianAuth = null;
    const users = await auth.listUsers(100); // Obtener primeros 100 usuarios
    
    users.users.forEach(user => {
      if (user.email && user.email.toLowerCase().includes('cristian')) {
        cristianAuth = user;
      }
    });

    if (!cristianAuth) {
      console.log('❌ No se encontró usuario Cristian en Firebase Auth');
      console.log('   Buscando en Firestore...\n');

      // Buscar en Firestore por nombre
      const usersSnapshot = await db
        .collection('users')
        .where('displayName', '>=', 'Cristian')
        .where('displayName', '<=', 'Cristian\uf8ff')
        .get();

      if (usersSnapshot.empty) {
        console.log('❌ No se encontró usuario Cristian en ningún lado');
        console.log('   Por favor proporciona el email exacto de Cristian\n');
        process.exit(1);
      }

      const cristianFirestore = usersSnapshot.docs[0];
      console.log(`✅ Encontrado en Firestore: ${cristianFirestore.id}`);
      console.log(`   Email: ${cristianFirestore.data().email}\n`);

      // Verificar y actualizar Firestore
      await verifyCristianFirestore(cristianFirestore.id);
    } else {
      console.log(`✅ Usuario encontrado en Auth`);
      console.log(`   Email: ${cristianAuth.email}`);
      console.log(`   UID: ${cristianAuth.uid}\n`);

      // Verificar su documento en Firestore
      await verifyCristianFirestore(cristianAuth.uid);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Verificar y actualizar documento de Cristian en Firestore
 */
async function verifyCristianFirestore(uid) {
  try {
    console.log('🔍 Verificando documento en Firestore...\n');

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      console.log('⚠️  Documento NO existe en Firestore');
      console.log('   Creando documento...\n');

      await db.collection('users').doc(uid).set({
        email: 'cristian.najera@email.com', // Ajustar si es necesario
        displayName: 'Cristian Najera',
        role: 'executive',
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });

      console.log('✅ Documento creado exitosamente\n');
    } else {
      const userData = userDoc.data();
      console.log('✅ Documento existe');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   isActive: ${userData.isActive}\n`);

      // Verificar si necesita actualización
      let needsUpdate = false;

      if (userData.role !== 'executive') {
        console.log('⚠️  Role no es "executive" - Corrigiendo...\n');
        needsUpdate = true;
      }

      if (userData.isActive !== true) {
        console.log('⚠️  isActive no es true - Corrigiendo...\n');
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.collection('users').doc(uid).update({
          role: 'executive',
          isActive: true,
          updatedAt: admin.firestore.Timestamp.now()
        });

        console.log('✅ Documento actualizado exitosamente\n');
      } else {
        console.log('✅ Documento está correcto - No requiere cambios\n');
      }
    }

    // Contar clientes de Cristian
    console.log('📊 Verificando clientes de Cristian...\n');

    const clientsSnapshot = await db
      .collection('clients')
      .where('executiveId', '==', uid)
      .get();

    console.log(`   Total de clientes: ${clientsSnapshot.size}`);

    if (clientsSnapshot.size > 0) {
      console.log('\n   Primeros clientes:');
      clientsSnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const client = doc.data();
        console.log(`   ${index + 1}. ${client.name} (${client.cedula})`);
      });
    }

    console.log('\n✅ VERIFICACIÓN COMPLETADA\n');

    // Log de auditoría
    await db.collection('audit_logs').add({
      userId: uid,
      action: 'USER_VERIFICATION_FIX',
      resource: 'users',
      details: {
        timestamp: new Date(),
        note: 'Verificación y corrección del usuario Cristian'
      }
    });

  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
    throw error;
  }
}

// Ejecutar
fixCristianUser();
