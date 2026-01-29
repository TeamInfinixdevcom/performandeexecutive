/**
 * ============================================================
 * PROYECCIONES
 * Análisis monetario + métricas + gráficos (Chart.js)
 * ============================================================
 */

/* =======================
   CONSTANTES GLOBALES
======================= */
const PROYECCIONES_INTERVAL_MS = 600000; // 10 minutos
const PROYECCIONES_TAB_SELECTOR = '[data-tab="proyecciones"]';

/* =======================
   CLASE PRINCIPAL DE FILTRADO POR MES Y POR FECHA
======================= */
class Proyecciones {
    // =======================
    // MÉTRICAS POR MES
    // =======================
    // =======================
// MÉTRICAS POR MES
// =======================
renderMetricasMensual() {
  const container = document.getElementById('proyeccionesMetricasMensualContainer');
  if (!container) return;

  const selectMes = document.getElementById('selectMesProyeccion');
  // Ajuste: -1 porque getMonth() devuelve 0-11
  const mes = selectMes ? parseInt(selectMes.value) - 1 : (new Date()).getMonth();
  const year = (new Date()).getFullYear();

  // Función para normalizar fechas
  function parseFecha(raw) {
    if (!raw) return null;
    if (raw.toDate) return raw.toDate(); // Firestore Timestamp
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
    // Intentar parsear formato dd/mm/yyyy
    const parts = raw.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts.map(Number);
      return new Date(yyyy, mm - 1, dd);
    }
    return null;
  }

      // Filtrar ventas por mes y año
  const ventasMobileMes = this.ventasMobile.filter(v => {
    const d = parseFecha(v.createdAt || v.fecha);
    if (!d) return false;
    return d.getMonth() === mes && d.getFullYear() === year;
  });
  const ventasHomeMes = this.ventasHome.filter(v => {
    const d = parseFecha(v.createdAt || v.fecha);
    if (!d) return false;
    return d.getMonth() === mes && d.getFullYear() === year;
  });


   // Prepago y dominio: cantidad y monto
  const ventasPrepago = ventasMobileMes.filter(v => v.tipoVenta === 'prepago');
  const ventasDominio = ventasMobileMes.filter(v => v.tipoVenta === 'dominio');
  const montoPrepago = ventasPrepago.reduce((s, v) => s + (v.planPrice || 0), 0);
  const montoDominio = ventasDominio.reduce((s, v) => s + (v.planPrice || 0), 0);
  const accesoriosVendidos = ventasMobileMes.reduce((t, v) => t + (Array.isArray(v.accesorios) ? v.accesorios.length : 0), 0);
  const imeisVendidos = ventasMobileMes.reduce((t, v) => t + (Array.isArray(v.imeis) ? v.imeis.length : 0), 0);

  const ingresoNuevas = ventasMobileMes.filter(v => v.tipoVenta === 'nueva').reduce((s, v) => s + (v.planPrice || 0), 0);
  const ingresoRenovacion = ventasMobileMes.filter(v => v.tipoVenta === 'renovacion').reduce((s, v) => s + (v.planPrice || 0), 0);
  const ingresoHogar = ventasHomeMes.reduce((s, v) => s + (v.planPrice || 0), 0);

  const totalProyeccion = ingresoNuevas + ingresoHogar + montoPrepago + montoDominio;
  const ventasNuevas = ventasMobileMes.filter(v => v.tipoVenta === 'nueva').length;
  const ventasRenovacion = ventasMobileMes.filter(v => v.tipoVenta === 'renovacion' || v.renovacion === true).length;
  const ventasHogar = ventasHomeMes.length;

  // Logs para depuración
  console.log('Selected month:', mes, 'Selected year:', year);
  console.log('Ventas Mobile for month:', ventasMobileMes);
  console.log('Ventas Home for month:', ventasHomeMes);
  console.log('Prepago sales:', ventasPrepago);
  console.log('Dominio sales:', ventasDominio);
  console.log('Monthly metrics:', {
    ingresoNuevas,
    ingresoRenovacion,
    ingresoHogar,
    montoPrepago,
    montoDominio,
    totalProyeccion,
    ventasNuevas,
    ventasRenovacion,
    ventasHogar,
    accesoriosVendidos,
    imeisVendidos
  });

