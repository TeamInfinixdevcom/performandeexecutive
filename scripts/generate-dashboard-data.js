#!/usr/bin/env node

/**
 * Script para generar datos completos del dashboard antiguo
 * Ejecutar: node generate-dashboard-data.js
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

const adminUID = 'yF8fwbUQFpXXlOfUMyvQmHmBgNI3'; // rmadrigalj
const bossUID = '2Axk1xzj5MYloAitQtqn2daJ8dJ3'; // cobandoa (Carlos)

const segments = ['PLATINO', 'ORO', 'PLATA', 'BRONCE', 'BLACK'];
const segmentScores = {
  'PLATINO': { min: 700, max: 800 },
  'ORO': { min: 600, max: 700 },
  'PLATA': { min: 500, max: 600 },
  'BRONCE': { min: 400, max: 500 },
  'BLACK': { min: 300, max: 400 }
};

async function generateDashboardData() {
  try {
    console.log('📊 Generando datos completos del dashboard...\n');

    // Generar estadísticas para ambos usuarios
    for (const userUID of [adminUID, bossUID]) {
      const userName = userUID === adminUID ? 'rmadrigalj' : 'cobandoa (Carlos)';
      console.log(`\n👤 Generando para: ${userName}`);

      // Crear documento de estadísticas
      const statsRef = db.collection('users').doc(userUID).collection('stats').doc('dashboard');
      
      const stats = {
        totalClientes: 20,
        segmentDistribution: {
          PLATINO: 4,
          ORO: 5,
          PLATA: 5,
          BRONCE: 4,
          BLACK: 2
        },
        averageScoreBySegment: {
          PLATINO: 750,
          ORO: 650,
          PLATA: 550,
          BRONCE: 450,
          BLACK: 350
        },
        clientTrendByMonth: {
          '2025-09': 18,
          '2025-10': 19,
          '2025-11': 20
        },
        performanceBySegment: {
          PLATINO: { nuevos: 2, activos: 4, inactivos: 0 },
          ORO: { nuevos: 1, activos: 4, inactivos: 1 },
          PLATA: { nuevos: 1, activos: 4, inactivos: 1 },
          BRONCE: { nuevos: 0, activos: 3, inactivos: 1 },
          BLACK: { nuevos: 0, activos: 2, inactivos: 0 }
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await statsRef.set(stats, { merge: true });
      console.log(`   ✅ Estadísticas creadas`);

      // Crear eventos mensuales para la gráfica de tendencia
      const today = new Date();
      for (let month = 2; month >= 0; month--) {
        const date = new Date(today.getFullYear(), today.getMonth() - month, 1);
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const eventRef = db.collection('users').doc(userUID).collection('monthly_stats').doc(monthStr);
        const eventData = {
          month: monthStr,
          totalClientes: 18 + month,
          nuevosClientes: Math.floor(Math.random() * 3),
          clientesPerdidos: Math.floor(Math.random() * 2),
          ventasExitosas: Math.floor(Math.random() * 8) + 5,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await eventRef.set(eventData);
      }
      console.log(`   ✅ Datos mensuales creados`);
    }

    console.log(`\n` + '='.repeat(50));
    console.log('✅ DATOS DEL DASHBOARD GENERADOS');
    console.log('='.repeat(50));
    console.log(`Usuarios: 2 (rmadrigalj y Carlos)`);
    console.log(`Gráficos completados:`);
    console.log(`  ✅ Distribución por Segmento`);
    console.log(`  ✅ Score Promedio por Segmento`);
    console.log(`  ✅ Tendencia de Clientes por Mes`);
    console.log(`  ✅ Desempeño por Segmento`);
    console.log('='.repeat(50));
    console.log('\n✅ ¡Dashboard listo con todos los datos!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Ejecutar
generateDashboardData();
