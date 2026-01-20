/**
 * SALES FORM - Formulario para registrar ventas móviles y hogar
 * Autodetecta tipo, autocompleta precios, calcula proyecciones
 */

class SalesForm {
  constructor() {
    this.ventasManager = window.ventasManager;
    this.currentType = 'mobile'; // 'mobile' o 'home'
    this.imeisList = [];
    this.accesoriosList = [];
  }

  /**
   * Inicializar el formulario
   */
  async init() {
    try {
      await this.ventasManager.ensure();
      this.setupEventListeners();
      this.loadPlanes();
      this.updateTotalDisplay();
      console.log('✅ SalesForm inicializado');
    } catch (error) {
      console.error('❌ Error inicializando SalesForm:', error);
    }
  }

  /**
   * Cargar dropdown de planes
   */
  loadPlanes() {
    const planSelect = document.getElementById('planSelect');
    if (!planSelect) return;

    // Cargar planes móviles por defecto
    this.updatePlanesByType('mobile');
  }

  /**
   * Actualizar planes según tipo de venta
   */
  updatePlanesByType(tipo) {
    this.currentType = tipo;
    const planSelect = document.getElementById('planSelect');
    if (!planSelect) return;

    planSelect.innerHTML = '<option value="">-- Selecciona un plan --</option>';

    const grupos = tipo === 'mobile' 
      ? this.ventasManager.getGruposMobile() 
      : this.ventasManager.getGruposHome();

    grupos.forEach(grupo => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = grupo.nombre;

      grupo.planes.forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = `${plan.nombre} - ₡${plan.precio.toLocaleString('es-CR')}`;
        option.dataset.price = plan.precio;
        optgroup.appendChild(option);
      });

