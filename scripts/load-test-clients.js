/**
 * SCRIPT PARA CARGAR 21 CLIENTES DE PRUEBA
 * 
 * Ejecutar con:
 * node load-test-clients.js
 * 
 * Carga 21 clientes con datos variados y realistas
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://executiveperformancek.firebaseio.com"
});

const db = admin.firestore();

/**
 * Datos de 21 clientes para cargar
 */
const testClients = [
  {
    name: 'JUAN CARLOS RODRIGUEZ',
    cedula: '1-1234-5678',
    email: 'juan.rodriguez@email.com',
    segmento: 'PLATINO',
    serviciosMoviles: ['8888-1111', '8888-2222'],
    serviciosFijos: ['2222-1111'],
    tipoPlan: 'Empresarial Premium',
    estadoPlan: 'Activo',
    puntajeScore: 950,
    categoriaCrediticia: 'AAA',
    domicilio: 'San José, Costa Rica',
    fechaNacimiento: '1980-05-15',
    notas: 'Cliente VIP - Requiere atención personalizada'
  },
  {
    name: 'MARIA FERNANDEZ GARCIA',
    cedula: '1-5555-6666',
    email: 'maria.fernandez@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-3333'],
    serviciosFijos: ['2222-2222', '2222-3333'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 880,
    categoriaCrediticia: 'AA',
    domicilio: 'Heredia, Costa Rica',
    fechaNacimiento: '1985-08-22',
    notas: 'Empresa de servicios - Requiere monitoreo mensual'
  },
  {
    name: 'LUIS ANTONIO MORALES',
    cedula: '1-6666-7777',
    email: 'luis.morales@email.com',
    segmento: 'PLATINO',
    serviciosMoviles: ['8888-4444', '8888-5555', '8888-6666'],
    serviciosFijos: ['2222-4444'],
    tipoPlan: 'Empresarial Premium',
    estadoPlan: 'Activo',
    puntajeScore: 920,
    categoriaCrediticia: 'AAA',
    domicilio: 'San Pedro, Costa Rica',
    fechaNacimiento: '1975-03-10',
    notas: 'Grupo empresarial - Multiple líneas'
  },
  {
    name: 'PATRICIA MONTOYA RUIZ',
    cedula: '1-9876-5432',
    email: 'patricia.montoya@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-7777'],
    serviciosFijos: ['2222-5555'],
    tipoPlan: 'Profesional',
    estadoPlan: 'Activo',
    puntajeScore: 750,
    categoriaCrediticia: 'A',
    domicilio: 'Cartago, Costa Rica',
    fechaNacimiento: '1990-11-30',
    notas: 'Profesional independiente'
  },
  {
    name: 'DANIEL GUTIERREZ SOTO',
    cedula: '2-4567-8901',
    email: 'daniel.gutierrez@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-8888', '8888-9999'],
    serviciosFijos: ['2222-6666'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 850,
    categoriaCrediticia: 'AA',
    domicilio: 'Alajuela, Costa Rica',
    fechaNacimiento: '1988-06-18',
    notas: 'Importador - Requiere líneas internacionales'
  },
  {
    name: 'SOFIA MADRIGAL RIVERA',
    cedula: '2-7777-8888',
    email: 'sofia.madrigal@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-1010'],
    serviciosFijos: [],
    tipoPlan: 'Móvil Plus',
    estadoPlan: 'Activo',
    puntajeScore: 700,
    categoriaCrediticia: 'A',
    domicilio: 'Liberia, Costa Rica',
    fechaNacimiento: '1992-09-05',
    notas: 'Comerciante local - Solo móvil'
  },
  {
    name: 'CARLOS ALBERTO MENDEZ',
    cedula: '2-8888-9999',
    email: 'carlos.mendez@email.com',
    segmento: 'BRONCE',
    serviciosMoviles: ['8888-1111'],
    serviciosFijos: ['2222-7777'],
    tipoPlan: 'Básico',
    estadoPlan: 'Activo',
    puntajeScore: 600,
    categoriaCrediticia: 'B',
    domicilio: 'San Isidro, Costa Rica',
    fechaNacimiento: '1995-12-12',
    notas: 'Cliente nuevo - Plan básico'
  },
  {
    name: 'FERNANDA TORRES MONTERO',
    cedula: '3-5678-1234',
    email: 'fernanda.torres@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-1212'],
    serviciosFijos: ['2222-8888', '2222-9999'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 870,
    categoriaCrediticia: 'AA',
    domicilio: 'San Rafael, Costa Rica',
    fechaNacimiento: '1987-04-20',
    notas: 'Empresa de publicidad'
  },
  {
    name: 'RICARDO SOLANO CAMPOS',
    cedula: '3-9999-0000',
    email: 'ricardo.solano@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-1313'],
    serviciosFijos: ['2222-1010'],
    tipoPlan: 'Profesional',
    estadoPlan: 'Activo',
    puntajeScore: 720,
    categoriaCrediticia: 'A',
    domicilio: 'Concepción, Costa Rica',
    fechaNacimiento: '1991-07-08',
    notas: 'Consultor empresarial'
  },
  {
    name: 'GABRIELA MUNOZ HERRERA',
    cedula: '4-1111-2222',
    email: 'gabriela.munoz@email.com',
    segmento: 'BLACK',
    serviciosMoviles: ['8888-1414', '8888-1515'],
    serviciosFijos: ['2222-1111', '2222-1212'],
    tipoPlan: 'Premium Total',
    estadoPlan: 'Activo',
    puntajeScore: 980,
    categoriaCrediticia: 'AAA',
    domicilio: 'Escazú, Costa Rica',
    fechaNacimiento: '1978-02-14',
    notas: 'Cliente ejecutivo - Máxima prioridad'
  },
  {
    name: 'ANDRES VILLALOBOS NAVARRO',
    cedula: '4-3333-4444',
    email: 'andres.villalobos@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-1616'],
    serviciosFijos: ['2222-1313'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 860,
    categoriaCrediticia: 'AA',
    domicilio: 'Santa Ana, Costa Rica',
    fechaNacimiento: '1989-10-25',
    notas: 'Constructor - Proyecto inmobiliario'
  },
  {
    name: 'BEATRIZ VARGAS FLORES',
    cedula: '5-2222-3333',
    email: 'beatriz.vargas@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-1717'],
    serviciosFijos: ['2222-1414'],
    tipoPlan: 'Profesional',
    estadoPlan: 'Activo',
    puntajeScore: 740,
    categoriaCrediticia: 'A',
    domicilio: 'San Joaquín, Costa Rica',
    fechaNacimiento: '1993-01-19',
    notas: 'Abogada independiente'
  },
  {
    name: 'VICTOR MANUEL CAMPOS',
    cedula: '5-6666-7777',
    email: 'victor.campos@email.com',
    segmento: 'BRONCE',
    serviciosMoviles: ['8888-1818'],
    serviciosFijos: [],
    tipoPlan: 'Básico',
    estadoPlan: 'Suspendido',
    puntajeScore: 550,
    categoriaCrediticia: 'C',
    domicilio: 'Pavas, Costa Rica',
    fechaNacimiento: '1996-08-07',
    notas: 'Cuenta suspendida - Requiere seguimiento'
  },
  {
    name: 'MONICA ROJAS ESPINOZA',
    cedula: '6-3333-4444',
    email: 'monica.rojas@email.com',
    segmento: 'PLATINO',
    serviciosMoviles: ['8888-1919', '8888-2020'],
    serviciosFijos: ['2222-1515', '2222-1616'],
    tipoPlan: 'Empresarial Premium',
    estadoPlan: 'Activo',
    puntajeScore: 910,
    categoriaCrediticia: 'AAA',
    domicilio: 'Barrio Escalante, Costa Rica',
    fechaNacimiento: '1982-03-30',
    notas: 'Agencia de viajes - Cliente leal'
  },
  {
    name: 'RAMON GONZALEZ LOPEZ',
    cedula: '6-7777-8888',
    email: 'ramon.gonzalez@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-2121'],
    serviciosFijos: ['2222-1717'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 840,
    categoriaCrediticia: 'AA',
    domicilio: 'Curridabat, Costa Rica',
    fechaNacimiento: '1986-11-11',
    notas: 'Distribuidor de productos'
  },
  {
    name: 'ELENA CABRERA SANTIAGO',
    cedula: '7-2222-3333',
    email: 'elena.cabrera@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-2222'],
    serviciosFijos: ['2222-1818'],
    tipoPlan: 'Profesional',
    estadoPlan: 'Activo',
    puntajeScore: 730,
    categoriaCrediticia: 'A',
    domicilio: 'Rivas, Costa Rica',
    fechaNacimiento: '1994-05-23',
    notas: 'Psicóloga - Consulta privada'
  },
  {
    name: 'SEBASTIAN FUENTES MORA',
    cedula: '7-5555-6666',
    email: 'sebastian.fuentes@email.com',
    segmento: 'BLACK',
    serviciosMoviles: ['8888-2323', '8888-2424', '8888-2525'],
    serviciosFijos: ['2222-1919', '2222-2020'],
    tipoPlan: 'Premium Total',
    estadoPlan: 'Activo',
    puntajeScore: 970,
    categoriaCrediticia: 'AAA',
    domicilio: 'Santa Tecnológica, Costa Rica',
    fechaNacimiento: '1980-09-16',
    notas: 'CEO empresa tecnológica'
  },
  {
    name: 'CATALINA JIMENEZ BENAVIDES',
    cedula: '8-1111-2222',
    email: 'catalina.jimenez@email.com',
    segmento: 'PLATA',
    serviciosMoviles: ['8888-2626'],
    serviciosFijos: [],
    tipoPlan: 'Móvil Plus',
    estadoPlan: 'Activo',
    puntajeScore: 710,
    categoriaCrediticia: 'A',
    domicilio: 'Tibás, Costa Rica',
    fechaNacimiento: '1998-12-02',
    notas: 'Emprendedora joven'
  },
  {
    name: 'FRANCISCO TORRES CALDERON',
    cedula: '8-4444-5555',
    email: 'francisco.torres@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-2727'],
    serviciosFijos: ['2222-2121', '2222-2222'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 880,
    categoriaCrediticia: 'AA',
    domicilio: 'San Isidro, Costa Rica',
    fechaNacimiento: '1984-06-29',
    notas: 'Ingeniero consultor'
  },
  {
    name: 'ADRIANA MORENO GUTIERREZ',
    cedula: '8-8888-9999',
    email: 'adriana.moreno@email.com',
    segmento: 'BRONCE',
    serviciosMoviles: ['8888-2828'],
    serviciosFijos: ['2222-2323'],
    tipoPlan: 'Básico',
    estadoPlan: 'Activo',
    puntajeScore: 620,
    categoriaCrediticia: 'B',
    domicilio: 'Desamparados, Costa Rica',
    fechaNacimiento: '1997-04-11',
    notas: 'Vendedora independiente'
  },
  {
    name: 'JOSE LUIS SANDOVAL DIAZ',
    cedula: '9-2222-3333',
    email: 'joseluis.sandoval@email.com',
    segmento: 'PLATINO',
    serviciosMoviles: ['8888-2929', '8888-3030'],
    serviciosFijos: ['2222-2424'],
    tipoPlan: 'Empresarial Premium',
    estadoPlan: 'Activo',
    puntajeScore: 930,
    categoriaCrediticia: 'AAA',
    domicilio: 'Rohrmoser, Costa Rica',
    fechaNacimiento: '1979-07-14',
    notas: 'Empresario - Múltiples negocios'
  },
  {
    name: 'VERONICA CHAVARRIA SOLIS',
    cedula: '9-6666-7777',
    email: 'veronica.chavarria@email.com',
    segmento: 'ORO',
    serviciosMoviles: ['8888-3131'],
    serviciosFijos: ['2222-2525'],
    tipoPlan: 'Empresarial Plus',
    estadoPlan: 'Activo',
    puntajeScore: 875,
    categoriaCrediticia: 'AA',
    domicilio: 'La Uruca, Costa Rica',
    fechaNacimiento: '1988-02-27',
    notas: 'Directora de Marketing'
  }
];

