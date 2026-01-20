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

    if (precio) {
      const precioInput = document.getElementById('planPrice');
      if (precioInput) precioInput.value = precio;

      // Calcular y mostrar proyecciones
      const projections = this.ventasManager.calculateProjections(parseInt(precio));
      const projectionDisplay = document.getElementById('projectionDisplay');
      if (projectionDisplay) {
        projectionDisplay.innerHTML = `
          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px;">
            <h4 style="margin: 0 0 10px 0;">📊 Proyecciones (Plan: ₡${parseInt(precio).toLocaleString('es-CR')})</h4>
            <p style="margin: 5px 0;"><strong>12 meses:</strong> ₡${projections.months12.toLocaleString('es-CR')}</p>
            <p style="margin: 5px 0;"><strong>Hasta fin de año:</strong> ₡${projections.endOfYear.toLocaleString('es-CR')}</p>
          </div>
        `;
      }
    }
  }

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
      <button type="button" class="btn btn-danger" onclick="document.getElementById('${id}').remove();" style="padding: 10px 15px;">🗑️</button>
    `;
    container.appendChild(div);

    this.updateImeisList();
  }

  /**
   * Actualizar lista de IMEIs desde los inputs
   */
  updateImeisList() {
    const inputs = document.querySelectorAll('.imei-input');
    this.imeisList = Array.from(inputs).map(input => input.value.trim()).filter(v => v);
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
      <button type="button" class="btn btn-danger" onclick="document.getElementById('${id}').remove();" style="padding: 10px 15px;">🗑️</button>
    `;
    container.appendChild(div);

    this.updateAccesoriosList();
  }

  /**
   * Actualizar lista de accesorios desde los inputs
   */
  updateAccesoriosList() {
    const inputs = document.querySelectorAll('.accesorio-input');
    this.accesoriosList = Array.from(inputs).map(input => input.value.trim()).filter(v => v);
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
      const formData = {
        plan: document.getElementById('planSelect')?.value,
        planPrice: parseInt(document.getElementById('planPrice')?.value || 0),
        cedulaCliente: document.getElementById('cedulaCliente')?.value,
        numeroCliente: document.getElementById('numeroCliente')?.value,
        nombreCliente: document.getElementById('nombreCliente')?.value
      };

      // Campos específicos por tipo
      if (this.currentType === 'mobile') {
        formData.tipoPedido = document.getElementById('tipoPedido')?.value;
        formData.numeroPedido = document.getElementById('numeroPedido')?.value;
        formData.imeis = this.imeisList;
        formData.accesorios = this.accesoriosList;
      } else {
        formData.homeNumber = document.getElementById('homeNumber')?.value;
        formData.customerName = document.getElementById('customerName')?.value;
      }

      // Validar
      if (!formData.plan || !formData.planPrice) {
        alert('❌ Debes seleccionar un plan');
        return;
      }

      if (!formData.cedulaCliente) {
        alert('❌ Debes ingresar la cédula del cliente');
        return;
      }

      // Crear venta
      const venta = await this.ventasManager.createVenta(formData);

      // Mostrar éxito
      alert(`✅ Venta registrada:\n${this.currentType === 'mobile' ? 'Pedido: ' + formData.numeroPedido : 'Orden SIMO: ' + formData.homeNumber}`);

      // Reset
      this.resetForm();

      // Evento para que otros scripts se enteren
      window.dispatchEvent(new CustomEvent('ventaCreada', { detail: venta }));

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
  }
}

// Instancia global (No auto-inicializar, esperar a que se llame desde switchVentasSubTab)
const salesForm = new SalesForm();
window.salesForm = salesForm; // Exponer globalmente

console.log('✅ SalesForm cargado (esperando inicialización manual)');
