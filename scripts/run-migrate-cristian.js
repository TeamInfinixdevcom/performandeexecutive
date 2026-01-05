#!/usr/bin/env node

/**
 * Script para migrar nombres de clientes de Cristian
 * Ejecutar: node run-migrate-cristian.js
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

async function migrateCristianNames() {
  try {
    console.log('🔄 Iniciando migración de nombres de Cristian...\n');

    // UID de Cristian
    const cristianUID = 'T8OdsUAbGNfGT4PouAMb6HGePxH2';
    
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.where('executiveId', '==', cristianUID).get();
    
    console.log(`Encontrados ${snapshot.size} clientes de Cristian\n`);

    let updated = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Procesando: ${data.nombre || data.name || 'Sin nombre'} (${doc.id})`);
      
      // Si tiene 'nombre' pero no tiene 'name', migrar
      if (data.nombre && !data.name) {
        batch.update(doc.ref, {
          name: data.nombre,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updated++;
        console.log(`  ✅ Migrado a: ${data.nombre}`);
      } else if (data.name) {
        console.log(`  ℹ️  Ya tiene 'name': ${data.name}`);
      }
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`\n✅ Migración completada: ${updated} clientes actualizados`);
    } else {
      console.log(`\nℹ️  No hay clientes para migrar`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Ejecutar
migrateCristianNames();
