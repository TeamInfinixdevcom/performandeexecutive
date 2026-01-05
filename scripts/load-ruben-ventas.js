/**
 * BUSCAR UID DE USUARIO Y CARGAR VENTAS
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const db = admin.firestore();
const auth = admin.auth();

async function cargarVentasParaRuben() {
  try {
    console.log('🔍 Buscando usuario Rubén Madrigal...\n');

    // Buscar por auth uid de rmadrigalj
    let userDoc = null;
    let userId = null;
    
    try {
      // Intenta obtener el usuario de Auth usando el email
      const userRecord = await auth.getUserByEmail('rmadrigalj@ice.go.cr');
      userId = userRecord.uid;
      const userSnapshot = await db.collection('users').doc(userId).get();
      if (userSnapshot.exists) {
        userDoc = userSnapshot;
      }
    } catch (error) {
      // Si no existe por email, buscar por displayName
      console.log('Email no encontrado, buscando por nombre...');
      const allUsers = await db.collection('users').get();
      allUsers.forEach(doc => {
        const displayName = doc.data().displayName || doc.data().nombre || '';
        if (displayName.toLowerCase().includes('rubén') || displayName.toLowerCase().includes('ruben')) {
          userDoc = doc;
          userId = doc.id;
        }
      });
    }

    if (!userDoc) {
      console.error('❌ No se encontró usuario Rubén Madrigal');
      const allUsers = await db.collection('users').get();
      console.log('\n📋 Usuarios disponibles:');
      allUsers.forEach(doc => {
        console.log(`  - ${doc.id}: ${doc.data().displayName || doc.data().nombre}`);
      });
      
      process.exit(1);
    }

    const userDataObj = userDoc.data();

    console.log(`✅ Usuario encontrado:`);
    console.log(`   UID: ${userId}`);
    console.log(`   Nombre: ${userDataObj.displayName || userDataObj.nombre}`);
    console.log(`   agenteId: ${userDataObj.agenteId}`);
    console.log(`   Agencia: ${userDataObj.agencia}\n`);

    // Primero eliminar las ventas anteriores (si las hay)
    console.log('🗑️  Eliminando ventas anteriores de prueba...\n');

    const ventasAntiguas = await db.collection('ventas').where('agenteId', '==', userId).get();
    for (const doc of ventasAntiguas.docs) {
      await doc.ref.delete();
      console.log(`  Eliminado: ${doc.id}`);
    }

    const ventasHomeAntiguas = await db.collection('ventas_hogar').where('agenteId', '==', userId).get();
    for (const doc of ventasHomeAntiguas.docs) {
      await doc.ref.delete();
      console.log(`  Eliminado: ${doc.id}`);
    }

    console.log('\n📝 Cargando 5 ventas nuevas...\n');

    // 5 ventas de prueba
    const ventasDemo = [
      {
        // Venta Móvil 1
        agenteId: userId,
        tipoPedido: 'Komercial',
        numeroPedido: 'PED-001-2026',
        planId: 'k2plus',
        planName: 'K2 plus',
        planPrice: 16500,
        imeis: ['358775151234567', '358775151234568'],
        accesorios: ['FUNDA-001', 'VIDRIO-001'],
        cedulaCliente: '1-1234-5678',
        numeroCliente: '8765-4321',
        createdAt: new Date('2025-12-28'),
        tipo: 'mobile'
      },
      {
        // Venta Móvil 2
        agenteId: userId,
        tipoPedido: 'Siebel',
        numeroPedido: 'PED-002-2026',
        planId: 'k4plus',
        planName: 'K4 plus',
        planPrice: 29500,
        imeis: ['358775152345678'],
        accesorios: ['FUNDA-002'],
        cedulaCliente: '1-2345-6789',
        numeroCliente: '8888-1111',
        createdAt: new Date('2025-12-29'),
        tipo: 'mobile'
      },
      {
        // Venta Hogar 1
        agenteId: userId,
        homeNumber: 'SIMO-001-2026',
        customerName: 'Juan Pérez García',
        cedulaCliente: '1-3456-7890',
        numeroCliente: '7777-2222',
        planId: 'duo200mbps',
        planName: 'Dúo 200 Mbps',
        planPrice: 42500,
        createdAt: new Date('2025-12-30'),
        tipo: 'home'
      },
      {
        // Venta Móvil 3
        agenteId: userId,
        tipoPedido: 'Komercial',
        numeroPedido: 'PED-003-2026',
        planId: 'k3plus',
        planName: 'K3 plus',
        planPrice: 21500,
        imeis: ['358775153456789', '358775153456790', '358775153456791'],
        accesorios: ['CABLE-001', 'CARGADOR-001', 'VIDRIO-002'],
        cedulaCliente: '1-4567-8901',
        numeroCliente: '9999-3333',
        createdAt: new Date('2026-01-01'),
        tipo: 'mobile'
      },
      {
        // Venta Hogar 2
        agenteId: userId,
        homeNumber: 'SIMO-002-2026',
        customerName: 'María López González',
        cedulaCliente: '1-5678-9012',
        numeroCliente: '8888-4444',
        planId: 'triple500mbps',
        planName: 'Triple 500 Mbps',
        planPrice: 76900,
        createdAt: new Date('2026-01-02'),
        tipo: 'home'
      }
    ];

    console.log('📝 Ventas a cargar:\n');
    ventasDemo.forEach((venta, idx) => {
      console.log(`${idx + 1}. ${venta.tipo === 'mobile' ? '📱' : '🏠'} ${venta.planName} - ₡${venta.planPrice.toLocaleString()}`);
    });
    console.log('');

    // Cargar ventas
    for (let i = 0; i < ventasDemo.length; i++) {
      const venta = ventasDemo[i];
      const collectionName = venta.tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      
      try {
        const docRef = await db.collection(collectionName).add(venta);
        console.log(`✅ Venta ${i + 1} cargada: ${docRef.id}`);
      } catch (error) {
        console.error(`❌ Error cargando venta ${i + 1}:`, error.message);
      }
    }

    console.log('\n✅ ¡Carga completada para Rubén Madrigal!');
    console.log('🎯 Las 5 ventas ahora solo aparecerán en su cuenta');
    console.log('📋 URL: https://executiveperformancek.web.app');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cargarVentasParaRuben();
