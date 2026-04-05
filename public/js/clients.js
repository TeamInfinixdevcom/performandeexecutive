/**
 * Sistema de Gestión de Clientes ICE
 * Executive Performance - CRM
 */

import { auth, db, functions } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Variables globales
let currentUser = null;
let currentEditId = null;
let allClients = [];
let filteredClients = [];
let selectedClientId = null;
let editingInteractionId = null;
let isSavingInteraction = false;

// Variables de paginación
let currentPage = 1;
let itemsPerPage = 5;
let totalPages = 1;

// Elementos del DOM
const btnAddClient = document.getElementById('btnAddClient');
const btnLoadClients = document.getElementById('btnLoadClients');
const btnCancelForm = document.getElementById('btnCancelForm');
const btnSearch = document.getElementById('btnSearch');
const btnClearSearch = document.getElementById('btnClearSearch');
const formSection = document.getElementById('formSection');
const clientForm = document.getElementById('clientForm');
const clientsContainer = document.getElementById('clientsContainer');
const messageBox = document.getElementById('messageBox');
const searchInput = document.getElementById('searchInput');
const filterSegment = document.getElementById('filterSegment');
const btnExportClients = document.getElementById('btnExportClients');
const tipoClienteSelect = document.getElementById('tipoCliente');
const fechaGroup = document.getElementById('fechaGroup');

// Elementos de paginación
const paginationControls = document.getElementById('paginationControls');
const btnPrevPage = document.getElementById('btnPrevPage');
const btnNextPage = document.getElementById('btnNextPage');
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const pageNumbers = document.getElementById('pageNumbers');

// Modal
const clientDetailModal = document.getElementById('clientDetailModal');
const closeModal = document.getElementById('closeModal');
const btnEditClient = document.getElementById('btnEditClient');
const btnDeleteClient = document.getElementById('btnDeleteClient');
const interactionForm = document.getElementById('interactionForm');

// Esperar autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Usuario autenticado UID:', user.uid, 'email:', user.email);
        currentUser = user;
        loadClients();
    }
});

// Event Listeners
if (btnExportClients) {
    btnExportClients.addEventListener('click', async () => {
        // Importar SheetJS dinámicamente
        if (!window.XLSX) {
            await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(module => {
                window.XLSX = module;
            });
        }
        // Preparar datos para exportar
        const exportData = filteredClients.map(client => ({
            'ID': client.id,
            'Nombre': client.name,
            'Cédula': client.cedula,
            'Email': client.email || '',
            'Segmento': client.segmento,
            'Score': client.score,
            'Categoría': client.categoria,
            'Estado': client.estado,
            'Móviles': Array.isArray(client.serviciosMoviles) ? client.serviciosMoviles.join(', ') : client.serviciosMoviles,
            'Fijos': Array.isArray(client.serviciosFijos) ? client.serviciosFijos.join(', ') : client.serviciosFijos,
            'Última actualización': (client.updatedAt || client.createdAt) ? (window.safeFormatDate ? window.safeFormatDate(client.updatedAt || client.createdAt) : localSafeFormatDate(client.updatedAt || client.createdAt)) : ''
        }));
        const ws = window.XLSX.utils.json_to_sheet(exportData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        window.XLSX.writeFile(wb, 'clientes.xlsx');
    });
}
// Función debounce para búsqueda en tiempo real
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Event listeners
btnAddClient.addEventListener('click', showForm);
btnLoadClients.addEventListener('click', loadClients);
btnCancelForm.addEventListener('click', hideForm);
clientForm.addEventListener('submit', handleClientSubmit);
if (tipoClienteSelect) tipoClienteSelect.addEventListener('change', onTipoClienteChange);
btnSearch.addEventListener('click', searchClients);
btnClearSearch.addEventListener('click', clearSearch);
filterSegment.addEventListener('change', filterBySegment);

// 🔍 Búsqueda en tiempo real mientras escribes
if (searchInput) {
    searchInput.addEventListener('input', debounce(searchClients, 300));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchClients();
        }
    });
}
closeModal.addEventListener('click', hideModal);
btnEditClient.addEventListener('click', editSelectedClient);
btnDeleteClient.addEventListener('click', deleteSelectedClient);
interactionForm.addEventListener('submit', handleInteractionSubmit);

