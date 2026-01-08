let salesListener = null;
let cachedFirestoreModule = null;

const META_CARD_IDS = {
    renovacion: {
        goal: 'metaRenovacionGoalDisplay',
        done: 'metaRenovacionDoneDisplay',
        remaining: 'metaRenovacionRemainingDisplay'
    },
    servicioNuevo: {
        goal: 'metaServicioGoalDisplay',
        done: 'metaServicioDoneDisplay',
        remaining: 'metaServicioRemainingDisplay'
    },
    ventaTerminal: {
        goal: 'metaTerminalGoalDisplay',
        done: 'metaTerminalDoneDisplay',
        remaining: 'metaTerminalRemainingDisplay'
    },
    ventaAccesorio: {
        goal: 'metaAccesorioGoalDisplay',
        done: 'metaAccesorioDoneDisplay',
        remaining: 'metaAccesorioRemainingDisplay'
    }
};

function getCurrentSemestre() {
    const month = new Date().getMonth() + 1;
    return month <= 6 ? 1 : 2;
}

async function getFirestoreModule() {
    if (cachedFirestoreModule) return cachedFirestoreModule;
    if (window.salesTracking && window.salesTracking.firestoreModule) {
        cachedFirestoreModule = window.salesTracking.firestoreModule;
        return cachedFirestoreModule;
    }
    cachedFirestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    return cachedFirestoreModule;
}

function setMetaSummaryMessage(message, type = 'info') {
    const statusEl = document.getElementById('metaSummaryStatus');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'meta-summary-status ' + type;
}

function updateMetaCard(cat, goal, done) {
    const ids = META_CARD_IDS[cat];
    if (!ids) return;
    const remaining = Math.max(0, goal - done);
    const goalEl = document.getElementById(ids.goal);
    const doneEl = document.getElementById(ids.done);
    const remainingEl = document.getElementById(ids.remaining);
    if (goalEl) goalEl.textContent = goal;
    if (doneEl) doneEl.textContent = done;
    if (remainingEl) remainingEl.textContent = remaining;
}

async function updateSalesMetaSummary() {
    const summaryContainer = document.getElementById('salesMetaSummary');
    if (!summaryContainer) {
        return;
    }

    if (!window.salesTracking || !window.db) {
        setMetaSummaryMessage('Esperando datos de ventas...', 'info');
        return;
    }

    try {
        const firestore = await getFirestoreModule();
        const userId = window.salesTracking.userId;
        if (!userId) {
            setMetaSummaryMessage('Usuario no disponible', 'warning');
            return;
        }
        const year = window.metasCurrentYear || new Date().getFullYear();
        let semestre = window.metasCurrentSemestre || 1;
        let docRef = firestore.doc(window.db, 'metas_desglosadas', `${userId}_${year}_${semestre}`);
        let snap = await firestore.getDoc(docRef);

        if (!snap.exists() && semestre !== getCurrentSemestre()) {
            semestre = getCurrentSemestre();
            docRef = firestore.doc(window.db, 'metas_desglosadas', `${userId}_${year}_${semestre}`);
            snap = await firestore.getDoc(docRef);
        }

        if (!snap.exists()) {
            Object.keys(META_CARD_IDS).forEach(cat => updateMetaCard(cat, 0, 0));
            setMetaSummaryMessage('Configura tus metas en la pestaña "Metas Ejecutivo" para ver el progreso aquí.', 'warning');
            return;
        }

        const data = snap.data();
        const metas = data.metas || {};
        const completado = data.completado || {};

        Object.keys(META_CARD_IDS).forEach(cat => {
            updateMetaCard(cat, metas[cat] || 0, completado[cat] || 0);
        });

        setMetaSummaryMessage('Metas sincronizadas con Firestore', 'success');
    } catch (err) {
        console.error('❌ Error sincronizando metas desglosadas:', err);
        setMetaSummaryMessage('Error al sincronizar metas: ' + err.message, 'error');
    }
}

window.updateSalesMetaSummary = updateSalesMetaSummary;

async function initSalesManagement(userId, userEmail) {
    console.log('🔄 Inicializando módulo de ventas...');
    
    try {
        // Esperar a que window.db esté disponible
        let attempts = 0;
        while (!window.db && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (!window.db) {
            throw new Error('window.db no disponible después de 5 segundos');
        }

        console.log('✅ window.db disponible');

        // SalesTracking ya debe estar disponible desde init-master.js
        if (!window.SalesTracking) {
            throw new Error('window.SalesTracking no disponible (debería estar en init-master.js)');
        }
        
        console.log('✅ SalesTracking disponible en window');
        
        // Crear instancia de SalesTracking usando window.SalesTracking
        window.salesTracking = new window.SalesTracking();
        await window.salesTracking.init(userId, userEmail);
        console.log('✅ SalesTracking inicializado para:', userEmail);
        
        // Cargar meta guardada
        const meta = await window.salesTracking.getUserMeta();
        const input = document.getElementById('annualMetaInput');
        if (meta && meta.annualGoal && input) {
            input.value = meta.annualGoal;
            console.log('📊 Meta cargada:', meta.annualGoal);
        }
        
        // Configurar formulario
        setupSalesFormListener();
        
        // Actualizar UI
        console.log('⏳ Actualizando UI...');
        await updateSalesMetrics();
        await renderSalesList();
        
        // Escuchar cambios en tiempo real
        listenToSalesUpdates();
        
        console.log('✅ Módulo de ventas listo');
        
    } catch (error) {
        console.error('❌ Error inicializando ventas:', error);
        console.error('Stack:', error.stack);
    }
}

function updateDeviceFieldsVisibility() {
    const deviceFields = document.getElementById('deviceFields');
    const imeisContainer = document.getElementById('imeisContainer');
    const accesoriosContainer = document.getElementById('accesoriosContainer');
    const incluyeTelefono = document.getElementById('incluyeTelefono');
    const incluyeAccesorio = document.getElementById('incluyeAccesorio');

    if (!deviceFields) {
        console.warn('⚠️ updateDeviceFieldsVisibility: #deviceFields no encontrado');
        return;
    }

    const telefonoChecked = !!(incluyeTelefono && incluyeTelefono.checked);
    const accesorioChecked = !!(incluyeAccesorio && incluyeAccesorio.checked);
    const showDeviceFields = telefonoChecked || accesorioChecked;
    console.log('📱 updateDeviceFieldsVisibility', { showDeviceFields, telefonoChecked, accesorioChecked });

    deviceFields.style.display = showDeviceFields ? 'block' : 'none';
    if (imeisContainer) {
        imeisContainer.style.display = telefonoChecked ? 'block' : 'none';
    }
    if (accesoriosContainer) {
        accesoriosContainer.style.display = accesorioChecked ? 'block' : 'none';
    }
}

// ✅ NUEVA FUNCIÓN: Validar que incluir teléfono/accesorio implica categoría respectiva
function validateDevicesCategoryLink() {
    const incluyeTelefono = document.getElementById('incluyeTelefono');
    const incluyeAccesorio = document.getElementById('incluyeAccesorio');
    const catVentaTerminal = document.getElementById('catVentaTerminal');
    const catVentaAccesorio = document.getElementById('catVentaAccesorio');

    const telefonoChecked = !!(incluyeTelefono && incluyeTelefono.checked);
    const accesorioChecked = !!(incluyeAccesorio && incluyeAccesorio.checked);

    // Si marca teléfono, auto-marcar Terminal
    if (telefonoChecked && catVentaTerminal) {
        if (!catVentaTerminal.checked) {
            console.log('✅ Auto-marcando Venta Terminal por incluir teléfono');
            catVentaTerminal.checked = true;
        }
    }

    // Si marca accesorio, auto-marcar Accesorio
    if (accesorioChecked && catVentaAccesorio) {
        if (!catVentaAccesorio.checked) {
            console.log('✅ Auto-marcando Venta Accesorio por incluir accesorio');
            catVentaAccesorio.checked = true;
        }
    }

    // Si desmarca teléfono, desmarcar Terminal (si es la única razón)
    if (!telefonoChecked && catVentaTerminal && catVentaTerminal.checked) {
        // Solo desmarcar si NO hay otros motivos para Venta Terminal
        console.log('ℹ️ Nota: Venta Terminal sigue marcada, puedes desmarcarlo si deseas');
    }

    // Si desmarca accesorio, desmarcar Accesorio (si es la única razón)
    if (!accesorioChecked && catVentaAccesorio && catVentaAccesorio.checked) {
        console.log('ℹ️ Nota: Venta Accesorio sigue marcada, puedes desmarcarlo si deseas');
    }
}

window.updateDeviceFieldsVisibility = updateDeviceFieldsVisibility;

function setupSalesFormListener() {
    const form = document.getElementById('salesForm');
    if (!form) {
        console.warn('⚠️ setupSalesFormListener: salesForm no encontrado');
        return;
    }

    // Manejar checkboxes de opciones adicionales para mostrar/ocultar campos de dispositivos
    const incluyeTelefono = document.getElementById('incluyeTelefono');
    const incluyeAccesorio = document.getElementById('incluyeAccesorio');

    [incluyeTelefono, incluyeAccesorio].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                updateDeviceFieldsVisibility();
                validateDevicesCategoryLink(); // ✅ Validar linkage
            });
        }
    });
    updateDeviceFieldsVisibility();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orderNumber = document.getElementById('orderNumber').value.trim();
        const type = document.getElementById('orderType').value;
        const clientName = document.getElementById('saleClientName').value.trim();
        const cedula = document.getElementById('saleCedula').value.trim();
        
        // Obtener categorías seleccionadas
        const categories = [];
        const catRenovacion = document.getElementById('catRenovacion');
        const catServicioNuevo = document.getElementById('catServicioNuevo');
        const catVentaTerminal = document.getElementById('catVentaTerminal');
        const catVentaAccesorio = document.getElementById('catVentaAccesorio');
        if (catRenovacion && catRenovacion.checked) categories.push('renovacion');
        if (catServicioNuevo && catServicioNuevo.checked) categories.push('servicioNuevo');
        if (catVentaTerminal && catVentaTerminal.checked) categories.push('ventaTerminal');
        if (catVentaAccesorio && catVentaAccesorio.checked) categories.push('ventaAccesorio');
        
        // Obtener opciones adicionales
        const incluyeLineaPrepagoInput = document.getElementById('incluyeLineaPrepago');
        const incluyeTelefonoInput = document.getElementById('incluyeTelefono');
        const incluyeAccesorioInput = document.getElementById('incluyeAccesorio');
        const incluyeLineaPrepago = !!(incluyeLineaPrepagoInput && incluyeLineaPrepagoInput.checked);
        const incluyeTelefonoVal = !!(incluyeTelefonoInput && incluyeTelefonoInput.checked);
        const incluyeAccesorioVal = !!(incluyeAccesorioInput && incluyeAccesorioInput.checked);
        
        // Recolectar múltiples IMEIs
        let deviceIMEIs = [];
        if (incluyeTelefonoVal) {
            const imeiInputs = document.querySelectorAll('.imei-input');
            imeiInputs.forEach(input => {
                const val = input.value.trim();
                if (val) deviceIMEIs.push(val);
            });
        }
        
        // Recolectar múltiples accesorios
        let accesorios = [];
        if (incluyeAccesorioVal) {
            const accesorioInputs = document.querySelectorAll('.accesorio-input');
            accesorioInputs.forEach(input => {
                const val = input.value.trim();
                if (val) accesorios.push(val);
            });
        }

        // Validaciones
        if (!orderNumber || !type || !clientName || !cedula) {
            showSalesMessage('Todos los campos básicos son requeridos (Pedido, Sistema, Cliente, Cédula)', 'error');
            return;
        }
        
        if (categories.length === 0) {
            showSalesMessage('Debes seleccionar al menos una categoría de venta', 'error');
            return;
        }

        // ✅ NUEVA VALIDACIÓN: Trazabilidad de Teléfono/Accesorio
        if (incluyeTelefonoVal && !categories.includes('ventaTerminal')) {
            showSalesMessage('⚠️ Si incluyes TELÉFONO, debes marcar "Venta de Terminal" para mantener trazabilidad', 'error');
            console.warn('❌ Validación fallida: Teléfono sin Venta Terminal');
            return;
        }

        if (incluyeAccesorioVal && !categories.includes('ventaAccesorio')) {
            showSalesMessage('⚠️ Si incluyes ACCESORIO, debes marcar "Venta de Accesorio" para mantener trazabilidad', 'error');
            console.warn('❌ Validación fallida: Accesorio sin Venta Accesorio');
            return;
        }

        const saleData = {
            orderNumber,
            type,
            clientName,
            cedula,
            categories,
            incluyeLineaPrepago,
            incluyeTelefono: incluyeTelefonoVal,
            incluyeAccesorio: incluyeAccesorioVal,
            deviceIMEIs: deviceIMEIs.length > 0 ? deviceIMEIs : null,
            accesorios: accesorios.length > 0 ? accesorios : null
        };

        console.log('📝 Registrando venta con datos:', saleData);

        const result = await window.salesTracking.registerSale(saleData);

        if (result.success) {
            showSalesMessage('✅ Venta registrada exitosamente', 'success');
            form.reset();
            if (window.updateDeviceFieldsVisibility) {
                window.updateDeviceFieldsVisibility();
            }
            await updateSalesMetrics();
            await renderSalesList();
            
            // ✅ NUEVO: Actualizar metas desglosadas inmediatamente
            if (window.updateDesglosadaCompletado) {
                console.log('🔄 Actualizando metas desglosadas...');
                await window.updateDesglosadaCompletado();
            }
            
            // 🔔 Actualizar campanita de notificaciones
            if (window.updateNotificationBadge) await window.updateNotificationBadge();
        } else {
            showSalesMessage('Error: ' + result.error, 'error');
        }
    });
}

// setAnnualMeta se define en global-handlers.js - NO duplicar aquí

async function updateSalesMetrics() {
    if (!window.salesTracking) {
        console.warn('⚠️ updateSalesMetrics: salesTracking no disponible');
        return;
    }
    
    const metrics = await window.salesTracking.getSalesMetrics();
    if (!metrics) {
        console.warn('⚠️ updateSalesMetrics: no se pudieron obtener métricas');
        await updateSalesMetaSummary();
        return;
    }

    console.log('📊 Actualizando métricas:', metrics);
    
    const el = (id) => document.getElementById(id);
    if (el('totalSalesCount')) el('totalSalesCount').textContent = metrics.completedSales;
    if (el('withDeviceCount')) el('withDeviceCount').textContent = metrics.withDevice;
    if (el('withoutDeviceCount')) el('withoutDeviceCount').textContent = metrics.withoutDevice;
    if (el('annualGoalValue')) el('annualGoalValue').textContent = metrics.annualGoal;
    if (el('remainingGoalValue')) el('remainingGoalValue').textContent = metrics.remainingGoal;
    if (el('progressPercentage')) el('progressPercentage').textContent = metrics.progressPercentage + '%';
    await updateSalesMetaSummary();
    
    const progressBar = el('progressBar');
    if (progressBar) {
        progressBar.style.width = Math.min(metrics.progressPercentage, 100) + '%';
    }
    
    console.log('✅ Métricas actualizadas en UI');
}

let currentPage = 1;
let filteredSales = [];
const ITEMS_PER_PAGE = 10;

async function renderSalesList() {
    console.log('🟢🟢🟢 [renderSalesList] ===== INICIANDO RENDERIZADO ===== 🟢🟢🟢');
    console.log('🔴 Timestamp:', new Date().toISOString());
    
    if (!window.salesTracking) {
        console.error('❌❌❌ window.salesTracking NO está disponible');
        alert('ERROR CRÍTICO: window.salesTracking NO disponible');
        return;
    }
    
    const container = document.getElementById('salesList');
    console.log('🔴 [renderSalesList] Container:', container);
    console.log('🔴 Container existe?:', container ? '✅ SÍ' : '❌ NO');
    console.log('🔴 Container innerHTML inicial:', container ? container.innerHTML : 'N/A');
    
    if (!container) {
        console.error('❌❌❌ No se encontró elemento #salesList');
        alert('ERROR CRÍTICO: #salesList NO encontrado en DOM');
        return;
    }
    
    let sales = [];
    try {
        console.log('🟡 [renderSalesList] Llamando window.salesTracking.getAllSales()...');
        sales = await window.salesTracking.getAllSales();
        console.log('✅✅✅ [renderSalesList] Sales obtenidas:', sales);
        console.log('✅ Total de ventas:', sales.length);
        console.log('✅ Primera venta:', sales[0]);
    } catch (err) {
        console.error('❌❌❌ Error obteniendo sales:', err);
        alert('ERROR AL OBTENER VENTAS: ' + err.message);
        container.innerHTML = '<p style="color: red; font-size: 20px; padding: 40px; text-align: center; border: 3px solid red;">❌ ERROR AL CARGAR VENTAS: ' + err.message + '</p>';
        return;
    }
    
    console.log('🔵 Verificación: sales.length =', sales.length);
    
    const hasAnySales = sales.length > 0;

    // Aplicar filtros
    filteredSales = applyFilters(sales);
    console.log('🟣 [renderSalesList] Sales después de filtros:', filteredSales.length);
    const filterDebugSnapshot = {
        orderNumber: document.getElementById('filterOrderNumber')?.value || '',
        cedula: document.getElementById('filterCedula')?.value || '',
        status: document.getElementById('filterStatus')?.value || ''
    };
    console.log('🟣 Filtros actuales:', filterDebugSnapshot);
    
    // Calcular paginación
    const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedSales = filteredSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    console.log('🟠 Paginación:', {
        totalPages,
        currentPage,
        startIndex,
        paginatedSales: paginatedSales.length
    });

    if (paginatedSales.length === 0 && currentPage > 1) {
        console.warn('⚠️ Página vacía, volviendo a página 1');
        currentPage = 1;
        await renderSalesList();
        return;
    }

    console.log('🟢🟢🟢 GENERANDO HTML DE FILTROS...');
    let html = '';
    
    // FILTROS - MUY VISIBLE
    html += '<div style="background: #2196F3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 5px solid red;">';
    html += '<h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">🔍🔍🔍 FILTROS DE BÚSQUEDA 🔍🔍🔍</h2>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 15px;">';
    
    html += '<div>';
    html += '<label style="display: block; font-weight: bold; margin-bottom: 8px; color: white; font-size: 14px;">📋 Número de Pedido:</label>';
    html += '<input type="text" id="filterOrderNumber" placeholder="Ej: KO-5228" onkeyup="applyFiltersAndRender()" style="width: 100%; padding: 10px; border: none; border-radius: 4px; box-sizing: border-box; font-size: 14px;">';
    html += '</div>';
    
    html += '<div>';
    html += '<label style="display: block; font-weight: bold; margin-bottom: 8px; color: white; font-size: 14px;">🆔 Cédula:</label>';
    html += '<input type="text" id="filterCedula" placeholder="Ej: 109460" onkeyup="applyFiltersAndRender()" style="width: 100%; padding: 10px; border: none; border-radius: 4px; box-sizing: border-box; font-size: 14px;">';
    html += '</div>';
    
    html += '<div>';
    html += '<label style="display: block; font-weight: bold; margin-bottom: 8px; color: white; font-size: 14px;">✅ Estado:</label>';
    html += '<select id="filterStatus" onchange="applyFiltersAndRender()" style="width: 100%; padding: 10px; border: none; border-radius: 4px; box-sizing: border-box; font-size: 14px;">';
    html += '<option value="">--- TODOS ---</option>';
    html += '<option value="PENDIENTE">⏳ PENDIENTE</option>';
    html += '<option value="COMPLETADA">✅ COMPLETADA</option>';
    html += '</select>';
    html += '</div>';
    
    html += '<div style="display: flex; align-items: flex-end;">';
    html += '<button onclick="clearFilters()" style="width: 100%; padding: 10px; background-color: #FF6F00; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; transition: background 0.3s;">🔄 Limpiar</button>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    // ESTADÍSTICAS
    html += '<div style="background: #FFF59D; border: 2px solid #FBC02D; padding: 15px; margin-bottom: 30px; border-radius: 8px;">';
    html += '<strong style="color: #F57F17; font-size: 16px;">📊 RESULTADOS:</strong> ';
    html += 'Mostrando <strong style="color: #F57F17;">' + paginatedSales.length + '</strong> de ';
    html += '<strong style="color: #F57F17;">' + filteredSales.length + '</strong> ventas (Total: <strong style="color: #F57F17;">' + sales.length + '</strong>)';
    html += '</div>';
    
    // TARJETAS DE VENTAS
    if (paginatedSales.length === 0) {
        const emptyMessage = hasAnySales
            ? 'No hay ventas que coincidan con los filtros actuales'
            : 'No hay ventas registradas aún. ¡Registra tu primera venta!';
        html += '<div style="padding: 30px; text-align: center; background: #fff9c4; border: 2px dashed #f9a825; border-radius: 8px; font-size: 16px; color: #5d4037; margin-bottom: 20px;">⚠️ ' + emptyMessage + '</div>';
    } else {
    paginatedSales.forEach(function(sale, idx) {
        const statusColor = sale.status === 'COMPLETADA' ? '#4CAF50' : '#FF9800';
        const statusBg = sale.status === 'COMPLETADA' ? '#c8e6c9' : '#ffe0b2';
        const statusText = sale.status === 'COMPLETADA' ? '✅ COMPLETADA' : '⏳ PENDIENTE';
        
        html += '<div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 6px solid ' + statusColor + '; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
        html += '<h3 style="margin: 0; color: #1976D2; font-size: 18px;">' + sale.orderNumber + '</h3>';
        html += '<span style="background: ' + statusColor + '; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 12px;">' + statusText + '</span>';
        html += '</div>';
        
        html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">';
        html += '<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;"><strong>👤 Cliente:</strong></td><td style="padding: 8px; color: #333;">' + (sale.clientName || 'N/A') + '</td></tr>';
        html += '<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;"><strong>🆔 Cédula:</strong></td><td style="padding: 8px; color: #333;">' + (sale.cedula || 'N/A') + '</td></tr>';
        html += '<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;"><strong>🏷️ Tipo:</strong></td><td style="padding: 8px; color: #333;">' + (sale.type || 'N/A') + '</td></tr>';
        
        // Mostrar categorías si existen
        if (sale.categories && sale.categories.length > 0) {
            const categoryLabels = {
                renovacion: '🔄 Renovación',
                servicioNuevo: '🆕 Servicio Nuevo',
                ventaTerminal: '📱 Venta Terminal',
                ventaAccesorio: '📦 Venta Accesorio'
            };
            const categoryList = sale.categories.map(cat => categoryLabels[cat] || cat).join(', ');
            html += '<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;"><strong>📂 Categorías:</strong></td><td style="padding: 8px; color: #333;">' + categoryList + '</td></tr>';
        }
        
        // Mostrar opciones adicionales si aplican
        if (sale.incluyeLineaPrepago || sale.incluyeTelefono || sale.incluyeAccesorio) {
            let options = [];
            if (sale.incluyeLineaPrepago) options.push('📵 Prepago');
            
            // Mostrar múltiples IMEIs
            if (sale.incluyeTelefono && sale.deviceIMEIs && Array.isArray(sale.deviceIMEIs) && sale.deviceIMEIs.length > 0) {
                sale.deviceIMEIs.forEach((imei, idx) => {
                    options.push('☎️ IMEI ' + (idx + 1) + ': ' + imei);
                });
            }
            
            // Mostrar múltiples accesorios
            if (sale.incluyeAccesorio && sale.accesorios && Array.isArray(sale.accesorios) && sale.accesorios.length > 0) {
                sale.accesorios.forEach((acc, idx) => {
                    options.push('🎁 ' + (idx + 1) + '. ' + acc);
                });
            }
            
            if (options.length > 0) {
                html += '<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; color: #666;"><strong>⚙️ Opciones:</strong></td><td style="padding: 8px; color: #333;">' + options.join('<br>') + '</td></tr>';
            }
        }
        
        html += '</table>';
        
        html += '<div style="display: flex; gap: 10px;">';
        if (sale.status === 'PENDIENTE') {
            html += '<button onclick="completeSaleHandler(\'' + sale.id + '\')" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">✅ Marcar Completada</button>';
        }
        html += '<button onclick="if (confirm(\'¿Eliminar venta ' + sale.orderNumber + '?\')) deleteSaleHandler(\'' + sale.id + '\')" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">🗑️ Eliminar</button>';
        html += '</div>';
        html += '</div>';
    });
    }
    
    // PAGINACIÓN
    if (totalPages > 1) {
        html += '<div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px; border: 2px solid #ddd;">';
        html += '<strong style="color: #333;">📄 Página ' + currentPage + ' de ' + totalPages + '</strong>';
        
        if (currentPage > 1) {
            html += '<button onclick="goToPage(' + (currentPage - 1) + ')" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">⬅️ Anterior</button>';
        }
        
        if (currentPage < totalPages) {
            html += '<button onclick="goToPage(' + (currentPage + 1) + ')" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Siguiente ➡️</button>';
        }
        
        html += '</div>';
    }
    
    console.log('🟢🟢🟢 ASIGNANDO HTML AL CONTAINER...');
    console.log('🟢 Longitud del HTML:', html.length, 'caracteres');
    console.log('🟢 Primeros 200 chars:', html.substring(0, 200));
    container.innerHTML = html;
    console.log('✅✅✅ [renderSalesList] HTML RENDERIZADO EXITOSAMENTE ✅✅✅');
    console.log('✅ Container innerHTML después de asignar:', container.innerHTML.substring(0, 200));
}

function applyFilters(sales) {
    const filterOrderNumberEl = document.getElementById('filterOrderNumber');
    const filterCedulaEl = document.getElementById('filterCedula');
    const filterStatusEl = document.getElementById('filterStatus');

    const filterOrderNumber = (filterOrderNumberEl?.value || '').toUpperCase();
    const filterCedula = (filterCedulaEl?.value || '');
    const filterStatus = filterStatusEl?.value || '';

    return sales.filter(sale => {
        const matchesOrder = !filterOrderNumber || sale.orderNumber.toUpperCase().includes(filterOrderNumber);
        const matchesCedula = !filterCedula || sale.cedula.includes(filterCedula);
        const matchesStatus = !filterStatus || sale.status === filterStatus;
        
        return matchesOrder && matchesCedula && matchesStatus;
    });
}

function applyFiltersAndRender() {
    currentPage = 1;
    renderSalesList();
}

function clearFilters() {
    document.getElementById('filterOrderNumber').value = '';
    document.getElementById('filterCedula').value = '';
    document.getElementById('filterStatus').value = '';
    currentPage = 1;
    renderSalesList();
}

function goToPage(page) {
    currentPage = page;
    renderSalesList();
}

async function deleteSaleHandler(saleId) {
    if (!window.salesTracking) return;
    
    if (!confirm('¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando venta:', saleId);
        const success = await window.salesTracking.deleteSale(saleId);
        if (success) {
            console.log('✅ Venta eliminada exitosamente:', saleId);
            showSalesMessage('Venta eliminada correctamente', 'success');
            currentPage = 1;
            
            // Esperar un momento para que Firestore se actualice
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Forzar actualización completa
            console.log('🔄 Actualizando métricas y lista...');
            await updateSalesMetrics();
            await renderSalesList();
            
            // Actualizar también metas desglosadas si existen
            if (window.updateDesglosadaCompletado) {
                await window.updateDesglosadaCompletado();
            }
        } else {
            showSalesMessage('Error al eliminar la venta', 'error');
        }
    } catch (error) {
        console.error('❌ Error eliminando venta:', error);
        showSalesMessage('Error al eliminar: ' + error.message, 'error');
    }
}

async function completeSaleHandler(saleId) {
    if (!window.salesTracking) return;
    const success = await window.salesTracking.completeSale(saleId);
    if (success) {
        showSalesMessage('Venta completada', 'success');
        
        // Esperar un momento para que Firestore se actualice
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await updateSalesMetrics();
        await renderSalesList();
        
        // 🔄 Actualizar contadores en metas desglosadas
        if (window.updateDesglosadaCompletado) {
            await window.updateDesglosadaCompletado();
        }
        
        // 🎨 Actualizar dashboard categórico automáticamente
        if (window.renderCategoricalProgress) {
            setTimeout(async () => {
                await window.renderCategoricalProgress();
            }, 500);
        }
        
        // 🔔 Actualizar badge de notificación
        if (window.updateNotificationBadge) {
            await window.updateNotificationBadge();
        }
    } else {
        showSalesMessage('Error al completar', 'error');
    }
}

function listenToSalesUpdates() {
    if (!window.salesTracking) return;
    if (salesListener) {
        salesListener();
    }

    salesListener = window.salesTracking.onSalesUpdated((sales) => {
        console.log('Sales updated:', sales.length);
        updateSalesMetrics();
        renderSalesList();
        
        // ✅ NUEVO: Actualizar metas desglosadas cuando hay cambios en ventas
        if (window.updateDesglosadaCompletado) {
            window.updateDesglosadaCompletado();
        }
    });
}

function showSalesMessage(message, type) {
    const messageBox = document.getElementById('salesMessage');
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
    messageBox.style.display = 'block';

    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 4000);
}

window.initSalesManagement = initSalesManagement;
window.completeSaleHandler = completeSaleHandler;
window.deleteSaleHandler = deleteSaleHandler;
window.updateSalesMetrics = updateSalesMetrics;
window.renderSalesList = renderSalesList;
window.applyFiltersAndRender = applyFiltersAndRender;
window.clearFilters = clearFilters;
window.goToPage = goToPage;
window.validateDevicesCategoryLink = validateDevicesCategoryLink;

// Exportar para uso como módulo
export { initSalesManagement };
