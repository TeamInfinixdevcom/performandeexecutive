/**
 * SALES LIST - Lista de ventas con edición, filtros y eliminación
 */

class SalesList {
  constructor() {
    this.ventasManager = window.ventasManager;
    this.ventasMobile = [];
    this.ventasHome = [];
    this.currentFilter = { type: 'all', orderNumber: '', cedula: '', simoNumber: '' };
    this.isAdmin = false;
    this.selectedUserUID = null; // Para admins: UID del usuario filtrado
  }

  /**
   * Inicializar la lista
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

      this.setupEventListeners();
      await this.loadVentas();
      console.log('✅ SalesList inicializado (Admin: ' + this.isAdmin + ')');

      // Escuchar cuando se crea una nueva venta
      window.addEventListener('ventaCreada', () => this.loadVentas());
    } catch (error) {
      console.error('❌ Error inicializando SalesList:', error);
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
   * Establecer UID filtrado (para admins)
   */
  setFilteredUserUID(uid) {
    this.selectedUserUID = uid;
    this.loadVentas();
  }

  /**
   * Cargar todas las ventas (móvil y hogar)
   */
  async loadVentas() {
    try {
      // Si es admin con filtro, cargar ventas del usuario seleccionado
      const filtroUID = this.selectedUserUID;
      this.ventasMobile = await this.ventasManager.getVentas('mobile', filtroUID);
      this.ventasHome = await this.ventasManager.getVentas('home', filtroUID);
      this.renderVentas();
    } catch (error) {
      console.error('❌ Error cargando ventas:', error);
    }
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    // Filtros
    const filterBtn = document.getElementById('applyFilterBtn');
    if (filterBtn) filterBtn.addEventListener('click', () => this.applyFilters());

    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) clearFilterBtn.addEventListener('click', () => this.clearFilters());

