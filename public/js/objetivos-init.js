/**
 * INICIALIZADOR DE OBJETIVOS Y MIS VENTAS
 * Se ejecuta cuando se abre las pestañas Objetivos y Mis Ventas
 */

let objetivosTabInitialized = false;
let misVentasTabInitialized = false;

async function initObjetivosTab() {
  try {
    // Evitar reinicialización repetida
    if (objetivosTabInitialized) {
      console.log('ℹ️ Pestaña Objetivos ya inicializada, omitiendo reinicio');
      return;
    }

    // Esperar a que los módulos estén listos
    if (window.objetivosForm) {
      await window.objetivosForm.ensure();
      window.objetivosForm.renderForm();
    }

    if (window.objetivosDashboard) {
      await window.objetivosDashboard.ensure();
      await window.objetivosDashboard.loadMetricas();
    }

    objetivosTabInitialized = true;
    console.log('✅ Pestaña Objetivos inicializada');
  } catch (error) {
    console.error('❌ Error inicializando pestaña Objetivos:', error);
  }
}

async function initMisVentasTab() {
  try {
    // Evitar reinicialización repetida
    if (misVentasTabInitialized) {
      console.log('ℹ️ Pestaña Mis Ventas ya inicializada, omitiendo reinicio');
      return;
    }

    if (window.misVentas) {
      await window.misVentas.ensure();
      await window.misVentas.cargarVentas();
    }

    misVentasTabInitialized = true;
    console.log('✅ Pestaña Mis Ventas inicializada');
  } catch (error) {
    console.error('❌ Error inicializando pestaña Mis Ventas:', error);
  }
}

// Interceptar clicks en los tabs - Solo agregar listeners UNA VEZ
document.addEventListener('DOMContentLoaded', () => {
  // Listener para Objetivos
  const btnObjetivos = document.querySelector('[data-tab="objetivos"]');
  if (btnObjetivos) {
    btnObjetivos.addEventListener('click', initObjetivosTab, { once: false });
  }

  // Listener para Mis Ventas
  const btnMisVentas = document.querySelector('[data-tab="misventas"]');
  if (btnMisVentas) {
    btnMisVentas.addEventListener('click', initMisVentasTab, { once: false });
  }

  // Si la pestaña activa al cargar es Objetivos, inicializar
  if (document.querySelector('[data-tab="objetivos"]')?.classList.contains('active')) {
    setTimeout(initObjetivosTab, 500);
  }

  // Si la pestaña activa al cargar es Mis Ventas, inicializar
  if (document.querySelector('[data-tab="misventas"]')?.classList.contains('active')) {
    setTimeout(initMisVentasTab, 500);
  }
});

console.log('✅ Inicializador de Objetivos y Mis Ventas cargado');
