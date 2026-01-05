/**
 * SCRIPT PARA CARGAR DATOS DE DEMO PARA COBANDOA
 * 
 * Ejecutar con: node load-cobandoa-demo.js
 * 
 * Carga 45 clientes ficticios + ventas para demostrar el sistema
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

// Inicializar Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();

// UID de cobandoa@ice.go.cr
const COBANDOA_UID = 'AWJFrsMkvxMTj1HVGsIr5NdBykE2';

// Nombres costarricenses para clientes ficticios
const nombres = [
    'CARLOS ALBERTO', 'MARIA JOSE', 'JUAN PABLO', 'ANA LUCIA', 'LUIS FERNANDO',
    'PATRICIA ELENA', 'DIEGO ANDRES', 'LAURA MELISSA', 'ROBERTO CARLOS', 'MONICA ANDREA',
    'JORGE MARIO', 'CARMEN ROSA', 'PEDRO ANTONIO', 'SANDRA MILENA', 'MIGUEL ANGEL',
    'DANIELA FERNANDA', 'ANDRES FELIPE', 'GABRIELA MARIA', 'RICARDO JOSE', 'VALENTINA',
    'OSCAR EDUARDO', 'ADRIANA PAOLA', 'FERNANDO JOSE', 'NATALIA ANDREA', 'ESTEBAN',
    'CATALINA MARIA', 'ALEJANDRO JOSE', 'ISABELLA SOFIA', 'SEBASTIAN ANDRES', 'CAMILA',
    'DAVID ALEJANDRO', 'MARIANA LUCIA', 'NICOLAS ANDRES', 'JULIANA MARIA', 'MATEO',
    'PAULA ANDREA', 'SANTIAGO JOSE', 'VALERIA MARIA', 'TOMAS ANDRES', 'SOFIA ELENA',
    'EMILIO JOSE', 'ANDREA MARIA', 'JULIAN DAVID', 'CAROLINA ANDREA', 'MARTIN JOSE'
];

const apellidos = [
    'RODRIGUEZ MORA', 'FERNANDEZ CASTRO', 'GONZALEZ VARGAS', 'MARTINEZ JIMENEZ', 'LOPEZ HERNANDEZ',
    'SANCHEZ ROJAS', 'RAMIREZ SOLANO', 'TORRES QUESADA', 'DIAZ MONGE', 'MORALES VINDAS',
    'CASTRO ALFARO', 'JIMENEZ ARIAS', 'RUIZ BRENES', 'HERNANDEZ SALAS', 'VARGAS CHACON',
    'ALVARADO CERDAS', 'SOTO BARRANTES', 'MENDEZ VILLALOBOS', 'CHAVES CORDERO', 'ARAYA GAMBOA',
    'ROJAS ELIZONDO', 'SALAZAR MARIN', 'BLANCO ARGUEDAS', 'PORRAS HIDALGO', 'MADRIGAL LEIVA',
    'MORA CAMPOS', 'CHAVARRIA CASCANTE', 'QUIROS ZAMORA', 'VEGA TREJOS', 'GUTIERREZ UREÑA',
    'NAVARRO CALDERON', 'ARIAS ESQUIVEL', 'MONGE GONZALEZ', 'CALDERON OBANDO', 'CORDERO SOLANO',
    'BRENES MURILLO', 'PICADO PACHECO', 'QUESADA SANCHEZ', 'CAMPOS HERRERA', 'SEGURA VASQUEZ',
    'UGALDE CORRALES', 'BONILLA ZUNIGA', 'VALVERDE AGUILAR', 'ZAMORA SOLIS', 'ALFARO CRUZ'
];

const segmentos = ['PLATINO', 'ORO', 'PLATA', 'BRONCE'];
const segmentoPesos = [0.15, 0.25, 0.35, 0.25]; // Distribución realista

const tiposPlan = [
    'Empresarial Premium', 'Empresarial Plus', 'Profesional', 'Personal Max', 
    'Familiar', 'Básico', 'Prepago Plus', 'Postpago Ilimitado'
];

const dominios = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'ice.co.cr'];

const provincias = [
    'San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'
];

function getRandomSegmento() {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < segmentos.length; i++) {
        cumulative += segmentoPesos[i];
        if (rand <= cumulative) return segmentos[i];
    }
    return segmentos[2];
}

function generateCedula(index) {
    const tipo = Math.random() > 0.1 ? '1' : '2';
    const parte1 = String(Math.floor(Math.random() * 9000) + 1000);
    const parte2 = String(Math.floor(Math.random() * 9000) + 1000);
    return `${tipo}-${parte1}-${parte2}`;
}

function generatePhone() {
    const prefijos = ['8', '7', '6'];
    const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
    const num = String(Math.floor(Math.random() * 9000000) + 1000000);
    return `${prefijo}${num.substring(0, 3)}-${num.substring(3, 7)}`;
}

function generateFijo() {
    const area = ['2', '2', '2', '4'][Math.floor(Math.random() * 4)];
    const num = String(Math.floor(Math.random() * 9000000) + 1000000);
    return `${area}${num.substring(0, 3)}-${num.substring(3, 7)}`;
}

function generateEmail(nombre, apellido) {
    const nombreLimpio = nombre.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const apellidoLimpio = apellido.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const dominio = dominios[Math.floor(Math.random() * dominios.length)];
    const variante = Math.floor(Math.random() * 100);
    return `${nombreLimpio}.${apellidoLimpio}${variante}@${dominio}`;
}

function generateBirthDate() {
    const year = 1960 + Math.floor(Math.random() * 45);
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function generateScore(segmento) {
    const baseScores = { PLATINO: 900, ORO: 800, PLATA: 700, BRONCE: 600 };
    const base = baseScores[segmento] || 700;
    return base + Math.floor(Math.random() * 80) - 20;
}

function getCategoriaCredito(score) {
    if (score >= 900) return 'AAA';
    if (score >= 850) return 'AA';
    if (score >= 750) return 'A';
    if (score >= 650) return 'B';
    return 'C';
}

const notas = [
    'Cliente con buen historial de pagos',
    'Interesado en servicios adicionales',
    'Requiere seguimiento mensual',
    'Cliente VIP - Atención preferencial',
    'Potencial para upgrade de plan',
    'Empresa en crecimiento',
    'Múltiples líneas familiares',
    'Consulta frecuente sobre facturación',
    'Interesado en servicios empresariales',
    'Cliente referido por otro usuario',
    'Necesita asesoría en planes de datos',
    'Cliente fidelizado hace más de 5 años',
    'Requiere atención bilingüe',
    'Interesado en fibra óptica',
    'Potencial cliente corporativo'
];

// Generar 45 clientes
function generateClients() {
    const clients = [];
    
    for (let i = 0; i < 45; i++) {
        const nombre = nombres[i];
        const apellido = apellidos[i];
        const segmento = getRandomSegmento();
        const score = generateScore(segmento);
        
        // Cantidad de servicios según segmento
        const numMoviles = segmento === 'PLATINO' ? 3 : segmento === 'ORO' ? 2 : 1;
        const numFijos = Math.random() > 0.4 ? 1 : 0;
        
        const serviciosMoviles = [];
        for (let j = 0; j < numMoviles; j++) {
            serviciosMoviles.push(generatePhone());
        }
        
        const serviciosFijos = [];
        for (let j = 0; j < numFijos; j++) {
            serviciosFijos.push(generateFijo());
        }
        
        clients.push({
            name: `${nombre} ${apellido}`,
            cedula: generateCedula(i),
            email: generateEmail(nombre, apellido),
            segmento: segmento,
            serviciosMoviles: serviciosMoviles,
            serviciosFijos: serviciosFijos,
            tipoPlan: tiposPlan[Math.floor(Math.random() * tiposPlan.length)],
            estadoPlan: Math.random() > 0.1 ? 'Activo' : 'Pendiente',
            puntajeScore: score,
            categoriaCrediticia: getCategoriaCredito(score),
            domicilio: `${provincias[Math.floor(Math.random() * provincias.length)]}, Costa Rica`,
            fechaNacimiento: generateBirthDate(),
            notas: notas[Math.floor(Math.random() * notas.length)],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userId: COBANDOA_UID
        });
    }
    
    return clients;
}

// Generar ventas del mes
function generateSales() {
    const sales = [];
    const tiposVenta = [
        { tipo: 'Línea Nueva', minMonto: 15000, maxMonto: 80000 },
        { tipo: 'Equipo', minMonto: 50000, maxMonto: 500000 },
        { tipo: 'Plan Datos', minMonto: 10000, maxMonto: 45000 },
        { tipo: 'Fibra Óptica', minMonto: 25000, maxMonto: 60000 },
        { tipo: 'Accesorios', minMonto: 5000, maxMonto: 35000 },
        { tipo: 'Renovación', minMonto: 20000, maxMonto: 150000 },
        { tipo: 'Portabilidad', minMonto: 30000, maxMonto: 200000 },
        { tipo: 'Plan Empresarial', minMonto: 100000, maxMonto: 800000 }
    ];
    
    // Generar ventas para los últimos 3 meses
    const now = new Date();
    
    for (let month = 0; month < 3; month++) {
        const numVentas = 15 + Math.floor(Math.random() * 20); // 15-35 ventas por mes
        
        for (let i = 0; i < numVentas; i++) {
            const tipoVenta = tiposVenta[Math.floor(Math.random() * tiposVenta.length)];
            const monto = tipoVenta.minMonto + Math.floor(Math.random() * (tipoVenta.maxMonto - tipoVenta.minMonto));
            
            const fecha = new Date(now.getFullYear(), now.getMonth() - month, Math.floor(Math.random() * 28) + 1);
            
            sales.push({
                tipo: tipoVenta.tipo,
                monto: monto,
                cliente: `${nombres[Math.floor(Math.random() * nombres.length)]} ${apellidos[Math.floor(Math.random() * apellidos.length)]}`,
                fecha: admin.firestore.Timestamp.fromDate(fecha),
                fechaStr: fecha.toISOString().split('T')[0],
                estado: Math.random() > 0.05 ? 'Completada' : 'Pendiente',
                notas: `Venta de ${tipoVenta.tipo.toLowerCase()}`,
                userId: COBANDOA_UID,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    return sales;
}

// Generar metas
function generateMetas() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    return {
        userId: COBANDOA_UID,
        year: year,
        month: month,
        metas: {
            lineasNuevas: { meta: 25, actual: 18 + Math.floor(Math.random() * 10) },
            equipos: { meta: 20, actual: 14 + Math.floor(Math.random() * 8) },
            planesDatos: { meta: 30, actual: 22 + Math.floor(Math.random() * 12) },
            fibraOptica: { meta: 10, actual: 6 + Math.floor(Math.random() * 5) },
            renovaciones: { meta: 15, actual: 10 + Math.floor(Math.random() * 7) },
            portabilidades: { meta: 12, actual: 8 + Math.floor(Math.random() * 6) }
        },
        montoTotal: {
            meta: 5000000,
            actual: 3500000 + Math.floor(Math.random() * 2000000)
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
}

async function loadData() {
    console.log('🚀 Iniciando carga de datos demo para cobandoa@ice.go.cr...\n');
    
    const batch = db.batch();
    let operaciones = 0;
    
    // 1. Cargar clientes
    console.log('📋 Generando 45 clientes...');
    const clients = generateClients();
    
    for (const client of clients) {
        const ref = db.collection('clients').doc();
        batch.set(ref, client);
        operaciones++;
        
        // Firestore batch tiene límite de 500 operaciones
        if (operaciones >= 400) {
            await batch.commit();
            console.log(`   ✅ Batch de ${operaciones} operaciones guardado`);
            operaciones = 0;
        }
    }
    
    console.log(`   ✅ ${clients.length} clientes generados\n`);
    
    // 2. Cargar ventas
    console.log('💰 Generando ventas de los últimos 3 meses...');
    const sales = generateSales();
    
    for (const sale of sales) {
        const ref = db.collection('pedidos_ventas').doc();
        batch.set(ref, sale);
        operaciones++;
        
        if (operaciones >= 400) {
            await batch.commit();
            console.log(`   ✅ Batch de ${operaciones} operaciones guardado`);
            operaciones = 0;
        }
    }
    
    console.log(`   ✅ ${sales.length} ventas generadas\n`);
    
    // 3. Cargar metas
    console.log('🎯 Generando metas del mes...');
    const metas = generateMetas();
    const metasRef = db.collection('metas_desglosadas').doc(`${COBANDOA_UID}_${metas.year}_${metas.month}`);
    batch.set(metasRef, metas);
    operaciones++;
    
    console.log(`   ✅ Metas generadas\n`);
    
    // Commit final
    if (operaciones > 0) {
        await batch.commit();
        console.log(`   ✅ Batch final de ${operaciones} operaciones guardado\n`);
    }
    
    // Resumen
    console.log('═══════════════════════════════════════════');
    console.log('✅ CARGA COMPLETADA PARA COBANDOA');
    console.log('═══════════════════════════════════════════');
    console.log(`📋 Clientes cargados: ${clients.length}`);
    console.log(`💰 Ventas cargadas: ${sales.length}`);
    console.log(`🎯 Metas configuradas: Sí`);
    console.log('═══════════════════════════════════════════');
    console.log('\n🔗 El usuario puede ver los datos en:');
    console.log('   https://executiveperformancek.web.app');
    console.log('\n');
    
    process.exit(0);
}

loadData().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
