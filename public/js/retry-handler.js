/**
 * Retry Handler
 * Reintentos automáticos con exponential backoff
 * Para operaciones que fallan por errores de red
 */

class RetryHandler {
  /**
   * Ejecutar operación con reintentos automáticos
   * @param {Function} operation - Función a ejecutar
   * @param {number} maxRetries - Máximo número de reintentos
   * @param {number} initialDelayMs - Delay inicial en ms
   * @param {Array} retryableErrors - Códigos de error que se reintentan
   * @returns {Promise}
   */
  static async executeWithRetry(
    operation,
    maxRetries = 3,
    initialDelayMs = 1000,
    retryableErrors = ['NETWORK_ERROR', 'TIMEOUT', 'deadline-exceeded', 'unavailable']
  ) {
    let lastError;
    let delay = initialDelayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📍 Intento ${attempt}/${maxRetries}...`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ Operación exitosa después de ${attempt} intentos`);
        }
        
        return result;

      } catch (error) {
        lastError = error;
        const code = error.code || error.message || 'unknown';
        
        // NO reintentar si es error de autenticación o permiso
        const noRetryErrors = [
          'auth/', 'permission-denied', 'not-found', 'already-exists'
        ];
        
        if (noRetryErrors.some(prefix => code.includes(prefix))) {
          console.error(`❌ Error no recuperable: ${code}`);
          throw error;
        }

        // Reintentar solo si es error recuperable
        if (!retryableErrors.some(prefix => code.includes(prefix))) {
          console.error(`❌ Error no retryable: ${code}`);
          throw error;
        }

        console.warn(`⚠️ Intento ${attempt} falló (${code}):`, error.message);

        // Si no hay más intentos, lanzar error
        if (attempt >= maxRetries) {
          console.error(`❌ Fallaron todos los ${maxRetries} intentos`);
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
        await this.sleep(delay);
        delay *= 2; // Duplicar delay para siguiente intento
      }
    }

    throw lastError;
  }

  /**
   * Sleep util
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecutar operación con reintentos y timeout
   * @param {Function} operation - Función a ejecutar
   * @param {number} timeoutMs - Timeout en ms
   * @param {number} maxRetries - Máximo reintentos
   * @returns {Promise}
   */
  static async executeWithRetryAndTimeout(
    operation,
    timeoutMs = 30000,
    maxRetries = 3
  ) {
    const operationWithTimeout = async () => {
      return Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('TIMEOUT')),
            timeoutMs
          )
        )
      ]);
    };

    return this.executeWithRetry(operationWithTimeout, maxRetries);
  }

  /**
   * Crear un wrapper de operación con reintentos
   * Útil para usar en catch blocks
   * @param {Function} operation - Función a ejecutar
   * @param {Object} options - Opciones de retry
   * @returns {Function}
   */
  static createRetryableOperation(operation, options = {}) {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      onRetry = null
    } = options;

    return async (...args) => {
      let lastError;
      let delay = initialDelayMs;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation(...args);
        } catch (error) {
          lastError = error;

          if (attempt < maxRetries) {
            if (onRetry) {
              onRetry(attempt, error);
            }
            await this.sleep(delay);
            delay *= 2;
          }
        }
      }

      throw lastError;
    };
  }

  /**
   * Obtener estadísticas de reintentos
   * @returns {Object}
   */
  static getStats() {
    return {
      timestamp: new Date().toISOString(),
      note: 'Reintentos se registran en consola'
    };
  }
}

// Exportar globalmente
window.RetryHandler = RetryHandler;

console.log('✅ Retry Handler cargado');
