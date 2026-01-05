/**
 * Security Validator
 * Previene XSS, valida entrada de usuarios
 * NO modifica código existente, solo agrega protección
 */

class SecurityValidator {
  /**
   * Sanitiza input para prevenir XSS
   * @param {string} input - Texto a sanitizar
   * @returns {string} - Texto seguro
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input; // textContent es seguro contra XSS
    return div.innerHTML;
  }

  /**
   * Valida email
   * @param {string} email - Email a validar
   * @returns {boolean}
   */
  static isValidEmail(email) {
    if (!email) return true; // Email es opcional en muchos campos
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Valida cédula costarricense (9 dígitos)
   * @param {string} cedula - Cédula a validar
   * @returns {boolean}
   */
  static isValidCedula(cedula) {
    const cleaned = cedula.replace(/[-\.]/g, '').trim();
    return /^\d{9}$/.test(cleaned);
  }

  /**
   * Valida nombre (solo letras, números y espacios)
   * @param {string} nombre - Nombre a validar
   * @returns {boolean}
   */
  static isValidName(nombre) {
    if (!nombre || nombre.length < 2) return false;
    if (nombre.length > 150) return false;
    // Permite letras con acentos, números y espacios
    return /^[a-záéíóúñ0-9\s\.]{2,150}$/i.test(nombre.trim());
  }

  /**
   * Valida teléfono (8 dígitos)
   * @param {string} phone - Teléfono a validar
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    if (!phone) return true; // Opcional
    const cleaned = phone.replace(/[-\s]/g, '').trim();
    return /^\d{8}$/.test(cleaned);
  }

  /**
   * Valida URL
   * @param {string} url - URL a validar
   * @returns {boolean}
   */
  static isValidUrl(url) {
    if (!url) return true; // Opcional
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida número (cantidad, precio, etc)
   * @param {string|number} value - Valor a validar
   * @param {number} min - Valor mínimo
   * @param {number} max - Valor máximo
   * @returns {boolean}
   */
  static isValidNumber(value, min = 0, max = 999999) {
    const num = parseInt(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
  }

  /**
   * Valida que no esté vacío
   * @param {string} value - Valor a validar
   * @returns {boolean}
   */
  static isNotEmpty(value) {
    return value && value.toString().trim().length > 0;
  }

  /**
   * Valida longitud de string
   * @param {string} value - Valor a validar
   * @param {number} min - Longitud mínima
   * @param {number} max - Longitud máxima
   * @returns {boolean}
   */
  static isValidLength(value, min = 1, max = 255) {
    if (!value) return min === 0;
    return value.length >= min && value.length <= max;
  }

  /**
   * Log de intento de validación fallida
   * @param {string} field - Campo que falló
   * @param {string} value - Valor rechazado
   * @param {string} rule - Regla que falló
   */
  static logValidationFailure(field, value, rule) {
    console.warn(`🔒 Validación fallida [${field}]: ${rule}`, {
      field,
      rule,
      timestamp: new Date().toISOString()
    });
  }
}

// Exportar globalmente
window.SecurityValidator = SecurityValidator;

console.log('✅ Security Validator cargado');
