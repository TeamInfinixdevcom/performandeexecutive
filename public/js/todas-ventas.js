/**
 * TODAS LAS VENTAS - Vista de Administrador
 * Permite visualizar las ventas de todos los usuarios del sistema
 */

class TodasVentas {
  constructor() {
    this.ventas = [];
    this.usuarios = new Map(); // uid -> nombre
    this.ventasPorPagina = 20;
    this.paginaActual = 1;
    this.filtros = {
      usuario: '',
      tipo: ''
    };
    this.limiteCargaInicial = 100; // Solo 100 ventas iniciales
    this.limiteMaximo = 2000; // Máximo si se pide "Cargar más"
    this.ultimoDocMobile = null;
    this.ultimoDocHome = null;
    this.hayMasVentas = true;
    this.db = null;
    this.auth = null;
  }

  /**
   * Inicializar módulo
   */
  async init() {
    console.log('🌐 Inicializando Todas las Ventas...');
    
    // Esperar a que Firebase esté disponible
    let attempts = 0;
    while ((!window.firebaseDb || !window.firebaseAuth) && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }

    if (!window.firebaseDb || !window.firebaseAuth) {
      console.error('❌ Firebase no está disponible después de esperar');
      return;
    }
    
    // Guardar referencias locales
    this.db = window.firebaseDb;
    this.auth = window.firebaseAuth;
    
    // Verificar que sea admin
    const user = this.auth.currentUser;
    if (!user) {
      console.warn('⚠️ No hay usuario autenticado');
      return;
    }

    // Importar funciones de Firestore
    const { collection, doc, getDoc, getDocs, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    this.collection = collection;
    this.doc = doc;
    this.getDoc = getDoc;
    this.getDocs = getDocs;
    this.query = query;
    this.orderBy = orderBy;
    this.limit = limit;

    // Verificar rol
    const userDocRef = this.doc(this.db, 'users', user.uid);
    const userDoc = await this.getDoc(userDocRef);
    const userRole = (userDoc.data()?.role || '').toLowerCase(); // Convertir a minúsculas
    if (userRole !== 'admin') {
      console.error('❌ Acceso denegado: solo administradores. Rol actual:', userDoc.data()?.role);
      document.getElementById('todasVentasContainer').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
          <h3>🚫 Acceso Denegado</h3>
          <p>Esta vista está disponible solo para administradores.</p>
        </div>
      `;
      return;
    }

    await this.cargarDatos();
  }

  /**
   * Cargar todas las ventas y usuarios
   */
  async cargarDatos() {
    try {
      console.log('📊 Cargando todas las ventas...');

      // Verificar cache
      const cacheKey = 'todasVentas_admin';
      const CACHE_TIME = 2 * 60 * 1000; // 2 minutos para admin
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { ventas, usuarios, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_TIME) {
            console.log(`📦 Cache hit: ${ventas.length} ventas (${Math.round(age/1000)}s ago) - AHORRO $$`);
            this.ventas = ventas;
            this.usuarios = new Map(usuarios);
            
            // IMPORTANTE: Llenar select de usuarios desde cache
            this.llenarSelectUsuarios();
            this.renderizar();
            return;
          } else {
            console.log(`⏰ Cache expirado (${Math.round(age/1000)}s), recargando...`);
          }
        } catch (e) {
          console.warn('⚠️ Cache corrupto, limpiando...');
          localStorage.removeItem(cacheKey);
        }
      }

      // Cargar usuarios
      await this.cargarUsuarios();

      // Cargar ventas móviles
      console.log('📱 Cargando ventas móviles...');
      const ventasMobile = await this.cargarVentasPorTipo('ventas');
      console.log(`✅ ${ventasMobile.length} ventas móviles cargadas`);
      
      // Cargar ventas hogar
      console.log('🏠 Cargando ventas hogar...');
      const ventasHome = await this.cargarVentasPorTipo('ventas_hogar');
      console.log(`✅ ${ventasHome.length} ventas hogar cargadas`);

      // Combinar y ordenar por fecha
      this.ventas = [...ventasMobile, ...ventasHome].sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA;
      });

      console.log(`✅ TOTAL: ${this.ventas.length} ventas cargadas de ${this.usuarios.size} usuarios`);
      
      // Mostrar estadísticas por usuario
      const ventasPorUsuario = {};
      this.ventas.forEach(v => {
        if (v.uid) {
          ventasPorUsuario[v.uid] = (ventasPorUsuario[v.uid] || 0) + 1;
        }
      });
      console.log('📈 Ventas por usuario:', ventasPorUsuario);

      // Guardar en cache
      localStorage.setItem(cacheKey, JSON.stringify({
        ventas: this.ventas,
        usuarios: Array.from(this.usuarios.entries()),
        timestamp: Date.now()
      }));

      this.renderizar();
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      document.getElementById('todasVentasContainer').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #e74c3c;">
          <h3>❌ Error al cargar las ventas</h3>
          <p>${error.message}</p>
          <button onclick="window.todasVentas?.cargarDatos()" class="btn btn-primary" style="margin-top: 16px;">🔄 Reintentar</button>
        </div>
      `;
    }
  }

  /**
   * Cargar usuarios del sistema
   */
  async cargarUsuarios() {
    const usersCollection = this.collection(this.db, 'users');
    const q = this.query(usersCollection, this.limit(200));
    const snapshot = await this.getDocs(q);

    snapshot.forEach(doc => {
      const data = doc.data();
      this.usuarios.set(doc.id, {
        nombre: data.name || data.email || 'Usuario sin nombre',
        email: data.email,
        region: data.region || 'Sin región'
      });
    });

    console.log(`✅ ${this.usuarios.size} usuarios cargados`);
    
    // Llenar select
    this.llenarSelectUsuarios();
  }

  /**
   * Llenar select de usuarios
   */
  llenarSelectUsuarios() {
    const select = document.getElementById('filtroUsuarioTodasVentas');
    if (!select) {
      console.error('❌ Select filtroUsuarioTodasVentas no encontrado en el DOM');
      return;
    }
    
    console.log(`📋 Llenando select con ${this.usuarios.size} usuarios...`);
    
    select.innerHTML = '<option value="">Todos los usuarios</option>';
    
    if (this.usuarios.size === 0) {
      console.warn('⚠️ No hay usuarios para mostrar');
      return;
    }
    
    Array.from(this.usuarios.entries())
      .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre))
      .forEach(([uid, data]) => {
        const option = document.createElement('option');
        option.value = uid;
        option.textContent = `${data.nombre} (${data.region})`;
        select.appendChild(option);
      });
      
    console.log(`✅ Select llenado con ${this.usuarios.size} usuarios`);
  }

  /**
   * Cargar ventas de un tipo específico
   */
  async cargarVentasPorTipo(coleccion, limite = null) {
    const tipo = coleccion === 'ventas' ? 'mobile' : 'home';
    const LIMIT = limite || this.limiteCargaInicial; // 100 inicial, más si se pide
    
    const ventasCollection = this.collection(this.db, coleccion);
    const q = this.query(
      ventasCollection,
      this.orderBy('fecha', 'desc'),
      this.limit(LIMIT)
    );
    const snapshot = await this.getDocs(q);

    const ventas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      ventas.push({
        id: doc.id,
        tipo: tipo,
        ...data
      });
    });
    
    // Guardar último documento para paginación
    if (snapshot.docs.length > 0) {
      if (tipo === 'mobile') {
        this.ultimoDocMobile = snapshot.docs[snapshot.docs.length - 1];
      } else {
        this.ultimoDocHome = snapshot.docs[snapshot.docs.length - 1];
      }
    }
    
    // Verificar si hay más ventas
    if (ventas.length < LIMIT) {
      this.hayMasVentas = false;
    }
    
    console.log(`✅ ${ventas.length} ventas ${tipo} cargadas (límite: ${LIMIT})`);

    return ventas;
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros() {
    this.filtros.usuario = document.getElementById('filtroUsuarioTodasVentas')?.value || '';
    this.filtros.tipo = document.getElementById('filtroTipoTodasVentas')?.value || '';
    this.paginaActual = 1;
    this.renderizar();
  }

  /**
   * Obtener ventas filtradas
   */
  getVentasFiltradas() {
    let ventasFiltradas = [...this.ventas];

    // Filtrar por usuario
    if (this.filtros.usuario) {
      ventasFiltradas = ventasFiltradas.filter(v => v.uid === this.filtros.usuario);
    }

    // Filtrar por tipo
    if (this.filtros.tipo) {
      ventasFiltradas = ventasFiltradas.filter(v => v.tipo === this.filtros.tipo);
    }

    return ventasFiltradas;
  }

  /**
   * Renderizar vista
   */
  renderizar() {
    const container = document.getElementById('todasVentasContainer');
    if (!container) return;

    const ventasFiltradas = this.getVentasFiltradas();
    const totalPaginas = Math.ceil(ventasFiltradas.length / this.ventasPorPagina);
    
    if (this.paginaActual > totalPaginas) this.paginaActual = 1;

    const inicio = (this.paginaActual - 1) * this.ventasPorPagina;
    const fin = inicio + this.ventasPorPagina;
    const ventasPaginadas = ventasFiltradas.slice(inicio, fin);

    // Calcular totales
    const totalVentas = ventasFiltradas.length;
    const totalMobile = ventasFiltradas.filter(v => v.tipo === 'mobile').length;
    const totalHome = ventasFiltradas.filter(v => v.tipo === 'home').length;
    const totalIMEIs = ventasFiltradas.reduce((sum, v) => sum + (v.imeis?.length || 0), 0);
    
    // Usuarios únicos en ventas filtradas
    const usuariosUnicos = new Set(ventasFiltradas.map(v => v.uid).filter(Boolean));

    let html = `
      <!-- Resumen -->
      <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 1.3em;">📊 Resumen de Ventas</h3>
            <p style="margin: 0; font-size: 0.85em; opacity: 0.8;">💰 Cargadas: ${this.ventas.length} ventas (optimizado para ahorro)</p>
          </div>
          <button onclick="window.todasVentas?.forzarRecarga()" class="btn" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer;">
            🔄 Recargar
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">Total Ventas</div>
            <div style="font-size: 2em; font-weight: bold;">${totalVentas}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">📱 Móvil</div>
            <div style="font-size: 2em; font-weight: bold;">${totalMobile}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">🏠 Hogar</div>
            <div style="font-size: 2em; font-weight: bold;">${totalHome}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">📱 IMEIs</div>
            <div style="font-size: 2em; font-weight: bold;">${totalIMEIs}</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 4px;">👥 Usuarios</div>
            <div style="font-size: 2em; font-weight: bold;">${usuariosUnicos.size}</div>
          </div>
        </div>
      </div>
    `;

    // Renderizar ventas
    if (ventasPaginadas.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px; color: #999;">
          <h3>📭 No hay ventas</h3>
          <p>No se encontraron ventas con los filtros seleccionados.</p>
        </div>
      `;
    } else {
      ventasPaginadas.forEach(venta => {
        html += this.renderVenta(venta);
      });
    }

    // Botón Cargar Más (si hay más ventas disponibles)
    if (this.ventas.length < this.limiteMaximo && this.hayMasVentas) {
      html += `
        <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0 0 12px 0; color: #666;">
            📦 Mostrando ${this.ventas.length} ventas más recientes<br>
            <small style="font-size: 0.9em;">Carga inicial limitada para optimizar costos</small>
          </p>
          <button onclick="window.todasVentas?.cargarMasVentas()" class="btn btn-primary" style="background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 1em;">
            ⬇️ Cargar más ventas (hasta ${this.limiteMaximo} total)
          </button>
        </div>
      `;
    }

    // Paginación
    if (totalPaginas > 1) {
      html += this.renderPaginacion(totalPaginas);
    }

    container.innerHTML = html;
  }

  /**
   * Renderizar una venta
   */
  renderVenta(venta) {
    const usuario = this.usuarios.get(venta.uid) || { nombre: 'Usuario desconocido', region: 'N/A' };
    const fecha = venta.fecha?.toDate ? venta.fecha.toDate() : new Date(venta.fecha);
    const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const isMobile = venta.tipo === 'mobile';
    const color = isMobile ? '#667eea' : '#f5576c';
    const icon = isMobile ? '📱' : '🏠';

    return `
      <div class="card" style="margin-bottom: 16px; border-left: 4px solid ${color};">
        <!-- Header con usuario y fecha -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
          <div>
            <div style="font-size: 0.9em; color: #999; margin-bottom: 4px;">👤 Vendedor</div>
            <div style="font-weight: bold; color: #333;">${usuario.nombre}</div>
            <div style="font-size: 0.85em; color: #999;">${usuario.region} • ${usuario.email || ''}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.9em; color: #999; margin-bottom: 4px;">📅 Fecha</div>
            <div style="font-weight: bold; color: #333;">${fechaStr}</div>
            <div style="font-size: 1.5em;">${icon}</div>
          </div>
        </div>

        <!-- Detalles de la venta -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Tipo de Pedido</label>
            <p style="margin: 4px 0; color: #333;">${venta.tipoPedido || 'N/A'}</p>
          </div>
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Número de Pedido</label>
            <p style="margin: 4px 0; color: #333;">${venta.numeroPedido || 'N/A'}</p>
          </div>
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Plan</label>
            <p style="margin: 4px 0; color: #333;">${venta.planName || venta.planId || 'N/A'}</p>
          </div>
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Precio</label>
            <p style="margin: 4px 0; color: ${color}; font-weight: bold;">₡${venta.planPrice?.toLocaleString() || 0}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 12px;">
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Cédula Cliente</label>
            <p style="margin: 4px 0; color: #333;">${venta.cedulaCliente || 'N/A'}</p>
          </div>
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Teléfono</label>
            <p style="margin: 4px 0; color: #333;">${venta.numeroCliente || 'N/A'}</p>
          </div>
          ${isMobile ? `
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Terminales</label>
            <p style="margin: 4px 0; color: #333;">${venta.imeis?.length || 0} teléfonos</p>
          </div>
          <div>
            <label style="font-size: 0.85em; color: #999; font-weight: bold;">Accesorios</label>
            <p style="margin: 4px 0; color: #333;">${venta.accesorios?.length || 0} artículos</p>
          </div>
          ` : ''}
        </div>

        ${isMobile && venta.imeis && venta.imeis.length > 0 ? `
        <div style="background: #e8f4f8; border-left: 4px solid #3498db; padding: 10px; border-radius: 4px; margin-top: 12px;">
          <label style="font-size: 0.85em; color: #3498db; font-weight: bold; display: block; margin-bottom: 4px;">📱 IMEI:</label>
          <p style="margin: 0; color: #333; font-family: monospace; font-size: 0.95em;">${venta.imeis[0]}</p>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Renderizar paginación
   */
  renderPaginacion(totalPaginas) {
    return `
      <div style="display: flex; justify-content: center; gap: 8px; margin-top: 24px; align-items: center;">
        <button onclick="window.todasVentas?.irPagina(1)" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.paginaActual === 1 ? 'disabled style="opacity: 0.5;"' : ''}>«</button>
        <button onclick="window.todasVentas?.irPagina(${this.paginaActual - 1})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.paginaActual === 1 ? 'disabled style="opacity: 0.5;"' : ''}>‹</button>
        
        <div style="display: flex; gap: 4px;">
          ${Array.from({ length: Math.min(totalPaginas, 10) }, (_, i) => i + 1).map(pagina => `
            <button onclick="window.todasVentas?.irPagina(${pagina})" style="width: 36px; height: 36px; padding: 0; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; ${this.paginaActual === pagina ? 'background-color: #667eea; color: white;' : 'background-color: #f0f0f0; color: #333;'}">${pagina}</button>
          `).join('')}
        </div>

        <button onclick="window.todasVentas?.irPagina(${this.paginaActual + 1})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.paginaActual === totalPaginas ? 'disabled style="opacity: 0.5;"' : ''}>›</button>
        <button onclick="window.todasVentas?.irPagina(${totalPaginas})" class="btn btn-secondary" style="background-color: #667eea; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;" ${this.paginaActual === totalPaginas ? 'disabled style="opacity: 0.5;"' : ''}>»</button>
      </div>
      <div style="text-align: center; margin-top: 12px; color: #999; font-size: 0.9em;">
        Página ${this.paginaActual} de ${totalPaginas}
      </div>
    `;
  }

  /**
   * Ir a página específica
   */
  irPagina(pagina) {
    this.paginaActual = pagina;
    this.renderizar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Forzar recarga (limpiar cache)
   */
  forzarRecarga() {
    console.log('🔄 Forzando recarga de ventas...');
    localStorage.removeItem('todasVentas_admin');
    this.ventas = [];
    this.usuarios.clear();
    this.hayMasVentas = true;
    this.cargarDatos();
  }

  /**
   * Cargar más ventas (expandir límite)
   */
  async cargarMasVentas() {
    try {
      console.log('⬇️ Cargando más ventas...');
      
      // Limpiar cache y recargar con límite mayor
      localStorage.removeItem('todasVentas_admin');
      
      // Cargar con límite expandido
      console.log('📱 Cargando ventas móviles...');
      const ventasMobile = await this.cargarVentasPorTipo('ventas', this.limiteMaximo);
      
      console.log('🏠 Cargando ventas hogar...');
      const ventasHome = await this.cargarVentasPorTipo('ventas_hogar', this.limiteMaximo);

      // Combinar y ordenar
      this.ventas = [...ventasMobile, ...ventasHome].sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA;
      });

      console.log(`✅ TOTAL: ${this.ventas.length} ventas cargadas`);
      
      // Guardar en cache
      localStorage.setItem('todasVentas_admin', JSON.stringify({
        ventas: this.ventas,
        usuarios: Array.from(this.usuarios.entries()),
        timestamp: Date.now()
      }));

      this.renderizar();
    } catch (error) {
      console.error('❌ Error cargando más ventas:', error);
      alert('Error al cargar más ventas: ' + error.message);
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.todasVentas = new TodasVentas();
  });
} else {
  window.todasVentas = new TodasVentas();
}

console.log('✅ Módulo Todas las Ventas cargado');