      container.innerHTML = `
    <div class="grid-metricas">
      ${this._card('Ingreso Mes - Venta Nueva', ingresoNuevas, '📈', true, 'card-nueva')}
      ${this._card('Ingreso Mes - Renovación', ingresoRenovacion, '🔄', true, 'card-renovacion')}
      ${this._card('Ingreso Mes - Hogar', ingresoHogar, '🏠', true, 'card-hogar')}
      ${this._card('Ingreso Mes - Prepago', montoPrepago, '💳', true, 'card-prepago')}
      ${this._card('Ingreso Mes - Dominio', montoDominio, '🌐', true, 'card-dominio')}
      ${this._card('Ingreso Mes - Total', totalProyeccion, '🧮', true, 'card-total')}
      ${this._card('Ventas Nuevas (Mes)', ventasNuevas, '🟢', false, 'card-ventas-nueva')}
      ${this._card('Ventas Renovación (Mes)', ventasRenovacion, '🟠', false, 'card-ventas-renovacion')}
      ${this._card('Ventas Hogar (Mes)', ventasHogar, '🏠', false, 'card-ventas-hogar')}
      ${this._card('Ventas Prepago (Mes)', ventasPrepago.length, '💳', false, 'card-ventas-prepago')}
      ${this._card('Ventas Dominio (Mes)', ventasDominio.length, '🌐', false, 'card-ventas-dominio')}
      ${this._card('Accesorios Vendidos (Mes)', accesoriosVendidos, '🎁', false, 'card-accesorios')}
      ${this._card('IMEIs Vendidos (Mes)', imeisVendidos, '📱', false, 'card-imeis')}
    </div>
  `;
}
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;

    this.ventasMobile = [];
    this.ventasHome = [];

    this.charts = {};
    this.refreshInterval = null;
    this.intervalActivo = false;
    this.cargando = false;
    this.authUnsubscribe = null;

    this._initPromise = this._init();
  }

  /* =======================
     INICIALIZACIÓN
  ======================= */
  async _init() {
    try {
      this._limpiarIntervalosGlobales();

      // Esperar Firebase
      let attempts = 0;
      while ((!window.firebaseDb || !window.firebaseAuth) && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!window.firebaseDb || !window.firebaseAuth) {
        throw new Error('Firebase no disponible');
      }

      this.db = window.firebaseDb;
      this.auth = window.firebaseAuth;

      if (this.authUnsubscribe) this.authUnsubscribe();

      this.authUnsubscribe = this.auth.onAuthStateChanged(user => {
        this.currentUser = user;
        this._detenerIntervalo();

        if (user) {
          this.cargarDatos();
          this._iniciarIntervalo();
        }
      });

      console.log('✅ Proyecciones inicializado');
    } catch (err) {
      console.error('❌ Error inicializando Proyecciones:', err);
    }
  }

  async ensure() {
    await this._initPromise;
  }

  /* =======================
     INTERVALOS
  ======================= */
  _limpiarIntervalosGlobales() {
    if (window._proyeccionesIntervalId) {
      clearInterval(window._proyeccionesIntervalId);
      window._proyeccionesIntervalId = null;
    }
  }

  _iniciarIntervalo() {
    if (this.intervalActivo) return;

    this.intervalActivo = true;
    this.refreshInterval = setInterval(() => {
      if (document.hidden) return;

      const tab = document.querySelector(PROYECCIONES_TAB_SELECTOR);
      if (tab && tab.classList.contains('active')) {
        this.cargarDatos();
      }
    }, PROYECCIONES_INTERVAL_MS);

    window._proyeccionesIntervalId = this.refreshInterval;
    console.log('▶️ Intervalo Proyecciones activo');
  }

  _detenerIntervalo() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.intervalActivo = false;
    }
    this._limpiarIntervalosGlobales();
  }

  destroy() {
    this._detenerIntervalo();
    if (this.authUnsubscribe) this.authUnsubscribe();
    console.log('🗑️ Proyecciones destruido');
  }

  /* =======================
     CARGA DE DATOS
  ======================= */
  async cargarDatos() {
    if (this.cargando || !this.currentUser) return;
    if (!window.ventasManager) return;

    try {
      this.cargando = true;
      await window.ventasManager.ensure();

      // Determinar si el usuario actual es admin
let filtroUID = null;
let role = 'user'; // ← FIX

try {
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const userDocRef = doc(this.db, 'users', this.currentUser.uid);
  const userSnap = await getDoc(userDocRef);

  role = (userSnap.data()?.role || '').toLowerCase();
  if (role === 'admin') filtroUID = 'all';
} catch (roleErr) {
  console.warn('⚠️ No se pudo determinar rol de usuario, usando solo ventas propias:', roleErr);
}

this.ventasMobile = await window.ventasManager.getVentas('mobile', filtroUID, false);
this.ventasHome   = await window.ventasManager.getVentas('home', filtroUID, false);

// Logs OK
console.log('Current user ID:', this.currentUser.uid);
console.log('User role:', role);
console.log('Filter UID:', filtroUID);


      this.renderMetricas();
      this.renderCharts();
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
    } finally {
      this.cargando = false;
    }
  }

  /* =======================
     MÉTRICAS
  ======================= */
  renderMetricas() {
        // Prepago y dominio: cantidad y monto
        const ventasPrepago = this.ventasMobile.filter(v => v.tipoVenta === 'prepago');
        const ventasDominio = this.ventasMobile.filter(v => v.tipoVenta === 'dominio');
        const montoPrepago = ventasPrepago.reduce((s, v) => s + (v.planPrice || 0), 0);
        const montoDominio = ventasDominio.reduce((s, v) => s + (v.planPrice || 0), 0);
      const accesoriosVendidos = this.calcularAccesoriosVendidos();
      const imeisVendidos = this.calcularTerminalesVendidos();
    const container = document.getElementById('proyeccionesMetricasContainer');
    if (!container) return;

    const ingresoNuevas = this._ingresoMobilePorTipo('nueva');
    const ingresoRenovacion = this._ingresoMobilePorTipo('renovacion');
    const ingresoHogar = this._ingresoHome();
    // No incluir renovaciones en el total monetario
    const totalProyeccion = ingresoNuevas + ingresoHogar;
    const ventasNuevas = this.ventasMobile.filter(v => v.tipoVenta === 'nueva').length;
    const ventasRenovacion = this.ventasMobile.filter(v => v.tipoVenta === 'renovacion' || v.renovacion === true).length;
    const ventasHogar = this.ventasHome.length;

    container.innerHTML = `
      <div class="grid-metricas">
        ${this._card('Ingreso Mensual - Venta Nueva', ingresoNuevas, '📈', true, 'card-nueva')}
        ${this._card('Ingreso Mensual - Renovación', ingresoRenovacion, '🔄', true, 'card-renovacion')}
        ${this._card('Ingreso Mensual - Hogar', ingresoHogar, '🏠', true, 'card-hogar')}
        ${this._card('Ingreso Mensual - Prepago', montoPrepago, '💳', true, 'card-prepago')}
        ${this._card('Ingreso Mensual - Dominio', montoDominio, '🌐', true, 'card-dominio')}
        ${this._card('Ingreso Mensual - Total', totalProyeccion, '🧮', true, 'card-total')}
        ${this._card('Ventas Nuevas (Venta Nueva)', ventasNuevas, '🟢', false, 'card-ventas-nueva')}
        ${this._card('Ventas Renovación (Renovación)', ventasRenovacion, '🟠', false, 'card-ventas-renovacion')}
        ${this._card('Ventas Hogar', ventasHogar, '🏠', false, 'card-ventas-hogar')}
        ${this._card('Ventas Prepago', ventasPrepago.length, '💳', false, 'card-ventas-prepago')}
        ${this._card('Ventas Dominio', ventasDominio.length, '🌐', false, 'card-ventas-dominio')}
        ${this._card('Accesorios Vendidos', accesoriosVendidos, '🎁', false, 'card-accesorios')}
        ${this._card('IMEIs Vendidos', imeisVendidos, '📱', false, 'card-imeis')}
      </div>
    `;
  }

  _card(title, value, icon, currency = true, extraClass = '') {
    return `
      <div class="card ${extraClass}">
        <h4>${title}</h4>
        <h2>${currency ? '₡' + value.toLocaleString() : value}</h2>
        <span>${icon}</span>
      </div>
    `;
  }

  /* =======================
     GRÁFICOS
  ======================= */
  renderCharts() {
    const container = document.getElementById('proyeccionesChartsContainer');
    if (!container || typeof Chart === 'undefined') return;

    container.innerHTML = `
      <div class="charts-card">
        <canvas id="chartIngresos"></canvas>
      </div>
      <div class="charts-card">
        <canvas id="chartProyeccion"></canvas>
      </div>
    `;

    setTimeout(() => {
      this._graficoIngresos();
      this._graficoProyeccion();
    }, 50);
  }

  _graficoIngresos() {
    const ctx = document.getElementById('chartIngresos');
    if (!ctx) return;
    if (this.charts.ingresos) this.charts.ingresos.destroy();

    this.charts.ingresos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Móvil', 'Hogar'],
        datasets: [{
          data: [this._ingresoMobileTotal(), this._ingresoHome()],
          backgroundColor: ['#667eea', '#f093fb']
        }]
      }
    });
  }

  _graficoProyeccion() {
    const ctx = document.getElementById('chartProyeccion');
    if (!ctx) return;
    if (this.charts.proyeccion) this.charts.proyeccion.destroy();

    const meses = [];
    const valores = [];
    let base = this.calcularIngresoTotal();

    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      meses.push(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
      valores.push(Math.round(base * (1 + i * 0.05)));
    }

    this.charts.proyeccion = new Chart(ctx, {
      type: 'line',
      data: {
        labels: meses,
        datasets: [{
          label: 'Ingreso Proyectado',
          data: valores,
          borderColor: '#4facfe',
          fill: true
        }]
      }
    });
  }

  /* =======================
     CÁLCULOS
  ======================= */
  _ingresoMobilePorTipo(tipo) {
    return this.ventasMobile
      .filter(v => {
        if (tipo === 'renovacion') return v.tipoVenta === 'renovacion' || v.renovacion === true;
        return v.tipoVenta === tipo;
      })
      .reduce((s, v) => s + (v.planPrice || 0), 0);
  }

  _ingresoMobileTotal() {
    // Excluir renovaciones del total monetario (las renovaciones son eventos, no ingreso)
    return this.ventasMobile.reduce((s, v) => s + ((v.tipoVenta === 'renovacion') ? 0 : (v.planPrice || 0)), 0);
  }

  _ingresoHome() {
    return this.ventasHome.reduce((s, v) => s + (v.planPrice || 0), 0);
  }

  calcularIngresoTotal() {
    return this._ingresoMobileTotal() + this._ingresoHome();
  }

  calcularTerminalesVendidos() {
    return this.ventasMobile.reduce((t, v) => t + (Array.isArray(v.imeis) ? v.imeis.length : 0), 0);
  }

  calcularAccesoriosVendidos() {
    return this.ventasMobile.reduce((t, v) => t + (Array.isArray(v.accesorios) ? v.accesorios.length : 0), 0);
  }

  /* =======================
     API PÚBLICA
  ======================= */
  actualizarDatos(force = false) {
    if (force) return this.cargarDatos();

    const tab = document.querySelector(PROYECCIONES_TAB_SELECTOR);
    if (tab && tab.classList.contains('active')) {
      this.cargarDatos();
    }
  }
}

/* =======================
   INSTANCIA GLOBAL
======================= */
window.app = window.app || {};
window.app.proyecciones = new Proyecciones();

console.log('✅ Proyecciones cargado correctamente');
