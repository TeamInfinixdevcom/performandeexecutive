/**
 * SCRIPT PARA ACTUALIZAR ESTADO DE CLIENTE ESPECÍFICO
 * Marcar cliente como exitoso y generar venta
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();

async function updateClientToExitoso() {
  try {
    console.log('🔍 Buscando cliente DESHUEZA DELGADO ALMITRA...');
    
    // Buscar el cliente por nombre
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.where('name', '==', 'DESHUEZA DELGADO ALMITRA').get();
    
    if (snapshot.empty) {
      console.log('❌ Cliente no encontrado con nombre exacto, buscando variaciones...');
      
      // Buscar por fragmentos del nombre
      const allClients = await clientsRef.get();
      let foundClient = null;
      
      allClients.forEach(doc => {
        const client = doc.data();
        const clientName = (client.name || client.nombre || '').toUpperCase();
        
        if (clientName.includes('DESHUEZA') || clientName.includes('DELGADO') || clientName.includes('ALMITRA')) {
          console.log('✅ Cliente encontrado:', doc.id, '-', clientName);
          foundClient = { id: doc.id, data: client };
        }
      });
      
      if (!foundClient) {
        console.log('❌ No se encontró ningún cliente con ese nombre');
        return;
      }
      
      // Actualizar el cliente encontrado
      await updateClientStatus(foundClient.id, foundClient.data);
      
    } else {
      // Cliente encontrado con nombre exacto
      const clientDoc = snapshot.docs[0];
      console.log('✅ Cliente encontrado:', clientDoc.id);
      await updateClientStatus(clientDoc.id, clientDoc.data());
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

async function updateClientStatus(clientId, clientData) {
  try {
    console.log('📝 Actualizando estado del cliente...');
    
    // Actualizar el cliente
    await db.collection('clients').doc(clientId).update({
      estadoPlan: 'EXITOSO',
      estado: 'EXITOSO',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ultimoContacto: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Cliente actualizado a EXITOSO');
    
    // Registrar una venta si no existe
    const ventasRef = db.collection('ventas');
    const existingVenta = await ventasRef.where('clientId', '==', clientId).get();
    
    if (existingVenta.empty) {
      console.log('📊 Registrando nueva venta...');
      
      await ventasRef.add({
        clientId: clientId,
        clientName: clientData.name || clientData.nombre || 'DESHUEZA DELGADO ALMITRA',
        executiveId: clientData.executiveId,
        executiveName: 'Cristian Najera',
        segmento: clientData.segmento || 'BRONCE',
        tipoPlan: clientData.tipoPlan || 'BÁSICO',
        estadoPlan: 'EXITOSO',
        tipoVenta: 'conversion_exitosa',
        monto: 0,
        fechaVenta: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Venta registrada');
    } else {
      console.log('ℹ️ Ya existe una venta para este cliente');
    }
    
    console.log('🎉 Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error actualizando cliente:', error);
  }
}

// Ejecutar
updateClientToExitoso();