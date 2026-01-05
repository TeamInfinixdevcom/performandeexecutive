#!/usr/bin/env node

/**
 * Script de Prueba - Sistema de Ventas
 * Prueba que las ventas se registren correctamente en Firestore
 * 
 * Uso:
 *   node test-sales-system.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase
const serviceAccount = require(path.join(__dirname, 'executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Test 1: Verificar que colección 'ventas' existe y tiene permisos
 */
async function testVentasCollection() {
    console.log('\n📋 TEST 1: Verificar colección "ventas"');
    try {
        const snapshot = await db.collection('ventas').limit(5).get();
        console.log('✅ Colección "ventas" es accesible');
        console.log(`   📊 Total de registros: ${snapshot.size}`);
        
        if (snapshot.size > 0) {
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${data.clientName} (${data.segmento}) - ${data.tipoVenta}`);
            });
        }
        return true;
    } catch (error) {
        console.error('❌ Error accediendo colección "ventas":', error.message);
        return false;
    }
}

/**
 * Test 2: Ver ventas por segmento este mes
 */
async function testVentasBySegment() {
    console.log('\n📊 TEST 2: Contar ventas por segmento (este mes)');
    try {
        const segments = ['PLATINO', 'ORO', 'PLATA', 'BRONCE'];
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        for (const segment of segments) {
            const snapshot = await db.collection('ventas')
                .where('segmento', '==', segment)
                .where('fechaVenta', '>=', admin.firestore.Timestamp.fromDate(monthStart))
                .get();
            
            console.log(`   ${segment}: ${snapshot.size} ventas este mes`);
        }
        return true;
    } catch (error) {
        console.error('❌ Error contando ventas:', error.message);
        return false;
    }
}

/**
 * Test 3: Verificar estructura de documento de venta
 */
async function testVentasStructure() {
    console.log('\n🔍 TEST 3: Estructura de documento de venta');
    try {
        const snapshot = await db.collection('ventas').limit(1).get();
        
        if (snapshot.empty) {
            console.log('   ⚠️  No hay ventas aún para inspeccionar');
            console.log('   💡 Crea un cliente nuevo para generar una venta');
            return true;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        const fields = ['clientId', 'clientName', 'executiveId', 'segmento', 'tipoVenta', 'fechaVenta'];
        console.log('   Campos esperados:');
        
        fields.forEach(field => {
            const hasField = field in data;
            const symbol = hasField ? '✅' : '❌';
            console.log(`   ${symbol} ${field}: ${data[field] || 'N/A'}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ Error inspeccionando estructura:', error.message);
        return false;
    }
}

/**
 * Test 4: Verificar que metas existan
 */
async function testMetasCollection() {
    console.log('\n🎯 TEST 4: Verificar colección "metas"');
    try {
        const snapshot = await db.collection('metas').get();
        console.log(`✅ Total de metas guardadas: ${snapshot.size}`);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.segment}: objetivo=${data.objetivo}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ Error accediendo metas:', error.message);
        return false;
    }
}

/**
 * Test 5: Simular cálculo de meta
 */
async function testMetaCalculation() {
    console.log('\n📈 TEST 5: Simular cálculo de meta (Noviembre 2024)');
    try {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Contar PLATINO este mes
        const snapshot = await db.collection('ventas')
            .where('segmento', '==', 'PLATINO')
            .where('fechaVenta', '>=', admin.firestore.Timestamp.fromDate(monthStart))
            .get();
        
        const alcanzado = snapshot.size;
        
        // Obtener meta
        const metaSnapshot = await db.collection('metas')
            .where('segment', '==', 'PLATINO')
            .limit(1)
            .get();
        
        const objetivo = metaSnapshot.empty ? 10 : metaSnapshot.docs[0].data().objetivo;
        const porcentaje = Math.min((alcanzado / objetivo) * 100, 100);
        
        console.log(`   Segmento: PLATINO`);
        console.log(`   Ventas este mes: ${alcanzado}`);
        console.log(`   Objetivo: ${objetivo}`);
        console.log(`   Progreso: ${alcanzado}/${objetivo} = ${porcentaje.toFixed(1)}%`);
        
        return true;
    } catch (error) {
        console.error('❌ Error calculando meta:', error.message);
        return false;
    }
}

/**
 * Test 6: Verificar acceso por ejecutivo
 */
async function testExecutiveAccess() {
    console.log('\n👤 TEST 6: Verificar ventas por ejecutivo');
    try {
        // Obtener todos los ejecutivos únicos
        const snapshot = await db.collection('ventas').get();
        const executives = new Set();
        
        snapshot.forEach(doc => {
            executives.add(doc.data().executiveId);
        });
        
        console.log(`   Total de ejecutivos con ventas: ${executives.size}`);
        
        // Contar ventas por ejecutivo
        for (const execId of executives) {
            const count = snapshot.docs.filter(doc => doc.data().executiveId === execId).length;
            const execName = snapshot.docs.find(doc => doc.data().executiveId === execId)?.data().executiveName;
            console.log(`   - ${execName}: ${count} ventas`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error verificando acceso:', error.message);
        return false;
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  PRUEBAS: SISTEMA DE TRACKING DE VENTAS              ║');
    console.log('║  Executive Performance ICE CRM                         ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    
    const results = {
        passed: 0,
        failed: 0
    };
    
    try {
        if (await testVentasCollection()) results.passed++; else results.failed++;
        if (await testVentasBySegment()) results.passed++; else results.failed++;
        if (await testVentasStructure()) results.passed++; else results.failed++;
        if (await testMetasCollection()) results.passed++; else results.failed++;
        if (await testMetaCalculation()) results.passed++; else results.failed++;
        if (await testExecutiveAccess()) results.passed++; else results.failed++;
        
    } catch (error) {
        console.error('\n❌ Error fatal:', error);
    }
    
    // Resumen
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  RESUMEN DE PRUEBAS                                   ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Pasadas: ${results.passed}/${results.passed + results.failed}`);
    console.log(`║  ❌ Fallidas: ${results.failed}/${results.passed + results.failed}`);
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    if (results.failed === 0) {
        console.log('🎉 ¡Todas las pruebas pasaron!\n');
        console.log('Próximos pasos:');
        console.log('1. Abre http://localhost:3000 en tu navegador');
        console.log('2. Login como ejecutivo');
        console.log('3. Crea un cliente nuevo');
        console.log('4. Ve a Metas → 📊 Ver Reporte');
        console.log('5. Verifica que aparezca la venta registrada\n');
    } else {
        console.log('⚠️  Algunas pruebas fallaron. Revisa los errores arriba.\n');
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
}

// Ejecutar
runAllTests();
