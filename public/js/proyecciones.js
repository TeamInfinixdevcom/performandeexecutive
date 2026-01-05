/**
 * PROYECCIONES - Análisis monetario y gráficos de ingresos
 */

class Proyecciones {
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

  async _init() {
    try {
      // LIMPIEZA AGRESIVA: Destruir CUALQUIER intervalo anterior
      if (window._proyeccionesIntervalId) {
        clearInterval(window._proyeccionesIntervalId);
        window._proyeccionesIntervalId = null;
        console.log('🧹 Intervalo anterior limpiado');
      }

      // Esperar a que Firebase global esté disponible
      let attempts = 0;
      while ((!window.firebaseDb || !window.firebaseAuth) && attempts < 100) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!window.firebaseDb || !window.firebaseAuth) {
        throw new Error('Firebase no inicializado en window');
      }

      this.db = window.firebaseDb;
      this.auth = window.firebaseAuth;

      // Desuscribir listener anterior si existe
      if (this.authUnsubscribe) {
        this.authUnsubscribe();
      }

      // Registrar listener de autenticación (solo UNA VEZ)
      this.authUnsubscribe = this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        
        // Detener intervalo anterior SIEMPRE
        if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
          this.refreshInterval = null;
          this.intervalActivo = false;
          console.log('🛑 Intervalo anterior detenido');
        }

