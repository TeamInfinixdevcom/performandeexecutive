/**
 * Agenda Manager - Gestión de Calendario y Actividades
 * Estilo Apple iOS
 * 
 * @author Infinix Dev
 * @version 1.0
 */

const AgendaManager = {
    // Estado
    currentView: 'day',
    currentDate: new Date(),
    activities: [],
    editingId: null,
    
    // Configuración
    activityTypes: {
        visita: { icon: '🚗', color: '#007AFF', label: 'Visita' },
        cita: { icon: '📅', color: '#34C759', label: 'Cita' },
        seguimiento: { icon: '🔄', color: '#FF9500', label: 'Seguimiento' },
        otro: { icon: '📝', color: '#8E8E93', label: 'Otro' }
    },
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    async init() {
        console.log('📅 Inicializando AgendaManager...');
        
        // Esperar a que Firebase esté listo
        let attempts = 0;
        while ((!window.db || !window.currentUser) && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.db || !window.currentUser) {
            console.warn('⚠️ Firebase no disponible para Agenda');
            return;
        }
        
        await this.loadActivities();
        this.renderCurrentView();
        this.updateUpcomingActivities();
        this.checkReminders();
        
        console.log('✅ AgendaManager inicializado');
    },
    
    // ============================================
    // CARGA DE DATOS
    // ============================================
    
    async loadActivities() {
        try {
            const { collection, query, where, getDocs, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const userId = window.currentUser?.uid;
            if (!userId) return;
            
            const q = query(
                collection(window.db, 'agenda'),
                where('userId', '==', userId),
                orderBy('date', 'asc')
            );
            
            const snapshot = await getDocs(q);
            this.activities = [];
            
            snapshot.forEach(doc => {
                this.activities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📅 ${this.activities.length} actividades cargadas`);
            
        } catch (error) {
            console.error('❌ Error cargando actividades:', error);
            // Intentar cargar desde localStorage como fallback
            this.loadFromLocalStorage();
        }
    },
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('agenda_activities');
            if (saved) {
                this.activities = JSON.parse(saved);
            }
        } catch (e) {
            this.activities = [];
        }
    },
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('agenda_activities', JSON.stringify(this.activities));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage');
        }
    },
    
    // ============================================
    // VISTAS
    // ============================================
    
    setView(view) {
        this.currentView = view;
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Ocultar todas las vistas
        document.querySelectorAll('.agenda-view').forEach(v => {
            v.style.display = 'none';
        });
        
        // Mostrar vista seleccionada
        const viewElement = document.getElementById(`${view}View`);
        if (viewElement) {
            viewElement.style.display = 'block';
        }
        
        this.renderCurrentView();
    },
    
    renderCurrentView() {
        this.updateDateHeader();
        
        switch (this.currentView) {
            case 'day':
                this.renderDayView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'month':
                this.renderMonthView();
                break;
        }
    },
    
    updateDateHeader() {
        const header = document.getElementById('agendaCurrentDate');
        if (!header) return;
        
        const options = { year: 'numeric', month: 'long' };
        
        if (this.currentView === 'day') {
            options.day = 'numeric';
            options.weekday = 'long';
        }
        
        header.textContent = this.currentDate.toLocaleDateString('es-ES', options);
    },
    
    // ============================================
    // VISTA DE DÍA
    // ============================================
    
    renderDayView() {
        const container = document.getElementById('dayActivities');
        const dateLabel = document.getElementById('dayViewDate');
        
        if (!container) return;
        
        const dateStr = this.formatDateKey(this.currentDate);
        const dayActivities = this.activities.filter(a => a.date === dateStr);
        
        // Actualizar etiqueta
        if (dateLabel) {
            dateLabel.textContent = this.currentDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        }
        
        if (dayActivities.length === 0) {
            container.innerHTML = `
                <div class="empty-day">
                    <p class="empty-agenda">No hay actividades para este día</p>
                    <button class="btn btn-outline" onclick="AgendaManager.showNewActivityModal()">
                        ➕ Agregar actividad
                    </button>
                </div>
            `;
            return;
        }
        
        // Ordenar por hora
        dayActivities.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
        
        container.innerHTML = dayActivities.map(activity => this.renderActivityCard(activity)).join('');
    },
    
    renderActivityCard(activity) {
        const type = this.activityTypes[activity.type] || this.activityTypes.otro;
        const isCompleted = activity.completed;
        
        return `
            <div class="activity-card ${isCompleted ? 'completed' : ''}" 
                 style="border-left-color: ${type.color};"
                 data-id="${activity.id}">
                <div class="activity-time">
                    ${activity.time || '--:--'}
                </div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-icon">${type.icon}</span>
                        <span class="activity-title">${activity.title}</span>
                        <span class="activity-type-badge" style="background: ${type.color}20; color: ${type.color};">
                            ${type.label}
                        </span>
                    </div>
                    ${activity.client ? `<div class="activity-client">👤 ${activity.client}</div>` : ''}
                    ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                </div>
                <div class="activity-actions">
                    <button class="action-btn complete-btn" onclick="AgendaManager.toggleComplete('${activity.id}')" title="${isCompleted ? 'Marcar pendiente' : 'Completar'}">
                        ${isCompleted ? '↩️' : '✅'}
                    </button>
                    <button class="action-btn edit-btn" onclick="AgendaManager.editActivity('${activity.id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" onclick="AgendaManager.deleteActivity('${activity.id}')" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    // ============================================
    // VISTA DE SEMANA
    // ============================================
    
    renderWeekView() {
        const container = document.getElementById('weekGrid');
        if (!container) return;
        
        const startOfWeek = this.getStartOfWeek(this.currentDate);
        const days = [];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        
        container.innerHTML = days.map(day => {
            const dateStr = this.formatDateKey(day);
            const dayActivities = this.activities.filter(a => a.date === dateStr);
            const isToday = this.isToday(day);
            
            return `
                <div class="week-day ${isToday ? 'today' : ''}" onclick="AgendaManager.goToDay('${dateStr}')">
                    <div class="week-day-header">
                        <span class="week-day-name">${day.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                        <span class="week-day-number ${isToday ? 'today-number' : ''}">${day.getDate()}</span>
                    </div>
                    <div class="week-day-activities">
                        ${dayActivities.slice(0, 3).map(a => {
                            const type = this.activityTypes[a.type] || this.activityTypes.otro;
                            return `
                                <div class="week-activity-dot" style="background: ${type.color};" title="${a.title}">
                                    <span class="week-activity-time">${a.time || ''}</span>
                                    <span class="week-activity-title">${a.title.substring(0, 15)}${a.title.length > 15 ? '...' : ''}</span>
                                </div>
                            `;
                        }).join('')}
                        ${dayActivities.length > 3 ? `<div class="week-more">+${dayActivities.length - 3} más</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ============================================
    // VISTA DE MES
    // ============================================
    
    renderMonthView() {
        const container = document.getElementById('monthGrid');
        if (!container) return;
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const startDay = firstDay.getDay(); // 0 = domingo
        const totalDays = lastDay.getDate();
        
        let html = '';
        
        // Días vacíos al inicio
        for (let i = 0; i < startDay; i++) {
            html += '<div class="month-day empty"></div>';
        }
        
        // Días del mes
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dateStr = this.formatDateKey(date);
            const dayActivities = this.activities.filter(a => a.date === dateStr);
            const isToday = this.isToday(date);
            const hasActivities = dayActivities.length > 0;
            
            html += `
                <div class="month-day ${isToday ? 'today' : ''} ${hasActivities ? 'has-activities' : ''}" 
                     onclick="AgendaManager.goToDay('${dateStr}')">
                    <span class="month-day-number">${day}</span>
                    ${hasActivities ? `
                        <div class="month-day-dots">
                            ${dayActivities.slice(0, 3).map(a => {
                                const type = this.activityTypes[a.type] || this.activityTypes.otro;
                                return `<span class="dot" style="background: ${type.color};"></span>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    // ============================================
    // NAVEGACIÓN
    // ============================================
    
    previousPeriod() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
        this.renderCurrentView();
    },
    
    nextPeriod() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
        this.renderCurrentView();
    },
    
    goToToday() {
        this.currentDate = new Date();
        this.renderCurrentView();
    },
    
    goToDay(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        this.currentDate = new Date(year, month - 1, day);
        this.setView('day');
    },
    
    // ============================================
    // MODAL Y FORMULARIO
    // ============================================
    
    showNewActivityModal() {
        this.editingId = null;
        
        // Limpiar formulario
        document.getElementById('activityForm').reset();
        document.getElementById('activityId').value = '';
        document.getElementById('activityDate').value = this.formatDateKey(this.currentDate);
        document.getElementById('activityModalTitle').textContent = '➕ Nueva Actividad';
        
        // Mostrar modal
        document.getElementById('activityModal').classList.remove('hidden');
    },
    
    editActivity(id) {
        const activity = this.activities.find(a => a.id === id);
        if (!activity) return;
        
        this.editingId = id;
        
        // Llenar formulario
        document.getElementById('activityType').value = activity.type || 'otro';
        document.getElementById('activityTitle').value = activity.title || '';
        document.getElementById('activityDate').value = activity.date || '';
        document.getElementById('activityTime').value = activity.time || '09:00';
        document.getElementById('activityClient').value = activity.client || '';
        document.getElementById('activityNotes').value = activity.notes || '';
        document.getElementById('activityReminder').checked = activity.reminder !== false;
        document.getElementById('activityId').value = id;
        document.getElementById('activityModalTitle').textContent = '✏️ Editar Actividad';
        
        // Mostrar modal
        document.getElementById('activityModal').classList.remove('hidden');
    },
    
    hideModal() {
        document.getElementById('activityModal').classList.add('hidden');
        this.editingId = null;
    },
    
    async saveActivity(event) {
        event.preventDefault();
        
        const activity = {
            type: document.getElementById('activityType').value,
            title: document.getElementById('activityTitle').value,
            date: document.getElementById('activityDate').value,
            time: document.getElementById('activityTime').value,
            client: document.getElementById('activityClient').value,
            notes: document.getElementById('activityNotes').value,
            reminder: document.getElementById('activityReminder').checked,
            userId: window.currentUser?.uid,
            completed: false,
            updatedAt: new Date().toISOString()
        };
        
        try {
            const { doc, setDoc, addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            if (this.editingId) {
                // Actualizar existente
                const existingActivity = this.activities.find(a => a.id === this.editingId);
                activity.completed = existingActivity?.completed || false;
                
                await setDoc(doc(window.db, 'agenda', this.editingId), activity);
                
                const index = this.activities.findIndex(a => a.id === this.editingId);
                if (index !== -1) {
                    this.activities[index] = { id: this.editingId, ...activity };
                }
                
                this.showNotification('✅ Actividad actualizada', 'success');
            } else {
                // Crear nueva
                activity.createdAt = new Date().toISOString();
                const docRef = await addDoc(collection(window.db, 'agenda'), activity);
                
                this.activities.push({ id: docRef.id, ...activity });
                this.showNotification('✅ Actividad creada', 'success');
            }
            
            this.saveToLocalStorage();
            this.hideModal();
            this.renderCurrentView();
            this.updateUpcomingActivities();
            
        } catch (error) {
            console.error('Error guardando actividad:', error);
            this.showNotification('❌ Error al guardar', 'error');
        }
    },
    
    // ============================================
    // ACCIONES
    // ============================================
    
    async toggleComplete(id) {
        const activity = this.activities.find(a => a.id === id);
        if (!activity) return;
        
        activity.completed = !activity.completed;
        
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            await updateDoc(doc(window.db, 'agenda', id), {
                completed: activity.completed,
                updatedAt: new Date().toISOString()
            });
            
            this.saveToLocalStorage();
            this.renderCurrentView();
            this.updateUpcomingActivities();
            
            this.showNotification(
                activity.completed ? '✅ Actividad completada' : '↩️ Actividad pendiente',
                'success'
            );
            
        } catch (error) {
            console.error('Error actualizando actividad:', error);
        }
    },
    
    async deleteActivity(id) {
        if (!confirm('¿Eliminar esta actividad?')) return;
        
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            await deleteDoc(doc(window.db, 'agenda', id));
            
            this.activities = this.activities.filter(a => a.id !== id);
            this.saveToLocalStorage();
            this.renderCurrentView();
            this.updateUpcomingActivities();
            
            this.showNotification('🗑️ Actividad eliminada', 'info');
            
        } catch (error) {
            console.error('Error eliminando actividad:', error);
            this.showNotification('❌ Error al eliminar', 'error');
        }
    },
    
    // ============================================
    // ACTIVIDADES PRÓXIMAS
    // ============================================
    
    updateUpcomingActivities() {
        const container = document.getElementById('upcomingActivities');
        if (!container) return;
        
        const today = this.formatDateKey(new Date());
        const upcoming = this.activities
            .filter(a => a.date >= today && !a.completed)
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return (a.time || '').localeCompare(b.time || '');
            })
            .slice(0, 5);
        
        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-agenda">No hay actividades próximas</p>';
            return;
        }
        
        container.innerHTML = upcoming.map(activity => {
            const type = this.activityTypes[activity.type] || this.activityTypes.otro;
            const dateObj = new Date(activity.date + 'T12:00:00');
            const dateStr = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            
            return `
                <div class="upcoming-item" onclick="AgendaManager.goToDay('${activity.date}')">
                    <div class="upcoming-icon" style="background: ${type.color}20; color: ${type.color};">
                        ${type.icon}
                    </div>
                    <div class="upcoming-content">
                        <div class="upcoming-title">${activity.title}</div>
                        <div class="upcoming-meta">
                            ${dateStr} ${activity.time ? '• ' + activity.time : ''}
                            ${activity.client ? '• 👤 ' + activity.client : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ============================================
    // RECORDATORIOS
    // ============================================
    
    checkReminders() {
        // Revisar cada minuto
        setInterval(() => {
            const now = new Date();
            const todayStr = this.formatDateKey(now);
            const currentTime = now.toTimeString().substring(0, 5);
            
            this.activities.forEach(activity => {
                if (activity.date === todayStr && 
                    activity.time === currentTime && 
                    activity.reminder && 
                    !activity.completed &&
                    !activity.reminded) {
                    
                    this.showReminderNotification(activity);
                    activity.reminded = true;
                }
            });
        }, 60000);
    },
    
    showReminderNotification(activity) {
        const type = this.activityTypes[activity.type] || this.activityTypes.otro;
        
        // Notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${type.icon} ${activity.title}`, {
                body: activity.client ? `Cliente: ${activity.client}` : 'Es hora de tu actividad',
                icon: '/favicon.ico'
            });
        }
        
        // También mostrar en la UI
        this.showNotification(`🔔 ${type.icon} ${activity.title}`, 'warning');
    },
    
    // ============================================
    // UTILIDADES
    // ============================================
    
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },
    
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    },
    
    showNotification(message, type = 'info') {
        if (window.showMessage) {
            window.showMessage(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
};

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Pedir permisos de notificación
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Inicializar cuando se cambia a la pestaña de agenda
window.addEventListener('load', () => {
    const agendaTab = document.querySelector('[onclick*="switchTab(\'calendario\')"]');
    if (agendaTab) {
        agendaTab.addEventListener('click', () => {
            setTimeout(() => AgendaManager.init(), 300);
        });
    }
    
    // También inicializar si ya está en la pestaña
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'tab-calendario') {
        AgendaManager.init();
    }
});

// Exponer globalmente
window.AgendaManager = AgendaManager;