// LOCAL FALLBACKS: Si `safe-data-validation.js` no se carga antes, usar helpers locales
function localSafeFormatDate(timestamp, fallback = 'Sin fecha') {
    if (!timestamp) return fallback;
    try {
        let date;
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            date = new Date(timestamp);
        }
        if (isNaN(date.getTime())) return fallback;
        return date.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        return fallback;
    }
}

function localSafeClientDisplay(client) {
    if (!client) return { id: 'unknown', name: 'CLIENTE SIN DATOS', cedula: 'SIN CÉDULA', score: 0, categoria: 'B', segmento: 'BRONCE', estado: 'ACTIVO', serviciosMoviles: [], serviciosFijos: [], updatedAt: null };
    return {
        id: client.id || 'unknown',
        name: client.name || client.nombre || 'CLIENTE SIN NOMBRE',
        cedula: client.cedula || 'SIN CÉDULA',
        telefono: client.telefono || client.telefonoContacto || client.moviles || client.serviciosMoviles?.[0] || client.celulares || 'SIN TELÉFONO',
        email: client.email || 'SIN EMAIL',
        score: client.score || client.puntajeScore || 0,
        categoria: client.categoria || client.categoriaCrediticia || 'B',
        segmento: client.segmento || 'BRONCE',
        estado: client.estado || client.estadoPlan || 'ACTIVO',
        tipoPlan: client.tipoPlan || 'SIN PLAN',
        serviciosMoviles: client.serviciosMoviles || [],
        serviciosFijos: client.serviciosFijos || [],
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        _original: client
    };
}

function onTipoClienteChange() {
    try {
        const tipo = (document.getElementById('tipoCliente') && document.getElementById('tipoCliente').value) || 'fisico';
        if (fechaGroup) {
            if (tipo === 'juridico') {
                fechaGroup.style.display = 'none';
                const fechaInput = document.getElementById('fechaNacimiento');
                if (fechaInput) fechaInput.value = '';
            } else {
                fechaGroup.style.display = '';
            }
        }
        // update cedula label when juridico
        const labelCedula = document.getElementById('labelCedula');
        if (labelCedula) {
            labelCedula.textContent = (tipo === 'juridico') ? 'Cédula Jurídica:' : 'Cédula: *';
        }
    } catch (e) {
        // fail silently
    }
}

// Event listeners de paginación
if (btnPrevPage) btnPrevPage.addEventListener('click', previousPage);
if (btnNextPage) btnNextPage.addEventListener('click', nextPage);
if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener('change', changeItemsPerPage);
    console.log('✅ Listener de paginación registrado');
}

/**
 * Mostrar mensaje
 */
