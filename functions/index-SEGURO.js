/**
 * CLOUD FUNCTIONS SEGURAS
 * 
 * ✅ CAMBIOS IMPLEMENTADOS:
 * 1. Convertir HTTP Functions a Callable Functions
 * 2. Validar autenticación del usuario
 * 3. Verificar rol de admin en Firestore
 * 4. Implementar rate limiting
 * 5. Agregar logging de auditoría
 * 
 * DEPLOY:
 * firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// FUNCIÓN AUXILIAR: Verificar si es admin
// ============================================
async function verifyAdminUser(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    return userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error verificando admin:', error);
    return false;
  }
}

// ============================================
// FUNCIÓN AUXILIAR: Registrar auditoría
// ============================================
async function logAudit(userId, action, resource, details) {
  try {
    await db.collection('audit_logs').add({
      userId: userId,
      action: action,
      resource: resource,
      details: details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: details.ip || 'unknown'
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}

// ============================================
// FUNCIÓN AUXILIAR: Rate limiting
// ============================================
async function checkRateLimit(userId, action, limit = 10, windowMs = 3600000) {
  const key = `rateLimit_${userId}_${action}`;
  const now = Date.now();
  
  try {
    const record = await db.collection('rate_limits').doc(key).get();
    
    if (!record.exists) {
      await db.collection('rate_limits').doc(key).set({
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { allowed: true, remaining: limit - 1 };
    }
    
    const data = record.data();
    const timeDiff = now - data.firstAttempt;
    
    if (timeDiff > windowMs) {
      // Ventana expirada, reiniciar
      await db.collection('rate_limits').doc(key).set({
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return { allowed: true, remaining: limit - 1 };
    }
    
    if (data.attempts >= limit) {
      return { allowed: false, remaining: 0, retryAfter: Math.ceil((windowMs - timeDiff) / 1000) };
    }
    
    // Incrementar intentos
    await db.collection('rate_limits').doc(key).update({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttempt: now
    });
    
    return { allowed: true, remaining: limit - data.attempts - 1 };
  } catch (error) {
    console.error('Error en rate limiting:', error);
    return { allowed: true, remaining: limit - 1 }; // Por defecto, permitir
  }
}

// ============================================
// ✅ FUNCIÓN SEGURA: Limpiar y recrear usuario
// ============================================
exports.cleanAndRecreateUser = functions.https.onCall(async (data, context) => {
  // 1. VERIFICAR AUTENTICACIÓN
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado'
    );
  }

  // 2. VERIFICAR ROL DE ADMIN
  const isAdmin = await verifyAdminUser(context.auth.uid);
  if (!isAdmin) {
    await logAudit(context.auth.uid, 'UNAUTHORIZED_ATTEMPT', 'cleanAndRecreateUser', {
      email: data.email,
      ip: context.rawRequest.ip
    });
    
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden ejecutar esta acción'
    );
  }

  // 3. RATE LIMITING (5 intentos por hora)
  const rateLimit = await checkRateLimit(context.auth.uid, 'cleanUser', 5, 3600000);
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Demasiados intentos. Reintentar en ${rateLimit.retryAfter} segundos`
    );
  }

  // 4. VALIDAR INPUT
  const { email } = data;
  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email válido requerido'
    );
  }

  try {
    // 5. OBTENER USUARIO
    const userRecord = await auth.getUserByEmail(email);
    
    // Protección: No permitir eliminar al usuario admin actual
    if (userRecord.uid === context.auth.uid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No puedes eliminar tu propia cuenta'
      );
    }

    // 6. ELIMINAR DE FIRESTORE
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`✅ Documento eliminado de Firestore: ${email}`);

    // 7. ELIMINAR DE AUTH
    await auth.deleteUser(userRecord.uid);
    console.log(`✅ Usuario eliminado de Auth: ${email}`);

    // 8. REGISTRAR AUDITORÍA
    await logAudit(context.auth.uid, 'DELETE_USER', 'users', {
      targetEmail: email,
      targetUid: userRecord.uid,
      ip: context.rawRequest.ip
    });

    return {
      success: true,
      message: `Usuario ${email} limpiado completamente`,
      deletedUid: userRecord.uid
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    
    // Registrar error
    await logAudit(context.auth.uid, 'DELETE_USER_ERROR', 'users', {
      targetEmail: email,
      error: error.message,
      ip: context.rawRequest.ip
    });

    throw new functions.https.HttpsError(
      'internal',
      'Error al limpiar usuario: ' + error.message
    );
  }
});

// ============================================
// ✅ FUNCIÓN SEGURA: Sincronizar Auth a Firestore
// ============================================
exports.syncAuthToFirestore = functions.https.onCall(async (data, context) => {
  // 1. VERIFICAR AUTENTICACIÓN
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado'
    );
  }

  // 2. VERIFICAR ROL DE ADMIN
  const isAdmin = await verifyAdminUser(context.auth.uid);
  if (!isAdmin) {
    await logAudit(context.auth.uid, 'UNAUTHORIZED_ATTEMPT', 'syncAuthToFirestore', {
      email: data.email,
      ip: context.rawRequest.ip
    });

    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden ejecutar esta acción'
    );
  }

  // 3. RATE LIMITING (10 intentos por hora)
  const rateLimit = await checkRateLimit(context.auth.uid, 'syncUser', 10, 3600000);
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Demasiados intentos. Reintentar en ${rateLimit.retryAfter} segundos`
    );
  }

  // 4. VALIDAR INPUT
  const { email } = data;
  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email válido requerido'
    );
  }

  try {
    // 5. OBTENER USUARIO DE AUTH
    const userRecord = await auth.getUserByEmail(email);

    // 6. CREAR/ACTUALIZAR EN FIRESTORE
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || email.split('@')[0],
      role: 'executive', // Rol por defecto
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'manual-sync',
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 7. REGISTRAR AUDITORÍA
    await logAudit(context.auth.uid, 'SYNC_USER', 'users', {
      targetEmail: email,
      targetUid: userRecord.uid,
      ip: context.rawRequest.ip
    });

    return {
      success: true,
      message: `Usuario ${email} sincronizado exitosamente`,
      uid: userRecord.uid
    };

  } catch (error) {
    console.error(`❌ Error sincronizando usuario: ${error.message}`);

    // Registrar error
    await logAudit(context.auth.uid, 'SYNC_USER_ERROR', 'users', {
      targetEmail: email,
      error: error.message,
      ip: context.rawRequest.ip
    });

    throw new functions.https.HttpsError(
      'internal',
      'Error sincronizando usuario: ' + error.message
    );
  }
});

// ============================================
// TRIGGERS EXISTENTES (Sin cambios necesarios)
// ============================================

/**
 * TRIGGER: Cuando se crea un usuario en Authentication
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  console.log(`✅ Nuevo usuario creado en Auth: ${user.email}`);
  
  try {
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      role: 'executive',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system-auto',
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Documento creado en Firestore para: ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sincronizando usuario: ${error.message}`);
    throw error;
  }
});

/**
 * TRIGGER: Cuando se elimina un usuario en Authentication
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  console.log(`🗑️ Usuario eliminado de Auth: ${user.email}`);
  
  try {
    await db.collection('users').doc(user.uid).delete();
    console.log(`✅ Documento eliminado de Firestore: ${user.email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error eliminando documento: ${error.message}`);
    throw error;
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Auditoría de cambios
// ============================================
exports.auditUserChanges = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Detectar cambios en campos críticos
    if (before.role !== after.role) {
      console.warn(`⚠️ CAMBIO DE ROL: ${after.email} - ${before.role} -> ${after.role}`);
      await logAudit('system', 'ROLE_CHANGED', 'users', {
        userId: context.params.userId,
        email: after.email,
        before: before.role,
        after: after.role
      });
    }

    if (before.isActive !== after.isActive) {
      console.warn(`⚠️ CAMBIO DE ESTADO: ${after.email} - Active: ${after.isActive}`);
      await logAudit('system', 'ACTIVE_STATUS_CHANGED', 'users', {
        userId: context.params.userId,
        email: after.email,
        isActive: after.isActive
      });
    }
  });

console.log('✅ Cloud Functions seguras cargadas correctamente');
