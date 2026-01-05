/**
 * Funcionalidades avanzadas para ejecutivos
 * Incluye: Metas, Pipeline, Contactos, Campañas, Actividades, Alertas
 */

import { auth, db } from './firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    setDoc, 
    doc,
    addDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;

// ============================================================================
// 1. METAS - Establecer y seguimiento de objetivos por segmento
// ============================================================================

async function loadMetas() {
    // Ahora usa el nuevo sistema de ventas
    if (window.loadSalesMetas) {
        await window.loadSalesMetas();
    }
}

window.updateMeta = window.updateMetaFromSales; // Alias para compatibilidad

// ============================================================================
// 2. PIPELINE DE VENTAS
// ============================================================================

async function loadPipeline() {
    if (!currentUser) return;

    try {
        const container = document.getElementById('pipelineContainer');
        if (!container) {
            console.log('Pipeline container no encontrado (pestaña desactivada)');
            return;
        }

        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const stages = {
            'Prospecto': [],
            'Contactado': [],
            'Negociación': [],
            'Ganado': [],
            'Perdido': []
        };

        snapshot.forEach(doc => {
            const client = doc.data();
            const stage = client.estadoPlan || 'Prospecto';
            if (stages[stage]) {
                stages[stage].push({ id: doc.id, ...client });
            } else {
                stages['Prospecto'].push({ id: doc.id, ...client });
            }
        });

        container.innerHTML = '';
        container.className = 'pipeline-columns';

        for (const [stage, clients] of Object.entries(stages)) {
            const column = document.createElement('div');
            column.className = 'pipeline-column';
            column.innerHTML = `
                <div class="pipeline-header">
                    <h3>${stage}</h3>
                    <span class="pipeline-count">${clients.length}</span>
                </div>
                <div class="pipeline-cards">
                    ${clients.map(c => `
                        <div class="pipeline-card" data-id="${c.id}">
                            <strong>${c.name}</strong>
                            <small>${getSegmentoBadge(c.segmento)} ${c.segmento}</small>
                            <p>💰 ${c.tipoPlan || 'N/A'}</p>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(column);
        }
    } catch (error) {
        console.error('Error cargando pipeline:', error);
    }
}

// ============================================================================
// 3. REPORTE DE CONTACTOS
// ============================================================================

