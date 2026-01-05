/**
 * Funcionalidades Avanzadas: VIP, Estadísticas Comparativas, Acciones Rápidas
 */

import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs,
    updateDoc,
    doc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        setupVIPFunctionality();
        setupQuickActions();
    }
});

// ============================================================================
// SISTEMA DE CLIENTES VIP/FAVORITOS
// ============================================================================

function setupVIPFunctionality() {
    // Agregar botón VIP a cada cliente (ejecutado al cargar clientes)
    window.toggleClientVIP = async function(clientId, isVIP) {
        if (!currentUser) return;

        try {
            const clientRef = doc(db, 'clients', clientId);
            await updateDoc(clientRef, {
                isVIP: !isVIP,
                updatedAt: serverTimestamp()
            });

            // Actualizar UI
            const vipBtn = document.querySelector(`[data-vip-btn="${clientId}"]`);
            if (vipBtn) {
                vipBtn.classList.toggle('vip-active');
                vipBtn.innerHTML = !isVIP ? '⭐' : '☆';
            }

            // Recargar clientes si existe la función
            if (window.loadClients) {
                window.loadClients();
            }
        } catch (error) {
            console.error('Error actualizando VIP:', error);
        }
    };

    // Cargar vista de clientes VIP
    window.loadVIPClients = async function() {
        if (!currentUser) return;

        try {
            const clientsRef = collection(db, 'clients');
            const q = query(
                clientsRef,
                where('executiveId', '==', currentUser.uid),
                where('isVIP', '==', true),
                orderBy('updatedAt', 'desc')
            );
            const snapshot = await getDocs(q);

            const vipContainer = document.getElementById('vipClientsContainer');
            if (!vipContainer) return;

            vipContainer.innerHTML = '';

            if (snapshot.empty) {
                vipContainer.innerHTML = '<p class="empty-message">No tienes clientes VIP. ⭐ Marca tus mejores clientes como favoritos</p>';
                return;
            }

            const vipGrid = document.createElement('div');
            vipGrid.className = 'vip-grid';

            snapshot.forEach(doc => {
                const client = doc.data();
                const vipCard = document.createElement('div');
                vipCard.className = 'vip-card';
                vipCard.innerHTML = `
                    <div class="vip-badge">⭐ VIP</div>
                    <div class="vip-card-content">
                        <h3>${client.name}</h3>
                        <p>Segmento: <strong>${client.segmento}</strong></p>
                        <p>Cédula: <strong>${client.cedula}</strong></p>
                        <p>Plan: <strong>${client.tipoPlan || 'N/A'}</strong></p>
                        <p>Score: <strong>${client.puntajeScore || 0}/100</strong></p>
                        <button class="btn btn-small btn-primary" onclick="editClientFromVIP('${doc.id}')">
                            ✏️ Editar
                        </button>
                    </div>
                `;
                vipGrid.appendChild(vipCard);
            });

            vipContainer.appendChild(vipGrid);
        } catch (error) {
            console.error('Error cargando VIPs:', error);
        }
    };
}

// ============================================================================
// ACCIONES RÁPIDAS
// ============================================================================

