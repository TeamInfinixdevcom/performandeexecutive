/**
 * DASHBOARD DE OBJETIVOS Y VENTAS
 * Gráficas y métricas consolidadas
 */

class ObjetivosDashboard {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.charts = {};
    this.authUnsubscribe = null;
    this.cargando = false;
    this._initPromise = this._init();
  }

  async _init() {
    try {
      if (window.db) {
        this.db = window.db;
      }
      if (window.auth) {
        this.auth = window.auth;
        
        // Desuscribir listener anterior si existe
        if (this.authUnsubscribe) {
          this.authUnsubscribe();
        }
        
        this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          if (user) this.loadMetricas();
        });
      }
      console.log('✅ ObjetivosDashboard inicializado');
    } catch (error) {
      console.error('❌ Error inicializando ObjetivosDashboard:', error);
    }
  }

  async ensure() {
    await this._initPromise;
  }

  /**
   * Cargar todas las métricas
   */
  async loadMetricas() {
    try {
      // Evitar cargas simultáneas
      if (this.cargando) {
        console.log('⏳ ObjetivosDashboard: carga en progreso, ignorando');
        return;
      }
      
      if (!this.currentUser) return;

      this.cargando = true;

      // Cargar ventas móviles y hogar
      if (!window.ventasManager) {
        console.warn('⚠️ VentasManager no disponible');
        this.cargando = false;
        return;
      }

      await window.ventasManager.ensure();

      const ventasMobile = await window.ventasManager.getVentas('mobile', this.currentUser.uid);
      const ventasHome = await window.ventasManager.getVentas('home', this.currentUser.uid);

      this.renderMetricas(ventasMobile, ventasHome);
      this.renderCharts(ventasMobile, ventasHome);
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Renderizar tarjetas de KPI
   */
  renderMetricas(ventasMobile, ventasHome) {
    const container = document.getElementById('objetivosMetricasContainer');
    if (!container) return;

    // Calcular métricas
    const totalVentas = ventasMobile.length + ventasHome.length;
    const proyeccion12m = this.calcularProyeccion12m(ventasMobile, ventasHome);
    const terminalesVendidos = this.calcularTerminales(ventasMobile);
    const accesoriosVendidos = this.calcularAccesorios(ventasMobile);

    const html = `
      <!-- KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- Total Ventas -->
        <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">Total Ventas</div>
          <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 4px;">${totalVentas}</div>
          <div style="font-size: 0.85em; opacity: 0.85;">Móvil: ${ventasMobile.length} | Hogar: ${ventasHome.length}</div>
        </div>

        <!-- Proyección 12 Meses eliminada del UI -->

        <!-- Terminales Vendidos -->
        <div class="card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">📱 Terminales Vendidos</div>
          <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 4px;">${terminalesVendidos}</div>
          <div style="font-size: 0.85em; opacity: 0.85;">Teléfonos registrados</div>
        </div>

        <!-- Accesorios Vendidos -->
        <div class="card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 8px;">🎁 Accesorios Vendidos</div>
          <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 4px;">${accesoriosVendidos}</div>
          <div style="font-size: 0.85em; opacity: 0.85;">Accesorios registrados</div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Renderizar gráficas
   */
  renderCharts(ventasMobile, ventasHome) {
    const container = document.getElementById('objetivosChartsContainer');
    if (!container) return;

    container.innerHTML = `
      <!-- Gráficas -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 24px;">
        <!-- Gráfica 1: Móvil vs Hogar -->
        <div class="card" style="padding: 16px;">
          <h3 style="margin-top: 0; margin-bottom: 16px;">📊 Ventas por Tipo</h3>
          <canvas id="chartTipoVentas" style="max-height: 300px;"></canvas>
        </div>

        <!-- Gráfica de Proyección eliminada del UI -->

        <!-- Gráfica 3: Top Planes Móviles -->
        <div class="card" style="padding: 16px;">
          <h3 style="margin-top: 0; margin-bottom: 16px;">📱 Top Planes Móviles</h3>
          <canvas id="chartPlanesMobile" style="max-height: 300px;"></canvas>
        </div>

        <!-- Gráfica 4: Top Planes Hogar -->
        <div class="card" style="padding: 16px;">
          <h3 style="margin-top: 0; margin-bottom: 16px;">🏠 Top Planes Hogar</h3>
          <canvas id="chartPlansHome" style="max-height: 300px;"></canvas>
        </div>
      </div>
    `;

    // Inicializar gráficas cuando esté disponible Chart.js
    setTimeout(() => this.initCharts(ventasMobile, ventasHome), 100);
  }

  /**
   * Inicializar gráficas con Chart.js
   */
  initCharts(ventasMobile, ventasHome) {
    if (!window.Chart) {
      console.warn('⚠️ Chart.js no disponible');
      return;
    }

    // Gráfica 1: Móvil vs Hogar
    this.createChartTipoVentas(ventasMobile, ventasHome);

    // Gráfica 2: Proyecciones eliminada del UI (no se crea)

    // Gráfica 3: Top Planes Móviles
    this.createChartPlanesMobile(ventasMobile);

    // Gráfica 4: Top Planes Hogar
    this.createChartPlansHome(ventasHome);
  }

  /**
   * Gráfica: Móvil vs Hogar
   */
  createChartTipoVentas(ventasMobile, ventasHome) {
    const canvas = document.getElementById('chartTipoVentas');
    if (!canvas) return;

    if (this.charts.tipoVentas) {
      this.charts.tipoVentas.destroy();
    }

    this.charts.tipoVentas = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['📱 Móvil', '🏠 Hogar'],
        datasets: [{
          data: [ventasMobile.length, ventasHome.length],
          backgroundColor: ['#667eea', '#f5576c'],
          borderColor: ['#667eea', '#f5576c'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  /**
   * Gráfica: Proyecciones 12m vs EndOfYear
   */
  createChartProyecciones(ventasMobile, ventasHome) {
    const canvas = document.getElementById('chartProyecciones');
    if (!canvas) return;

    if (this.charts.proyecciones) {
      this.charts.proyecciones.destroy();
    }

    const proyeccion12m = this.calcularProyeccion12m(ventasMobile, ventasHome);
    const proyeccionEndYear = this.calcularProyeccionEndYear(ventasMobile, ventasHome);

    this.charts.proyecciones = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['12 Meses', 'Fin de Año'],
        datasets: [{
          label: 'Proyección ₡',
          data: [proyeccion12m, proyeccionEndYear],
          backgroundColor: ['#f093fb', '#43e97b'],
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'x',
        plugins: {
          legend: {
            display: true,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₡' + value.toLocaleString();
              },
            },
          },
        },
      },
    });
  }

  /**
   * Gráfica: Top Planes Móviles
   */
  createChartPlanesMobile(ventasMobile) {
    const canvas = document.getElementById('chartPlanesMobile');
    if (!canvas) return;

    if (this.charts.planesMobile) {
      this.charts.planesMobile.destroy();
    }

    // Contar por plan
    const planesCounts = {};
    ventasMobile.forEach(venta => {
      const planName = venta.planName || venta.planId || 'Desconocido';
      planesCounts[planName] = (planesCounts[planName] || 0) + 1;
    });

    const sortedPlanes = Object.entries(planesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    this.charts.planesMobile = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sortedPlanes.map(p => p[0]),
        datasets: [{
          label: 'Cantidad Vendida',
          data: sortedPlanes.map(p => p[1]),
          backgroundColor: '#4facfe',
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Gráfica: Top Planes Hogar
   */
  createChartPlansHome(ventasHome) {
    const canvas = document.getElementById('chartPlansHome');
    if (!canvas) return;

    if (this.charts.plansHome) {
      this.charts.plansHome.destroy();
    }

    // Contar por plan
    const planesCounts = {};
    ventasHome.forEach(venta => {
      const planName = venta.planName || venta.planId || 'Desconocido';
      planesCounts[planName] = (planesCounts[planName] || 0) + 1;
    });

    const sortedPlanes = Object.entries(planesCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    this.charts.plansHome = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sortedPlanes.map(p => p[0]),
        datasets: [{
          label: 'Cantidad Vendida',
          data: sortedPlanes.map(p => p[1]),
          backgroundColor: '#f5576c',
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Calcular proyección 12 meses
   */
  calcularProyeccion12m(ventasMobile, ventasHome) {
    let total = 0;
    [...ventasMobile, ...ventasHome].forEach(venta => {
      const precio = venta.planPrice || 0;
      total += precio * 12;
    });
    return total;
  }

  /**
   * Calcular proyección fin de año
   */
  calcularProyeccionEndYear(ventasMobile, ventasHome) {
    let total = 0;
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();

    [...ventasMobile, ...ventasHome].forEach(venta => {
      const precio = venta.planPrice || 0;
      total += precio * monthsRemaining;
    });
    return total;
  }

  /**
   * Calcular total de terminales
   */
  calcularTerminales(ventasMobile) {
    let total = 0;
    ventasMobile.forEach(venta => {
      if (venta.imeis && Array.isArray(venta.imeis) && venta.imeis.length > 0) {
        total += venta.imeis.length;
      } else if (venta.tipoPedido === 'imei_contado') {
        // Contabilizar 1 terminal si se registró como IMEI contado sin lista
        total += 1;
      }
    });
    return total;
  }

  /**
   * Calcular total de accesorios
   */
  calcularAccesorios(ventasMobile) {
    let total = 0;
    ventasMobile.forEach(venta => {
      if (venta.accesorios && Array.isArray(venta.accesorios) && venta.accesorios.length > 0) {
        total += venta.accesorios.length;
      } else if (venta.tipoPedido === 'accesorio_contado') {
        // Contabilizar 1 accesorio si se registró como Accesorio contado sin lista
        total += 1;
      }
    });
    return total;
  }

  /**
   * Refrescar todas las métricas
   */
  refresh() {
    this.loadMetricas();
  }
}

// Inicializar globalmente
window.objetivosDashboard = new ObjetivosDashboard();
console.log('✅ ObjetivosDashboard cargado globalmente');
