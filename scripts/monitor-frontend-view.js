/**
 * Monitoreo de frontend - Simula lo que el usuario vería
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function simulateFrontendView() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🖥️  SIMULACIÓN DE VISTA FRONTEND - TAB "Registro de Ventas"  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    try {
        const testUserId = '1234567890';

        // Obtener meta
        const metaRef = db.collection('metas_ventas_anuales').doc(testUserId);
        const metaSnap = await metaRef.get();
        const metaData = metaSnap.exists ? metaSnap.data() : null;

        // Obtener ventas
        const salesRef = db.collection('pedidos_ventas');
        const allSalesSnapshot = await salesRef.get();
        
        // Filtrar por usuario
        const userSales = [];
        allSalesSnapshot.forEach(doc => {
            if (doc.data().executiveId === testUserId) {
                userSales.push({ id: doc.id, ...doc.data() });
            }
        });

        // SECCIÓN 1: META ANUAL
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  🎯 MI META ANUAL                                           │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
        
        if (metaData) {
            const metaInput = `[${metaData.annualGoal}]`;
            console.log(`  Meta Anual: ${metaInput.padEnd(10)} [Guardar]`);
            console.log('');
        } else {
            console.log(`  Meta Anual: [______]  [Guardar]`);
            console.log('');
        }

        // SECCIÓN 2: MÉTRICAS
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  📊 MIS MÉTRICAS DEL AÑO                                    │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');

        const completedSales = userSales.filter(s => s.status === 'COMPLETADA');
        const totalSales = userSales.length;
        const meta = metaData?.annualGoal || 0;
        const percentage = meta > 0 ? Math.round((completedSales.length / meta) * 100) : 0;
        const remaining = Math.max(0, meta - completedSales.length);

        console.log(`  Progreso: ${String(completedSales.length).padStart(3)} / ${String(meta).padStart(3)} ventas`);
        console.log(`  ${createProgressBar(percentage)}`);
        console.log(`  ${percentage}% completado | Faltan ${remaining} ventas`);
        console.log('');

        // SECCIÓN 3: ESTADÍSTICAS
        console.log('  Estadísticas:');
        console.log('  ┌─────────────────────┬─────────────────────┐');
        console.log(`  │ 📱 Con Dispositivo  │ ${String(userSales.filter(s => s.hasDevice).length).padStart(3)} ventas      │`);
        console.log(`  │ 📋 Sin Dispositivo  │ ${String(userSales.filter(s => !s.hasDevice).length).padStart(3)} ventas      │`);
        console.log('  └─────────────────────┴─────────────────────┘');
        console.log('');

        // SECCIÓN 4: MIS VENTAS
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  📋 MIS VENTAS                                              │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');

        if (userSales.length === 0) {
            console.log('  No hay ventas registradas. ¡Registra tu primera venta!');
        } else {
            userSales.forEach((sale, index) => {
                const statusIcon = sale.status === 'COMPLETADA' ? '✅' : '⏳';
                const deviceIcon = sale.hasDevice ? '📱' : '📋';
                
                console.log(`  ${statusIcon} ${deviceIcon} Venta ${index + 1}`);
                console.log(`     Orden: ${sale.orderNumber}`);
                console.log(`     Cliente: ${sale.clientName}`);
                console.log(`     Cédula: ${sale.cedula}`);
                console.log(`     Estado: ${sale.status}`);
                
                if (sale.hasDevice) {
                    console.log(`     Dispositivo: ${sale.deviceType} (${sale.deviceIMEI})`);
                }
                
                if (sale.status === 'PENDIENTE') {
                    console.log(`     [Marcar Completada]`);
                }
                console.log('');
            });
        }

        // SECCIÓN 5: RESUMEN
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  📊 RESUMEN                                                 │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log(`  ✅ Ventas registradas en Firestore: ${totalSales}`);
        console.log(`  ✅ Ventas completadas: ${completedSales.length}`);
        console.log(`  ✅ Meta establecida: ${meta} ${meta === 0 ? '(sin establecer)' : 'ventas'}`);
        console.log(`  ✅ Progreso actual: ${percentage}%`);
        console.log('');

        // SECCIÓN 6: INSTRUCCIONES
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│  💡 PRÓXIMOS PASOS                                          │');
        console.log('└─────────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('  1. Abre: https://executiveperformancek.web.app');
        console.log('  2. Loguéate (usa el UID: 1234567890 o email: test@example.com)');
        console.log('  3. Ve a "Registro de Ventas"');
        console.log('  4. Deberías ver esto que acabamos de mostrar ☝️');
        console.log('  5. Registra una nueva venta y verifica que aparezca');
        console.log('  6. Marca ventas como completadas y verifica métricas');
        console.log('  7. Recarga la página y verifica persistencia');
        console.log('');
        console.log('✅ MONITOREO COMPLETADO\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

function createProgressBar(percentage) {
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `  [${bar}]`;
}

simulateFrontendView();
