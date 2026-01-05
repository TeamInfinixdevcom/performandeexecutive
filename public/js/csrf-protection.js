/**
 * CSRF Token Protection para Firebase Web App
 * 
 * Genera y valida tokens CSRF para prevenir Cross-Site Request Forgery
 * Se integra con Callable Functions de Firebase
 */

class CSRFTokenManager {
    constructor() {
        this.tokenKey = 'csrfToken';
        this.tokenTimestampKey = 'csrfTokenTimestamp';
        this.tokenTTL = 3600000; // 1 hora en milisegundos
    }

    /**
     * Generar un token CSRF aleatorio
     * Usando crypto API del navegador para máxima seguridad
     * @returns {string} Token CSRF de 64 caracteres (32 bytes en hex)
     */
    generate() {
        try {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            
            // Guardar token y timestamp
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.tokenTimestampKey, Date.now().toString());
            
            console.log('✅ CSRF Token generado');
            return token;
        } catch (e) {
            console.error('❌ Error generando CSRF token:', e);
            return null;
        }
    }

    /**
     * Obtener token CSRF guardado
     * Si no existe o expiró, genera uno nuevo
     * @returns {string|null} Token CSRF o null si hay error
     */
    getToken() {
        try {
            let token = localStorage.getItem(this.tokenKey);
            const timestamp = parseInt(localStorage.getItem(this.tokenTimestampKey) || 0);
            
            // Verificar si el token existe y no ha expirado
            if (token && (Date.now() - timestamp) < this.tokenTTL) {
                return token;
            }
            
            // Token expirado o no existe - generar uno nuevo
            return this.generate();
        } catch (e) {
            console.error('❌ Error obteniendo CSRF token:', e);
            return null;
        }
    }

    /**
     * Rotar token (generar nuevo después de cada operación sensible)
     * Previene que un atacante reutilice un token capturado
     * @returns {string} Nuevo token CSRF
     */
    rotate() {
        try {
            const newToken = this.generate();
            console.log('✅ CSRF Token rotado');
            return newToken;
        } catch (e) {
            console.error('❌ Error rotando CSRF token:', e);
            return null;
        }
    }

    /**
     * Validar token CSRF (se usa en el servidor)
     * NOTA: Esta función es principalmente para testing del cliente
     * La validación real ocurre en Cloud Functions
     * @param {string} token - Token a validar
     * @returns {boolean} true si el token es válido
     */
    validate(token) {
        try {
            const storedToken = localStorage.getItem(this.tokenKey);
            const timestamp = parseInt(localStorage.getItem(this.tokenTimestampKey) || 0);
            
            if (!storedToken || !token) {
                return false;
            }
            
            // Verificar que el token coincida
            if (token !== storedToken) {
                console.warn('⚠️ CSRF token mismatch');
                return false;
            }
            
            // Verificar que no haya expirado
            if ((Date.now() - timestamp) >= this.tokenTTL) {
                console.warn('⚠️ CSRF token expired');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('❌ Error validando CSRF token:', e);
            return false;
        }
    }

    /**
     * Limpiar token (logout)
     */
    clear() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.tokenTimestampKey);
            console.log('✅ CSRF Token limpiado');
        } catch (e) {
            console.error('❌ Error limpiando CSRF token:', e);
        }
    }

    /**
     * Obtener información de depuración
     * @returns {Object} Estado del token para debugging
     */
    debug() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            const timestamp = localStorage.getItem(this.tokenTimestampKey);
            const isExpired = timestamp ? (Date.now() - parseInt(timestamp)) >= this.tokenTTL : true;
            
            return {
                token: token ? token.slice(0, 16) + '...' : null,
                timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : null,
                isExpired: isExpired,
                ttlSeconds: this.tokenTTL / 1000
            };
        } catch (e) {
            console.error('❌ Error en debug CSRF:', e);
            return null;
        }
    }
}

// Exportar como instancia global
const csrfTokenManager = new CSRFTokenManager();
export default csrfTokenManager;
