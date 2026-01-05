/**
 * Script para crear el primer usuario administrador
 * Este script crea un usuario en Firebase Authentication y en Firestore
 * 
 * Uso: node create-first-admin.js
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

const auth = admin.auth();
const db = admin.firestore();

// Datos del admin
const adminData = {
    email: 'rmadrigalj@ice.go.cr',
    password: 'Perla2031',
    name: 'Administrador ICE',
    role: 'admin'
};

async function createFirstAdmin() {
    try {
        console.log('🔄 Creando usuario administrador...');
        console.log(`📧 Email: ${adminData.email}`);
        
        // 1. Crear usuario en Firebase Authentication
        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: adminData.email,
                password: adminData.password,
                displayName: adminData.name,
                emailVerified: true
            });
            console.log('✅ Usuario creado en Firebase Authentication');
            console.log(`   UID: ${userRecord.uid}`);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️  El usuario ya existe en Authentication, obteniendo UID...');
                userRecord = await auth.getUserByEmail(adminData.email);
                console.log(`   UID: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }
        
        // 2. Crear/Actualizar documento en Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'system'
        }, { merge: true });
        
        console.log('✅ Usuario guardado en Firestore colección "users"');
        
        console.log('\n🎉 ¡Usuario administrador creado exitosamente!');
        console.log('\n📝 Credenciales de acceso:');
        console.log(`   Email: ${adminData.email}`);
        console.log(`   Password: ${adminData.password}`);
        console.log('\n🚀 Ahora puedes:');
        console.log('   1. Abrir http://localhost:3000/login.html');
        console.log('   2. Iniciar sesión con estas credenciales');
        console.log('   3. Hacer clic en "Panel Admin" para gestionar usuarios');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creando usuario administrador:', error);
        process.exit(1);
    }
}

// Ejecutar
createFirstAdmin();
