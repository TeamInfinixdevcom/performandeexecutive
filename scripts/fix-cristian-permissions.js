/**
 * SCRIPT PARA CORREGIR PERMISOS DE CRISTIAN
 * 
 * Este script verifica y crea el documento de usuario de Cristian
 * en Firestore si no existe, con los permisos correctos.
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();
const auth = admin.auth();

async function fixCristianPermissions() {
  try {
    console.log('🔧 Iniciando corrección de permisos para Cristian...');
    
    // UID conocido de Cristian
    const cristianUID = 'T8OdsUAbGNfGT4PouAMb6HGePxH2';
    
    // 1. Verificar si existe en Authentication
    let authUser;
    try {
      authUser = await auth.getUser(cristianUID);
      console.log('✅ Usuario encontrado en Authentication:', authUser.email);
    } catch (error) {
      console.error('❌ Usuario no encontrado en Authentication:', error.message);
      return;
    }
    
    // 2. Verificar documento en Firestore
    const userDoc = await db.collection('users').doc(cristianUID).get();
    
    if (!userDoc.exists) {
      console.log('⚠️ Documento de usuario no existe en Firestore. Creando...');
      
      const userData = {
        email: authUser.email,
        role: 'ejecutivo_standard',
        permissions: ['read_clients', 'write_clients'],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        displayName: authUser.displayName || authUser.email.split('@')[0],
        createdBy: 'fix-script',
        fixedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(cristianUID).set(userData);
      console.log('✅ Documento de usuario creado correctamente');
      console.log('📋 Datos:', userData);
      
    } else {
      console.log('✅ Documento de usuario ya existe');
      const userData = userDoc.data();
      console.log('📋 Datos actuales:', userData);
      
      // Verificar si necesita actualizaciones
      let needsUpdate = false;
      const updates = {};
      
      if (!userData.permissions || userData.permissions.length === 0) {
        updates.permissions = ['read_clients', 'write_clients'];
        needsUpdate = true;
        console.log('⚠️ Permisos faltantes, agregando...');
      }
      
      if (userData.isActive === undefined || userData.isActive === false) {
        updates.isActive = true;
        needsUpdate = true;
        console.log('⚠️ Usuario inactivo, activando...');
      }
      
      if (!userData.role) {
        updates.role = 'ejecutivo_standard';
        needsUpdate = true;
        console.log('⚠️ Rol faltante, asignando ejecutivo_standard...');
      }
      
      if (needsUpdate) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        updates.updatedBy = 'fix-script';
        
        await db.collection('users').doc(cristianUID).update(updates);
        console.log('✅ Usuario actualizado correctamente');
        console.log('📋 Actualizaciones aplicadas:', updates);
      }
    }
    
    // 3. Verificar clientes de Cristian
    console.log('🔍 Verificando clientes de Cristian...');
    const clientsSnapshot = await db.collection('clients')
      .where('executiveId', '==', cristianUID)
      .limit(5)
      .get();
    
    console.log(`📊 Cristian tiene ${clientsSnapshot.size} clientes`);
    
    clientsSnapshot.forEach(doc => {
      const client = doc.data();
      console.log(`  - Cliente: ${client.name || client.nombre} (${client.email})`);
    });
    
    console.log('🎉 Corrección completada exitosamente!');
    console.log('');
    console.log('📝 INSTRUCCIONES PARA CRISTIAN:');
    console.log('1. Cerrar completamente el navegador');
    console.log('2. Abrir nuevamente la aplicación');
    console.log('3. Hacer login nuevamente');
    console.log('4. Ya debería poder guardar clientes sin errores');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
fixCristianPermissions();