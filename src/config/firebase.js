const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar service account desde el archivo JSON
const serviceAccountPath = path.join(__dirname, '../../executiveperformancek-firebase-adminsdk-fbsvc-6d4e7aa3bd.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Obtener instancias de Firestore y Auth
const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };