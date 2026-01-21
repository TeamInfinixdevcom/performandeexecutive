const fs = require('fs');
const admin = require('firebase-admin');

const argv = require('yargs')
  .option('serviceAccount', { type: 'string', default: 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json' })
  .help()
  .argv;

const serviceAccountPath = argv.serviceAccount;
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function tsToISO(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  try { return new Date(value).toISOString(); } catch (e) { return String(value); }
}

async function main() {
  const col = db.collection('ventas_hogar');
  const snap = await col.get();
  console.log('Found', snap.size, 'documents in ventas_hogar');
  snap.forEach(doc => {
    const d = doc.data();
    const out = {
      id: doc.id,
      fecha: tsToISO(d.fecha || d.createdAt || null),
      totalPrice: d.totalPrice == null ? null : d.totalPrice,
      planId: d.planId || (d.plan && d.plan.id) || null,
    };
    console.log(JSON.stringify(out));
  });
}

main().then(()=>process.exit(0)).catch(err=>{console.error(err); process.exit(1);});
