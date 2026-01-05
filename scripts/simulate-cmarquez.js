/**
 * Script para simular ventas y metas para C. Marquez
 * Ejecutar con: node simulate-cmarquez.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Datos de C. Marquez
const EXECUTIVE_ID = 'pl2gw8PWCwc6AWI78WhHhqh1ixJ3';
const EXECUTIVE_EMAIL = 'cmarquez@ice.go.cr';
const EXECUTIVE_NAME = 'C. Marquez';

// Clientes de ejemplo
const clientesEjemplo = [
    { nombre: 'JUAN PABLO MENDEZ', cedula: '201230456' },
    { nombre: 'ANDREA CAROLINA VEGA', cedula: '202340567' },
    { nombre: 'LUIS FERNANDO CASTRO', cedula: '203450678' },
    { nombre: 'MELISSA VANESSA ROJAS', cedula: '204560789' },
    { nombre: 'JORGE ANDRES BLANCO', cedula: '205670890' },
    { nombre: 'CAROLINA MARIA PEREZ', cedula: '206780901' },
    { nombre: 'VICTOR MANUEL SANCHEZ', cedula: '207890012' },
    { nombre: 'DIANA MARCELA ORTIZ', cedula: '208900123' },
    { nombre: 'OSCAR EDUARDO TORRES', cedula: '209010234' },
    { nombre: 'NATALIA FERNANDA RIOS', cedula: '210120345' },
    { nombre: 'ALBERTO JOSE NAVARRO', cedula: '211230456' },
    { nombre: 'VALENTINA ANDREA CRUZ', cedula: '212340567' },
    { nombre: 'SEBASTIAN FELIPE LUNA', cedula: '213450678' },
    { nombre: 'CAMILA ALEJANDRA MORA', cedula: '214560789' },
    { nombre: 'RODRIGO ESTEBAN VEGA', cedula: '215670890' }
];

// Tipos de venta
const tipos = ['KOMERCIAL', 'SIEBEL'];

// Función para generar número de pedido
function generarNumeroPedido(tipo) {
    const prefijo = tipo === 'KOMERCIAL' ? 'KO' : 'SB';
    const numero = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefijo}-${numero}`;
}

// Función para generar IMEI
function generarIMEI() {
    let imei = '';
    for (let i = 0; i < 15; i++) {
        imei += Math.floor(Math.random() * 10);
    }
    return imei;
}

// Función para generar fecha aleatoria en los últimos 60 días
function generarFechaReciente(diasMax = 60) {
    const ahora = new Date();
    const diasAtras = Math.floor(Math.random() * diasMax);
    ahora.setDate(ahora.getDate() - diasAtras);
    return admin.firestore.Timestamp.fromDate(ahora);
}

async function simularDatos() {
    console.log('🚀 Simulando datos para C. Marquez (cmarquez@ice.go.cr)\n');
    console.log('UID:', EXECUTIVE_ID);
    console.log('');

    // ========================================
    // 1. CREAR METAS DESGLOSADAS
    // ========================================
    console.log('📊 Creando metas desglosadas...');
    
    const year = new Date().getFullYear();
    const semestre = 1;
    const metaDocKey = `${EXECUTIVE_ID}_${year}_${semestre}`;
    
    const metasData = {
        executiveId: EXECUTIVE_ID,
        executiveEmail: EXECUTIVE_EMAIL,
        year: year,
        semestre: semestre,
        metas: {
            renovacion: 25,
            servicioNuevo: 15,
            ventaTerminal: 20,
            ventaAccesorio: 10
        },
        completado: {
            renovacion: 0,  // Se actualizará con las ventas
            servicioNuevo: 0,
            ventaTerminal: 0,
            ventaAccesorio: 0
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('metas_desglosadas').doc(metaDocKey).set(metasData);
    console.log('✅ Metas creadas:');
    console.log('   - 🔄 Renovación: 25');
    console.log('   - 🆕 Servicio Nuevo: 15');
    console.log('   - 📱 Venta Terminal: 20');
    console.log('   - 📦 Venta Accesorio: 10');
    console.log('');

    // ========================================
    // 2. CREAR 15 VENTAS (variadas)
    // ========================================
    console.log('💰 Creando 15 ventas...\n');
    
    const batch = db.batch();
    
    // Contadores para actualizar metas
    const conteoCategories = {
        renovacion: 0,
        servicioNuevo: 0,
        ventaTerminal: 0,
        ventaAccesorio: 0
    };
    
    // Definir ventas específicas para tener buen balance
    const ventasConfig = [
        { categorias: ['renovacion'], status: 'COMPLETADA' },
        { categorias: ['renovacion'], status: 'COMPLETADA' },
        { categorias: ['renovacion', 'ventaTerminal'], status: 'COMPLETADA' },
        { categorias: ['renovacion', 'ventaAccesorio'], status: 'COMPLETADA' },
        { categorias: ['servicioNuevo'], status: 'COMPLETADA' },
        { categorias: ['servicioNuevo', 'ventaTerminal'], status: 'COMPLETADA' },
        { categorias: ['ventaTerminal'], status: 'COMPLETADA' },
        { categorias: ['ventaTerminal', 'ventaAccesorio'], status: 'COMPLETADA' },
        { categorias: ['ventaAccesorio'], status: 'COMPLETADA' },
        { categorias: ['renovacion'], status: 'PENDIENTE' },
        { categorias: ['servicioNuevo'], status: 'PENDIENTE' },
        { categorias: ['ventaTerminal'], status: 'PENDIENTE' },
        { categorias: ['renovacion', 'ventaTerminal'], status: 'PENDIENTE' },
        { categorias: ['servicioNuevo', 'ventaAccesorio'], status: 'PENDIENTE' },
        { categorias: ['ventaAccesorio'], status: 'PENDIENTE' }
    ];
    
    for (let i = 0; i < 15; i++) {
        const cliente = clientesEjemplo[i];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        const config = ventasConfig[i];
        const categorias = config.categorias;
        const estado = config.status;
        const numeroPedido = generarNumeroPedido(tipo);
        
        const incluyeTelefono = categorias.includes('ventaTerminal');
        const incluyeAccesorio = categorias.includes('ventaAccesorio');
        const incluyeLineaPrepago = Math.random() > 0.7;
        
        const ventaData = {
            orderNumber: numeroPedido,
            type: tipo,
            clientName: cliente.nombre,
            cedula: cliente.cedula,
            categories: categorias,
            status: estado,
            executiveId: EXECUTIVE_ID,
            executiveEmail: EXECUTIVE_EMAIL,
            incluyeLineaPrepago: incluyeLineaPrepago,
            incluyeTelefono: incluyeTelefono,
            incluyeAccesorio: incluyeAccesorio,
            deviceIMEIs: incluyeTelefono ? [generarIMEI()] : [],
            accesorios: incluyeAccesorio ? ['Funda protectora'] : [],
            createdAt: generarFechaReciente(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (estado === 'COMPLETADA') {
            ventaData.completedAt = admin.firestore.FieldValue.serverTimestamp();
            // Contar para metas solo las completadas
            categorias.forEach(cat => {
                if (conteoCategories.hasOwnProperty(cat)) {
                    conteoCategories[cat]++;
                }
            });
        }
        
        const docRef = db.collection('pedidos_ventas').doc();
        batch.set(docRef, ventaData);
        
        const statusIcon = estado === 'COMPLETADA' ? '✅' : '⏳';
        console.log(`${statusIcon} Venta ${i + 1}/15: ${numeroPedido} - ${cliente.nombre}`);
        console.log(`   Categorías: ${categorias.join(', ')} | Estado: ${estado}`);
    }
    
    // Ejecutar batch de ventas
    await batch.commit();
    console.log('\n✅ 15 ventas creadas\n');
    
    // ========================================
    // 3. ACTUALIZAR CONTADORES DE METAS
    // ========================================
    console.log('📈 Actualizando contadores de metas completadas...');
    
    await db.collection('metas_desglosadas').doc(metaDocKey).update({
        'completado.renovacion': conteoCategories.renovacion,
        'completado.servicioNuevo': conteoCategories.servicioNuevo,
        'completado.ventaTerminal': conteoCategories.ventaTerminal,
        'completado.ventaAccesorio': conteoCategories.ventaAccesorio,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Metas actualizadas:');
    console.log(`   - 🔄 Renovación: ${conteoCategories.renovacion}/25`);
    console.log(`   - 🆕 Servicio Nuevo: ${conteoCategories.servicioNuevo}/15`);
    console.log(`   - 📱 Venta Terminal: ${conteoCategories.ventaTerminal}/20`);
    console.log(`   - 📦 Venta Accesorio: ${conteoCategories.ventaAccesorio}/10`);
    
    // ========================================
    // 4. CREAR ALGUNOS CLIENTES
    // ========================================
    console.log('\n👥 Creando 8 clientes en cartera...');
    
    const segmentos = ['PLATINO', 'ORO', 'PLATA', 'BRONCE', 'BLACK'];
    const clientesBatch = db.batch();
    
    for (let i = 0; i < 8; i++) {
        const cliente = clientesEjemplo[i];
        const segmento = segmentos[Math.floor(Math.random() * segmentos.length)];
        
        const clienteData = {
            cedula: cliente.cedula,
            name: cliente.nombre,
            email: `cliente${i + 1}@example.com`,
            segmento: segmento,
            score: Math.floor(300 + Math.random() * 500),
            categoria: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
            estado: 'ACTUALIZADO',
            executiveId: EXECUTIVE_ID,
            executiveName: EXECUTIVE_EMAIL,
            serviciosMoviles: [`8${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`],
            serviciosFijos: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = db.collection('clients').doc();
        clientesBatch.set(docRef, clienteData);
        
        console.log(`   ✅ ${cliente.nombre} - ${segmento}`);
    }
    
    await clientesBatch.commit();
    console.log('✅ 8 clientes creados\n');
    
    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅✅✅ SIMULACIÓN COMPLETADA PARA C. MARQUEZ ✅✅✅');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 RESUMEN:');
    console.log('   - 15 ventas creadas (9 completadas, 6 pendientes)');
    console.log('   - Metas semestrales configuradas');
    console.log('   - 8 clientes en cartera');
    console.log('');
    console.log('🔐 Para probar, inicia sesión con:');
    console.log('   Email: cmarquez@ice.go.cr');
    console.log('');
    console.log('🌐 URL: https://executiveperformancek.web.app');
    console.log('');
    
    process.exit(0);
}

simularDatos().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
