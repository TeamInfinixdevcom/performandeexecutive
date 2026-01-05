/**
 * Script para verificar estado del usuario
 * Uso: node check-user-status.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();

async function checkUserStatus() {
    try {
        console.log('🔍 Buscando usuarios...\n');
        
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        if (snapshot.empty) {
            console.log('❌ No hay usuarios en la colección');
            return;
        }
        
        snapshot.forEach(doc => {
            const user = doc.data();
            console.log(`👤 Usuario ID: ${doc.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   isActive: ${user.isActive}`);
            console.log(`   Nombre: ${user.displayName}`);
            console.log('   ---');
        });
        
        console.log('\n✅ Verificación completada');
        console.log('\n⚠️ ACCIÓN REQUERIDA:');
        console.log('Si algún usuario tiene "isActive: false", ejecuta:');
        console.log('node activate-user.js <userId>');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkUserStatus();
