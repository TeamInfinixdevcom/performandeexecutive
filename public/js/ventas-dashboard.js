/**
 * VENTAS DASHBOARD - Dashboard de métricas por dinero (proyecciones)
 * Integrado en pestaña de Métricas Ejecutivo
 */

class VentasDashboard {
  constructor() {
    this.ventasManager = window.ventasManager;
    this.metricas = null;
    this.currentSubTab = 'dashboard'; // 'dashboard' o 'historial'
    this.isAdmin = false;
    this.allUsers = [];
    this.selectedUserUID = null; // UID del usuario filtrado (si es admin)
  }

  /**
   * Inicializar dashboard
   */
  async init() {
    try {
      await this.ventasManager.ensure();
      
      // Detectar si es admin
      const auth = window.auth || this.ventasManager.auth;
      const user = auth?.currentUser;
      if (user) {
        const userDoc = await this.getUserDoc(user.uid);
        this.isAdmin = userDoc?.role === 'admin';
      }

      // Cargar lista de usuarios si es admin
      if (this.isAdmin) {
        await this.loadAllUsers();
      }

      this.setupSubTabs();
      await this.loadMetricas();
      console.log('✅ VentasDashboard inicializado (Admin: ' + this.isAdmin + ')');

      // Escuchar cuando se crea una nueva venta
      window.addEventListener('ventaCreada', () => this.loadMetricas());
    } catch (error) {
      console.error('❌ Error inicializando VentasDashboard:', error);
    }
  }

