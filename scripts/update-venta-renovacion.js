const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let serviceAccountPath = path.join(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-fbsvc-4395ce8060.json');
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

async function updateVenta(ventaId){
  try{
    const docRef = db.collection('ventas').doc(ventaId);
    const snap = await docRef.get();
    if(!snap.exists){
      console.error('Venta no encontrada:', ventaId);
      process.exit(1);
    }
    console.log('--- BEFORE ---');
    console.log(snap.id, snap.data());

    const update = {
      tipoVenta: 'renovacion',
      categories: ['renovacion'],
      accesorios: admin.firestore.FieldValue.arrayUnion('Funda'),
      updatedAt: admin.firestore.Timestamp.now()
    };

    await docRef.update(update);
    const after = await docRef.get();
    console.log('\n--- AFTER ---');
    console.log(after.id, after.data());
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
}

const ventaId = process.argv[2] || 'f7E6biY97k7DYnb3wB3x';
updateVenta(ventaId).then(()=>process.exit(0));
