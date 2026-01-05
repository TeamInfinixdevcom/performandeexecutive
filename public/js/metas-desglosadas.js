// Gestión de Metas Desglosadas por Categoría

let currentYear = new Date().getFullYear();
let currentSemestre = 1; // Por defecto semestre 1

window.metasCurrentYear = currentYear;
window.metasCurrentSemestre = currentSemestre;

async function loadDesglosadaMetas() {
    console.log('📥 Cargando metas desglosadas...');
    
    try {
        if (!window.db) {
            console.error('window.db no disponible');
            showMetasMessage('Error: Base de datos no disponible', 'error');
            return;
        }
        
        let attempts = 0;
        while (!window.currentUser && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.currentUser) {
            console.error('Usuario no autenticado después de esperar');
            showMetasMessage('Error: Usuario no autenticado', 'error');
            return;
        }
        
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const userId = window.currentUser.uid;
        const metaDocKey = `${userId}_${currentYear}_${currentSemestre}`;
        const metaRef = doc(window.db, 'metas_desglosadas', metaDocKey);
        
        const metaSnap = await getDoc(metaRef);
        
        if (metaSnap.exists()) {
            const data = metaSnap.data();
            console.log('✅ Metas encontradas:', data);
            
            // Cargar metas en los inputs
            if (data.metas) {
                document.getElementById('metaRenovacion').value = data.metas.renovacion || 0;
                document.getElementById('metaServicioNuevo').value = data.metas.servicioNuevo || 0;
                document.getElementById('metaVentaTerminal').value = data.metas.ventaTerminal || 0;
                document.getElementById('metaVentaAccesorio').value = data.metas.ventaAccesorio || 0;
            }
            
            // Mostrar completado
            if (data.completado) {
                document.getElementById('completadoRenovacion').textContent = data.completado.renovacion || 0;
                document.getElementById('completadoServicioNuevo').textContent = data.completado.servicioNuevo || 0;
                document.getElementById('completadoVentaTerminal').textContent = data.completado.ventaTerminal || 0;
                document.getElementById('completadoVentaAccesorio').textContent = data.completado.ventaAccesorio || 0;
            }
            
            showMetasMessage('✅ Metas cargadas exitosamente', 'success');
        } else {
            console.log('ℹ️ No hay metas guardadas aún. Inicializando con valores por defecto...');
            // Inicializar con valores por defecto
            document.getElementById('metaRenovacion').value = 500;
            document.getElementById('metaServicioNuevo').value = 500;
            document.getElementById('metaVentaTerminal').value = 500;
            document.getElementById('metaVentaAccesorio').value = 500;
            showMetasMessage('ℹ️ Se cargaron metas por defecto (500 unidades c/u)', 'info');
        }

        if (window.updateSalesMetaSummary) {
            window.updateSalesMetaSummary();
        }
    } catch (error) {
        console.error('❌ Error cargando metas desglosadas:', error);
        showMetasMessage('Error: ' + error.message, 'error');
    }
}

async function saveDesglosadaMetas() {
    console.log('💾 Guardando metas desglosadas...');
    
    try {
        if (!window.db) {
            throw new Error('Base de datos no disponible');
        }
        
        let attempts = 0;
        while (!window.currentUser && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.currentUser) {
            throw new Error('Usuario no autenticado. Por favor recarga la página.');
        }
        
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const userId = window.currentUser.uid;
        const metaDocKey = `${userId}_${currentYear}_${currentSemestre}`;
        const metaRef = doc(window.db, 'metas_desglosadas', metaDocKey);
        
        // Obtener valores de los inputs
        const nuevasMetas = {
            renovacion: parseInt(document.getElementById('metaRenovacion').value) || 0,
            servicioNuevo: parseInt(document.getElementById('metaServicioNuevo').value) || 0,
            ventaTerminal: parseInt(document.getElementById('metaVentaTerminal').value) || 0,
            ventaAccesorio: parseInt(document.getElementById('metaVentaAccesorio').value) || 0
        };
        
        // Validar que haya al menos una meta
        const totalMeta = Object.values(nuevasMetas).reduce((a, b) => a + b, 0);
        if (totalMeta === 0) {
            showMetasMessage('Error: Debes ingresar al menos una meta', 'error');
            return;
        }
        
        // Guardar en Firestore
        await setDoc(metaRef, {
            executiveId: userId,
            year: currentYear,
            semestre: currentSemestre,
            metas: nuevasMetas,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Metas guardadas exitosamente:', nuevasMetas);
        showMetasMessage('✅ Metas guardadas exitosamente', 'success');

        if (window.updateSalesMetaSummary) {
            window.updateSalesMetaSummary();
        }
    } catch (error) {
        console.error('❌ Error guardando metas:', error);
        showMetasMessage('Error: ' + error.message, 'error');
    }
}

async function updateDesglosadaCompletado() {
    console.log('🔄 Actualizando contadores de completado...');
    
    try {
        if (!window.salesTracking) {
            console.warn('⚠️ salesTracking no disponible aún');
            return;
        }
        
        let attempts = 0;
        while (!window.currentUser && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.currentUser) {
            console.error('Usuario no autenticado');
            return;
        }
        
        const userId = window.currentUser.uid;
        
        // Llamar al método de salesTracking para actualizar contadores
        await window.salesTracking.updateCompletadoCounts(userId, currentYear, currentSemestre);
        
        // Recargar valores en la UI
        await loadDesglosadaMetas();
        
    } catch (error) {
        console.error('❌ Error actualizando completado:', error);
    }
}

function showMetasMessage(message, type) {
    let messageEl = document.getElementById('salesMessage');
    
    // Si no existe, crearlo dinámicamente
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'salesMessage';
        messageEl.style.cssText = 'margin: 15px 0; padding: 12px; border-radius: 4px; font-weight: 600;';
        
        // Insertarlo antes de la sección de metas
        const metasSection = document.querySelector('[style*="background: #e3f2fd"]');
        if (metasSection && metasSection.parentNode) {
            metasSection.parentNode.insertBefore(messageEl, metasSection);
        } else {
            // Fallback: agregarlo al body
            document.body.appendChild(messageEl);
        }
    }
    
    messageEl.textContent = message;
    messageEl.className = 'message ' + type;
    
    // Estilos según tipo
    if (type === 'success') {
        messageEl.style.background = '#d4edda';
        messageEl.style.color = '#155724';
        messageEl.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageEl.style.background = '#f8d7da';
        messageEl.style.color = '#721c24';
        messageEl.style.border = '1px solid #f5c6cb';
    } else {
        messageEl.style.background = '#d1ecf1';
        messageEl.style.color = '#0c5460';
        messageEl.style.border = '1px solid #bee5eb';
    }
    
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
}

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando módulo de metas desglosadas...');
    
    // Esperar a que el usuario esté autenticado y salesTracking esté disponible
    const checkInit = async () => {
        if (window.currentUser && window.salesTracking) {
            console.log('✅ Módulo de metas desglosadas listo');
            await loadDesglosadaMetas();
        } else {
            setTimeout(checkInit, 500);
        }
    };
    
    checkInit();
});

// Exportar funciones para uso global
window.loadDesglosadaMetas = loadDesglosadaMetas;
window.saveDesglosadaMetas = saveDesglosadaMetas;
window.updateDesglosadaCompletado = updateDesglosadaCompletado;
