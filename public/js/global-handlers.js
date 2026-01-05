// Funciones globales para el módulo de ventas

// Mostrar mensaje en la UI
function showSalesNotification(message, type) {
    const box = document.getElementById('salesMessage');
    if (box) {
        box.textContent = message;
        box.className = 'message ' + type;
        box.style.display = 'block';
        setTimeout(() => { box.style.display = 'none'; }, 4000);
    }
}

// GUARDAR META ANUAL
window.setAnnualMeta = async function() {
    const input = document.getElementById('annualMetaInput');
    const btn = event && event.target;
    
    if (!input || !input.value) {
        showSalesNotification('Ingresa un valor para la meta', 'error');
        return;
    }
    
    const metaValue = parseInt(input.value);
    if (isNaN(metaValue) || metaValue < 1) {
        showSalesNotification('La meta debe ser un número mayor a 0', 'error');
        return;
    }
    
    // Verificar si salesTracking está listo
    if (!window.salesTracking) {
        showSalesNotification('Espera un momento, el sistema está cargando...', 'error');
        return;
    }
    
    // Deshabilitar botón mientras guarda
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }
    
    try {
        const success = await window.salesTracking.setUserMeta(metaValue);
        
        if (success) {
            showSalesNotification('✅ Meta guardada: ' + metaValue + ' ventas para el año', 'success');
            // Actualizar métricas en pantalla
            if (window.updateSalesMetrics) {
                await window.updateSalesMetrics();
            }
        } else {
            showSalesNotification('Error al guardar la meta', 'error');
        }
    } catch (err) {
        console.error('Error guardando meta:', err);
        showSalesNotification('Error: ' + err.message, 'error');
    }
    
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
};

// TOGGLE CAMPOS DE DISPOSITIVO
window.toggleDeviceFields = function() {
    if (window.updateDeviceFieldsVisibility) {
        window.updateDeviceFieldsVisibility();
    }
};

// COMPLETAR VENTA
window.completeSaleHandler = async function(saleId) {
    if (!window.salesTracking) {
        showSalesNotification('Sistema no listo', 'error');
        return;
    }
    
    try {
        const success = await window.salesTracking.completeSale(saleId);
        if (success) {
            showSalesNotification('✅ Venta completada', 'success');
            if (window.updateSalesMetrics) await window.updateSalesMetrics();
            if (window.renderSalesList) await window.renderSalesList();
            // 🔔 Actualizar la campanita de notificaciones
            if (window.updateNotificationBadge) await window.updateNotificationBadge();
        } else {
            showSalesNotification('Error al completar', 'error');
        }
    } catch (err) {
        showSalesNotification('Error: ' + err.message, 'error');
    }
};
