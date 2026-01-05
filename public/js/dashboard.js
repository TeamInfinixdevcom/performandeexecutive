/**
 * Dashboard y Sistema de Recordatorios
 * Executive Performance - CRM
 */

// Variables globales
let reminders = [];
let allClients = [];
let segmentChart = null;
let scoreChart = null;

// Elementos del DOM
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const reminderForm = document.getElementById('reminderForm');
const remindersList = document.getElementById('remindersList');
const notificationBell = document.getElementById('notificationBell');
const notificationBadge = document.getElementById('notificationBadge');

// ============================================
// DEFINIR switchTab PRIMERO (antes de usarla)
// ============================================
function switchTab(tabName) {
    // Ocultar todos los tab-content
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Desactivar todos los botones
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab activo
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Activar botón
    const activeBtn = document.querySelector(`button[onclick="switchTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Cargar datos según pestaña
    if (tabName === 'dashboard') {
        loadSegmentCharts();
    }
    if (tabName === 'calendario') {
        if (window.AgendaManager) {
            window.AgendaManager.init();
        }
    }
}

// Exponer globalmente INMEDIATAMENTE
window.switchTab = switchTab;

// Event Listeners para pestañas (ya no llama a switchTab directamente)
tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Obtener el atributo onclick y extraer el nombre de la pestaña
        const onclickAttr = e.target.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/switchTab\('([^']+)'\)/);
            if (match && match[1]) {
                switchTab(match[1]);
            }
        }
    });
});

if (reminderForm) reminderForm.addEventListener('submit', handleReminderSubmit);
if (notificationBell) notificationBell.addEventListener('click', showNotifications);

// Cargar recordatorios desde localStorage
function loadReminders() {
    const saved = localStorage.getItem('reminders');
    reminders = saved ? JSON.parse(saved) : [];
    displayReminders();
}

// Guardar recordatorios en localStorage
function saveReminders() {
    localStorage.setItem('reminders', JSON.stringify(reminders));
    displayReminders();
    updateNotificationBadge();
}

/**
 * Actualizar el badge de notificaciones (número de ventas pendientes)
 */
async function updateNotificationBadge() {
    try {
        // Esperar a que salesTracking esté disponible
        let attempts = 0;
        while (!window.salesTracking && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        // Si window.salesTracking está disponible, contar ventas pendientes
        if (window.salesTracking) {
            const sales = await window.salesTracking.getAllSales();
            const pendingSales = sales.filter(s => s.status === 'PENDIENTE').length;
            
            if (notificationBadge) {
                if (pendingSales > 0) {
                    notificationBadge.textContent = pendingSales;
                    notificationBadge.style.display = 'flex';
                    console.log('🔔 Badge actualizado:', pendingSales);
                } else {
                    notificationBadge.style.display = 'none';
                    console.log('🔔 Sin ventas pendientes');
                }
            }
            
            console.log('📊 Ventas pendientes actualizadas:', pendingSales);
        } else {
            // Si no hay salesTracking, mostrar recordatorios locales
            const pending = reminders.filter(r => !r.completed).length;
            if (notificationBadge && pending > 0) {
                notificationBadge.textContent = pending;
                notificationBadge.style.display = 'flex';
                console.log('🔔 Badge (recordatorios):', pending);
            } else if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ Error actualizando badge:', error);
    }
}

/**
 * Cargar gráficos de segmentos - DATOS REALES DE FIRESTORE
 */
async function loadSegmentCharts() {
    try {
        console.log('📊 loadSegmentCharts() iniciado - Cargando clientes por segmento...');
        
        // Esperar a que Chart.js esté listo
        if (!window.Chart) {
            console.warn('⏳ Esperando a Chart.js...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Esperar a que db y auth estén disponibles
        let attempts = 0;
        while ((!window.db || !window.auth) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.db || !window.auth) {
            console.error('❌ Firestore o Auth no disponibles');
            // Mostrar gráficos vacíos
            createDoughnutChart(0, 0, 0, 0, 0);
            createBarChart(0, 0, 0, 0, 0);
            return;
        }
        
        // Esperar a que el usuario esté autenticado
        let user = window.auth.currentUser;
        attempts = 0;
        while (!user && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            user = window.auth.currentUser;
            attempts++;
        }
        
        if (!user) {
            console.warn('⚠️ Usuario no autenticado, mostrando gráficos vacíos');
            createDoughnutChart(0, 0, 0, 0, 0);
            createBarChart(0, 0, 0, 0, 0);
            return;
        }
        
        console.log('📊 Usuario actual:', user.email);
        
        // Cargar clientes reales del ejecutivo desde Firestore
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const clientsQuery = query(
            collection(window.db, 'clients'),
            where('executiveId', '==', user.uid)
        );
        
        const snapshot = await getDocs(clientsQuery);
        
        // Contar clientes por segmento
        const segmentCounts = {
            PLATINO: 0,
            ORO: 0,
            PLATA: 0,
            BRONCE: 0,
            BLACK: 0
        };
        
        snapshot.forEach(doc => {
            const client = doc.data();
            const segmento = (client.segmento || '').toUpperCase();
            if (segmentCounts.hasOwnProperty(segmento)) {
                segmentCounts[segmento]++;
            }
        });
        
        console.log('📊 Clientes por segmento:', segmentCounts);
        console.log('📊 Total clientes:', snapshot.size);
        
        // Crear gráficos con datos reales
        createDoughnutChart(
            segmentCounts.PLATINO,
            segmentCounts.ORO,
            segmentCounts.PLATA,
            segmentCounts.BRONCE,
            segmentCounts.BLACK
        );
        createBarChart(
            segmentCounts.PLATINO,
            segmentCounts.ORO,
            segmentCounts.PLATA,
            segmentCounts.BRONCE,
            segmentCounts.BLACK
        );
        
        console.log('✅ Gráficos actualizados con datos reales');
        
    } catch (error) {
        console.error('❌ Error en loadMetricsData:', error);
        // Mostrar gráficos vacíos en caso de error
        createDoughnutChart(0, 0, 0, 0, 0);
        createBarChart(0, 0, 0, 0, 0);
    }
}

/**
 * Crear gráfico Doughnut
 */
function createDoughnutChart(platino, oro, plata, bronce, black) {
    const canvas = document.getElementById('segmentChartSimple');
    if (!canvas) {
        console.error('❌ Canvas segmentChartSimple no encontrado');
        return;
    }
    
    if (!window.Chart) {
        console.error('❌ Chart.js no disponible');
        return;
    }
    
    try {
        if (window.segmentChartInstance) {
            window.segmentChartInstance.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.segmentChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['🥇 Platino', '🥈 Oro', '🥉 Plata', '🔶 Bronce', '⚫ Black'],
                datasets: [{
                    data: [platino, oro, plata, bronce, black],
                    backgroundColor: [
                        '#FFD700',
                        '#C0C0C0',
                        '#A9A9A9',
                        '#CD7F32',
                        '#000000'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 13 }
                        }
                    }
                }
            }
        });
        console.log('✅ Gráfico Doughnut creado');
    } catch (error) {
        console.error('❌ Error creando Doughnut:', error);
    }
}

/**
 * Crear gráfico Bar
 */
function createBarChart(platino, oro, plata, bronce, black) {
    const canvas = document.getElementById('scoreChartSimple');
    if (!canvas) {
        console.error('❌ Canvas scoreChartSimple no encontrado');
        return;
    }
    
    if (!window.Chart) {
        console.error('❌ Chart.js no disponible');
        return;
    }
    
    try {
        if (window.scoreChartInstance) {
            window.scoreChartInstance.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        window.scoreChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['🥇 Platino', '🥈 Oro', '🥉 Plata', '🔶 Bronce', '⚫ Black'],
                datasets: [{
                    label: 'Cantidad',
                    data: [platino, oro, plata, bronce, black],
                    backgroundColor: [
                        '#FFD700',
                        '#C0C0C0',
                        '#A9A9A9',
                        '#CD7F32',
                        '#000000'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2
                        }
                    }
                }
            }
        });
        console.log('✅ Gráfico Bar creado');
    } catch (error) {
        console.error('❌ Error creando Bar:', error);
    }
}

/**
 * Manejar envío de recordatorio
 */
function handleReminderSubmit(e) {
    e.preventDefault();
    
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const title = document.getElementById('reminderTitle').value;
    const description = document.getElementById('reminderDescription').value;
    const client = document.getElementById('reminderClient').value;
    
    const reminder = {
        id: Date.now(),
        date,
        time,
        title,
        description,
        client,
        createdAt: new Date().toISOString(),
        completed: false
    };
    
    reminders.push(reminder);
    saveReminders();
    reminderForm.reset();
    
    showMessage('✅ Recordatorio guardado', 'success');
}

/**
 * Mostrar recordatorios
 */
function displayReminders() {
    // Validar que el elemento exista (puede no existir si se usa la nueva Agenda)
    if (!remindersList) {
        console.log('ℹ️ remindersList no existe, usando nueva Agenda');
        return;
    }
    
    if (reminders.length === 0) {
        remindersList.innerHTML = '<p class="empty-message">No hay recordatorios. ¡Crea uno nuevo!</p>';
        return;
    }
    
    // Ordenar por fecha
    const sorted = [...reminders].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    const today = new Date().toISOString().split('T')[0];
    
    const html = sorted.map(reminder => {
        const reminderDate = reminder.date;
        let statusClass = 'upcoming';
        
        if (reminderDate < today) {
            statusClass = 'overdue';
        } else if (reminderDate === today) {
            statusClass = 'today';
        }
        
        return `
            <div class="reminder-item ${statusClass}">
                <div class="reminder-header">
                    <h4 class="reminder-title">${reminder.title}</h4>
                    <div class="reminder-date">${formatReminderDate(reminder.date, reminder.time)}</div>
                </div>
                <p class="reminder-description">${reminder.description || 'Sin descripción'}</p>
                ${reminder.client ? `<p class="reminder-client">👤 ${reminder.client}</p>` : ''}
                <div class="reminder-actions">
                    <button onclick="completeReminder(${reminder.id})" class="btn btn-small btn-success">✓ Completado</button>
                    <button onclick="deleteReminder(${reminder.id})" class="btn btn-small btn-danger">🗑️ Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
    
    remindersList.innerHTML = html;
}

/**
 * Marcar recordatorio como completado
 */
window.completeReminder = function(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = true;
        saveReminders();
        showMessage('✅ Recordatorio completado', 'success');
    }
};

