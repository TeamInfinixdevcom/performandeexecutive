/**
 * SCRIPT PARA UNIFICAR NOMBRES DE CLIENTES
 * 
 * Este script corrige la inconsistencia entre los campos 'name' y 'nombre'
 * unificando todo en el campo 'name' que es el que usa el frontend.
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function unifyClientNames() {
  try {
    console.log('🔧 Unificando nombres de clientes...');
    
    // Obtener todos los clientes
    console.log('📋 Obteniendo todos los clientes...');
    const clientsSnapshot = await db.collection('clients').get();
    
    console.log(`📊 Encontrados ${clientsSnapshot.size} clientes para procesar`);
    
    let processed = 0;
    let updated = 0;
    const batch = db.batch();
    
    clientsSnapshot.forEach((doc) => {
      const client = doc.data();
      const clientRef = doc.ref;
      processed++;
      
      console.log(`\n--- Procesando cliente ${processed}/${clientsSnapshot.size} ---`);
      console.log('ID:', doc.id);
      console.log('Campos actuales:');
      console.log('  - name:', client.name || 'NO EXISTE');
      console.log('  - nombre:', client.nombre || 'NO EXISTE');
      
      let needsUpdate = false;
      const updates = {};
      
      // LÓGICA DE UNIFICACIÓN:
      // 1. Si solo existe 'nombre', copiarlo a 'name'
      if (!client.name && client.nombre) {
        updates.name = client.nombre;
        needsUpdate = true;
        console.log('  ✅ Copiando nombre → name:', client.nombre);
      }
      
      // 2. Si solo existe 'name', está bien, no hacer nada
      else if (client.name && !client.nombre) {
        console.log('  ✅ Ya tiene name, no necesita cambios');
      }
      
      // 3. Si existen ambos pero son diferentes, usar 'name' (más reciente)
      else if (client.name && client.nombre && client.name !== client.nombre) {
        // Mantener 'name' como principal, pero guardar histórico
        updates.nombreAnterior = client.nombre;
        console.log('  ⚠️ Conflicto resuelto: usando name =', client.name);
        console.log('  📝 Guardando nombreAnterior =', client.nombre);
        needsUpdate = true;
      }
      
      // 4. Si no existe ninguno, error crítico
      else if (!client.name && !client.nombre) {
        console.log('  ❌ ERROR: Cliente sin ningún nombre!');
        updates.name = 'CLIENTE SIN NOMBRE';
        needsUpdate = true;
      }
      
      // 5. Si ambos son iguales, está bien
      else {
        console.log('  ✅ name y nombre son iguales, no necesita cambios');
      }
      
      if (needsUpdate) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        updates.fixedBy = 'unify-names-script';
        batch.update(clientRef, updates);
        updated++;
        console.log('  📝 Actualizaciones programadas:', Object.keys(updates));
      }
    });
    
    // Ejecutar todas las actualizaciones
    if (updated > 0) {
      console.log(`\n🚀 Ejecutando ${updated} actualizaciones...`);
      await batch.commit();
      console.log('✅ Todas las actualizaciones completadas');
    } else {
      console.log('\n✅ No se requieren actualizaciones');
    }
    
    // Estadísticas finales
    console.log('\n📈 RESUMEN FINAL:');
    console.log('==========================================');
    console.log('📊 Total clientes procesados:', processed);
    console.log('📝 Clientes actualizados:', updated);
    console.log('✅ Clientes sin cambios:', processed - updated);
    
    console.log('\n🎉 Unificación completada exitosamente!');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('1. Refrescar la página del navegador');
    console.log('2. Los clientes ahora deberían aparecer correctamente');
    console.log('3. Ya no deberían verse como "undefined"');
    
  } catch (error) {
    console.error('❌ Error durante la unificación:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
unifyClientNames();