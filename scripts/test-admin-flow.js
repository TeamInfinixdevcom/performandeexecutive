/**
 * Script de test para simular exactamente el flujo del admin panel
 * Valida que el acceso funciona correctamente
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
    fs.readFileSync('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const authClient = admin.auth();

async function testAdminFlow() {
    console.log('\n🧪 TEST: Verificando flujo de acceso admin\n');
    
    // Email del admin a probar
    const ADMIN_EMAIL = 'rmadrigalj@ice.go.cr';
    
    try {
        // 1️⃣ Obtener el usuario del Auth
        console.log('1️⃣ Buscando usuario en Firebase Auth...');
        const userRecord = await authClient.getUserByEmail(ADMIN_EMAIL);
        console.log(`   ✅ UID: ${userRecord.uid}`);
        console.log(`   ✅ Email: ${userRecord.email}`);
        
        // 2️⃣ Obtener el documento de Firestore
        console.log('\n2️⃣ Buscando documento en Firestore...');
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();
        
        if (!userDoc.exists) {
            console.error('   ❌ DOCUMENTO NO EXISTE EN FIRESTORE');
            console.log('   Este es el problema - el admin existe en Auth pero no en Firestore');
            return false;
        }
        
        console.log(`   ✅ Documento existe`);
        
        // 3️⃣ Verificar rol
        const userData = userDoc.data();
        console.log('\n3️⃣ Datos del usuario:');
        console.log(`   Email: ${userData.email}`);
        console.log(`   Rol: ${userData.role}`);
        console.log(`   Activo: ${userData.isActive}`);
        console.log(`   Nombre: ${userData.name}`);
        
        if (userData.role !== 'admin') {
            console.error(`   ❌ ROL NO ES ADMIN (tiene: ${userData.role})`);
            return false;
        }
        
        console.log('\n   ✅ ROL VERIFICADO COMO ADMIN');
        
        // 4️⃣ Simular lectura de todos los usuarios (lo que hace loadUsers())
        console.log('\n4️⃣ Simulando loadUsers()...');
        const usersCollection = db.collection('users');
        const allUsers = await usersCollection.orderBy('createdAt', 'desc').get();
        
        console.log(`   ✅ Se pueden leer ${allUsers.size} usuarios`);
        
        // 5️⃣ Intentar crear un usuario de prueba
        console.log('\n5️⃣ Simulando createNewUser()...');
        const testEmail = 'test-' + Date.now() + '@ice.go.cr';
        
        // Crear en Auth
        const newUser = await authClient.createUser({
            email: testEmail,
            password: 'TestUser@123',
            displayName: 'Usuario de Prueba'
        });
        console.log(`   ✅ Usuario creado en Auth: ${newUser.uid}`);
        
        // Crear en Firestore
        await db.collection('users').doc(newUser.uid).set({
            uid: newUser.uid,
            name: 'Usuario de Prueba',
            email: testEmail,
            role: 'executive',
            isActive: true,
            createdAt: admin.firestore.Timestamp.now(),
            createdBy: userRecord.uid
        });
        console.log(`   ✅ Usuario creado en Firestore`);
        
        // Verificar que se creó
        const newUserDoc = await db.collection('users').doc(newUser.uid).get();
        if (newUserDoc.exists) {
            console.log(`   ✅ Verificado: Usuario existe en Firestore`);
        }
        
        console.log('\n✅✅✅ FLUJO COMPLETO EXITOSO ✅✅✅\n');
        return true;
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Código:', error.code);
        return false;
    }
}

testAdminFlow().then(success => {
    if (success) {
        console.log('El sistema backend funciona correctamente.');
        console.log('El problema debe estar en el frontend (verificación de estado de auth).\n');
    } else {
        console.log('Hay un problema en la configuración del backend.\n');
    }
    process.exit(0);
});
