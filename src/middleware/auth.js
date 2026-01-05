const { auth } = require('../config/firebase');

/**
 * Middleware para verificar tokens de autenticación de Firebase
 * Uso: Añadir como middleware a rutas que requieran autenticación
 * Ejemplo: router.get('/protected', authMiddleware, handlerFunction);
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Obtener el token del header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                error: 'No autorizado',
                message: 'Token de autenticación no proporcionado' 
            });
        }

        const token = authHeader.split('Bearer ')[1];

        // Verificar el token con Firebase Admin
        const decodedToken = await auth.verifyIdToken(token);
        
        // Añadir información del usuario al request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
        };

        next();
    } catch (error) {
        console.error('Error al verificar token:', error);
        return res.status(401).json({ 
            success: false,
            error: 'No autorizado',
            message: 'Token inválido o expirado' 
        });
    }
};

/**
 * Middleware opcional para verificar autenticación sin bloquear
 * Útil para rutas que pueden funcionar con o sin autenticación
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await auth.verifyIdToken(token);
            
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                emailVerified: decodedToken.email_verified,
            };
        }
        
        next();
    } catch (error) {
        // En caso de error, continuar sin autenticación
        next();
    }
};

module.exports = { authMiddleware, optionalAuth };