async function loadContactReports() {
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const allInteractions = [];

        snapshot.forEach(doc => {
            const client = doc.data();
            if (client.interactions && Array.isArray(client.interactions)) {
                client.interactions.forEach(interaction => {
                    allInteractions.push({
                        clientName: client.name,
                        clientId: doc.id,
                        ...interaction
                    });
                });
            }
        });

        // Ordenar por fecha descendente
        allInteractions.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        const container = document.getElementById('contactsReportContainer');
        if (!container) {
            console.log('Contenedor de contactos no encontrado (pestaña desactivada)');
            return;
        }
        container.innerHTML = '';

        if (allInteractions.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay contactos registrados</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'contacts-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Resultado</th>
                    <th>Notas</th>
                </tr>
            </thead>
            <tbody>
                ${allInteractions.map(i => `
                    <tr>
                        <td><strong>${i.clientName}</strong></td>
                        <td><span class="badge badge-${i.type?.toLowerCase()}">${i.type || 'N/A'}</span></td>
                        <td>${new Date(i.date).toLocaleDateString('es-CR')}</td>
                        <td>${i.result || '-'}</td>
                        <td>${i.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(table);
    } catch (error) {
        console.error('Error cargando contactos:', error);
    }
}

// Aplicar filtros a contactos
window.applyContactFilters = async function() {
    const typeFilter = document.getElementById('filterContactType')?.value || '';
    const dateFilter = document.getElementById('filterContactDate')?.value || '';
    
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        let allInteractions = [];

    snapshot.forEach(doc => {
        const client = doc.data();
        if (client.interactions && Array.isArray(client.interactions)) {
            client.interactions.forEach(interaction => {
                allInteractions.push({
                    clientName: client.name,
                    clientId: doc.id,
                    ...interaction
                });
            });
        }
    });        // Aplicar filtros
        if (typeFilter) {
            allInteractions = allInteractions.filter(i => i.type === typeFilter);
        }

        if (dateFilter) {
            const filterDateObj = new Date(dateFilter);
            allInteractions = allInteractions.filter(i => {
                const intDate = new Date(i.date);
                return intDate.toDateString() === filterDateObj.toDateString();
            });
        }

        // Ordenar por fecha descendente
        allInteractions.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });

        const container = document.getElementById('contactsReportContainer');
        if (!container) return;

        container.innerHTML = '';

        if (allInteractions.length === 0) {
            container.innerHTML = '<p class="empty-message">No se encontraron contactos con estos filtros</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'contacts-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Fecha</th>
                    <th>Resultado</th>
                    <th>Notas</th>
                </tr>
            </thead>
            <tbody>
                ${allInteractions.map(i => `
                    <tr>
                        <td><strong>${i.clientName}</strong></td>
                        <td><span class="badge badge-${i.type?.toLowerCase()}">${i.type || 'N/A'}</span></td>
                        <td>${new Date(i.date).toLocaleDateString('es-CR')}</td>
                        <td>${i.result || '-'}</td>
                        <td>${i.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(table);
    } catch (error) {
        console.error('Error aplicando filtros:', error);
    }
};

window.loadContactReports = loadContactReports;

// ============================================================================
// 4. CAMPAÑAS
// ============================================================================

async function setupCampaigns() {
    const form = document.getElementById('campaignForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert('Debes estar autenticado');
            return;
        }

        const subject = document.getElementById('campaignSubject').value;
        const message = document.getElementById('campaignMessage').value;
        const segment = document.getElementById('campaignSegment').value;

        try {
            // Guardar campaña
            const campaignRef = collection(db, 'campaigns');
            await addDoc(campaignRef, {
                executiveId: currentUser.uid,
                subject,
                message,
                segment,
                createdAt: serverTimestamp(),
                status: 'Enviada'
            });

            alert('✅ Campaña creada y enviada');
            form.reset();
            loadCampaignHistory();
        } catch (error) {
            console.error('Error creando campaña:', error);
            alert('Error creando campaña');
        }
    });
}

async function loadCampaignHistory() {
    if (!currentUser) return;

    try {
        const campaignsRef = collection(db, 'campaigns');
        const q = query(
            campaignsRef,
            where('executiveId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);

        const container = document.getElementById('campaignsHistory');
        container.innerHTML = '';

        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-message">No hay campañas</p>';
            return;
        }

        snapshot.forEach(doc => {
            const campaign = doc.data();
            const campaignItem = document.createElement('div');
            campaignItem.className = 'campaign-item';
            campaignItem.innerHTML = `
                <div class="campaign-header">
                    <strong>${campaign.subject}</strong>
                    <span class="badge badge-success">${campaign.status}</span>
                </div>
                <small>Segmento: ${campaign.segment}</small>
                <small>${new Date(campaign.createdAt?.toDate?.() || Date.now()).toLocaleDateString('es-CR')}</small>
                <p>${campaign.message.substring(0, 100)}...</p>
            `;
            container.appendChild(campaignItem);
        });
    } catch (error) {
        console.error('Error cargando campañas:', error);
    }
}

// ============================================================================
// 5. ACTIVIDADES
// ============================================================================

async function loadActivities() {
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        // Solo hacer where, ordenar en el cliente para evitar índices compuestos
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const activities = [];

        snapshot.forEach(doc => {
            const client = doc.data();
            
            // Actividad: Cliente creado
            if (client.createdAt) {
                activities.push({
                    type: 'created',
                    clientName: client.name,
                    date: client.createdAt,
                    description: `Cliente creado: ${client.name}`
                });
            }

            // Actividad: Cliente editado
            if (client.updatedAt && client.updatedAt !== client.createdAt) {
                activities.push({
                    type: 'edited',
                    clientName: client.name,
                    date: client.updatedAt,
                    description: `Cliente editado: ${client.name}`
                });
            }

            // Actividades: Contactos
            if (client.interactions && Array.isArray(client.interactions)) {
                client.interactions.forEach(interaction => {
                    activities.push({
                        type: 'contacted',
                        clientName: client.name,
                        date: new Date(interaction.date),
                        description: `Contacto (${interaction.type}): ${client.name}`
                    });
                });
            }
        });

        // Ordenar por fecha descendente (en el cliente)
        activities.sort((a, b) => {
            const dateA = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
            const dateB = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
            return dateB - dateA;
        });

        const container = document.getElementById('activitiesContainer');
        if (!container) {
            console.log('Contenedor de actividades no encontrado (pestaña desactivada)');
            return;
        }
        container.innerHTML = '';

        if (activities.length === 0) {
            container.innerHTML = '<p class="empty-message">No hay actividades</p>';
            return;
        }

        activities.slice(0, 50).forEach(activity => {
            const activityEl = document.createElement('div');
            activityEl.className = `activity-item activity-${activity.type}`;
            activityEl.innerHTML = `
                <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <strong>${activity.description}</strong>
                    <small>${formatActivityDate(activity.date)}</small>
                </div>
            `;
            container.appendChild(activityEl);
        });
    } catch (error) {
        console.error('Error cargando actividades:', error);
    }
}

window.loadActivities = loadActivities;

// Aplicar filtros a actividades
window.applyActivityFilters = async function() {
    const typeFilter = document.getElementById('filterActivityType')?.value || '';
    
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        // Solo hacer where, ordenar en el cliente para evitar índices compuestos
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const activities = [];

        snapshot.forEach(doc => {
            const client = doc.data();
            const displayName = client.name || client.nombre || '(Sin nombre)';
            // Actividad: Cliente creado
            if (client.createdAt) {
                activities.push({
                    type: 'created',
                    clientName: displayName,
                    date: client.createdAt,
                    description: `Cliente creado: ${displayName}`
                });
            }

            // Actividad: Cliente editado
            if (client.updatedAt && client.updatedAt !== client.createdAt) {
                activities.push({
                    type: 'edited',
                    clientName: displayName,
                    date: client.updatedAt,
                    description: `Cliente editado: ${displayName}`
                });
            }

            // Actividades: Contactos
            if (client.interactions && Array.isArray(client.interactions)) {
                client.interactions.forEach(interaction => {
                    activities.push({
                        type: 'contacted',
                        clientName: displayName,
                        date: new Date(interaction.date),
                        description: `Contacto (${interaction.type}): ${displayName}`
                    });
                });
            }
        });

        // Aplicar filtro
        let filtered = activities;
        if (typeFilter) {
            filtered = activities.filter(a => a.type === typeFilter);
        }

        // Ordenar por fecha descendente (en el cliente)
        filtered.sort((a, b) => {
            const dateA = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
            const dateB = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
            return dateB - dateA;
        });

        const container = document.getElementById('activitiesContainer');
        if (!container) return;

        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-message">No se encontraron actividades</p>';
            return;
        }

        filtered.slice(0, 50).forEach(activity => {
            const activityEl = document.createElement('div');
            activityEl.className = `activity-item activity-${activity.type}`;
            activityEl.innerHTML = `
                <div class="activity-icon">${getActivityIcon(activity.type)}</div>
                <div class="activity-content">
                    <strong>${activity.description}</strong>
                    <small>${formatActivityDate(activity.date)}</small>
                </div>
            `;
            container.appendChild(activityEl);
        });
    } catch (error) {
        console.error('Error aplicando filtros de actividades:', error);
    }
};

