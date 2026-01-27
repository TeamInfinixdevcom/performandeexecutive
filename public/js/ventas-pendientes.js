/*
  ventas-pendientes.js (stub)
  - La lógica de "ventas pendientes" ahora se maneja desde `Mis Ventas`.
  - Este archivo expone la misma API mínima para evitar errores si sigue referenciado.
*/
class VentasPendientes {
  constructor() {
    console.warn('ventas-pendientes: stub iniciada. Use Mis Ventas en su lugar.');
  }

  // Devuelve un array vacío (no realiza lecturas por sí mismo)
  async cargarPendientes() {
    return [];
  }

  // Intenta marcar como entregada usando ventasManager si está disponible
  async marcarEntregada(ventaId, tipo = 'mobile') {
    if (window.ventasManager && typeof window.ventasManager.markVentaEntregada === 'function') {
      return window.ventasManager.markVentaEntregada(ventaId, tipo);
    }
    throw new Error('ventasManager no disponible');
  }

  // Render no-op para compatibilidad
  renderPendientes() {
    const container = document.getElementById('ventasPendientesContainer');
    if (container) container.innerHTML = '<div class="card" style="text-align:center; padding:30px; color:#666;">Vistas de pendientes centralizadas en Mis Ventas</div>';
  }
}

const ventasPendientes = new VentasPendientes();
window.ventasPendientes = ventasPendientes;
console.log('⚠️ ventas-pendientes.js cargado (stub)');
