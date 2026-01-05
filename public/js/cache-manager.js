/**
 * CACHE MANAGER - Sistema centralizado de caché para optimizar costos
 */

class CacheManager {
  constructor() {
    this.CACHE_TIME = 5 * 60 * 1000; // 5 minutos por defecto
    this.MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB máximo en localStorage
  }

  /**
   * Obtener dato del cache
   */
  get(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age < this.CACHE_TIME) {
        console.log(`📦 Cache hit: ${key} (${Math.round(age/1000)}s old) - AHORRO $$`);
        return data;
      } else {
        console.log(`⏰ Cache expirado: ${key} (${Math.round(age/1000)}s)`);
        this.remove(key);
        return null;
      }
    } catch (e) {
      console.warn(`⚠️ Cache corrupto: ${key}`, e);
      this.remove(key);
      return null;
    }
  }

  /**
   * Guardar dato en cache
   */
  set(key, data) {
    try {
      const cacheData = JSON.stringify({
        data,
        timestamp: Date.now()
      });

      // Verificar tamaño antes de guardar
      const currentSize = this.getTotalCacheSize();
      const newItemSize = new Blob([cacheData]).size;

      if (currentSize + newItemSize > this.MAX_CACHE_SIZE) {
        console.warn('⚠️ Cache lleno, limpiando entradas antiguas...');
        this.cleanOldest();
      }

      localStorage.setItem(key, cacheData);
      console.log(`💾 Cache guardado: ${key} (${Math.round(newItemSize/1024)}KB)`);
    } catch (e) {
      console.error('❌ Error guardando cache:', e);
      // Si el storage está lleno, limpiar todo
      if (e.name === 'QuotaExceededError') {
        this.clearAll();
      }
    }
  }

  /**
   * Invalidar cache específico
   */
  remove(key) {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache eliminado: ${key}`);
  }

  /**
   * Invalidar múltiples caches por patrón
   */
  removePattern(pattern) {
    let count = 0;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        localStorage.removeItem(key);
        count++;
      }
    }
    console.log(`🗑️ ${count} caches eliminados con patrón: ${pattern}`);
  }

  /**
   * Limpiar caches más antiguos
   */
  cleanOldest() {
    const caches = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ventas_') || key.startsWith('clients_'))) {
        try {
          const { timestamp } = JSON.parse(localStorage.getItem(key));
          caches.push({ key, timestamp });
        } catch (e) {
          // Ignorar caches corruptos
        }
      }
    }

    // Ordenar por antigüedad y eliminar el 30% más viejo
    caches.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(caches.length * 0.3);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(caches[i].key);
    }

    console.log(`🧹 ${toRemove} caches antiguos eliminados`);
  }

  /**
   * Obtener tamaño total del cache
   */
  getTotalCacheSize() {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      if (value) {
        size += new Blob([value]).size;
      }
    }
    return size;
  }

  /**
   * Limpiar todo el cache
   */
  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ventas_') || key.startsWith('clients_'))) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 ${keys.length} caches limpiados`);
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats() {
    let totalItems = 0;
    let totalSize = 0;
    const breakdown = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      
      if (value && (key.startsWith('ventas_') || key.startsWith('clients_'))) {
        totalItems++;
        const size = new Blob([value]).size;
        totalSize += size;

        const type = key.split('_')[0];
        if (!breakdown[type]) {
          breakdown[type] = { count: 0, size: 0 };
        }
        breakdown[type].count++;
        breakdown[type].size += size;
      }
    }

    return {
      totalItems,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      breakdown,
      maxSize: this.MAX_CACHE_SIZE,
      usagePercent: ((totalSize / this.MAX_CACHE_SIZE) * 100).toFixed(1)
    };
  }

  /**
   * Mostrar estadísticas en consola
   */
  logStats() {
    const stats = this.getStats();
    console.group('📊 Estadísticas de Cache');
    console.log(`Items totales: ${stats.totalItems}`);
    console.log(`Tamaño total: ${stats.totalSizeMB} MB (${stats.usagePercent}% usado)`);
    console.log('Desglose por tipo:', stats.breakdown);
    console.groupEnd();
  }
}

// Instancia global
window.cacheManager = new CacheManager();

// Limpiar caches antiguos al cargar la página
window.addEventListener('load', () => {
  const stats = window.cacheManager.getStats();
  if (parseFloat(stats.usagePercent) > 80) {
    console.warn('⚠️ Cache casi lleno, limpiando...');
    window.cacheManager.cleanOldest();
  }
});

console.log('✅ CacheManager cargado - Optimización de costos activa');
