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
// FUNCIÓN AUXILIAR: Validar CSRF Token
// ============================================
// El CSRF token es validado en el cliente antes de enviar
// Aquí agregamos una validación adicional en el servidor
async function validateCSRFToken(tokenData) {
  try {
    // El cliente debe incluir un csrfToken en los datos
    if (!tokenData || !tokenData.csrfToken || tokenData.csrfToken.length < 64) {
      console.warn('⚠️ CSRF token missing or invalid format');
      return false;
    }
    
    // Validación básica: el token debe ser un string hexadecimal
    if (!/^[a-f0-9]{64}$/.test(tokenData.csrfToken)) {
      console.warn('⚠️ CSRF token formato inválido (no es hex válido)');
      return false;
    }
    
    // NOTA: En producción, validarías el token contra una base de datos
    // Por ahora, validamos que tenga el formato correcto
    return true;
  } catch (error) {
    console.error('Error validando CSRF token:', error);
    return false;
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

  // 🔒 2. VALIDAR CSRF TOKEN
  if (!validateCSRFToken(data)) {
    await logAudit(context.auth.uid, 'CSRF_VALIDATION_FAILED', 'cleanAndRecreateUser', {
      email: data.email,
      ip: context.rawRequest.ip
    });
    throw new functions.https.HttpsError(
      'permission-denied',
      'CSRF token validation failed'
    );
  }

  // 3. VERIFICAR ROL DE ADMIN
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

  // 4. RATE LIMITING (5 intentos por hora)
  const rateLimit = await checkRateLimit(context.auth.uid, 'cleanUser', 5, 3600000);
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      `Demasiados intentos. Reintentar en ${rateLimit.retryAfter} segundos`
    );
  }

  // 5. VALIDAR INPUT
  const { email } = data;
  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email válido requerido'
    );
  }

  try {
    // 6. OBTENER USUARIO
    const userRecord = await auth.getUserByEmail(email);
    
    // Protección: No permitir eliminar al usuario admin actual
    if (userRecord.uid === context.auth.uid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No puedes eliminar tu propia cuenta'
      );
    }

    // 7. ELIMINAR DE FIRESTORE
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`✅ Documento eliminado de Firestore: ${email}`);

    // 8. ELIMINAR DE AUTH
    await auth.deleteUser(userRecord.uid);
    console.log(`✅ Usuario eliminado de Auth: ${email}`);

    // 9. REGISTRAR AUDITORÍA
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

