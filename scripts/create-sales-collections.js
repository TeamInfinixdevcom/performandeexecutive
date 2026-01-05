/**
 * Script para crear las colecciones MetasVentasAnuales y Pedidos en Firestore
 * Ejecutar: node create-sales-collections.js
 */

const admin = require('firebase-admin');

// Inicializar sin service account usando credenciales de aplicación por defecto
admin.initializeApp({
    projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function createCollections() {
    console.log('🚀 Creando colecciones de ventas en Firestore...\n');

    try {
        // Obtener un usuario ejecutivo existente
        console.log('👤 Buscando usuarios ejecutivos...');
        const usersSnapshot = await db.collection('users')
            .where('role', 'in', ['executive', 'admin'])
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.log('❌ No se encontraron ejecutivos en el sistema.');
            console.log('   Primero crea un usuario con rol "executive" o "admin".\n');
            process.exit(1);
        }

        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email || 'ejecutivo@example.com';

        console.log(`✅ Usuario encontrado: ${userEmail} (${userId})\n`);

        // 1. Crear colección MetasVentasAnuales
        console.log('📊 Creando colección "MetasVentasAnuales"...');
        const metaRef = db.collection('MetasVentasAnuales').doc(userId);
        
        await metaRef.set({
            executiveId: userId,
            executiveEmail: userEmail,
            annualGoal: 800,
            year: 2025,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });
        
        console.log('   ✅ Meta anual creada: 800 ventas para el año 2025');
        console.log(`   📍 Documento ID: ${userId}\n`);

        // 2. Crear colección Pedidos con ejemplos
        console.log('📦 Creando colección "Pedidos" con pedidos de ejemplo...');
        
        const pedidosEjemplo = [
            {
                executiveId: userId,
                executiveEmail: userEmail,
                orderNumber: 'KO-52814629',
                type: 'KOMERCIAL',
                clientName: 'JUAN PÉREZ GARCÍA',
                cedula: '109460037',
                hasDevice: true,
                deviceType: 'TELEFONO',
                deviceIMEI: '123456789012345',
                status: 'COMPLETADA',
                year: 2025,
                registeredAt: admin.firestore.Timestamp.now(),
                completedAt: admin.firestore.Timestamp.now()
            },
            {
                executiveId: userId,
                executiveEmail: userEmail,
                orderNumber: '1-21294343713',
                type: 'SIEBEL',
                clientName: 'MARÍA RODRÍGUEZ LÓPEZ',
                cedula: '205780123',
                hasDevice: false,
                deviceType: null,
                deviceIMEI: null,
                status: 'PENDIENTE',
                year: 2025,
                registeredAt: admin.firestore.Timestamp.now(),
                completedAt: null
            },
            {
                executiveId: userId,
                executiveEmail: userEmail,
                orderNumber: 'KO-98765432',
                type: 'KOMERCIAL',
                clientName: 'CARLOS GONZÁLEZ MORA',
                cedula: '304567890',
                hasDevice: true,
                deviceType: 'ACCESORIO',
                deviceIMEI: null,
                status: 'COMPLETADA',
                year: 2025,
                registeredAt: admin.firestore.Timestamp.now(),
                completedAt: admin.firestore.Timestamp.now()
            }
        ];

        for (let i = 0; i < pedidosEjemplo.length; i++) {
            const pedido = pedidosEjemplo[i];
            const pedidoRef = db.collection('Pedidos').doc();
            pedido.id = pedidoRef.id;
            
            await pedidoRef.set(pedido);
            console.log(`   ✅ Pedido ${i + 1}: ${pedido.orderNumber} - ${pedido.status}`);
            console.log(`      Cliente: ${pedido.clientName}`);
            console.log(`      Documento ID: ${pedido.id}`);
        }

        console.log('\n🎉 ¡Colecciones creadas exitosamente!\n');
        console.log('📊 Resumen:');
        console.log('   ✅ MetasVentasAnuales: 1 documento');
        console.log('      - Meta anual: 800 ventas');
        console.log('      - Año: 2025');
        console.log('   ✅ Pedidos: 3 documentos');
        console.log('      - 2 completadas');
        console.log('      - 1 pendiente');
        console.log('   📈 Progreso actual: 2/800 = 0.25%\n');

        console.log('🔗 Verifica en Firebase Console:');
        console.log('   https://console.firebase.google.com/project/executiveperformancek/firestore/data\n');
        
        console.log('✅ Ahora puedes:');
        console.log('   1. Recargar tu aplicación web');
        console.log('   2. Ir a "Registro de Ventas"');
        console.log('   3. Ver las métricas: 2 / 800\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n💡 Sugerencia:');
        console.error('   Asegúrate de estar autenticado en Firebase:');
        console.error('   firebase login\n');
        process.exit(1);
    }

    process.exit(0);
}

// Ejecutar
createCollections();