        if (user) {
          this.cargarDatos();
          
          // Solo crear intervalo si NO hay uno activo
          if (!this.intervalActivo) {
            this.intervalActivo = true;
            this.refreshInterval = setInterval(() => {
              // Solo ejecutar si:
              // 1. El intervalo está activo
              // 2. La pestaña de Proyecciones está visible
              // 3. La página del navegador está visible (no en background)
              if (this.intervalActivo && !document.hidden) {
                const proyeccionesTab = document.querySelector('[data-tab="proyecciones"]');
                if (proyeccionesTab && proyeccionesTab.classList.contains('active')) {
                  console.log('⏰ Intervalo disparado cada 5s');
                  this.cargarDatos();
                } else {
                  console.log('⏭️ Intervalo skip: pestaña no activa');
                }
              }
            }, 5000);
            
            // Guardar ID globalmente para poder limpiarlo
            window._proyeccionesIntervalId = this.refreshInterval;
            console.log('▶️ Intervalo inteligente creado con ID:', this.refreshInterval);
          } else {
            console.warn('⚠️ Ya hay un intervalo activo, NO se creará otro');
          }
        }
      });

      console.log('✅ Proyecciones inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Proyecciones:', error);
    }
  }

  async ensure() {
    await this._initPromise;
  }

  /**
   * Destruir la instancia y limpiar recursos
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.intervalActivo = false;
    }
    if (window._proyeccionesIntervalId) {
      clearInterval(window._proyeccionesIntervalId);
      window._proyeccionesIntervalId = null;
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    console.log('🗑️ Proyecciones: recursos liberados completamente');
  }

  /**
   * Pausar la actualización automática (cuando se cambia de pestaña)
   */
  pausarActualizacion() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.intervalActivo = false;
      if (window._proyeccionesIntervalId) {
        clearInterval(window._proyeccionesIntervalId);
        window._proyeccionesIntervalId = null;
      }
      console.log('⏸️ Proyecciones: actualización pausada');
    }
  }

  /**
   * Reanudar la actualización automática
   */
  reanudarActualizacion() {
    if (!this.intervalActivo && this.currentUser) {
      this.intervalActivo = true;
      this.refreshInterval = setInterval(() => {
        // Solo ejecutar si la página está visible y la pestaña está activa
        if (this.intervalActivo && !document.hidden) {
          const proyeccionesTab = document.querySelector('[data-tab="proyecciones"]');
          if (proyeccionesTab && proyeccionesTab.classList.contains('active')) {
            this.cargarDatos();
          }
        }
      }, 5000);
      
      // Guardar ID globalmente
      window._proyeccionesIntervalId = this.refreshInterval;
      console.log('▶️ Proyecciones: actualización reanudada con ID:', this.refreshInterval);
    }
    // Silenciosamente ignorar si ya está activo (no es un error)
  }

  /**
   * Cargar datos de ventas
   */
  async cargarDatos() {
    try {
      // Evitar cargas simultáneas
      if (this.cargando) {
        console.log('⏳ Proyecciones: carga ya en progreso, ignorando');
        return;
      }

      if (!this.currentUser) return;

      if (!window.ventasManager) {
        console.warn('⚠️ VentasManager no disponible');
        return;
      }

      this.cargando = true;

      await window.ventasManager.ensure();

      console.log('🔄 Proyecciones: cargando datos...', { 
        intervalActivo: this.intervalActivo,
        intervalID: this.refreshInterval,
        currentUser: this.currentUser?.email 
      });

      // Cargar ventas
      this.ventasMobile = await window.ventasManager.getVentas('mobile');
      this.ventasHome = await window.ventasManager.getVentas('home');

      // Renderizar
      this.renderMetricas();
      this.renderCharts();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Renderizar tarjetas de métricas
   */
  renderMetricas() {
    const container = document.getElementById('proyeccionesMetricasContainer');
    if (!container) return;

    const totalVentas = this.ventasMobile.length + this.ventasHome.length;
    const ingresoTotal = this.calcularIngresoTotal();
    const proyeccion12m = this.calcularProyeccion12m();
    const proyeccionFinAno = this.calcularProyeccionFinAno();
    const terminalesVendidos = this.calcularTerminalesVendidos();
    const accesoriosVendidos = this.calcularAccesoriosVendidos();

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 32px;">
        <!-- Métrica: Total de Ventas -->
        <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Total de Ventas</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">${totalVentas}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                ${this.ventasMobile.length} móvil + ${this.ventasHome.length} hogar
              </p>
            </div>
            <div style="font-size: 2.5em;">💰</div>
          </div>
        </div>

        <!-- Métrica: Ingreso Total Actual -->
        <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Ingreso Total Mensual</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">₡${ingresoTotal.toLocaleString()}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                Por cada mes de vigencia
              </p>
            </div>
            <div style="font-size: 2.5em;">📊</div>
          </div>
        </div>

        <!-- Métrica: Proyección 12 Meses -->
        <div class="card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Proyección 12 Meses</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">₡${proyeccion12m.toLocaleString()}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                Ingresos estimados
              </p>
            </div>
            <div style="font-size: 2.5em;">📈</div>
          </div>
        </div>

        <!-- Métrica: Proyección Fin de Año -->
        <div class="card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Proyección Fin de Año</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">₡${proyeccionFinAno.toLocaleString()}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                Hasta diciembre 2026
              </p>
            </div>
            <div style="font-size: 2.5em;">🎯</div>
          </div>
        </div>

        <!-- Métrica: Terminales Vendidos (IMEIs) -->
        <div class="card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Terminales Vendidos</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">${terminalesVendidos}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                IMEIs registrados
              </p>
            </div>
            <div style="font-size: 2.5em;">📱</div>
          </div>
        </div>

        <!-- Métrica: Accesorios Vendidos -->
        <div class="card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: white; padding: 24px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9em;">Accesorios Vendidos</p>
              <h3 style="margin: 8px 0 0 0; font-size: 2.5em;">${accesoriosVendidos}</h3>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 0.9em;">
                Artículos complementarios
              </p>
            </div>
            <div style="font-size: 2.5em;">🎁</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar gráficos
   */
  renderCharts() {
    const container = document.getElementById('proyeccionesChartsContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
        <!-- Gráfico: Ingresos por Tipo de Venta -->
        <div class="card" style="padding: 24px;">
          <h3 style="margin-top: 0;">💵 Ingresos por Tipo de Venta</h3>
          <canvas id="chartIngresosPorTipo" style="max-height: 300px;"></canvas>
        </div>

        <!-- Gráfico: Distribución de Planes -->
        <div class="card" style="padding: 24px;">
          <h3 style="margin-top: 0;">📱 Planes Más Vendidos (Top 5)</h3>
          <canvas id="chartPlanesMasVendidos" style="max-height: 300px;"></canvas>
        </div>

        <!-- Gráfico: Proyección Mensual -->
        <div class="card" style="padding: 24px;">
          <h3 style="margin-top: 0;">📆 Ingresos Proyectados por Mes (12 Meses)</h3>
          <canvas id="chartProyeccionMensual" style="max-height: 300px;"></canvas>
        </div>

        <!-- Gráfico: Evolución Acumulada -->
        <div class="card" style="padding: 24px;">
          <h3 style="margin-top: 0;">📊 Ingresos Acumulados</h3>
          <canvas id="chartIngresoAcumulado" style="max-height: 300px;"></canvas>
        </div>
      </div>
    `;

    // Inicializar gráficos después de que el DOM esté listo
    setTimeout(() => {
      this.crearGraficoIngresosPorTipo();
      this.crearGraficoPlanesMasVendidos();
      this.crearGraficoProyeccionMensual();
      this.crearGraficoIngresoAcumulado();
    }, 100);
  }

  /**
   * Gráfico 1: Ingresos por tipo de venta (Doughnut)
   */
  crearGraficoIngresosPorTipo() {
    const canvas = document.getElementById('chartIngresosPorTipo');
    if (!canvas) return;

    // Destruir gráfico anterior si existe
    if (this.charts.ingresosPorTipo) this.charts.ingresosPorTipo.destroy();

    const ingresoMobile = this.ventasMobile.reduce((sum, v) => sum + (v.planPrice || 0), 0);
    const ingresoHome = this.ventasHome.reduce((sum, v) => sum + (v.planPrice || 0), 0);

    this.charts.ingresosPorTipo = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['📱 Ventas Móvil', '🏠 Ventas Hogar'],
        datasets: [{
          data: [ingresoMobile, ingresoHome],
          backgroundColor: ['#667eea', '#f093fb'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = ingresoMobile + ingresoHome;
                const percent = ((value / total) * 100).toFixed(1);
                return `₡${value.toLocaleString()} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico 2: Planes más vendidos (Horizontal Bar)
   */
  crearGraficoPlanesMasVendidos() {
    const canvas = document.getElementById('chartPlanesMasVendidos');
    if (!canvas) return;

    if (this.charts.planesMasVendidos) this.charts.planesMasVendidos.destroy();

    // Agrupar por plan y contar
    const planesCounts = {};
    [...this.ventasMobile, ...this.ventasHome].forEach(venta => {
      const planName = venta.planName || venta.planId || 'Sin nombre';
      const price = venta.planPrice || 0;
      if (!planesCounts[planName]) {
        planesCounts[planName] = { count: 0, totalIngresos: 0 };
      }
      planesCounts[planName].count++;
      planesCounts[planName].totalIngresos += price;
    });

    // Top 5
    const top5 = Object.entries(planesCounts)
      .sort((a, b) => b[1].totalIngresos - a[1].totalIngresos)
      .slice(0, 5);

    const labels = top5.map(([name]) => name);
    const ingresos = top5.map(([, data]) => data.totalIngresos);
    const counts = top5.map(([, data]) => data.count);

    this.charts.planesMasVendidos = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ingresos Totales',
          data: ingresos,
          backgroundColor: '#43e97b',
          borderColor: '#38f9d7',
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const idx = context.dataIndex;
                const value = context.parsed.x;
                return `₡${value.toLocaleString()} (${counts[idx]} ventas)`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              callback: function(value) {
                return '₡' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico 3: Proyección mensual (12 meses)
   */
  crearGraficoProyeccionMensual() {
    const canvas = document.getElementById('chartProyeccionMensual');
    if (!canvas) return;

    if (this.charts.proyeccionMensual) this.charts.proyeccionMensual.destroy();

    // Generar proyección para los próximos 12 meses
    const hoy = new Date(2026, 0, 4); // Enero 4, 2026
    const meses = [];
    const proyecciones = [];

    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const monthName = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      meses.push(monthName);
      proyecciones.push(this.calcularIngresoTotal());
    }

    this.charts.proyeccionMensual = new Chart(canvas, {
      type: 'line',
      data: {
        labels: meses,
        datasets: [{
          label: 'Ingresos Proyectados',
          data: proyecciones,
          borderColor: '#4facfe',
          backgroundColor: 'rgba(79, 172, 254, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00f2fe',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '₡' + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '₡' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  /**
   * Gráfico 4: Ingreso acumulado
   */
  crearGraficoIngresoAcumulado() {
    const canvas = document.getElementById('chartIngresoAcumulado');
    if (!canvas) return;

    if (this.charts.ingresoAcumulado) this.charts.ingresoAcumulado.destroy();

    const hoy = new Date(2026, 0, 4);
    const meses = [];
    const acumulados = [];
    let acumulado = 0;

    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const monthName = fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      meses.push(monthName);
      acumulado += this.calcularIngresoTotal();
      acumulados.push(acumulado);
    }

    this.charts.ingresoAcumulado = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: meses,
        datasets: [{
          label: 'Ingresos Acumulados',
          data: acumulados,
          backgroundColor: '#f5576c',
          borderColor: '#f093fb',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: undefined,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '₡' + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return '₡' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  /**
   * Cálculos monetarios
   */
  calcularIngresoTotal() {
    return [...this.ventasMobile, ...this.ventasHome].reduce((sum, v) => sum + (v.planPrice || 0), 0);
  }

  calcularProyeccion12m() {
    return this.calcularIngresoTotal() * 12;
  }

  calcularProyeccionFinAno() {
    // Desde enero a diciembre = 12 meses
    return this.calcularIngresoTotal() * 12;
  }

  /**
   * Calcular terminales vendidos (IMEIs)
   */
  calcularTerminalesVendidos() {
    return this.ventasMobile.reduce((total, venta) => {
      const imeis = Array.isArray(venta.imeis) ? venta.imeis.length : 0;
      return total + imeis;
    }, 0);
  }

  /**
   * Calcular accesorios vendidos
   */
  calcularAccesoriosVendidos() {
    return this.ventasMobile.reduce((total, venta) => {
      const accesorios = Array.isArray(venta.accesorios) ? venta.accesorios.length : 0;
      return total + accesorios;
    }, 0);
  }

  /**
   * Método público para actualizar desde otras clases
   */
  actualizarDatos() {
    // Solo cargar si estamos en la pestaña de proyecciones
    const proyeccionesTab = document.querySelector('[data-tab="proyecciones"]');
    if (proyeccionesTab && proyeccionesTab.classList.contains('active')) {
      this.cargarDatos();
      console.log('🔄 Proyecciones actualizadas manualmente (pestaña activa)');
    } else {
      console.log('⏭️ Proyecciones: actualización omitida (pestaña no activa)');
    }
  }
}

// Crear instancia global
window.proyecciones = new Proyecciones();

console.log('✅ Proyecciones cargado globalmente');
