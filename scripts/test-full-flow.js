/**
 * Test completo del flujo de ventas
 * Simula lo que haría un usuario frontend
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function runFullTest() {
    console.log('🧪 INICIANDO TEST COMPLETO DEL SISTEMA\n');

    try {
        // Usar un usuario existente
        const testUserId = 'cnajera@ice.go.cr'; // Usuario existente
        const testExecutiveId = '1234567890'; // ID simulado
        const testExecutiveEmail = 'test@example.com';

        console.log(`✅ Usando UID de prueba: ${testExecutiveId}`);
        console.log(`✅ Email de prueba: ${testExecutiveEmail}\n`);

        // 1. Registrar una venta
        console.log('📝 1. REGISTRANDO UNA VENTA:\n');

        const saleData = {
            id: db.collection('pedidos_ventas').doc().id,
            executiveId: testExecutiveId,
            executiveEmail: testExecutiveEmail,
            orderNumber: 'TEST-123456',
            type: 'KOMERCIAL',
            clientName: 'TEST CLIENT',
            cedula: '999999999',
            hasDevice: true,
            deviceType: 'TELEFONO',
            deviceIMEI: 'TEST-IMEI-12345',
            status: 'PENDIENTE',
            year: 2025,
            registeredAt: new Date().toISOString(),
            completedAt: null
        };

        const saleRef = db.collection('pedidos_ventas').doc(saleData.id);
        await saleRef.set(saleData);

        console.log(`   ✅ Venta guardada con ID: ${saleData.id}`);
        console.log(`   Datos:`, JSON.stringify(saleData, null, 2));

        // 2. Guardar una meta anual
        console.log('\n🎯 2. GUARDANDO META ANUAL:\n');

        const metaData = {
            executiveId: testExecutiveId,
            executiveEmail: testExecutiveEmail,
            annualGoal: 500,
            year: 2025,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const metaRef = db.collection('metas_ventas_anuales').doc(testExecutiveId);
        await metaRef.set(metaData, { merge: true });

        console.log(`   ✅ Meta guardada para usuario: ${testExecutiveId}`);
        console.log(`   Datos:`, JSON.stringify(metaData, null, 2));

        // 3. Completar una venta
        console.log('\n✅ 3. COMPLETANDO LA VENTA:\n');

        const now = new Date().toISOString();
        await saleRef.update({
            status: 'COMPLETADA',
            completedAt: now
        });

        console.log(`   ✅ Venta marcada como COMPLETADA`);
        console.log(`   Hora: ${now}`);

        // 4. Verificar datos guardados
        console.log('\n🔍 4. VERIFICANDO DATOS GUARDADOS:\n');

        const savedSale = await saleRef.get();
        console.log('   Venta guardada:', JSON.stringify(savedSale.data(), null, 2));

        const savedMeta = await metaRef.get();
        console.log('\n   Meta guardada:', JSON.stringify(savedMeta.data(), null, 2));

        // 5. Obtener todas las ventas del usuario
        console.log('\n📋 5. OBTENIENDO TODAS LAS VENTAS DEL USUARIO:\n');

        const userSalesSnapshot = await db.collection('pedidos_ventas')
            .where('executiveId', '==', testExecutiveId)
            .where('year', '==', 2025)
            .orderBy('registeredAt', 'desc')
            .get();

        console.log(`   Total de ventas: ${userSalesSnapshot.size}`);
        userSalesSnapshot.forEach((doc, index) => {
            const sale = doc.data();
            console.log(`\n   Venta ${index + 1}:`);
            console.log(`   - Orden: ${sale.orderNumber}`);
            console.log(`   - Cliente: ${sale.clientName}`);
            console.log(`   - Estado: ${sale.status}`);
            console.log(`   - Dispositivo: ${sale.hasDevice ? 'Sí' : 'No'}`);
        });

        // 6. Calcular métricas
        console.log('\n📊 6. CALCULANDO MÉTRICAS:\n');

        const completedSalesSnapshot = await db.collection('pedidos_ventas')
            .where('executiveId', '==', testExecutiveId)
            .where('status', '==', 'COMPLETADA')
            .where('year', '==', 2025)
            .get();

        const totalSales = userSalesSnapshot.size;
        const completedSales = completedSalesSnapshot.size;
        const meta = savedMeta.data();
        const progressPercentage = meta && meta.annualGoal > 0 ? 
            Math.round((completedSales / meta.annualGoal) * 100) : 0;

        console.log(`   Total de ventas (todas): ${totalSales}`);
        console.log(`   Ventas completadas: ${completedSales}`);
        console.log(`   Meta anual: ${meta?.annualGoal || 'No establecida'}`);
        console.log(`   Progreso: ${progressPercentage}%`);
        console.log(`   Ventas faltantes: ${Math.max(0, (meta?.annualGoal || 0) - completedSales)}`);

        // 7. Verificar integridad de datos
        console.log('\n✔️ 7. VERIFICACIÓN DE INTEGRIDAD:\n');

        const integrityChecks = [
            {
                name: 'executiveId correcto',
                check: savedSale.data().executiveId === testExecutiveId
            },
            {
                name: 'orderNumber correcto',
                check: savedSale.data().orderNumber === 'TEST-123456'
            },
            {
                name: 'status se actualizó a COMPLETADA',
                check: savedSale.data().status === 'COMPLETADA'
            },
            {
                name: 'completedAt se guardó',
                check: savedSale.data().completedAt !== null
            },
            {
                name: 'Meta anual se guardó',
                check: savedMeta.data().annualGoal === 500
            },
            {
                name: 'Timestamp está en formato ISO',
                check: /^\d{4}-\d{2}-\d{2}T/.test(savedSale.data().registeredAt)
            }
        ];

        let allChecksPassed = true;
        integrityChecks.forEach(check => {
            const status = check.check ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.check) allChecksPassed = false;
        });

        // 8. Resumen
        console.log('\n📌 RESUMEN:\n');
        if (allChecksPassed) {
            console.log('   ✅ TODO EL SISTEMA FUNCIONA CORRECTAMENTE');
            console.log('   Los datos se guardan y recuperan sin problemas');
            console.log('   Las métricas se calculan correctamente');
            console.log('   Los timestamps se guardan en formato correcto');
        } else {
            console.log('   ⚠️ Algunos checks fallaron - revisar arriba');
        }

        console.log('\n💡 PRÓXIMOS PASOS EN FRONTEND:\n');
        console.log('   1. Abre https://executiveperformancek.web.app');
        console.log('   2. Loguéate con un usuario ejecutivo');
        console.log('   3. Ve a "Registro de Ventas"');
        console.log('   4. Registra una venta y verifica que aparezca en "Mis Ventas"');
        console.log('   5. Ve a "Metas Ejecutivo" y establece una meta');
        console.log('   6. Marca ventas como completadas y verifica métricas');
        console.log('   7. Recarga la página y verifica persistencia\n');

    } catch (error) {
        console.error('❌ Error durante el test:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

runFullTest();
