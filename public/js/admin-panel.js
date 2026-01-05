import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDocs, 
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Referencias a elementos del DOM
const addUserForm = document.getElementById('addUserForm');
const usersTableBody = document.getElementById('usersTableBody');
const messageBox = document.getElementById('messageBox');
const btnRefreshUsers = document.getElementById('btnRefreshUsers');
const btnBackToApp = document.getElementById('btnBackToApp');
const btnLogout = document.getElementById('btnLogout');

// Estadísticas
const totalUsersEl = document.getElementById('totalUsers');
const totalAdminsEl = document.getElementById('totalAdmins');
const totalExecutivesEl = document.getElementById('totalExecutives');
const totalClientsSystemEl = document.getElementById('totalClientsSystem');

// Verificar que el usuario actual es admin
async function verifyAdminAccess() {
    const currentUser = auth.currentUser;
    
    console.log('🔍 Verificando acceso admin para:', currentUser?.email);
    
    if (!currentUser) {
        console.error('❌ No hay usuario autenticado');
        window.location.href = 'login.html';
        return false;
    }

    try {
        // Verificar si es admin en Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        console.log('📄 Documento existe:', userDoc.exists());
        
        if (!userDoc.exists()) {
            console.error('❌ Documento del usuario no existe en Firestore');
            showMessage('❌ Acceso denegado. Usuario no encontrado en el sistema.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        
        const userData = userDoc.data();
        console.log('👤 Datos del usuario:', { email: userData.email, role: userData.role });
        
        if (userData.role !== 'admin') {
            console.error('❌ Usuario no tiene rol admin. Tiene rol:', userData.role);
            showMessage('❌ Acceso denegado. Solo administradores pueden acceder a este panel.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        
        console.log('✅ Acceso concedido para:', userData.email);
        return true;
    } catch (error) {
        console.error('❌ Error verificando acceso:', error);
        showMessage('❌ Error verificando permisos: ' + error.message, 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return false;
    }
}

// Mostrar mensaje
function showMessage(message, type = 'success') {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
    
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 5000);
}

// Crear nuevo usuario
async function createNewUser(name, email, password, role) {
    try {
        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        // Guardar información adicional en Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            name: name,
            email: email,
            role: role,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        
        showMessage(`✅ Usuario ${name} creado exitosamente.`, 'success');
        
        // Limpiar formulario
        addUserForm.reset();
        
        // Recargar lista de usuarios
        await loadUsers();
        
        return true;
    } catch (error) {
        console.error('Error creando usuario:', error);
        
        let errorMessage = '❌ Error creando usuario: ';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Este correo ya está registrado.';
                break;
            case 'auth/weak-password':
                errorMessage += 'La contraseña debe tener al menos 6 caracteres.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'El correo electrónico no es válido.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showMessage(errorMessage, 'error');
        return false;
    }
}

// Cargar lista de usuarios
async function loadUsers() {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #a0aec0;">
                        No hay usuarios registrados todavía.
                    </td>
                </tr>
            `;
            updateStats([], 0);
            return;
        }
        
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        displayUsers(users);
        
        // Cargar estadísticas de clientes
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        updateStats(users, clientsSnapshot.size);
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showMessage('❌ Error cargando la lista de usuarios.', 'error');
    }
}

// Mostrar usuarios en la tabla
function displayUsers(users) {
    usersTableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Formato de fecha
        let dateStr = 'N/A';
        if (user.createdAt) {
            const date = user.createdAt.toDate();
            dateStr = date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
        
        // Badge de rol
        const roleBadge = user.role === 'admin' 
            ? '<span class="status-badge status-admin">👑 Admin</span>'
            : '<span class="status-badge status-executive">👤 Ejecutivo</span>';
        
        // Estado
        const statusBadge = user.isActive !== false
            ? '<span style="color: #48bb78;">✅ Activo</span>'
            : '<span style="color: #f56565;">❌ Inactivo</span>';
        
        row.innerHTML = `
            <td><strong>${user.name || 'Sin nombre'}</strong></td>
            <td>${user.email}</td>
            <td>${roleBadge}</td>
            <td>${dateStr}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-delete-user" onclick="deleteUserAccount('${user.id}', '${user.email}')">
                    🗑️ Eliminar
                </button>
            </td>
        `;
        
        usersTableBody.appendChild(row);
    });
}

// Actualizar estadísticas
function updateStats(users, totalClients) {
    totalUsersEl.textContent = users.length;
    
    const admins = users.filter(u => u.role === 'admin').length;
    totalAdminsEl.textContent = admins;
    
    const executives = users.filter(u => u.role === 'executive').length;
    totalExecutivesEl.textContent = executives;
    
    totalClientsSystemEl.textContent = totalClients;
}

// Eliminar usuario
async function deleteUserAccount(userId, userEmail) {
    const confirmed = confirm(
        `⚠️ ¿Estás seguro de eliminar al usuario?\n\n` +
        `Email: ${userEmail}\n\n` +
        `Esta acción no se puede deshacer. El usuario perderá acceso inmediatamente.`
    );
    
    if (!confirmed) return;
    
    try {
        // Eliminar documento de Firestore
        await deleteDoc(doc(db, 'users', userId));
        
        showMessage(`✅ Usuario ${userEmail} eliminado exitosamente.`, 'success');
        
        // Recargar lista
        await loadUsers();
        
        // Nota: Para eliminar completamente del Authentication, 
        // se necesitaría una función en el backend con Firebase Admin SDK
        showMessage(
            `⚠️ Nota: El usuario fue eliminado de la base de datos. ` +
            `Para eliminarlo completamente de Authentication, usa Firebase Console.`,
            'warning'
        );
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showMessage('❌ Error eliminando usuario.', 'error');
    }
}

// Hacer la función global para que onclick pueda accederla
window.deleteUserAccount = deleteUserAccount;

// Event Listeners
addUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    
    if (!name || !email || !password) {
        showMessage('❌ Por favor completa todos los campos requeridos.', 'error');
        return;
    }
    
    await createNewUser(name, email, password, role);
});

btnRefreshUsers.addEventListener('click', () => {
    loadUsers();
});

btnBackToApp.addEventListener('click', () => {
    window.location.href = 'index.html';
});

btnLogout.addEventListener('click', async () => {
    if (confirm('¿Cerrar sesión?')) {
        await signOut(auth);
        window.location.href = 'login.html';
    }
});

// Verificar acceso y cargar usuarios al iniciar
auth.onAuthStateChanged(async (user) => {
    console.log('🔐 onAuthStateChanged disparado para:', user?.email);
    
    if (user) {
        // Pequeño delay para asegurar que Firestore esté listo
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const hasAccess = await verifyAdminAccess();
        if (hasAccess) {
            console.log('✅ Acceso concedido, cargando usuarios...');
            loadUsers();
        } else {
            console.error('❌ Acceso denegado');
        }
    } else {
        console.log('❌ No hay usuario, redirigiendo a login...');
        window.location.href = 'login.html';
    }
});
