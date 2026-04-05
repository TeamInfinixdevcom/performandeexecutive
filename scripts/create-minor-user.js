// Script para crear usuario Minor Sánchez Cervantes
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB_QB5AOMTRUF1tPF0ypMYwlI2F16Ugy0w",
    authDomain: "executiveperformancek.firebaseapp.com",
    projectId: "executiveperformancek",
    storageBucket: "executiveperformancek.firebasestorage.app",
    messagingSenderId: "1010572776177",
    appId: "1:1010572776177:web:26432cf2220bfe11cccf50"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUser() {
    const userData = {
        name: 'Minor Sánchez Cervantes',
        email: 'msanchezce@ice.go.cr',
        password: 'Kolbi300',
        cedula: '112570764',
        role: 'executive'
    };

    try {
        console.log('Creando usuario:', userData.name);
        
        // Crear en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const user = userCredential.user;
        
        console.log('✅ Usuario creado en Auth, UID:', user.uid);
        
        // Actualizar perfil
        await updateProfile(user, { displayName: userData.name });
        
        // Crear documento en Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: userData.name,
            email: userData.email,
            cedula: userData.cedula,
            role: userData.role,
            active: true,
            createdAt: new Date().toISOString()
        });
        
        console.log('✅ Perfil creado en Firestore');
        console.log('\n========================================');
        console.log('CUENTA CREADA EXITOSAMENTE');
        console.log('========================================');
        console.log('Nombre:', userData.name);
        console.log('Correo:', userData.email);
        console.log('Contraseña:', userData.password);
        console.log('Rol:', userData.role);
        console.log('========================================\n');
        
        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('⚠️ El correo ya está registrado en el sistema');
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }
}

createUser();
