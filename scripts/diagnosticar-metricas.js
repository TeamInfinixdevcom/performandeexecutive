/**
 * DIAGNÓSTICO COMPLETO DE MÉTRICAS
 * Script para verificar por qué las métricas no se muestran
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function diagnosticarMetricas() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE MÉTRICAS');
    console.log('=====================================\n');
    
    // 1. Verificar usuarios y sus IDs
    console.log('1. VERIFICANDO USUARIOS:');
    const usersSnapshot = await db.collection('users').get();
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      console.log(`   👤 ${user.displayName}: ${doc.id}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Rol: ${user.role}`);
    });
    console.log('');
    
    // 2. Verificar clientes por ejecutivo
    console.log('2. CLIENTES POR EJECUTIVO:');
    const clientsSnapshot = await db.collection('clients').get();
    const clientesPorEjecutivo = {};
    
    clientsSnapshot.forEach(doc => {
      const client = doc.data();
      const execId = client.executiveId;
      
      if (!clientesPorEjecutivo[execId]) {
        clientesPorEjecutivo[execId] = {
          total: 0,
          segmentos: {}
        };
      }
      
      clientesPorEjecutivo[execId].total++;
      
      const segmento = (client.segmento || 'SIN_SEGMENTO').toUpperCase();
      if (!clientesPorEjecutivo[execId].segmentos[segmento]) {
        clientesPorEjecutivo[execId].segmentos[segmento] = 0;
      }
      clientesPorEjecutivo[execId].segmentos[segmento]++;
    });
    
    for (const [execId, data] of Object.entries(clientesPorEjecutivo)) {
      console.log(`   📊 Ejecutivo ${execId}:`);
      console.log(`      Total clientes: ${data.total}`);
      console.log(`      Por segmentos:`, data.segmentos);
    }
    console.log('');
    
    // 3. Verificar ventas
    console.log('3. VENTAS REGISTRADAS:');
    const ventasSnapshot = await db.collection('ventas').get();
    console.log(`   💰 Total ventas: ${ventasSnapshot.size}`);
    
    const ventasPorEjecutivo = {};
    ventasSnapshot.forEach(doc => {
      const venta = doc.data();
      const execId = venta.executiveId;
      
      if (!ventasPorEjecutivo[execId]) {
        ventasPorEjecutivo[execId] = 0;
      }
      ventasPorEjecutivo[execId]++;
    });
    
    for (const [execId, count] of Object.entries(ventasPorEjecutivo)) {
      console.log(`   📈 Ejecutivo ${execId}: ${count} ventas`);
    }
    console.log('');
    
    // 4. Verificar metas
    console.log('4. METAS CONFIGURADAS:');
    const metasSnapshot = await db.collection('metas').get();
    console.log(`   🎯 Total metas: ${metasSnapshot.size}`);
    
    metasSnapshot.forEach(doc => {
      const meta = doc.data();
      console.log(`   📋 Meta ${doc.id}:`);
      console.log(`      Ejecutivo: ${meta.executiveId}`);
      console.log(`      Período: ${meta.periodo}`);
      console.log(`      Target: ${meta.targetClients || 'No definido'}`);
    });
    console.log('');
    
    // 5. Buscar clientes específicos de Cristian
    console.log('5. CLIENTES DE CRISTIAN NAJERA:');
    const cristianClients = await db.collection('clients')
      .where('executiveId', '==', 'USER_ID_CRISTIAN')
      .get();
    
    if (cristianClients.empty) {
      console.log('   ⚠️  No se encontraron clientes con executiveId = "USER_ID_CRISTIAN"');
      
      // Buscar por otros criterios
      console.log('   🔍 Buscando clientes de Cristian por otros criterios...');
      const allClients = await db.collection('clients').get();
      
      allClients.forEach(doc => {
        const client = doc.data();
        const execName = (client.executiveName || '').toLowerCase();
        
        if (execName.includes('cristian')) {
          console.log(`   ✅ Cliente de Cristian encontrado:`);
          console.log(`      ID: ${doc.id}`);
          console.log(`      Nombre: ${client.name || client.nombre}`);
          console.log(`      ExecutiveId: ${client.executiveId}`);
          console.log(`      Segmento: ${client.segmento}`);
        }
      });
    } else {
      console.log(`   ✅ Encontrados ${cristianClients.size} clientes para Cristian`);
      
      cristianClients.forEach(doc => {
        const client = doc.data();
        console.log(`      - ${client.name || client.nombre}: ${client.segmento}`);
      });
    }
    
    console.log('\n🔍 DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar diagnóstico
diagnosticarMetricas();