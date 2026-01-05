const admin = require('firebase-admin');

// Cargar credenciales
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function initMetasDesglosadas() {
  try {
    console.log('\n🔧 INICIALIZANDO METAS DESGLOSADAS');
    console.log('=====================================\n');

    // Obtener todos los usuarios
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No hay usuarios en la BD');
      process.exit(1);
    }

    let contador = 0;

    // Para cada usuario, crear su documento de metas desglosadas
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`👤 Procesando usuario: ${userData.email}`);

      // Crear documento de metas para semestre 1 de 2025
      const metasRef = db.collection('metas_desglosadas').doc(`${userId}_2025_1`);
      
      await metasRef.set({
        executiveId: userId,
        executiveEmail: userData.email,
        year: 2025,
        semestre: 1,
        
        // METAS (objetivos a cumplir)
        metas: {
          renovacion: 500,
          servicioNuevo: 500,
          ventaTerminal: 500,
          ventaAccesorio: 500
        },
        
        // COMPLETADO (lo que ya cumplieron)
        completado: {
          renovacion: 0,
          servicioNuevo: 0,
          ventaTerminal: 0,
          ventaAccesorio: 0
        },
        
        // METADATA
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`   ✅ Metas inicializadas para ${userData.email}`);
      contador++;
    }

    console.log('\n=====================================');
    console.log(`✅ Se inicializaron ${contador} documentos de metas`);
    console.log('=====================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initMetasDesglosadas();
