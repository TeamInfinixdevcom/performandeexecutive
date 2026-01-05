/**
 * Script para agregar 10 ventas de prueba
 */

const admin = require('firebase-admin');

// Usar las credenciales del archivo JSON
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addTestSales() {
    try {
        // ID del usuario actual (reemplazar con tu UID real)
        const userId = 'yF8fwbUQrpXX1ofUMyvQMHmBgNI3'; // Cambiar esto por tu UID
        
        const testSales = [
            { orderNumber: 'KO-5228571', clientName: 'JUAN PEREZ', cedula: '109460100', type: 'KOMERCIAL' },
            { orderNumber: 'KO-5228572', clientName: 'MARIA GARCIA', cedula: '109460101', type: 'KOMERCIAL', hasDevice: true, deviceType: 'TELEFONO', deviceIMEI: '123456789' },
            { orderNumber: 'SB-5228573', clientName: 'CARLOS LOPEZ', cedula: '109460102', type: 'SIEBEL' },
            { orderNumber: 'KO-5228574', clientName: 'ANA MARTINEZ', cedula: '109460103', type: 'KOMERCIAL', hasDevice: true, deviceType: 'ACCESORIO', deviceIMEI: 'SN123456' },
            { orderNumber: 'KO-5228575', clientName: 'LUIS SANCHEZ', cedula: '109460104', type: 'KOMERCIAL' },
            { orderNumber: 'SB-5228576', clientName: 'SOFIA TORRES', cedula: '109460105', type: 'SIEBEL', hasDevice: true, deviceType: 'TELEFONO', deviceIMEI: '987654321' },
            { orderNumber: 'KO-5228577', clientName: 'DAVID ROJAS', cedula: '109460106', type: 'KOMERCIAL' },
            { orderNumber: 'KO-5228578', clientName: 'LAURA FERNANDEZ', cedula: '109460107', type: 'KOMERCIAL', hasDevice: true, deviceType: 'TELEFONO', deviceIMEI: '111111111' },
            { orderNumber: 'SB-5228579', clientName: 'PABLO DIAZ', cedula: '109460108', type: 'SIEBEL' },
            { orderNumber: 'KO-5228580', clientName: 'ELENA RUIZ', cedula: '109460109', type: 'KOMERCIAL', hasDevice: true, deviceType: 'ACCESORIO', deviceIMEI: 'SN789456' }
        ];

        const currentYear = new Date().getFullYear();
        let count = 0;

        for (const sale of testSales) {
            const saleDoc = {
                ...sale,
                executiveId: userId,
                executiveEmail: 'test@example.com',
                status: 'PENDIENTE',
                year: currentYear,
                registeredAt: new Date().toISOString(),
                completedAt: null,
                hasDevice: sale.hasDevice || false,
                deviceType: sale.deviceType || null,
                deviceIMEI: sale.deviceIMEI || null
            };

            await db.collection('pedidos_ventas').add(saleDoc);
            count++;
            console.log(`✅ Venta ${count} agregada: ${sale.orderNumber}`);
        }

        console.log(`\n✅ Se agregaron ${count} ventas de prueba correctamente`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al agregar ventas:', error);
        process.exit(1);
    }
}

addTestSales();