      planSelect.appendChild(optgroup);
    });
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    // Toggle tipo de venta
    const mobileBtn = document.getElementById('typeMobileBtn');
    const homeBtn = document.getElementById('typeHomeBtn');
    if (mobileBtn) mobileBtn.addEventListener('click', () => this.switchType('mobile'));
    if (homeBtn) homeBtn.addEventListener('click', () => this.switchType('home'));

    // Cambio de plan (autocomplete de precio)
    const planSelect = document.getElementById('planSelect');
    if (planSelect) planSelect.addEventListener('change', (e) => this.onPlanChange(e));

    // Agregar IMEI
    const addImeiBtn = document.getElementById('addImeiBtn');
    if (addImeiBtn) addImeiBtn.addEventListener('click', () => this.addImeiInput());

    // Agregar accesorio
    const addAccesorioBtn = document.getElementById('addAccesorioBtn');
    if (addAccesorioBtn) addAccesorioBtn.addEventListener('click', () => this.addAccesorioInput());

    // Submit form
    const submitBtn = document.getElementById('submitVentaBtn');
    if (submitBtn) submitBtn.addEventListener('click', () => this.submitForm());

    // Reset form
    const resetBtn = document.getElementById('resetVentaBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetForm());

    // Tipo de pedido change affects totals and unit price visibility
    const tipoPedidoEl = document.getElementById('tipoPedido');
    if (tipoPedidoEl) {
      tipoPedidoEl.addEventListener('change', (e) => {
        this.onTipoPedidoChange(e);
      });
    }

    // Unit price input should also update totals when changed
    const unitPriceEl = document.getElementById('unitPrice');
    if (unitPriceEl) unitPriceEl.addEventListener('input', () => this.updateTotalDisplay());
  }

  onTipoPedidoChange(e) {
    const val = e?.target?.value || document.getElementById('tipoPedido')?.value;
    const container = document.getElementById('unitPriceContainer');
    if (!container) return;
    if (val === 'accesorio_contado' || val === 'imei_contado') {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
    this.updateTotalDisplay();
  }

  /**
   * Cambiar tipo de venta
   */
  switchType(tipo) {
    this.currentType = tipo;

    // Actualizar botones
    const mobileBtn = document.getElementById('typeMobileBtn');
    const homeBtn = document.getElementById('typeHomeBtn');
    const mobileFields = document.getElementById('mobileOnlyFields');
    const homeFields = document.getElementById('homeOnlyFields');

    if (mobileBtn && homeBtn) {
      if (tipo === 'mobile') {
        mobileBtn.classList.add('active');
        homeBtn.classList.remove('active');
      } else {
        homeBtn.classList.add('active');
        mobileBtn.classList.remove('active');
      }
    }

    // Mostrar/ocultar campos específicos
    if (mobileFields) mobileFields.style.display = tipo === 'mobile' ? 'block' : 'none';
    if (homeFields) homeFields.style.display = tipo === 'home' ? 'block' : 'none';

    // Actualizar planes
    this.updatePlanesByType(tipo);

    // Limpiar campos específicos
    this.imeisList = [];
    this.accesoriosList = [];
    this.updateImeisList();
    this.updateAccesoriosList();
  }

  /**
   * Al cambiar plan, autocompleta el precio y calcula proyecciones
   */
  onPlanChange(e) {
    const planId = e.target.value;
    const precio = e.target.selectedOptions[0]?.dataset?.price;
    const precioInput = document.getElementById('planPrice');
    // Detectar si el plan permite precio editable
    const editable = (planId === 'accesorio_contado' || planId === 'imei_contado');
    if (precioInput) {
      precioInput.value = precio || '';
      if (editable) {
        precioInput.removeAttribute('readonly');
        precioInput.style.background = '#fff';
      } else {
        precioInput.setAttribute('readonly', 'readonly');
        precioInput.style.background = '#f5f5f5';
      }
    }

    // Calcular y mostrar proyecciones
    this.updateProjectionDisplay();

    // Mostrar input unitario si aplica
    const unitContainer = document.getElementById('unitPriceContainer');
    const tipoPedidoEl = document.getElementById('tipoPedido');
    if (editable) {
      if (unitContainer) unitContainer.style.display = 'block';
      if (tipoPedidoEl) tipoPedidoEl.value = planId;
      const det = this.ventasManager.getPlanDetails(planId);
      const unitEl = document.getElementById('unitPrice');
      if (unitEl && det && det.precio) unitEl.value = det.precio;
    } else {
      if (unitContainer) unitContainer.style.display = 'none';
    }

    this.updateTotalDisplay();

    // Agregar listener para actualizar proyección y card al editar precio
    if (precioInput && !precioInput._listenerAdded) {
      precioInput.addEventListener('input', () => {
        this.updateProjectionDisplay();
        this.updateTotalDisplay();
      });
      precioInput._listenerAdded = true;
    }
  }

  /**
   * Actualiza la proyección según el valor actual del precio
   */
  // ...existing code...
  updateProjectionDisplay() {
    // Proyecciones deshabilitadas para nuevas ventas — limpiar display
    const projectionDisplay = document.getElementById('projectionDisplay');
    if (projectionDisplay) projectionDisplay.innerHTML = '';
  } // <-- Add this closing brace to fix the error
// ...existing code...
  

  /**
   * Agregar input de IMEI
   */
  addImeiInput() {
    const container = document.getElementById('imeisList');
    if (!container) return;

    const id = `imei-${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    div.innerHTML = `
      <input type="text" class="imei-input" placeholder="Ej: 864332073665046" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
      <button type="button" class="btn btn-danger remove-imei" style="padding: 10px 15px;">🗑️</button>
    `;

    container.appendChild(div);

    // attach listeners
    const removeBtn = div.querySelector('.remove-imei');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        div.remove();
        this.updateImeisList();
        this.updateTotalDisplay();
      });
    }

    const input = div.querySelector('.imei-input');
    if (input) {
      input.addEventListener('input', () => this.updateImeisList());
    }

    this.updateImeisList();
    this.updateTotalDisplay();
  }

  /**
   * Actualizar lista de IMEIs desde los inputs
   */
  updateImeisList() {
    const inputs = document.querySelectorAll('.imei-input');
    this.imeisList = Array.from(inputs).map(input => input.value.trim()).filter(v => v);
    this.updateTotalDisplay();
  }

  /**
   * Agregar input de accesorio
   */
  addAccesorioInput() {
    const container = document.getElementById('accesoriosList');
    if (!container) return;

    const id = `accesorio-${Date.now()}`;
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    div.innerHTML = `
      <input type="text" class="accesorio-input" placeholder="Serie/modelo del accesorio" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
      <button type="button" class="btn btn-danger remove-accesorio" style="padding: 10px 15px;">🗑️</button>
    `;
    container.appendChild(div);

    const removeBtn = div.querySelector('.remove-accesorio');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        div.remove();
        this.updateAccesoriosList();
        this.updateTotalDisplay();
      });
    }

    const input = div.querySelector('.accesorio-input');
    if (input) {
      input.addEventListener('input', () => this.updateAccesoriosList());
    }

    this.updateAccesoriosList();
    this.updateTotalDisplay();
  }

  /**
   * Actualizar lista de accesorios desde los inputs
   */
  updateAccesoriosList() {
    const inputs = document.querySelectorAll('.accesorio-input');
    this.accesoriosList = Array.from(inputs).map(input => input.value.trim()).filter(v => v);
    this.updateTotalDisplay();
  }

  /**
   * Enviar formulario
   */
  async submitForm() {
    try {
      // Actualizar listas
      this.updateImeisList();
      this.updateAccesoriosList();

      // Recolectar datos
      const planSelectEl = document.getElementById('planSelect');
      const planId = planSelectEl?.value;
      const planText = planSelectEl?.options[planSelectEl.selectedIndex]?.textContent || '';
      const formData = {
        plan: planId,
        planNombre: planText,
        planPrice: parseInt(document.getElementById('planPrice')?.value || 0),
        cedulaCliente: document.getElementById('cedulaCliente')?.value,
        numeroCliente: document.getElementById('numeroCliente')?.value,
        nombreCliente: document.getElementById('nombreCliente')?.value
      };
      // Validar duplicidad de número de pedido para ventas móviles
      if (this.currentType === 'mobile') {
        const numeroPedido = formData.numeroPedido;
        if (numeroPedido) {
          // Buscar si ya existe una venta con ese número de pedido
          const ventas = await this.ventasManager.getVentas('mobile', null, true);
          const existe = ventas.some(v => v.numeroPedido === numeroPedido);
          if (existe) {
            alert('❌ Ya existe una venta con ese número de pedido. No se puede duplicar.');
            return;
          }
        }
      }

      // Campos específicos por tipo
      if (this.currentType === 'mobile') {
        formData.tipoPedido = document.getElementById('tipoPedido')?.value;
        formData.numeroPedido = document.getElementById('numeroPedido')?.value;
        formData.imeis = this.imeisList;
        formData.accesorios = this.accesoriosList;
        // Nuevo campo: tipoVenta
        const renovacionChecked = document.getElementById('checkboxRenovacion')?.checked;
        formData.tipoVenta = renovacionChecked ? 'renovacion' : 'nueva';
        // unit price (editable when tipoPedido is contado)
        const unitPriceVal = Number(document.getElementById('unitPrice')?.value || 0) || 0;
        if (unitPriceVal > 0) formData.unitPrice = unitPriceVal;
      } else {
        formData.homeNumber = document.getElementById('homeNumber')?.value;
        formData.customerName = document.getElementById('customerName')?.value;
      }

      // Validar: exigir plan seleccionado; permitir `planPrice` == 0 (accesorios contados)
      if (!formData.plan) {
        alert('❌ Debes seleccionar un plan');
        return;
      }

      if (!formData.cedulaCliente) {
        alert('❌ Debes ingresar la cédula del cliente');
        return;
      }

      // Calcular totalPrice y adjuntarlo (no editable por UI)
      formData.totalPrice = this.computeTotalPrice(formData);

      // Crear venta
      const venta = await this.ventasManager.createVenta(formData);

      // Mostrar éxito
      alert(`✅ Venta registrada:\n${this.currentType === 'mobile' ? 'Pedido: ' + formData.numeroPedido : 'Orden SIMO: ' + formData.homeNumber}`);

      // Reset
      this.resetForm();

      // Evento para que otros scripts se enteren
      window.dispatchEvent(new CustomEvent('ventaCreada', { detail: venta }));

      // Actualizar tarjeta de métricas totales
      try {
        const mets = await this.ventasManager.calcularMetricas();
        this.renderTotalsCard(mets);
      } catch (e) {}

    } catch (error) {
      console.error('❌ Error:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Reset form
   */
  resetForm() {
    // Limpiar inputs
    document.getElementById('planSelect').value = '';
    document.getElementById('planPrice').value = '';
    document.getElementById('cedulaCliente').value = '';
    document.getElementById('numeroCliente').value = '';
    document.getElementById('nombreCliente').value = '';
    document.getElementById('tipoPedido').value = '';
    document.getElementById('numeroPedido').value = '';
    document.getElementById('homeNumber').value = '';
    document.getElementById('customerName').value = '';

    // Limpiar listas
    this.imeisList = [];
    this.accesoriosList = [];
    document.getElementById('imeisList').innerHTML = '';
    document.getElementById('accesoriosList').innerHTML = '';
    document.getElementById('projectionDisplay').innerHTML = '';
    document.getElementById('totalSaleCard').innerHTML = '';
  }

  /**
   * Calcular el precio total de la venta actual (plan + accesorios/imeis contado)
   */
  computeTotalPrice(formData = null) {
    try {
      const planPrice = Number(document.getElementById('planPrice')?.value || 0) || 0;
      let total = planPrice;

      const tipoPedido = document.getElementById('tipoPedido')?.value;
      const unitPriceInput = Number(document.getElementById('unitPrice')?.value || 0) || 0;

      if (tipoPedido === 'accesorio_contado') {
        // prefer unitPriceInput if provided, else fallback to catalog
        const det = this.ventasManager.getPlanDetails('accesorio_contado');
        const unit = unitPriceInput || det?.precio || 0;
        total += (this.accesoriosList.length || 0) * unit;
      }
      if (tipoPedido === 'imei_contado') {
        const det = this.ventasManager.getPlanDetails('imei_contado');
        const unit = unitPriceInput || det?.precio || 0;
        total += (this.imeisList.length || 0) * unit;
      }

      return total;
    } catch (e) {
      return Number(document.getElementById('planPrice')?.value || 0) || 0;
    }
  }

  /**
   * Actualizar display del total de la venta y de las métricas acumuladas
   */
  async updateTotalDisplay() {
    // Mostrar total de la venta actual
    const total = this.computeTotalPrice();
    const el = document.getElementById('totalSaleCard');
    if (el) {
      el.innerHTML = `
        <div style="background:#fff8e1;padding:12px;border-radius:8px;border:1px solid #ffecb3;">
          <strong>Precio total (venta):</strong> ₡${Math.round(total).toLocaleString('es-CR')}
        </div>
      `;
    }

    // Actualizar métricas acumuladas (totalRevenue)
    try {
      const mets = await this.ventasManager.calcularMetricas();
      this.renderTotalsCard(mets);
    } catch (e) {
      // ignore
    }
  }

  renderTotalsCard(metricas) {
    const el = document.getElementById('totalSaleCard');
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="flex:1;background:#e3f2fd;padding:12px;border-radius:8px;border:1px solid #bbdefb;">
          <div style="font-size:12px;color:#333">Total ventas (importe acumulado)</div>
          <div style="font-size:18px;font-weight:700">₡${Math.round(metricas.totalRevenue || 0).toLocaleString('es-CR')}</div>
          <div style="margin-top:8px;font-size:13px;color:#222">🔹 Prepago: ₡${Math.round(metricas.totalPrepagoRevenue || 0).toLocaleString('es-CR')}</div>
          <div style="font-size:13px;color:#222">🔹 Accesorios/IMEI contado: ₡${Math.round(metricas.totalAccesorioImeiContadoRevenue || 0).toLocaleString('es-CR')}</div>
        </div>
        <div style="width:260px;text-align:right;">
          <div style="background:#fff8e1;padding:12px;border-radius:8px;border:1px solid #ffecb3;">
            <div style="font-size:12px;color:#333">Precio venta actual</div>
            <div style="font-size:16px;font-weight:700">₡${Math.round(this.computeTotalPrice()).toLocaleString('es-CR')}</div>
          </div>
        </div>
      </div>
    `;
  }
} // <-- Add this closing brace to properly end the class

// Instancia global (No auto-inicializar, esperar a que se llame desde switchVentasSubTab)
var salesForm = new SalesForm();
window.salesForm = salesForm; // Exponer globalmente

console.log('✅ SalesForm cargado (esperando inicialización manual)');
