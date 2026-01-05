/**
 * Script para inicializar las colecciones de Pedidos y MetasVentasAnuales
 * 
 * Ejecutar con: node init-sales-collections.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-SEGURO.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initCollections() {
  console.log('🚀 Inicializando colecciones de ventas...\n');

  try {
    // 1. Verificar estructura de Pedidos
    console.log('📋 Estructura de colección "Pedidos":');
    console.log(`
    Pedidos/
    ├─ id: string (auto-generado)
    ├─ executiveId: string (UID del ejecutivo)
    ├─ executiveEmail: string
    ├─ orderNumber: string (ej: "KO-52814629" o "1-21294343713")
    ├─ type: string ("KOMERCIAL" o "SIEBEL")
    ├─ clientName: string (mayúsculas)
    ├─ cedula: string (número de identificación)
    ├─ hasDevice: boolean
    ├─ deviceType: string | null ("TELEFONO" o "ACCESORIO")
    ├─ deviceIMEI: string | null
    ├─ status: string ("PENDIENTE" o "COMPLETADA")
    ├─ year: number (ej: 2025)
    ├─ registeredAt: Timestamp
    └─ completedAt: Timestamp | null
    `);

    // 2. Verificar estructura de MetasVentasAnuales
    console.log('🎯 Estructura de colección "MetasVentasAnuales":');
    console.log(`
    MetasVentasAnuales/
    ├─ [executiveId]: {
        ├─ executiveId: string (UID del ejecutivo)
        ├─ executiveEmail: string
        ├─ annualGoal: number (cantidad de pedidos meta)
        ├─ year: number (ej: 2025)
        ├─ createdAt: Timestamp
        └─ updatedAt: Timestamp
    }
    `);

    // 3. Listar usuarios ejecutivos existentes
    console.log('\n👥 Buscando ejecutivos en el sistema...');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('⚠️  No se encontraron usuarios. Primero crea usuarios ejecutivos.');
      return;
    }

    const executives = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.role === 'executive' || userData.role === 'admin') {
        executives.push({
          id: doc.id,
          email: userData.email,
          name: userData.name || 'Sin nombre'
        });
      }
    });

    console.log(`✅ Encontrados ${executives.length} ejecutivos/admins:\n`);
    executives.forEach(exec => {
      console.log(`   - ${exec.name} (${exec.email})`);
    });

    // 4. Crear índices recomendados
    console.log('\n📊 Índices recomendados para crear en Firebase Console:');
    console.log(`
    Colección: Pedidos
    Índices compuestos:
    1. executiveId (ASC) + year (ASC) + registeredAt (DESC)
    2. executiveId (ASC) + status (ASC) + year (ASC)
    3. status (ASC) + year (ASC) + registeredAt (DESC)
    
    Colección: MetasVentasAnuales
    No requiere índices adicionales (búsqueda por documento ID)
    `);

    console.log('\n✅ Verificación completada.');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Las colecciones se crearán automáticamente al guardar el primer documento');
    console.log('2. Guarda una meta desde la UI: "Registro de Ventas" → "Mi Meta Anual"');
    console.log('3. Registra un pedido desde el formulario de ventas');
    console.log('4. Los índices se crearán automáticamente o puedes crearlos manualmente en Firebase Console');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
initCollections();
