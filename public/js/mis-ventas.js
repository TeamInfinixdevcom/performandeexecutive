/**
 * MIS VENTAS - Listado, edición y eliminación de ventas propias
 */

class MisVentas {
  constructor() {
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.ventasMobile = [];
    this.ventasHome = [];
    this.ventasEditando = {};
    this.currentPage = 1;
    this.ventasPorPagina = 6;
    this.cargando = false;
    this.authUnsubscribe = null;
    this._initPromise = this._init();
  }

  async _init() {
    try {
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
        if (user) this.cargarVentas();
      });
      
      console.log('✅ MisVentas inicializado');
    } catch (error) {
      console.error('❌ Error inicializando MisVentas:', error);
    }
  }

  async ensure() {
    await this._initPromise;
  }

  /**
   * Cargar ventas del usuario actual
   */
  async cargarVentas(forceRefresh = false) {
    try {
      // Evitar cargas simultáneas
      if (this.cargando) {
        console.log('⏳ MisVentas: carga en progreso, ignorando solicitud duplicada');
        return;
      }

      if (!this.currentUser) return;

      if (!window.ventasManager) {
        console.warn('⚠️ VentasManager no disponible');
        return;
      }

      this.cargando = true;

      await window.ventasManager.ensure();

      // Obtener ventas solo para el usuario actual (no pasar UID, VentasManager lo obtiene de auth)
      // Forzar refresh si se especificó (útil después de eliminar)
      this.ventasMobile = await window.ventasManager.getVentas('mobile', null, forceRefresh);
      this.ventasHome = await window.ventasManager.getVentas('home', null, forceRefresh);

      console.log(`📊 Ventas cargadas - Móvil: ${this.ventasMobile.length}, Hogar: ${this.ventasHome.length}`);
      this.renderVentas();
    } catch (error) {
      console.error('❌ Error cargando ventas:', error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Renderizar lista de ventas
   */
  renderVentas() {
    const container = document.getElementById('misVentasContainer');
    if (!container) return;

    // Obtener filtros
    const filtroTipo = document.getElementById('filtroTipoVenta')?.value || '';
    const buscarPedido = document.getElementById('buscarNumPedido')?.value.toLowerCase() || '';
    const buscarCedula = document.getElementById('buscarCedula')?.value.toLowerCase() || '';

    // Filtrar ventas móviles
    let ventasMobileFiltered = this.ventasMobile;
    if (filtroTipo && filtroTipo !== 'mobile') ventasMobileFiltered = [];
    if (buscarPedido) ventasMobileFiltered = ventasMobileFiltered.filter(v => 
      v.numeroPedido?.toLowerCase().includes(buscarPedido)
    );
    if (buscarCedula) ventasMobileFiltered = ventasMobileFiltered.filter(v => 
      v.cedulaCliente?.toLowerCase().includes(buscarCedula)
    );

    // Filtrar ventas hogar
    let ventasHomeFiltered = this.ventasHome;
    if (filtroTipo && filtroTipo !== 'home') ventasHomeFiltered = [];
    if (buscarCedula) ventasHomeFiltered = ventasHomeFiltered.filter(v => 
      v.cedulaCliente?.toLowerCase().includes(buscarCedula)
    );

    const todasLasVentas = [...ventasMobileFiltered, ...ventasHomeFiltered];
    const totalVentas = todasLasVentas.length;

    if (totalVentas === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px; color: #999;">
          <p style="font-size: 1.1em;">No hay ventas registradas</p>
        </div>
      `;
      return;
    }

    // Calcular resumen de totales
    let totalIMEIs = 0;
    let totalAccesorios = 0;
    ventasMobileFiltered.forEach(v => {
      if (v.imeis && Array.isArray(v.imeis)) totalIMEIs += v.imeis.length;
      if (v.accesorios && Array.isArray(v.accesorios)) totalAccesorios += v.accesorios.length;
    });

    // Paginación
    const totalPaginas = Math.ceil(totalVentas / this.ventasPorPagina);
    if (this.currentPage > totalPaginas) this.currentPage = 1;

    const inicio = (this.currentPage - 1) * this.ventasPorPagina;
    const fin = inicio + this.ventasPorPagina;
    const ventasPaginadas = todasLasVentas.slice(inicio, fin);

    let html = '';

    // Resumen de totales
    html += `
      <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">Total Ventas</div>
            <div style="font-size: 1.8em; font-weight: bold;">${totalVentas}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">📱 IMEIs Vendidos</div>
            <div style="font-size: 1.8em; font-weight: bold;">${totalIMEIs}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">🎁 Accesorios Vendidos</div>
            <div style="font-size: 1.8em; font-weight: bold;">${totalAccesorios}</div>
          </div>
        </div>
      </div>
    `;

    // Renderizar ventas de la página actual
    ventasPaginadas.forEach(venta => {
      if (ventasMobileFiltered.some(v => v.id === venta.id)) {
        html += this.renderVentaMobileCard(venta);
      } else {
        html += this.renderVentaHomeCard(venta);
      }
    });

    // Paginación
    if (totalPaginas > 1) {
      html += `
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 24px; align-items: center;">
          <button onclick="window.misVentas?.irPagina(1)" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.currentPage === 1 ? 'disabled style="opacity: 0.5;"' : ''}>«</button>
          <button onclick="window.misVentas?.irPagina(${this.currentPage - 1})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.currentPage === 1 ? 'disabled style="opacity: 0.5;"' : ''}>‹</button>
          
          <div style="display: flex; gap: 4px;">
            ${Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pagina => `
              <button onclick="window.misVentas?.irPagina(${pagina})" style="width: 36px; height: 36px; padding: 0; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; ${this.currentPage === pagina ? 'background-color: #667eea; color: white;' : 'background-color: #f0f0f0; color: #333;'}">${pagina}</button>
            `).join('')}
          </div>

          <button onclick="window.misVentas?.irPagina(${this.currentPage + 1})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.currentPage === totalPaginas ? 'disabled style="opacity: 0.5;"' : ''}>›</button>
          <button onclick="window.misVentas?.irPagina(${totalPaginas})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.currentPage === totalPaginas ? 'disabled style="opacity: 0.5;"' : ''}>»</button>
        </div>
        <div style="text-align: center; margin-top: 12px; color: #999; font-size: 0.9em;">
          Página ${this.currentPage} de ${totalPaginas}
        </div>
      `;
    }

    container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Renderizar tarjeta de venta móvil
   */
  renderVentaMobileCard(venta) {
    const ventaId = venta.id;
    const isEditing = this.ventasEditando[ventaId];
    const proyeccion12m = (venta.planPrice || 0) * 12;
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();
    const proyeccionEndYear = (venta.planPrice || 0) * monthsRemaining;

    return `
      <div class="card" style="margin-bottom: 16px; border-left: 4px solid #667eea;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <!-- Información de la venta -->
          <div style="flex: 1;">
            ${!isEditing ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 12px;">
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Tipo de Pedido</label>
                  <p style="margin: 4px 0; color: #333;">${venta.tipoPedido}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Número de Pedido</label>
                  <p style="margin: 4px 0; color: #333;">${venta.numeroPedido}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Plan</label>
                  <p style="margin: 4px 0; color: #333;">${venta.planName || venta.planId}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Precio</label>
                  <p style="margin: 4px 0; color: #667eea; font-weight: bold;">₡${venta.planPrice?.toLocaleString() || 0}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 12px;">
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Cédula Cliente</label>
                  <p style="margin: 4px 0; color: #333;">${venta.cedulaCliente}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Teléfono</label>
                  <p style="margin: 4px 0; color: #333;">${venta.numeroCliente || 'N/A'}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Terminales</label>
                  <p style="margin: 4px 0; color: #333;">${(venta.imeis?.length || 0)} teléfonos</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Accesorios</label>
                  <p style="margin: 4px 0; color: #333;">${(venta.accesorios?.length || 0)} artículos</p>
                </div>
              </div>

              ${venta.imeis && venta.imeis.length > 0 ? `
              <div style="background: #e8f4f8; border-left: 4px solid #3498db; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
                <label style="font-size: 0.85em; color: #3498db; font-weight: bold; display: block; margin-bottom: 4px;">📱 IMEI:</label>
                <p style="margin: 0; color: #333; font-family: monospace; font-size: 0.95em;">${venta.imeis[0]}</p>
              </div>
              ` : `
              <div style="background: #f8f9fa; border-left: 4px solid #ccc; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
                <p style="margin: 0; color: #999; font-style: italic;">📱 Sin IMEI registrado</p>
              </div>
              `}

              <!-- Proyecciones: mostrar solo Fin de año -->
              <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; border-radius: 4px; margin-top: 12px;">
                <p style="margin: 0; font-size: 0.9em; color: #666;">
                  <strong>Proyecciones:</strong>
                  Fin de año: <span style="color: #667eea; font-weight: bold;">₡${proyeccionEndYear.toLocaleString()}</span>
                </p>
              </div>
            ` : `
              <!-- Modo edición -->
              <div style="background: #fef9e7; padding: 16px; border-radius: 6px; border: 1px solid #f9d74e;">
                <h4 style="margin-top: 0; margin-bottom: 12px; color: #f39c12;">✏️ Editando Venta</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                  <div class="form-group">
                    <label>Precio (₡) *</label>
                    <input type="number" id="editPrice_${ventaId}" class="form-input" value="${venta.planPrice}" onchange="window.misVentas?.updateProjections('${ventaId}', 'mobile')">
                  </div>
                  <div class="form-group">
                    <label>📱 IMEI del Terminal</label>
                    <input type="text" id="editImei_${ventaId}" class="form-input" value="${venta.imeis && venta.imeis[0] ? venta.imeis[0] : ''}" placeholder="Ingresa el IMEI (15 dígitos)" maxlength="15" style="font-family: monospace;">
                  </div>
                  <div class="form-group">
                    <label>Proyección Fin de Año</label>
                    <input type="text" id="projEndYear_${ventaId}" class="form-input" value="₡${proyeccionEndYear.toLocaleString()}" readonly style="background-color: #f5f5f5;">
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- Botones de acción -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${!isEditing ? `
              <button onclick="window.misVentas?.toggleEditar('${ventaId}')" class="btn btn-secondary" style="background-color: #f39c12; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">✏️ Editar</button>
              <button onclick="window.misVentas?.eliminarVenta('${ventaId}', 'mobile')" class="btn btn-danger" style="background-color: #e74c3c; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">🗑️ Eliminar</button>
            ` : `
              <button onclick="window.misVentas?.guardarEdicion('${ventaId}', 'mobile')" class="btn btn-success" style="background-color: #27ae60; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">💾 Guardar</button>
              <button onclick="window.misVentas?.cancelarEdicion('${ventaId}')" class="btn btn-secondary" style="background-color: #95a5a6; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">❌ Cancelar</button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar tarjeta de venta hogar
   */
  renderVentaHomeCard(venta) {
    const ventaId = venta.id;
    const isEditing = this.ventasEditando[ventaId];
    const proyeccion12m = (venta.planPrice || 0) * 12;
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();
    const proyeccionEndYear = (venta.planPrice || 0) * monthsRemaining;

    return `
      <div class="card" style="margin-bottom: 16px; border-left: 4px solid #f5576c;">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <!-- Información de la venta -->
          <div style="flex: 1;">
            ${!isEditing ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 12px;">
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Orden SIMO</label>
                  <p style="margin: 4px 0; color: #333;">${venta.homeNumber}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Cliente</label>
                  <p style="margin: 4px 0; color: #333;">${venta.customerName}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Plan</label>
                  <p style="margin: 4px 0; color: #333;">${venta.planName || venta.planId}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Precio</label>
                  <p style="margin: 4px 0; color: #f5576c; font-weight: bold;">₡${venta.planPrice?.toLocaleString() || 0}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Cédula</label>
                  <p style="margin: 4px 0; color: #333;">${venta.cedulaCliente}</p>
                </div>
                <div>
                  <label style="font-size: 0.85em; color: #999; font-weight: bold;">Teléfono</label>
                  <p style="margin: 4px 0; color: #333;">${venta.numeroCliente || 'N/A'}</p>
                </div>
              </div>

              <!-- Proyecciones eliminadas del UI -->
            ` : `
              <!-- Modo edición -->
              <div style="background: #fef9e7; padding: 16px; border-radius: 6px; border: 1px solid #f9d74e;">
                <h4 style="margin-top: 0; margin-bottom: 12px; color: #f39c12;">✏️ Editando Venta</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                  <div class="form-group">
                    <label>Precio (₡) *</label>
                    <input type="number" id="editPrice_${ventaId}" class="form-input" value="${venta.planPrice}" onchange="window.misVentas?.updateProjections('${ventaId}', 'home')">
                  </div>
                  <div class="form-group">
                    <label>Proyección Fin de Año</label>
                    <input type="text" id="projEndYear_${ventaId}" class="form-input" value="₡${proyeccionEndYear.toLocaleString()}" readonly style="background-color: #f5f5f5;">
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- Botones de acción -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${!isEditing ? `
              <button onclick="window.misVentas?.toggleEditar('${ventaId}')" class="btn btn-secondary" style="background-color: #f39c12; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">✏️ Editar</button>
              <button onclick="window.misVentas?.eliminarVenta('${ventaId}', 'home')" class="btn btn-danger" style="background-color: #e74c3c; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">🗑️ Eliminar</button>
            ` : `
              <button onclick="window.misVentas?.guardarEdicion('${ventaId}', 'home')" class="btn btn-success" style="background-color: #27ae60; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">💾 Guardar</button>
              <button onclick="window.misVentas?.cancelarEdicion('${ventaId}')" class="btn btn-secondary" style="background-color: #95a5a6; color: white; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;">❌ Cancelar</button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Alternar modo edición
   */
  toggleEditar(ventaId) {
    this.ventasEditando[ventaId] = !this.ventasEditando[ventaId];
    this.renderVentas();
  }

  /**
   * Cancelar edición
   */
  cancelarEdicion(ventaId) {
    delete this.ventasEditando[ventaId];
    this.renderVentas();
  }

  /**
   * Actualizar proyecciones en tiempo real
   */
  updateProjections(ventaId, tipo) {
    const priceInput = document.getElementById(`editPrice_${ventaId}`);
    const projEndYearInput = document.getElementById(`projEndYear_${ventaId}`);

    if (!priceInput) return;

    const precio = parseInt(priceInput.value) || 0;
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();
    const projEndYear = precio * monthsRemaining;

    if (projEndYearInput) projEndYearInput.value = `₡${projEndYear.toLocaleString()}`;
  }

  /**
   * Guardar edición de venta
   */
  async guardarEdicion(ventaId, tipo) {
    try {
      const priceInput = document.getElementById(`editPrice_${ventaId}`);
      if (!priceInput) return;

      const newPrice = parseInt(priceInput.value);
      if (!newPrice || newPrice <= 0) {
        alert('⚠️ Por favor ingresa un precio válido');
        return;
      }

      if (!window.ventasManager) {
        alert('❌ VentasManager no disponible');
        return;
      }

      await window.ventasManager.ensure();

      // Encontrar la venta original
      const ventas = tipo === 'mobile' ? this.ventasMobile : this.ventasHome;
      const venta = ventas.find(v => v.id === ventaId);

      if (!venta) {
        alert('❌ Venta no encontrada');
        return;
      }

      // Actualizar precio
      const ventaActualizada = { ...venta, planPrice: newPrice };

      // Si es venta móvil, actualizar IMEI
      if (tipo === 'mobile') {
        const imeiInput = document.getElementById(`editImei_${ventaId}`);
        if (imeiInput) {
          const imei = imeiInput.value.trim();
          if (imei) {
            ventaActualizada.imeis = [imei];
          } else {
            ventaActualizada.imeis = [];
          }
        }
      }

      // Guardar en Firebase
      // Orden correcto de parámetros: (ventaId, tipo, data)
      await window.ventasManager.updateVenta(ventaId, tipo, ventaActualizada);

      alert(`✅ Venta actualizada correctamente\nNuevo precio: ₡${newPrice.toLocaleString()}`);

      // Actualizar datos locales
      if (tipo === 'mobile') {
        const idx = this.ventasMobile.findIndex(v => v.id === ventaId);
        if (idx !== -1) this.ventasMobile[idx].planPrice = newPrice;
      } else {
        const idx = this.ventasHome.findIndex(v => v.id === ventaId);
        if (idx !== -1) this.ventasHome[idx].planPrice = newPrice;
      }

      delete this.ventasEditando[ventaId];

      // Refrescar vistas
      this.renderVentas();
      if (window.objetivosDashboard) {
        window.objetivosDashboard.refresh();
      }
      if (window.proyecciones) {
        window.proyecciones.actualizarDatos(true);
      }
    } catch (error) {
      console.error('❌ Error guardando edición:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Eliminar venta
   */
  async eliminarVenta(ventaId, tipo) {
    if (!confirm('⚠️ ¿Estás seguro que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      if (!window.ventasManager) {
        alert('❌ VentasManager no disponible');
        return;
      }

      await window.ventasManager.ensure();
      // ✅ CORRECCIÓN: Orden correcto de parámetros (ventaId, tipo)
      await window.ventasManager.deleteVenta(ventaId, tipo);

      alert('✅ Venta eliminada correctamente');

      // Recargar ventas forzando actualización del cache
      await this.cargarVentas(true);

      // Refrescar dashboard
      if (window.objetivosDashboard) {
        window.objetivosDashboard.refresh();
      }
      if (window.proyecciones) {
        window.proyecciones.actualizarDatos(true);
      }
    } catch (error) {
      console.error('❌ Error eliminando venta:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Adjuntar event listeners a filtros
   */
  attachEventListeners() {
    const buscarPedido = document.getElementById('buscarNumPedido');
    const buscarCedula = document.getElementById('buscarCedula');
    const filtroTipo = document.getElementById('filtroTipoVenta');

    [buscarPedido, buscarCedula, filtroTipo].forEach(el => {
      if (el) {
        el.removeEventListener('change', () => this.renderVentas());
        el.removeEventListener('input', () => this.renderVentas());
        el.addEventListener('change', () => { this.currentPage = 1; this.renderVentas(); });
        el.addEventListener('input', () => { this.currentPage = 1; this.renderVentas(); });
      }
    });
  }

  /**
   * Ir a una página específica
   */
  irPagina(pagina) {
    this.currentPage = pagina;
    this.renderVentas();
    // Scroll al top del contenedor
    document.getElementById('misVentasContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Inicializar globalmente
window.misVentas = new MisVentas();
console.log('✅ MisVentas cargado globalmente');