// ============================================================================
// 6. ALERTAS INTELIGENTES
// ============================================================================

async function checkAlerts() {
    if (!currentUser) return;

    try {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('executiveId', '==', currentUser.uid));
        const snapshot = await getDocs(q);

        const alerts = [];
        const today = new Date();

        snapshot.forEach(doc => {
            const client = doc.data();

            // Alerta: Cliente sin contacto
            if (client.interactions && client.interactions.length > 0) {
                const lastContact = new Date(client.interactions[client.interactions.length - 1].date);
                const daysSinceContact = Math.floor((today - lastContact) / (1000 * 60 * 60 * 24));

                if (daysSinceContact > 30) {
                    alerts.push({
                        type: 'sin-contacto',
                        client: client.name,
                        message: `${client.name} sin contacto hace ${daysSinceContact} días`,
                        severity: daysSinceContact > 60 ? 'high' : 'medium'
                    });
                }
            }

            // Alerta: Cumpleaños próximo
            if (client.fechaNacimiento) {
                const birthDate = new Date(client.fechaNacimiento);
                const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                
                if (nextBirthday < today) {
                    nextBirthday.setFullYear(today.getFullYear() + 1);
                }

                const daysUntilBirthday = Math.floor((nextBirthday - today) / (1000 * 60 * 60 * 24));

                if (daysUntilBirthday <= 7 && daysUntilBirthday >= 0) {
                    alerts.push({
                        type: 'cumpleanos',
                        client: client.name,
                        message: `🎂 ${client.name} cumple en ${daysUntilBirthday} días`,
                        severity: 'info'
                    });
                }
            }
        });

        // Mostrar alertas en consola y notificación
        if (alerts.length > 0) {
            console.log('🚨 Alertas:', alerts);
            showAlertBadge(alerts.length);
        }
    } catch (error) {
        console.error('Error verificando alertas:', error);
    }
}

