/**
 * INICIALIZADOR MAESTRO
 * Controla el orden de carga de todos los módulos
 */

import { auth, db, functions } from './firebase-config.js';
import { SalesTracking } from './sales-tracking.js';

// Exponer globalmente INMEDIATAMENTE
window.auth = auth;
window.db = db;
window.functions = functions;
window.SalesTracking = SalesTracking;

console.log('✅ Firebase inicializado globalmente');
console.log('✅ SalesTracking expuesto en window');

// Esperar autenticación
auth.onAuthStateChanged(async (user) => {
    console.log('🔴 onAuthStateChanged: user =', user?.email);
    
    if (!user) {
        console.log('❌ No hay usuario, redirigiendo a login');
        // window.location.href = 'login.html'; // Comentado porque auth.js se encarga
    } else {
        console.log('✅ Usuario autenticado:', user.email);
        
        // ❌ COMENTADO: Módulos de ventas eliminados con pestaña Metas Ejecutivo
        /*
        // Cargar módulos de ventas SOLO si estamos en index.html
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            try {
                console.log('⏳ Verificando que SalesTracking esté disponible...');
                if (!window.SalesTracking) {
                    throw new Error('SalesTracking no disponible en window');
                }
                console.log('✅ SalesTracking verificado');
                
                // Esperar a que los contenedores de ventas existan en el DOM (nuevos)
                let domAttempts = 0;
                while (!document.getElementById('ventasFormContainer') && domAttempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    domAttempts++;
                }
                if (!document.getElementById('ventasFormContainer')) {
                    console.warn('⚠️ ventasFormContainer no disponible en DOM, continuando de todas formas');
                }
                console.log('✅ Contenedores de ventas detectados');
                
                console.log('⏳ Importando initSalesManagement...');
                const { initSalesManagement } = await import('./sales-management.js?v=20251203_charts_fix');
                console.log('✅ initSalesManagement importado, ejecutando...');
                
                await initSalesManagement(user.uid, user.email);
                console.log('✅ Módulos de ventas cargados correctamente');
            } catch (error) {
                console.error('❌ Error cargando módulos de ventas:', error);
                console.error('Stack:', error.stack);
            }
        }
        */
    }
});
