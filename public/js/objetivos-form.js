/**
 * FORMULARIOS DE VENTAS MÓVIL Y HOGAR
 * Integración en pestaña Objetivos
 */

class ObjetivosForm {
  constructor() {
    this.currentFormType = 'mobile'; // 'mobile' o 'home'
    this.planesCache = null;
    this.currentUser = null;
    this.currentUserData = null;
    this.db = null;
    this.authUnsubscribe = null;
    this._initPromise = this._init();
  }

  async _init() {
    try {
      // Obtener referencia a Firestore
      if (window.db) {
        this.db = window.db;
      }

      // Esperar a que VentasManager esté listo
      if (window.ventasManager) {
        await window.ventasManager.ensure();
        this.planesCache = window.ventasManager.planesCache;
      } else {
        await this.loadPlanes();
      }

      // Esperar a que el usuario esté autenticado y cargar sus datos
      if (window.auth) {
        // Desuscribir listener anterior si existe
        if (this.authUnsubscribe) {
          this.authUnsubscribe();
        }
        
        this.authUnsubscribe = window.auth.onAuthStateChanged(async (user) => {
          this.currentUser = user;
          if (user) {
            await this.loadUserData(user.uid);
          }
        });
      }

      console.log('✅ ObjetivosForm inicializado');
    } catch (error) {
      console.error('❌ Error inicializando ObjetivosForm:', error);
    }
  }

  /**
   * Cargar datos del usuario desde Firestore
   */
  async loadUserData(uid) {
    try {
      if (!this.db) return;

      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const userRef = doc(this.db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        this.currentUserData = userSnap.data();
        console.log('✅ Datos del usuario cargados:', this.currentUserData);
      }
    } catch (error) {
      console.error('❌ Error cargando datos del usuario:', error);
    }
  }

  async loadPlanes() {
    try {
      const response = await fetch('/data/planes.json');
      this.planesCache = await response.json();
      console.log('✅ Planes cargados en ObjetivosForm');
    } catch (error) {
      console.error('❌ Error cargando planes:', error);
    }
  }

  async ensure() {
    await this._initPromise;
  }

  /**
   * Obtener nombre del agente
   */
  getAgenteName() {
    if (this.currentUserData) {
      return this.currentUserData.displayName || this.currentUserData.nombre || this.currentUser?.email || 'DESCONOCIDO';
    }
    return this.currentUser?.email || 'DESCONOCIDO';
  }

  /**
   * Obtener ID del agente
   */
  getAgentID() {
    if (this.currentUserData) {
      return this.currentUserData.agenteId || this.currentUser?.uid || '';
    }
    return this.currentUser?.uid || '';
  }

  /**
   * Cambiar entre formulario móvil y hogar
   */
  switchFormType(type) {
    this.currentFormType = type;
    this.renderForm();
  }

  /**
   * Obtener HTML del formulario
   */
  getFormHTML() {
    if (this.currentFormType === 'mobile') {
      return this.getFormMobileHTML();
    } else {
      return this.getFormHomeHTML();
    }
  }

