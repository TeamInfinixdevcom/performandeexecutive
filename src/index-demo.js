const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Ruta de prueba de salud (sin Firebase)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API funcionando correctamente',
        firebase: 'No configurado - Configura las credenciales en .env'
    });
});

// Rutas mock para probar sin Firebase
app.get('/api/items', (req, res) => {
    res.json({ 
        success: true, 
        data: [
            {
                id: '1',
                name: 'Item de Ejemplo 1',
                description: 'Este es un item de demostración. Configura Firebase para usar datos reales.',
                status: 'activo',
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Item de Ejemplo 2',
                description: 'Otro item de demostración',
                status: 'pendiente',
                createdAt: new Date().toISOString()
            }
        ],
        message: 'Datos de demostración - Configura Firebase para datos reales'
    });
});

app.post('/api/items', (req, res) => {
    res.json({
        success: false,
        error: 'Firebase no configurado',
        message: 'Por favor configura las credenciales de Firebase en el archivo .env'
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Archivos estáticos desde: ${path.join(__dirname, '../public')}`);
    console.log(`⚠️  Firebase NO configurado - Usando datos de demostración`);
    console.log(`📝 Para conectar Firebase:`);
    console.log(`   1. Ve a https://console.firebase.google.com/`);
    console.log(`   2. Descarga las credenciales de servicio`);
    console.log(`   3. Actualiza el archivo .env`);
});
