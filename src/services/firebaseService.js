const { db } = require('../config/firebase');

/**
 * Servicio para interactuar con Firestore
 */

// Obtener todos los documentos de una colección
const getAllItems = async (collectionName) => {
    try {
        const snapshot = await db.collection(collectionName).get();
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        return items;
    } catch (error) {
        console.error(`Error al obtener documentos de ${collectionName}:`, error);
        throw error;
    }
};

// Obtener un documento por ID
const getItemById = async (collectionName, id) => {
    try {
        const doc = await db.collection(collectionName).doc(id).get();
        if (!doc.exists) {
            return null;
        }
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error(`Error al obtener documento ${id}:`, error);
        throw error;
    }
};

// Crear un nuevo documento
const createItem = async (collectionName, data) => {
    try {
        const timestamp = new Date().toISOString();
        const newData = {
            ...data,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        const docRef = await db.collection(collectionName).add(newData);
        return docRef.id;
    } catch (error) {
        console.error(`Error al crear documento en ${collectionName}:`, error);
        throw error;
    }
};

// Actualizar un documento
const updateItem = async (collectionName, id, data) => {
    try {
        const timestamp = new Date().toISOString();
        const updateData = {
            ...data,
            updatedAt: timestamp
        };
        await db.collection(collectionName).doc(id).update(updateData);
        return true;
    } catch (error) {
        console.error(`Error al actualizar documento ${id}:`, error);
        throw error;
    }
};

// Eliminar un documento
const deleteItem = async (collectionName, id) => {
    try {
        await db.collection(collectionName).doc(id).delete();
        return true;
    } catch (error) {
        console.error(`Error al eliminar documento ${id}:`, error);
        throw error;
    }
};

// Buscar documentos con filtros
const queryItems = async (collectionName, field, operator, value) => {
    try {
        const snapshot = await db.collection(collectionName)
            .where(field, operator, value)
            .get();
        const items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        return items;
    } catch (error) {
        console.error(`Error al buscar documentos en ${collectionName}:`, error);
        throw error;
    }
};

module.exports = {
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    queryItems
};