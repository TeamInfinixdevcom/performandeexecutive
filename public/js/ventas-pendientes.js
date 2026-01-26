class VentasPendientes {
  constructor() {
    this.db = null;
    this.auth = null;
    this._initPromise = this._init();
  }

  async _init() {
    let attempts = 0;
    while ((!window.firebaseDb || !window.firebaseAuth) && attempts < 100) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    this.db = window.firebaseDb;
    this.auth = window.firebaseAuth;
  }

  async ensure() { await this._initPromise; }

  async cargarPendientes() {
    try {
      document.getElementById('ventasPendientesStatus').textContent = 'Cargando...';
      await this.ensure();
      if (!window.ventasManager) throw new Error('VentasManager no disponible');

      // Cargar ventas móvil y hogar
      const ventasMobile = await window.ventasManager.getVentas('mobile', null, true);
      const ventasHome = await window.ventasManager.getVentas('home', null, true);

      // Mostrar solo ventas "pendientes" o "en_proceso" que sean próximas/nuevas.
      // Criterio: tenga campo `fechaPendiente` generado al crear (ventas nuevas) O
      // haya sido creada en los últimos 30 días. Evitamos listar ventas históricas antiguas.
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const all = [...ventasMobile, ...ventasHome];
      const pendientes = all.filter(v => {
        const estadoMatch = v.estado === 'pendiente' || v.estado === 'en_proceso';
        if (!estadoMatch) return false;

        // Si fue marcada con `fechaPendiente` (nuestras nuevas ventas), mostrarla.
        if (v.fechaPendiente) return true;

        // Si no tiene fechaPendiente, considerar creación reciente (últimos 30 días)
        const createdVal = v.createdAt && v.createdAt.toDate ? v.createdAt.toDate().getTime() : (v.createdAt ? new Date(v.createdAt).getTime() : null);
        if (createdVal && (now - createdVal) <= THIRTY_DAYS_MS) return true;

        return false; // excluir ventas antiguas
      });

      this.renderPendientes(pendientes);
      document.getElementById('ventasPendientesStatus').textContent = `Mostrando ${pendientes.length} ventas pendientes (solo próximas)`;
    } catch (error) {
      console.error('Error cargando pendientes:', error);
      document.getElementById('ventasPendientesStatus').textContent = 'Error cargando pendientes: ' + (error.message || error);
    }
  }

  renderPendientes(ventas) {
    const container = document.getElementById('ventasPendientesContainer');
    if (!container) return;

    if (!ventas || ventas.length === 0) {
      container.innerHTML = `<div class="card" style="text-align:center; padding:30px; color:#666;">No hay ventas pendientes</div>`;
      return;
    }

    const html = ventas.map(venta => {
      const tipo = venta.tipo || (venta.numeroPedido ? 'mobile' : 'home');
      return `
        <div class="card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:700;">${venta.planName || venta.planId || ''} — ₡${(venta.planPrice||0).toLocaleString()}</div>
            <div style="color:#444; font-size:0.95em;">Cliente: ${venta.nombreCliente || venta.customerName || 'N/A'} — Cédula: ${venta.cedulaCliente || 'N/A'}</div>
            <div style="color:#666; font-size:0.9em; margin-top:6px;">Estado: <strong>${venta.estado}</strong> ${venta.metodoEnvio ? ' • Envío: ' + venta.metodoEnvio : ''}</div>
          </div>
          <div style="display:flex; gap:8px; margin-left:12px;">
            <button onclick="window.ventasPendientes?.marcarEntregada('${venta.id}','${tipo}')" class="btn btn-success">✅ Marcar entregada</button>
            <button onclick="window.location.href='ventas-list.html#' + '${venta.id}'" class="btn btn-secondary">🔍 Ver</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  async marcarEntregada(ventaId, tipo='mobile') {
    try {
      if (!confirm('¿Marcar esta venta como entregada/completada?')) return;
      await window.ventasManager.markVentaEntregada(ventaId, tipo);
      await this.cargarPendientes();
      alert('✅ Venta marcada como entregada');
    } catch (error) {
      console.error('Error marcando como entregada:', error);
      alert('No se pudo marcar la venta: ' + (error.message || error));
    }
  }
}

const ventasPendientes = new VentasPendientes();
window.ventasPendientes = ventasPendientes;
console.log('✅ VentasPendientes cargado');
