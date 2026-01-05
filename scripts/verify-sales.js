const admin = require('firebase-admin');

// Cargar credenciales
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function verifySales() {
  try {
    const snapshot = await db.collection('pedidos_ventas').get();
    
    console.log('\n📊 VERIFICACIÓN DE VENTAS EN FIRESTORE');
    console.log('=====================================');
    console.log(`Total de documentos: ${snapshot.size}\n`);
    
    let totalSales = 0;
    let pendingSales = 0;
    let completedSales = 0;
    
    snapshot.forEach(doc => {
      const sale = doc.data();
      console.log(`\n📌 Documento ID: ${doc.id}`);
      console.log(`   Pedido: ${sale.orderNumber}`);
      console.log(`   Cliente: ${sale.clientName}`);
      console.log(`   Cédula: ${sale.cedula}`);
      console.log(`   Estado: ${sale.status}`);
      console.log(`   Ejecutivo: ${sale.executiveId}`);
      
      totalSales++;
      if (sale.status === 'PENDIENTE') pendingSales++;
      if (sale.status === 'COMPLETADA') completedSales++;
    });
    
    console.log('\n=====================================');
    console.log(`✅ Total: ${totalSales}`);
    console.log(`⏳ Pendientes: ${pendingSales}`);
    console.log(`✅ Completadas: ${completedSales}`);
    console.log('=====================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifySales();
