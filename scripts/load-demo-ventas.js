/**
 * SCRIPT DE CARGA DE DATOS DE PRUEBA
 * Agrega 5 ventas de ejemplo para rmadrigalj
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const db = admin.firestore();

async function cargarVentasDemo() {
  try {
    console.log('🚀 Iniciando carga de ventas de prueba...\n');

    // Datos del usuario rmadrigalj
    const agenteId = 'rmadrigalj@ice.go.cr'; // O usa el UID si lo tienes
    const agenteName = 'Ricardo Madrigal J';
    const agencia = 'Tibas Kolbi ICE';

    // 5 ventas de prueba (mezcla de móvil y hogar)
    const ventasDemo = [
      {
        // Venta Móvil 1
        agenteId,
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
        tipo: 'mobile',
        agencia
      },
      {
        // Venta Móvil 2
        agenteId,
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
        tipo: 'mobile',
        agencia
      },
      {
        // Venta Hogar 1
        agenteId,
        homeNumber: 'SIMO-001-2026',
        customerName: 'Juan Pérez García',
        cedulaCliente: '1-3456-7890',
        numeroCliente: '7777-2222',
        planId: 'duo200mbps',
        planName: 'Dúo 200 Mbps',
        planPrice: 42500,
        createdAt: new Date('2025-12-30'),
        tipo: 'home',
        agencia
      },
      {
        // Venta Móvil 3
        agenteId,
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
        tipo: 'mobile',
        agencia
      },
      {
        // Venta Hogar 2
        agenteId,
        homeNumber: 'SIMO-002-2026',
        customerName: 'María López González',
        cedulaCliente: '1-5678-9012',
        numeroCliente: '8888-4444',
        planId: 'triple500mbps',
        planName: 'Triple 500 Mbps',
        planPrice: 76900,
        createdAt: new Date('2026-01-02'),
        tipo: 'home',
        agencia
      }
    ];

    console.log('📝 Ventas a cargar:\n');
    ventasDemo.forEach((venta, idx) => {
      console.log(`${idx + 1}. ${venta.tipo === 'mobile' ? '📱' : '🏠'} ${venta.planName} - ₡${venta.planPrice.toLocaleString()}`);
    });
    console.log('');

    // Cargar ventas en Firestore
    for (let i = 0; i < ventasDemo.length; i++) {
      const venta = ventasDemo[i];
      const collectionName = venta.tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      
      try {
        const docRef = await db.collection(collectionName).add(venta);
        console.log(`✅ Venta ${i + 1} cargada: ${docRef.id}`);
      } catch (error) {
        console.error(`❌ Error cargando venta ${i + 1}:`, error);
      }
    }

    console.log('\n✅ ¡Carga completada!');
    console.log('🎯 Ahora puedes ver las ventas en: https://executiveperformancek.web.app');
    console.log('📋 Pestaña: "Mis Ventas"');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cargarVentasDemo();
