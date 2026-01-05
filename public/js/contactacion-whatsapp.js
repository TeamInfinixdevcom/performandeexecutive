// Contactación WhatsApp - integrado como pestaña
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
                <ul id='numberListMini'></ul>
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
        'VIP ORO': `Usted es muy importante para nosotros y me encantaría ser su agente personal de Kolbi.`,
        'Mensaje Personalizado': ''
    };

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
        { name: 'Manuel Antonio Escalante Leitón', cedula: '109790421', user: 'Maesca', email: 'MEscalanteL@ice.go.cr', phone: '87903535' },
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

        // merge fetched + embedded list, prefer fetched
        const combined = [];
        const seen = new Set();
        // first push fetched
        fetched.forEach(a=>{ const key = (a.email||a.name).toLowerCase(); if(!seen.has(key)){ seen.add(key); combined.push(a); } });
        // then embedded agentsList
        agentsList.forEach(a=>{ const key = (a.email||a.name).toLowerCase(); if(!seen.has(key)){ seen.add(key); combined.push(a); } });

        combined.forEach(a=>{
            const opt = document.createElement('option');
            opt.value = a.name;
            opt.textContent = a.name + (a.email? ` — ${a.email}` : '');
            opt.setAttribute('data-user', a.user||'');
            opt.setAttribute('data-email', a.email||'');
            opt.setAttribute('data-cedula', a.cedula||'');
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

    function init() {
        // Restore defaults
        customMessage.value = messages[offerSelect.value] || '';
        // poblar select de ejecutivos
        populateAgents();
        // aplicar color inicial
        applyOfferColor(offerSelect.value);
        offerSelect.addEventListener('change', () => { customMessage.value = messages[offerSelect.value] || ''; updateFireWidget(); applyOfferColor(offerSelect.value); });
        agentSelect.addEventListener('change', showAgentInfo);
        document.getElementById('openWhatsAppBtn').addEventListener('click', sendMessage);
        document.getElementById('restoreTemplateBtnMini').addEventListener('click', () => { customMessage.value = messages[offerSelect.value] || ''; showToast('Plantilla restaurada'); });
        document.getElementById('clearHistoryMini').addEventListener('click', ()=>{ if(confirm('¿Seguro que querés borrar el historial de envíos?')) clearHistoryFirestore(); });
        document.getElementById('printContactListMini').addEventListener('click', printContactList);
        document.getElementById('exportCsvMini').addEventListener('click', exportXlsx);

        loadHistoryFirestore();
        updateFireWidget();
        updateClockMini();
        setInterval(updateClockMini, 1000);
        updateSeasonalEmojiMini();
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
            sorted.forEach(docSnap => {
                const info = docSnap.data();
                const li = document.createElement('li');
                li.dataset.info = JSON.stringify(info);
                li.dataset.docid = docSnap.id;
                li.textContent = `${info.region||''} | ${info.cedulaCliente||''} | ${info.nombreCliente||''} | ${info.segmento||''} | ${info.cedulaEjecutivoNuevo||''} | ${info.name} | ${info.user} | ${info.email} | ${info.offer} | ${info.fullNumber} | Enviado: ${info.fecha} ${info.hora}`;
                // Botón borrar individual
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.className = 'btn btn-danger';
                delBtn.style.marginLeft = '8px';
                delBtn.onclick = async () => {
                    if (confirm('¿Borrar este envío?')) {
                        await deleteDoc(doc(db, 'contactacion_envios', docSnap.id));
                        li.remove();
                        updateFireWidget();
                    }
                };
                li.appendChild(delBtn);
                numberList.appendChild(li);
            });
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
        const items = Array.from(numberList.children).map(li=>{ try{return JSON.parse(li.dataset.info)}catch(e){return null}}).filter(Boolean);
        const total = items.length; totalSendsEl.textContent = total;
        const widget = document.getElementById('fireWidgetMini');
        if(total===0){ fireStatusEl.textContent='Calm'; widget.className='fire-widget level-safe'; }
        else if(total<10){ fireStatusEl.textContent='Caliente'; widget.className='fire-widget level-warm'; }
        else if(total<20){ fireStatusEl.textContent='🔥 Activo'; widget.className='fire-widget level-fire'; }
        else if(total<30){ fireStatusEl.textContent='🔥🔥 Inferno'; widget.className='fire-widget level-inferno'; }
        else { fireStatusEl.textContent='🐐 GOAT'; widget.className='fire-widget level-goat'; }
    }

    // Seasonal emoji
    function updateSeasonalEmojiMini(){
        const el = document.getElementById('seasonalEmoji'); if(!el) return;
        const m = new Date().getMonth();
        const map = ['❄️','💘','🌱','🌸','🌼','☀️','🌞','🏖️','🍁','🎃','🦃','🎄'];
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
        const saludo = `Hola, mi nombre es ${name}. Soy Agente Oficial de Kolbi.\n\n`;
        const editableText = (customMessage.value||'').trim();
        let mensajeFinal = saludo + (editableText || messages[offerSelect.value] || '');
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

    // ...resto de la función...
    init();
})();
