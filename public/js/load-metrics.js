/**
 * Función de carga de métricas - Expuesta globalmente
 * Este archivo NO es módulo para que sea accesible directamente desde window
 */

window.loadMetricsData = async function() {
    try {
        console.log('🔄 Cargando métricas de VENTAS...');
        document.getElementById('metricsLoading').style.display = 'block';
        document.getElementById('metricsContent').style.display = 'none';

        // Esperar a que auth esté disponible
        let user = null;
        let attempts = 0;
        while (!user && attempts < 50) {
            user = window.auth ? window.auth.currentUser : null;
            if (!user) {
                await new Promise(r => setTimeout(r, 100));
            }
            attempts++;
        }

        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        // Esperar a que db esté disponible
        attempts = 0;
        while (!window.db && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!window.db) {
            throw new Error('Firestore no disponible');
        }

        const salesSnapshot = await window.db.collection('pedidos_ventas')
            .where('executiveId', '==', user.uid)
            .where('status', '==', 'COMPLETADA')
            .get();

        const sales = [];
        salesSnapshot.forEach(doc => {
            sales.push(doc.data());
        });

        // Obtener meta
        const metaSnap = await window.db.collection('metas_ventas_anuales').doc(user.uid).get();
        const meta = metaSnap.exists ? metaSnap.data() : null;

        // Calcular segmentos
        const segments = {};
        sales.forEach(sale => {
            const segment = sale.clientSegment || 'SIN SEGMENTO';
            segments[segment] = (segments[segment] || 0) + 1;
        });

        // Mostrar resultados
        document.getElementById('metricsLoading').style.display = 'none';
        document.getElementById('metricsContent').style.display = 'block';

        // Estadísticas
        const statsHtml = `
            <div class="stat-card">
                <h3>Total Ventas</h3>
                <div class="stat-value">${sales.length}</div>
            </div>
            <div class="stat-card">
                <h3>Meta Anual</h3>
                <div class="stat-value">${meta?.annualGoal || 'Sin establecer'}</div>
            </div>
            <div class="stat-card">
                <h3>Progreso</h3>
                <div class="stat-value">${meta ? Math.round((sales.length / meta.annualGoal) * 100) : 0}%</div>
            </div>
        `;

        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = statsHtml;
        }

        console.log('✅ Métricas cargadas correctamente');

    } catch (error) {
        console.error('❌ Error cargando métricas:', error);
        document.getElementById('metricsLoading').style.display = 'none';
        const content = document.getElementById('metricsContent');
        if (content) {
            content.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            content.style.display = 'block';
        }
    }
};
