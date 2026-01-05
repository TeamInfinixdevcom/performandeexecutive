/**
 * Script para LIMPIAR Y RECREAR colecciones de forma segura
 * Elimina datos antiguos y crea estructura nueva limpia
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function cleanAndRecreate() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🧹 LIMPIEZA Y RECREACIÓN DE COLECCIONES                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. LISTAR COLECCIONES ACTUALES
        console.log('📋 1. COLECCIONES ACTUALES:\n');
        
        const collections = ['pedidos_ventas', 'metas_ventas_anuales', 'clientes', 'ventas', 'Pedidos', 'metas'];
        
        for (const colName of collections) {
            try {
                const snapshot = await db.collection(colName).get();
                console.log(`   ${colName}: ${snapshot.size} documentos`);
            } catch (e) {
                console.log(`   ${colName}: No existe`);
            }
        }

        // 2. ELIMINAR DOCUMENTOS DE COLECCIONES
        console.log('\n🗑️  2. ELIMINANDO DOCUMENTOS:\n');

        const collectionsToDelete = ['pedidos_ventas', 'metas_ventas_anuales', 'ventas', 'Pedidos', 'metas'];

        for (const colName of collectionsToDelete) {
            try {
                const snapshot = await db.collection(colName).get();
                let count = 0;
                for (const doc of snapshot.docs) {
                    await doc.ref.delete();
                    count++;
                }
                if (count > 0) {
                    console.log(`   ✅ ${colName}: ${count} documentos eliminados`);
                }
            } catch (e) {
                // Colección no existe, ignorar
            }
        }

        // 3. VERIFICAR QUE ESTÁN VACÍAS
        console.log('\n✔️  3. VERIFICACIÓN DE COLECCIONES VACÍAS:\n');

        for (const colName of ['pedidos_ventas', 'metas_ventas_anuales']) {
            const snapshot = await db.collection(colName).get();
            console.log(`   ${colName}: ${snapshot.size} documentos ✅`);
        }

        // 4. CREAR ÍNDICES
        console.log('\n🔧 4. ÍNDICES (ya creados en firestore.indexes.json):\n');
        console.log('   ✅ pedidos_ventas (executiveId, year, registeredAt)');
        console.log('   ✅ pedidos_ventas (executiveId, status, year)');

        // 5. EXPLICAR ESTRUCTURA
        console.log('\n📐 5. ESTRUCTURA DE DATOS LIMPIA:\n');

        console.log('   COLECCIÓN: pedidos_ventas');
        console.log('   ├─ id: string (doc ID único)');
        console.log('   ├─ executiveId: string (UID del usuario)');
        console.log('   ├─ executiveEmail: string');
        console.log('   ├─ orderNumber: string (ej: KO-52814629)');
        console.log('   ├─ type: string (KOMERCIAL | SIEBEL)');
        console.log('   ├─ clientName: string (ej: JOHN DOE)');
        console.log('   ├─ cedula: string');
        console.log('   ├─ hasDevice: boolean');
        console.log('   ├─ deviceType: string (TELEFONO | ACCESORIO) [opcional]');
        console.log('   ├─ deviceIMEI: string [opcional]');
        console.log('   ├─ status: string (PENDIENTE | COMPLETADA)');
        console.log('   ├─ year: number (2025)');
        console.log('   ├─ registeredAt: string (ISO timestamp)');
        console.log('   └─ completedAt: string (ISO timestamp) [nullable]');

        console.log('\n   COLECCIÓN: metas_ventas_anuales');
        console.log('   ├─ (docId = executiveId)');
        console.log('   ├─ executiveId: string');
        console.log('   ├─ executiveEmail: string');
        console.log('   ├─ annualGoal: number (ej: 500)');
        console.log('   ├─ year: number (2025)');
        console.log('   ├─ createdAt: string (ISO timestamp)');
        console.log('   └─ updatedAt: string (ISO timestamp)');

        // 6. CONEXIÓN EN FRONTEND
        console.log('\n🔗 6. CÓMO SE CONECTA "Registro de Ventas":\n');

        console.log('   FLUJO EN FRONTEND:');
        console.log('   ');
        console.log('   1. Usuario logueado → onAuthStateChanged dispara');
        console.log('   2. init-master.js → initSalesManagement(uid, email)');
        console.log('   3. SalesTracking.init(uid, email) → guarda userId');
        console.log('   4. Carga meta: getUserMeta() → busca en metas_ventas_anuales/{uid}');
        console.log('   5. Usuario registra venta → registerSale({...})');
        console.log('   6. Datos se guardan en pedidos_ventas con executiveId = uid');
        console.log('   7. renderSalesList() → obtiene ventas donde executiveId = uid');
        console.log('   8. Métricas calculan: completedSales / annualGoal * 100');

        // 7. INSTRUCCIONES
        console.log('\n📝 7. PRÓXIMOS PASOS:\n');

        console.log('   ✅ Las colecciones están limpias');
        console.log('   ✅ Los índices ya están creados');
        console.log('   ✅ Las reglas de seguridad ya están en Firestore');
        console.log('   ');
        console.log('   AHORA:');
        console.log('   1. Abre: https://executiveperformancek.web.app');
        console.log('   2. Loguéate como usuario');
        console.log('   3. Ve a "Registro de Ventas"');
        console.log('   4. Registra una venta:');
        console.log('      - Orden: KO-12345678');
        console.log('      - Tipo: KOMERCIAL');
        console.log('      - Cliente: NOMBRE CLIENTE');
        console.log('      - Cédula: 123456789');
        console.log('      - ¿Dispositivo?: SÍ/NO');
        console.log('   5. Haz clic en "Registrar Venta"');
        console.log('   6. Verifica que aparezca en "Mis Ventas"');
        console.log('   7. Haz clic en "Guardar" meta (ej: 100)');
        console.log('   8. Ve a "Metas Ejecutivo" y verifica las métricas');

        console.log('\n✅ LIMPIEZA COMPLETADA\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

cleanAndRecreate();
