const admin = require('firebase-admin');
const path = require('path');

let serviceAccountPath = path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-fbsvc-4395ce8060.json');
// Fallback to other filenames if present
const fs = require('fs');
if(!fs.existsSync(serviceAccountPath)){
  const alternatives = fs.readdirSync(path.join(__dirname, '..')).filter(f=>/firebase-adminsdk.*\.json$/.test(f));
  if(alternatives.length) serviceAccountPath = path.join(__dirname, '..', alternatives[0]);
}

try{
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id || 'executiveperformancek' });
}catch(e){
  console.error('Could not load service account:', e.message);
  process.exit(1);
}

const db = admin.firestore();

async function createVenta(){
  const venta = {
    tipo: 'mobile',
    numeroPedido: 'KO-88888888',
    plan: 'k6plus',
    planPrice: 38347,
    cedulaCliente: '113240862',
    numeroCliente: '88200202',
    imeis: [],
    accesorios: [],
    tipoVenta: 'nueva',
    categories: ['nueva'],
    uid: null,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };

  try{
    const docRef = await db.collection('ventas').add(venta);
    console.log('Venta creada:', docRef.id);
    const saved = await docRef.get();
    console.log('Documento:', saved.id, saved.data());
  }catch(e){
    console.error('Error creando venta:', e);
    process.exit(1);
  }
}

createVenta();
