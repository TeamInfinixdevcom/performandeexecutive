/**
 * Script para verificar usuarios activos y clientes correctamente asignados en Firestore
 * Ejecutar con Node.js y tener configurado Firebase Admin SDK
 */

const admin = require('firebase-admin');
const serviceAccount = require('../executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function revisarUsuariosYClientes() {
  // 1. Revisar usuarios activos
  const usersSnap = await db.collection('users').get();
  const usuariosInactivos = [];
  const usuarios = {};
  usersSnap.forEach(doc => {
    const data = doc.data();
    usuarios[doc.id] = data;
    if (!data.isActive) {
      usuariosInactivos.push({ id: doc.id, ...data });
    }
  });

  // 2. Revisar clientes con executiveId inválido
  const clientsSnap = await db.collection('clients').get();
  const clientesMalAsignados = [];
  clientsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.executiveId || !usuarios[data.executiveId]) {
      clientesMalAsignados.push({ id: doc.id, ...data });
    }
  });

  // 3. Reporte
  console.log('Usuarios inactivos:');
  console.table(usuariosInactivos);
  console.log('Clientes con executiveId inválido o sin usuario:');
  console.table(clientesMalAsignados);
  console.log('Revisión completada. Si ambas tablas están vacías, todo está en orden.');
}

revisarUsuariosYClientes().catch(console.error);
