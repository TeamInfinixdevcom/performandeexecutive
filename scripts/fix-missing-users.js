/**
 * Script para reparar usuarios que faltan en Firestore
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

async function fixMissingUsers() {
    console.log('\n🔧 REPARANDO USUARIOS FALTANTES EN FIRESTORE\n');
    
    try {
        // Obtener todos los usuarios de Auth
        let authUsers = [];
        let pageToken = undefined;
        
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            authUsers = authUsers.concat(listUsersResult.users);
            pageToken = listUsersResult.pageToken;
        } while (pageToken);
        
        // Obtener todos de Firestore
        const firestoreSnapshot = await db.collection('users').get();
        const firestoreUIDs = new Set(firestoreSnapshot.docs.map(doc => doc.data().uid));
        
        // Encontrar faltantes
        const missingUsers = authUsers.filter(user => !firestoreUIDs.has(user.uid));
        
        if (missingUsers.length === 0) {
            console.log('✅ No hay usuarios faltantes. Todo está en orden.');
            process.exit(0);
        }
        
        console.log(`Found ${missingUsers.length} usuario(s) faltante(s):\n`);
        
        for (const user of missingUsers) {
            console.log(`Reparando: ${user.email}`);
            
            // Crear el documento en Firestore
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: 'executive', // Por defecto executive
                isActive: true,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(user.metadata.creationTime)),
                createdBy: 'system-repair'
            });
            
            console.log(`✅ Documento creado en Firestore para ${user.email}\n`);
        }
        
        console.log('\n✅ REPARACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixMissingUsers().then(() => {
    process.exit(0);
});
