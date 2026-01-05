const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const firebaseService = require('../services/firebaseService');

// Ruta de prueba
router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'API funcionando correctamente' });
});

// CRUD para una colección genérica (items)

// Obtener todos los documentos de una colección
router.get('/items', async (req, res) => {
    try {
        const items = await firebaseService.getAllItems('items');
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error al obtener items:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener los datos',
            message: error.message 
        });
    }
});

// Obtener un documento por ID
router.get('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await firebaseService.getItemById('items', id);
        
        if (!item) {
            return res.status(404).json({ 
                success: false, 
                error: 'Documento no encontrado' 
            });
        }
        
        res.json({ success: true, data: item });
    } catch (error) {
        console.error('Error al obtener item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al obtener el documento',
            message: error.message 
        });
    }
});

// Crear un nuevo documento
router.post('/items', async (req, res) => {
    try {
        const newItem = req.body;
        const docId = await firebaseService.createItem('items', newItem);
        res.status(201).json({ 
            success: true, 
            message: 'Documento creado exitosamente',
            id: docId,
            data: { id: docId, ...newItem }
        });
    } catch (error) {
        console.error('Error al crear item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al crear el documento',
            message: error.message 
        });
    }
});

// Actualizar un documento
router.put('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        await firebaseService.updateItem('items', id, updates);
        res.json({ 
            success: true, 
            message: 'Documento actualizado exitosamente',
            data: { id, ...updates }
        });
    } catch (error) {
        console.error('Error al actualizar item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al actualizar el documento',
            message: error.message 
        });
    }
});

// Eliminar un documento
router.delete('/items/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await firebaseService.deleteItem('items', id);
        res.json({ 
            success: true, 
            message: 'Documento eliminado exitosamente' 
        });
    } catch (error) {
        console.error('Error al eliminar item:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al eliminar el documento',
            message: error.message 
        });
    }
});

module.exports = router;