#!/usr/bin/env node

/**
 * Script para crear cuenta de admin (jefe) con clientes de ejemplo
 * Ejecutar: node create-boss-account.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Cargar credenciales
const serviceAccount = require(path.join(__dirname, 'executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();
const auth = admin.auth();

// Datos del jefe
const bossEmail = 'cobandoa@ice.go.cr';
const bossPassword = 'Kolbi200';
const bossName = 'Obando Arguedas Carlos';

// Segmentos y distribución de clientes
const segments = ['PLATINO', 'ORO', 'PLATA', 'BRONCE', 'BLACK'];
const distribution = [6, 8, 8, 5, 3]; // 30 clientes totales

// Datos de ejemplo
const firstNames = [
  'ALEJANDRO', 'ANDRÉS', 'ANTONIO', 'ARTURO', 'AUGUSTO',
  'BEATRIZ', 'BENJAMIN', 'BERNARDO', 'BLANCA', 'BORIS',
  'CARLOS', 'CARMEN', 'CAROLINA', 'CESAR', 'CRISTINA',
  'DANIEL', 'DAVID', 'DIANA', 'DIEGO', 'DOLORES',
  'EDGAR', 'EDUARDO', 'ELENA', 'ELISABET', 'ENRIQUE',
  'ERNESTO', 'ESPERANZA', 'ESTELA', 'ESTHER', 'EUGENIA'
];

const lastNames = [
  'GARCÍA', 'RODRÍGUEZ', 'MARTÍNEZ', 'HERNÁNDEZ', 'GONZÁLEZ',
  'PÉREZ', 'SÁNCHEZ', 'RAMÍREZ', 'TORRES', 'FLORES',
  'RIVERA', 'CRUZ', 'MORALES', 'GUTIERREZ', 'ORTIZ',
  'JIMENEZ', 'REYES', 'DIAZ', 'CASTRO', 'VARGAS',
  'SOLANO', 'MEDINA', 'ROJAS', 'SALAZAR', 'CORRALES'
];

function generateClientName() {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)];
  const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName1} ${lastName2}`;
}

function generatePhone() {
  return Math.floor(Math.random() * 90000000 + 10000000).toString();
}

function generateScore() {
  return Math.floor(Math.random() * 300 + 400); // 400-700
}

async function createBossAccount() {
  try {
    console.log('🔐 Creando cuenta de admin...\n');

    // 1. Crear usuario en Authentication
    let bossUser;
    try {
      bossUser = await auth.createUser({
        email: bossEmail,
        password: bossPassword,
        displayName: bossName
      });
      console.log(`✅ Usuario creado: ${bossUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        // Si ya existe, obtener el UID
        const user = await auth.getUserByEmail(bossEmail);
        bossUser = user;
        console.log(`ℹ️  Usuario ya existe: ${user.uid}`);
      } else {
        throw error;
      }
    }

    const bossUID = bossUser.uid;

    // 2. Crear documento en Firestore para el usuario
    console.log('📝 Creando perfil en Firestore...\n');
    
    const userDoc = {
      email: bossEmail,
      displayName: bossName,
      role: 'admin',
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(bossUID).set(userDoc, { merge: true });
    console.log(`✅ Perfil creado\n`);

    // 3. Crear clientes de ejemplo
    console.log(`📊 Generando 30 clientes de ejemplo...\n`);

    let clientCount = 0;
    const batch = db.batch();
    let totalToCreate = 0;

    // Calcular total
    distribution.forEach(count => totalToCreate += count);

    // Crear clientes por segmento
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const segment = segments[segmentIndex];
      const clientsInSegment = distribution[segmentIndex];

        for (let i = 0; i < clientsInSegment; i++) {
        // Use deterministic ID when possible; no cedula available, use an auto suffix
        const generatedSuffix = `auto${clientCount + 1}`;
        const clientId = `${bossUID}_${generatedSuffix}`;
        const clientRef = db.collection('clients').doc(clientId);
        const clientData = {
          name: generateClientName(),
          nombre: generateClientName(), // Mantener ambos campos
          segmento: segment,
          ejecutivoId: bossUID,
          executiveId: bossUID,
          email: `cliente${clientCount + 1}@example.com`,
          telefonoMovil: generatePhone(),
          telefonoCelular: generatePhone(),
          telefonoFijo: Math.floor(Math.random() * 90000000 + 10000000).toString(),
          celulares: [generatePhone(), generatePhone()],
          moviles: [generatePhone(), generatePhone(), generatePhone()],
          fijos: [generatePhone(), generatePhone()],
          score: generateScore(),
          categoria: 'A',
          estado: ['ACTUALIZADO', 'PENDIENTE', 'EN_SEGUIMIENTO'][Math.floor(Math.random() * 3)],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(clientRef, clientData);
        clientCount++;
      }

      console.log(`  ${segment}: ${clientsInSegment} clientes`);
    }

    await batch.commit();
    console.log(`\n✅ ${clientCount} clientes creados exitosamente\n`);

    console.log('=' .repeat(50));
    console.log('📋 RESUMEN DE CREACIÓN');
    console.log('=' .repeat(50));
    console.log(`Email:        ${bossEmail}`);
    console.log(`Contraseña:   ${bossPassword}`);
    console.log(`Nombre:       ${bossName}`);
    console.log(`Rol:          admin`);
    console.log(`UID:          ${bossUID}`);
    console.log(`Clientes:     ${clientCount}`);
    console.log('=' .repeat(50));
    console.log('\n✅ ¡Cuenta lista! Tu jefe puede entrar ahora.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Ejecutar
createBossAccount();
