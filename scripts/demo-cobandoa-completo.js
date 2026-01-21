/**
 * SCRIPT COMPLETO DE DATOS DEMO PARA COBANDOA
 * 
 * Ejecutar con: node demo-cobandoa-completo.js
 * 
 * Carga:
 * - 50 clientes ficticios
 * - 80+ ventas del mes actual
 * - 8 items en Lista de Espera
 * - Metas del mes
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();

// UID de cobandoa@ice.go.cr
const COBANDOA_UID = 'AWJFrsMkvxMTj1HVGsIr5NdBykE2';

// ========== DATOS DE CLIENTES ==========
const nombres = [
    'CARLOS ALBERTO', 'MARIA JOSE', 'JUAN PABLO', 'ANA LUCIA', 'LUIS FERNANDO',
    'PATRICIA ELENA', 'DIEGO ANDRES', 'LAURA MELISSA', 'ROBERTO CARLOS', 'MONICA ANDREA',
    'JORGE MARIO', 'CARMEN ROSA', 'PEDRO ANTONIO', 'SANDRA MILENA', 'MIGUEL ANGEL',
    'DANIELA FERNANDA', 'ANDRES FELIPE', 'GABRIELA MARIA', 'RICARDO JOSE', 'VALENTINA',
    'OSCAR EDUARDO', 'ADRIANA PAOLA', 'FERNANDO JOSE', 'NATALIA ANDREA', 'ESTEBAN',
    'CATALINA MARIA', 'ALEJANDRO JOSE', 'ISABELLA SOFIA', 'SEBASTIAN ANDRES', 'CAMILA',
    'DAVID ALEJANDRO', 'MARIANA LUCIA', 'NICOLAS ANDRES', 'JULIANA MARIA', 'MATEO',
    'PAULA ANDREA', 'SANTIAGO JOSE', 'VALERIA MARIA', 'TOMAS ANDRES', 'SOFIA ELENA',
    'EMILIO JOSE', 'ANDREA MARIA', 'JULIAN DAVID', 'CAROLINA ANDREA', 'MARTIN JOSE',
    'FABIOLA ELENA', 'CRISTIAN DAVID', 'LORENA MARIA', 'KEVIN ANDRES', 'DIANA CAROLINA'
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
    'UGALDE CORRALES', 'BONILLA ZUNIGA', 'VALVERDE AGUILAR', 'ZAMORA SOLIS', 'ALFARO CRUZ',
    'ESQUIVEL LEON', 'OBANDO MORA', 'LEON CHAVARRIA', 'MURILLO BLANCO', 'ZUNIGA NAVARRO'
];

const segmentos = ['PLATINO', 'ORO', 'PLATA', 'BRONCE'];
const tiposPlan = ['Empresarial Premium', 'Empresarial Plus', 'Profesional', 'Personal Max', 'Familiar', 'Básico', 'Postpago Ilimitado'];
const provincias = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
const dominios = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'ice.co.cr'];

// ========== DATOS DE VENTAS ==========
const marcas = ['iPhone', 'Samsung', 'Xiaomi', 'Huawei', 'Motorola', 'Nokia'];
const modelosPorMarca = {
    'iPhone': ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone SE'],
    'Samsung': ['Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy A54', 'Galaxy A34'],
    'Xiaomi': ['Xiaomi 14 Ultra', 'Redmi Note 13 Pro', 'Redmi 13C', 'POCO X6 Pro', 'POCO M6'],
    'Huawei': ['P60 Pro', 'Nova 12', 'Nova Y91', 'Mate 60'],
    'Motorola': ['Edge 40 Pro', 'Moto G84', 'Moto G54', 'Moto E14'],
    'Nokia': ['Nokia G42', 'Nokia C32', 'Nokia 110']
};
const almacenamientos = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const accesorios = ['Case protector', 'Mica de vidrio', 'Cargador rápido', 'Audífonos', 'Power Bank'];
const planes = ['Plan Básico', 'Plan Plus', 'Plan Max', 'Plan Premium', 'Plan Empresarial'];
const metodoPago = ['Contado', 'Crédito ICE', 'Tarjeta Crédito', 'Financiamiento'];
const tiposLinea = ['Nueva', 'Portabilidad', 'Upgrade'];

// ========== FUNCIONES AUXILIARES ==========
function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateCedula() {
    const tipo = Math.random() > 0.1 ? '1' : '2';
    return `${tipo}-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

function generatePhone() {
    const prefijo = random(['8', '7', '6']);
    return `${prefijo}${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
}

function generateEmail(nombre, apellido) {
    const n = nombre.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const a = apellido.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `${n}.${a}${randomInt(1, 99)}@${random(dominios)}`;
}

function generateBirthDate() {
    const year = randomInt(1960, 2000);
    const month = randomInt(1, 12);
    const day = randomInt(1, 28);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDateInMonth(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return admin.firestore.Timestamp.fromDate(date);
}

// ========== GENERADORES ==========
function generateClientes(count) {
    const clientes = [];
    for (let i = 0; i < count; i++) {
        const nombre = nombres[i % nombres.length];
        const apellido = apellidos[i % apellidos.length];
        clientes.push({
            cedula: generateCedula(),
            nombre: `${nombre} ${apellido}`,
            email: generateEmail(nombre, apellido),
            telefono: generatePhone(),
            fechaNacimiento: generateBirthDate(),
            domicilio: `${random(provincias)}, Costa Rica`,
            serviciosMoviles: Math.random() > 0.3 ? ['Kolbi'] : ['Kolbi', 'Claro'],
            serviciosFijos: Math.random() > 0.5 ? ['ICE Fijo'] : [],
            tipoPlan: random(tiposPlan),
            estadoPlan: Math.random() > 0.1 ? 'Activo' : 'Pendiente',
            segmento: random(segmentos),
            puntajeScore: randomInt(500, 1000),
            categoriaCrediticia: random(['AAA', 'AA', 'A', 'B']),
            notas: '',
            executiveId: COBANDOA_UID,
            userId: COBANDOA_UID,
            createdAt: getDateInMonth(randomInt(0, 60)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    return clientes;
}

function generateVentas(clientes, count) {
    const ventas = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
        const cliente = random(clientes);
        const marca = random(marcas);
        const modelo = random(modelosPorMarca[marca]);
        const almacenamiento = random(almacenamientos);
        const incluyeTel = Math.random() > 0.2;
        const incluyeAcc = Math.random() > 0.4;
        const daysAgo = randomInt(0, 30);
        
        const saleDate = new Date(now);
        saleDate.setDate(saleDate.getDate() - daysAgo);
        
        ventas.push({
            clientName: cliente.nombre,
            cedula: cliente.cedula,
            linea: generatePhone(),
            tipoLinea: random(tiposLinea),
            plan: random(planes),
            marca: marca,
            modelo: modelo,
            almacenamiento: almacenamiento,
            imei: String(randomInt(100000000000000, 999999999999999)),
            incluyeTelefono: incluyeTel,
            incluyeAccesorio: incluyeAcc,
            accesorios: incluyeAcc ? [random(accesorios)] : [],
            metodoPago: random(metodoPago),
            monto: randomInt(50000, 800000),
            notas: '',
            status: 'completed',
            executiveId: COBANDOA_UID,
            userId: COBANDOA_UID,
            createdAt: admin.firestore.Timestamp.fromDate(saleDate),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    return ventas;
}

function generateListaEspera() {
    const items = [
        { clientName: 'JOSE MANUEL VARGAS SOLIS', cedula: '1-1234-5678', phone: '8845-2134', email: 'jvargas@gmail.com', brand: 'iPhone', model: 'iPhone 15 Pro Max', storage: '256GB', notes: 'Cliente VIP, llamar cuando llegue', daysAgo: 8 },
        { clientName: 'MARIA ELENA CASTRO ROJAS', cedula: '1-5678-9012', phone: '7023-4567', email: 'mcastro@hotmail.com', brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '512GB', notes: 'Urgente, portabilidad de Claro', daysAgo: 6 },
        { clientName: 'CARLOS ANDRES MORA JIMENEZ', cedula: '2-3456-7890', phone: '8567-1234', email: 'cmora@outlook.com', brand: 'iPhone', model: 'iPhone 15', storage: '128GB', notes: 'Espera color azul', daysAgo: 5 },
        { clientName: 'ANA LUCIA FERNANDEZ GARCIA', cedula: '1-8901-2345', phone: '6789-0123', email: 'afernandez@gmail.com', brand: 'Xiaomi', model: 'Xiaomi 14 Ultra', storage: '256GB', notes: '', daysAgo: 4 },
        { clientName: 'LUIS FERNANDO GONZALEZ ARIAS', cedula: '1-2345-6789', phone: '8234-5678', email: 'lgonzalez@ice.co.cr', brand: 'Samsung', model: 'Galaxy A54', storage: '128GB', notes: 'Cliente empresarial', daysAgo: 3 },
        { clientName: 'PATRICIA ELENA RODRIGUEZ MORA', cedula: '1-6789-0123', phone: '7890-1234', email: 'prodriguez@yahoo.com', brand: 'iPhone', model: 'iPhone 14', storage: '128GB', notes: 'Esperando promoción', daysAgo: 2 },
        { clientName: 'DIEGO ALEJANDRO MARTINEZ VEGA', cedula: '1-0123-4567', phone: '8901-2345', email: 'dmartinez@gmail.com', brand: 'Motorola', model: 'Edge 40 Pro', storage: '256GB', notes: '', daysAgo: 1 },
        { clientName: 'LAURA MELISSA SANCHEZ BLANCO', cedula: '1-4567-8901', phone: '6012-3456', email: 'lsanchez@hotmail.com', brand: 'Samsung', model: 'Galaxy S24', storage: '256GB', notes: 'Color negro', daysAgo: 0 }
    ];

    return items.map(item => {
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - item.daysAgo);
        return {
            clientName: item.clientName,
            cedula: item.cedula,
            phone: item.phone,
            email: item.email,
            brand: item.brand,
            model: item.model,
            storage: item.storage,
            notes: item.notes,
            status: 'waiting',
            userId: COBANDOA_UID,
            createdAt: admin.firestore.Timestamp.fromDate(createdDate)
        };
    });
}

function generateCompletados() {
    const items = [
        { clientName: 'ROBERTO CARLOS HERRERA LEON', cedula: '1-7890-1234', phone: '8123-4567', brand: 'iPhone', model: 'iPhone 15 Pro', storage: '256GB', daysAgoCreated: 15, daysAgoCompleted: 5 },
        { clientName: 'MONICA ANDREA SOTO QUESADA', cedula: '1-3456-7890', phone: '7234-5678', brand: 'Samsung', model: 'Galaxy S24+', storage: '256GB', daysAgoCreated: 12, daysAgoCompleted: 3 },
        { clientName: 'JORGE MARIO ALVARADO CERDAS', cedula: '2-8901-2345', phone: '8345-6789', brand: 'Xiaomi', model: 'Redmi Note 13 Pro', storage: '128GB', daysAgoCreated: 10, daysAgoCompleted: 2 }
    ];

    return items.map(item => {
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - item.daysAgoCreated);
        const completedDate = new Date();
        completedDate.setDate(completedDate.getDate() - item.daysAgoCompleted);
        return {
            clientName: item.clientName,
            cedula: item.cedula,
            phone: item.phone,
            email: '',
            brand: item.brand,
            model: item.model,
            storage: item.storage,
            notes: 'Entregado exitosamente',
            status: 'completed',
            userId: COBANDOA_UID,
            createdAt: admin.firestore.Timestamp.fromDate(createdDate),
            completedAt: admin.firestore.Timestamp.fromDate(completedDate)
        };
    });
}

// ========== EJECUCIÓN PRINCIPAL ==========
async function loadDemoData() {
    console.log('🚀 CARGANDO DATOS DEMO PARA cobandoa@ice.go.cr\n');
    console.log('=' .repeat(50));

    try {
        // 1. LIMPIAR DATOS ANTERIORES
        console.log('\n🧹 Limpiando datos anteriores...');
        
        const collections = ['clients', 'ventas', 'lista_espera'];
        for (const col of collections) {
            const snapshot = await db.collection(col).where('userId', '==', COBANDOA_UID).get();
            const batch = db.batch();
            let count = 0;
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });
            if (count > 0) {
                await batch.commit();
                console.log(`   ✓ Eliminados ${count} documentos de ${col}`);
            }
        }

        // 2. CREAR CLIENTES
        console.log('\n👥 Creando clientes...');
        const clientes = generateClientes(50);
        const clientesBatch = db.batch();
        const clientesRefs = [];
        
        for (const cliente of clientes) {
            const safeCedula = String(cliente.cedula || '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
            const clientId = `${COBANDOA_UID}_${safeCedula || 'auto' + Math.floor(Math.random()*1000000)}`;
            const ref = db.collection('clients').doc(clientId);
            clientesBatch.set(ref, cliente);
            clientesRefs.push({ ...cliente, id: clientId });
        }
        await clientesBatch.commit();
        console.log(`   ✓ Creados ${clientes.length} clientes`);

        // 3. CREAR VENTAS
        console.log('\n💰 Creando ventas...');
        const ventas = generateVentas(clientesRefs, 85);
        
        // Dividir en batches de 500
        for (let i = 0; i < ventas.length; i += 450) {
            const batch = db.batch();
            const chunk = ventas.slice(i, i + 450);
            for (const venta of chunk) {
                const ref = db.collection('ventas').doc();
                batch.set(ref, venta);
            }
            await batch.commit();
        }
        console.log(`   ✓ Creadas ${ventas.length} ventas`);

        // 4. CREAR LISTA DE ESPERA
        console.log('\n⏳ Creando lista de espera...');
        const listaEspera = generateListaEspera();
        const completados = generateCompletados();
        const esperaBatch = db.batch();
        
        for (const item of [...listaEspera, ...completados]) {
            const ref = db.collection('lista_espera').doc();
            esperaBatch.set(ref, item);
        }
        await esperaBatch.commit();
        console.log(`   ✓ Creados ${listaEspera.length} en espera + ${completados.length} completados`);

        // 5. CREAR METAS DEL MES
        console.log('\n🎯 Configurando metas del mes...');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const metas = {
            userId: COBANDOA_UID,
            year: year,
            month: month,
            lineasNuevas: { meta: 25, actual: 18 },
            portabilidades: { meta: 15, actual: 12 },
            upgrades: { meta: 20, actual: 15 },
            accesorios: { meta: 30, actual: 22 },
            seguros: { meta: 10, actual: 7 },
            facturacion: { meta: 5000000, actual: 3850000 },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('metas_desglosadas').doc(`${COBANDOA_UID}_${year}_${month}`).set(metas);
        console.log(`   ✓ Metas configuradas para ${month}/${year}`);

        // RESUMEN
        console.log('\n' + '='.repeat(50));
        console.log('✅ CARGA COMPLETADA EXITOSAMENTE\n');
        console.log('📊 RESUMEN:');
        console.log(`   • Clientes: ${clientes.length}`);
        console.log(`   • Ventas: ${ventas.length}`);
        console.log(`   • Lista de Espera: ${listaEspera.length} en espera + ${completados.length} completados`);
        console.log(`   • Metas: Configuradas para ${month}/${year}`);
        console.log('\n🔗 Usuario: cobandoa@ice.go.cr');
        console.log('🔗 URL: https://executiveperformancek.web.app');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

loadDemoData();
