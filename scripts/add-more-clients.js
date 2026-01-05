const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

// Datos de más clientes
const clientesDemo = [
  {
    cedula: '4-1111-2222',
    nombre: 'Carlos Hernández Martínez',
    email: 'chernandez@empresa.cr',
    fechaNacimiento: '1987-02-14',
    domicilio: 'Alajuela, Costa Rica',
    serviciosMoviles: ['Claro'],
    serviciosFijos: ['ICE Fijo'],
    tipoPlan: 'Plus',
    estadoPlan: 'Activo',
    segmento: 'ORO',
    puntajeScore: 880,
    categoriaCrediticia: 'AA',
    notas: 'Cliente de largo plazo, muy leal',
    interacciones: []
  },
  {
    cedula: '5-2222-3333',
    nombre: 'Francisca Rojas Vargas',
    email: 'frojas@negocio.cr',
    fechaNacimiento: '1993-09-28',
    domicilio: 'Puntarenas, Costa Rica',
    serviciosMoviles: ['Kolbi'],
    serviciosFijos: [],
    tipoPlan: 'Básico',
    estadoPlan: 'Activo',
    segmento: 'PLATA',
    puntajeScore: 650,
    categoriaCrediticia: 'A',
    notas: 'Cliente frecuente, buen historial',
    interacciones: []
  },
  {
    cedula: '1-5555-6666',
    nombre: 'Fernando López Jiménez',
    email: 'flopez@empresa.net',
    fechaNacimiento: '1981-06-10',
    domicilio: 'Limón, Costa Rica',
    serviciosMoviles: ['Claro', 'Kolbi'],
    serviciosFijos: ['Cable'],
    tipoPlan: 'Premium',
    estadoPlan: 'Actualizado',
    segmento: 'PLATINO',
    puntajeScore: 920,
    categoriaCrediticia: 'AAA',
    notas: 'Cliente VIP premium',
    interacciones: []
  },
  {
    cedula: '2-7777-8888',
    nombre: 'Valeria Campos Solís',
    email: 'vcampos@startup.cr',
    fechaNacimiento: '1995-01-19',
    domicilio: 'Guanacaste, Costa Rica',
    serviciosMoviles: ['Claro'],
    serviciosFijos: [],
    tipoPlan: 'Estándar',
    estadoPlan: 'Pendiente',
    segmento: 'BRONCE',
    puntajeScore: 480,
    categoriaCrediticia: 'C',
    notas: 'Cliente nuevo con potencial',
    interacciones: []
  },
  {
    cedula: '3-9999-0000',
    nombre: 'Diego Ramírez Arias',
    email: 'dramírez@negocio.cr',
    fechaNacimiento: '1989-04-07',
    domicilio: 'San José, Costa Rica',
    serviciosMoviles: ['Kolbi'],
    serviciosFijos: ['ICE Fijo'],
    tipoPlan: 'Plus',
    estadoPlan: 'Activo',
    segmento: 'ORO',
    puntajeScore: 810,
    categoriaCrediticia: 'AA',
    notas: 'Cliente empresarial importante',
    interacciones: []
  },
  {
    cedula: '4-3333-4444',
    nombre: 'Mariana García Pérez',
    email: 'mgarcia@empresa.cr',
    fechaNacimiento: '1991-11-25',
    domicilio: 'Heredia, Costa Rica',
    serviciosMoviles: ['Claro'],
    serviciosFijos: ['Cable'],
    tipoPlan: 'Estándar',
    estadoPlan: 'Activo',
    segmento: 'PLATA',
    puntajeScore: 700,
    categoriaCrediticia: 'A',
    notas: 'Cliente regular con buen pagador',
    interacciones: []
  },
  {
    cedula: '1-6666-7777',
    nombre: 'Ricardo Mora Blanco',
    email: 'rmora@empresa.net',
    fechaNacimiento: '1986-08-30',
    domicilio: 'Cartago, Costa Rica',
    serviciosMoviles: ['Kolbi', 'Claro'],
    serviciosFijos: ['ICE Fijo', 'Cable'],
    tipoPlan: 'Premium',
    estadoPlan: 'Actualizado',
    segmento: 'PLATINO',
    puntajeScore: 960,
    categoriaCrediticia: 'AAA',
    notas: 'Cliente ejecutivo nivel alto',
    interacciones: []
  },
  {
    cedula: '2-8888-9999',
    nombre: 'Silvia Núñez Chavez',
    email: 'snunez@startup.cr',
    fechaNacimiento: '1994-03-12',
    domicilio: 'San Pedro, Costa Rica',
    serviciosMoviles: ['Claro'],
    serviciosFijos: [],
    tipoPlan: 'Básico',
    estadoPlan: 'No Actualizado',
    segmento: 'BRONCE',
    puntajeScore: 520,
    categoriaCrediticia: 'B',
    notas: 'Cliente con potencial de crecimiento',
    interacciones: []
  }
];

async function agregarClientesAdicionales() {
  try {
    console.log('📊 Agregando más clientes de demo...\n');

    // Obtener el UID del usuario admin
    const adminUser = await admin.auth().getUserByEmail('rmadrigalj@ice.go.cr');
    const executiveId = adminUser.uid;

    console.log(`✅ Usuario encontrado: ${adminUser.email}`);
    console.log(`🔑 UID: ${executiveId}\n`);

    for (const cliente of clientesDemo) {
      const clienteData = {
        ...cliente,
        executiveId: executiveId,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      };

      const docRef = await db.collection('clients').add(clienteData);
      console.log(`✅ Cliente agregado: ${cliente.nombre} (${cliente.segmento})`);
    }

    console.log('\n✅ ¡Clientes adicionales agregados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

agregarClientesAdicionales();
