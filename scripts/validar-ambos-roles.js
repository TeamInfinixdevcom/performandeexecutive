/**
 * SCRIPT DE VALIDACIÓN COMPLETA
 * Verifica que ambas vistas (supervisor y ejecutivo) funcionen correctamente
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function validarAmbosRoles() {
  try {
    console.log('🔍 VALIDACIÓN COMPLETA DE AMBOS ROLES');
    console.log('=====================================\n');
    
    // 1. Obtener todos los usuarios
    console.log('1. VERIFICANDO USUARIOS DEL SISTEMA:');
    const usersSnapshot = await db.collection('users').get();
    const usuarios = [];
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      usuarios.push({
        id: doc.id,
        email: user.email,
        name: user.displayName || user.name || 'Sin nombre',
        role: user.role,
        permissions: user.permissions || []
      });
      
      console.log(`   👤 ${user.displayName || user.name}: ${user.email}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Rol: ${user.role}`);
      console.log(`      Permisos: ${JSON.stringify(user.permissions || [])}`);
      console.log('');
    });
    
    // 2. Validar cada usuario
    for (const usuario of usuarios) {
      console.log(`📊 VALIDANDO USUARIO: ${usuario.name} (${usuario.role.toUpperCase()})`);
      console.log('─'.repeat(50));
      
      // Obtener clientes del usuario
      const clientsQuery = db.collection('clients').where('executiveId', '==', usuario.id);
      const clientsSnapshot = await clientsQuery.get();
      
      const metricas = {
        total: 0,
        platino: 0,
        oro: 0,
        plata: 0,
        bronce: 0,
        black: 0
      };
      
      clientsSnapshot.forEach(doc => {
        const client = doc.data();
        const segmento = (client.segmento || '').toUpperCase();
        
        metricas.total++;
        
        switch(segmento) {
          case 'PLATINO': metricas.platino++; break;
          case 'ORO': metricas.oro++; break;
          case 'PLATA': metricas.plata++; break;
          case 'BRONCE': metricas.bronce++; break;
          case 'BLACK': metricas.black++; break;
        }
      });
      
      // Validar datos
      console.log(`   📈 Total clientes: ${metricas.total}`);
      
      if (metricas.total > 0) {
        console.log(`   ✅ DATOS DISPONIBLES:`);
        console.log(`      - PLATINO: ${metricas.platino}`);
        console.log(`      - ORO: ${metricas.oro}`);
        console.log(`      - PLATA: ${metricas.plata}`);
        console.log(`      - BRONCE: ${metricas.bronce}`);
        console.log(`      - BLACK: ${metricas.black}`);
        
        // Validar que los segmentos tengan sentido
        const suma = metricas.platino + metricas.oro + metricas.plata + metricas.bronce + metricas.black;
        if (suma === metricas.total) {
          console.log(`   ✅ INTEGRIDAD: Suma de segmentos coincide (${suma} = ${metricas.total})`);
        } else {
          console.log(`   ⚠️  ADVERTENCIA: Suma de segmentos no coincide (${suma} ≠ ${metricas.total})`);
        }
        
      } else {
        console.log(`   ⚠️  SIN CLIENTES: Usuario no tiene clientes asignados`);
      }
      
      // Obtener ventas
      const ventasQuery = db.collection('ventas').where('executiveId', '==', usuario.id);
      const ventasSnapshot = await ventasQuery.get();
      console.log(`   💰 Ventas registradas: ${ventasSnapshot.size}`);
      
      // Obtener metas
      const metasQuery = db.collection('metas').where('executiveId', '==', usuario.id);
      const metasSnapshot = await metasQuery.get();
      console.log(`   🎯 Metas configuradas: ${metasSnapshot.size}`);
      
      console.log('');
    }
    
    // 3. Verificar posibles conflictos
    console.log('🔧 VERIFICACIÓN DE CONFLICTOS POTENCIALES:');
    console.log('─'.repeat(50));
    
    // Verificar clientes sin ejecutivo
    const allClientsSnapshot = await db.collection('clients').get();
    let clientesSinEjecutivo = 0;
    let clientesConEjecutivoInvalido = 0;
    
    const idsEjecutivos = usuarios.map(u => u.id);
    
    allClientsSnapshot.forEach(doc => {
      const client = doc.data();
      
      if (!client.executiveId) {
        clientesSinEjecutivo++;
      } else if (!idsEjecutivos.includes(client.executiveId)) {
        clientesConEjecutivoInvalido++;
        console.log(`   ⚠️  Cliente ${doc.id} tiene executiveId inválido: ${client.executiveId}`);
      }
    });
    
    console.log(`   📋 Clientes sin ejecutivo asignado: ${clientesSinEjecutivo}`);
    console.log(`   📋 Clientes con ejecutivo inválido: ${clientesConEjecutivoInvalido}`);
    
    // 4. Recomendaciones por rol
    console.log('\n💡 RECOMENDACIONES POR ROL:');
    console.log('─'.repeat(50));
    
    usuarios.forEach(usuario => {
      console.log(`\n${usuario.role.toUpperCase()}: ${usuario.name}`);
      
      if (usuario.role === 'admin') {
        console.log('   ✅ Debe poder ver: Dashboard completo, todos los ejecutivos, panel admin');
        console.log('   ⚠️  Verificar: Acceso a métricas agregadas, gestión de usuarios');
        console.log('   🧪 Probar: Login → Ver métricas de todos → Panel admin');
      }
      
      if (usuario.role === 'executive') {
        console.log('   ✅ Debe poder ver: Sus clientes, sus métricas, dashboard personal');
        console.log('   ⚠️  Verificar: Solo sus datos, no datos de otros ejecutivos');
        console.log('   🧪 Probar: Login → Ver solo sus métricas → Gestionar sus clientes');
      }
    });
    
    console.log('\n🎯 PLAN DE PRUEBAS RECOMENDADO:');
    console.log('─'.repeat(50));
    console.log('1. Probar cada usuario en ventana incógnita separada');
    console.log('2. Verificar que solo vean sus datos correspondientes');
    console.log('3. Comprobar que las gráficas cargan sin errores JavaScript');
    console.log('4. Validar permisos de acceso a funciones');
    console.log('5. Revisar consola del navegador en cada caso');
    
    console.log('\n✅ VALIDACIÓN COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar validación
validarAmbosRoles();