function setupQuickActions() {
    window.showQuickActions = function(clientId, clientName, clientPhone, clientEmail) {
        // Crear modal de acciones rápidas
        const modal = document.createElement('div');
        modal.className = 'quick-actions-modal';
        modal.innerHTML = `
            <div class="quick-actions-content">
                <h3>Acciones Rápidas - ${clientName}</h3>
                <div class="quick-actions-grid">
                    <button class="action-btn action-call" onclick="quickCall('${clientPhone || ''}')">
                        📞 Llamar
                    </button>
                    <button class="action-btn action-whatsapp" onclick="quickWhatsApp('${clientPhone || ''}', '${clientName}')">
                        💬 WhatsApp
                    </button>
                    <button class="action-btn action-email" onclick="quickEmail('${clientEmail || ''}')">
                        📧 Email
                    </button>
                    <button class="action-btn action-note" onclick="quickNote('${clientId}', '${clientName}')">
                        📝 Nota Rápida
                    </button>
                    <button class="action-btn action-schedule" onclick="quickSchedule('${clientId}', '${clientName}')">
                        📅 Agendar
                    </button>
                    <button class="action-btn action-close" onclick="this.closest('.quick-actions-modal').remove()">
                        ✕ Cerrar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    };

    window.quickCall = function(phone) {
        if (!phone) {
            alert('No hay número telefónico registrado');
            return;
        }
        window.location.href = `tel:${phone}`;
    };

    window.quickWhatsApp = function(phone, name) {
        if (!phone) {
            alert('No hay número telefónico registrado');
            return;
        }
        // Remover caracteres especiales
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Hola ${name}, ¿cómo estás?`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
    };

    window.quickEmail = function(email) {
        if (!email) {
            alert('No hay email registrado');
            return;
        }
        window.location.href = `mailto:${email}`;
    };

    window.quickNote = async function(clientId, clientName) {
        const note = prompt(`Nota rápida para ${clientName}:`);
        if (!note) return;

        try {
            const clientRef = doc(db, 'clients', clientId);
            await updateDoc(clientRef, {
                notas: note,
                updatedAt: serverTimestamp()
            });
            alert('✅ Nota guardada');
            if (window.loadClients) window.loadClients();
        } catch (error) {
            console.error('Error guardando nota:', error);
        }
    };

    window.quickSchedule = function(clientId, clientName) {
        const date = prompt(`¿Para qué fecha agendar con ${clientName}? (YYYY-MM-DD):`);
        if (!date) return;

        try {
            const datetime = new Date(date);
            if (isNaN(datetime.getTime())) {
                alert('Formato de fecha inválido');
                return;
            }

            const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Executive Performance//Calendar//EN
BEGIN:VEVENT
UID:${clientId}@executiveperformance.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${datetime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Contactar: ${clientName}
DESCRIPTION:Seguimiento con cliente: ${clientName}
END:VEVENT
END:VCALENDAR`;

            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icalContent));
            element.setAttribute('download', `${clientName}_agenda.ics`);
            element.click();
            alert('✅ Evento descargado. Ábrelo en tu calendario');
        } catch (error) {
            console.error('Error agendando:', error);
        }
    };
}

// ============================================================================
// ESTADÍSTICAS COMPARATIVAS
// ============================================================================

async function loadComparativeStats() {
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let currentMonthCount = 0;
        let previousMonthCount = 0;
        let currentMonthBySegment = { PLATINO: 0, ORO: 0, PLATA: 0, BRONCE: 0 };
        let previousMonthBySegment = { PLATINO: 0, ORO: 0, PLATA: 0, BRONCE: 0 };

        snapshot.forEach(doc => {
            const client = doc.data();
            const createdDate = new Date(client.createdAt?.toDate?.() || client.createdAt);
            const createdMonth = createdDate.getMonth();
            const createdYear = createdDate.getFullYear();

            if (createdYear === currentYear && createdMonth === currentMonth) {
                currentMonthCount++;
                currentMonthBySegment[client.segmento]++;
            } else if (createdYear === currentYear && createdMonth === (currentMonth - 1 < 0 ? 11 : currentMonth - 1)) {
                previousMonthCount++;
                previousMonthBySegment[client.segmento]++;
            }
        });

        const container = document.getElementById('statsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="stats-comparison">
                <div class="stat-card">
                    <h3>Clientes Este Mes</h3>
                    <div class="stat-value">${currentMonthCount}</div>
                    <small>${previousMonthCount > 0 ? (((currentMonthCount - previousMonthCount) / previousMonthCount) * 100).toFixed(1) + '% vs mes anterior' : 'Primer mes de registro'}</small>
                </div>
                <div class="stat-card">
                    <h3>Platino</h3>
                    <div class="stat-value">${currentMonthBySegment.PLATINO}</div>
                </div>
                <div class="stat-card">
                    <h3>Oro</h3>
                    <div class="stat-value">${currentMonthBySegment.ORO}</div>
                </div>
                <div class="stat-card">
                    <h3>Plata</h3>
                    <div class="stat-value">${currentMonthBySegment.PLATA}</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

window.loadComparativeStats = loadComparativeStats;

// ============================================================================
// EXPORTAR A EXCEL
// ============================================================================

async function exportToExcel() {
    if (!currentUser) {
        alert('Debes estar autenticado');
        return;
    }

    try {
        // Cargar librería XLSX desde CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js';
        document.head.appendChild(script);

        script.onload = async () => {
            const clientsRef = collection(db, 'clients');
            const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
            const snapshot = await getDocs(q);

            const data = [];
            snapshot.forEach(doc => {
                const client = doc.data();
                const displayName = client.name || client.nombre || '(Sin nombre)';
                data.push({
                    'Cédula': client.cedula,
                    'Nombre': displayName,
                    'Email': client.email,
                    'Teléfono': client.telefonoContacto || 'N/A',
                    'Segmento': client.segmento,
                    'Plan': client.tipoPlan,
                    'Estado': client.estadoPlan,
                    'Score': client.puntajeScore,
                    'Fecha Creación': new Date(client.createdAt?.toDate?.() || client.createdAt).toLocaleDateString('es-CR')
                });
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

            const fileName = `clientes_${currentUser.email}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);

            alert(`✅ Archivo '${fileName}' descargado`);
        };
    } catch (error) {
        console.error('Error exportando:', error);
        alert('Error al exportar datos');
    }
}

window.exportToExcel = exportToExcel;

// ============================================================================
// AGREGAR BOTONES VIP A LA INTERFAZ
// ============================================================================

// Interceptar la función displayClients para agregar botón VIP
const originalDisplayClients = window.displayClients;
window.displayClients = function(clients) {
    // Llamar función original
    originalDisplayClients?.call(this, clients);

    // Agregar botones VIP a cada cliente
    const clientCards = document.querySelectorAll('[data-client-id]');
    clientCards.forEach(card => {
        const clientId = card.getAttribute('data-client-id');
        const client = clients.find(c => c.id === clientId);
        
        if (client && !card.querySelector('[data-vip-btn]')) {
            const vipBtn = document.createElement('button');
            vipBtn.setAttribute('data-vip-btn', clientId);
            vipBtn.className = `btn btn-small ${client.isVIP ? 'vip-active' : ''} vip-button`;
            vipBtn.innerHTML = client.isVIP ? '⭐' : '☆';
            vipBtn.onclick = (e) => {
                e.stopPropagation();
                toggleClientVIP(clientId, client.isVIP);
            };
            
            card.querySelector('.client-actions')?.prepend(vipBtn);
        }
    });
};

console.log('✅ Funcionalidades avanzadas cargadas: VIP, Estadísticas, Acciones Rápidas, Excel');
