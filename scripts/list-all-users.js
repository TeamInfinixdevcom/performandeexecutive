/**
 * Script para listar todos los usuarios en Firebase Auth y Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(
    fs.readFileSync('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function listAllUsers() {
    console.log('\n📋 LISTANDO TODOS LOS USUARIOS\n');
    
    try {
        // 1. Listar desde Firebase Auth
        console.log('🔐 USUARIOS EN FIREBASE AUTH:');
        console.log('='.repeat(60));
        
        let authUsers = [];
        let pageToken = undefined;
        
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            authUsers = authUsers.concat(listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);
        
        console.log(`Total: ${authUsers.length} usuarios\n`);
        authUsers.forEach((user, i) => {
            console.log(`${i + 1}. ${user.email}`);
            console.log(`   UID: ${user.uid}`);
            console.log(`   Creado: ${new Date(user.metadata.creationTime).toLocaleString()}`);
            console.log('');
        });
        
        // 2. Listar desde Firestore
        console.log('\n📄 USUARIOS EN FIRESTORE:');
        console.log('='.repeat(60));
        
        const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        console.log(`Total: ${usersSnapshot.size} usuarios\n`);
        
        usersSnapshot.forEach((doc, i) => {
            const user = doc.data();
            console.log(`${i + 1}. ${user.email}`);
            console.log(`   UID: ${user.uid}`);
            console.log(`   Rol: ${user.role}`);
            console.log(`   Nombre: ${user.name}`);
            console.log(`   Activo: ${user.isActive}`);
            console.log('');
        });
        
        // 3. Comparar
        console.log('\n🔍 VALIDACIÓN:');
        console.log('='.repeat(60));
        
        let allGood = true;
        
        for (const authUser of authUsers) {
            const firestoreUser = usersSnapshot.docs.find(doc => doc.data().uid === authUser.uid);
            
            if (!firestoreUser) {
                console.log(`❌ ${authUser.email} - EXISTE en Auth pero NO en Firestore`);
                allGood = false;
            } else if (firestoreUser.data().role !== 'admin' && firestoreUser.data().role !== 'executive') {
                console.log(`⚠️ ${authUser.email} - Rol desconocido: ${firestoreUser.data().role}`);
            } else {
                console.log(`✅ ${authUser.email} - OK (${firestoreUser.data().role})`);
            }
        }
        
        if (allGood) {
            console.log('\n✅ TODOS LOS USUARIOS ESTÁN CORRECTAMENTE CONFIGURADOS');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

listAllUsers().then(() => {
    process.exit(0);
});
