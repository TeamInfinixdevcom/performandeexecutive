#!/usr/bin/env node

/**
 * Script para generar datos de ventas de ejemplo
 * Ejecutar: node generate-sales-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Cargar credenciales
const serviceAccount = require(path.join(__dirname, 'executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

// UIDs de usuarios
const adminUID = 'yF8fwbUQFpXXlOfUMyvQmHmBgNI3'; // rmadrigalj
const bossUID = '2Axk1xzj5MYloAitQtqn2daJ8dJ3'; // cobandoa (Carlos)

const segments = ['PLATINO', 'ORO', 'PLATA', 'BRONCE', 'BLACK'];

async function generateSalesData() {
  try {
    console.log('📊 Generando datos de ventas de ejemplo...\n');

    let totalCreated = 0;

    // Generar para ambos usuarios
    for (const userUID of [adminUID, bossUID]) {
      const userName = userUID === adminUID ? 'rmadrigalj' : 'cobandoa (Carlos)';
      console.log(`\n👤 Generando para: ${userName}`);

      // Obtener clientes del usuario
      const clientsSnapshot = await db.collection('clients')
        .where('executiveId', '==', userUID)
        .limit(20)
        .get();

      console.log(`   Encontrados ${clientsSnapshot.size} clientes\n`);

      let userSalesCount = 0;
      const batch = db.batch();

      // Crear 40-50 ventas para los últimos 30 días
      for (let day = 0; day < 30; day++) {
        const salesPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 ventas por día

        for (let i = 0; i < salesPerDay; i++) {
          const date = new Date();
          date.setDate(date.getDate() - day);
          date.setHours(Math.floor(Math.random() * 24));
          date.setMinutes(Math.floor(Math.random() * 60));
          date.setSeconds(Math.floor(Math.random() * 60));

          const randomClient = clientsSnapshot.docs[
            Math.floor(Math.random() * clientsSnapshot.docs.length)
          ];
          const clientData = randomClient.data();
          const segment = segments[Math.floor(Math.random() * segments.length)];

          const saleRef = db.collection('sales_metrics').doc();
          const saleData = {
            executiveId: userUID,
            segmento: segment,
            clientName: clientData.name || clientData.nombre || 'Cliente Desconocido',
            clientId: randomClient.id,
            date: admin.firestore.Timestamp.fromDate(date),
            dateStr: date.toISOString().split('T')[0],
            month: String(date.getMonth() + 1).padStart(2, '0'),
            monthStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            year: date.getFullYear(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          batch.set(saleRef, saleData);
          userSalesCount++;
          totalCreated++;

          // Limitar batch a 500
          if (userSalesCount % 500 === 0) {
            await batch.commit();
            console.log(`   ✅ ${userSalesCount} ventas guardadas`);
          }
        }
      }

      if (userSalesCount % 500 !== 0) {
        await batch.commit();
        console.log(`   ✅ ${userSalesCount} ventas guardadas`);
      }
    }

    console.log(`\n` + '='.repeat(50));
    console.log('✅ DATOS GENERADOS');
    console.log('='.repeat(50));
    console.log(`Total de ventas creadas: ${totalCreated}`);
    console.log(`Usuarios: 2 (rmadrigalj y Carlos)`);
    console.log(`Período: Últimos 30 días`);
    console.log(`Segmentos: Todos`);
    console.log('='.repeat(50));
    console.log('\n✅ ¡Datos listos! Ya puedes ver los gráficos en el dashboard.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Ejecutar
generateSalesData();
