/**
 * Error Handler
 * Manejo centralizado de errores
 * Convierte errores técnicos en mensajes amigables para el usuario
 */

class ErrorHandler {
  /**
   * Mapeo de códigos de error a mensajes en español
   */
  static getMessageForUser(error) {
    const code = error.code || error.message || 'unknown';
    
    const messages = {
      // Firebase Auth
      'auth/permission-denied': '❌ No tienes permisos para hacer esto',
      'auth/user-not-found': '❌ Usuario no encontrado',
      'auth/invalid-password': '❌ Contraseña incorrecta',
      'auth/email-already-in-use': '❌ Este email ya está registrado',
      'auth/weak-password': '❌ La contraseña es muy débil',
      'auth/invalid-email': '❌ Email inválido',
      
      // Firestore
      'permission-denied': '❌ Acceso denegado',
      'not-found': '❌ Documento no encontrado',
      'already-exists': '❌ Este registro ya existe',
      'failed-precondition': '❌ No se pueden hacer cambios en este momento',
      'unavailable': '⚠️ El servicio no está disponible. Intenta más tarde',
      'deadline-exceeded': '⚠️ La solicitud tardó demasiado. Intenta nuevamente',
      
      // Network
      'NETWORK_ERROR': '⚠️ Error de conexión. Reintentando...',
      'TIMEOUT': '⏱️ Conexión perdida. Reintentando...',
      
      // Firestore indexes
      'FirebaseError: The query requires an index': '🔧 Por favor recarga la página e intenta nuevamente',
      
      // Default
      'default': '❌ Ocurrió un error. Por favor intenta nuevamente'
    };
    
    // Buscar en orden de especificidad
    return messages[code] || 
           messages[error.code?.split('/')[1]] || 
           messages['default'];
  }

  /**
   * Log detallado del error en consola
   * @param {Error} error - Error a loguear
   * @param {Object} context - Contexto del error
   */
  static logError(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      code: error.code || 'NO_CODE',
      stack: error.stack || 'No stack',
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.error('🚨 ERROR DETAILS:', errorInfo);
    
    // Guardar en localStorage para debugging posterior
    try {
      const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
      errorLog.push(errorInfo);
      // Mantener solo últimos 20 errores
      if (errorLog.length > 20) errorLog.shift();
      localStorage.setItem('errorLog', JSON.stringify(errorLog));
    } catch (e) {
      // Si falla guardar en localStorage, ignorar
    }
  }

  /**
   * Manejo completo de error
   * @param {Error} error - Error a manejar
   * @param {Object} context - Contexto del error
   */
  static async handle(error, context = {}) {
    try {
      // 1. Log del error
      this.logError(error, context);
      
      // 2. Mensaje amigable al usuario
      const userMessage = this.getMessageForUser(error);
      window.showMessage?.(userMessage, 'error');
      
      // 3. Retry automático para errores de red
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
        if (context.retryFn) {
          console.log('🔄 Reintentando en 2 segundos...');
          setTimeout(() => {
            try {
              context.retryFn();
            } catch (retryError) {
              console.error('Error en retry:', retryError);
            }
          }, 2000);
        }
      }
      
      // 4. Alertar a admin si es error crítico
      if (this.isCriticalError(error)) {
        console.error('🚨 CRITICAL ERROR - Puede necesitar atención del administrador');
      }
      
    } catch (handlerError) {
      console.error('Error en error handler:', handlerError);
    }
  }

  /**
   * Determina si un error es crítico
   * @param {Error} error - Error a evaluar
   * @returns {boolean}
   */
  static isCriticalError(error) {
    const criticalCodes = [
      'permission-denied',
      'failed-precondition',
      'internal',
      'unknown'
    ];
    return criticalCodes.includes(error.code);
  }

  /**
   * Obtener log de errores guardados
   * @returns {Array}
   */
  static getErrorLog() {
    try {
      return JSON.parse(localStorage.getItem('errorLog') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Limpiar log de errores
   */
  static clearErrorLog() {
    localStorage.removeItem('errorLog');
    console.log('✅ Log de errores limpiado');
  }
}

// Exportar globalmente
window.ErrorHandler = ErrorHandler;

console.log('✅ Error Handler cargado');