function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box message-${type}`;
    messageBox.classList.remove('hidden');
    
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 5000);
}

/**
 * Mostrar formulario
 */
function showForm() {
    formSection.classList.remove('hidden');
    currentEditId = null;
    clientForm.reset();
    document.getElementById('formTitle').textContent = 'Agregar Nuevo Cliente';
    // default to físico and ensure fecha visible
    if (tipoClienteSelect) tipoClienteSelect.value = 'fisico';
    onTipoClienteChange();
    window.scrollTo({ top: formSection.offsetTop - 20, behavior: 'smooth' });
}

/**
 * Ocultar formulario
 */
function hideForm() {
    formSection.classList.add('hidden');
    currentEditId = null;
    clientForm.reset();
}

/**
 * Cargar todos los clientes del ejecutivo - CON CACHE Y LIMIT
 */
async function loadClients(forceRefresh = false) {
    if (!currentUser) return;
    
    try {
        const cacheKey = `clients_${currentUser.uid}`;
        const CACHE_TIME = 5 * 60 * 1000; // 5 minutos
        
        // Verificar cache
        if (!forceRefresh) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    
                    if (age < CACHE_TIME) {
                        allClients = data;
                        displayClients(allClients);
                        updateStats(allClients);
                        console.log(`📦 Cache hit: ${allClients.length} clientes (${Math.round(age/1000)}s ago) - AHORRO $$`);
                        showMessage(`✅ ${allClients.length} clientes cargados (cache)`, 'success');
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }
        }
        
        // Mostrar skeleton loading
        showLoadingSkeleton();
        showMessage('⏳ Cargando clientes...', 'info');
        
        // OPTIMIZACIÓN: Límite ajustable - 1000 clientes para asegurar que todos vean sus datos
        const { limit: limitFn } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const CLIENT_LIMIT = 1000; // Aumentado a 1000 - suficiente para todos los ejecutivos
        
        const q = query(
            collection(db, 'clients'),
            where('executiveId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limitFn(CLIENT_LIMIT)
        );
        
        const querySnapshot = await getDocs(q);
        allClients = [];
        
        querySnapshot.forEach((doc) => {
            allClients.push({ id: doc.id, ...doc.data() });
        });
        
        // Advertir si se alcanzó el límite
        if (allClients.length >= CLIENT_LIMIT) {
            console.warn(`⚠️ Se alcanzó el límite de ${CLIENT_LIMIT} clientes. Si tienes más clientes, contáctanos para aumentar el límite.`);
            showMessage(`⚠️ Mostrando ${CLIENT_LIMIT} clientes. Si necesitas ver más, contáctanos.`, 'warning');
        }
        
        // Guardar en cache
        localStorage.setItem(cacheKey, JSON.stringify({
            data: allClients,
            timestamp: Date.now()
        }));
        
        displayClients(allClients);
        updateStats(allClients);
        console.log(`🔥 Firestore read: ${allClients.length} clientes - COSTO $$`);
        showMessage(`✅ ${allClients.length} clientes cargados`, 'success');
        
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        clientsContainer.innerHTML = '<p class="empty-message">❌ Error al cargar clientes. Intenta de nuevo.</p>';
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Mostrar clientes en la interfaz con paginación
 */
function displayClients(clients) {
    filteredClients = clients;
    currentPage = 1;
    
    if (clients.length === 0) {
        clientsContainer.innerHTML = '<p class="empty-message">No se encontraron clientes.</p>';
        paginationControls.classList.add('hidden');
        return;
    }
    
    // Calcular páginas
    totalPages = Math.ceil(clients.length / itemsPerPage);
    
    // Mostrar paginación si hay más de una página
    if (totalPages > 1) {
        paginationControls.classList.remove('hidden');
    } else {
        paginationControls.classList.add('hidden');
    }
    
    showPage(currentPage);
}

/**
 * Mostrar página específica
 */
function showPage(pageNum) {
    const start = (pageNum - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageClients = filteredClients.slice(start, end);
    
    // Renderizar clientes con validación segura
    const clientsHTML = pageClients.map(client => {
        // Usar validación segura para todos los campos (fallback local si no existe)
        const safeClient = window.safeClientDisplay ? window.safeClientDisplay(client) : localSafeClientDisplay(client);
        return `
        <div class="client-card segment-${safeClient.segmento.toLowerCase()}" data-id="${safeClient.id}" data-client-id="${safeClient.id}">
            <div class="client-card-header">
                <h3>${safeClient.name}</h3>
                <span class="segment-badge ${safeClient.segmento.toLowerCase()}">${safeClient.segmento}</span>
            </div>
            <div class="client-card-body">
                <p><strong>📄 Cédula:</strong> ${safeClient.cedula}</p>
                <p><strong>📱 Móviles:</strong> ${window.safeFormatArray ? window.safeFormatArray(client.serviciosMoviles) : formatArray(client.serviciosMoviles)}</p>
                <p><strong>📞 Fijos:</strong> ${window.safeFormatArray ? window.safeFormatArray(client.serviciosFijos) : formatArray(client.serviciosFijos)}</p>
                <p><strong>⭐ Score:</strong> ${safeClient.score} | <strong>Categoría:</strong> ${safeClient.categoria}</p>
                <p><strong>📋 Estado:</strong> ${safeClient.estado}</p>
            </div>
            <div class="client-card-footer">
                <button onclick="viewClientDetail('${safeClient.id}')" class="btn btn-small btn-primary">👁️ Ver Detalle</button>
                <small>Última actualización: ${window.safeFormatDate ? window.safeFormatDate(client.updatedAt || client.createdAt) : localSafeFormatDate(client.updatedAt || client.createdAt)}</small>
            </div>
        </div>`
    }).join('');
    
    clientsContainer.innerHTML = clientsHTML || '<p class="empty-message">No hay clientes en esta página.</p>';
    
    // Actualizar información de paginación
    updatePaginationInfo(start, end);
}

/**
 * Actualizar información de paginación
 */
function updatePaginationInfo(start, end) {
    const elStart = document.getElementById('showingStart');
    const elEnd = document.getElementById('showingEnd');
    const elTotal = document.getElementById('totalResults');

    if (elStart) elStart.textContent = filteredClients.length > 0 ? start + 1 : 0;
    if (elEnd) elEnd.textContent = Math.min(end, filteredClients.length);
    if (elTotal) elTotal.textContent = filteredClients.length;
    
    updatePageButtons();
}

/**
 * Actualizar botones de página
 */
function updatePageButtons() {
    // Habilitar/deshabilitar botones de navegación
    if (btnPrevPage) btnPrevPage.disabled = currentPage === 1;
    if (btnNextPage) btnNextPage.disabled = currentPage === totalPages;
    
    // Generar números de página
    const pageButtonsHTML = generatePageButtons();
    if (pageNumbers) {
        pageNumbers.innerHTML = pageButtonsHTML;
        
        // Añadir event listeners a los botones de página
        const pageButtons = pageNumbers.querySelectorAll('.page-btn[data-page]');
        pageButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const pageNum = parseInt(this.getAttribute('data-page'));
                goToPage(pageNum);
            });
        });
    }
}

/**
 * Generar botones de números de página
 */
function generatePageButtons() {
    let html = '';
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }
    
    // Botón primera página
    if (start > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (start > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Botones de página
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    // Botón última página
    if (end < totalPages) {
        if (end < totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    return html;
}

/**
 * Ir a página específica
 */
function goToPage(pageNum) {
    console.log(`📄 Navegando a página ${pageNum} de ${totalPages}`);
    if (pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        showPage(currentPage);
        // Scroll suave hacia arriba de la sección de clientes
        const clientSection = document.getElementById('clientsContainer');
        if (clientSection) {
            clientSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Exponer globalmente por si acaso
window.goToPage = goToPage;

/**
 * Página anterior
 */
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Página siguiente
 */
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/**
 * Cambiar elementos por página
 */
function changeItemsPerPage() {
    const newValue = itemsPerPageSelect ? itemsPerPageSelect.value : '5';
    itemsPerPage = parseInt(newValue) || 5;
    currentPage = 1;
    console.log(`📄 Cambiando a ${itemsPerPage} items por página`);
    
    // Recalcular total de páginas
    totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    
    // Mostrar la primera página con la nueva cantidad
    showPage(currentPage);
}

/**
 * Actualizar estadísticas
 */
function updateStats(clients) {
    const updateElement = (id, value) => {
        const elem = document.getElementById(id);
        if (elem) elem.textContent = value;
    };
    
    updateElement('totalClients', clients.length);
    updateElement('totalPlatino', clients.filter(c => c.segmento === 'PLATINO').length);
    updateElement('totalOro', clients.filter(c => c.segmento === 'ORO').length);
    updateElement('totalPlata', clients.filter(c => c.segmento === 'PLATA').length);
    updateElement('totalBronce', clients.filter(c => c.segmento === 'BRONCE').length);
    updateElement('totalBlack', clients.filter(c => c.segmento === 'BLACK').length);
}

/**
 * Guardar o actualizar cliente
 */
async function handleClientSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) return;

    // Validación de campos obligatorios
    const cedula = document.getElementById('cedula').value.trim();
    const name = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const domicilio = document.getElementById('domicilio').value.trim();
    const tipoPlan = document.getElementById('tipoPlan').value.trim();
    const estadoPlan = document.getElementById('estadoPlan').value;
    const segmento = document.getElementById('segmento').value;
    const categoriaCrediticia = document.getElementById('categoriaCrediticia').value;

    // Validar email simple
    const emailRegex = /^.+@.+\..+$/;

    if (!cedula || !name || !email || !domicilio || !tipoPlan || !estadoPlan || !segmento || !categoriaCrediticia) {
        showMessage('❌ Por favor completa todos los campos obligatorios.', 'error');
        return;
    }
    if (!emailRegex.test(email)) {
        showMessage('❌ Ingresa un correo electrónico válido.', 'error');
        return;
    }

    const clientData = {
        cedula,
        name: name.toUpperCase(),
        email,
        // fechaNacimiento only for natural persons
        fechaNacimiento: (document.getElementById('tipoCliente') && document.getElementById('tipoCliente').value === 'fisico') ? document.getElementById('fechaNacimiento').value : null,
        tipoCliente: (document.getElementById('tipoCliente') && document.getElementById('tipoCliente').value) || 'fisico',
        domicilio,
        serviciosMoviles: document.getElementById('serviciosMoviles').value.split(',').map(s => s.trim()).filter(s => s),
        serviciosFijos: document.getElementById('serviciosFijos').value.split(',').map(s => s.trim()).filter(s => s),
        tipoPlan,
        estadoPlan,
        segmento,
        puntajeScore: parseInt(document.getElementById('puntajeScore').value) || 0,
        categoriaCrediticia,
        notas: document.getElementById('notas').value.trim(),
        executiveId: currentUser.uid,
        executiveName: currentUser.displayName || currentUser.email,
        updatedAt: Timestamp.now()
    };

    try {
        if (currentEditId) {
            // Actualizar cliente
            const docRef = doc(db, 'clients', currentEditId);
            const docSnap = await getDoc(docRef);
            const clientAnterior = docSnap.data();
            
            await updateDoc(docRef, clientData);
            
            // Registrar venta si cambió el plan
            if (clientAnterior.tipoPlan !== clientData.tipoPlan || 
                clientAnterior.segmento !== clientData.segmento) {
                await window.registerPlanUpdate?.(clientData, clientAnterior.tipoPlan, currentEditId);
            }
            
            showMessage('✅ Cliente actualizado exitosamente', 'success');
        } else {
            // Crear cliente nuevo con ID fijo: `${executiveId}_${cedula}`
            clientData.createdAt = Timestamp.now();
            clientData.interactions = [];

            // Normalizar cédula para usar en ID (sin espacios ni caracteres raros)
            const safeCedula = cedula.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
            const clientId = `${currentUser.uid}_${safeCedula}`;
            const clientRef = doc(db, 'clients', clientId);

            // Comprobar si ya existe un cliente con ese ID para este ejecutivo
            const existing = await getDoc(clientRef);
            if (existing.exists()) {
                showMessage('❌ Ya existe un cliente con esa cédula para este ejecutivo.', 'error');
                return;
            }

            // Crear el documento con setDoc
            await setDoc(clientRef, clientData);

            // Registrar venta nueva (si aplica) usando el ID calculado
            await window.registerNewClientSale?.(clientData, clientId);

            showMessage('✅ Cliente agregado exitosamente', 'success');
        }
        
        hideForm();
        loadClients();
        
    } catch (error) {
        console.error('Error al guardar cliente:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Ver detalle del cliente
 */
window.viewClientDetail = async function(clientId) {
    if (!clientId) return;
    try {
        const docSnap = await getDoc(doc(db, 'clients', clientId));
        
        if (docSnap.exists()) {
            const client = { id: docSnap.id, ...docSnap.data() };
            selectedClientId = clientId;
            displayClientDetail(client);
            clientDetailModal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
};

/**
 * Mostrar detalle del cliente en modal
 */
function displayClientDetail(client) {
    document.getElementById('modalClientName').textContent = client.name;
    
    const interactions = client.interactions || [];
    const interactionsHTML = interactions.length > 0 
        ? interactions.map(int => {
            const canEdit = int.id; // only interactions with an id can be edited
                        return `
                        <div class="interaction-item" data-int-id="${int.id || ''}">
                                <div class="interaction-header">
                                    <strong>${int.type}</strong> - ${int.result}
                                    ${canEdit ? `<button class="btn btn-small btn-link" onclick="editInteraction('${client.id}','${int.id}')">Editar</button>` : ''}
                                    ${canEdit ? `<button class="btn btn-small btn-link text-danger" onclick="deleteInteraction('${client.id}','${int.id}')">Borrar</button>` : ''}
                                </div>
                                <br><small>${formatDate(int.date)}</small>
                                <p>${int.notes}</p>
                        </div>`
        }).join('')
        : '<p>No hay interacciones registradas</p>';
    
    // Calcular interacciones (cualquier resultado) en el año actual
    const currentYear = (new Date()).getFullYear();
    const interactionsThisYear = (client.interactions || []).reduce((count, int) => {
        try {
            const dateObj = int.date && typeof int.date.toDate === 'function' ? int.date.toDate() : new Date(int.date);
            if (dateObj.getFullYear() === currentYear) return count + 1;
        } catch (e) {
            // ignore malformed dates
        }
        return count;
    }, 0);

    const contactCounterHTML = `
        <p><strong>Contactos ${currentYear}:</strong>
           <span style="font-weight:bold; ${interactionsThisYear < 4 ? 'color: #e53935;' : 'color: #2e7d32;'}">${interactionsThisYear}/4</span>
           ${interactionsThisYear < 4 ? '<span style="color:#e53935; margin-left:8px;">⚠️ Faltan contactaciones</span>' : ''}
        </p>
    `;

    document.getElementById('clientDetailContent').innerHTML = `
        <div class="client-detail-info">
            <h3>📋 Información Personal</h3>
            <p><strong>Cédula:</strong> ${client.cedula}</p>
            <p><strong>Email:</strong> ${client.email || 'No registrado'}</p>
            <p><strong>Fecha Nacimiento:</strong> ${client.fechaNacimiento || 'No registrado'}</p>
            <p><strong>Domicilio:</strong> ${client.domicilio || 'No registrado'}</p>
            
            <h3>📱 Servicios</h3>
            <p><strong>Móviles:</strong> ${formatArray(client.serviciosMoviles)}</p>
            <p><strong>Fijos:</strong> ${formatArray(client.serviciosFijos)}</p>
            <p><strong>Tipo Plan:</strong> ${client.tipoPlan || 'No especificado'}</p>
            <p><strong>Estado:</strong> ${client.estadoPlan}</p>
            
            <h3>⭐ Clasificación</h3>
            <p><strong>Segmento:</strong> <span class="segment-badge ${client.segmento.toLowerCase()}">${client.segmento}</span></p>
            <p><strong>Score:</strong> ${client.puntajeScore || 'N/A'}</p>
            <p><strong>Categoría:</strong> ${client.categoriaCrediticia || 'N/A'}</p>
            ${contactCounterHTML}
            <p><strong>Notas:</strong> ${client.notas || 'Ninguna'}</p>
            <h3>📞 Historial de Interacciones</h3>
            ${interactionsHTML}
        </div>
    `;
}

/**
 * Editar cliente seleccionado
 */
function editSelectedClient() {
    if (!selectedClientId) return;
    
    getDoc(doc(db, 'clients', selectedClientId)).then(docSnap => {
        if (docSnap.exists()) {
            const client = docSnap.data();
            currentEditId = selectedClientId;
            
            // Llenar formulario
            document.getElementById('cedula').value = client.cedula;
            document.getElementById('nombre').value = client.name;
            document.getElementById('email').value = client.email || '';
            // tipoCliente default to 'fisico' if not present
            document.getElementById('tipoCliente').value = client.tipoCliente || 'fisico';
            document.getElementById('fechaNacimiento').value = client.fechaNacimiento || '';
            onTipoClienteChange();
            document.getElementById('domicilio').value = client.domicilio || '';
            document.getElementById('serviciosMoviles').value = client.serviciosMoviles.join(', ');
            document.getElementById('serviciosFijos').value = client.serviciosFijos.join(', ');
            document.getElementById('tipoPlan').value = client.tipoPlan || '';
            document.getElementById('estadoPlan').value = client.estadoPlan;
            document.getElementById('segmento').value = client.segmento;
            document.getElementById('puntajeScore').value = client.puntajeScore || '';
            document.getElementById('categoriaCrediticia').value = client.categoriaCrediticia || '';
            document.getElementById('notas').value = client.notas || '';
            
            document.getElementById('formTitle').textContent = 'Editar Cliente';
            formSection.classList.remove('hidden');
            hideModal();
            window.scrollTo({ top: formSection.offsetTop - 20, behavior: 'smooth' });
        }
    });
}

/**
 * Eliminar cliente
 */
async function deleteSelectedClient() {
    if (!selectedClientId) return;
    
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'clients', selectedClientId));
        showMessage('✅ Cliente eliminado exitosamente', 'success');
        hideModal();
        loadClients();
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Guardar interacción
 */
async function handleInteractionSubmit(e) {
    e.preventDefault();

    if (!selectedClientId || isSavingInteraction) return;
    const targetClientId = selectedClientId;
    isSavingInteraction = true;

    const submitBtn = interactionForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    
    const interaction = {
        type: document.getElementById('interactionType').value,
        notes: document.getElementById('interactionNotes').value,
        result: document.getElementById('interactionResult').value,
        date: Timestamp.now(),
        executiveName: currentUser.displayName || currentUser.email
    };
    
    try {
        const clientRef = doc(db, 'clients', targetClientId);
        const docSnap = await getDoc(clientRef);

        if (docSnap.exists()) {
            const client = docSnap.data();
            const interactions = client.interactions || [];
            // Assign an id to the interaction so it can be edited later
            const newId = editingInteractionId || String(Date.now());
            interaction.id = newId;

            let updatedInteractions;
            if (editingInteractionId) {
                // Replace existing interaction with same id
                updatedInteractions = interactions.map(i => String(i.id) === String(editingInteractionId) ? { ...i, ...interaction, date: Timestamp.now() } : i);
                // reset editing state
                editingInteractionId = null;
                const cancelBtn = document.getElementById('btnCancelInteractionEdit');
                if (cancelBtn) cancelBtn.remove();
            } else {
                updatedInteractions = [...interactions, interaction];
            }

            await updateDoc(clientRef, { 
                interactions: updatedInteractions,
                updatedAt: Timestamp.now()
            });
            
            // ✅ NUEVO: Si la interacción es exitosa, registrar como venta
            if (interaction.result.toLowerCase() === 'exitoso') {
                try {
                    const recordSuccessfulSale = httpsCallable(functions, 'recordSuccessfulSale');
                    await recordSuccessfulSale({
                        clientId: targetClientId,
                        segmento: client.segmento
                    });
                    console.log('✅ Venta registrada en métricas');
                } catch (saleError) {
                    console.error('⚠️ Error registrando venta:', saleError);
                    // No bloquear - la interacción ya se guardó
                }
            }
            
            showMessage('✅ Interacción registrada exitosamente', 'success');
            interactionForm.reset();
            // Restore submit button text
            if (submitBtn) submitBtn.textContent = 'Registrar Interacción';
            // Invalidate clients cache so list shows updated timestamps
            try { if (currentUser) localStorage.removeItem(`clients_${currentUser.uid}`); } catch(e){}
            viewClientDetail(targetClientId); // Recargar detalle
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    } finally {
        isSavingInteraction = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

/**
 * Mostrar loading skeleton
 */
function showLoadingSkeleton() {
    const skeletonHTML = Array(5).fill().map(() => `
        <div class="client-card skeleton-card">
            <div class="skeleton-header">
                <div class="skeleton-text skeleton-title"></div>
                <div class="skeleton-badge"></div>
            </div>
            <div class="skeleton-body">
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
                <div class="skeleton-text"></div>
            </div>
        </div>
    `).join('');
    clientsContainer.innerHTML = skeletonHTML;
}

/**
 * Buscar clientes
 */
function searchClients() {
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        displayClients(allClients);
        return;
    }
    
    const filtered = allClients.filter(client => {
        // ✅ Usar validación segura en búsqueda
        const safeClient = window.safeClientDisplay ? window.safeClientDisplay(client) : localSafeClientDisplay(client);
        
        // Normalizar valores para comparación (mayúsculas)
        const clientName = (safeClient.name || '').toUpperCase();
        const clientCedula = (safeClient.cedula || '').toUpperCase();
        
        return (
            clientName.includes(searchTerm) ||
            clientCedula.includes(searchTerm) ||
            (client.serviciosMoviles && client.serviciosMoviles.some(num => num && num.toUpperCase().includes(searchTerm))) ||
            (client.serviciosFijos && client.serviciosFijos.some(num => num && num.toUpperCase().includes(searchTerm)))
        );
    });
    
    displayClients(filtered);
    showMessage(`🔍 ${filtered.length} cliente(s) encontrado(s)`, 'info');
}

/**
 * Limpiar búsqueda
 */
function clearSearch() {
    searchInput.value = '';
    filterSegment.value = '';
    displayClients(allClients);
    showMessage('✅ Búsqueda limpiada', 'info');
}

/**
 * Filtrar por segmento
 */
function filterBySegment() {
    const segment = filterSegment.value;
    
    if (!segment) {
        displayClients(allClients);
        return;
    }
    
    const filtered = allClients.filter(client => client.segmento === segment);
    displayClients(filtered);
    showMessage(`✅ Filtrado por: ${segment} (${filtered.length} cliente(s))`, 'info');
}

/**
 * Ocultar modal
 */
function hideModal() {
    clientDetailModal.classList.add('hidden');
    selectedClientId = null;
}

/**
 * Formatear array
 */
function formatArray(arr) {
    return arr && arr.length > 0 ? arr.join(', ') : 'Ninguno';
}

/**
 * Formatear fecha
 */
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-ES');
}

// Editar interacción: cargarla en el formulario para edición
window.editInteraction = async function(clientId, interactionId) {
    try {
        if (!clientId || !interactionId) return;
        const docSnap = await getDoc(doc(db, 'clients', clientId));
        if (!docSnap.exists()) return showMessage('❌ Cliente no encontrado', 'error');
        const client = docSnap.data();
        const interaction = (client.interactions || []).find(i => String(i.id) === String(interactionId));
        if (!interaction) return showMessage('❌ Interacción no encontrada', 'error');

        // Poblar formulario
        document.getElementById('interactionType').value = interaction.type || '';
        document.getElementById('interactionNotes').value = interaction.notes || '';
        document.getElementById('interactionResult').value = interaction.result || '';

        // Estado de edición
        editingInteractionId = String(interactionId);
        selectedClientId = clientId;

        // Cambiar texto del submit y mostrar botón cancelar si existe
        const submitBtn = interactionForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Guardar cambios';

        // Añadir botón cancelar dinámicamente si no existe
        let cancelBtn = document.getElementById('btnCancelInteractionEdit');
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'btnCancelInteractionEdit';
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn btn-secondary btn-small';
            cancelBtn.textContent = 'Cancelar edición';
            cancelBtn.style.marginLeft = '8px';
            cancelBtn.addEventListener('click', cancelEditInteraction);
            interactionForm.querySelector('button[type="submit"]').after(cancelBtn);
        }

        window.scrollTo({ top: interactionForm.offsetTop - 20, behavior: 'smooth' });

    } catch (error) {
        console.error('Error editInteraction:', error);
        showMessage('❌ Error al preparar edición', 'error');
    }
}

function cancelEditInteraction() {
    editingInteractionId = null;
    interactionForm.reset();
    selectedClientId = null;
    const submitBtn = interactionForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Registrar Interacción';
    const cancelBtn = document.getElementById('btnCancelInteractionEdit');
    if (cancelBtn) cancelBtn.remove();
}

// Borrar interacción específica
window.deleteInteraction = async function(clientId, interactionId) {
    if (!clientId || !interactionId) return;
    if (!confirm('¿Eliminar interacción? Esta acción no se puede deshacer.')) return;

    try {
        const clientRef = doc(db, 'clients', clientId);
        const snap = await getDoc(clientRef);
        if (!snap.exists()) return showMessage('❌ Cliente no encontrado', 'error');

        const client = snap.data();
        const interactions = client.interactions || [];
        const filtered = interactions.filter(i => String(i.id) !== String(interactionId));

        await updateDoc(clientRef, { interactions: filtered, updatedAt: Timestamp.now() });

        // Invalidate clients cache so list shows updated timestamps
        try { if (currentUser) localStorage.removeItem(`clients_${currentUser.uid}`); } catch(e){}

        // If we were editing this interaction, cancel edit state
        if (editingInteractionId && String(editingInteractionId) === String(interactionId)) {
            cancelEditInteraction();
        }

        showMessage('✅ Interacción eliminada', 'success');
        if (selectedClientId === clientId) {
            viewClientDetail(clientId);
        }
    } catch (error) {
        console.error('Error deleting interaction:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
    }
}
