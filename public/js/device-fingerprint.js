/**
 * Device Fingerprinting para Web
 * Detecta Session Hijacking validando que el dispositivo sea el mismo
 * 
 * Técnicas utilizadas:
 * 1. User-Agent (navegador, SO, versión)
 * 2. Canvas Fingerprinting (características gráficas únicas)
 * 3. WebGL Fingerprinting (GPU info)
 * 4. Timezone y lenguaje
 * 5. Pantalla (resolución, profundidad de color)
 */

class DeviceFingerprint {
    constructor() {
        this.storageKey = 'deviceFingerprint';
        this.ipKey = 'lastKnownIP';
        this.timestampKey = 'fingerprintTimestamp';
    }

    /**
     * Generar fingerprint único del dispositivo
     * @returns {Promise<string>} Hash hexadecimal del fingerprint
     */
    async generate() {
        const components = {
            // 1. User-Agent (navegador, SO)
            userAgent: navigator.userAgent,
            
            // 2. Lenguaje
            language: navigator.language,
            
            // 3. Timezone
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            // 4. Pantalla (resolución, profundidad)
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                devicePixelRatio: window.devicePixelRatio
            },
            
            // 5. Canvas Fingerprinting (características gráficas únicas)
            canvasFingerprint: this._getCanvasFingerprint(),
            
            // 6. WebGL Fingerprinting (GPU info)
            webglFingerprint: this._getWebGLFingerprint(),
            
            // 7. LocalStorage/IndexedDB disponibles
            storage: {
                localStorage: typeof(Storage) !== 'undefined',
                indexedDB: !!window.indexedDB,
                sessionStorage: typeof(sessionStorage) !== 'undefined'
            },
            
            // 8. Plugins (en navegadores que los soportan)
            plugins: this._getPluginsInfo(),
            
            // 9. Memoria (si está disponible)
            memory: navigator.deviceMemory || 'unknown'
        };

        // Convertir a JSON y hashear
        const fingerprintString = JSON.stringify(components);
        const hash = await this._sha256(fingerprintString);
        
        return hash;
    }

    /**
     * Canvas Fingerprinting - Genera un patrón único basado en renderizado
     * @private
     * @returns {string} Fingerprint basado en canvas
     */
    _getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Dibujar texto único
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Canvas Fingerprint 🔒', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Canvas Fingerprint 🔒', 4, 17);
            
            // Obtener datos del canvas
            return canvas.toDataURL().slice(-50); // Últimos 50 caracteres del dataURL
        } catch (e) {
            return 'canvas-error';
        }
    }

    /**
     * WebGL Fingerprinting - Información de GPU
     * @private
     * @returns {string} Fingerprint basado en WebGL
     */
    _getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return 'webgl-unavailable';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            
            if (debugInfo) {
                return {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                };
            }
            
            return {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER)
            };
        } catch (e) {
            return 'webgl-error';
        }
    }

    /**
     * Obtener información de plugins del navegador
     * @private
     * @returns {Array<string>} Lista de plugins activos
     */
    _getPluginsInfo() {
        try {
            // navigator.plugins ya no es confiable en navegadores modernos, pero incluimos por compatibilidad
            if (navigator.plugins && navigator.plugins.length > 0) {
                return Array.from(navigator.plugins)
                    .map(p => p.name)
                    .slice(0, 10); // Primeros 10 plugins
            }
            return [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Hash SHA-256 para normalizar el fingerprint
     * @private
     * @param {string} str - String a hashear
     * @returns {Promise<string>} Hash SHA-256 en hexadecimal
     */
    async _sha256(str) {
        const buffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Guardar fingerprint en localStorage
     * @param {string} fingerprint - Fingerprint a guardar
     */
    save(fingerprint) {
        try {
            localStorage.setItem(this.storageKey, fingerprint);
            localStorage.setItem(this.timestampKey, new Date().toISOString());
            console.log('✅ Device fingerprint guardado');
        } catch (e) {
            console.error('❌ Error guardando fingerprint:', e);
        }
    }

    /**
     * Obtener fingerprint guardado
     * @returns {string|null} Fingerprint guardado o null
     */
    getStored() {
        try {
            return localStorage.getItem(this.storageKey);
        } catch (e) {
            console.error('❌ Error leyendo fingerprint guardado:', e);
            return null;
        }
    }

    /**
     * Validar que el dispositivo actual coincida con el almacenado
     * @returns {Promise<{valid: boolean, reason: string}>}
     */
    async validate() {
        try {
            const storedFingerprint = this.getStored();
            
            if (!storedFingerprint) {
                return {
                    valid: false,
                    reason: 'No fingerprint stored - first login from this device'
                };
            }
            
            const currentFingerprint = await this.generate();
            
            if (currentFingerprint === storedFingerprint) {
                return {
                    valid: true,
                    reason: 'Device fingerprint matches - same device'
                };
            } else {
                return {
                    valid: false,
                    reason: 'Device fingerprint mismatch - POSSIBLE SESSION HIJACKING DETECTED',
                    stored: storedFingerprint.slice(0, 10) + '...',
                    current: currentFingerprint.slice(0, 10) + '...'
                };
            }
        } catch (e) {
            console.error('❌ Error validando fingerprint:', e);
            return {
                valid: false,
                reason: 'Error during fingerprint validation: ' + e.message
            };
        }
    }

    /**
     * Limpiar fingerprint (logout)
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.timestampKey);
            localStorage.removeItem(this.ipKey);
            console.log('✅ Device fingerprint limpiado');
        } catch (e) {
            console.error('❌ Error limpiando fingerprint:', e);
        }
    }

    /**
     * Obtener información de depuración del fingerprint
     * @returns {Object} Información de depuración
     */
    async debug() {
        const stored = this.getStored();
        const current = await this.generate();
        const validation = await this.validate();
        
        return {
            storedFingerprint: stored ? stored.slice(0, 20) + '...' : null,
            currentFingerprint: current.slice(0, 20) + '...',
            validation: validation,
            timestamp: localStorage.getItem(this.timestampKey),
            userAgent: navigator.userAgent,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
}

// Exportar como instancia global
const deviceFingerprint = new DeviceFingerprint();
export default deviceFingerprint;
