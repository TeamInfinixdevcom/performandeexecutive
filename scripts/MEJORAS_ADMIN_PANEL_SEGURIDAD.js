/**
 * MEJORAS DE SEGURIDAD PARA ADMIN PANEL
 * 
 * ✅ CAMBIOS RECOMENDADOS EN admin-panel.js
 * 
 * BUSCA Y REEMPLAZA las siguientes secciones:
 */

// ============================================
// SECCIÓN 1: Validación de entrada
// ============================================

// Agregar esta función al inicio del archivo:

/**
 * ✅ SEGURO: Validar entrada de usuario (prevenir XSS)
 */
function validateUserInput(email, name, password) {
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
  }

  // Validar nombre (solo letras, números, espacios)
  const nameRegex = /^[a-zA-Z0-9\s\-áéíóúñ]{2,100}$/;
  if (!nameRegex.test(name)) {
    throw new Error('Nombre inválido. Solo letras, números y espacios (2-100 caracteres)');
  }

  // Validar contraseña
  if (password.length < 8) {
    throw new Error('Contraseña debe tener al menos 8 caracteres');
  }

  // Prevenir scripts maliciosos
  if (/<script|javascript:|onerror|onload/i.test(email + name)) {
    throw new Error('Entrada sospechosa detectada');
  }

  return true;
}

/**
 * ✅ SEGURO: Sanitizar HTML
 */
function sanitizeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// SECCIÓN 2: Crear nuevo usuario (MEJORADO)
// ============================================

// REEMPLAZAR la función createNewUser con esta:

/**
 * ✅ MEJORADO: Crear nuevo usuario con validación
 */
async function createNewUser(name, email, password, role) {
  try {
    // 1. VALIDAR ENTRADA
    validateUserInput(email, name, password);

    // 2. VALIDAR ROL (solo 'admin' o 'executive')
    if (!['admin', 'executive'].includes(role)) {
      throw new Error('Rol inválido. Debe ser "admin" o "executive"');
    }

    showMessage('Creando usuario...', 'info');

    // 3. CREAR USUARIO EN FIREBASE AUTH
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    // 4. CREAR DOCUMENTO EN FIRESTORE
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      email: email,
      name: name,
      role: role,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser.email,
      lastLogin: null,
      metadata: {
        createdByUid: auth.currentUser.uid,
        createdTimestamp: serverTimestamp()
      }
    });

    showMessage(`✅ Usuario ${email} creado exitosamente como ${role}`, 'success');
    
    // Limpiar formulario
    document.getElementById('addUserName').value = '';
    document.getElementById('addUserEmail').value = '';
    document.getElementById('addUserPassword').value = '';
    document.getElementById('addUserRole').value = 'executive';

    // Recargar lista
    loadUsers();

  } catch (error) {
    console.error('Error creando usuario:', error);
    
    // Mensajes amigables
    let errorMessage = 'Error creando usuario';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Este email ya está registrado';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Contraseña muy débil. Usa al menos 8 caracteres';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    }
    
    showMessage(`❌ ${errorMessage}`, 'error');
  }
}

// ============================================
// SECCIÓN 3: Mostrar usuario en tabla (MEJORADO)
// ============================================

// AGREGAR esta función para sanitizar datos antes de mostrar:

/**
 * ✅ SEGURO: Mostrar usuarios en tabla
 */
