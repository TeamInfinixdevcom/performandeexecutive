/**
 * FIX CNAJERA: Agregar el campo 'uid' a todas sus ventas
 * Para ejecutar: node scripts/fix-cnajera-sales-uid.js
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

async function fixCnajeraSalesUID() {
  try {
    console.log('🔧 Iniciando reparación de ventas de cnajera...\n');

    // 1. Buscar usuario
    const usersSnapshot = await db.collection('users')
      .where('email', '==', 'cnajera@ice.go.cr')
      .get();

    if (usersSnapshot.empty) {
      console.error('❌ Usuario cnajera@ice.go.cr no encontrado');
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`✅ Usuario encontrado: ${userData.displayName || userData.name} (${userId})\n`);

    let totalFixed = 0;
    let mobileFixed = 0;
    let homeFixed = 0;

    // 2. Reparar ventas móviles SIN uid
    console.log('📱 Reparando ventas móviles...');
    const ventasMobileSnapshot = await db.collection('ventas').get();
    
    for (const doc of ventasMobileSnapshot.docs) {
      const venta = doc.data();
      
      // Buscar por diferentes campos para identificar si es de cnajera
      const isOwned = venta.uid === userId || 
                     (venta.executiveId === userId) ||
                     (venta.userEmail === userData.email);
      
      if (isOwned && !venta.uid) {
        console.log(`   🔄 Agregando uid a venta: ${doc.id}`);
        await db.collection('ventas').doc(doc.id).update({
          uid: userId,
          fixedAt: admin.firestore.FieldValue.serverTimestamp(),
          fixedBy: 'fix-cnajera-sales-uid'
        });
        mobileFixed++;
        totalFixed++;
      }
    }

    if (mobileFixed === 0) {
      console.log('   ✅ No hay ventas móviles que reparar\n');
    } else {
      console.log(`   ✅ ${mobileFixed} venta(s) móvil(es) reparada(s)\n`);
    }

    // 3. Reparar ventas hogar SIN uid
    console.log('🏠 Reparando ventas hogar...');
    const ventasHomeSnapshot = await db.collection('ventas_hogar').get();
    
    for (const doc of ventasHomeSnapshot.docs) {
      const venta = doc.data();
      
      // Buscar por diferentes campos para identificar si es de cnajera
      const isOwned = venta.uid === userId || 
                     (venta.executiveId === userId) ||
                     (venta.userEmail === userData.email);
      
      if (isOwned && !venta.uid) {
        console.log(`   🔄 Agregando uid a venta: ${doc.id}`);
        await db.collection('ventas_hogar').doc(doc.id).update({
          uid: userId,
          fixedAt: admin.firestore.FieldValue.serverTimestamp(),
          fixedBy: 'fix-cnajera-sales-uid'
        });
        homeFixed++;
        totalFixed++;
      }
    }

    if (homeFixed === 0) {
      console.log('   ✅ No hay ventas hogar que reparar\n');
    } else {
      console.log(`   ✅ ${homeFixed} venta(s) hogar reparada(s)\n`);
    }

    // 4. Resultado final
    console.log('📊 RESULTADO:');
    console.log(`   Total ventas reparadas: ${totalFixed}`);
    console.log(`   - Móviles: ${mobileFixed}`);
    console.log(`   - Hogar: ${homeFixed}\n`);

    if (totalFixed > 0) {
      console.log('✅ ¡Reparación completada!');
      console.log('   cnajera ahora puede editar y eliminar sus ventas correctamente.');
    } else {
      console.log('ℹ️ No había ventas que reparar.');
      console.log('   Asegúrate de que las nuevas ventas se crean con el campo uid correcto.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCnajeraSalesUID();
