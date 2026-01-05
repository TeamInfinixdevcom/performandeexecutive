/**
 * SOLUCIÓN TEMPORAL PARA MÉTRICAS
 * 
 * Este archivo carga métricas directamente desde Firestore
 * sin depender de Cloud Functions rotas
 */

import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Función para cargar métricas directamente
const getMetricsDirectly = async () => {
    try {
        // Esperar a que window.db y window.auth estén disponibles (cargados por init-master.js)
        let attempts = 0;
        while (!window.db || !window.auth && attempts < 100) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.db || !window.auth) {
            console.error('❌ window.db o window.auth no disponibles');
            return null;
        }
        
        // Verificar que el usuario esté autenticado
        let user = null;
        attempts = 0;
        while (!user && attempts < 50) {
            user = window.auth.currentUser;
            if (!user) {
                await new Promise(r => setTimeout(r, 100));
            }
            attempts++;
        }
        
        if (!user) {
            console.warn('⚠️ Usuario no autenticado en getMetricsDirectly');
            return null;
        }

        console.log('🔍 Cargando métricas directamente para:', user.email, 'UID:', user.uid);

        // Obtener VENTAS del usuario actual (NO clientes)
        const salesQuery = query(
            collection(window.db, 'pedidos_ventas'),
            where('executiveId', '==', user.uid),
            where('status', '==', 'COMPLETADA')
        );

        const salesSnapshot = await getDocs(salesQuery);
        
        const metrics = {
            total: 0,
            withDevice: 0,
            withoutDevice: 0
        };

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            metrics.total++;
            
            // Un pedido tiene dispositivo si incluye teléfono (terminal) o accesorio
            if (sale.incluyeTelefono === true || 
                sale.incluyeAccesorio === true || 
                (sale.deviceIMEIs && sale.deviceIMEIs.length > 0) ||
                (sale.accesorios && sale.accesorios.length > 0)) {
                metrics.withDevice++;
            } else {
                metrics.withoutDevice++;
            }
        });

        console.log('📊 Métricas calculadas:', metrics);

        // Actualizar la interfaz
        updateMetricsDisplay(metrics);
        
        return metrics;

    } catch (error) {
        console.error('Error cargando métricas:', error);
        return null;
    }
};

// Función para actualizar la visualización de métricas
const updateMetricsDisplay = (metrics) => {
    try {
        // Actualizar tarjetas de métricas
        const updateCard = (id, value) => {
            const element = document.querySelector(`[data-metric="${id}"], #${id}Metric, .metric-${id}`);
            if (element) {
                const valueElement = element.querySelector('.stat-value, .metric-value, .number') || element;
                if (valueElement) {
                    valueElement.textContent = value;
                }
            }
        };

        updateCard('total', metrics.total);
        updateCard('withDevice', metrics.withDevice);
        updateCard('withoutDevice', metrics.withoutDevice);

        // Actualizar elementos específicos del dashboard
        const elementsToUpdate = [
            { selector: '#metricsTotal', value: metrics.total },
            { selector: '#metricsWithDevice', value: metrics.withDevice },
            { selector: '#metricsWithoutDevice', value: metrics.withoutDevice }
        ];

        elementsToUpdate.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                element.textContent = item.value;
            }
        });

        // Actualizar dashboard interno si existe
        if (window.updateDashboardMetrics) {
            window.updateDashboardMetrics(metrics);
        }

        // Los gráficos se manejan por displayMetrics() en index.html
        // No crear gráficos adicionales aquí para evitar conflictos

        console.log('✅ Métricas actualizadas en la interfaz');

    } catch (error) {
        console.error('Error actualizando interfaz de métricas:', error);
    }
};

// Función para crear gráficos directamente
const createDirectCharts = (metrics) => {
    try {
        // Gráfico de dona
        const doughnutCanvas = document.getElementById('segmentChart');
        if (doughnutCanvas) {
            const ctx = doughnutCanvas.getContext('2d');
            
            // Destruir gráfico existente si existe y tiene el método destroy
            if (window.segmentChart && typeof window.segmentChart.destroy === 'function') {
                window.segmentChart.destroy();
            }
            
            window.segmentChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['PLATINO', 'ORO', 'PLATA', 'BRONCE', 'BLACK'],
                    datasets: [{
                        data: [metrics.platino, metrics.oro, metrics.plata, metrics.bronce, metrics.black],
                        backgroundColor: [
                            '#FFD700', // Platino
                            '#FFA500', // Oro  
                            '#C0C0C0', // Plata
                            '#CD7F32', // Bronce
                            '#000000'  // Black
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Gráfico de tendencias (mockup)
        const trendCanvas = document.getElementById('trendChart');
        if (trendCanvas) {
            const ctx = trendCanvas.getContext('2d');
            
            if (window.trendChart) {
                window.trendChart.destroy();
            }
            
            window.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Ventas',
                        data: [metrics.total * 0.6, metrics.total * 0.7, metrics.total * 0.8, metrics.total * 0.9, metrics.total, metrics.total * 1.1],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error creando gráficos:', error);
    }
};

// Función para ejecutar cuando la página esté lista
const initDirectMetrics = () => {
    console.log('🚀 Inicializando métricas directas...');
    
    // Esperar a que el usuario esté autenticado
    console.log('🔥 Firebase inicializado, esperando autenticación...');
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('👤 Usuario autenticado, cargando métricas en 2 segundos...');
            setTimeout(getMetricsDirectly, 2000);
        } else {
            console.log('❌ Usuario no autenticado');
        }
    });
};

// Exportar funciones globalmente para acceso desde otros scripts
window.getMetricsDirectly = getMetricsDirectly;
window.updateMetricsDisplay = updateMetricsDisplay;
window.initDirectMetrics = initDirectMetrics;

// También exportar para imports ES6
export { getMetricsDirectly, updateMetricsDisplay, initDirectMetrics };

// Auto-inicializar si el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDirectMetrics);
} else {
    initDirectMetrics();
}

console.log('✅ Script de métricas directas cargado - VERSIÓN CORREGIDA v20251116003 - SIN ERRORES DE GRÁFICOS');