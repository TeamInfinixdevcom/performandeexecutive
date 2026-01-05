/**
 * Utilities para integrar Fingerprinting y CSRF en Callable Functions
 * 
 * Uso en admin-panel.js, clients.js, etc:
 * 
 * import { callSecureFunction } from './security-utils.js';
 * 
 * const result = await callSecureFunction('cleanAndRecreateUser', {
 *   uid: 'user-id-to-clean'
 * });
 */

import csrfTokenManager from './csrf-protection.js';
import deviceFingerprint from './device-fingerprint.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

const functions = getFunctions();

/**
 * Enviar una Callable Function con protecciones de seguridad
 * - Incluye CSRF token en los datos
 * - Valida device fingerprint antes
 * - Maneja errores de seguridad específicos
 * 
 * @param {string} functionName - Nombre de la Cloud Function a llamar
 * @param {Object} data - Datos a enviar a la función
 * @returns {Promise<any>} Resultado de la función
 */
export async function callSecureFunction(functionName, data = {}) {
    try {
        // 🔒 VALIDACIÓN 1: Verificar device fingerprint
        const fingerprintValidation = await deviceFingerprint.validate();
        
        if (!fingerprintValidation.valid && deviceFingerprint.getStored() !== null) {
            console.error('⚠️ SECURITY ALERT - Session Hijacking Detected:', fingerprintValidation);
            throw new Error('Device fingerprint validation failed - possible session hijacking');
        }
        
        // 🔒 VALIDACIÓN 2: Obtener y validar CSRF token
        const csrfToken = csrfTokenManager.getToken();
        
        if (!csrfToken || !csrfTokenManager.validate(csrfToken)) {
            console.error('⚠️ CSRF Token invalid or expired');
            csrfTokenManager.rotate();
            throw new Error('CSRF token validation failed - please refresh and try again');
        }
        
        // 🔒 PASO 3: Preparar datos con CSRF token incluido
        const secureData = {
            ...data,
            csrfToken: csrfToken,
            clientTimestamp: new Date().toISOString()
        };
        
        // 🔒 PASO 4: Obtener la función Callable
        const fn = httpsCallable(functions, functionName);
        
        // 🔒 PASO 5: Ejecutar función
        const result = await fn(secureData);
        
        // 🔒 PASO 6: Rotar CSRF token después de operación sensible
        csrfTokenManager.rotate();
        
        console.log(`✅ ${functionName} ejecutada exitosamente`);
        return result.data;
        
    } catch (error) {
        console.error(`❌ Error en ${functionName}:`, error);
        
        // Interpretar errores de seguridad
        let securityError = null;
        
        if (error.code === 'unauthenticated') {
            securityError = 'No estás autenticado. Por favor inicia sesión.';
        } else if (error.code === 'permission-denied') {
            securityError = 'No tienes permisos para esta operación.';
        } else if (error.code === 'resource-exhausted') {
            securityError = 'Demasiados intentos. Por favor intenta más tarde.';
        } else if (error.message.includes('Device fingerprint')) {
            securityError = 'Alerta de seguridad: Dispositivo no verificado. Por favor inicia sesión de nuevo.';
            deviceFingerprint.clear();
        } else if (error.message.includes('CSRF token')) {
            securityError = 'Token de seguridad inválido. Por favor recarga la página.';
        }
        
        throw {
            code: error.code,
            message: error.message,
            securityError: securityError
        };
    }
}

/**
 * Registrar una operación sensible en el cliente (para auditoría)
 * Se complementa con el logging en Cloud Functions
 * 
 * @param {string} action - Tipo de acción (e.g., 'DELETE_USER', 'UPDATE_CLIENT')
 * @param {string} resourceType - Tipo de recurso (e.g., 'users', 'clients')
 * @param {string} resourceId - ID del recurso
 * @param {Object} details - Detalles adicionales
 */
export async function logClientAction(action, resourceType, resourceId, details = {}) {
    try {
        const timestamp = new Date().toISOString();
        const logData = {
            action,
            resourceType,
            resourceId,
            details,
            timestamp,
            userAgent: navigator.userAgent,
            url: window.location.href,
            csrfTokenValid: csrfTokenManager.validate(csrfTokenManager.getToken())
        };
        
        // En producción, esto se enviaría a un servidor de logging
        console.log('📋 Client Action Log:', logData);
        
        // Guardar en sessionStorage para referencia durante la sesión
        const logs = JSON.parse(sessionStorage.getItem('actionLogs') || '[]');
        logs.push(logData);
        sessionStorage.setItem('actionLogs', JSON.stringify(logs));
        
    } catch (e) {
        console.error('Error logging action:', e);
    }
}

/**
 * Obtener información de seguridad de la sesión actual
 * Útil para debugging y monitoreo
 * 
 * @returns {Promise<Object>} Estado de seguridad actual
 */
export async function getSecurityStatus() {
    try {
        const fingerprint = await deviceFingerprint.debug();
        const csrf = csrfTokenManager.debug();
        
        return {
            timestamp: new Date().toISOString(),
            deviceFingerprint: fingerprint,
            csrfToken: csrf,
            sessionStorage: {
                hasCSRFToken: !!sessionStorage.getItem('csrfToken'),
                actionLogCount: JSON.parse(sessionStorage.getItem('actionLogs') || '[]').length
            }
        };
    } catch (e) {
        console.error('Error getting security status:', e);
        return null;
    }
}

/**
 * Validar que el usuario está en el mismo dispositivo antes de operaciones sensibles
 * Muestra un diálogo de confirmación si hay cambios
 * 
 * @param {string} operation - Descripción de la operación (e.g., "eliminar usuario")
 * @returns {Promise<boolean>} true si el usuario confirma, false si cancela
 */
export async function confirmSensitiveOperation(operation) {
    try {
        const fingerprintValidation = await deviceFingerprint.validate();
        
        if (!fingerprintValidation.valid && deviceFingerprint.getStored() !== null) {
            const confirmed = window.confirm(
                `⚠️ ADVERTENCIA DE SEGURIDAD:\n\n` +
                `${fingerprintValidation.reason}\n\n` +
                `¿Realmente deseas ${operation}?\n\n` +
                `Presiona OK para continuar o Cancelar para detener.`
            );
            
            return confirmed;
        }
        
        return true;
    } catch (e) {
        console.error('Error confirming operation:', e);
        return false;
    }
}

// Exportar todas las funciones
export default {
    callSecureFunction,
    logClientAction,
    getSecurityStatus,
    confirmSensitiveOperation
};