function displayUsersInTable(users) {
  usersTableBody.innerHTML = '';

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    
    // Sanitizar datos antes de mostrar
    const email = sanitizeHTML(user.email);
    const name = sanitizeHTML(user.name);
    const role = sanitizeHTML(user.role);
    const isActive = user.isActive ? '✅ Activo' : '❌ Inactivo';

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${name}</td>
      <td>${email}</td>
      <td>${role}</td>
      <td>${isActive}</td>
      <td>
        <button class="btn btn-small btn-warning" onclick="toggleUserStatus('${user.uid}')">
          ${user.isActive ? 'Desactivar' : 'Activar'}
        </button>
        <button class="btn btn-small btn-secondary" onclick="changeUserRole('${user.uid}', '${role}')">
          Cambiar Rol
        </button>
        <button class="btn btn-small btn-danger" onclick="confirmDeleteUser('${user.uid}', '${email}')">
          Eliminar
        </button>
      </td>
    `;

    usersTableBody.appendChild(row);
  });
}

// ============================================
// SECCIÓN 4: Eliminar usuario (CONFIRMACIÓN)
// ============================================

// AGREGAR esta función:

/**
 * ✅ SEGURO: Confirmar eliminación
 */
function confirmDeleteUser(uid, email) {
  const confirmed = confirm(`⚠️ ¿Estás seguro de que deseas eliminar a ${sanitizeHTML(email)}?\n\nEsta acción es irreversible.`);
  
  if (confirmed) {
    deleteUser(uid, email);
  }
}

// ============================================
// SECCIÓN 5: Cambiar estado del usuario
// ============================================

// AGREGAR esta función:

/**
 * ✅ SEGURO: Alternar estado del usuario
 */
async function toggleUserStatus(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      showMessage('Usuario no encontrado', 'error');
      return;
    }

    const newStatus = !userDoc.data().isActive;

    await setDoc(doc(db, 'users', uid), {
      isActive: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email
    }, { merge: true });

    showMessage(`✅ Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
    loadUsers();

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    showMessage('❌ Error actualizando usuario: ' + error.message, 'error');
  }
}

// ============================================
// SECCIÓN 6: Cambiar rol del usuario
// ============================================

// AGREGAR esta función:

/**
 * ✅ SEGURO: Cambiar rol del usuario
 */
async function changeUserRole(uid, currentRole) {
  const newRole = prompt(
    `Role actual: ${currentRole}\nNuevo role (admin/executive):`,
    currentRole
  );

  if (!newRole || !['admin', 'executive'].includes(newRole)) {
    showMessage('Role inválido', 'error');
    return;
  }

  if (newRole === currentRole) {
    showMessage('El role es el mismo', 'info');
    return;
  }

  try {
    await setDoc(doc(db, 'users', uid), {
      role: newRole,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email
    }, { merge: true });

    showMessage(`✅ Role actualizado a ${newRole}`, 'success');
    loadUsers();

  } catch (error) {
    console.error('Error cambiando role:', error);
    showMessage('❌ Error cambiando role: ' + error.message, 'error');
  }
}

// ============================================
// SECCIÓN 7: Form validation en HTML
// ============================================

/**
 * Agregar a admin.html en el formulario de crear usuario:
 * 
 * <form id="addUserForm" onsubmit="handleAddUserForm(event)">
 *   <input 
 *     type="text" 
 *     id="addUserName" 
 *     placeholder="Nombre del usuario"
 *     required
 *     pattern="^[a-zA-Z0-9\s\-áéíóúñ]{2,100}$"
 *     title="Solo letras, números y espacios (2-100 caracteres)"
 *   >
 *   <input 
 *     type="email" 
 *     id="addUserEmail" 
 *     placeholder="Email"
 *     required
 *     pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
 *   >
 *   <input 
 *     type="password" 
 *     id="addUserPassword" 
 *     placeholder="Contraseña"
 *     required
 *     minlength="8"
 *     title="Mínimo 8 caracteres"
 *   >
 *   <select id="addUserRole" required>
 *     <option value="executive">Executive</option>
 *     <option value="admin">Admin</option>
 *   </select>
 *   <button type="submit">Crear Usuario</button>
 * </form>
 */

/**
 * Handler para el formulario mejorado
 */
function handleAddUserForm(event) {
  event.preventDefault();

  const name = document.getElementById('addUserName').value.trim();
  const email = document.getElementById('addUserEmail').value.trim();
  const password = document.getElementById('addUserPassword').value;
  const role = document.getElementById('addUserRole').value;

  try {
    validateUserInput(email, name, password);
    createNewUser(name, email, password, role);
  } catch (error) {
    showMessage(`❌ ${error.message}`, 'error');
  }
}
