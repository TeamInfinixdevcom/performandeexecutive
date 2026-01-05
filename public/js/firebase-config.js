// Configuración de Firebase para el cliente (Frontend)
// IMPORTANTE: Estas credenciales son para el SDK de cliente, SON PÚBLICAS
// Para obtenerlas:
// 1. Ve a Firebase Console > Configuración del proyecto
// 2. En "Tus aplicaciones" > Configuración de SDK
// 3. Copia las credenciales del firebaseConfig

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Configuración de Firebase (obtenida con: firebase apps:sdkconfig web)
const firebaseConfig = {
    apiKey: "AIzaSyB_QB5AOMTRUF1tPF0ypMYwlI2F16Ugy0w",
    authDomain: "executiveperformancek.firebaseapp.com",
    projectId: "executiveperformancek",
    storageBucket: "executiveperformancek.firebasestorage.app",
    messagingSenderId: "1010572776177",
    appId: "1:1010572776177:web:26432cf2220bfe11cccf50",
    measurementId: "G-MG1MKJ73X2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Exportar para usar en otros archivos
export { app, auth, db, functions, signOut };

// Exponer globalmente para acceso desde otros scripts
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseFunctions = functions;
