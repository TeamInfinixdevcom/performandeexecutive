/**
 * App Controller - Controlador Central de la Aplicación
 * Maneja: Errores, Memory Leaks, Race Conditions
 * 
 * @author Infinix Dev
 * @version 1.0
 */

const AppController = {
    // ============================================
    // ESTADO DE LA APLICACIÓN
    // ============================================
    activeTab: 'clientes',
    pendingRequests: new Map(),
    eventListeners: new Map(),
    isLoading: false,
    
    // ============================================
    // 13. MANEJO DE ERRORES UNIFICADO
    // ============================================
    
    /**
     * Wrapper para funciones async con try-catch automático
     * @param {Function} fn - Función async a ejecutar
     * @param {string} context - Contexto para logging
     * @returns {Function} Función wrapeada
     */
    safeAsync(fn, context = 'unknown') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                console.error(`❌ [${context}] Error:`, error);
                
                // Usar ErrorHandler si está disponible
                if (window.ErrorHandler) {
                    window.ErrorHandler.handle(error, { context, args });
                } else {
                    // Fallback: mostrar mensaje simple
                    const msg = this.getErrorMessage(error);
                    if (window.showMessage) {
                        window.showMessage(msg, 'error');
                    }
                }
                
                return null;
            }
        };
    },
    
    /**
     * Obtener mensaje de error amigable
     */
    getErrorMessage(error) {
        const messages = {
            'permission-denied': '❌ No tienes permisos para esta acción',
            'unavailable': '⚠️ Servicio no disponible, intenta de nuevo',
            'network-request-failed': '⚠️ Error de conexión',
            'quota-exceeded': '⚠️ Límite de solicitudes excedido',
        };
        
        const code = error.code || error.message || '';
        return messages[code] || `❌ Error: ${error.message || 'Desconocido'}`;
    },
    
    // ============================================
    // 14. MANEJO DE MEMORY LEAKS
    // ============================================
    
    /**
     * Registrar un event listener para limpieza posterior
     * @param {Element} element - Elemento DOM
     * @param {string} event - Nombre del evento
     * @param {Function} handler - Handler del evento
     * @param {string} tabContext - Pestaña donde está activo
     */
    addManagedListener(element, event, handler, tabContext = 'global') {
        if (!element) return;
        
        const key = `${tabContext}_${event}_${Math.random().toString(36).substr(2, 9)}`;
        
        element.addEventListener(event, handler);
        
        if (!this.eventListeners.has(tabContext)) {
            this.eventListeners.set(tabContext, []);
        }
        
        this.eventListeners.get(tabContext).push({
            element,
            event,
            handler,
            key
        });
        
        return key;
    },
    
    /**
     * Limpiar todos los listeners de una pestaña
     * @param {string} tabContext - Pestaña a limpiar
     */
    cleanupTabListeners(tabContext) {
        const listeners = this.eventListeners.get(tabContext) || [];
        
        listeners.forEach(({ element, event, handler }) => {
            try {
                element.removeEventListener(event, handler);
            } catch (e) {
                // Elemento ya no existe, ignorar
            }
        });
        
        this.eventListeners.set(tabContext, []);
        console.log(`🧹 Limpiados ${listeners.length} listeners de pestaña: ${tabContext}`);
    },
    
    /**
     * Limpiar intervalos y timeouts de una pestaña
     */
    tabIntervals: new Map(),
    
    addManagedInterval(fn, ms, tabContext) {
        const id = setInterval(fn, ms);
        
        if (!this.tabIntervals.has(tabContext)) {
            this.tabIntervals.set(tabContext, []);
        }
        this.tabIntervals.get(tabContext).push(id);
        
        return id;
    },
    
    cleanupTabIntervals(tabContext) {
        const intervals = this.tabIntervals.get(tabContext) || [];
        intervals.forEach(id => clearInterval(id));
        this.tabIntervals.set(tabContext, []);
    },
    
    // ============================================
    // 15. CONTROL DE RACE CONDITIONS
    // ============================================
    
    /**
     * Ejecutar request con control de duplicados
     * @param {string} requestId - ID único del request
     * @param {Function} requestFn - Función que retorna Promise
     * @returns {Promise} Resultado del request
     */
    async executeRequest(requestId, requestFn) {
        // Si ya hay un request pendiente con este ID, esperar a que termine
        if (this.pendingRequests.has(requestId)) {
            console.log(`⏳ Request ${requestId} ya en progreso, esperando...`);
            return this.pendingRequests.get(requestId);
        }
        
        // Crear y registrar el promise
        const promise = (async () => {
            try {
                this.isLoading = true;
                return await requestFn();
            } finally {
                this.pendingRequests.delete(requestId);
                this.isLoading = false;
            }
        })();
        
        this.pendingRequests.set(requestId, promise);
        return promise;
    },
    
    /**
     * Cancelar requests pendientes de una pestaña
     */
    cancelTabRequests(tabContext) {
        const prefix = `${tabContext}_`;
        let cancelled = 0;
        
        for (const [key] of this.pendingRequests) {
            if (key.startsWith(prefix)) {
                this.pendingRequests.delete(key);
                cancelled++;
            }
        }
        
        if (cancelled > 0) {
            console.log(`🚫 Cancelados ${cancelled} requests de pestaña: ${tabContext}`);
        }
    },
    
    /**
     * Debounce para evitar múltiples llamadas
     */
    debounceTimers: new Map(),
    
    debounce(fn, wait, key) {
        return (...args) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timer = setTimeout(() => {
                this.debounceTimers.delete(key);
                fn(...args);
            }, wait);
            
            this.debounceTimers.set(key, timer);
        };
    },
    
    /**
     * Throttle para limitar frecuencia de llamadas
     */
    throttleTimers: new Map(),
    
    throttle(fn, limit, key) {
        return (...args) => {
            if (this.throttleTimers.has(key)) {
                return; // Ignorar llamada
            }
            
            fn(...args);
            this.throttleTimers.set(key, true);
            
            setTimeout(() => {
                this.throttleTimers.delete(key);
            }, limit);
        };
    },
    
    // ============================================
    // CAMBIO DE PESTAÑA CON CLEANUP
    // ============================================
    
    /**
     * Cambiar de pestaña con limpieza automática
     */
    switchTab(tabName) {
        const previousTab = this.activeTab;
        
        // Limpiar pestaña anterior
        if (previousTab !== tabName) {
            this.cleanupTabListeners(previousTab);
            this.cleanupTabIntervals(previousTab);
            this.cancelTabRequests(previousTab);
            
            // Pausar proyecciones si salimos de esa pestaña
            if (previousTab === 'proyecciones' && window.proyecciones) {
                window.proyecciones.pausarActualizacion();
            }
        }
        
        this.activeTab = tabName;
        
        // Ejecutar switchTab original
        if (window._originalSwitchTab) {
            window._originalSwitchTab(tabName);
        }
        
        // Reanudar proyecciones si entramos a esa pestaña
        if (tabName === 'proyecciones' && window.proyecciones) {
            window.proyecciones.reanudarActualizacion();
        }
        
        // Inicializar Todas las Ventas si entramos a esa pestaña
        if (tabName === 'todasventas' && window.todasVentas) {
            window.todasVentas.init();
        }
        
        console.log(`📑 Cambio de pestaña: ${previousTab} → ${tabName}`);
    },
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    init() {
        console.log('🚀 AppController inicializado');
        
        // Interceptar switchTab cuando esté disponible (después de dashboard.js)
        const interceptSwitchTab = () => {
            if (window.switchTab && !window._originalSwitchTab) {
                window._originalSwitchTab = window.switchTab;
                window.switchTab = (tabName) => this.switchTab(tabName);
                console.log('✅ switchTab interceptado para cleanup automático');
            }
        };
        
        // Intentar ahora y también después de que cargue todo
        interceptSwitchTab();
        window.addEventListener('load', interceptSwitchTab);
        
        // Limpiar al cerrar página
        window.addEventListener('beforeunload', () => {
            this.cleanupTabListeners('global');
            this.cleanupTabIntervals('global');
        });
        
        // Exponer funciones útiles globalmente
        window.safeAsync = (fn, ctx) => this.safeAsync(fn, ctx);
        window.executeRequest = (id, fn) => this.executeRequest(id, fn);
        window.addManagedListener = (el, ev, fn, ctx) => this.addManagedListener(el, ev, fn, ctx);
    }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
    AppController.init();
});

// Exponer globalmente
window.AppController = AppController;
