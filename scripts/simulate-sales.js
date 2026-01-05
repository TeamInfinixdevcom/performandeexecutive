/**
 * Script para simular 20 ventas de prueba
 * Ejecutar con: node simulate-sales.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ID del ejecutivo actual (rmadrigalj@ice.go.cr)
const EXECUTIVE_ID = 'yF8fwbUQFpXXlOfUMyvQmHmBgNI3';
const EXECUTIVE_EMAIL = 'rmadrigalj@ice.go.cr';

// Datos de ejemplo para ventas
const clientesEjemplo = [
    { nombre: 'MARIA FERNANDEZ LOPEZ', cedula: '101230456' },
    { nombre: 'CARLOS RODRIGUEZ MORA', cedula: '102340567' },
    { nombre: 'ANA PATRICIA JIMENEZ', cedula: '103450678' },
    { nombre: 'JOSE LUIS VARGAS CASTRO', cedula: '104560789' },
    { nombre: 'LAURA MELISSA SOTO', cedula: '105670890' },
    { nombre: 'RICARDO ANDRES GOMEZ', cedula: '106780901' },
    { nombre: 'PATRICIA ELENA MORA', cedula: '107890012' },
    { nombre: 'DIEGO ALEJANDRO RUIZ', cedula: '108900123' },
    { nombre: 'CARMEN LUCIA HERRERA', cedula: '109010234' },
    { nombre: 'MIGUEL ANGEL CORDERO', cedula: '110120345' },
    { nombre: 'SOFIA VALENTINA ARAYA', cedula: '111230456' },
    { nombre: 'ANDRES FELIPE QUESADA', cedula: '112340567' },
    { nombre: 'DANIELA MARIA ARIAS', cedula: '113450678' },
    { nombre: 'FERNANDO JOSE BRENES', cedula: '114560789' },
    { nombre: 'GABRIELA ISABEL CHAVES', cedula: '115670890' },
    { nombre: 'PABLO ERNESTO SOLANO', cedula: '116780901' },
    { nombre: 'MONICA ANDREA VINDAS', cedula: '117890012' },
    { nombre: 'ROBERTO CARLOS LEON', cedula: '118900123' },
    { nombre: 'ADRIANA NICOLE FALLAS', cedula: '119010234' },
    { nombre: 'KEVIN DAVID RAMIREZ', cedula: '120120345' }
];

// Tipos de venta
const tipos = ['KOMERCIAL', 'SIEBEL'];

// Categorías posibles
const categoriasOpciones = [
    ['renovacion'],
    ['servicioNuevo'],
    ['ventaTerminal'],
    ['ventaAccesorio'],
    ['renovacion', 'ventaTerminal'],
    ['servicioNuevo', 'ventaTerminal'],
    ['renovacion', 'ventaAccesorio'],
    ['servicioNuevo', 'ventaAccesorio'],
    ['ventaTerminal', 'ventaAccesorio'],
    ['renovacion', 'ventaTerminal', 'ventaAccesorio']
];

// Estados
const estados = ['PENDIENTE', 'COMPLETADA'];

// Función para generar número de pedido aleatorio
function generarNumeroPedido(tipo) {
    const prefijo = tipo === 'KOMERCIAL' ? 'KO' : 'SB';
    const numero = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefijo}-${numero}`;
}

// Función para generar IMEI aleatorio
function generarIMEI() {
    let imei = '';
    for (let i = 0; i < 15; i++) {
        imei += Math.floor(Math.random() * 10);
    }
    return imei;
}

// Función para generar fecha aleatoria en los últimos 30 días
function generarFechaReciente() {
    const ahora = new Date();
    const diasAtras = Math.floor(Math.random() * 30);
    ahora.setDate(ahora.getDate() - diasAtras);
    return admin.firestore.Timestamp.fromDate(ahora);
}

async function simularVentas() {
    console.log('🚀 Iniciando simulación de 20 ventas...\n');
    
    const batch = db.batch();
    const ventasCreadas = [];
    
    for (let i = 0; i < 20; i++) {
        const cliente = clientesEjemplo[i];
        const tipo = tipos[Math.floor(Math.random() * tipos.length)];
        const categorias = categoriasOpciones[Math.floor(Math.random() * categoriasOpciones.length)];
        const estado = estados[Math.floor(Math.random() * estados.length)];
        const numeroPedido = generarNumeroPedido(tipo);
        
        // Determinar opciones adicionales basadas en categorías
        const incluyeTelefono = categorias.includes('ventaTerminal');
        const incluyeAccesorio = categorias.includes('ventaAccesorio');
        const incluyeLineaPrepago = Math.random() > 0.7; // 30% de probabilidad
        
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
            accesorios: incluyeAccesorio ? ['Funda protectora', 'Cable USB-C'].slice(0, Math.floor(Math.random() * 2) + 1) : [],
            createdAt: generarFechaReciente(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Si está completada, agregar fecha de completado
        if (estado === 'COMPLETADA') {
            ventaData.completedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        const docRef = db.collection('pedidos_ventas').doc();
        batch.set(docRef, ventaData);
        
        ventasCreadas.push({
            id: docRef.id,
            orderNumber: numeroPedido,
            cliente: cliente.nombre,
            tipo: tipo,
            categorias: categorias.join(', '),
            estado: estado
        });
        
        console.log(`✅ Venta ${i + 1}/20: ${numeroPedido} - ${cliente.nombre} - ${estado}`);
    }
    
    // Ejecutar batch
    await batch.commit();
    
    console.log('\n✅✅✅ 20 ventas creadas exitosamente ✅✅✅\n');
    
    // Resumen
    const completadas = ventasCreadas.filter(v => v.estado === 'COMPLETADA').length;
    const pendientes = ventasCreadas.filter(v => v.estado === 'PENDIENTE').length;
    
    console.log('📊 RESUMEN:');
    console.log(`   - Ventas COMPLETADAS: ${completadas}`);
    console.log(`   - Ventas PENDIENTES: ${pendientes}`);
    console.log(`   - Total: 20\n`);
    
    // Contar por categoría
    const conteoCategories = {
        renovacion: 0,
        servicioNuevo: 0,
        ventaTerminal: 0,
        ventaAccesorio: 0
    };
    
    ventasCreadas.forEach(v => {
        if (v.categorias.includes('renovacion')) conteoCategories.renovacion++;
        if (v.categorias.includes('servicioNuevo')) conteoCategories.servicioNuevo++;
        if (v.categorias.includes('ventaTerminal')) conteoCategories.ventaTerminal++;
        if (v.categorias.includes('ventaAccesorio')) conteoCategories.ventaAccesorio++;
    });
    
    console.log('📂 POR CATEGORÍA:');
    console.log(`   - 🔄 Renovación: ${conteoCategories.renovacion}`);
    console.log(`   - 🆕 Servicio Nuevo: ${conteoCategories.servicioNuevo}`);
    console.log(`   - 📱 Venta Terminal: ${conteoCategories.ventaTerminal}`);
    console.log(`   - 📦 Venta Accesorio: ${conteoCategories.ventaAccesorio}`);
    
    console.log('\n🌐 Visita https://executiveperformancek.web.app para ver los resultados');
    console.log('   - Pestaña "💰 Registro de Ventas" para ver la paginación');
    console.log('   - Pestaña "🎯 Metas Ejecutivo" para ver el dashboard categórico\n');
    
    process.exit(0);
}

simularVentas().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
