/**
 * VENTAS MANAGER - Gestión de ventas móviles y hogar
 * Funciones CRUD, cálculo de proyecciones, y filtrado por usuario
 */

class VentasManager {
  constructor() {
    this.db = null;
    this.auth = null;
    this.planesCache = null;
    this._initPromise = this._init();
  }

  /**
   * Inicializar: usar Firebase global
   */
  async _init() {
    try {
      // Esperar a que Firebase esté disponible globalmente
      if (typeof window === 'undefined') return;

      // Esperar a que Firebase global esté disponible (hasta 10 segundos)
      let attempts = 0;
      while ((!window.firebaseDb || !window.firebaseAuth) && attempts < 100) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!window.firebaseDb || !window.firebaseAuth) {
        throw new Error('Firebase no inicializado correctamente en window');
      }

      this.db = window.firebaseDb;
      this.auth = window.firebaseAuth;

      // Cargar planes
      await this.loadPlanes();

      console.log('✅ VentasManager inicializado');
    } catch (error) {
      console.error('❌ Error inicializando VentasManager:', error);
      throw error;
    }
  }

  /**
   * Esperar a que el manager esté listo
   */
  async ensure() {
    await this._initPromise;
  }

  /**
   * Cargar catálogo de precios desde planes.json
   */
  async loadPlanes() {
    try {
      const response = await fetch('/data/planes.json');
      this.planesCache = await response.json();
      console.log('✅ Catálogo de precios cargado');
    } catch (error) {
      console.error('❌ Error cargando planes:', error);
      throw error;
    }
  }

  /**
   * Obtener precio de un plan (móvil o hogar)
   */
  getPlanPrice(planId, type = 'mobile') {
    if (!this.planesCache) return null;

    if (type === 'mobile') {
      for (const grupo of Object.values(this.planesCache.plansMobile)) {
        const plan = grupo.planes.find(p => p.id === planId);
        if (plan) return plan.precio;
      }
    } else if (type === 'home') {
      for (const grupo of Object.values(this.planesCache.plansHome)) {
        const plan = grupo.planes.find(p => p.id === planId);
        if (plan) return plan.precio;
      }
    }
    return null;
  }

  /**
   * Obtener detalles de un plan (precio, nombre, grupo, tipo)
   */
  getPlanDetails(planId) {
    if (!this.planesCache) return null;

    for (const [grupoId, grupo] of Object.entries(this.planesCache.plansMobile || {})) {
      const plan = grupo.planes.find(p => p.id === planId);
      if (plan) return { precio: plan.precio, nombre: plan.nombre, grupoId, grupoNombre: grupo.grupo, tipo: 'mobile' };
    }
    for (const [grupoId, grupo] of Object.entries(this.planesCache.plansHome || {})) {
      const plan = grupo.planes.find(p => p.id === planId);
      if (plan) return { precio: plan.precio, nombre: plan.nombre, grupoId, grupoNombre: grupo.grupo, tipo: 'home' };
    }

    // Buscar precios por id de grupo (ej: accesorio_contado, imei_contado)
    if (this.planesCache.plansMobile && this.planesCache.plansMobile[planId]) {
      const g = this.planesCache.plansMobile[planId];
      const plan = g.planes && g.planes[0];
      if (plan) return { precio: plan.precio, nombre: plan.nombre || g.grupo, grupoId: planId, grupoNombre: g.grupo, tipo: 'mobile' };
    }

    return null;
  }

  /**
   * Obtener nombre de un plan
   */
  getPlanName(planId, type = 'mobile') {
    if (!this.planesCache) return null;

    if (type === 'mobile') {
      for (const grupo of Object.values(this.planesCache.plansMobile)) {
        const plan = grupo.planes.find(p => p.id === planId);
        if (plan) return plan.nombre;
      }
    } else if (type === 'home') {
      for (const grupo of Object.values(this.planesCache.plansHome)) {
        const plan = grupo.planes.find(p => p.id === planId);
        if (plan) return plan.nombre;
      }
    }
    return null;
  }

  /**
   * Calcular proyecciones (12 meses y fin de año)
   */
  calculateProjections(planPrice) {
    const now = new Date();
    const monthsUntilEndOfYear = 12 - now.getMonth();

    return {
      endOfYear: planPrice * monthsUntilEndOfYear,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * CREAR VENTA - Detecta automáticamente si es móvil u hogar
   */
  async createVenta(ventaData) {
    await this.ensure();

    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    try {
      // Validar que db está disponible
      if (!this.db) {
        throw new Error('Firestore no inicializado correctamente');
      }

      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Usuario no autenticado');

      // Detectar tipo de venta
      const isMobile = ventaData.tipoPedido || ventaData.numeroPedido;
      const isHome = ventaData.homeNumber || ventaData.customerName;
      const tipo = isMobile ? 'mobile' : isHome ? 'home' : null;

      if (!tipo) throw new Error('No se pudo determinar el tipo de venta');

      // Obtener precio y calcular proyecciones
      // Permitir precio 0 si el usuario lo ingresa manualmente
      let planPrice = (typeof ventaData.planPrice !== 'undefined') ? ventaData.planPrice : this.getPlanPrice(ventaData.plan, tipo);
      if (planPrice === null || typeof planPrice === 'undefined') throw new Error('Precio del plan no encontrado');

      // Forzar guardar nombre del plan
      let planNombre = ventaData.planNombre;
      if (!planNombre) {
        planNombre = this.getPlanName(ventaData.plan, tipo) || '';
      }

      // Detectar si es prepago por nombre de plan
      let tipoVenta = ventaData.tipoVenta;
      const nombreLower = (planNombre || '').toLowerCase();
      if (!tipoVenta && nombreLower.includes('prepago')) {
        tipoVenta = 'prepago';
      }

      // Preparar documento (no almacenar proyecciones para nuevas ventas)
      const fechaISO = new Date().toISOString();
      const docData = {
        ...ventaData,
        uid,
        tipo,
        planPrice,
        planNombre,
        tipoVenta, // Forzar tipoVenta si es prepago
        fecha: fechaISO, // Campo ISO para filtrado mensual
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Crear en colección correspondiente
      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      const collRef = collection(this.db, collectionName);
      const docRef = await addDoc(collRef, docData);

      // Invalidar cache
      this.invalidateCache(tipo, uid);

      console.log(`✅ Venta ${tipo} creada: ${docRef.id}`);
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error('❌ Error creando venta:', error);
      throw error;
    }
  }

  /**
   * OBTENER VENTAS - Filtra por usuario (o todas si es admin con filtro)
   * CON CACHE PARA AHORRAR LECTURAS DE FIRESTORE
   */
  async getVentas(tipo = 'mobile', filtroUID = null, forceRefresh = false) {
    await this.ensure();

    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) throw new Error('Usuario no autenticado');

      const uidAUsar = filtroUID || uid;
      const cacheKey = `ventas_${tipo}_${uidAUsar}`;
      const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

      // Verificar cache si no se forzó refresh
      if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            
            if (age < CACHE_TIME) {
              console.log(`📦 Cache hit: ${data.length} ventas ${tipo} (${Math.round(age/1000)}s ago) - AHORRO $$`);
              return data;
            } else {
              console.log(`⏰ Cache expirado (${Math.round(age/1000)}s), recargando...`);
            }
          } catch (e) {
            console.warn('⚠️ Cache corrupto, limpiando...');
            localStorage.removeItem(cacheKey);
          }
        }
      }

      // Cargar desde Firestore con LIMIT para ahorrar
      const { collection, query, where, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';

      // OPTIMIZACIÓN: Limitar a 50 ventas más recientes
      // Query sin orderBy para evitar necesidad de índice compuesto
      // (ordenaremos en memoria)
      const q = query(
        collection(this.db, collectionName), 
        where('uid', '==', uidAUsar),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const ventas = [];

      snapshot.forEach(doc => {
        ventas.push({ id: doc.id, ...doc.data() });
      });

      // Ordenar por fecha en memoria (más barato que índice de Firestore)
      ventas.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA; // Descendente (más reciente primero)
      });

      // Guardar en cache
      localStorage.setItem(cacheKey, JSON.stringify({
        data: ventas,
        timestamp: Date.now()
      }));

      console.log(`🔥 Firestore read: ${ventas.length} ventas ${tipo} cargadas${filtroUID ? ' para UID: ' + filtroUID : ''} - COSTO $$`);
      return ventas;
    } catch (error) {
      console.error('❌ Error obteniendo ventas:', error);
      throw error;
    }
  }

  /**
   * INVALIDAR CACHE cuando se crea/edita/elimina una venta
   */
  invalidateCache(tipo, uid) {
    const cacheKey = `ventas_${tipo}_${uid}`;
    localStorage.removeItem(cacheKey);
    console.log(`🗑️ Cache invalidado: ${cacheKey}`);
  }

  /**
   * OBTENER UNA VENTA POR ID
   */
  async getVenta(ventaId, tipo = 'mobile') {
    await this.ensure();

    const { collection, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    try {
      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      const docRef = doc(this.db, collectionName, ventaId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) throw new Error('Venta no encontrada');

      return { id: docSnap.id, ...docSnap.data() };
    } catch (error) {
      console.error('❌ Error obteniendo venta:', error);
      throw error;
    }
  }

  /**
   * EDITAR VENTA - Recalcula proyecciones si cambia el precio
   */
  async updateVenta(ventaId, tipo, updateData) {
    await this.ensure();

    const { collection, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    try {

      // No recalcular ni almacenar proyecciones al actualizar (proyecciones deshabilitadas)

      updateData.updatedAt = new Date().toISOString();

      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      const docRef = doc(this.db, collectionName, ventaId);

      await updateDoc(docRef, updateData);

      // Invalidar cache
      const uid = this.auth.currentUser?.uid;
      if (uid) this.invalidateCache(tipo, uid);

      console.log(`✅ Venta actualizada: ${ventaId}`);
      return { id: ventaId, ...updateData };
    } catch (error) {
      console.error('❌ Error actualizando venta:', error);
      throw error;
    }
  }

  /**
   * ELIMINAR VENTA
   */
  async deleteVenta(ventaId, tipo = 'mobile') {
    await this.ensure();

    const { collection, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    try {
      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      const docRef = doc(this.db, collectionName, ventaId);

      await deleteDoc(docRef);

      // Invalidar cache
      const uid = this.auth.currentUser?.uid;
      if (uid) this.invalidateCache(tipo, uid);

      console.log(`✅ Venta eliminada: ${ventaId}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando venta:', error);
      throw error;
    }
  }

  /**
   * CALCULAR MÉTRICAS - Total dinero y conteos
   */
  async calcularMetricas(filtroUID = null) {
    await this.ensure();

    try {
      // Obtener ventas móviles y hogar
      const ventasMobile = await this.getVentas('mobile', filtroUID);
      const ventasHome = await this.getVentas('home', filtroUID);
      const todasVentas = [...ventasMobile, ...ventasHome];

      // Calcular contadores básicos (sin proyecciones)
      let totalTerminals = 0;
      let totalAccesorios = 0;

      todasVentas.forEach(venta => {
        // Contar terminals (solo móvil)
        if (venta.imeis && Array.isArray(venta.imeis)) {
          totalTerminals += venta.imeis.length;
        }

        // Contar accesorios (solo móvil)
        if (venta.accesorios && Array.isArray(venta.accesorios)) {
          totalAccesorios += venta.accesorios.length;
        }

        // Sumar 1 accesorio por cada venta de tipo accesorio_contado o imei_contado
        if (
          (venta.tipoPedido === 'accesorio_contado' || venta.tipoPedido === 'imei_contado') &&
          (!venta.accesorios || venta.accesorios.length === 0)
        ) {
          totalAccesorios += 1;
        }
      });

      const metricas = {
        totalVentas: todasVentas.length,
        ventasMobile: ventasMobile.length,
        ventasHome: ventasHome.length,
        totalTerminals,
        totalIMEI: totalTerminals, // Alias para IMEIs
        totalAccesorios,
        totalRevenue: 0,
        calculatedAt: new Date().toISOString()
      };

      // Calcular totalRevenue: preferir campo `totalPrice` si existe en la venta,
      // si no existe, intentar reconstruir sumando planPrice + accesorios/imeis unitarios
      let totalRevenue = 0;
      let totalPrepagoRevenue = 0;
      let totalAccesorioImeiContadoRevenue = 0;
      let totalRevenueMobile = 0;
      let totalRevenueHome = 0;
      for (const v of todasVentas) {
        if (v.totalPrice) {
          const tp = Number(v.totalPrice) || 0;
          totalRevenue += tp;
          // classify by tipo (mobile/home)
          const vtipo = v.tipo || (v.homeNumber ? 'home' : 'mobile');
          if (vtipo === 'mobile') totalRevenueMobile += tp;
          else totalRevenueHome += tp;
          // breakdown
          if (v.tipoVenta === 'prepago') totalPrepagoRevenue += tp;
          if (v.tipoPedido === 'accesorio_contado' || v.tipoPedido === 'imei_contado') totalAccesorioImeiContadoRevenue += tp;
        } else {
          let value = Number(v.planPrice) || 0;
          // Si venta es accesorio_contado o imei_contado y planPrice es 0,
          // intentar obtener unit price desde catalogo
          if (v.tipoPedido === 'accesorio_contado') {
            const det = this.getPlanDetails('accesorio_contado');
            const unit = det?.precio || 0;
            value += (Array.isArray(v.accesorios) ? v.accesorios.length : 0) * unit;
          }
          if (v.tipoPedido === 'imei_contado') {
            const det = this.getPlanDetails('imei_contado');
            const unit = det?.precio || 0;
            value += (Array.isArray(v.imeis) ? v.imeis.length : 0) * unit;
          }
          // breakdown for reconstructed values
          // classify by tipo (mobile/home)
          const vtipo = v.tipo || (v.homeNumber ? 'home' : 'mobile');
          if (vtipo === 'mobile') totalRevenueMobile += value;
          else totalRevenueHome += value;
          if (v.tipoVenta === 'prepago') totalPrepagoRevenue += value;
          if (v.tipoPedido === 'accesorio_contado' || v.tipoPedido === 'imei_contado') totalAccesorioImeiContadoRevenue += value;
          totalRevenue += value;
        }
      }

      metricas.totalRevenue = totalRevenue;
      metricas.totalRevenueMobile = totalRevenueMobile;
      metricas.totalRevenueHome = totalRevenueHome;
      metricas.totalPrepagoRevenue = totalPrepagoRevenue;
      metricas.totalAccesorioImeiContadoRevenue = totalAccesorioImeiContadoRevenue;

      console.log('✅ Métricas calculadas:', metricas);
      return metricas;
    } catch (error) {
      console.error('❌ Error calculando métricas:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los grupos de planes (móvil)
   */
  getGruposMobile() {
    if (!this.planesCache) return [];
    return Object.entries(this.planesCache.plansMobile).map(([key, grupo]) => ({
      id: key,
      nombre: grupo.grupo,
      planes: grupo.planes
    }));
  }

  /**
   * Obtener todos los grupos de planes (hogar)
   */
  getGruposHome() {
    if (!this.planesCache) return [];
    return Object.entries(this.planesCache.plansHome).map(([key, grupo]) => ({
      id: key,
      nombre: grupo.grupo,
      planes: grupo.planes
    }));
  }
}

// Instancia global (No auto-inicializar, esperar a que Firebase esté listo)
const ventasManager = new VentasManager();
window.ventasManager = ventasManager; // Exponer globalmente

// Cuando Firebase esté listo, inicializar
if (window.firebaseApp) {
  ventasManager.ensure().catch(e => console.error('Error inicializando VentasManager:', e));
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VentasManager, ventasManager };
}
