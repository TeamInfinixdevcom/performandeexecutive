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
   * Marcar venta como entregada
   */
  async markVentaEntregada(ventaId, tipo = 'mobile') {
    return this.updateVenta(ventaId, tipo, { estado: 'entregado', entregadoAt: new Date().toISOString() });
  }

  /**
   * Marcar venta como cancelada
   */
  async markVentaCancelada(ventaId, tipo = 'mobile', reason = null) {
    return this.updateVenta(ventaId, tipo, { estado: 'cancelado', canceladoAt: new Date().toISOString(), cancelReason: reason });
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
      months12: planPrice * 12,
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

      // Obtener precio (no se calculan ni almacenan proyecciones)
      const planPrice = ventaData.planPrice || this.getPlanPrice(ventaData.plan, tipo);
      if (planPrice === null || planPrice === undefined) throw new Error('Precio del plan no encontrado');

      // Detectar tipoVenta automáticamente si no fue provisto (ej. 'prepago')
      if (!ventaData.tipoVenta && this.planesCache) {
        // Buscar en mobile
        for (const [grupoKey, grupo] of Object.entries(this.planesCache.plansMobile || {})) {
          const plan = grupo.planes.find(p => p.id === ventaData.plan);
          if (plan) {
            if (grupoKey === 'prepago' || ventaData.plan === 'kitprepago') {
              ventaData.tipoVenta = 'prepago';
            }
            break;
          }
        }
        // Buscar en home si aún no encontrado
        if (!ventaData.tipoVenta) {
          for (const [grupoKey, grupo] of Object.entries(this.planesCache.plansHome || {})) {
            const plan = grupo.planes.find(p => p.id === ventaData.plan);
            if (plan) {
              // No marcamos prepago en home por defecto
              break;
            }
          }
        }
      }

      // Determinar estado inicial: por defecto, si tiene IMEIs o accesorios queda 'pendiente'
      const hasImeiOrAccesorio = (ventaData.imeis && Array.isArray(ventaData.imeis) && ventaData.imeis.length > 0)
        || (ventaData.accesorios && Array.isArray(ventaData.accesorios) && ventaData.accesorios.length > 0)
        || ['imei_contado', 'accesorio_contado'].includes(ventaData.tipoPedido);

      let initialEstado = 'entregado';
      let fechaPendiente = null;

      // Si el agente indicó entrega inmediata no forzamos pendiente
      if (ventaData.estado) {
        initialEstado = ventaData.estado; // permitir override explícito
      } else if (hasImeiOrAccesorio && !ventaData.entregarInmediato) {
        // Si hay método de envío y es mensajero, marcar pendiente por defecto
        if (ventaData.metodoEnvio && ventaData.metodoEnvio === 'mensajero') {
          initialEstado = 'pendiente';
          fechaPendiente = serverTimestamp();
        } else {
          // por defecto si hay imei/accesorio lo dejamos 'pendiente' a menos que entregarInmediato true
          initialEstado = 'pendiente';
          fechaPendiente = serverTimestamp();
        }
      }

      // Preparar documento sin campo `projections`
      const docData = {
        ...ventaData,
        uid,
        tipo,
        planPrice,
        estado: initialEstado,
        fechaPendiente: fechaPendiente,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Asegurar campo canónico `executiveId` para compatibilidad con reglas
      docData.executiveId = uid;

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

      // OPTIMIZACIÓN: Limitar a 200 ventas más recientes y ordenar por createdAt
      // Si se pide `filtroUID === 'all'`, omitimos el where('uid', '==', ...) para obtener ventas de todos los usuarios (uso administrador).
      let ventas = [];

      // Add logs to debug Firestore query
      console.log('Fetching ventas for:', { tipo, filtroUID, forceRefresh });
      console.log('Cache key:', cacheKey);
      console.log('Force refresh:', forceRefresh);
      console.log('UID to use:', uidAUsar);

      if (uidAUsar === 'all') {
        const q = query(
          collection(this.db, collectionName),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => ventas.push({ id: doc.id, ...doc.data() }));
      } else {
        // Algunos documentos antiguos usan `agenteId` en lugar de `uid`.
        // Firestore no soporta OR en where(), así que hacemos dos consultas y combinamos.
        const qUid = query(
          collection(this.db, collectionName),
          where('uid', '==', uidAUsar),
          orderBy('createdAt', 'desc'),
          limit(200)
        );

        const qAgente = query(
          collection(this.db, collectionName),
          where('agenteId', '==', uidAUsar),
          orderBy('createdAt', 'desc'),
          limit(200)
        );

        const qExecutive = query(
          collection(this.db, collectionName),
          where('executiveId', '==', uidAUsar),
          orderBy('createdAt', 'desc'),
          limit(200)
        );

        const [snapUid, snapAgente, snapExecutive] = await Promise.all([
          getDocs(qUid),
          getDocs(qAgente),
          getDocs(qExecutive)
        ]);

        const seen = new Set();

        snapUid.forEach(doc => {
          seen.add(doc.id);
          ventas.push({ id: doc.id, ...doc.data() });
        });

        snapAgente.forEach(doc => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            ventas.push({ id: doc.id, ...doc.data() });
          }
        });

        snapExecutive.forEach(doc => {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            ventas.push({ id: doc.id, ...doc.data() });
          }
        });

        // Si queremos garantizar el límite total, ordenar y recortar a 200
        ventas.sort((a, b) => {
          const fechaA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const fechaB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return fechaB - fechaA;
        });

        if (ventas.length > 200) ventas = ventas.slice(0, 200);
      }

      // Add logs to debug Firestore results
      console.log('Ventas fetched:', ventas);
      console.log('Number of ventas:', ventas.length);

      // Ordenar por createdAt en memoria como fallback (en caso de formatos mixtos)
      ventas.sort((a, b) => {
        const fechaA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const fechaB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
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

    const { collection, doc, updateDoc, getDoc, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    try {
      // No se recalculan ni almacenan proyecciones al actualizar el precio
      if (updateData.planPrice) {
        // asegurar que planPrice esté presente
        updateData.planPrice = updateData.planPrice;
      }

      updateData.updatedAt = new Date().toISOString();

      const collectionName = tipo === 'mobile' ? 'ventas' : 'ventas_hogar';
      const docRef = doc(this.db, collectionName, ventaId);

      // Create an audit entry with the previous document snapshot and the intended update
      try {
        const beforeSnap = await getDoc(docRef);
        const beforeData = beforeSnap.exists() ? beforeSnap.data() : null;
        const editsColl = collection(this.db, collectionName, ventaId, 'edits');
        await addDoc(editsColl, {
          before: beforeData,
          update: updateData,
          editorUid: this.auth.currentUser?.uid || null,
          editorEmail: this.auth.currentUser?.email || null,
          timestamp: serverTimestamp()
        });
      } catch (auditErr) {
        console.warn('⚠️ No se pudo crear registro de auditoría para la venta:', auditErr);
      }

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
   * ELIMINAR VENTAS
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

      // Excluir ventas pendientes, en proceso o canceladas de métricas (no son ingresos válidos todavía)
      const ventasValidas = todasVentas.filter(v => v.estado !== 'pendiente' && v.estado !== 'en_proceso' && v.estado !== 'cancelado');

      // Calcular métricas basadas en `planPrice` (sin proyecciones)
      let totalTerminals = 0;
      let totalAccesorios = 0;
      let totalRevenue = 0;
      let totalRevenueMobile = 0;
      let totalRevenueHome = 0;
      let totalPrepagoRevenue = 0;

      // Ventas móviles (usar sólo ventas válidas para revenue/conteos)
      ventasMobile.forEach(venta => {
        if (venta.estado === 'pendiente' || venta.estado === 'cancelado') return; // ignorar
        const precio = venta.planPrice || 0;
        // No sumar accesorios/IMEI contado a revenue; tampoco sumar renovaciones (son eventos, no dinero)
        const esAccesorioOImeiContado = venta.planId === 'accesorio_contado' || venta.planId === 'imei_contado';
        const esRenovacion = venta.tipoVenta === 'renovacion' || (venta.renovacion === true);
        if (!esAccesorioOImeiContado && !esRenovacion) {
          totalRevenue += precio;
          totalRevenueMobile += precio;
          if (venta.tipoVenta === 'prepago') totalPrepagoRevenue += precio;
        }

        if (venta.imeis && Array.isArray(venta.imeis) && venta.imeis.length > 0) {
          totalTerminals += venta.imeis.length;
        } else if (venta.tipoPedido === 'imei_contado') {
          // Contabilizar 1 terminal cuando se registró como IMEI contado sin lista
          totalTerminals += 1;
        }
        if (venta.accesorios && Array.isArray(venta.accesorios) && venta.accesorios.length > 0) {
          totalAccesorios += venta.accesorios.length;
        } else if (venta.tipoPedido === 'accesorio_contado') {
          // Contabilizar 1 accesorio cuando se registró como Accesorio contado sin lista
          totalAccesorios += 1;
        }
      });

      // Ventas hogar
      ventasHome.forEach(venta => {
        if (venta.estado === 'pendiente' || venta.estado === 'cancelado') return; // ignorar
        const precio = venta.planPrice || 0;
        // No sumar accesorios/IMEI contado a revenue; tampoco sumar renovaciones
        const esAccesorioOImeiContado = venta.planId === 'accesorio_contado' || venta.planId === 'imei_contado';
        const esRenovacionHome = venta.tipoVenta === 'renovacion' || (venta.renovacion === true);
        if (!esAccesorioOImeiContado && !esRenovacionHome) {
          totalRevenue += precio;
          totalRevenueHome += precio;
          if (venta.tipoVenta === 'prepago') totalPrepagoRevenue += precio;
        }

        if (venta.imeis && Array.isArray(venta.imeis) && venta.imeis.length > 0) {
          totalTerminals += venta.imeis.length;
        } else if (venta.tipoPedido === 'imei_contado') {
          totalTerminals += 1;
        }
        if (venta.accesorios && Array.isArray(venta.accesorios) && venta.accesorios.length > 0) {
          totalAccesorios += venta.accesorios.length;
        } else if (venta.tipoPedido === 'accesorio_contado') {
          totalAccesorios += 1;
        }
      });

      const metricas = {
        totalVentas: ventasValidas.length,
        ventasMobile: ventasMobile.length,
        ventasHome: ventasHome.length,
        totalRevenue,
        totalRevenueMobile,
        totalRevenueHome,
        totalPrepagoRevenue,
        totalTerminals,
        totalIMEI: totalTerminals,
        totalAccesorios,
        calculatedAt: new Date().toISOString()
      };

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
