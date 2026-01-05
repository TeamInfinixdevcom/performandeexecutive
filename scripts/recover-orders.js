#!/usr/bin/env node

/**
 * Recover Orders Script
 * Verifica y recupera todos los pedidos en Firestore
 * Uso: node recover-orders.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://executiveperformancek-fd430.firebaseio.com'
});

const db = admin.firestore();

async function recoverOrders() {
    console.log('\n🔍 BUSCANDO PEDIDOS EN FIRESTORE\n');
    
    try {
        // Get all orders
        const ordersSnapshot = await db.collection('orders').get();
        
        console.log(`📊 Total de pedidos encontrados: ${ordersSnapshot.size}\n`);
        
        if (ordersSnapshot.size === 0) {
            console.log('❌ No hay pedidos registrados en la base de datos');
            await admin.app().delete();
            return;
        }
        
        // Group by user
        const ordersByUser = {};
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const userId = order.userId || 'UNKNOWN';
            
            if (!ordersByUser[userId]) {
                ordersByUser[userId] = [];
            }
            
            ordersByUser[userId].push({
                id: doc.id,
                ...order
            });
        });
        
        // Display orders by user
        for (const [userId, orders] of Object.entries(ordersByUser)) {
            console.log(`\n👤 Usuario: ${userId}`);
            console.log(`   Total: ${orders.length} pedido(s)`);
            
            const pending = orders.filter(o => o.status === 'PENDIENTE').length;
            const sent = orders.filter(o => o.status === 'ENVIADO').length;
            
            console.log(`   - Pendientes: ${pending}`);
            console.log(`   - Enviados: ${sent}`);
            
            console.log('\n   📋 Detalle de pedidos:');
            orders.forEach((order, idx) => {
                const date = new Date(order.createdAt || order.timestamp).toLocaleDateString('es-CO');
                const time = new Date(order.createdAt || order.timestamp).toLocaleTimeString('es-CO');
                const status = order.status === 'PENDIENTE' ? '⏳' : '✅';
                
                console.log(`   ${idx + 1}. ${status} [${order.id}]`);
                console.log(`      Número: ${order.orderNumber || 'N/A'}`);
                console.log(`      IMEI: ${order.imei || 'N/A'}`);
                console.log(`      Tipo: ${order.type || 'N/A'}`);
                console.log(`      Cliente: ${order.client || 'N/A'}`);
                console.log(`      Estado: ${order.status}`);
                console.log(`      Fecha: ${date} ${time}`);
                console.log(`      Recordatorios: ${order.reminderCount || 0}`);
            });
        }
        
        // Summary
        console.log('\n\n📈 RESUMEN GENERAL:');
        console.log(`Total de usuarios: ${Object.keys(ordersByUser).length}`);
        console.log(`Total de pedidos: ${ordersSnapshot.size}`);
        console.log(`Total pendientes: ${Array.from(Object.values(ordersByUser)).flat().filter(o => o.status === 'PENDIENTE').length}`);
        console.log(`Total enviados: ${Array.from(Object.values(ordersByUser)).flat().filter(o => o.status === 'ENVIADO').length}`);
        
        // Export to JSON
        const exportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalUsers: Object.keys(ordersByUser).length,
                totalOrders: ordersSnapshot.size,
                pendingOrders: Array.from(Object.values(ordersByUser)).flat().filter(o => o.status === 'PENDIENTE').length,
                sentOrders: Array.from(Object.values(ordersByUser)).flat().filter(o => o.status === 'ENVIADO').length
            },
            orders: ordersByUser
        };
        
        const fs = require('fs');
        const filename = `orders-export-${new Date().getTime()}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        console.log(`\n✅ Datos exportados a: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await admin.app().delete();
        console.log('\n✅ Proceso completado\n');
    }
}

// Run
recoverOrders();
