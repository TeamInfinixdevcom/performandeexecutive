// Script para crear o corregir el documento del usuario en Firestore
// Ejecuta este script con Node.js en la raíz del proyecto

const admin = require('firebase-admin');
const serviceAccount = require('../executiveperformancek-firebase-adminsdk-fbsvc-d7042fc558.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Cambia este UID por el del usuario que quieres corregir
const uid = 'yF8fwbUQFpXXlOfUMyvQmHmBgNI3';

async function ensureActiveUser() {
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    // Si no existe, creamos un documento básico activo
    await userRef.set({
      isActive: true,
      role: 'ejecutivo_standard',
      permissions: ['read_clients', 'write_clients'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Documento de usuario creado y activado.');
  } else {
    // Si existe, solo aseguramos que isActive sea true
    await userRef.update({ isActive: true });
    console.log('✅ Usuario existente actualizado a activo.');
  }
  process.exit(0);
}

ensureActiveUser().catch(e => { console.error(e); process.exit(1); });