/**
 * Eliminar recordatorio
 */
window.deleteReminder = function(id) {
    if (confirm('¿Estás seguro de eliminar este recordatorio?')) {
        reminders = reminders.filter(r => r.id !== id);
        saveReminders();
        showMessage('✅ Recordatorio eliminado', 'success');
    }
};

/**
 * Formatear fecha del recordatorio
 */
function formatReminderDate(date, time) {
    const reminderDate = new Date(`${date}T${time || '00:00'}`);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const reminderDateOnly = new Date(date);
    
    let label = '';
    if (date === today.toISOString().split('T')[0]) {
        label = 'HOY';
    } else if (date === tomorrow.toISOString().split('T')[0]) {
        label = 'MAÑANA';
    } else {
        label = reminderDate.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    
    const timeStr = time ? reminderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    
    return `${label} ${timeStr}`.trim();
}

/**
 * Actualizar badge de notificaciones
 */
function updateNotificationBadge() {
    const pending = reminders.filter(r => !r.completed).length;
    const today = new Date().toISOString().split('T')[0];
    const todayReminders = reminders.filter(r => r.date === today && !r.completed);
    
    if (todayReminders.length > 0) {
        notificationBadge.textContent = todayReminders.length;
        notificationBadge.style.display = 'flex';
    } else {
        notificationBadge.style.display = 'none';
    }
}

/**
 * Mostrar notificaciones
 */
function showNotifications() {
    const today = new Date().toISOString().split('T')[0];
    const todayReminders = reminders.filter(r => r.date === today && !r.completed);
    
    if (todayReminders.length === 0) {
        alert('✅ No hay recordatorios para hoy');
        return;
    }
    
    let message = `📌 Recordatorios para hoy (${todayReminders.length}):\n\n`;
    todayReminders.forEach(r => {
        message += `• ${r.title}`;
        if (r.time) message += ` (${r.time})`;
        message += `\n  ${r.description || ''}\n\n`;
    });
    
    alert(message);
}

/**
 * Mostrar mensaje (usar función existente si está disponible)
 */
function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box message-${type}`;
        messageBox.classList.remove('hidden');
        
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 3000);
    }
}

// Cargar recordatorios al iniciar
window.addEventListener('load', () => {
    loadReminders();
    updateNotificationBadge();
    
    // Actualizar badge cada minuto
    setInterval(updateNotificationBadge, 60000);
    
    // Cargar gráficos del dashboard después de un pequeño delay para asegurar que todo esté listo
    setTimeout(() => {
        console.log('📊 Carga inicial de gráficos del dashboard...');
        loadSegmentCharts();
    }, 1500);
});

// Exponer funciones globalmente
window.updateNotificationBadge = updateNotificationBadge;
window.loadSegmentCharts = loadSegmentCharts;
window.switchTab = window.switchTab || function() {};

// Actualizar datos cuando cambian los clientes
function updateDashboardData() {
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
        loadSegmentCharts();
    }
}
