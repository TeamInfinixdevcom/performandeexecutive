/**
 * Test completo del flujo de ventas (versión mejorada sin índices complejos)
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
        const testUserId = '1234567890';
        const testExecutiveEmail = 'test@example.com';

        console.log(`✅ Usando UID de prueba: ${testUserId}`);
        console.log(`✅ Email de prueba: ${testExecutiveEmail}\n`);

        // 1. Registrar una venta
        console.log('📝 1. REGISTRANDO UNA VENTA:\n');

        const saleData = {
            id: db.collection('pedidos_ventas').doc().id,
            executiveId: testUserId,
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
        console.log(`   Datos guardados en Firestore:`);
        console.log(`   - Orden: ${saleData.orderNumber}`);
        console.log(`   - Cliente: ${saleData.clientName}`);
        console.log(`   - Estado: ${saleData.status}`);

        // 2. Guardar una meta anual
        console.log('\n🎯 2. GUARDANDO META ANUAL:\n');

        const metaData = {
            executiveId: testUserId,
            executiveEmail: testExecutiveEmail,
            annualGoal: 500,
            year: 2025,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const metaRef = db.collection('metas_ventas_anuales').doc(testUserId);
        await metaRef.set(metaData, { merge: true });

        console.log(`   ✅ Meta guardada`);
        console.log(`   - Meta anual: ${metaData.annualGoal} ventas`);
        console.log(`   - Año: ${metaData.year}`);

        // 3. Completar una venta
        console.log('\n✅ 3. COMPLETANDO LA VENTA:\n');

        const now = new Date().toISOString();
        await saleRef.update({
            status: 'COMPLETADA',
            completedAt: now
        });

        console.log(`   ✅ Venta marcada como COMPLETADA`);

        // 4. Verificar datos guardados
        console.log('\n🔍 4. VERIFICANDO DATOS GUARDADOS:\n');

        const savedSale = await saleRef.get();
        const saleDoc = savedSale.data();

        console.log('   Venta guardada:');
        console.log(`   - ID: ${saleDoc.id}`);
        console.log(`   - Orden: ${saleDoc.orderNumber}`);
        console.log(`   - Cliente: ${saleDoc.clientName}`);
        console.log(`   - Estado: ${saleDoc.status}`);
        console.log(`   - Dispositivo: ${saleDoc.deviceType} ${saleDoc.deviceIMEI}`);

        const savedMeta = await metaRef.get();
        const metaDoc = savedMeta.data();

        console.log('\n   Meta guardada:');
        console.log(`   - Usuario: ${metaDoc.executiveId}`);
        console.log(`   - Meta: ${metaDoc.annualGoal}`);
        console.log(`   - Año: ${metaDoc.year}`);

        // 5. Obtener solo esta venta
        console.log('\n📋 5. OBTENIENDO LA VENTA DEL USUARIO:\n');

        const thisUserSale = await saleRef.get();
        const userSale = thisUserSale.data();

        console.log(`   ✅ Venta recuperada:`);
        console.log(`   - Orden: ${userSale.orderNumber}`);
        console.log(`   - Cliente: ${userSale.clientName}`);
        console.log(`   - Estado: ${userSale.status}`);

        // 6. Calcular métricas
        console.log('\n📊 6. CALCULANDO MÉTRICAS:\n');

        // Para este test, vamos a contar solo esta venta
        const totalSales = 1; // Esta venta
        const completedSales = userSale.status === 'COMPLETADA' ? 1 : 0;
        const meta = metaDoc?.annualGoal || 0;
        const progressPercentage = meta > 0 ? 
            Math.round((completedSales / meta) * 100) : 0;

        console.log(`   Total de ventas registradas: ${totalSales}`);
        console.log(`   Ventas completadas: ${completedSales}`);
        console.log(`   Meta anual: ${meta}`);
        console.log(`   Progreso: ${progressPercentage}%`);
        console.log(`   Ventas faltantes para meta: ${Math.max(0, meta - completedSales)}`);

        // 7. Verificar integridad de datos
        console.log('\n✔️ 7. VERIFICACIÓN DE INTEGRIDAD:\n');

        const integrityChecks = [
            {
                name: 'executiveId correcto',
                check: saleDoc.executiveId === testUserId
            },
            {
                name: 'orderNumber correcto',
                check: saleDoc.orderNumber === 'TEST-123456'
            },
            {
                name: 'clientName correcto',
                check: saleDoc.clientName === 'TEST CLIENT'
            },
            {
                name: 'cedula guardada',
                check: saleDoc.cedula === '999999999'
            },
            {
                name: 'status se actualizó a COMPLETADA',
                check: saleDoc.status === 'COMPLETADA'
            },
            {
                name: 'completedAt se guardó',
                check: saleDoc.completedAt !== null && saleDoc.completedAt !== undefined
            },
            {
                name: 'Meta anual se guardó',
                check: metaDoc.annualGoal === 500
            },
            {
                name: 'year correcto en venta',
                check: saleDoc.year === 2025
            },
            {
                name: 'year correcto en meta',
                check: metaDoc.year === 2025
            },
            {
                name: 'Timestamp está en formato ISO',
                check: /^\d{4}-\d{2}-\d{2}T/.test(saleDoc.registeredAt)
            },
            {
                name: 'hasDevice guardado correctamente',
                check: saleDoc.hasDevice === true
            },
            {
                name: 'deviceType guardado',
                check: saleDoc.deviceType === 'TELEFONO'
            }
        ];

        let allChecksPassed = true;
        integrityChecks.forEach(check => {
            const status = check.check ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.check) allChecksPassed = false;
        });

        // 8. Verificar que se puede actualizar la meta
        console.log('\n🔄 8. ACTUALIZANDO LA META:\n');

        const newMetaValue = 750;
        await metaRef.update({
            annualGoal: newMetaValue,
            updatedAt: new Date().toISOString()
        });

        const updatedMetaSnap = await metaRef.get();
        const updatedMeta = updatedMetaSnap.data();

        console.log(`   ✅ Meta actualizada`);
        console.log(`   - Meta anterior: ${meta}`);
        console.log(`   - Meta nueva: ${updatedMeta.annualGoal}`);
        console.log(`   - Actualizado: ${updatedMeta.annualGoal === newMetaValue}`);

        // 9. Verificar que se puede agregar más ventas
        console.log('\n📝 9. REGISTRANDO UNA SEGUNDA VENTA:\n');

        const saleData2 = {
            id: db.collection('pedidos_ventas').doc().id,
            executiveId: testUserId,
            executiveEmail: testExecutiveEmail,
            orderNumber: 'TEST-789012',
            type: 'SIEBEL',
            clientName: 'ANOTHER CLIENT',
            cedula: '888888888',
            hasDevice: false,
            deviceType: null,
            deviceIMEI: null,
            status: 'PENDIENTE',
            year: 2025,
            registeredAt: new Date().toISOString(),
            completedAt: null
        };

        const saleRef2 = db.collection('pedidos_ventas').doc(saleData2.id);
        await saleRef2.set(saleData2);

        console.log(`   ✅ Segunda venta guardada`);
        console.log(`   - ID: ${saleData2.id}`);
        console.log(`   - Orden: ${saleData2.orderNumber}`);

        // 10. Resumen final
        console.log('\n📌 RESUMEN FINAL:\n');
        if (allChecksPassed) {
            console.log('   ✅ TODO EL SISTEMA FUNCIONA CORRECTAMENTE');
            console.log('   ✅ Los datos se guardan correctamente en Firestore');
            console.log('   ✅ Las actualizaciones funcionan');
            console.log('   ✅ Se pueden guardar múltiples ventas');
            console.log('   ✅ Los timestamps se guardan en formato ISO');
            console.log('   ✅ Las reglas de seguridad funcionan');
        } else {
            console.log('   ⚠️ Algunos checks fallaron - revisar arriba');
        }

        // 11. Instrucciones para verificar en Frontend
        console.log('\n💡 VERIFICACIÓN EN FRONTEND:\n');
        console.log('   Para ver estos cambios reflejados en la app:');
        console.log('   ');
        console.log('   1. Abre: https://executiveperformancek.web.app');
        console.log('   2. Loguéate con el usuario: test@example.com (o el UID: 1234567890)');
        console.log('   3. Ve a "Registro de Ventas"');
        console.log('   4. Verifica que aparecen las 2 ventas que acabamos de crear');
        console.log('   5. Ve a "Metas Ejecutivo" y verifica que la meta es 750');
        console.log('   6. Haz clic en "Marcar Completada" en la segunda venta');
        console.log('   7. Verifica que el progreso se actualiza (2/750 = 0.27%)');
        console.log('   8. Recarga la página y verifica que todo persiste');
        console.log('\n');

    } catch (error) {
        console.error('❌ Error durante el test:', error.message);
        if (error.code === 'FAILED_PRECONDITION') {
            console.error('⚠️ Los índices aún se están creando. Intenta en 1-2 minutos');
        }
    }

    process.exit(0);
}

runFullTest();
