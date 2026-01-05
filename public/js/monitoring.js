/**
 * Application Monitoring
 * Captura errores globales, rechazos de promesas
 * Ayuda a detectar problemas en producción
 */

class Monitor {
  static isInitialized = false;

  /**
   * Inicializar monitoreo
   */
  static init() {
    if (this.isInitialized) return;
    
    this.logStartup();
    this.setupGlobalErrorHandler();
    this.setupUnhandledRejectionHandler();
    this.setupPerformanceMonitoring();
    this.setupBeforeUnloadHandler();
    
    this.isInitialized = true;
    console.log('✅ Monitoring iniciado');
  }

  /**
   * Log de inicio de aplicación
   */
  static logStartup() {
    console.log('═══════════════════════════════════════════');
    console.log('🚀 EXECUTIVE PERFORMANCE CRM');
    console.log('═══════════════════════════════════════════');
    console.log('⏰ Inicio:', new Date().toISOString());
    console.log('🌐 URL:', window.location.href);
    console.log('🖥️ User Agent:', navigator.userAgent);
    console.log('📱 Plataforma:', navigator.platform);
    console.log('═══════════════════════════════════════════');
  }

  /**
   * Capturar errores globales
   */
  static setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      console.error('🚨 Global error capturado:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });

      if (ErrorHandler) {
        ErrorHandler.logError(event.error || new Error(event.message), {
          source: 'window.onerror',
          file: event.filename,
          line: event.lineno,
          col: event.colno
        });
      }
    });
  }

  /**
   * Capturar rechazos de promesas no manejadas
   */
  static setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);

      if (ErrorHandler) {
        ErrorHandler.logError(
          event.reason instanceof Error ? 
            event.reason : 
            new Error(String(event.reason)),
          { source: 'unhandledrejection' }
        );
      }

      // Prevenir que el navegador cierre la app
      event.preventDefault();
    });
  }

  /**
   * Monitoreo básico de performance
   */
  static setupPerformanceMonitoring() {
    // Log cuando la página está completamente cargada
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM Content Loaded:', performance.now().toFixed(2) + 'ms');
      });
    }

    window.addEventListener('load', () => {
      const timing = performance.getEntriesByType('navigation')[0];
      if (timing) {
        console.log('🏁 Page Load Complete:', {
          'DNS Lookup': (timing.domainLookupEnd - timing.domainLookupStart).toFixed(2) + 'ms',
          'Connection': (timing.connectEnd - timing.connectStart).toFixed(2) + 'ms',
          'DOM Content': (timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart).toFixed(2) + 'ms',
          'Total': timing.loadEventEnd.toFixed(2) + 'ms'
        });
      }
    });
  }

  /**
   * Limpiar antes de descargar la página
   */
  static setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      console.log('👋 Descargando página');
    });
  }

  /**
   * Obtener información del navegador
   */
  static getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      memory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency
    };
  }

  /**
   * Obtener información de la aplicación
   */
  static getAppInfo() {
    return {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      sessionStorage: Object.keys(sessionStorage).length + ' items',
      localStorage: Object.keys(localStorage).length + ' items',
      errors: ErrorHandler?.getErrorLog?.()?.length || 0
    };
  }

  /**
   * Log de diagnóstico completo
   */
  static getDiagnostics() {
    return {
      browser: this.getBrowserInfo(),
      app: this.getAppInfo(),
      performance: {
        memory: performance.memory ? {
          usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
          totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB'
        } : 'Not available'
      }
    };
  }

  /**
   * Imprimir diagnósticos en consola
   */
  static printDiagnostics() {
    console.log('📊 DIAGNÓSTICOS DE LA APLICACIÓN:', this.getDiagnostics());
  }
}

// Inicializar automáticamente cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Monitor.init());
} else {
  Monitor.init();
}

// Exportar globalmente
window.Monitor = Monitor;

console.log('✅ Monitoring cargado');
