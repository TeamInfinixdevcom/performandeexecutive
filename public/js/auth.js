/**
 * Gestión de Autenticación con Firebase
 * Login, Registro, Logout y verificación de sesión
 * Ahora usa Firestore para validar usuarios autorizados
 */

import { auth, db } from './firebase-config.js';
import deviceFingerprint from './device-fingerprint.js';
import csrfTokenManager from './csrf-protection.js';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Verificar si un email está autorizado (existe en Firestore)
 */
async function isAuthorizedUser(email) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return false;
        }
        
        // Verificar que esté activo
        const userData = querySnapshot.docs[0].data();
        return userData.isActive !== false;
        
    } catch (error) {
        console.error('Error verificando usuario autorizado:', error);
        return false;
    }
}

/**
 * Mostrar mensaje en la página
 */
function showMessage(message, type = 'info') {
    const messageBox = document.getElementById('authMessage');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `message-box message-${type}`;
        messageBox.classList.remove('hidden');

        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Registro de nuevo usuario - YA NO SE USA
 * Los usuarios ahora se crean desde el panel de administración
 */
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        showMessage('❌ El registro directo está deshabilitado. Los usuarios deben ser creados por un administrador.', 'error');
        return;
        
        /* CÓDIGO ANTERIOR DESHABILITADO
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // VERIFICAR SI EL CORREO ESTÁ AUTORIZADO
        const isAuthorized = await isAuthorizedUser(email);
        if (!isAuthorized) {
            showMessage('❌ Acceso denegado. Este correo no está autorizado. Contacta al administrador.', 'error');
            return;
        }
        
        // Validar contraseñas
        if (password !== confirmPassword) {
            showMessage('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        try {
            showMessage('Creando cuenta...', 'info');
            
            // Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Actualizar perfil con el nombre
            await updateProfile(user, {
                displayName: name
            });
            
            // Guardar datos adicionales en Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                role: 'user'
            });
            
            showMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        }
        */
    });
}

/**
 * Login de usuario - CON PROTECCIONES DE SEGURIDAD
 */
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            showMessage('Iniciando sesión...', 'info');
            
            // 🔒 PASO 1: Generar Device Fingerprint (primera vez) o validar (login previos)
            const fingerprintValidation = await deviceFingerprint.validate();
            
            if (!fingerprintValidation.valid && deviceFingerprint.getStored() !== null) {
                // El fingerprint no coincide y YA HABÍA UN ALMACENADO - posible hijacking
                console.error('⚠️ SECURITY ALERT:', fingerprintValidation.reason);
                showMessage('❌ ALERTA DE SEGURIDAD: El dispositivo no coincide con el login anterior. Por favor, intenta de nuevo.', 'error');
                await signOut(auth);
                deviceFingerprint.clear();
                return;
            }
            
            // 🔒 PASO 2: Generar CSRF Token (se enviará con la solicitud)
            const csrfToken = csrfTokenManager.getToken();
            
            // Primero hacer login en Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 🔒 PASO 3: Después verificar en Firestore si está autorizado
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                showMessage('❌ Acceso denegado. Usuario no encontrado en el sistema.', 'error');
                await signOut(auth);
                return;
            }
            
            const userData = userDoc.data();
            
            if (userData.isActive === false) {
                showMessage('❌ Acceso denegado. Tu cuenta está inactiva.', 'error');
                await signOut(auth);
                return;
            }
            
            // 🔒 PASO 4: Guardar device fingerprint en localStorage (para futuras validaciones)
            const newFingerprint = await deviceFingerprint.generate();
            deviceFingerprint.save(newFingerprint);
            
            // 🔒 PASO 5: Guardar CSRF token en sessionStorage también (para protección adicional)
            sessionStorage.setItem('csrfToken', csrfToken);
            
            // 🔒 PASO 6: Registrar el login en Firestore para auditoría
            await setDoc(doc(db, 'users', user.uid), {
                ...userData,
                lastLogin: new Date().toISOString(),
                lastLoginDevice: newFingerprint.slice(0, 20) + '...'
            });
            
            console.log('✅ Login exitoso - Dispositivo fingerprinted y protecciones activadas');
            showMessage('¡Bienvenido! Redirigiendo...', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            
            let errorMessage = 'Error al iniciar sesión';
            
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Correo o contraseña incorrectos';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Correo electrónico inválido';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Esta cuenta ha sido deshabilitada';
                    break;
            }
            
            showMessage(errorMessage, 'error');
        }
    });
}

