/**
 * SOLUCIÓN: Cloud Function que sincroniza Auth con Firestore
 * 
 * Cuando se crea un usuario en Authentication,
 * esta función automáticamente crea el documento en Firestore 'users'
 * 
 * INSTALACIÓN:
 * 1. npm install -g firebase-tools
 * 2. firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

/**
 * TRIGGER 1: Cuando se crea un usuario en Authentication
 * Automáticamente crea el documento en Firestore
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  console.log(`✅ Nuevo usuario creado en Auth: ${user.email}`);
  
  try {
    // Crear documento en Firestore automáticamente
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      role: 'executive', // Por defecto executive, admin lo cambia manualmente
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system-auto',
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Documento creado en Firestore para: ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sincronizando usuario: ${error.message}`);
    throw error;
  }
});

/**
 * TRIGGER 2: Cuando se elimina un usuario en Authentication
 * Automáticamente elimina el documento en Firestore
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  console.log(`🗑️ Usuario eliminado de Auth: ${user.email}`);
  
  try {
    // Eliminar documento de Firestore
    await db.collection('users').doc(user.uid).delete();
    console.log(`✅ Documento eliminado de Firestore: ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error eliminando documento: ${error.message}`);
    throw error;
  }
});

/**
 * HTTP FUNCTION: Limpiar y recrear un usuario
 * 
 * POST /cleanAndRecreateUser
 * Body: { email: "usuario@email.com" }
 */
exports.cleanAndRecreateUser = functions.https.onRequest(async (req, res) => {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }
  
  try {
    console.log(`🔍 Buscando usuario: ${email}`);
    
    // 1. Obtener usuario de Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Usuario encontrado en Auth: ${userRecord.uid}`);
    
    // 2. Eliminar de Firestore
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`✅ Documento eliminado de Firestore`);
    
    // 3. Eliminar de Auth
    await auth.deleteUser(userRecord.uid);
    console.log(`✅ Usuario eliminado de Auth`);
    
    return res.status(200).json({
      success: true,
      message: `Usuario ${email} limpiado completamente. Email disponible en 5-10 minutos.`
    });
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

/**
 * HTTP FUNCTION: Forzar sincronización manual
 * 
 * POST /syncAuthToFirestore
 * Body: { email: "usuario@email.com" }
 */
exports.syncAuthToFirestore = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }
  
  try {
    // Obtener usuario de Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Crear/actualizar en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || email.split('@')[0],
      role: 'executive',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'manual-sync'
    }, { merge: true });
    
    return res.status(200).json({
      success: true,
      message: `Usuario ${email} sincronizado a Firestore`,
      uid: userRecord.uid
    });
    
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      success: false
    });
  }
});
