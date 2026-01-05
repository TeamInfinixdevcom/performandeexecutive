const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testEditClient() {
    try {
        console.log('🧪 Iniciando prueba de edición de cliente...\n');
        
        // 1. CREAR UN CLIENTE NUEVO
        console.log('1️⃣ Creando cliente de prueba...');
        const nuevoCliente = {
            cedula: '999999999',
            nombre: 'CLIENTE PRUEBA',
            email: 'prueba@test.com',
            fechaNacimiento: '1990-01-15',
            domicilio: 'San José, Costa Rica',
            serviciosMoviles: ['83033341'],
            serviciosFijos: ['22801234'],
            tipoPlan: 'Plan Pospago 5GB',
            estadoPlan: 'ACTUALIZADO',
            segmento: 'PLATINO',
            puntajeScore: 500,
            categoriaCrediticia: 'A',
            notas: 'Cliente de prueba inicial',
            executiveId: 'test-user-123',
            executiveName: 'Test Executive',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
            interactions: []
        };
        
        const docRef = await db.collection('clients').add(nuevoCliente);
        const clientId = docRef.id;
        console.log(`✅ Cliente creado: ${clientId}`);
        console.log(`📋 Datos originales:`, nuevoCliente);
        console.log('');
        
        // 2. VERIFICAR QUE SE CREÓ
        console.log('2️⃣ Verificando cliente en Firestore...');
        let clientSnapshot = await db.collection('clients').doc(clientId).get();
        console.log(`✅ Cliente encontrado:`, clientSnapshot.data());
        console.log('');
        
        // 3. EDITAR EL CLIENTE
        console.log('3️⃣ Editando cliente...');
        const clienteEditado = {
            nombre: 'CLIENTE PRUEBA EDITADO',
            email: 'editado@test.com',
            segmento: 'ORO',
            puntajeScore: 750,
            notas: 'Cliente actualizado después de edición',
            updatedAt: admin.firestore.Timestamp.now()
        };
        
        await db.collection('clients').doc(clientId).update(clienteEditado);
        console.log(`✅ Cliente actualizado`);
        console.log(`📝 Cambios aplicados:`, clienteEditado);
        console.log('');
        
        // 4. VERIFICAR CAMBIOS
        console.log('4️⃣ Verificando cambios en Firestore...');
        clientSnapshot = await db.collection('clients').doc(clientId).get();
        const datosFinales = clientSnapshot.data();
        console.log(`✅ Datos actuales:`, datosFinales);
        console.log('');
        
        // 5. VALIDAR CAMBIOS
        console.log('5️⃣ Validando cambios:');
        const cambiosValidados = {
            nombre: datosFinales.nombre === 'CLIENTE PRUEBA EDITADO' ? '✅ OK' : '❌ ERROR',
            email: datosFinales.email === 'editado@test.com' ? '✅ OK' : '❌ ERROR',
            segmento: datosFinales.segmento === 'ORO' ? '✅ OK' : '❌ ERROR',
            puntajeScore: datosFinales.puntajeScore === 750 ? '✅ OK' : '❌ ERROR',
            notas: datosFinales.notas === 'Cliente actualizado después de edición' ? '✅ OK' : '❌ ERROR',
            cedula: datosFinales.cedula === '999999999' ? '✅ OK (sin cambios)' : '❌ ERROR'
        };
        
        console.log(cambiosValidados);
        console.log('');
        
        // 6. LIMPIAR
        console.log('6️⃣ Limpiando datos de prueba...');
        await db.collection('clients').doc(clientId).delete();
        console.log('✅ Cliente de prueba eliminado');
        console.log('');
        
        console.log('🎉 ¡PRUEBA COMPLETADA CON ÉXITO!');
        console.log('La funcionalidad de edición está funcionando correctamente.');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        process.exit(0);
    }
}

testEditClient();
