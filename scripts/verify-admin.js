const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function verifyAndFixAdmin() {
  try {
    console.log('🔍 Verificando usuario admin...\n');

    // Obtener el usuario admin
    const adminUser = await admin.auth().getUserByEmail('rmadrigalj@ice.go.cr');
    console.log(`✅ Usuario encontrado: ${adminUser.email}`);
    console.log(`🔑 UID: ${adminUser.uid}\n`);

    // Verificar documento en Firestore
    const userDoc = await db.collection('users').doc(adminUser.uid).get();
    
    if (userDoc.data()) {
      console.log('📄 Documento en Firestore encontrado:');
      console.log(JSON.stringify(userDoc.data(), null, 2));
      
      const data = userDoc.data();
      if (data.role === 'admin') {
        console.log('\n✅ ¡El usuario tiene rol admin correctamente!');
      } else {
        console.log(`\n⚠️  El rol es "${data.role}", debería ser "admin"`);
        console.log('\n🔧 Corrigiendo...');
        
        await db.collection('users').doc(adminUser.uid).update({
          role: 'admin'
        });
        
        console.log('✅ Rol actualizado a admin');
      }
    } else {
      console.log('⚠️  El documento NO existe en Firestore');
      console.log('\n🔧 Creando documento...\n');
      
      await db.collection('users').doc(adminUser.uid).set({
        uid: adminUser.uid,
        name: 'Administrador ICE',
        email: 'rmadrigalj@ice.go.cr',
        role: 'admin',
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        createdBy: adminUser.uid
      });
      
      console.log('✅ Documento creado correctamente');
    }
    
    console.log('\n✅ ¡Verificación completada!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAndFixAdmin();

verifyAndFixAdmin();