  /**
   * Formulario Móvil
   */
  getFormMobileHTML() {
    const grupos = this.planesCache?.plansMobile || {};
    let opcionesPlanes = '<option value="">Selecciona un plan...</option>';

    for (const [grupoKey, grupo] of Object.entries(grupos)) {
      opcionesPlanes += `<optgroup label="${grupo.grupo}">`;
      for (const plan of grupo.planes) {
        const precioVal = (typeof plan.precio === 'number') ? plan.precio : '';
        const precioDisplay = precioVal !== '' ? `₡${precioVal.toLocaleString()}` : 'N/D';
        opcionesPlanes += `<option value="${plan.id}" data-precio="${precioVal}">${plan.nombre} - ${precioDisplay}</option>`;
      }
      opcionesPlanes += '</optgroup>';
    }

    return `
      <form id="formVentasMobile" style="max-width: 900px; margin: 0 auto;">
        <div class="card" style="margin-bottom: 24px;">
          <h3>📱 Registrar Venta Móvil Kolbi</h3>

          <!-- Fila 1: Tipo y Número de Pedido -->
          <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="tipoPedido">Tipo de Pedido *</label>
              <select id="tipoPedido" class="form-select" required>
                <option value="">Selecciona...</option>
                <option value="Komercial">Komercial</option>
                <option value="Siebel">Siebel</option>
              </select>
            </div>
            <div class="form-group">
              <label for="numeroPedido">Número de Pedido *</label>
              <input type="text" id="numeroPedido" class="form-input" placeholder="Ej: PED-001" required>
            </div>
          </div>

          <!-- Fila 2: Plan y Precio -->
          <div class="form-row" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="planMobile">Plan *</label>
              <select id="planMobile" class="form-select" required onchange="window.objetivosForm?.updatePlanPrice('mobile')">
                ${opcionesPlanes}
              </select>
            </div>
            <div class="form-group">
              <label for="planPrice">Precio ₡</label>
              <input type="number" id="planPrice" class="form-input" placeholder="0" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
            </div>
          </div>

          <!-- Fila 3: Cliente -->
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="cedulaClienteMobile">Cédula Cliente *</label>
              <input type="text" id="cedulaClienteMobile" class="form-input" placeholder="Ej: 1-1234-5678" required>
            </div>
            <div class="form-group">
              <label for="numeroClienteMobile">Teléfono Cliente</label>
              <input type="tel" id="numeroClienteMobile" class="form-input" placeholder="Ej: 8888-8888">
            </div>
            <div class="form-group">
              <label for="agenteId">Agente</label>
              <input type="text" id="agenteId" class="form-input" value="${this.getAgenteName()}" readonly style="background-color: #f5f5f5; cursor: not-allowed; font-weight: bold; color: #667eea;">
            </div>
          </div>

          <!-- Fila 4: IMEIs (Terminales) -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label>📱 IMEI - Opcional</label>
            <div id="imeisContainer" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; background-color: #fafafa;">
              <div class="imei-input-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="imei-input form-input" placeholder="IMEI del teléfono" style="flex: 1;">
                <button type="button" class="btn btn-danger" onclick="window.objetivosForm?.removeImeiField(this)" style="width: 40px; padding: 8px; display: none;">✕</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" onclick="window.objetivosForm?.addImeiField()" style="margin-top: 8px; background-color: #667eea; color: white;">➕ Agregar IMEI</button>
          </div>

          <!-- Fila 5: Accesorios -->
          <div class="form-group" style="margin-bottom: 16px;">
            <label>🎁 Accesorios (Series) - Opcional</label>
            <div id="accesoriosContainer" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; background-color: #fafafa;">
              <div class="accesorio-input-row" style="display: flex; gap: 8px; margin-bottom: 8px;">
                <input type="text" class="accesorio-input form-input" placeholder="Serie del accesorio" style="flex: 1;">
                <button type="button" class="btn btn-danger" onclick="window.objetivosForm?.removeAccesorioField(this)" style="width: 40px; padding: 8px; display: none;">✕</button>
              </div>
            </div>
            <button type="button" class="btn btn-secondary" onclick="window.objetivosForm?.addAccesorioField()" style="margin-top: 8px; background-color: #667eea; color: white;">➕ Agregar Accesorio</button>
          </div>

          <!-- Proyecciones Preview -->
          <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; border-radius: 4px; margin-bottom: 16px; display: none;" id="projectionsPreview">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <strong>Proyecciones:</strong> 
              12 meses: <span id="projection12m" style="color: #667eea; font-weight: bold;">₡0</span> | 
              Fin de año: <span id="projectionEndYear" style="color: #667eea; font-weight: bold;">₡0</span>
            </p>
          </div>

          <!-- Botones -->
          <div style="display: flex; gap: 12px;">
            <button type="submit" class="btn btn-primary" style="flex: 1; background-color: #667eea; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">✅ Registrar Venta</button>
            <button type="reset" class="btn btn-secondary" style="flex: 1; background-color: #999; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">🔄 Limpiar</button>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * Formulario Hogar
   */
  getFormHomeHTML() {
    const grupos = this.planesCache?.plansHome || {};
    let opcionesPlanes = '<option value="">Selecciona un plan...</option>';

    for (const [grupoKey, grupo] of Object.entries(grupos)) {
      opcionesPlanes += `<optgroup label="${grupo.grupo}">`;
      for (const plan of grupo.planes) {
        const precioVal = (typeof plan.precio === 'number') ? plan.precio : '';
        const precioDisplay = precioVal !== '' ? `₡${precioVal.toLocaleString()}` : 'N/D';
        opcionesPlanes += `<option value="${plan.id}" data-precio="${precioVal}">${plan.nombre} - ${precioDisplay}</option>`;
      }
      opcionesPlanes += '</optgroup>';
    }

    return `
      <form id="formVentasHome" style="max-width: 900px; margin: 0 auto;">
        <div class="card" style="margin-bottom: 24px;">
          <h3>🏠 Registrar Venta Hogar</h3>

          <!-- Fila 1: Orden SIMO y Cliente -->
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="homeNumber">Número Orden SIMO *</label>
              <input type="text" id="homeNumber" class="form-input" placeholder="Ej: SIMO-001" required>
            </div>
            <div class="form-group">
              <label for="customerName">Nombre Cliente *</label>
              <input type="text" id="customerName" class="form-input" placeholder="Nombre completo del cliente" required>
            </div>
          </div>

          <!-- Fila 2: Cédula y Teléfono -->
          <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="cedulaClienteHome">Cédula *</label>
              <input type="text" id="cedulaClienteHome" class="form-input" placeholder="Ej: 1-1234-5678" required>
            </div>
            <div class="form-group">
              <label for="numeroClienteHome">Teléfono</label>
              <input type="tel" id="numeroClienteHome" class="form-input" placeholder="Ej: 2222-2222">
            </div>
            <div class="form-group">
              <label for="agenteIdHome">Agente</label>
              <input type="text" id="agenteIdHome" class="form-input" value="${this.getAgenteName()}" readonly style="background-color: #f5f5f5; cursor: not-allowed; font-weight: bold; color: #667eea;">
            </div>
          </div>

          <!-- Fila 3: Plan y Precio -->
          <div class="form-row" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div class="form-group">
              <label for="planHome">Plan *</label>
              <select id="planHome" class="form-select" required onchange="window.objetivosForm?.updatePlanPrice('home')">
                ${opcionesPlanes}
              </select>
            </div>
            <div class="form-group">
              <label for="planPriceHome">Precio ₡</label>
              <input type="number" id="planPriceHome" class="form-input" placeholder="0" readonly style="background-color: #f5f5f5; cursor: not-allowed;">
            </div>
          </div>

          <!-- Proyecciones Preview -->
          <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; border-radius: 4px; margin-bottom: 16px; display: none;" id="projectionsPreviewHome">
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              <strong>Proyecciones:</strong> 
              12 meses: <span id="projection12mHome" style="color: #667eea; font-weight: bold;">₡0</span> | 
              Fin de año: <span id="projectionEndYearHome" style="color: #667eea; font-weight: bold;">₡0</span>
            </p>
          </div>

          <!-- Botones -->
          <div style="display: flex; gap: 12px;">
            <button type="submit" class="btn btn-primary" style="flex: 1; background-color: #667eea; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">✅ Registrar Venta</button>
            <button type="reset" class="btn btn-secondary" style="flex: 1; background-color: #999; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer;">🔄 Limpiar</button>
          </div>
        </div>
      </form>
    `;
  }

  /**
   * Renderizar el formulario actual en el DOM
   */
  renderForm() {
    const container = document.getElementById('objetivosFormContainer');
    if (!container) return;

    container.innerHTML = this.getFormHTML();
    this.attachEventListeners();
  }

  /**
   * Actualizar precio del plan automáticamente
   */
  updatePlanPrice(type) {
    let selectId = type === 'mobile' ? 'planMobile' : 'planHome';
    let priceInputId = type === 'mobile' ? 'planPrice' : 'planPriceHome';
    let projectionPreviewId = type === 'mobile' ? 'projectionsPreview' : 'projectionsPreviewHome';

    const select = document.getElementById(selectId);
    const priceInput = document.getElementById(priceInputId);
    const projectionDiv = document.getElementById(projectionPreviewId);

    if (!select || !priceInput) return;

    const selectedOption = select.options[select.selectedIndex];
    const precio = selectedOption.getAttribute('data-precio');

    if (precio) {
      priceInput.value = precio;
      this.updateProjections(type);
      // Mantener preview oculto: eliminamos la card visual de proyecciones
      if (projectionDiv) projectionDiv.style.display = 'none';
    } else {
      priceInput.value = '';
      if (projectionDiv) projectionDiv.style.display = 'none';
    }
  }

  /**
   * Calcular y mostrar proyecciones
   */
  updateProjections(type) {
    const priceInputId = type === 'mobile' ? 'planPrice' : 'planPriceHome';
    const projection12mId = type === 'mobile' ? 'projection12m' : 'projection12mHome';
    const projectionEndYearId = type === 'mobile' ? 'projectionEndYear' : 'projectionEndYearHome';

    const priceInput = document.getElementById(priceInputId);
    const projection12m = document.getElementById(projection12mId);
    const projectionEndYear = document.getElementById(projectionEndYearId);

    if (!priceInput) return;

    const precio = parseInt(priceInput.value) || 0;
    const proj12m = precio * 12;

    // Calcular meses restantes del año
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();
    const projEndYear = precio * monthsRemaining;

    if (projection12m) projection12m.textContent = `₡${proj12m.toLocaleString()}`;
    if (projectionEndYear) projectionEndYear.textContent = `₡${projEndYear.toLocaleString()}`;
  }

  /**
   * Agregar campo de IMEI
   */
  addImeiField() {
    const container = document.getElementById('imeisContainer');
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'imei-input-row';
    newRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
    newRow.innerHTML = `
      <input type="text" class="imei-input form-input" placeholder="IMEI del teléfono" style="flex: 1;">
      <button type="button" class="btn btn-danger" onclick="window.objetivosForm?.removeImeiField(this)" style="width: 40px; padding: 8px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">✕</button>
    `;
    container.appendChild(newRow);
  }

  /**
   * Remover campo de IMEI
   */
  removeImeiField(btn) {
    btn.closest('.imei-input-row').remove();
  }

  /**
   * Agregar campo de Accesorio
   */
  addAccesorioField() {
    const container = document.getElementById('accesoriosContainer');
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'accesorio-input-row';
    newRow.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
    newRow.innerHTML = `
      <input type="text" class="accesorio-input form-input" placeholder="Serie del accesorio" style="flex: 1;">
      <button type="button" class="btn btn-danger" onclick="window.objetivosForm?.removeAccesorioField(this)" style="width: 40px; padding: 8px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">✕</button>
    `;
    container.appendChild(newRow);
  }

  /**
   * Remover campo de Accesorio
   */
  removeAccesorioField(btn) {
    btn.closest('.accesorio-input-row').remove();
  }

  /**
   * Adjuntar event listeners al formulario
   */
  attachEventListeners() {
    const formMobile = document.getElementById('formVentasMobile');
    const formHome = document.getElementById('formVentasHome');

    if (formMobile) {
      formMobile.addEventListener('submit', (e) => this.handleSubmitMobile(e));
    }

    if (formHome) {
      formHome.addEventListener('submit', (e) => this.handleSubmitHome(e));
    }
  }

  /**
   * Manejar envío del formulario móvil
   */
  async handleSubmitMobile(e) {
    e.preventDefault();

    try {
      const tipoPedido = document.getElementById('tipoPedido').value;
      const numeroPedido = document.getElementById('numeroPedido').value;
      const planId = document.getElementById('planMobile').value;
      const planPrice = parseInt(document.getElementById('planPrice').value);
      const cedulaCliente = document.getElementById('cedulaClienteMobile').value;
      const numeroCliente = document.getElementById('numeroClienteMobile').value;

      // Recolectar IMEIs
      const imeis = Array.from(document.querySelectorAll('.imei-input'))
        .map(input => input.value.trim())
        .filter(val => val);

      // Recolectar Accesorios
      const accesorios = Array.from(document.querySelectorAll('.accesorio-input'))
        .map(input => input.value.trim())
        .filter(val => val);

      // Validar campos requeridos
      if (!tipoPedido || !numeroPedido || !planId || !cedulaCliente) {
        alert('⚠️ Por favor completa todos los campos requeridos (*)');
        return;
      }

      // Crear venta
      if (!window.ventasManager) {
        alert('❌ VentasManager no disponible');
        return;
      }

      await window.ventasManager.ensure();

      const ventaData = {
        agenteId: this.currentUser?.email || 'DESCONOCIDO',
        tipoPedido,
        numeroPedido,
        planId,
        planPrice,
        imeis,
        accesorios,
        cedulaCliente,
        numeroCliente: numeroCliente || null,
        createdAt: new Date(),
      };

      const result = await window.ventasManager.createVenta(ventaData);
      const ventaId = result.id;

      alert(`✅ Venta registrada exitosamente\nID: ${ventaId}`);
      document.getElementById('formVentasMobile').reset();
      document.getElementById('planPrice').value = '';
      document.getElementById('projectionsPreview').style.display = 'none';

      // Actualizar gráficas si existen
      if (window.objetivosDashboard) {
        window.objetivosDashboard.refresh();
      }
    } catch (error) {
      console.error('❌ Error registrando venta móvil:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Manejar envío del formulario hogar
   */
  async handleSubmitHome(e) {
    e.preventDefault();

    try {
      const homeNumber = document.getElementById('homeNumber').value;
      const customerName = document.getElementById('customerName').value;
      const cedulaCliente = document.getElementById('cedulaClienteHome').value;
      const numeroCliente = document.getElementById('numeroClienteHome').value;
      const planId = document.getElementById('planHome').value;
      const planPrice = parseInt(document.getElementById('planPriceHome').value);

      // Validar campos requeridos
      if (!homeNumber || !customerName || !cedulaCliente || !planId) {
        alert('⚠️ Por favor completa todos los campos requeridos (*)');
        return;
      }

      // Crear venta
      if (!window.ventasManager) {
        alert('❌ VentasManager no disponible');
        return;
      }

      await window.ventasManager.ensure();

      const ventaData = {
        agenteId: this.currentUser?.email || 'DESCONOCIDO',
        homeNumber,
        customerName,
        cedulaCliente,
        numeroCliente: numeroCliente || null,
        planId,
        planPrice,
        createdAt: new Date(),
      };

      const result = await window.ventasManager.createVenta(ventaData);
      const ventaId = result.id;

      alert(`✅ Venta registrada exitosamente\nID: ${ventaId}`);
      document.getElementById('formVentasHome').reset();
      document.getElementById('planPriceHome').value = '';
      document.getElementById('projectionsPreviewHome').style.display = 'none';

      // Actualizar gráficas si existen
      if (window.objetivosDashboard) {
        window.objetivosDashboard.refresh();
      }
    } catch (error) {
      console.error('❌ Error registrando venta hogar:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }
}

// Inicializar globalmente
window.objetivosForm = new ObjetivosForm();
console.log('✅ ObjetivosForm cargado globalmente');