/**
 * Función para cargar clientes
 */
async function loadTestClients() {
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   CARGADOR DE CLIENTES DE PRUEBA       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('🔍 Buscando usuario admin...\n');

    // Encontrar el admin
    const usersSnapshot = await db
      .collection('users')
      .where('email', '==', 'rmadrigalj@ice.go.cr')
      .get();

    if (usersSnapshot.empty) {
      console.log('❌ No se encontró el usuario admin.');
      process.exit(1);
    }

    const adminUser = usersSnapshot.docs[0].data();
    const adminUid = usersSnapshot.docs[0].id;

    console.log(`✅ Usuario encontrado: ${adminUser.email}`);
    console.log(`   UID: ${adminUid}\n`);

    console.log(`📝 Preparando para cargar ${testClients.length} clientes...\n`);

    let createdCount = 0;
    const batch = db.batch();
    const clientsRef = db.collection('clients');

    // Agregar todos los clientes
    testClients.forEach((clientData, index) => {
      const newDocRef = clientsRef.doc();
      
      batch.set(newDocRef, {
        ...clientData,
        executiveId: adminUid,
        executiveName: adminUser.displayName || adminUser.email,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        interactions: []
      });

      createdCount++;
    });

    // Ejecutar batch
    await batch.commit();

    console.log(`✅ ÉXITO: Se cargaron ${createdCount} clientes.\n`);

    // Mostrar resumen por segmento
    console.log('📊 Resumen por segmento:\n');
    const segments = {};
    testClients.forEach(client => {
      segments[client.segmento] = (segments[client.segmento] || 0) + 1;
    });

    Object.entries(segments).forEach(([segment, count]) => {
      console.log(`   ${segment.padEnd(15)} : ${count} cliente(s)`);
    });

    // Log de auditoría
    await db.collection('audit_logs').add({
      userId: adminUid,
      action: 'BULK_LOAD_CLIENTS',
      resource: 'clients',
      details: {
        createdCount: createdCount,
        timestamp: new Date(),
        note: 'Carga masiva de 21 clientes de prueba'
      }
    });

    console.log('\n📝 Auditoría registrada.');
    console.log('✅ ¡Los datos están listos en Firestore!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar
loadTestClients();
