/**
 * Elimina todas las ventas (móvil y hogar) EXCEPTO las del UID permitido.
 * Uso:
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\serviceAccount.json
 *   node scripts/delete-non-cnajera-sales.js
 * Ajusta ALLOWED_UID antes de ejecutar.
 */

const admin = require('firebase-admin');

// UID real de Cristian Najera
const ALLOWED_UID = 'T8OdsUAbGNfGT4PouAMb6HGePxH2';
const BATCH_SIZE = 300; // tamaño de lote para deletes
const DRY_RUN = false; // a true para ver qué borraría sin borrar

function init() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  return admin.firestore();
}

async function deleteCollectionExceptUid(db, collectionName) {
  console.log(`\n📂 Procesando colección ${collectionName} (excluyendo UID ${ALLOWED_UID})`);
  let totalDeleted = 0;
  let lastDoc = null;
  let page = 0;

  while (true) {
    page += 1;
    let query = db.collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc.id);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const uid = data.uid || null;
      const keep = uid === ALLOWED_UID;
      if (!keep) {
        if (!DRY_RUN) batch.delete(doc.ref);
        batchCount += 1;
      }
    });

    if (batchCount > 0 && !DRY_RUN) {
      await batch.commit();
      totalDeleted += batchCount;
    }

    const last = snapshot.docs[snapshot.docs.length - 1];
    lastDoc = last;
    console.log(`📄 Página ${page}: leídos ${snapshot.size}, eliminados ${batchCount}, último doc=${last.id}`);

    if (snapshot.size < BATCH_SIZE) break;
  }

  console.log(`✅ ${collectionName}: eliminados totales ${totalDeleted}${DRY_RUN ? ' (DRY RUN)' : ''}`);
}

(async () => {
  if (ALLOWED_UID === 'REEMPLAZA_CON_UID_DE_CNAJERA') {
    console.error('❌ Debes configurar ALLOWED_UID con el UID real de Cristian Najera.');
    process.exit(1);
  }

  const db = init();
  try {
    await deleteCollectionExceptUid(db, 'ventas');
    await deleteCollectionExceptUid(db, 'ventas_hogar');
    console.log('🎉 Limpieza completada');
  } catch (err) {
    console.error('❌ Error en la limpieza:', err);
    process.exit(1);
  }
})();