function showAlertBadge(count) {
    const badge = document.getElementById('notificationBadge');
    if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = 'block';
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getSegmentoBadge(segment) {
    const badges = {
        'PLATINO': '💎',
        'ORO': '🥇',
        'PLATA': '🥈',
        'BRONCE': '🥉'
    };
    return badges[segment] || '📌';
}

function getActivityIcon(type) {
    const icons = {
        'created': '✨',
        'edited': '✏️',
        'contacted': '📞',
        'note': '📝'
    };
    return icons[type] || '📌';
}

function formatActivityDate(date) {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    } else if (d.toDateString() === yesterday.toDateString()) {
        return 'Ayer';
    } else {
        return d.toLocaleDateString('es-CR');
    }
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Detectar cambios de usuario
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Cargar todas las funcionalidades cuando se muestra la pestaña
        // Pero SOLO si esos elementos existen
        const observer = new MutationObserver(() => {
            const activeTab = document.querySelector('.tab-content.active');
            if (!activeTab) return;
            
            if (activeTab.id === 'tab-metas' && document.getElementById('metasContainer')) {
                loadMetas();
            }
            if (activeTab.id === 'tab-pipeline' && document.getElementById('pipelineContainer')) {
                loadPipeline();
            }
            if (activeTab.id === 'tab-contactos' && document.getElementById('contactsReportContainer')) {
                loadContactReports();
            }
            if (activeTab.id === 'tab-actividades' && document.getElementById('activitiesContainer')) {
                loadActivities();
            }
        });

        // Observar SOLO cambios de clase en los tabs, no atributos de todo el DOM
        const tabsContainer = document.querySelector('.tabs-container');
        if (tabsContainer) {
            observer.observe(tabsContainer, { attributes: true, attributeFilter: ['class'], subtree: true });
        }

        // Configurar eventos
        setupCampaigns();

        // Verificar alertas cada 5 minutos
        checkAlerts();
        setInterval(checkAlerts, 5 * 60 * 1000);
    } else {
        currentUser = null;
    }
});

// Exportar para uso externo
window.loadMetas = loadMetas;
window.loadPipeline = loadPipeline;
window.loadCampaignHistory = loadCampaignHistory;
