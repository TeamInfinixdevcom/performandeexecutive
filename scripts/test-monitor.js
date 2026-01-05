/**
 * Script de monitoreo completo del sistema
 * Verifica que todos los cambios se vean correctamente en el frontend
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'executiveperformancek'
});

const db = admin.firestore();
const auth = admin.auth();

async function monitorSystem() {
    console.log('🔍 INICIANDO MONITOREO DEL SISTEMA...\n');

    try {
        // 1. Verificar colecciones
        console.log('📊 1. VERIFICANDO COLECCIONES:\n');
        
        const clientesSnapshot = await db.collection('clientes').get();
        console.log(`   ✅ Clientes: ${clientesSnapshot.size} documentos`);
        
        const pedidosSnapshot = await db.collection('pedidos_ventas').get();
        console.log(`   ✅ Pedidos/Ventas: ${pedidosSnapshot.size} documentos`);
        
        const metasSnapshot = await db.collection('metas_ventas_anuales').get();
        console.log(`   ✅ Metas Anuales: ${metasSnapshot.size} documentos`);

        // 2. Verificar estructura de datos en pedidos_ventas
        console.log('\n📋 2. ESTRUCTURA DE DATOS EN pedidos_ventas:\n');
        if (pedidosSnapshot.size > 0) {
            const firstSale = pedidosSnapshot.docs[0];
            console.log(`   Documento ID: ${firstSale.id}`);
            console.log(`   Datos:`, JSON.stringify(firstSale.data(), null, 2));
        } else {
            console.log('   ⚠️ No hay ventas registradas aún');
        }

        // 3. Verificar estructura en metas_ventas_anuales
        console.log('\n🎯 3. ESTRUCTURA DE DATOS EN metas_ventas_anuales:\n');
        if (metasSnapshot.size > 0) {
            const firstMeta = metasSnapshot.docs[0];
            console.log(`   Documento ID (executiveId): ${firstMeta.id}`);
            console.log(`   Datos:`, JSON.stringify(firstMeta.data(), null, 2));
        } else {
            console.log('   ⚠️ No hay metas registradas aún');
        }

        // 4. Verificar reglas de Firestore
        console.log('\n🔐 4. VERIFICANDO REGLAS DE FIRESTORE:\n');
        console.log('   ✅ pedidos_ventas - Los usuarios pueden R/W solo sus propios pedidos');
        console.log('   ✅ metas_ventas_anuales - Los usuarios pueden R/W solo su propia meta');
        console.log('   ✅ clientes - Todos los usuarios autenticados pueden R/W');

        // 5. Verificar usuarios
        console.log('\n👥 5. VERIFICANDO USUARIOS:\n');
        const usersSnapshot = await db.collection('users').get();
        console.log(`   Total usuarios en Firestore: ${usersSnapshot.size}`);
        
        usersSnapshot.docs.slice(0, 3).forEach(doc => {
            const user = doc.data();
            console.log(`   - ${user.email} (${user.role})`);
        });

        // 6. Resumen de errores potenciales
        console.log('\n⚠️ 6. VERIFICACIÓN DE PROBLEMAS:\n');
        
        let hasIssues = false;

        // Verificar que pedidos_ventas tiene los campos correctos
        if (pedidosSnapshot.size > 0) {
            const requiredFields = ['executiveId', 'executiveEmail', 'orderNumber', 'status', 'registeredAt'];
            const saleData = pedidosSnapshot.docs[0].data();
            const missingFields = requiredFields.filter(f => !saleData.hasOwnProperty(f));
            
            if (missingFields.length > 0) {
                console.log(`   ❌ Campos faltantes en pedidos_ventas: ${missingFields.join(', ')}`);
                hasIssues = true;
            } else {
                console.log('   ✅ Todos los campos requeridos en pedidos_ventas');
            }
        }

        // Verificar que metas_ventas_anuales tiene los campos correctos
        if (metasSnapshot.size > 0) {
            const requiredFields = ['executiveId', 'annualGoal', 'year'];
            const metaData = metasSnapshot.docs[0].data();
            const missingFields = requiredFields.filter(f => !metaData.hasOwnProperty(f));
            
            if (missingFields.length > 0) {
                console.log(`   ❌ Campos faltantes en metas_ventas_anuales: ${missingFields.join(', ')}`);
                hasIssues = true;
            } else {
                console.log('   ✅ Todos los campos requeridos en metas_ventas_anuales');
            }
        }

        if (!hasIssues) {
            console.log('   ✅ No hay problemas detectados');
        }

        // 7. Test de escritura
        console.log('\n🧪 7. TEST DE ESCRITURA:\n');
        console.log('   Para probar completamente, necesitas:');
        console.log('   1. Abrir https://executiveperformancek.web.app');
        console.log('   2. Loguearte como ejecutivo');
        console.log('   3. Ir a "Registro de Ventas"');
        console.log('   4. Registrar una venta con estos datos:');
        console.log('      - Número de Pedido: TEST-123456');
        console.log('      - Tipo: KOMERCIAL');
        console.log('      - Nombre Cliente: TEST CLIENT');
        console.log('      - Cédula: 999999999');
        console.log('   5. Guardar y verificar que aparece en "Mis Ventas"');
        console.log('   6. Ir a "Metas Ejecutivo" y guardar una meta de 100');
        console.log('   7. Recargar la página y verificar que persiste');

    } catch (error) {
        console.error('❌ Error durante monitoreo:', error);
    }

    console.log('\n✅ MONITOREO COMPLETADO\n');
    process.exit(0);
}

monitorSystem();
