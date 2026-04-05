// Contactación WhatsApp - integrado como pestaña v2.1
// Este script renderiza el formulario de contactación y proporciona la función de abrir WhatsApp Web/WA mobile
import { auth, db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
(function(){
    // Inserta el HTML principal dentro del contenedor
    const root = document.getElementById('contactacionWhatsappRoot');
    if (!root) return;

    root.innerHTML = `
        <div class="contact-whatsapp">
            <h1>Ejecutivos ICE   RCME / Contactación WhatsApp</h1>
            <div id="seasonalEmoji" class="seasonal-emoji" aria-hidden="true" title="Decoración del mes">🎉</div>
            <div class="top-widgets">
                <a id="backToWorkMini" class="back-work" href="https://prod.ice.go.cr/komercialice/login/" target="_blank" rel="noopener" title="Abrir sistema interno">🐸 Volver al trabajo</a>
                <a id="kolbiHomeMini" class="kolbi-home" href="https://www.kolbi.cr/" target="_blank" rel="noopener" title="Ir a Kolbi">🏠 Ir a Kolbi</a>
                <div id="fireWidgetMini" class="fire-widget level-safe" role="status" aria-live="polite" aria-atomic="true">
                    <div id="fireIconsMini" class="fire-icons">🔥</div>
                    <div class="fire-info">
                        <div>Envíos hoy: <span id="totalSendsMini">0</span></div>
                        <div id="fireStatusMini" class="fire-status">Seguro</div>
                    </div>
                </div>
            </div>

            <div class="form-row agent-row" style="flex-direction:column;align-items:flex-start;">
                <label for="agentMini" class="agent-label small-muted">Nombre del Ejecutivo</label>
                <select id='agentMini' aria-label="Seleccioná un ejecutivo">
                    <option value='' data-user='' data-email=''>Seleccioná un ejecutivo</option>
                </select>
                <div id="agentInfoMini" class="agent-info" aria-live="polite"></div>
            </div>

            <div class="form-row" style="flex-direction:column;align-items:flex-start;">
                <label for="offerTypeMini" class="small-muted">Tipo de oferta</label>
                <select id='offerTypeMini' aria-label="Tipo de oferta">
                    <option value='Plan móvil'>📱 Plan móvil</option>
                    <option value='Internet hogar'>🏠 Internet hogar</option>
                    <option value='Oferta Racsa 5G'>📡 Oferta Racsa 5G</option>
                    <option value='VIP ORO'>🥇 VIP ORO</option>
                    <option value='Mensaje Personalizado'>✉️ Mensaje Personalizado</option>
                </select>
            </div>

            <div class="form-row" style="flex-direction:column;align-items:flex-start;">
                <label for="planMini" class="small-muted">Oferta K+ (Móvil)</label>
                <select id='planMini' aria-label="Oferta K">
                    <option value=''>Seleccioná una oferta K</option>
                    <option value='k1plus'>k1 plus</option>
                    <option value='k2plus'>k2 plus</option>
                    <option value='k3plus'>k3 plus</option>
                    <option value='ilimitado'>ilimitado</option>
                </select>
            </div>

            <div class="form-row" id="planHogarRow" style="flex-direction:column;align-items:flex-start;">
                <label for="planHogarMini" class="small-muted">🏠 Plan Hogar</label>
                <select id='planHogarGrupoMini' aria-label="Grupo de Plan Hogar" style='margin-bottom:6px;'>
                    <option value=''>Seleccioná un tipo de plan</option>
                </select>
                <select id='planHogarMini' aria-label="Plan Hogar">
                    <option value=''>Primero seleccioná el tipo</option>
                </select>
                <div id="planHogarPrecioInfo" style="margin-top:8px; padding:8px 12px; background:#0ea5e9; color:#fff; border-radius:6px; display:none; font-weight:600;">
                    💰 Precio: ₡0
                </div>
            </div>

            <div class="form-row" style="flex-direction:column;align-items:flex-start;">
                <label for="phoneNumberMini" class="small-muted">Número (sin prefijo 506)</label>
                <input type='text' id='phoneNumberMini' placeholder='Ej: 83033341' maxlength="8" pattern="\d{8}" aria-describedby="phoneHelp" aria-label="Número sin prefijo">
                <div id="phoneHelp" class="form-help">Introduce 8 dígitos (sin prefijo 506)</div>
            </div>

            <div class="form-row" style="flex-direction:column;align-items:flex-start;">
                <label class="small-muted">Datos para informe (se exportan a Excel)</label>
                <select id='regionMini' aria-label='Región' style='margin-top:6px;'>
                    <option value='RCME'>RCME</option>
                    <option value='EVEN'>EVEN</option>
                    <option value='GRUPO DE APOYO'>GRUPO DE APOYO</option>
                </select>
                <input type='text' id='cedulaClienteMini' placeholder='Cédula cliente' aria-label='Cédula cliente' style='margin-top:6px;'>
                <input type='text' id='nombreClienteMini' placeholder='Nombre del cliente' aria-label='Nombre del cliente' style='margin-top:6px;'>
                <select id='segmentoMini' aria-label='Segmento' style='margin-top:6px;'>
                    <option value='PLATINO'>PLATINO</option>
                    <option value='ORO'>ORO</option>
                    <option value='PLATA'>PLATA</option>
                    <option value='BRONCE'>BRONCE</option>
                    <option value='BLACK'>BLACK</option>
                </select>
                <input type='text' id='cedulaEjecutivoNuevoMini' placeholder='Cédula ejecutivo nuevo' aria-label='Cédula ejecutivo nuevo' style='margin-top:6px;'>
                <!-- Nombre ejecutivo nuevo eliminado: usamos siempre el ejecutivo seleccionado en 'Nombre del Ejecutivo' -->
                <div class='form-help' style='margin-top:6px;'>Estos campos se guardan en el historial y se incluyen al exportar.</div>
            </div>

            <div class="form-row" id="customMessageRowMini" style="display:flex;flex-direction:column;align-items:flex-start;">
                <label for="customMessageMini" class="small-muted">Mensaje a enviar (editable)</label>
                <textarea id="customMessageMini" placeholder="Aquí puedes editar la plantilla antes de enviar" rows="8" style="width:100%;padding:12px;border-radius:8px;resize:vertical;background:rgba(20,30,40,0.8);color:var(--main-color);border:2px solid var(--main-color);" aria-label="Mensaje editable"></textarea>
                <div class="form-help">Editá antes de enviar. Límite 2000 caracteres.</div>
                <div style="margin-top:8px;"><button type="button" id="restoreTemplateBtnMini" class="btn-link" title="Restaurar plantilla por defecto" aria-label="Restaurar plantilla">Restaurar plantilla</button></div>
            </div>

            <div style="margin:18px 0;">
                <button id="openWhatsAppBtn" class="btn-primary" title="Abrir en WhatsApp" aria-label="Abrir en WhatsApp">📤 Abrir en WhatsApp</button>
            </div>

            <div id='sentListMini'>
                <h3>Historial de envíos:</h3>
                <div id='paginationTop' style='margin:10px 0; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between;'>
                    <div style='display:flex; gap:8px; align-items:center;'>
                        <label for='itemsPerPageSelect' style='font-size:0.9em;'>Mostrar:</label>
                        <select id='itemsPerPageSelect' style='padding:4px 8px; border-radius:4px; background:#1a2a3a; color:var(--main-color); border:1px solid var(--main-color);'>
                            <option value='10'>10</option>
                            <option value='25'>25</option>
                            <option value='50'>50</option>
                            <option value='100'>100</option>
                        </select>
                        <span id='totalRecordsInfo' style='font-size:0.85em; color:#8899aa;'>0 registros</span>
                    </div>
                    <div id='paginationControls' style='display:flex; gap:6px; align-items:center;'></div>
                </div>
                <ul id='numberListMini'></ul>
                <div id='paginationBottom' style='margin:10px 0; display:flex; gap:8px; align-items:center; justify-content:center;'></div>
                <button id='printContactListMini' class="btn-secondary" aria-label="Imprimir lista">🖨️ Imprimir</button>
                <button id='exportCsvMini' class="btn-secondary" style='margin-left:8px;' aria-label="Exportar CSV">📥 Exportar Excel</button>
                <button id='clearHistoryMini' class="btn-danger" style='margin-left:10px;' aria-label="Borrar historial">Borrar historial</button>
            </div>
        </div>
    `;

    // Plantillas
    const messages = {
        'Plan móvil': `📱✨ Renová tu plan y estrená celular con kölbi\nComo tu ejecutivo personal, me encargo de ofrecerte las mejores opciones en planes y equipos, de forma rápida y sencilla.\n¿Lo vemos juntos?`,
        'Internet hogar': `🌐🚀 ¡Internet Hogar kölbi al mejor precio!\n✔️ Internet estable y confiable\n👉 Consultá hoy mismo`,
        'Oferta Racsa 5G': `📡✨ ¡Conectate con la nueva era del Internet con RACSA 5G!\n💬 Respondé este mensaje y conocé las opciones disponibles`,
        'VIP ORO': `🥇✨ ¡Hola {CLIENTE}!\n\nSoy {AGENTE}, tu agente personal de kölbi.\n\nEs un gusto saludarte. Sos parte de nuestros clientes más importantes y estoy aquí para brindarte una atención exclusiva y personalizada.\n\n¿En qué puedo ayudarte hoy?\n\n• 📱 Planes móviles y equipos\n• 🌐 Internet hogar\n• 📺 Televisión\n• ☎️ Telefonía fija\n• 💡 Cualquier consulta o trámite\n\nEstoy a tu disposición para lo que necesités.\n📧 {EMAIL}\n📞 {TELEFONO}\n\n¡Será un placer atenderte! 🙌`,
        'Mensaje Personalizado': ''
    };

    // Plantillas K+ (con placeholders: {AGENTE}, {EMAIL}, {TELEFONO}, {CLIENTE})
    const planTemplates = {
        'k1plus': ` 👋📱 Soy {AGENTE}, tu agente personal de kölbi.\nTe comento que tu plan actual no incluye algunos de los nuevos beneficios y podemos mejorarlo.\nCon el k1 plus recibirías hasta 30 GB por mes + apps ilimitadas, por solo ₡12 000.\n¡Más gigas y más beneficios! 🙌\n¿Te gustaría renovarlo virtualmente?\n📧 {EMAIL}\n📞 {TELEFONO}`,
        'k2plus': ` 👋📱 Soy {AGENTE}, tu agente personal de kölbi.\nTe comento que tu plan actual no incluye algunos de los nuevos beneficios y podemos mejorarlo.\nCon el k2 plus recibirías hasta 45 GB por mes + apps ilimitadas, por solo ₡16 500.\n¡Más gigas y más beneficios! 🙌\n¿Te gustaría renovarlo virtualmente?\n📧 {EMAIL}\n📞 {TELEFONO}`,
        'k3plus': ` 👋📱 Soy {AGENTE}, tu agente personal de kölbi.\nTe comento que tu plan actual no incluye algunos de los nuevos beneficios y podemos mejorarlo.\nCon el k3 plus recibirías hasta 60 GB por mes + apps ilimitadas, por solo ₡21 500.\n¡Más gigas y más beneficios! 🙌\n¿Te gustaría renovarlo virtualmente?\n📧 {EMAIL}\n📞 {TELEFONO}`,
        'ilimitado': ` 👋📱 Soy {AGENTE}, tu agente personal de kölbi.\nTe comento que tu plan actual no incluye algunos de los nuevos beneficios y podemos mejorarlo.\nCon el plan Ilimitado navegarías de manera ilimitada + apps ilimitadas, por solo ₡44 000.\n¡Más velocidad, más beneficios y cero preocupación por los datos! 🙌\n¿Te gustaría renovarlo virtualmente?\n📧 {EMAIL}\n📞 {TELEFONO}`
    };

    // Datos de planes hogar (se cargan dinámicamente)
    let planesHogarData = null;

    // Función para cargar planes desde JSON
    async function loadPlanesHogar() {
        try {
            const res = await fetch('/data/planes.json', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                planesHogarData = data.plansHome;
                populatePlanesHogarGrupos();
            }
        } catch (e) {
            console.warn('No se pudo cargar planes.json', e);
        }
    }

    // Poblar selector de grupos de planes hogar
    function populatePlanesHogarGrupos() {
        const grupoSelect = document.getElementById('planHogarGrupoMini');
        if (!grupoSelect || !planesHogarData) return;
        
        grupoSelect.innerHTML = '<option value="">Seleccioná un tipo de plan</option>';
        
        Object.keys(planesHogarData).forEach(key => {
            const grupo = planesHogarData[key];
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = grupo.grupo;
            grupoSelect.appendChild(opt);
        });
        
        grupoSelect.onchange = () => {
            const selectedGrupo = grupoSelect.value;
            populatePlanesHogarPlanes(selectedGrupo);
        };
    }

    function getPlanSpeedMbps(planNombre) {
        const gbpsMatch = /\b(\d+)\s*Gbps\b/i.exec(planNombre);
        if (gbpsMatch) return parseInt(gbpsMatch[1], 10) * 1000;
        const mbpsMatch = /\b(\d+)\s*Mbps\b/i.exec(planNombre);
        if (mbpsMatch) return parseInt(mbpsMatch[1], 10);
        return null;
    }

    // Poblar selector de planes según grupo seleccionado
    function populatePlanesHogarPlanes(grupoKey) {
        const planSelect = document.getElementById('planHogarMini');
        const precioInfo = document.getElementById('planHogarPrecioInfo');
        if (!planSelect) return;
        
        planSelect.innerHTML = '<option value="">Seleccioná un plan</option>';
        if (precioInfo) precioInfo.style.display = 'none';
        
        if (!grupoKey || !planesHogarData || !planesHogarData[grupoKey]) {
            // Si no hay grupo seleccionado, habilitar planes móvil
            togglePlanSelectors('none');
            return;
        }
        
        // Deshabilitar selector de planes móvil cuando se selecciona hogar
        togglePlanSelectors('hogar');
        
        const minSpeedMbps = 30;
        const planes = planesHogarData[grupoKey].planes.filter(plan => {
            const speed = getPlanSpeedMbps(plan.nombre || '');
            return speed === null || speed >= minSpeedMbps;
        });
        const modemRental = 1130; // Alquiler mensual del módem (se suma aparte)
        planes.forEach(plan => {
            const opt = document.createElement('option');
            opt.value = plan.id;
            // Agregar impuestos: IVA 13% + 911 0.75% + Cruz Roja 1% = 14.75%
            const precioFinal = plan.precioFinal ? Math.round(plan.precio) : Math.round(plan.precio * 1.1475);
            opt.textContent = `${plan.nombre} - ₡${precioFinal.toLocaleString('es-CR')} (+₡${modemRental.toLocaleString('es-CR')} módem)`;
            opt.dataset.nombre = plan.nombre;
            opt.dataset.precio = precioFinal;
            planSelect.appendChild(opt);
        });
        
        planSelect.onchange = () => {
            const selectedOpt = planSelect.options[planSelect.selectedIndex];
            if (selectedOpt && selectedOpt.value) {
                const precio = selectedOpt.dataset.precio; // Ya incluye IVA
                const nombre = selectedOpt.dataset.nombre;
                if (precioInfo) {
                    precioInfo.textContent = `💰 Precio promocional: ₡${parseInt(precio).toLocaleString('es-CR')} (+₡${modemRental.toLocaleString('es-CR')} módem)`;
                    precioInfo.style.display = 'block';
                }
                // Generar mensaje con precio (ya con IVA)
                generateHogarMessage(nombre, precio);
            } else {
                if (precioInfo) precioInfo.style.display = 'none';
            }
        };
    }

    // Función para deshabilitar/habilitar selectores mutuamente
    // modo: 'hogar' = deshabilita móvil, 'movil' = deshabilita hogar, 'none' = habilita ambos
    function togglePlanSelectors(modo) {
        const planMobilSelect = document.getElementById('planMini');
        const planHogarGrupoSelect = document.getElementById('planHogarGrupoMini');
        const planHogarSelect = document.getElementById('planHogarMini');
        const precioInfo = document.getElementById('planHogarPrecioInfo');
        
        if (modo === 'hogar') {
            // Deshabilitar móvil, habilitar hogar
            if (planMobilSelect) {
                planMobilSelect.disabled = true;
                planMobilSelect.value = '';
                planMobilSelect.style.opacity = '0.5';
                planMobilSelect.style.cursor = 'not-allowed';
            }
            if (planHogarGrupoSelect) {
                planHogarGrupoSelect.disabled = false;
                planHogarGrupoSelect.style.opacity = '1';
                planHogarGrupoSelect.style.cursor = 'pointer';
            }
            if (planHogarSelect) {
                planHogarSelect.disabled = false;
                planHogarSelect.style.opacity = '1';
                planHogarSelect.style.cursor = 'pointer';
            }
        } else if (modo === 'movil') {
            // Deshabilitar hogar, habilitar móvil
            if (planMobilSelect) {
                planMobilSelect.disabled = false;
                planMobilSelect.style.opacity = '1';
                planMobilSelect.style.cursor = 'pointer';
            }
            if (planHogarGrupoSelect) {
                planHogarGrupoSelect.disabled = true;
                planHogarGrupoSelect.value = '';
                planHogarGrupoSelect.style.opacity = '0.5';
                planHogarGrupoSelect.style.cursor = 'not-allowed';
            }
            if (planHogarSelect) {
                planHogarSelect.disabled = true;
                planHogarSelect.value = '';
                planHogarSelect.innerHTML = '<option value="">Primero seleccioná el tipo</option>';
                planHogarSelect.style.opacity = '0.5';
                planHogarSelect.style.cursor = 'not-allowed';
            }
            if (precioInfo) precioInfo.style.display = 'none';
        } else {
            // Habilitar ambos
            if (planMobilSelect) {
                planMobilSelect.disabled = false;
                planMobilSelect.style.opacity = '1';
                planMobilSelect.style.cursor = 'pointer';
            }
            if (planHogarGrupoSelect) {
                planHogarGrupoSelect.disabled = false;
                planHogarGrupoSelect.style.opacity = '1';
                planHogarGrupoSelect.style.cursor = 'pointer';
            }
            if (planHogarSelect) {
                planHogarSelect.disabled = false;
                planHogarSelect.style.opacity = '1';
                planHogarSelect.style.cursor = 'pointer';
            }
        }
    }

    // Generar mensaje para plan hogar con precio (ya incluye IVA)
    function generateHogarMessage(nombrePlan, precio) {
        const agente = (agentSelect && agentSelect.value) || 'tu agente';
        const email = (agentSelect && agentSelect.options[agentSelect.selectedIndex] && agentSelect.options[agentSelect.selectedIndex].getAttribute('data-email')) || '';
        const telefono = (agentSelect && agentSelect.options[agentSelect.selectedIndex] && agentSelect.options[agentSelect.selectedIndex].getAttribute('data-phone')) || '';
        const precioFormateado = parseInt(precio).toLocaleString('es-CR');
        
        const mensaje = `🏠✨ ¡Hola! Soy ${agente}, tu agente personal de kölbi.

Te cuento que tenemos una excelente promoción para vos:

📺 *${nombrePlan}*
💰 *Precio promocional: ₡${precioFormateado} mensuales* (impuestos incluidos)
⚠️ Cnvm use 20.20.0
where node
node -v
firebase --versiononsultá disponibilidad de la promoción con tu agente
🧾 *Alquiler de módem: ₡1,130 mensuales (se suma al precio)*

✅ 60 minutos incluidos a números fijos y celulares kölbi

✅ Internet estable y de alta velocidad
✅ Instalación incluida
✅ Soporte técnico 24/7

¿Te gustaría que te ayude con la contratación?
📧 ${email}
📞 ${telefono}

¡Estoy para ayudarte! 🙌`;
        
        customMessage.value = mensaje;
        currentTemplate = ''; // Reset template móvil
    }

    // Colores por tipo de oferta (puedes ajustar hex)
    const offerColors = {
        'Plan móvil': '#22c55e',        // verde
        'Internet hogar': '#0ea5e9',    // azul
        'Oferta Racsa 5G': '#7c3aed',    // morado
        'VIP ORO': '#f59e0b',           // dorado
        'Mensaje Personalizado': '#6b7280' // gris
    };

    // Lista de ejecutivos (provista por el usuario) -- incluye nombre, cédula, usuario de red y correo
    const agentsList = [
        { name: 'Gabriel Elías Méndez Campos', cedula: '303590652', user: 'Gamend', email: 'gmendez@ice.go.cr', phone: '20010499' },
        { name: 'Minor Sánchez Cervantes', cedula: '112570764', user: 'Misanc1', email: 'MSanchezCe@ice.go.cr', phone: '20009483' },
        { name: 'Kattia Yessenia Chaves Rodríguez', cedula: '109530497', user: 'jerodr1', email: 'JRodriguezC@ice.go.cr', phone: '20001460' },
        { name: 'Cristian Márquez Bahamondes', cedula: '110770787', user: 'Chmarq', email: 'CMarquez@ice.go.cr', phone: '20009517' },
        { name: 'Manuel Vega Mora', cedula: '111570626', user: 'mavega3', email: 'MVegaM@ice.go.cr', phone: '20009524' },
        { name: 'Ricardo Quesada Arguedas', cedula: '112400378', user: 'riques1', email: 'RQuesadaAr@ice.go.cr', phone: '20009527' },
        { name: 'Beatriz Hernández Herrera', cedula: '106090613', user: 'behern2', email: 'BHernandezH@ice.go.cr', phone: '20006305' },
        { name: 'Natalia Calderón Chavarría', cedula: '113340464', user: 'nacald1', email: 'NCalderonC@ice.go.cr', phone: '20025295' },
        { name: 'Daniel Astorga Cerdas', cedula: '304460969', user: 'Daasto', email: 'daasto@ice.go.cr', phone: '20013837' },
        { name: 'Roberto Umaña Evans', cedula: '106850004', user: 'Rouman', email: 'RUmanaE@ice.go.cr', phone: '20010497' },
        { name: 'Hellen Coto Brenes', cedula: '112370348', user: 'Hecoto', email: 'HCoto@ice.go.cr', phone: '20010485' },
        { name: 'Anthony Obando Loaiza', cedula: '111640470', user: 'Anoban3', email: 'AObandoL@ice.go.cr', phone: '20010523' },
        { name: 'José Fabián Segura Gamboa', cedula: '109670498', user: 'fasegu', email: 'fsegura@ice.go.cr', phone: '20010496' },
        { name: 'Lilliam González Cerdas', cedula: '109390222', user: 'ligonz4', email: 'LGonzalezC@ice.go.cr', phone: '20013510' },
        { name: 'Ericka Orozco Solano', cedula: '304040502', user: 'eroroz', email: 'EOrozcoS@ice.go.cr', phone: '20001585' },
        { name: 'Cristian Najera Picado', cedula: '110320641', user: 'crnaje', email: 'cnajera@ice.go.cr', phone: '20006323' },
        { name: 'Laura Acuña Villalobos', cedula: '109510531', user: 'Laacun1', email: 'lacunav@ic.go.cr', phone: '20014147' },
        { name: 'Ricardo Ruiz Morales', cedula: '111970845', user: 'Riruiz', email: 'rruizm@ice.go.cr', phone: '20014463' },
        { name: 'Hannia Salas Quesda', cedula: '401950135', user: 'hasala', email: 'hsalasq@ice.go.cr', phone: '20014116' },
        { name: 'Lorena Rojas Aguilar', cedula: '106690038', user: 'loroja', email: 'lrojasa@ice.go.cr', phone: '20007331' },
        { name: 'Maria Gonzalez Hidalgo', cedula: '109790127', user: 'magonz7', email: 'marigonzalez@ice.go.cr', phone: '20014116' },
        { name: 'Maria Teresa Narajo Arias', cedula: '601540344', user: 'manara', email: 'mnaranjo@ice.go.cr', phone: '20016116' },
        { name: 'Hellen Gutierrez Leandro', cedula: '112650278', user: 'heguti', email: 'hgutrierrezl@ice.go.cr', phone: '20014116' },
        { name: 'Galo Guillermo Fabara Acuña', cedula: '112480845', user: 'Gafaba', email: 'gfabara@ice.go.cr', phone: '20010536' },
        { name: 'David Ruben Orozco Serrano', cedula: '801310118', user: 'ruoroz', email: 'rorozcos@ice.go.cr', phone: '86903535' },
        { name: 'Juan Carlos Duarte Montiel', cedula: '206660149', user: 'Juduar', email: 'JDuarte@ice.go.cr', phone: '86260404' },
        { name: 'Manuel Escalante Leitón', cedula: '109790421', user: 'Maesca1', email: 'mescalanteL@ice.go.cr', phone: '87903535' },
        { name: 'Marco Vinicio Miranda Álvarez', cedula: '107980920', user: 'Mamira1', email: 'MMirandaA@ice.go.cr', phone: '87703535' },
        { name: 'Melanie Rodriguez Salas', cedula: '116800549', user: 'merodr2', email: 'MRodriguezSalas@ice.go.cr', phone: '86253636' },
        { name: 'Adriana Rivera Vega', cedula: '110840927', user: 'Adrive', email: 'ARiveraV@ice.go.cr', phone: '87058704' },
        { name: 'Laura Rodriguez Brenes', cedula: '109110159', user: 'Larodr', email: 'LRodriguezBr@ice.go.cr', phone: '88218636' },
        { name: 'Ruben Madrigal Jimenez', cedula: '115390283', user: 'rmadrigalj', email: 'rmadrigalj@ice.go.cr', phone: '84444144' }
    ];

    async function populateAgents(){
        if(!agentSelect) return;
        agentSelect.innerHTML = `<option value='' data-user='' data-email=''>Seleccioná un ejecutivo</option>`;
        let fetched = [];
        try{
            const res = await fetch('/data/users.json',{cache:'no-store'});
            if(res.ok){
                const data = await res.json();
                fetched = data.map(u=>({
                    name: u.displayName || u.name || u.email || u.id,
                    cedula: u.cedula || '',
                    user: u.name || u.displayName || '',
                    email: u.email || ''
                }));
            }
        }catch(e){ console.warn('No se pudo cargar public/data/users.json', e); }

        // merge embedded agentsList + fetched, prefer embedded (nombre completo)
        const combined = [];
        const seen = new Set();
        // primero la lista embebida (nombre correcto)
        agentsList.forEach(a=>{ const key = (a.email||a.name).toLowerCase(); if(!seen.has(key)){ seen.add(key); combined.push(a); } });
        // luego los de users.json que no estén en la lista embebida
        fetched.forEach(a=>{ const key = (a.email||a.name).toLowerCase(); if(!seen.has(key)){ seen.add(key); combined.push(a); } });

        combined.forEach(a=>{
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.textContent = a.name + (a.email? ` — ${a.email}` : '');
            opt.setAttribute('data-user', a.user||'');
            opt.setAttribute('data-email', a.email||'');
            opt.setAttribute('data-cedula', a.cedula||'');
            opt.setAttribute('data-phone', a.phone||'');
            agentSelect.appendChild(opt);
        });
    }

    function applyOfferColor(offer){
        try{
            const color = offerColors[offer] || getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#007aff';
            const card = root.querySelector('.contact-whatsapp') || root;
            // set CSS variable (primary method)
            card.style.setProperty('--contact-accent', color);
            // diagnostic log to confirm runtime execution in production
            console.log('[diag] applyOfferColor:', offer, '=>', color);
            // fallback: force inline styles on visible elements in case the variable is overridden or cached
            const btn = document.getElementById('openWhatsAppBtn');
            if(btn){
                btn.style.background = color;
                btn.style.borderColor = color;
                btn.style.color = '#ffffff';
                btn.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            }
            // diagnostic visual on card border as well
            try{ card.style.border = `2px solid ${color}` }catch(e){}

            // helper: convert hex to rgba
            function hexToRgba(hex, alpha){
                try{
                    hex = String(hex).trim();
                    if(hex[0]==='#') hex = hex.slice(1);
                    if(hex.length===3) hex = hex.split('').map(c=>c+c).join('');
                    const r = parseInt(hex.substring(0,2),16);
                    const g = parseInt(hex.substring(2,4),16);
                    const b = parseInt(hex.substring(4,6),16);
                    return `rgba(${r},${g},${b},${alpha})`;
                }catch(e){ return null; }
            }

            // Apply accent to editable textarea and message preview for stronger visual feedback
            const textarea = document.getElementById('customMessageMini');
            if(textarea){
                const bg = hexToRgba(color, 0.06) || 'transparent';
                const border = hexToRgba(color, 0.22) || color;
                textarea.style.background = bg;
                textarea.style.border = `1px solid ${border}`;
                textarea.style.boxShadow = `0 10px 28px ${hexToRgba(color,0.06)}`;
            }
            const preview = card.querySelector('.message-preview');
            if(preview){
                preview.style.borderLeft = `6px solid ${color}`;
                preview.style.boxShadow = `0 20px 40px ${hexToRgba(color,0.06)}`;
            }
        }catch(e){ console.warn('applyOfferColor error', e); }
    }

    // Element refs
    const agentSelect = document.getElementById('agentMini');
    const agentInfo = document.getElementById('agentInfoMini');
    const offerSelect = document.getElementById('offerTypeMini');
    const planSelect = document.getElementById('planMini');
    const customMessage = document.getElementById('customMessageMini');
    const phoneInput = document.getElementById('phoneNumberMini');
    const numberList = document.getElementById('numberListMini');
    const totalSendsEl = document.getElementById('totalSendsMini');
    const fireStatusEl = document.getElementById('fireStatusMini');
    const regionInput = document.getElementById('regionMini');
    const cedulaClienteInput = document.getElementById('cedulaClienteMini');
    const nombreClienteInput = document.getElementById('nombreClienteMini');
    const segmentoInput = document.getElementById('segmentoMini');
    const cedulaEjecutivoNuevoInput = document.getElementById('cedulaEjecutivoNuevoMini');

    // Paginación para historial
    let historyItems = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    function renderHistoryPage() {
        numberList.innerHTML = '';
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = historyItems.slice(start, end);
        
        if (pageItems.length === 0 && historyItems.length > 0) {
            // Si la página actual está vacía pero hay registros, volver a la primera página
            currentPage = 1;
            renderHistoryPage();
            return;
        }
        
        pageItems.forEach(({docSnap, info}, idx) => {
            const li = document.createElement('li');
            li.dataset.info = JSON.stringify(info);
            li.dataset.docid = docSnap.id;
            const rowNum = start + idx + 1;
            li.innerHTML = `<span style="color:#6cf;font-weight:bold;">#${rowNum}</span> ${info.region||''} | ${info.cedulaCliente||''} | ${info.nombreCliente||''} | ${info.segmento||''} | ${info.cedulaEjecutivoNuevo||''} | ${info.name} | ${info.user} | ${info.email} | ${info.offer} | ${info.fullNumber} | Enviado: ${info.fecha} ${info.hora}`;
            // Botón borrar individual
            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.className = 'btn btn-danger';
            delBtn.style.marginLeft = '8px';
            delBtn.onclick = async () => {
                if (confirm('¿Borrar este envío?')) {
                    await deleteDoc(doc(db, 'contactacion_envios', docSnap.id));
                    li.remove();
                    await loadHistoryFirestore();
                    updateFireWidget();
                }
            };
            li.appendChild(delBtn);
            numberList.appendChild(li);
        });
        renderPaginationControls();
        updateTotalRecordsInfo();
    }

    function updateTotalRecordsInfo() {
        const el = document.getElementById('totalRecordsInfo');
        if (el) {
            el.textContent = `${historyItems.length} registro${historyItems.length !== 1 ? 's' : ''}`;
        }
    }

    function renderPaginationControls() {
        const controls = root.querySelector('#paginationControls');
        const bottomControls = root.querySelector('#paginationBottom');
        if (!controls) return;
        
        const totalPages = Math.ceil(historyItems.length / itemsPerPage) || 1;
        
        // Estilos para botones de paginación - más claros y visibles
        const btnStyle = 'padding:6px 12px; border-radius:6px; background:#ffffff; color:#1a1a2e; border:2px solid #22c55e; cursor:pointer; font-weight:600; transition:all 0.2s;';
        const btnDisabledStyle = 'padding:6px 12px; border-radius:6px; background:#e5e7eb; color:#9ca3af; border:2px solid #d1d5db; cursor:not-allowed; font-weight:600;';
        const selectStyle = 'padding:6px 10px; border-radius:6px; background:#22c55e; color:#ffffff; border:2px solid #16a34a; font-weight:600; cursor:pointer;';
        
        // Función para crear los controles de paginación
        function createPaginationHTML(container) {
            container.innerHTML = '';
            
            // Botón Primera página
            const firstBtn = document.createElement('button');
            firstBtn.textContent = '⏮️';
            firstBtn.title = 'Primera página';
            firstBtn.disabled = currentPage === 1;
            firstBtn.style.cssText = firstBtn.disabled ? btnDisabledStyle : btnStyle;
            firstBtn.onclick = () => { if(currentPage > 1){ currentPage = 1; renderHistoryPage(); } };
            container.appendChild(firstBtn);
            
            // Botón anterior
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '◀️ Anterior';
            prevBtn.disabled = currentPage === 1;
            prevBtn.style.cssText = prevBtn.disabled ? btnDisabledStyle : btnStyle;
            prevBtn.onclick = () => { if(currentPage > 1){ currentPage--; renderHistoryPage(); } };
            container.appendChild(prevBtn);
            
            // Selector de página directa (para muchas páginas)
            if (totalPages > 1) {
                const pageSelect = document.createElement('select');
                pageSelect.style.cssText = selectStyle;
                for (let i = 1; i <= totalPages; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = `Pág ${i}`;
                    if (i === currentPage) opt.selected = true;
                    pageSelect.appendChild(opt);
                }
                pageSelect.onchange = (e) => { currentPage = parseInt(e.target.value); renderHistoryPage(); };
                container.appendChild(pageSelect);
            }
            
            // Info de página
            const pageInfo = document.createElement('span');
            pageInfo.style.cssText = 'margin:0 10px; font-size:1em; color:#374151; font-weight:600; background:#f3f4f6; padding:6px 12px; border-radius:6px;';
            pageInfo.textContent = `${currentPage} de ${totalPages}`;
            container.appendChild(pageInfo);
            
            // Botón siguiente
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Siguiente ▶️';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.style.cssText = nextBtn.disabled ? btnDisabledStyle : btnStyle;
            nextBtn.onclick = () => { if(currentPage < totalPages){ currentPage++; renderHistoryPage(); } };
            container.appendChild(nextBtn);
            
            // Botón Última página
            const lastBtn = document.createElement('button');
            lastBtn.textContent = '⏭️';
            lastBtn.title = 'Última página';
            lastBtn.disabled = currentPage === totalPages;
            lastBtn.style.cssText = lastBtn.disabled ? btnDisabledStyle : btnStyle;
            lastBtn.onclick = () => { if(currentPage < totalPages){ currentPage = totalPages; renderHistoryPage(); } };
            container.appendChild(lastBtn);
        }
        
        createPaginationHTML(controls);
        if (bottomControls && historyItems.length > itemsPerPage) {
            createPaginationHTML(bottomControls);
        } else if (bottomControls) {
            bottomControls.innerHTML = '';
        }
    }

    function initPaginationSettings() {
        const itemsPerPageSelect = root.querySelector('#itemsPerPageSelect');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = itemsPerPage;
            itemsPerPageSelect.onchange = (e) => {
                itemsPerPage = parseInt(e.target.value) || 10;
                currentPage = 1; // Volver a la primera página al cambiar cantidad
                renderHistoryPage();
            };
        }
    }

    function init() {
        // Restore defaults
        // prefer plan template if selected, otherwise offer
        let initial = '';
        if(planSelect && planSelect.value) initial = fillTemplate(planTemplates[planSelect.value] || '');
        if(!initial) initial = messages[offerSelect.value] || '';
        customMessage.value = initial;
        // poblar select de ejecutivos
        populateAgents();
        // cargar planes de hogar desde JSON
        loadPlanesHogar();
        // inicializar configuración de paginación
        initPaginationSettings();
        // aplicar color inicial
        applyOfferColor(offerSelect.value);
        offerSelect.addEventListener('change', () => { 
            const selectedOffer = offerSelect.value;
            // Para VIP ORO usar fillTemplate para reemplazar placeholders
            if (selectedOffer === 'VIP ORO') {
                currentTemplate = messages[selectedOffer];
                customMessage.value = fillTemplate(currentTemplate);
            } else {
                customMessage.value = messages[selectedOffer] || '';
            }
            updateFireWidget(); 
            applyOfferColor(selectedOffer);
            // Deshabilitar planes K+ si se selecciona Internet hogar
            if(selectedOffer === 'Internet hogar') {
                togglePlanSelectors('hogar');
            } else {
                togglePlanSelectors('movil');
            }
        });
        if(planSelect){
            planSelect.addEventListener('change', () => { 
                currentTemplate = planTemplates[planSelect.value] || ''; 
                customMessage.value = fillTemplate(currentTemplate || messages[offerSelect.value] || ''); 
                updateFireWidget(); 
                applyOfferColor(offerSelect.value);
                // Deshabilitar hogar si se selecciona plan móvil K+
                if(planSelect.value) {
                    togglePlanSelectors('movil');
                }
            });
        }
        agentSelect.addEventListener('change', showAgentInfo);
        agentSelect.addEventListener('change', () => { if(currentTemplate) customMessage.value = fillTemplate(currentTemplate); });
        nombreClienteInput.addEventListener('input', () => { if(currentTemplate) customMessage.value = fillTemplate(currentTemplate); });
        document.getElementById('openWhatsAppBtn').addEventListener('click', sendMessage);
        document.getElementById('restoreTemplateBtnMini').addEventListener('click', () => { 
            customMessage.value = messages[offerSelect.value] || ''; 
            showToast('Plantilla restaurada');
            // Resetear ambos selectores de planes
            if(planSelect) planSelect.value = '';
            const planHogarGrupo = document.getElementById('planHogarGrupoMini');
            const planHogar = document.getElementById('planHogarMini');
            const precioInfo = document.getElementById('planHogarPrecioInfo');
            if(planHogarGrupo) planHogarGrupo.value = '';
            if(planHogar) { planHogar.value = ''; planHogar.innerHTML = '<option value="">Primero seleccioná el tipo</option>'; }
            if(precioInfo) precioInfo.style.display = 'none';
            togglePlanSelectors('none');
        });
        document.getElementById('clearHistoryMini').addEventListener('click', ()=>{ if(confirm('¿Seguro que querés borrar el historial de envíos?')) clearHistoryFirestore(); });
        document.getElementById('printContactListMini').addEventListener('click', printContactList);
        document.getElementById('exportCsvMini').addEventListener('click', exportXlsx);

        loadHistoryFirestore();
        updateFireWidget();
        updateClockMini();
        setInterval(updateClockMini, 1000);
        updateSeasonalEmojiMini();
    }

    // currentTemplate stores the template with placeholders when a plan is selected
    let currentTemplate = '';

    function fillTemplate(tpl){
        if(!tpl) return '';
        const agente = (agentSelect && agentSelect.value) || '';
        const email = (agentSelect && agentSelect.options[agentSelect.selectedIndex] && agentSelect.options[agentSelect.selectedIndex].getAttribute('data-email')) || '';
        const telefono = (agentSelect && agentSelect.options[agentSelect.selectedIndex] && agentSelect.options[agentSelect.selectedIndex].getAttribute('data-phone')) || '';
        const cliente = (nombreClienteInput && nombreClienteInput.value) || '';
        return tpl.replace(/\{AGENTE\}/g, agente).replace(/\{EMAIL\}/g, email).replace(/\{TELEFONO\}/g, telefono).replace(/\{CLIENTE\}/g, cliente);
    }

    function showAgentInfo(){
        const name = agentSelect.value;
        if(!name){ agentInfo.classList.remove('show'); agentInfo.textContent=''; return; }
        const user = agentSelect.options[agentSelect.selectedIndex].getAttribute('data-user') || '';
        const email = agentSelect.options[agentSelect.selectedIndex].getAttribute('data-email') || '';
        agentInfo.innerHTML = `<span style='color:#0ff;'>Ejecutivo seleccionado:</span><br>${name}<br>Usuario: <span style='color:#0ff;'>${user}</span><br>Correo: <span style='color:#0ff;'>${email}</span>`;
        agentInfo.classList.add('show');
    }

    function showToast(msg){
        // simple transient toast using alert fallback
        try{
            const t = document.createElement('div');
            t.textContent = msg; t.style.position='fixed'; t.style.bottom='24px'; t.style.left='50%'; t.style.transform='translateX(-50%)';
            t.style.background='var(--main-color)'; t.style.color='#041016'; t.style.padding='10px 18px'; t.style.borderRadius='8px'; t.style.zIndex=9999;
            document.body.appendChild(t);
            setTimeout(()=>t.remove(),2000);
        }catch(e){ alert(msg); }
    }


    async function saveHistoryFirestore(info) {
        if (!auth.currentUser) { showToast('No autenticado'); return; }
        try {
            await addDoc(collection(db, 'contactacion_envios'), {
                ...info,
                uid: auth.currentUser.uid,
                emailAuth: auth.currentUser.email,
                timestamp: new Date()
            });
        } catch (e) {
            showToast('Error guardando en Firestore');
            console.error(e);
        }
        updateFireWidget();
    }

    async function loadHistoryFirestore() {
        if (!auth.currentUser) { numberList.innerHTML = ''; updateFireWidget(); return; }
        numberList.innerHTML = '';
        try {
            const q = query(collection(db, 'contactacion_envios'), where('uid', '==', auth.currentUser.uid));
            const qs = await getDocs(q);
            // Ordenar en cliente mientras el índice se construye
            const sorted = qs.docs.sort((a, b) => (b.data().timestamp || 0) - (a.data().timestamp || 0));
            historyItems = sorted.map(docSnap => ({ docSnap, info: docSnap.data() }));
            currentPage = 1;
            renderHistoryPage();
        } catch (e) {
            showToast('Error cargando historial');
            console.error(e);
        }
        updateFireWidget();
    }

    async function clearHistoryFirestore() {
        if (!auth.currentUser) return;
        if (!confirm('¿Seguro que querés borrar TODO tu historial de envíos?')) return;
        try {
            const q = query(collection(db, 'contactacion_envios'), where('uid', '==', auth.currentUser.uid));
            const qs = await getDocs(q);
            for (const docSnap of qs.docs) {
                await deleteDoc(doc(db, 'contactacion_envios', docSnap.id));
            }
            numberList.innerHTML = '';
            showToast('Historial borrado');
        } catch (e) {
            showToast('Error al borrar historial');
            console.error(e);
        }
        updateFireWidget();
    }

    function printContactList(){
        const printWin = window.open('','_blank');
        const items = Array.from(numberList.children).map(li=>li.textContent).join('<br>');
        printWin.document.write(`<pre style="font-family:Segoe UI;">${items}</pre>`);
        printWin.document.close();
        printWin.print();
    }

    async function exportCsv(){
        if (!auth.currentUser) return;
        const q = query(collection(db, 'contactacion_envios'), where('uid', '==', auth.currentUser.uid));
        const qs = await getDocs(q);
        const items = qs.docs.map(d=>d.data());
        if(!items.length){ alert('No hay envíos para exportar'); return; }
        const headers = ['Region','Cedula cliente','Nombre del Cliente','Segmento','CEDULA_EJECUTIVO_NUEVO','Oferta','NumeroCompleto','Fecha','Hora','Agente','Usuario','Email'];
        const rows = items.map(i=>[
            (i.region||'').replace(/\n|\r|,/g,' '),
            (i.cedulaCliente||'').replace(/\n|\r|,/g,' '),
            (i.nombreCliente||'').replace(/\n|\r|,/g,' '),
            (i.segmento||'').replace(/\n|\r|,/g,' '),
            (i.cedulaEjecutivoNuevo||'').replace(/\n|\r|,/g,' '),
            (i.offer||''),
            (i.fullNumber||''),
            (i.fecha||''),
            (i.hora||''),
            (i.name||''),
            (i.user||''),
            (i.email||'')
        ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','));
        const csvBody = [headers.join(','), ...rows].join('\r\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `envios_contactacion_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    async function exportXlsx(){
        if (!auth.currentUser) return;
        const q = query(collection(db, 'contactacion_envios'), where('uid', '==', auth.currentUser.uid));
        const qs = await getDocs(q);
        const items = qs.docs.map(d=>d.data());
        if(!items.length){ alert('No hay envíos para exportar'); return; }
        const headers = ['Region','Cedula cliente','Nombre del Cliente','Segmento','CEDULA_EJECUTIVO_NUEVO','Oferta','NumeroCompleto','Fecha','Hora','Agente','Usuario','Email'];
        const rows = items.map(i=>[
            (i.region||''),
            (i.cedulaCliente||''),
            (i.nombreCliente||''),
            (i.segmento||''),
            (i.cedulaEjecutivoNuevo||''),
            (i.offer||''),
            (i.fullNumber||''),
            (i.fecha||''),
            (i.hora||''),
            (i.name||''),
            (i.user||''),
            (i.email||'')
        ]);
        if(window.XLSX && typeof window.XLSX.utils !== 'undefined'){
            try{
                const aoa = [headers, ...rows];
                const ws = XLSX.utils.aoa_to_sheet(aoa);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Envios');
                const filename = `envios_contactacion_${new Date().toISOString().slice(0,10)}.xlsx`;
                XLSX.writeFile(wb, filename);
                return;
            }catch(e){ console.warn('XLSX export failed, falling back to CSV', e); }
        }
        // fallback: download CSV with BOM
        const csvHeaders = headers;
        const csvRows = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}` ).join(','));
        const csvBody = [csvHeaders.join(','), ...csvRows].join('\r\n');
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `envios_contactacion_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    function updateClockMini(){
        const el = document.getElementById('neonClock'); if(!el) return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0'); const mm = String(now.getMinutes()).padStart(2,'0'); const ss = String(now.getSeconds()).padStart(2,'0');
        const dd = String(now.getDate()).padStart(2,'0'); const mo = String(now.getMonth()+1).padStart(2,'0'); const yy = now.getFullYear();
        el.textContent = `${hh}:${mm}:${ss} | ${dd}/${mo}/${yy}`;
    }

    function updateFireWidget(){
        // Usar el total real de historyItems, no solo los visibles en la página actual
        const total = historyItems.length;
        totalSendsEl.textContent = total;
        const widget = document.getElementById('fireWidgetMini');
        
        // Niveles extendidos para carteras grandes
        if(total === 0){ 
            fireStatusEl.textContent = '😴 Calm'; 
            widget.className = 'fire-widget level-safe'; 
        }
        else if(total < 10){ 
            fireStatusEl.textContent = '🌡️ Calentando'; 
            widget.className = 'fire-widget level-warm'; 
        }
        else if(total < 20){ 
            fireStatusEl.textContent = '🔥 Activo'; 
            widget.className = 'fire-widget level-fire'; 
        }
        else if(total < 35){ 
            fireStatusEl.textContent = '🔥🔥 En llamas'; 
            widget.className = 'fire-widget level-inferno'; 
        }
        else if(total < 50){ 
            fireStatusEl.textContent = '💥 Imparable'; 
            widget.className = 'fire-widget level-goat'; 
        }
        else if(total < 75){ 
            fireStatusEl.textContent = '⚡ Supersónico'; 
            widget.className = 'fire-widget level-supersonic'; 
        }
        else if(total < 100){ 
            fireStatusEl.textContent = '🚀 Cohete'; 
            widget.className = 'fire-widget level-rocket'; 
        }
        else if(total < 150){ 
            fireStatusEl.textContent = '🌟 Estrella'; 
            widget.className = 'fire-widget level-star'; 
        }
        else if(total < 200){ 
            fireStatusEl.textContent = '👑 Leyenda'; 
            widget.className = 'fire-widget level-legend'; 
        }
        else if(total < 300){ 
            fireStatusEl.textContent = '🏆 Campeón'; 
            widget.className = 'fire-widget level-champion'; 
        }
        else if(total < 500){ 
            fireStatusEl.textContent = '💎 Diamante'; 
            widget.className = 'fire-widget level-diamond'; 
        }
        else if(total < 750){ 
            fireStatusEl.textContent = '🦄 Unicornio'; 
            widget.className = 'fire-widget level-unicorn'; 
        }
        else if(total < 1000){ 
            fireStatusEl.textContent = '🐐 GOAT'; 
            widget.className = 'fire-widget level-goat'; 
        }
        else { 
            fireStatusEl.textContent = '👽 Alienígena ' + total; 
            widget.className = 'fire-widget level-alien'; 
        }
    }

    // Seasonal emoji
    function updateSeasonalEmojiMini(){
        const el = document.getElementById('seasonalEmoji'); if(!el) return;
        const m = new Date().getMonth();
        const map = ['❄️','🌷','🌱','🌸','🌼','☀️','🌞','🏖️','🍁','🎃','🦃','🎄'];
        if(m===11){ el.innerHTML = "<span class='emoji'>🎅</span> <span class='emoji'>🛷</span> <span class='emoji'>🦌</span> <span class='emoji'>🏡</span> <span class='emoji'>🎄</span>"; el.classList.add('december'); }
        else { el.textContent = map[m]||'🎉'; el.classList.remove('december'); }
    }

    // WhatsApp opener (desktop/mobile fallback, basic sanitization)
    async function sendMessage(){
        const number = (phoneInput.value||'').replace(/\D/g,'').trim();
        const name = agentSelect.value;
        if(!/^\d{8}$/.test(number)){ alert('Ingresá un número válido (8 dígitos).'); return; }
        if(!name){ alert('Seleccioná tu nombre.'); return; }
        // require report fields
        const cedulaCliente = (cedulaClienteInput.value||'').trim();
        const nombreCliente = (nombreClienteInput.value||'').trim();
        if(!cedulaCliente || !nombreCliente){ alert('Completá Cédula y Nombre del Cliente antes de enviar.'); return; }
        const fullNumber = '506'+number;
        // duplicate check
        const exists = Array.from(numberList.children).some(li=>{ try{ const info=JSON.parse(li.dataset.info||'{}'); return info.fullNumber===fullNumber }catch(e){return false} });
        if(exists){ alert('Este número ya fue registrado en el historial.'); return; }
        // Build message: prefer the editable text (which may include placeholders
        // previously filled). Ensure the client's name is present at the top
        // if it isn't already in the message (covers templates that already
        // start with a greeting or not).
        const editableText = (customMessage.value||'').trim();
        let mensajeFinal = editableText || messages[offerSelect.value] || '';
        if (nombreCliente && !mensajeFinal.includes(nombreCliente)) {
            mensajeFinal = `Hola ${nombreCliente}\n\n` + mensajeFinal;
        }
        const safeMessage = mensajeFinal.replace(/\s{3,}/g,' ').slice(0,2000);
        const encoded = encodeURIComponent(safeMessage);
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const url = isMobile ? `https://api.whatsapp.com/send?phone=${fullNumber}&text=${encoded}` : `https://web.whatsapp.com/send?phone=${fullNumber}&text=${encoded}`;
        window.open(url,'_blank');
        // save history in Firestore
        const now = new Date();
        const info = {
            name,
            user: agentSelect.options[agentSelect.selectedIndex].getAttribute('data-user')||'',
            email: agentSelect.options[agentSelect.selectedIndex].getAttribute('data-email')||'',
            offer: offerSelect.value,
            fullNumber,
            fecha: now.toLocaleDateString(),
            hora: now.toLocaleTimeString(),
            messageSent: safeMessage,
            region: (regionInput.value||'').trim(),
            cedulaCliente: cedulaCliente,
            nombreCliente: nombreCliente,
            segmento: (segmentoInput.value||'').trim(),
            cedulaEjecutivoNuevo: (cedulaEjecutivoNuevoInput.value||'').trim()
        };
        await saveHistoryFirestore(info);
        await loadHistoryFirestore();
        showToast('Envío registrado exitosamente');
    }


    // Weather widget removed — functions cleaned up

    // Inicializar
    function onAuthReady(fn) {
        if (auth.currentUser) return fn();
        const unsub = auth.onAuthStateChanged(() => { unsub(); fn(); });
    }
    onAuthReady(loadHistoryFirestore);
    // Re-cargar historial al cambiar usuario
    auth.onAuthStateChanged(loadHistoryFirestore);
    document.getElementById('clearHistoryMini').onclick = clearHistoryFirestore;

    // Reemplazar loadHistory y saveHistory por versiones Firestore
    window.loadHistoryFirestore = loadHistoryFirestore;
    window.saveHistoryFirestore = saveHistoryFirestore;
    window.clearHistoryFirestore = clearHistoryFirestore;

   
    init();
})();