// ============================================
// ✅ NUEVA FUNCIÓN: Sincronizar usuarios faltantes
// ============================================
exports.syncMissingUsers = functions.https.onCall(async (data, context) => {
  // Solo admins pueden llamar esta función
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const isAdmin = await verifyAdminUser(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden ejecutar esto');
  }

  try {
    const allAuthUsers = await auth.listUsers(1000);
    let created = 0;
    let updated = 0;

    for (const authUser of allAuthUsers.users) {
      const userDoc = await db.collection('users').doc(authUser.uid).get();

      if (!userDoc.exists) {
        // Crear documento que falta
        await db.collection('users').doc(authUser.uid).set({
          uid: authUser.uid,
          email: authUser.email,
          name: authUser.displayName || authUser.email.split('@')[0],
          role: 'executive',
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'sync-missing-users',
          lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });
        created++;
      } else if (!userDoc.data().isActive) {
        // Activar usuario inactivo
        await db.collection('users').doc(authUser.uid).update({
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updated++;
      }
    }

    return {
      success: true,
      created: created,
      updated: updated,
      message: `✅ Sincronización completada: ${created} creados, ${updated} actualizados`
    };
  } catch (error) {
    console.error('Error sincronizando usuarios:', error);
    throw new functions.https.HttpsError('internal', 'Error sincronizando usuarios: ' + error.message);
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Migrar campo nombre → name
// ============================================
exports.migrateClientNames = functions.https.onCall(async (data, context) => {
  // Solo admins pueden llamar esta función
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const isAdmin = await verifyAdminUser(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden ejecutar esto');
  }

  try {
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.get();
    let updated = 0;

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Si tiene 'nombre' pero no tiene 'name', migrar
      if (data.nombre && !data.name) {
        batch.update(doc.ref, {
          name: data.nombre,
          // No eliminar 'nombre' para compatibilidad
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
    }

    return {
      success: true,
      updated: updated,
      message: `✅ Migración completada: ${updated} clientes actualizados`
    };
  } catch (error) {
    console.error('Error migrando clientes:', error);
    throw new functions.https.HttpsError('internal', 'Error migrando: ' + error.message);
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Borrar solo mis clientes
// ============================================
exports.deleteMyClients = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const currentUserId = context.auth.uid;
  
  try {
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef
      .where('executiveId', '==', currentUserId)
      .get();

    let deleted = 0;
    const batch = db.batch();

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      deleted++;
    });

    if (deleted > 0) {
      await batch.commit();
    }

    return {
      success: true,
      deleted: deleted,
      message: `✅ Se eliminaron ${deleted} cliente(s) tuyos. Los de otros ejecutivos se mantienen intactos.`
    };
  } catch (error) {
    console.error('Error eliminando clientes:', error);
    throw new functions.https.HttpsError('internal', 'Error: ' + error.message);
  }
});

// ============================================
// FUNCIÓN: Registrar venta exitosa
// ============================================
exports.recordSuccessfulSale = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { clientId, segmento } = data;
    const executiveId = context.auth.uid;

    if (!clientId || !segmento) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan parámetros');
    }

    // Obtener datos del cliente
    const clientSnap = await db.collection('clients').doc(clientId).get();
    if (!clientSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Cliente no encontrado');
    }

    const client = clientSnap.data();
    
    // Verificar que sea cliente del ejecutivo actual
    if (client.executiveId !== executiveId) {
      throw new functions.https.HttpsError('permission-denied', 'No es tu cliente');
    }

    // Obtener datos del ejecutivo
    const execSnap = await db.collection('users').doc(executiveId).get();
    const executiveName = execSnap.data().displayName || execSnap.data().email;

    // Crear registro de venta
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const monthStr = `${year}-${month}`;

    await db.collection('sales_metrics').add({
      executiveId: executiveId,
      executiveName: executiveName,
      clientId: clientId,
      clientName: client.name,
      segmento: segmento,
      cantidad: 1,
      fecha: now,
      dateStr: dateStr,        // Para filtrar por día
      monthStr: monthStr,       // Para filtrar por mes
      year: year,               // Para filtrar por año
      timestamp: admin.firestore.Timestamp.now(),
      type: 'sale'
    });

    // Registrar en auditoría
    await db.collection('audit_logs').add({
      userId: executiveId,
      action: 'SALE_RECORDED',
      resource: 'sales_metrics',
      details: {
        clientId: clientId,
        segmento: segmento,
        timestamp: new Date()
      }
    });

    return {
      success: true,
      message: '✅ Venta registrada exitosamente'
    };

  } catch (error) {
    console.error('Error registrando venta:', error);
    throw new functions.https.HttpsError('internal', 'Error: ' + error.message);
  }
});

// ============================================
// FUNCIÓN: Obtener métricas de ventas
// ============================================
exports.getSalesMetrics = functions.https.onCall(async (data, context) => {
  try {
    // Verificar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const executiveId = context.auth.uid;
    const { period, segment, dateFilter } = data; // period: 'day', 'month', 'year'; dateFilter: '2025-11-11'

    let query = db.collection('sales_metrics')
      .where('executiveId', '==', executiveId);

    // Filtrar por período
    if (period === 'day' && dateFilter) {
      query = query.where('dateStr', '==', dateFilter);
    } else if (period === 'month' && dateFilter) {
      query = query.where('monthStr', '==', dateFilter);
    } else if (period === 'year' && dateFilter) {
      query = query.where('year', '==', parseInt(dateFilter));
    }

    // Filtrar por segmento
    if (segment) {
      query = query.where('segmento', '==', segment);
    }

    const snapshot = await query.get();
    const ventas = snapshot.docs.map(doc => doc.data());

    // Calcular totales
    const total = ventas.length;
    const bySegment = {};
    
    ventas.forEach(venta => {
      if (!bySegment[venta.segmento]) {
        bySegment[venta.segmento] = 0;
      }
      bySegment[venta.segmento]++;
    });

    return {
      success: true,
      total: total,
      bySegment: bySegment,
      ventas: ventas
    };

  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    throw new functions.https.HttpsError('internal', 'Error: ' + error.message);
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Migrar nombres de Cristian
// ============================================
exports.migrateCristianClientNames = functions.https.onCall(async (data, context) => {
  // Solo admins pueden llamar esta función
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado');
  }

  const isAdmin = await verifyAdminUser(context.auth.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden ejecutar esto');
  }

  try {
    // UID de Cristian
    const cristianUID = 'T8OdsUAbGNfGT4PouAMb6HGePxH2';
    
    const clientsRef = db.collection('clients');
    const snapshot = await clientsRef.where('executiveId', '==', cristianUID).get();
    let updated = 0;

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Si tiene 'nombre' pero no tiene 'name', migrar
      if (data.nombre && !data.name) {
        batch.update(doc.ref, {
          name: data.nombre,
          // No eliminar 'nombre' para compatibilidad
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
      await logAudit(context.auth.uid, 'MIGRATE_NAMES', 'clients', { 
        target: 'Cristian', 
        updated: updated 
      });
    }

    return {
      success: true,
      updated: updated,
      message: `✅ Migración completada: ${updated} clientes de Cristian actualizados`
    };
  } catch (error) {
    console.error('Error migrando clientes de Cristian:', error);
    throw new functions.https.HttpsError('internal', 'Error migrando: ' + error.message);
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Verificar y crear documento de usuario
// ============================================
exports.checkUserPermissions = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }
  
  const uid = context.auth.uid;
  const email = context.auth.token.email;
  
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      // Usuario no existe en Firestore - crear documento
      const userData = {
        email: email,
        role: email === 'rmadrigalj@company.com' || email.includes('rmadrigalj') ? 'admin' : 'ejecutivo_standard',
        permissions: ['read_clients', 'write_clients'],
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        displayName: email.split('@')[0]
      };
      
      // Agregar permisos de admin si es necesario
      if (userData.role === 'admin') {
        userData.permissions.push('admin_panel');
      }
      
      await db.collection('users').doc(uid).set(userData);
      
      await logAudit(uid, 'USER_DOCUMENT_CREATED', 'users', {
        email: email,
        role: userData.role
      });
      
      return {
        created: true,
        userData: userData,
        message: 'Documento de usuario creado correctamente'
      };
    }
    
    const userData = userDoc.data();
    
    // Verificar si el usuario necesita actualizaciones
    let needsUpdate = false;
    const updates = {};
    
    if (!userData.permissions || userData.permissions.length === 0) {
      updates.permissions = ['read_clients', 'write_clients'];
      if (userData.role === 'admin') {
        updates.permissions.push('admin_panel');
      }
      needsUpdate = true;
    }
    
    if (userData.isActive === undefined) {
      updates.isActive = true;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await db.collection('users').doc(uid).update(updates);
      userData.permissions = updates.permissions || userData.permissions;
      userData.isActive = updates.isActive !== undefined ? updates.isActive : userData.isActive;
      
      await logAudit(uid, 'USER_DOCUMENT_UPDATED', 'users', {
        email: email,
        updates: updates
      });
    }
    
    return {
      created: false,
      userData: userData,
      message: 'Usuario verificado correctamente'
    };
    
  } catch (error) {
    console.error('Error verificando usuario:', error);
    throw new functions.https.HttpsError('internal', 'Error verificando usuario: ' + error.message);
  }
});

// ============================================
// ✅ NUEVA FUNCIÓN: Crear documento de usuario automáticamente al registrarse
// ============================================
exports.createUserDocument = functions.auth.user().onCreate(async (user) => {
  try {
    const userData = {
      email: user.email,
      role: (user.email === 'rmadrigalj@company.com' || user.email.includes('rmadrigalj')) ? 'admin' : 'ejecutivo_standard',
      permissions: ['read_clients', 'write_clients'],
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: user.displayName || user.email.split('@')[0]
    };
    
    // Agregar permisos de admin si es necesario
    if (userData.role === 'admin') {
      userData.permissions.push('admin_panel');
    }
    
    await db.collection('users').doc(user.uid).set(userData);
    
    console.log('✅ Documento de usuario creado automáticamente:', user.email, 'Rol:', userData.role);
    
    return null;
  } catch (error) {
    console.error('Error creando documento de usuario:', error);
    return null;
  }
});

console.log('✅ Cloud Functions seguras cargadas correctamente');
