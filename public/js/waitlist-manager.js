/**
 * Waitlist Manager - Gestión de Lista de Espera de Terminales
 * Con paginación y sección de completados
 * 
 * @author Infinix Dev
 * @version 2.0
 */

const WaitlistManager = {
    waitlist: [],
    completedList: [],
    
    // Paginación
    currentPage: 1,
    itemsPerPage: 10,
    completedCurrentPage: 1,
    
    // ============================================
    // INICIALIZACIÓN
    // ============================================
    
    async init() {
        console.log('⏳ Inicializando WaitlistManager v2.0...');
        
        let attempts = 0;
        while ((!window.db || !window.currentUser) && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
        if (!window.db || !window.currentUser) {
            console.warn('⚠️ Firebase no disponible para Waitlist');
            return;
        }
        
        this.setupEventListeners();
        await this.loadWaitlist();
        await this.loadCompleted();
        
        console.log('✅ WaitlistManager v2.0 inicializado');
    },
    
    setupEventListeners() {
        const form = document.getElementById('waitlistForm');
        if (form) {
            form.addEventListener('submit', (e) => this.addToWaitlist(e));
        }
    },
    
    // ============================================
    // CRUD OPERACIONES
    // ============================================
    
    async addToWaitlist(event) {
        event.preventDefault();
        
        try {
            const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const clientData = {
                clientName: document.getElementById('waitlistClientName').value.trim().toUpperCase(),
                cedula: document.getElementById('waitlistCedula').value.trim(),
                phone: document.getElementById('waitlistPhone').value.trim(),
                email: document.getElementById('waitlistEmail').value.trim().toLowerCase() || null,
                brand: document.getElementById('waitlistBrand').value,
                model: document.getElementById('waitlistModel').value.trim(),
                storage: document.getElementById('waitlistStorage').value,
                notes: document.getElementById('waitlistNotes').value.trim() || null,
                userId: window.currentUser.uid,
                userEmail: window.currentUser.email,
                createdAt: Timestamp.now(),
                status: 'waiting',
                completedAt: null
            };
            
            if (!clientData.clientName || !clientData.cedula || !clientData.phone || !clientData.brand || !clientData.model || !clientData.storage) {
                this.showNotification('⚠️ Por favor completa todos los campos obligatorios', 'warning');
                return;
            }
            
            await addDoc(collection(window.db, 'lista_espera'), clientData);
            
            this.showNotification('✅ Cliente agregado a lista de espera', 'success');
            document.getElementById('waitlistForm').reset();
            await this.loadWaitlist();
            
        } catch (error) {
            console.error('Error agregando a lista de espera:', error);
            this.showNotification('❌ Error al agregar cliente', 'error');
        }
    },
    
    async loadWaitlist() {
        try {
            const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const q = query(
                collection(window.db, 'lista_espera'),
                where('userId', '==', window.currentUser.uid),
                where('status', '==', 'waiting'),
                orderBy('createdAt', 'asc')
            );
            
            const snapshot = await getDocs(q);
            
            this.waitlist = [];
            snapshot.forEach(doc => {
                this.waitlist.push({ id: doc.id, ...doc.data() });
            });
            
            this.renderWaitlist();
            this.updateStats();
            
        } catch (error) {
            console.error('Error cargando lista de espera:', error);
            if (error.code === 'failed-precondition') {
                document.getElementById('waitlistContainer').innerHTML = `
                    <div style="padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404;">
                        <p>⚠️ Se requiere crear un índice en Firestore. Por favor, espera unos minutos e intenta de nuevo.</p>
                    </div>
                `;
            }
        }
    },
    
    async loadCompleted() {
        try {
            const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const q = query(
                collection(window.db, 'lista_espera'),
                where('userId', '==', window.currentUser.uid),
                where('status', '==', 'completed'),
                orderBy('completedAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            
            this.completedList = [];
            snapshot.forEach(doc => {
                this.completedList.push({ id: doc.id, ...doc.data() });
            });
            
            this.renderCompleted();
            this.updateCompletedStats();
            
        } catch (error) {
            console.error('Error cargando completados:', error);
            
            // Si el índice aún se está construyendo o no hay datos, mostrar mensaje amigable
            const container = document.getElementById('completedContainer');
            if (container) {
                if (error.code === 'failed-precondition') {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #856404; background: #fff3cd; border-radius: 8px;">
                            <div style="font-size: 2rem; margin-bottom: 12px;">⏳</div>
                            <p>El índice se está construyendo. Intenta de nuevo en unos minutos.</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                            <p>No hay pedidos completados aún</p>
                        </div>
                    `;
                }
            }
            
            // Inicializar lista vacía para evitar errores
            this.completedList = [];
            this.updateCompletedStats();
        }
    },
    
    async markAsCompleted(id) {
        try {
            const { doc, updateDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            await updateDoc(doc(window.db, 'lista_espera', id), {
                status: 'completed',
                completedAt: Timestamp.now()
            });
            
            this.showNotification('✅ Cliente marcado como completado', 'success');
            await this.loadWaitlist();
            await this.loadCompleted();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('❌ Error al actualizar', 'error');
        }
    },

    /**
     * Marcar un item como perdido con nota explicativa
     */
    async markAsLost(id, note) {
        try {
            const { doc, updateDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            await updateDoc(doc(window.db, 'lista_espera', id), {
                status: 'lost',
                lostNote: note || null,
                lostAt: Timestamp.now()
            });

            this.showNotification('❌ Cliente marcado como perdido', 'info');
            await this.loadWaitlist();
            await this.loadCompleted();

        } catch (error) {
            console.error('Error marcando como perdido:', error);
            this.showNotification('❌ Error al actualizar', 'error');
        }
    },

    /**
     * Handler para el select de acciones en la lista
     */
    async onActionSelectChange(selectEl, id) {
        const val = selectEl.value;
        // reset early to avoid duplicate actions on accidental clicks
        selectEl.value = '';

        if (!val) return;

        if (val === 'completed') {
            if (!confirm('¿Marcar este cliente como completado?')) return;
            await this.markAsCompleted(id);
            return;
        }

        if (val === 'lost') {
            const note = prompt('Por favor escribe una nota breve explicando por qué se perdió este cliente (obligatorio):');
            if (note === null) return; // cancel
            if (!note.trim()) {
                this.showNotification('La nota es obligatoria al marcar como perdido', 'warning');
                return;
            }
            if (!confirm('¿Confirmas marcar como PERDIDO y guardar la nota?')) return;
            await this.markAsLost(id, note.trim());
            return;
        }
    },
    
    async reactivateItem(id) {
        try {
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            await updateDoc(doc(window.db, 'lista_espera', id), {
                status: 'waiting',
                completedAt: null
            });
            
            this.showNotification('🔄 Cliente reactivado en lista de espera', 'success');
            await this.loadWaitlist();
            await this.loadCompleted();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('❌ Error al reactivar', 'error');
        }
    },
    
    async deleteFromWaitlist(id) {
        if (!confirm('¿Estás seguro de eliminar este cliente de la lista?')) return;
        
        try {
            const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            await deleteDoc(doc(window.db, 'lista_espera', id));
            
            this.showNotification('🗑️ Cliente eliminado', 'success');
            await this.loadWaitlist();
            await this.loadCompleted();
            
        } catch (error) {
            console.error('Error:', error);
            this.showNotification('❌ Error al eliminar', 'error');
        }
    },
    
    // ============================================
    // PAGINACIÓN
    // ============================================
    
    goToPage(page) {
        this.currentPage = page;
        this.renderWaitlist();
    },
    
    goToCompletedPage(page) {
        this.completedCurrentPage = page;
        this.renderCompleted();
    },
    
    getPaginatedItems(items, page) {
        const start = (page - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return items.slice(start, end);
    },
    
    getTotalPages(items) {
        return Math.ceil(items.length / this.itemsPerPage);
    },
    
    renderPagination(totalPages, currentPage, goToPageFn) {
        if (totalPages <= 1) return '';
        
        let html = '<div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px; flex-wrap: wrap;">';
        
        if (currentPage > 1) {
            html += `<button onclick="${goToPageFn}(${currentPage - 1})" class="btn btn-secondary" style="padding: 8px 12px;">← Anterior</button>`;
        }
        
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        if (startPage > 1) {
            html += `<button onclick="${goToPageFn}(1)" class="btn btn-secondary" style="padding: 8px 12px;">1</button>`;
            if (startPage > 2) {
                html += `<span style="padding: 8px;">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === currentPage;
            html += `<button onclick="${goToPageFn}(${i})" 
                            class="btn ${isActive ? 'btn-primary' : 'btn-secondary'}" 
                            style="padding: 8px 12px; ${isActive ? 'font-weight: bold;' : ''}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span style="padding: 8px;">...</span>`;
            }
            html += `<button onclick="${goToPageFn}(${totalPages})" class="btn btn-secondary" style="padding: 8px 12px;">${totalPages}</button>`;
        }
        
        if (currentPage < totalPages) {
            html += `<button onclick="${goToPageFn}(${currentPage + 1})" class="btn btn-secondary" style="padding: 8px 12px;">Siguiente →</button>`;
        }
        
        html += '</div>';
        html += `<div style="text-align: center; margin-top: 10px; color: #666; font-size: 0.9rem;">
            Página ${currentPage} de ${totalPages}
        </div>`;
        
        return html;
    },
    
    // ============================================
    // RENDERIZADO - LISTA DE ESPERA
    // ============================================
    
    renderWaitlist() {
        const container = document.getElementById('waitlistContainer');
        if (!container) return;
        
        if (this.waitlist.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 16px;">📱</div>
                    <p>No hay clientes en lista de espera</p>
                </div>
            `;
            return;
        }
        
        const now = new Date();
        const totalPages = this.getTotalPages(this.waitlist);
        const paginatedItems = this.getPaginatedItems(this.waitlist, this.currentPage);
        
        let html = `
            <div style="margin-bottom: 16px; color: #666;">
                Mostrando ${paginatedItems.length} de ${this.waitlist.length} clientes en espera
            </div>
            <div class="waitlist-table" style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                            <th style="padding: 12px; text-align: left;">Estado</th>
                            <th style="padding: 12px; text-align: left;">Cliente</th>
                            <th style="padding: 12px; text-align: left;">Cédula</th>
                            <th style="padding: 12px; text-align: left;">Contacto</th>
                            <th style="padding: 12px; text-align: left;">Equipo Solicitado</th>
                            <th style="padding: 12px; text-align: center;">Días en Espera</th>
                            <th style="padding: 12px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        paginatedItems.forEach(item => {
            const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            const daysWaiting = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            const isUrgent = daysWaiting >= 5;
            
            const statusColor = isUrgent ? '#dc3545' : (daysWaiting >= 3 ? '#ffc107' : '#28a745');
            const statusBg = isUrgent ? '#fff5f5' : (daysWaiting >= 3 ? '#fffbeb' : '#f0fff4');
            
            html += `
                <tr style="border-bottom: 1px solid #eee; background: ${isUrgent ? '#fff5f5' : 'white'};">
                    <td style="padding: 12px;">
                        <div style="
                            width: 8px; 
                            height: 40px; 
                            background: ${statusColor}; 
                            border-radius: 4px;
                            ${isUrgent ? 'animation: pulse 1s infinite;' : ''}
                        "></div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; color: #333;">${item.clientName}</div>
                        ${item.notes ? `<div style="font-size: 0.8rem; color: #666; margin-top: 4px;">📝 ${item.notes}</div>` : ''}
                    </td>
                    <td style="padding: 12px; color: #555;">${item.cedula}</td>
                    <td style="padding: 12px;">
                        <div style="color: #333;">📱 ${item.phone}</div>
                        ${item.email ? `<div style="font-size: 0.8rem; color: #666;">✉️ ${item.email}</div>` : ''}
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500; color: #333;">${item.brand} ${item.model}</div>
                        <div style="font-size: 0.85rem; color: #666;">💾 ${item.storage}</div>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <div style="
                            display: inline-block;
                            padding: 6px 14px;
                            background: ${statusBg};
                            color: ${statusColor};
                            border: 2px solid ${statusColor};
                            border-radius: 20px;
                            font-weight: 700;
                            font-size: 1rem;
                            ${isUrgent ? 'animation: shake 0.5s infinite;' : ''}
                        ">
                            ${daysWaiting} ${daysWaiting === 1 ? 'día' : 'días'}
                        </div>
                        ${isUrgent ? '<div style="font-size: 0.75rem; color: #dc3545; margin-top: 4px;">⚠️ URGENTE</div>' : ''}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <select onchange="WaitlistManager.onActionSelectChange(this, '${item.id}')" style="padding:6px 10px; font-size:0.85rem; border-radius:6px;">
                                <option value="">Acciones</option>
                                <option value="completed">✅ Completado</option>
                                <option value="lost">❌ Perdido</option>
                            </select>
                            <button onclick="WaitlistManager.deleteFromWaitlist('${item.id}')" 
                                    class="btn btn-secondary" 
                                    style="padding: 6px 12px; font-size: 0.85rem;"
                                    title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            ${this.renderPagination(totalPages, this.currentPage, 'WaitlistManager.goToPage')}
            
            <style>
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }
            </style>
        `;
        
        container.innerHTML = html;
    },
    
    // ============================================
    // RENDERIZADO - COMPLETADOS
    // ============================================
    
    renderCompleted() {
        const container = document.getElementById('completedContainer');
        if (!container) return;
        
        if (this.completedList.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                    <p>No hay pedidos completados aún</p>
                </div>
            `;
            return;
        }
        
        const totalPages = this.getTotalPages(this.completedList);
        const paginatedItems = this.getPaginatedItems(this.completedList, this.completedCurrentPage);
        
        let html = `
            <div style="margin-bottom: 16px; color: #666;">
                Mostrando ${paginatedItems.length} de ${this.completedList.length} pedidos completados
            </div>
            <div class="waitlist-table" style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #d4edda; border-bottom: 2px solid #28a745;">
                            <th style="padding: 12px; text-align: left;">Cliente</th>
                            <th style="padding: 12px; text-align: left;">Cédula</th>
                            <th style="padding: 12px; text-align: left;">Equipo Entregado</th>
                            <th style="padding: 12px; text-align: center;">Fecha Registro</th>
                            <th style="padding: 12px; text-align: center;">Fecha Completado</th>
                            <th style="padding: 12px; text-align: center;">Tiempo de Espera</th>
                            <th style="padding: 12px; text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        paginatedItems.forEach(item => {
            const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            const completedAt = item.completedAt?.toDate ? item.completedAt.toDate() : new Date(item.completedAt);
            const daysWaited = Math.floor((completedAt - createdAt) / (1000 * 60 * 60 * 24));
            
            html += `
                <tr style="border-bottom: 1px solid #eee; background: #f8fff8;">
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; color: #333;">${item.clientName}</div>
                        <div style="font-size: 0.8rem; color: #666;">📱 ${item.phone}</div>
                    </td>
                    <td style="padding: 12px; color: #555;">${item.cedula}</td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500; color: #333;">${item.brand} ${item.model}</div>
                        <div style="font-size: 0.85rem; color: #666;">💾 ${item.storage}</div>
                    </td>
                    <td style="padding: 12px; text-align: center; color: #666;">
                        ${createdAt.toLocaleDateString('es-CR')}
                    </td>
                    <td style="padding: 12px; text-align: center; color: #28a745; font-weight: 500;">
                        ${completedAt.toLocaleDateString('es-CR')}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="
                            display: inline-block;
                            padding: 4px 10px;
                            background: #e8f5e9;
                            color: #2e7d32;
                            border-radius: 12px;
                            font-weight: 500;
                        ">
                            ${daysWaited} ${daysWaited === 1 ? 'día' : 'días'}
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="WaitlistManager.reactivateItem('${item.id}')" 
                                    class="btn btn-warning" 
                                    style="padding: 6px 12px; font-size: 0.85rem;"
                                    title="Reactivar en lista de espera">
                                🔄 Reactivar
                            </button>
                            <button onclick="WaitlistManager.deleteFromWaitlist('${item.id}')" 
                                    class="btn btn-secondary" 
                                    style="padding: 6px 12px; font-size: 0.85rem;"
                                    title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
            
            ${this.renderPagination(totalPages, this.completedCurrentPage, 'WaitlistManager.goToCompletedPage')}
        `;
        
        container.innerHTML = html;
    },
    
    // ============================================
    // ESTADÍSTICAS
    // ============================================
    
    updateStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let total = this.waitlist.length;
        let urgent = 0;
        let addedToday = 0;
        
        this.waitlist.forEach(item => {
            const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
            const daysWaiting = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            
            if (daysWaiting >= 5) urgent++;
            if (createdAt >= today) addedToday++;
        });
        
        const totalEl = document.getElementById('waitlistTotal');
        const urgentEl = document.getElementById('waitlistUrgent');
        const todayEl = document.getElementById('waitlistToday');
        
        if (totalEl) totalEl.textContent = total;
        if (urgentEl) urgentEl.textContent = urgent;
        if (todayEl) todayEl.textContent = addedToday;
    },
    
    updateCompletedStats() {
        const completedCountEl = document.getElementById('waitlistCompleted');
        if (completedCountEl) {
            completedCountEl.textContent = this.completedList.length;
        }
    },
    
    // ============================================
    // UTILIDADES
    // ============================================
    
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.currentUser) {
            WaitlistManager.init();
        }
    }, 2000);
});

if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (window.currentUser && !WaitlistManager.waitlist.length) {
                WaitlistManager.init();
            }
        }, 3000);
    });
}

window.WaitlistManager = WaitlistManager;