    // Enter en filtros
    document.getElementById('filterOrderNumber')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.applyFilters();
    });
    document.getElementById('filterCedula')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.applyFilters();
    });
    document.getElementById('filterSimoNumber')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.applyFilters();
    });
  }

  /**
   * Aplicar filtros
   */
  applyFilters() {
    this.currentFilter = {
      type: document.getElementById('filterType')?.value || 'all',
      orderNumber: document.getElementById('filterOrderNumber')?.value?.toLowerCase() || '',
      cedula: document.getElementById('filterCedula')?.value?.trim() || '',
      simoNumber: document.getElementById('filterSimoNumber')?.value?.toLowerCase() || ''
    };

    this.renderVentas();
  }

  /**
   * Limpiar filtros
   */
  clearFilters() {
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterOrderNumber').value = '';
    document.getElementById('filterCedula').value = '';
    document.getElementById('filterSimoNumber').value = '';

    this.currentFilter = { type: 'all', orderNumber: '', cedula: '', simoNumber: '' };
    this.renderVentas();
  }

  /**
   * Renderizar lista de ventas con filtros aplicados
   */
  renderVentas() {
    const container = document.getElementById('ventasListContainer');
    if (!container) return;

    let ventasAMostrar = [];

    // Filtrar por tipo
    if (this.currentFilter.type === 'all' || this.currentFilter.type === 'mobile') {
      ventasAMostrar = ventasAMostrar.concat(this.ventasMobile);
    }
    if (this.currentFilter.type === 'all' || this.currentFilter.type === 'home') {
      ventasAMostrar = ventasAMostrar.concat(this.ventasHome);
    }

    // Filtrar por criterios
    ventasAMostrar = ventasAMostrar.filter(venta => {
      if (this.currentFilter.orderNumber && !venta.numeroPedido?.toLowerCase().includes(this.currentFilter.orderNumber)) {
        return false;
      }
      if (this.currentFilter.cedula && !venta.cedulaCliente?.includes(this.currentFilter.cedula)) {
        return false;
      }
      if (this.currentFilter.simoNumber && !venta.homeNumber?.toLowerCase().includes(this.currentFilter.simoNumber)) {
        return false;
      }
      return true;
    });

    // Mostrar resumen
    const resumenDiv = document.getElementById('ventasResumen');
    if (resumenDiv) {
      resumenDiv.innerHTML = `
        <div style="background: #FFF59D; border: 2px solid #FBC02D; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
          <strong style="color: #F57F17; font-size: 16px;">📊 RESULTADOS:</strong> 
          Mostrando <strong>${ventasAMostrar.length}</strong> de <strong>${this.ventasMobile.length + this.ventasHome.length}</strong> ventas
        </div>
      `;
    }

    // Renderizar ventas
    if (ventasAMostrar.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No hay ventas registradas que coincidan con los filtros.</p>';
      return;
    }

    container.innerHTML = ventasAMostrar.map(venta => this.renderVentaCard(venta)).join('');
  }

  /**
   * Renderizar una tarjeta de venta
   */
  renderVentaCard(venta) {
    const isMobile = venta.tipo === 'mobile';
    const tipoLabel = isMobile ? '📱 Móvil' : '🏠 Hogar';
    const planName = isMobile
      ? this.ventasManager.getPlanName(venta.plan, 'mobile')
      : this.ventasManager.getPlanName(venta.plan, 'home');

    const referencia = isMobile ? venta.numeroPedido : venta.homeNumber;
    const cliente = venta.nombreCliente || `${venta.customerName || 'Sin nombre'}`;

    return `
      <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 6px solid ${isMobile ? '#2196F3' : '#4CAF50'}; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- HEADER: Referencia y tipo -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div>
            <h3 style="margin: 0; color: #1976D2; font-size: 18px;">
              ${isMobile ? '📌 Pedido: ' : '🏠 Orden SIMO: '} <strong>${referencia || 'N/A'}</strong>
            </h3>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">${tipoLabel}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="salesList.editVenta('${venta.id}', '${venta.tipo}')" style="padding: 8px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">✏️ Editar</button>
            <button onclick="if(confirm('¿Eliminar esta venta?')) salesList.deleteVenta('${venta.id}', '${venta.tipo}')" style="padding: 8px 15px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Eliminar</button>
          </div>
        </div>

        <!-- DATOS DEL CLIENTE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px;">
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; color: #666;"><strong>👤 Cliente:</strong></td>
              <td style="padding: 8px; color: #333;">${cliente}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; color: #666;"><strong>🆔 Cédula:</strong></td>
              <td style="padding: 8px; color: #333;">${venta.cedulaCliente || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; color: #666;"><strong>📞 Teléfono:</strong></td>
              <td style="padding: 8px; color: #333;">${venta.numeroCliente || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; color: #666;"><strong>📦 Plan:</strong></td>
              <td style="padding: 8px; color: #333;">${planName || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px; color: #666;"><strong>💵 Precio:</strong></td>
              <td style="padding: 8px; color: #333; font-weight: bold;">₡${venta.planPrice?.toLocaleString('es-CR') || '0'}</td>
            </tr>
            ${isMobile ? `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; color: #666;"><strong>📱 IMEIs:</strong></td>
                <td style="padding: 8px; color: #333;">${venta.imeis?.length || 0} terminal(es)</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; color: #666;"><strong>🎁 Accesorios:</strong></td>
                <td style="padding: 8px; color: #333;">${venta.accesorios?.length || 0} accesorio(s)</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Proyecciones eliminado del UI -->

        <!-- FECHA -->
        <p style="margin: 0; color: #999; font-size: 12px;">📅 ${new Date(venta.createdAt).toLocaleDateString('es-CR')}</p>
      </div>
    `;
  }

  /**
   * Editar venta (abre formulario expandible)
   */
  async editVenta(ventaId, tipo) {
    try {
      const venta = await this.ventasManager.getVenta(ventaId, tipo);
      const container = document.getElementById('ventasListContainer');
      if (!container) return;

      // Crear modal/formulario de edición
      const editForm = document.createElement('div');
      editForm.id = `editForm-${ventaId}`;
      editForm.style.cssText = 'background: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 5px solid #4CAF50; margin-bottom: 20px;';
      
      const isMobile = tipo === 'mobile';
      const grupos = isMobile ? this.ventasManager.getGruposMobile() : this.ventasManager.getGruposHome();
      
      let planOptions = '<option value="">-- Selecciona un plan --</option>';
      grupos.forEach(grupo => {
        grupo.planes.forEach(plan => {
          const selected = plan.id === venta.plan ? 'selected' : '';
          planOptions += `<option value="${plan.id}" data-price="${plan.precio}" ${selected}>${plan.nombre} - ₡${plan.precio.toLocaleString('es-CR')}</option>`;
        });
      });

      editForm.innerHTML = `
        <h4 style="margin: 0 0 15px 0; color: #2e7d32; font-weight: bold;">✏️ Editar Venta</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div>
            <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 13px;">Cliente</label>
            <input type="text" value="${venta.nombreCliente || ''}" placeholder="Nombre" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;" data-field="nombreCliente">
          </div>
          <div>
            <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 13px;">Cédula</label>
            <input type="text" value="${venta.cedulaCliente || ''}" placeholder="Cédula" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; box-sizing: border-box;" data-field="cedulaCliente">
          </div>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="font-weight: bold; display: block; margin-bottom: 5px; font-size: 13px;">Plan</label>
          <select style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;" data-field="plan" data-field-price="planPrice">
            ${planOptions}
          </select>
        </div>

        ${isMobile ? `
          <div style="margin-bottom:12px;">
            <label style="display:flex;align-items:center;gap:8px; font-weight:bold;">
              <input type="checkbox" data-field="esRenovacion" ${venta.tipoVenta === 'renovacion' ? 'checked' : ''} /> ¿Es renovación?
            </label>
            <div style="font-size:12px;color:#666;margin-top:6px;">Si marca como renovación, esta venta dejará de contarse como ingreso y se contabilizará en renovaciones.</div>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-weight:bold; display:block; margin-bottom:6px;">📱 IMEIs</label>
            <div id="imeisEdit-${ventaId}">
              ${(venta.imeis || []).map(i => `
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                  <input class="edit-imei-input" value="${i}" placeholder="IMEI" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                  <button type="button" onclick="this.parentNode.remove()" style="padding:6px 10px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">Eliminar</button>
                </div>
              `).join('')}
            </div>
            <button type="button" onclick="(function(id){const c=document.getElementById(id);const d=document.createElement('div');d.style='display:flex;gap:8px;margin-bottom:8px;';d.innerHTML='<input class=\'edit-imei-input\' placeholder=\'IMEI\' style=\'flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;\'><button type=\'button\' onclick=\'this.parentNode.remove()\' style=\'padding:6px 10px;background:#e74c3c;color:#fff;border:none;border-radius:4px;\'>Eliminar</button>';c.appendChild(d);})('imeisEdit-${ventaId}')" style="margin-top:8px;padding:8px 12px;background:#2196F3;color:#fff;border:none;border-radius:4px;">+ Agregar IMEI</button>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-weight:bold; display:block; margin-bottom:6px;">🎁 Accesorios</label>
            <div id="accesoriosEdit-${ventaId}">
              ${(venta.accesorios || []).map(a => `
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                  <input class="edit-accesorio-input" value="${a}" placeholder="Accesorio" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                  <button type="button" onclick="this.parentNode.remove()" style="padding:6px 10px;background:#e74c3c;color:#fff;border:none;border-radius:4px;">Eliminar</button>
                </div>
              `).join('')}
            </div>
            <button type="button" onclick="(function(id){const c=document.getElementById(id);const d=document.createElement('div');d.style='display:flex;gap:8px;margin-bottom:8px;';d.innerHTML='<input class=\'edit-accesorio-input\' placeholder=\'Accesorio\' style=\'flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;\'><button type=\'button\' onclick=\'this.parentNode.remove()\' style=\'padding:6px 10px;background:#e74c3c;color:#fff;border:none;border-radius:4px;\'>Eliminar</button>';c.appendChild(d);})('accesoriosEdit-${ventaId}')" style="margin-top:8px;padding:8px 12px;background:#2196F3;color:#fff;border:none;border-radius:4px;">+ Agregar Accesorio</button>
          </div>
        ` : ''}

        <div style="display: flex; gap: 10px;">
          <button type="button" onclick="salesList.saveEditVenta('${ventaId}', '${tipo}')" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Guardar</button>
          <button type="button" onclick="document.getElementById('editForm-${ventaId}').remove()" style="flex: 1; padding: 10px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">✕ Cancelar</button>
        </div>
      `;

      // Insertar el formulario debajo del card
      const card = document.getElementById(`venta-${ventaId}`);
      if (card) {
        card.parentNode.insertBefore(editForm, card.nextSibling);
      }

      console.log('📝 Modo edición activado para venta:', ventaId);
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al cargar la venta para editar');
    }
  }

  /**
   * Guardar cambios de venta editada
   */
  async saveEditVenta(ventaId, tipo) {
    try {
      const editForm = document.getElementById(`editForm-${ventaId}`);
      if (!editForm) return;

      // Obtener valores del formulario
      const nombreCliente = editForm.querySelector('[data-field="nombreCliente"]').value;
      const cedulaCliente = editForm.querySelector('[data-field="cedulaCliente"]').value;
      const planSelect = editForm.querySelector('[data-field="plan"]');
      const plan = planSelect.value;
      const planPrice = parseInt(planSelect.options[planSelect.selectedIndex].dataset.price) || 0;

      // Campos opcionales: IMEIs, Accesorios, Renovacion (solo mobile)
      let imeis = undefined;
      let accesorios = undefined;
      let tipoVentaOverride = undefined;
      if (tipo === 'mobile') {
        // Collect imeis
        imeis = Array.from(editForm.querySelectorAll('.edit-imei-input')).map(i => i.value.trim()).filter(v => v);
        // Collect accesorios
        accesorios = Array.from(editForm.querySelectorAll('.edit-accesorio-input')).map(i => i.value.trim()).filter(v => v);
        // Renovacion checkbox
        const renovEl = editForm.querySelector('[data-field="esRenovacion"]');
        if (renovEl) tipoVentaOverride = renovEl.checked ? 'renovacion' : 'nueva';
      }

      if (!nombreCliente || !cedulaCliente || !plan) {
        alert('⚠️ Por favor completa todos los campos');
        return;
      }

      // Construir objeto de actualización
      const updateObj = {
        nombreCliente,
        cedulaCliente,
        plan,
        planPrice
      };
      if (Array.isArray(imeis)) updateObj.imeis = imeis;
      if (Array.isArray(accesorios)) updateObj.accesorios = accesorios;
      if (tipoVentaOverride) {
        updateObj.tipoVenta = tipoVentaOverride;
        updateObj.categories = tipoVentaOverride === 'renovacion' ? ['renovacion'] : [];
      }

      // Actualizar venta
      await this.ventasManager.updateVenta(ventaId, tipo, updateObj);

      alert('✅ Venta actualizada correctamente. Las proyecciones se han recalculado automáticamente.');
      editForm.remove();
      await this.loadVentas(); // Recargar la lista completa
      // Refrescar dashboards si existen
      if (window.objetivosDashboard && typeof window.objetivosDashboard.refresh === 'function') window.objetivosDashboard.refresh();
      if (window.proyecciones && typeof window.proyecciones.refresh === 'function') window.proyecciones.refresh();
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al actualizar la venta');
    }
  }

  /**
   * Eliminar venta
   */
  async deleteVenta(ventaId, tipo) {
    try {
      await this.ventasManager.deleteVenta(ventaId, tipo);
      alert('✅ Venta eliminada correctamente');
      await this.loadVentas();
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error al eliminar la venta');
    }
  }
}

// Instancia global (No auto-inicializar, esperar a que se llame desde switchVentasSubTab)
const salesList = new SalesList();
window.salesList = salesList; // Exponer globalmente

console.log('✅ SalesList cargado (esperando inicialización manual)');
