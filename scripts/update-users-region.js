/**
 * SCRIPT PARA ACTUALIZAR REGIÓN DE USUARIOS
 */

const admin = require('firebase-admin');
const serviceAccount = require('../executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Mapeo de usuarios a región
const userRegionMap = {
  'AWJFrsMkvxMTj1HVGsIr5NdBykE2': 'EJECUTIVOS',  // cobandoa@ice.go.cr - Carlos Obando Arguedas (Admin Jefatura)
  'T8OdsUAbGNfGT4PouAMb6HGePxH2': 'EJECUTIVOS',  // cnajera@ice.go.cr - Cristian Najera Picado
  'pl2gw8PWCwc6AWI78WhHhqh1ixJ3': 'EJECUTIVOS',  // cmarquez@ice.go.cr - Cristian Márquez Bahamondes
  'sxwWAlBkeJNuDMu9WL6MS82Ak0l1': 'EJECUTIVOS',  // mmendozas@ice.go.cr - Melitza Mendoza Solano
  'yF8fwbUQFpXXlOfUMyvQmHmBgNI3': 'EJECUTIVOS'   // rmadrigalj@ice.go.cr - Ruben Madrigal Jimenez (Admin/Dueño)
};

async function updateUsersRegion() {
  try {
    console.log('\n🔄 ACTUALIZANDO REGIÓN DE USUARIOS:\n');

    const usersSnapshot = await db.collection('users').get();
    let updated = 0;
    let notFound = 0;

    for (const doc of usersSnapshot.docs) {
      const user = doc.data();
      const uid = doc.id;
      const email = user.email || '';
      const region = userRegionMap[uid];

      if (region) {
        await db.collection('users').doc(uid).update({ region });
        console.log(`✅ ${email} (${uid}) → ${region}`);
        updated++;
      } else {
        console.log(`⚠️ ${email} (${uid}) NO ENCONTRADO EN MAPEO`);
        notFound++;
      }
    }

    console.log(`\n📊 Resumen: ${updated} actualizados, ${notFound} no encontrados\n`);
    process.exit(0);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

updateUsersRegion();
