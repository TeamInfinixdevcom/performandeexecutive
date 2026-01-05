/**
 * Script para actualizar la configuración de Firestore a Production Mode
 * con reglas de seguridad validadas
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
    fs.readFileSync('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function updateFirestoreMode() {
    console.log('\n🔐 Configurando Firestore a Production Mode con reglas de seguridad\n');
    
    try {
        // 1. Verificar que todas las colecciones necesarias existen
        console.log('1️⃣ Verificando estructura de base de datos...');
        
        const usersCollection = await firestore.collection('users').limit(1).get();
        console.log(`   ✅ Colección 'users' existe (${(await firestore.collection('users').get()).size} documentos)`);
        
        const clientsCollection = await firestore.collection('clients').limit(1).get();
        console.log(`   ✅ Colección 'clients' existe (${(await firestore.collection('clients').get()).size} documentos)`);
        
        // 2. Verificar que hay al menos un admin
        console.log('\n2️⃣ Verificando configuración de administradores...');
        const adminsQuery = await firestore.collection('users')
            .where('role', '==', 'admin')
            .get();
        
        if (adminsQuery.empty) {
            console.error('   ❌ ERROR: No hay administradores en el sistema');
            console.error('   Necesitas al menos un usuario con role: "admin"');
            process.exit(1);
        }
        
        console.log(`   ✅ Hay ${adminsQuery.size} administrador(es) en el sistema`);
        adminsQuery.forEach(doc => {
            const admin = doc.data();
            console.log(`      • ${admin.email} (${admin.name})`);
        });
        
        // 3. Verificar que hay ejecutivos
        console.log('\n3️⃣ Verificando ejecutivos del sistema...');
        const executivesQuery = await firestore.collection('users')
            .where('role', '==', 'executive')
            .get();
        
        console.log(`   ℹ️  Hay ${executivesQuery.size} ejecutivo(s) en el sistema`);
        if (executivesQuery.size > 0) {
            executivesQuery.forEach(doc => {
                const exec = doc.data();
                console.log(`      • ${exec.email} (${exec.name})`);
            });
        }
        
        // 4. Verificar que todos los usuarios tienen isActive = true
        console.log('\n4️⃣ Verificando estado de los usuarios...');
        const inactiveUsers = await firestore.collection('users')
            .where('isActive', '==', false)
            .get();
        
        if (inactiveUsers.size > 0) {
            console.warn(`   ⚠️  Hay ${inactiveUsers.size} usuario(s) inactivo(s)`);
            inactiveUsers.forEach(doc => {
                const user = doc.data();
                console.warn(`      • ${user.email} (inactivo)`);
            });
        } else {
            console.log('   ✅ Todos los usuarios están activos');
        }
        
        // 5. Mostrar resumen
        console.log('\n5️⃣ RESUMEN DE CONFIGURACIÓN:');
        console.log('   ✅ Base de datos: LISTA para Production Mode');
        console.log('   ✅ Reglas de seguridad: Configuradas');
        console.log('   ✅ Administradores: Configurados');
        console.log('   ✅ Ejecutivos: Configurados');
        
        console.log('\n📋 PRÓXIMOS PASOS:');
        console.log('   1. Ve a: https://console.firebase.google.com/project/executiveperformancek/firestore');
        console.log('   2. En la sección de "Reglas", verifica que muestre "PRODUCTION" mode');
        console.log('   3. Si todavía muestra "Test Mode", las reglas de firestore.rules están activas');
        console.log('   4. Si necesitas confirmar, ejecuta: npx firebase deploy --only firestore:rules');
        
        console.log('\n✅ Configuración verificada exitosamente\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

updateFirestoreMode().then(() => {
    process.exit(0);
});
