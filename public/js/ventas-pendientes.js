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

      const pendientes = [...ventasMobile, ...ventasHome].filter(v => v.estado === 'pendiente' || v.estado === 'en_proceso');

      this.renderPendientes(pendientes);
      document.getElementById('ventasPendientesStatus').textContent = `Mostrando ${pendientes.length} ventas pendientes`;
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
