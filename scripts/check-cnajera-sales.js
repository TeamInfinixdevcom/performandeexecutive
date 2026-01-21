/**
 * DIAGNÓSTICO: Revisar las ventas de cnajera
 * Para ejecutar: node check-cnajera-sales.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccountPath = path.join(__dirname, '../firebase-SEGURO.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://servicio-tecnico-8d0e2.firebaseio.com'
});

const db = admin.firestore();

async function checkCnajeraSales() {
  try {
    console.log('🔍 Buscando al usuario cnajera...\n');

    // 1. Buscar usuario por email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'cnajera@ice.go.cr')
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ Usuario cnajera@ice.go.cr no encontrado en Firestore');
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('✅ Usuario encontrado:');
    console.log(`   UID: ${userId}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Nombre: ${userData.displayName || userData.name || 'N/A'}`);
    console.log(`   Rol: ${userData.role}`);
    console.log(`   Activo: ${userData.isActive}\n`);

    // 2. Revisar ventas móviles
    console.log('📱 VENTAS MÓVILES:');
    const ventasMobileSnapshot = await db.collection('ventas')
      .where('uid', '==', userId)
      .limit(5)
      .get();

    if (ventasMobileSnapshot.empty) {
      console.log('   ℹ️ No hay ventas móviles\n');
    } else {
      console.log(`   ✅ Encontradas ${ventasMobileSnapshot.size} ventas (mostrando máximo 5)\n`);
      
      ventasMobileSnapshot.docs.forEach((doc, index) => {
        const venta = doc.data();
        console.log(`   ${index + 1}. Venta ID: ${doc.id}`);
        console.log(`      - uid: ${venta.uid || 'FALTANTE ❌'}`);
        console.log(`      - executiveId: ${venta.executiveId || 'N/A'}`);
        console.log(`      - Cliente: ${venta.nombreCliente || 'N/A'}`);
        console.log(`      - Plan: ${venta.plan || 'N/A'}`);
        console.log(`      - Cédula: ${venta.cedulaCliente || 'N/A'}`);
        console.log(`      - Fecha: ${venta.fecha?.toDate?.() || venta.fecha || 'N/A'}\n`);
      });
    }

    // 3. Revisar ventas hogar
    console.log('🏠 VENTAS HOGAR:');
    const ventasHomeSnapshot = await db.collection('ventas_hogar')
      .where('uid', '==', userId)
      .limit(5)
      .get();

    if (ventasHomeSnapshot.empty) {
      console.log('   ℹ️ No hay ventas hogar\n');
    } else {
      console.log(`   ✅ Encontradas ${ventasHomeSnapshot.size} ventas (mostrando máximo 5)\n`);
      
      ventasHomeSnapshot.docs.forEach((doc, index) => {
        const venta = doc.data();
        console.log(`   ${index + 1}. Venta ID: ${doc.id}`);
        console.log(`      - uid: ${venta.uid || 'FALTANTE ❌'}`);
        console.log(`      - executiveId: ${venta.executiveId || 'N/A'}`);
        console.log(`      - Cliente: ${venta.customerName || 'N/A'}`);
        console.log(`      - Número de Hogar: ${venta.homeNumber || 'N/A'}`);
        console.log(`      - Plan: ${venta.plan || 'N/A'}`);
        console.log(`      - Fecha: ${venta.fecha?.toDate?.() || venta.fecha || 'N/A'}\n`);
      });
    }

    // 4. Resumen
    console.log('📊 RESUMEN:');
    const totalVentas = ventasMobileSnapshot.size + ventasHomeSnapshot.size;
    console.log(`   Total de ventas: ${totalVentas}`);
    
    if (totalVentas > 0) {
      // Revisar si hay ventas SIN el campo uid (problema)
      const allVentas = [...ventasMobileSnapshot.docs, ...ventasHomeSnapshot.docs];
      const ventasSinUID = allVentas.filter(doc => !doc.data().uid).length;
      
      if (ventasSinUID > 0) {
        console.log(`\n⚠️ ADVERTENCIA: ${ventasSinUID} venta(s) sin el campo 'uid' ❌`);
        console.log('   Estas ventas NO se pueden editar ni eliminar por falta de permisos.');
        console.log('\n💡 SOLUCIÓN:');
        console.log('   Ejecutar: node scripts/fix-cnajera-sales-uid.js');
      } else {
        console.log('   ✅ Todas las ventas tienen el campo uid correctamente');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCnajeraSales();
