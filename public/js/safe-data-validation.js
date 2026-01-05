/**
 * VALIDACIÓN SEGURA DE DATOS DE CLIENTES
 * 
 * Esta función previene que aparezcan "undefined" en la interfaz
 * sin modificar los datos originales en Firestore.
 * 
 * SEGURO PARA PRODUCCIÓN - No afecta a usuarios activos
 */

// Función para validar y normalizar datos de cliente para mostrar
function safeClientDisplay(client) {
    if (!client) {
        console.warn('Cliente undefined o null recibido');
        return {
            id: 'unknown',
            name: 'CLIENTE SIN DATOS',
            cedula: 'SIN CÉDULA',
            telefono: 'SIN TELÉFONO',
            email: 'SIN EMAIL',
            score: 0,
            categoria: 'B',
            segmento: 'BRONCE',
            estado: 'ACTIVO'
        };
    }

    // Normalizar campos críticos sin modificar el objeto original
    // Validación extra para el nombre
    let nombreSeguro = client.name || client.nombre || '';
    if (!nombreSeguro || nombreSeguro === 'undefined') {
        nombreSeguro = 'CLIENTE SIN NOMBRE';
    }
    const safeClient = {
        id: client.id || 'unknown',
        name: nombreSeguro,
        // Cédula
        cedula: client.cedula || 'SIN CÉDULA',
        
        // Teléfono - múltiples fuentes posibles
        telefono: client.telefono || 
                  client.telefonoContacto || 
                  client.moviles || 
                  client.serviciosMoviles?.[0] || 
                  client.celulares || 
                  'SIN TELÉFONO',
        
        // Email
        email: client.email || 'SIN EMAIL',
        
        // Score/Puntaje
        score: client.score || client.puntajeScore || 0,
        
        // Categoría crediticia
        categoria: client.categoria || client.categoriaCrediticia || 'B',
        
        // Segmento
        segmento: client.segmento || 'BRONCE',
        
        // Estado
        estado: client.estado || client.estadoPlan || 'ACTIVO',
        
        // Plan
        tipoPlan: client.tipoPlan || 'SIN PLAN',
        
        // Fechas
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        
        // Mantener datos originales para funciones que los necesiten
        _original: client
    };

    // Log para debugging solo en desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
        if (!client.name && !client.nombre) {
            console.warn('Cliente sin nombre detectado:', client.id, client);
        }
    }

    return safeClient;
}

// Función para validar arrays de clientes
function safeClientsArray(clients) {
    if (!Array.isArray(clients)) {
        console.warn('Array de clientes inválido:', clients);
        return [];
    }

    return clients.map(client => safeClientDisplay(client)).filter(client => client.id !== 'unknown');
}

// Función para formatear arrays de teléfonos/servicios de forma segura
function safeFormatArray(arr, fallback = 'N/A') {
    if (!arr) return fallback;
    if (typeof arr === 'string') return arr;
    if (Array.isArray(arr) && arr.length > 0) {
        return arr.filter(item => item && item.trim()).join(', ');
    }
    return fallback;
}

// Función para formatear fechas de forma segura
function safeFormatDate(timestamp, fallback = 'Sin fecha') {
    if (!timestamp) return fallback;
    
    try {
        let date;
        
        // Firestore Timestamp
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        }
        // JavaScript Date
        else if (timestamp instanceof Date) {
            date = timestamp;
        }
        // String o número
        else {
            date = new Date(timestamp);
        }
        
        // Verificar si la fecha es válida
        if (isNaN(date.getTime())) {
            return fallback;
        }
        
        return date.toLocaleDateString('es-CR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (error) {
        console.warn('Error formateando fecha:', timestamp, error);
        return fallback;
    }
}

// Exportar funciones globalmente para uso en toda la aplicación
if (typeof window !== 'undefined') {
    window.safeClientDisplay = safeClientDisplay;
    window.safeClientsArray = safeClientsArray;
    window.safeFormatArray = safeFormatArray;
    window.safeFormatDate = safeFormatDate;
    
    console.log('✅ Validaciones seguras de datos cargadas');
}

// Para uso en módulos ES6 si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        safeClientDisplay,
        safeClientsArray,
        safeFormatArray,
        safeFormatDate
    };
}