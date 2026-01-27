// Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

// Configuración Firebase (cliente – pública)
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

// Servicios
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

// Exports
export { app, auth, db, functions, signOut };

// Acceso global (opcional, como lo usabas antes)
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseFunctions = functions;