/**
 * Verificar autenticación en la página principal
 */
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Dev shortcut: when running on localhost allow auto-login for UI testing
            const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (isLocal) {
                console.log('⚙️ Dev mode: no auth found but running on localhost — enabling auto-login for UI testing');
                // Provide a minimal mock user and userData so UI can render without Firebase auth
                window.currentUser = { uid: 'dev', email: 'dev@local' };
                const userData = { name: 'Dev User', role: 'admin', isActive: true };

                // Show user name
                const userNameElement = document.getElementById('userName');
                if (userNameElement) userNameElement.textContent = userData.name;

                // Show admin buttons for dev
                const btnAdminPanel = document.getElementById('btnAdminPanel');
                if (btnAdminPanel) btnAdminPanel.style.display = 'inline-block';
                const btnTodasVentas = document.getElementById('btnTodasVentas');
                if (btnTodasVentas) btnTodasVentas.classList.remove('hidden');

                // Configure logout button to simply clear storage and reload
                const logoutBtn = document.getElementById('btnLogout');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async () => {
                        try {
                            deviceFingerprint.clear();
                        } catch(e){}
                        try { csrfTokenManager.clear(); } catch(e){}
                        sessionStorage.removeItem('csrfToken');
                        // For dev, just reload to show login again
                        location.reload();
                    });
                }

                // Early return: skip production checks
                return;
            }
            // No hay usuario autenticado, redirigir a login
            window.location.href = 'login.html';
        } else {
            // Asignar usuario a window para que otros módulos lo usen
            window.currentUser = user;
            
            // Obtener datos del usuario desde Firestore usando su UID
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                alert('❌ Acceso denegado. Usuario no encontrado en el sistema.');
                await signOut(auth);
                window.location.href = 'login.html';
                return;
            }
            
            const userData = userDoc.data();
            
            // Verificar que esté activo
            if (userData.isActive === false) {
                alert('❌ Acceso denegado. Tu cuenta está inactiva.');
                await signOut(auth);
                window.location.href = 'login.html';
                return;
            }
            
            // Usuario autenticado y autorizado, cargar datos
            console.log('✅ Usuario autenticado:', user.email);
            console.log('📊 Datos del usuario:', userData);
            
            // Mostrar nombre del usuario en la interfaz
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                const displayName = userData?.name || user.displayName || user.email;
                userNameElement.textContent = displayName;
                console.log('👤 Nombre mostrado:', displayName);
            }
            
            // Si es admin, mostrar botón de panel admin y pestaña de todas las ventas
            console.log('🔑 Rol del usuario:', userData?.role);
            const userRole = (userData?.role || '').toLowerCase(); // Convertir a minúsculas
            if (userRole === 'admin') {
                const btnAdminPanel = document.getElementById('btnAdminPanel');
                if (btnAdminPanel) {
                    btnAdminPanel.style.display = 'inline-block';
                    console.log('👨‍💼 Botón Panel Admin mostrado');
                } else {
                    console.error('❌ Botón btnAdminPanel no encontrado en el DOM');
                }

                // Mostrar pestaña de Todas las Ventas (usar clase .hidden)
                const btnTodasVentas = document.getElementById('btnTodasVentas');
                if (btnTodasVentas) {
                    btnTodasVentas.classList.remove('hidden');
                    console.log('🌐 Pestaña Todas las Ventas mostrada para admin');
                }
            } else {
                console.log('ℹ️ Usuario no es admin, ocultando botones admin');
                
                // FORZAR ocultación de botones admin
                const btnAdminPanel = document.getElementById('btnAdminPanel');
                if (btnAdminPanel) {
                    btnAdminPanel.style.display = 'none';
                }

                const btnTodasVentas = document.getElementById('btnTodasVentas');
                if (btnTodasVentas) {
                    btnTodasVentas.classList.add('hidden');
                    console.log('🔒 Pestaña Todas las Ventas OCULTA para usuario normal');
                }

                // Ocultar también la pestaña si estaba visible
                const tabTodasVentas = document.getElementById('tab-todasventas');
                if (tabTodasVentas) {
                    tabTodasVentas.classList.add('hidden');
                }
            }
            
            // Configurar botón de logout
            const logoutBtn = document.getElementById('btnLogout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    console.log('🔴 LOGOUT: Click detectado en btnLogout');
                    try {
                        console.log('🔴 LOGOUT: Limpiando fingerprint...');
                        deviceFingerprint.clear();
                        
                        console.log('🔴 LOGOUT: Limpiando CSRF tokens...');
                        csrfTokenManager.clear();
                        sessionStorage.removeItem('csrfToken');
                        
                        console.log('🔴 LOGOUT: Llamando a signOut(auth)...');
                        await signOut(auth);
                        
                        console.log('🔴 LOGOUT: SignOut exitoso, redirigiendo a login.html');
                        window.location.href = 'login.html';
                    } catch (error) {
                        console.error('❌ Error al cerrar sesión:', error);
                        alert('Error al cerrar sesión: ' + error.message);
                    }
                });
                console.log('✅ Evento click configurado en btnLogout');
            } else {
                console.error('❌ btnLogout no encontrado en el DOM');
            }
            
            // Inicializar módulo de gestión de llamadas
            if (typeof initCallsManagement === 'function') {
                initCallsManagement(user.uid);
            }

            // ❌ COMENTADO: init-master.js ya se encarga de cargar initSalesManagement
            // if (typeof initSalesManagement === 'function') {
            //     initSalesManagement(user.uid, user.email);
            // }
        }
    });
}

/**
 * Redirigir a index si ya está autenticado (en páginas de login/registro)
 */
if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    // En desarrollo: si estamos en localhost y en la pantalla de login, redirigir
    // a index.html para activar el autologin de desarrollo (shortcut seguro solo para localhost).
    if (isLocal && window.location.pathname.includes('login.html')) {
        console.log('⚙️ Dev mode: login page on localhost — redirecting to index.html to enable dev autologin');
        window.location.href = 'index.html';
    } else {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Ya está autenticado, redirigir a la app
                window.location.href = 'index.html';
            }
        });
    }
}
