/**
 * SCRIPT PARA DIAGNOSTICAR PROBLEMA DE CLIENTES "UNDEFINED"
 * 
 * Este script revisa la estructura de los clientes para identificar
 * por qué aparecen como "undefined" en la interfaz.
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

async function diagnoseClientIssues() {
  try {
    console.log('🔍 Diagnosticando problema de clientes "undefined"...');
    
    // 1. Obtener tu UID (rmadrigalj)
    let adminUID;
    try {
      // Buscar por email
      const userRecord = await auth.getUserByEmail('rmadrigalj@company.com');
      adminUID = userRecord.uid;
      console.log('✅ Admin UID encontrado:', adminUID);
    } catch (error) {
      console.log('⚠️ No se encontró rmadrigalj@company.com, buscando en Firestore...');
      
      // Buscar en Firestore users collection por email que contenga rmadrigalj
      const usersSnapshot = await db.collection('users')
        .where('email', '>=', 'rmadrigalj')
        .where('email', '<', 'rmadrigalj\uf8ff')
        .get();
      
      if (!usersSnapshot.empty) {
        const adminDoc = usersSnapshot.docs[0];
        adminUID = adminDoc.id;
        console.log('✅ Admin encontrado en Firestore:', adminDoc.data().email);
      } else {
        console.log('❌ No se encontró usuario admin. Mostrando todos los usuarios:');
        const allUsers = await db.collection('users').limit(10).get();
        allUsers.forEach(doc => {
          console.log('  -', doc.id, ':', doc.data().email || 'sin email');
        });
        return;
      }
    }
    
    // 2. Obtener clientes del admin
    console.log('\n📋 Obteniendo tus clientes...');
    const clientsSnapshot = await db.collection('clients')
      .where('executiveId', '==', adminUID)
      .limit(10)
      .get();
    
    console.log(`📊 Encontrados ${clientsSnapshot.size} clientes`);
    
    if (clientsSnapshot.empty) {
      console.log('⚠️ No se encontraron clientes con executiveId:', adminUID);
      
      // Buscar clientes sin filtro para ver la estructura
      console.log('\n🔍 Revisando estructura de todos los clientes...');
      const allClients = await db.collection('clients').limit(5).get();
      
      allClients.forEach((doc, index) => {
        const client = doc.data();
        console.log(`\n--- Cliente ${index + 1} ---`);
        console.log('ID:', doc.id);
        console.log('ExecutiveId:', client.executiveId);
        console.log('Campos disponibles:', Object.keys(client));
        console.log('Datos completos:', client);
      });
      
      return;
    }
    
    // 3. Analizar estructura de tus clientes
    console.log('\n📊 ANÁLISIS DE TUS CLIENTES:');
    console.log('==========================================');
    
    clientsSnapshot.forEach((doc, index) => {
      const client = doc.data();
      console.log(`\n--- Cliente ${index + 1} ---`);
      console.log('🆔 ID del documento:', doc.id);
      console.log('📧 ExecutiveId:', client.executiveId);
      console.log('📋 Campos disponibles:', Object.keys(client).sort());
      
      // Verificar campos de nombre específicamente
      console.log('🏷️  Nombres:');
      console.log('   - name:', client.name || 'NO EXISTE');
      console.log('   - nombre:', client.nombre || 'NO EXISTE');
      console.log('   - displayName:', client.displayName || 'NO EXISTE');
      console.log('   - fullName:', client.fullName || 'NO EXISTE');
      
      console.log('📧 Emails:');
      console.log('   - email:', client.email || 'NO EXISTE');
      console.log('   - correo:', client.correo || 'NO EXISTE');
      
      console.log('📱 Otros datos importantes:');
      console.log('   - phone:', client.phone || 'NO EXISTE');
      console.log('   - telefono:', client.telefono || 'NO EXISTE');
      console.log('   - segment:', client.segment || 'NO EXISTE');
      console.log('   - segmento:', client.segmento || 'NO EXISTE');
      console.log('   - category:', client.category || 'NO EXISTE');
      console.log('   - categoria:', client.categoria || 'NO EXISTE');
      
      console.log('📅 Timestamps:');
      console.log('   - createdAt:', client.createdAt ? new Date(client.createdAt.seconds * 1000).toISOString() : 'NO EXISTE');
      console.log('   - updatedAt:', client.updatedAt ? new Date(client.updatedAt.seconds * 1000).toISOString() : 'NO EXISTE');
    });
    
    // 4. Estadísticas generales
    console.log('\n📈 ESTADÍSTICAS:');
    console.log('==========================================');
    let stats = {
      conName: 0,
      conNombre: 0,
      conEmail: 0,
      sinNombre: 0,
      sinEmail: 0
    };
    
    clientsSnapshot.forEach(doc => {
      const client = doc.data();
      if (client.name) stats.conName++;
      if (client.nombre) stats.conNombre++;
      if (client.email) stats.conEmail++;
      if (!client.name && !client.nombre) stats.sinNombre++;
      if (!client.email) stats.sinEmail++;
    });
    
    console.log('✅ Clientes con campo "name":', stats.conName);
    console.log('✅ Clientes con campo "nombre":', stats.conNombre);
    console.log('✅ Clientes con email:', stats.conEmail);
    console.log('❌ Clientes SIN nombre:', stats.sinNombre);
    console.log('❌ Clientes SIN email:', stats.sinEmail);
    
    // 5. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('==========================================');
    
    if (stats.sinNombre > 0) {
      console.log('⚠️ Hay clientes sin nombre - necesitan migración');
    }
    
    if (stats.conNombre > stats.conName) {
      console.log('⚠️ Hay más clientes con "nombre" que con "name" - necesita migración');
    }
    
    console.log('\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
diagnoseClientIssues();