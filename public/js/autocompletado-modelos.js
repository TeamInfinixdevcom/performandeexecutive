/**
 * AUTOCOMPLETADO DE MODELOS - Sugerencias en tiempo real
 */

class AutocompletadoModelos {
  constructor() {
    this.inputModelo = null;
    this.selectBrand = null;
    this.suggestionsContainer = null;
    this.init();
  }

  init() {
    // Obtener elementos del DOM
    this.inputModelo = document.getElementById('waitlistModel');
    this.selectBrand = document.getElementById('waitlistBrand');

    if (!this.inputModelo || !this.selectBrand) {
      console.warn('⚠️ Elementos de modelo o marca no encontrados');
      return;
    }

    // Crear contenedor de sugerencias
    this.crearContenedorSugerencias();

    // Event listeners
    this.inputModelo.addEventListener('input', () => this.mostrarSugerencias());
    this.inputModelo.addEventListener('focus', () => this.mostrarSugerencias());
    this.inputModelo.addEventListener('blur', () => {
      // Ocultar sugerencias después de un pequeño delay
      setTimeout(() => this.ocultarSugerencias(), 200);
    });

    this.selectBrand.addEventListener('change', () => {
      this.inputModelo.value = ''; // Limpiar campo cuando cambia marca
      this.ocultarSugerencias();
    });

    console.log('✅ Autocompletado de modelos inicializado');
  }

  crearContenedorSugerencias() {
    // Crear contenedor si no existe
    if (!this.suggestionsContainer) {
      this.suggestionsContainer = document.createElement('div');
      this.suggestionsContainer.id = 'modelosSugerencias';
      
      const inputRect = this.inputModelo.getBoundingClientRect();
      this.suggestionsContainer.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-height: 300px;
        overflow-y: auto;
        display: none;
        z-index: 10000;
        width: ${inputRect.width}px;
        left: ${inputRect.left}px;
        top: ${inputRect.bottom + 5}px;
      `;

      document.body.appendChild(this.suggestionsContainer);
      
      console.log('📋 Contenedor de sugerencias creado (fixed):', {
        width: this.suggestionsContainer.style.width,
        inputRect: inputRect
      });
      
      // Actualizar posición al scroll/resize
      window.addEventListener('scroll', () => this.actualizarPosicion());
      window.addEventListener('resize', () => this.actualizarPosicion());
    }
  }

  actualizarPosicion() {
    if (this.suggestionsContainer && this.suggestionsContainer.style.display !== 'none') {
      const inputRect = this.inputModelo.getBoundingClientRect();
      this.suggestionsContainer.style.left = inputRect.left + 'px';
      this.suggestionsContainer.style.top = (inputRect.bottom + 5) + 'px';
      this.suggestionsContainer.style.width = inputRect.width + 'px';
    }
  }

  mostrarSugerencias() {
    const marca = this.selectBrand.value;
    const texto = this.inputModelo.value;

    if (!marca) {
      this.ocultarSugerencias();
      return;
    }

    const modelos = typeof filtrarModelos === 'function' 
      ? filtrarModelos(texto, marca) 
      : [];

    // Construir HTML de sugerencias
    let html = '';
    
    if (modelos.length > 0) {
      html += modelos.map((modelo, idx) => `
        <div 
          class="sugerencia-modelo" 
          style="
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.95em;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor = '#f5f5f5';"
          onmouseout="this.style.backgroundColor = 'white';"
          onclick="document.getElementById('waitlistModel').value = '${modelo}'; document.getElementById('modelosSugerencias').style.display = 'none'; document.getElementById('waitlistModel').focus();"
        >
          ${this.resaltarCoincidencias(modelo, texto)}
        </div>
      `).join('');
    }

    // Agregar opción de agregar modelo personalizado si hay texto y no hay coincidencias exactas
    if (texto && texto.trim().length > 0 && !modelos.some(m => m.toLowerCase() === texto.toLowerCase())) {
      html += `
        <div 
          style="
            padding: 10px 12px;
            cursor: pointer;
            background-color: #f0f8ff;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.95em;
            color: #667eea;
            font-weight: bold;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor = '#e6f2ff';"
          onmouseout="this.style.backgroundColor = '#f0f8ff';"
          onclick="window.autocompletado?.agregarModeloNuevo('${texto}'); return false;"
        >
          ➕ Agregar: "${texto}"
        </div>
      `;
    }

    if (html) {
      this.suggestionsContainer.innerHTML = html;
      this.actualizarPosicion();
      this.suggestionsContainer.style.display = 'block';
    } else {
      this.ocultarSugerencias();
    }
  }

  resaltarCoincidencias(texto, filtro) {
    if (!filtro) return texto;

    const regex = new RegExp(`(${filtro})`, 'gi');
    return texto.replace(regex, '<strong style="color: #667eea; font-weight: bold;">$1</strong>');
  }

  ocultarSugerencias() {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'none';
    }
  }

  /**
   * Agregar un modelo personalizado nuevo
   */
  agregarModeloNuevo(modelo) {
    const marca = this.selectBrand.value;
    
    if (!marca) {
      alert('⚠️ Por favor selecciona una marca primero');
      return;
    }

    if (typeof agregarModeloPersonalizado === 'function') {
      const agregado = agregarModeloPersonalizado(marca, modelo);
      
      if (agregado) {
        // Guardar en localStorage
        if (typeof guardarModelosPersonalizados === 'function') {
          guardarModelosPersonalizados();
        }
        
        // Rellenar el campo con el modelo nuevo
        this.inputModelo.value = modelo.trim().toUpperCase();
        this.ocultarSugerencias();
        
        console.log(`✅ Modelo "${modelo}" agregado a la lista de ${marca}`);
      } else {
        alert('ℹ️ Este modelo ya existe en la lista');
      }
    }
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.autocompletado = new AutocompletadoModelos();
  });
} else {
  window.autocompletado = new AutocompletadoModelos();
}

console.log('✅ Script de autocompletado cargado - Modelos del inventario lista');
