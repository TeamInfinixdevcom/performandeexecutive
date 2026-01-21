const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

// Datos de ejemplo de clientes
const clientesDemo = [
  {
    cedula: '1-1234-5678',
    nombre: 'Juan Carlos Morales',
    email: 'jmorales@empresa.cr',
    fechaNacimiento: '1985-03-15',
    domicilio: 'San José, Costa Rica',
    serviciosMoviles: ['Claro', 'Kolbi'],
    serviciosFijos: ['ICE Fijo', 'Cable'],
    tipoPlan: 'Premium',
    estadoPlan: 'Activo',
    segmento: 'PLATINO',
    puntajeScore: 950,
    categoriaCrediticia: 'AAA',
    notas: 'Cliente VIP, muy activo en contratos',
    interacciones: [
      {
        tipo: 'renovaciones',
        fecha: new Date('2025-10-15'),
        descripcion: 'Renovación de servicio móvil'
      }
    ]
  },
  {
    cedula: '1-9876-5432',
    nombre: 'María Rodríguez López',
    email: 'mrodriguez@negocio.cr',
    fechaNacimiento: '1990-07-22',
    domicilio: 'Heredia, Costa Rica',
    serviciosMoviles: ['Kolbi'],
    serviciosFijos: ['ICE Fijo'],
    tipoPlan: 'Plus',
    estadoPlan: 'Activo',
    segmento: 'ORO',
    puntajeScore: 850,
    categoriaCrediticia: 'AA',
    notas: 'Cliente empresarial con múltiples líneas',
    interacciones: [
      {
        tipo: 'ofertas',
        fecha: new Date('2025-10-10'),
        descripcion: 'Presentación de oferta de datos'
      },
      {
        tipo: 'consultas',
        fecha: new Date('2025-10-05'),
        descripcion: 'Consulta sobre planes internacionales'
      }
    ]
  },
  {
    cedula: '3-5678-1234',
    nombre: 'Roberto Fernández Silva',
    email: 'rfernandez@empresa.net',
    fechaNacimiento: '1988-11-08',
    domicilio: 'Cartago, Costa Rica',
    serviciosMoviles: ['Claro'],
    serviciosFijos: ['Cable'],
    tipoPlan: 'Estándar',
    estadoPlan: 'Activo',
    segmento: 'PLATA',
    puntajeScore: 720,
    categoriaCrediticia: 'A',
    notas: 'Cliente regular, buen pagador',
    interacciones: [
      {
        tipo: 'consultas',
        fecha: new Date('2025-09-20'),
        descripcion: 'Pregunta sobre facturación'
      }
    ]
  },
  {
    cedula: '2-4567-8901',
    nombre: 'Andrea Jiménez Reyes',
    email: 'ajimenez@startup.cr',
    fechaNacimiento: '1992-05-30',
    domicilio: 'San Pedro, Costa Rica',
    serviciosMoviles: ['Kolbi', 'Claro'],
    serviciosFijos: [],
    tipoPlan: 'Básico',
    estadoPlan: 'Activo',
    segmento: 'BRONCE',
    puntajeScore: 550,
    categoriaCrediticia: 'B',
    notas: 'Cliente nuevo, poco historial',
    interacciones: [
      {
        tipo: 'reclamos',
        fecha: new Date('2025-09-15'),
        descripcion: 'Reclamo por facturación incorrecta'
      }
    ]
  }
];

async function agregarClientesDemo() {
  try {
    console.log('📊 Iniciando agregación de clientes de demo...\n');

    // Obtener el UID del usuario admin (rmadrigalj@ice.go.cr)
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

      const safeCedula = String(cliente.cedula || '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
      const clientId = `${executiveId}_${safeCedula || 'auto' + Math.floor(Math.random()*1000000)}`;
      await db.collection('clients').doc(clientId).set(clienteData);
      console.log(`✅ Cliente agregado: ${cliente.nombre} (ID: ${clientId})`);
    }

    console.log('\n✅ ¡Todos los clientes de demo han sido agregados exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

agregarClientesDemo();
