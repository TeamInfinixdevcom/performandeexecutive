// Dashboard de Progreso Categórico - VERSIÓN CORREGIDA
// Cuenta las ventas COMPLETADAS directamente de Firestore

async function initCategoricalDashboard() {
    console.log('📊 Inicializando dashboard categórico...');
    
    try {
        let attempts = 0;
        while ((!window.db || !window.currentUser) && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.db || !window.currentUser) {
            console.error('❌ DB o usuario no disponible');
            return;
        }
        
        console.log('✅ Dashboard categórico listo');
        await renderCategoricalProgress();
        
    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
    }
}

async function renderCategoricalProgress() {
    console.log('🎨 Renderizando progreso categórico...');
    
    try {
        if (!window.db) {
            console.error('window.db no disponible');
            return;
        }
        
        let attempts = 0;
        while (!window.currentUser && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.currentUser) {
            console.error('Usuario no autenticado después de esperar');
            return;
        }
        
        const { doc, getDoc, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const userId = window.currentUser.uid;
        const year = new Date().getFullYear();
        const semestre = 1;
        const metaDocKey = `${userId}_${year}_${semestre}`;
        
        // 1. Obtener las METAS configuradas
        const metaRef = doc(window.db, 'metas_desglosadas', metaDocKey);
        const metaSnap = await getDoc(metaRef);
        
        let metas = { renovacion: 0, servicioNuevo: 0, ventaTerminal: 0, ventaAccesorio: 0 };
        
        if (metaSnap.exists()) {
            const metaData = metaSnap.data();
            metas = metaData.metas || metas;
        }
        
        // 2. Contar VENTAS COMPLETADAS directamente de Firestore
        const salesQuery = query(
            collection(window.db, 'pedidos_ventas'),
            where('executiveId', '==', userId),
            where('status', '==', 'COMPLETADA')
        );
        
        const salesSnapshot = await getDocs(salesQuery);
        
        // Contar por categoría
        const completado = { renovacion: 0, servicioNuevo: 0, ventaTerminal: 0, ventaAccesorio: 0 };
        
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            const categories = sale.categories || [];
            
            // Contar cada categoría presente en la venta
            if (categories.includes('renovacion')) completado.renovacion++;
            if (categories.includes('servicioNuevo')) completado.servicioNuevo++;
            if (categories.includes('ventaTerminal')) completado.ventaTerminal++;
            if (categories.includes('ventaAccesorio')) completado.ventaAccesorio++;
        });
        
        console.log('📊 Metas:', metas);
        console.log('✅ Completado (contado de ventas):', completado);
        
        // 3. Actualizar los contadores en la UI de metas
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        
        updateElement('completadoRenovacion', completado.renovacion);
        updateElement('completadoServicioNuevo', completado.servicioNuevo);
        updateElement('completadoVentaTerminal', completado.ventaTerminal);
        updateElement('completadoVentaAccesorio', completado.ventaAccesorio);
        
        // 4. Renderizar tarjetas de progreso
        const container = document.getElementById('categoricalProgressContainer');
        if (!container) {
            console.warn('⚠️ No se encontró #categoricalProgressContainer');
            return;
        }
        
        const categories = [
            { key: 'renovacion', label: '🔄 Renovación', color: '#4CAF50', bgColor: '#E8F5E9' },
            { key: 'servicioNuevo', label: '🆕 Servicio Nuevo', color: '#2196F3', bgColor: '#E3F2FD' },
            { key: 'ventaTerminal', label: '📱 Venta Terminal', color: '#FF9800', bgColor: '#FFF3E0' },
            { key: 'ventaAccesorio', label: '📦 Venta Accesorio', color: '#9C27B0', bgColor: '#F3E5F5' }
        ];
        
        let cardsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">';
        
        categories.forEach(cat => {
            const meta = metas[cat.key] || 0;
            const comp = completado[cat.key] || 0;
            const percentage = meta > 0 ? Math.round((comp / meta) * 100) : 0;
            const remaining = Math.max(0, meta - comp);
            
            cardsHtml += `
                <div style="background: ${cat.bgColor}; padding: 20px; border-radius: 10px; border-left: 6px solid ${cat.color}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; color: ${cat.color}; font-size: 16px;">${cat.label}</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 14px; color: #666;">Progreso</span>
                            <span style="font-weight: bold; color: ${cat.color};">${Math.min(percentage, 100)}%</span>
                        </div>
                        <div style="background: #ddd; border-radius: 8px; height: 12px; overflow: hidden;">
                            <div style="background: ${cat.color}; height: 100%; width: ${Math.min(percentage, 100)}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    
                    <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: ${cat.color};">${comp}</div>
                                <div style="font-size: 12px; color: #999;">Completado</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: bold; color: #999;">${meta}</div>
                                <div style="font-size: 12px; color: #999;">Meta</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="font-size: 13px; color: #666;">
                        ${remaining > 0 ? `Faltan: <strong>${remaining}</strong> unidades` : '<strong style="color: #4CAF50;">✅ ¡Meta alcanzada!</strong>'}
                    </div>
                </div>
            `;
        });
        
        cardsHtml += '</div>';
        
        // 5. Resumen total
        const totalMeta = Object.values(metas).reduce((a, b) => a + b, 0);
        const totalCompletado = Object.values(completado).reduce((a, b) => a + b, 0);
        const totalPercentage = totalMeta > 0 ? Math.round((totalCompletado / totalMeta) * 100) : 0;
        
        const summaryHtml = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(102,126,234,0.3);">
                <h2 style="margin: 0 0 15px 0; font-size: 20px;">📊 Resumen General - Semestre ${semestre} / ${year}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div>
                        <div style="font-size: 28px; font-weight: bold;">${totalCompletado}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Ventas Completadas</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; font-weight: bold;">${totalMeta}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Meta Total</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; font-weight: bold;">${Math.min(totalPercentage, 100)}%</div>
                        <div style="font-size: 12px; opacity: 0.9;">Progreso General</div>
                    </div>
                    <div>
                        <div style="font-size: 28px; font-weight: bold;">${Math.max(0, totalMeta - totalCompletado)}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Faltantes</div>
                    </div>
                </div>
                <div style="margin-top: 15px; background: rgba(255,255,255,0.2); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="background: white; height: 100%; width: ${Math.min(totalPercentage, 100)}%; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = summaryHtml + cardsHtml;
        console.log('✅ Dashboard categórico renderizado correctamente');
        
    } catch (error) {
        console.error('❌ Error renderizando progreso:', error);
        const container = document.getElementById('categoricalProgressContainer');
        if (container) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #f44336; background: #ffebee; border-radius: 8px;">
                    <strong>⚠️ Error cargando dashboard</strong><br>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
}

// Función para actualizar dashboard (se ejecuta automáticamente)
async function refreshCategoricalDashboard() {
    console.log('🔄 Actualizando dashboard...');
    await renderCategoricalProgress();
}

// Auto-inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', async function() {
    // Esperar un poco para que auth se inicialice
    setTimeout(async () => {
        await initCategoricalDashboard();
    }, 1000);
});

// Detectar cuando se cambia a la pestaña de Metas - Auto actualizar
window.addEventListener('load', function() {
    const metasTab = document.querySelector('[onclick*="switchTab(\'metas\')"]');
    if (metasTab) {
        metasTab.addEventListener('click', async function() {
            console.log('📊 Pestaña Metas activada, actualizando...');
            setTimeout(async () => {
                await renderCategoricalProgress();
            }, 300);
        });
    }
});

// Exportar funciones
window.renderCategoricalProgress = renderCategoricalProgress;
window.initCategoricalDashboard = initCategoricalDashboard;
window.refreshCategoricalDashboard = refreshCategoricalDashboard;