  /**
   * Obtener documento del usuario desde Firestore
   */
  async getUserDoc(uid) {
    try {
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js');
      const userRef = doc(this.ventasManager.db, 'users', uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      return null;
    }
  }

  /**
   * Cargar lista de todos los usuarios (solo para admin)
   */
  async loadAllUsers() {
    try {
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js');
      const usersRef = collection(this.ventasManager.db, 'users');
      const snapshot = await getDocs(usersRef);
      
      this.allUsers = [];
      snapshot.forEach(doc => {
        this.allUsers.push({
          uid: doc.id,
          email: doc.data().email,
          displayName: doc.data().displayName,
          region: doc.data().region
        });
      });

      // Renderizar selector de usuarios
      this.renderUserSelector();
      
      console.log('✅ ' + this.allUsers.length + ' usuarios cargados');
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
    }
  }

  /**
   * Renderizar selector de usuarios (solo para admin)
   */
  renderUserSelector() {
    const container = document.getElementById('adminUserFilterContainer');
    if (!container) return;

    let html = `
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196F3;">
        <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #1976D2;">👤 Ver Ventas De:</label>
        <div style="display: flex; gap: 10px;">
          <select id="adminUserFilter" style="flex: 1; padding: 10px; border: 1px solid #2196F3; border-radius: 6px; font-size: 14px;">
            <option value="">-- MIS VENTAS --</option>
    `;

    // Agregar cada usuario
    this.allUsers.forEach(user => {
      html += `<option value="${user.uid}">${user.displayName || user.email} (${user.region || 'Sin región'})</option>`;
    });

    html += `
          </select>
          <button onclick="ventasDashboard.onUserFilterChange()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🔍 Filtrar</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Cambiar filtro de usuario (admin)
   */
  async onUserFilterChange() {
    const select = document.getElementById('adminUserFilter');
    this.selectedUserUID = select?.value || null;
    await this.loadMetricas();
  }

  /**
   * Setup de sub-pestañas
   */
  setupSubTabs() {
    const dashboardBtn = document.getElementById('subTabDashboard');
    const historialBtn = document.getElementById('subTabHistorial');

    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.switchSubTab('dashboard'));
    }
    if (historialBtn) {
      historialBtn.addEventListener('click', () => this.switchSubTab('historial'));
    }
  }

  /**
   * Cambiar sub-pestaña
   */
  switchSubTab(tab) {
    this.currentSubTab = tab;

    // Actualizar botones activos
    document.getElementById('subTabDashboard')?.classList.toggle('active', tab === 'dashboard');
    document.getElementById('subTabHistorial')?.classList.toggle('active', tab === 'historial');

    // Mostrar/ocultar secciones
    document.getElementById('ventasDashboardContent')?.style.display = tab === 'dashboard' ? 'block' : 'none';
    document.getElementById('ventasHistorialContent')?.style.display = tab === 'historial' ? 'block' : 'none';

    // Inicializar contenido si es necesario
    if (tab === 'historial' && window.salesList) {
      window.salesList.init();
    }
  }

  /**
   * Cargar métricas del usuario actual (o filtrado si es admin)
   */
  async loadMetricas() {
    try {
      // Si es admin y hay un usuario seleccionado, cargar esas métricas
      const filtroUID = this.selectedUserUID;
      this.metricas = await this.ventasManager.calcularMetricas(filtroUID);
      this.renderDashboard();
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
    }
  }

  /**
   * Renderizar dashboard de métricas
   */
  renderDashboard() {
    if (!this.metricas) return;

    const container = document.getElementById('ventasDashboardMetricas');
    if (!container) return;

    const { totalVentas, totalProjectionEndOfYear, totalTerminals, totalAccesorios, totalRevenue, totalPrepagoRevenue } = this.metricas;

    container.innerHTML = `
      <!-- TARJETAS DE MÉTRICAS POR DINERO -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
        
        <!-- Tarjeta: Total Ingresos -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">💰 TOTAL INGRESOS</div>
          <div style="font-size: 28px; font-weight: bold;">₡${(totalRevenue || 0).toLocaleString('es-CR')}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">${totalVentas} venta(s) registrada(s)</div>
        </div>

        <!-- Tarjeta: Total Prepago -->
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">💳 TOTAL PREPAGO</div>
          <div style="font-size: 28px; font-weight: bold;">₡${(totalPrepagoRevenue || 0).toLocaleString('es-CR')}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">Acumulado de ventas prepago</div>
        </div>

        <!-- Tarjeta: Total Terminales -->
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">📱 TERMINALES VENDIDAS</div>
          <div style="font-size: 28px; font-weight: bold;">${totalTerminals}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">Teléfonos registrados</div>
        </div>

        <!-- Tarjeta: Total Accesorios -->
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">🎁 ACCESORIOS VENDIDOS</div>
          <div style="font-size: 28px; font-weight: bold;">${totalAccesorios}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">Artículos registrados</div>
        </div>

        <!-- Tarjeta: Total IMEI -->
        <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">📱 IMEI REGISTRADOS</div>
          <div style="font-size: 28px; font-weight: bold;">${this.metricas.totalIMEI || 0}</div>
          <div style="font-size: 11px; opacity: 0.8; margin-top: 8px;">Terminales únicas</div>
        </div>

      </div>

      <!-- GRÁFICO DE PROYECCIONES eliminado del UI -->

      <!-- DESGLOSE POR TIPO DE VENTA -->
      <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 20px 0; color: #1976D2; font-size: 18px;">📊 Desglose por Tipo</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
              <th style="padding: 12px; text-align: left; font-weight: bold;">Tipo</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">Cantidad</th>
              <th style="padding: 12px; text-align: right; font-weight: bold;">Total Ingresos</th>
              <th style="padding: 12px; text-align: right; font-weight: bold;">Promedio/Venta</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; color: #333;"><strong>📱 Móvil</strong></td>
              <td style="padding: 12px; text-align: center; color: #666;">${this.metricas.ventasMobile}</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #4CAF50;">₡${(this.metricas.totalRevenueMobile || 0).toLocaleString('es-CR')}</td>
              <td style="padding: 12px; text-align: right; color: #666;">${this.metricas.ventasMobile > 0 ? '₡' + Math.round((this.metricas.totalRevenueMobile || 0) / this.metricas.ventasMobile).toLocaleString('es-CR') : '₡0'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px; color: #333;"><strong>🏠 Hogar</strong></td>
              <td style="padding: 12px; text-align: center; color: #666;">${this.metricas.ventasHome}</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #2196F3;">₡${(this.metricas.totalRevenueHome || 0).toLocaleString('es-CR')}</td>
              <td style="padding: 12px; text-align: right; color: #666;">${this.metricas.ventasHome > 0 ? '₡' + Math.round((this.metricas.totalRevenueHome || 0) / this.metricas.ventasHome).toLocaleString('es-CR') : '₡0'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BOTÓN ACTUALIZAR -->
      <div style="margin-top: 20px; text-align: center;">
        <button onclick="ventasDashboard.loadMetricas()" style="padding: 12px 30px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: all 0.3s;">🔄 Actualizar Métricas</button>
      </div>
    `;

    // Gráfico de proyecciones eliminado: no se inicializa
  }

  /**
   * Calcular proyección de ventas móviles
   */
  calcularProyeccionMobile() {
    if (!this.metricas) return 0;
    return this.metricas.totalRevenueMobile || 0;
  }

  /**
   * Calcular proyección de ventas hogar
   */
  calcularProyeccionHome() {
    if (!this.metricas) return 0;
    return this.metricas.totalRevenueHome || 0;
  }

  /**
   * Renderizar gráfico de proyecciones
   */
  renderProjectionChart() {
    const ctx = document.getElementById('ventasProjectionChart');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Ingresos', 'Prepago'],
        datasets: [
          {
            label: 'Dinero (₡)',
            data: [
              this.metricas.totalRevenue || 0,
              this.metricas.totalPrepagoRevenue || 0
            ],
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',
              'rgba(245, 87, 108, 0.8)'
            ],
            borderColor: [
              'rgb(102, 126, 234)',
              'rgb(245, 87, 108)'
            ],
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₡' + value.toLocaleString('es-CR');
              }
            }
          }
        }
      }
    });
  }
}

// Función global para cambiar sub-tabs de ventas
window.switchVentasSubTab = function(tab) {
  if (window.ventasDashboard) {
    window.ventasDashboard.switchSubTab(tab);
  } else {
    console.warn('⚠️ ventasDashboard no disponible aún');
  }
};

// Instancia global (Inicializar cuando esté en pestaña de Metas)
const ventasDashboard = new VentasDashboard();
window.ventasDashboard = ventasDashboard; // Exponer globalmente

// Inicializar cuando usuario acceda a pestaña de Metas
window.addEventListener('metasTabActive', () => {
  if (ventasManager) {
    ventasDashboard.init().catch(e => console.error('Error inicializando dashboard:', e));
  }
});

console.log('✅ VentasDashboard cargado (esperando pestaña de Metas)');
