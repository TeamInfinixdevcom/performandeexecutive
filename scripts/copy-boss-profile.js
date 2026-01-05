#!/usr/bin/env node

/**
 * Script para copiar perfil completo de rmadrigalj a Carlos (cobandoa)
 * Ejecutar: node copy-boss-profile.js
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

// UIDs
const adminUID = 'yF8fwbUQFpXXlOfUMyvQmHmBgNI3'; // rmadrigalj@ice.go.cr
const bossUID = '2Axk1xzj5MYloAitQtqn2daJ8dJ3'; // cobandoa@ice.go.cr

async function copyProfile() {
  try {
    console.log('🔄 Copiando perfil completo...\n');

    // 1. Copiar configuración del usuario
    console.log('📋 Copiando datos de usuario...');
    const adminUserDoc = await db.collection('users').doc(adminUID).get();
    const adminData = adminUserDoc.data();

    const bossUserData = {
      email: 'cobandoa@ice.go.cr',
      displayName: 'Obando Arguedas Carlos',
      role: 'admin',
      active: true,
      ...adminData, // Copiar todo lo demás
      createdAt: adminData.createdAt, // Mantener fecha original
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(bossUID).set(bossUserData);
    console.log('✅ Datos de usuario copiados\n');

    // 2. Copiar preferencias de configuración
    console.log('⚙️  Copiando configuraciones...');
    const configCollections = ['preferences', 'settings', 'customization'];

    for (const collectionName of configCollections) {
      try {
        const snapshot = await db.collection(`users/${adminUID}/${collectionName}`).get();
        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.forEach(doc => {
            const newDocRef = db.collection(`users/${bossUID}/${collectionName}`).doc(doc.id);
            batch.set(newDocRef, doc.data());
          });
          await batch.commit();
          console.log(`  ✅ ${collectionName}: ${snapshot.size} documentos copiados`);
        }
      } catch (error) {
        console.log(`  ℹ️  ${collectionName}: no encontrado (normal)`);
      }
    }

    console.log('\n✅ Perfil completo copiado exitosamente\n');

    console.log('=' .repeat(50));
    console.log('📋 RESUMEN');
    console.log('=' .repeat(50));
    console.log(`Email:   cobandoa@ice.go.cr`);
    console.log(`Nombre:  Obando Arguedas Carlos`);
    console.log(`Rol:     admin`);
    console.log(`UID:     ${bossUID}`);
    console.log(`Estado:  ✅ Listo para usar`);
    console.log('=' .repeat(50));
    console.log('\n✅ ¡Perfil listo! Carlos tiene ahora tu configuración completa.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Ejecutar
copyProfile();
