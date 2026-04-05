// Check sales for a given month/year using Firestore Admin SDK
const admin = require('firebase-admin');
const path = require('path');

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const year = parseInt(getArg('year', new Date().getFullYear()), 10);
const month = parseInt(getArg('month', 1), 10); // 1-12

const svcPath = path.resolve(__dirname, '..', 'executiveperformancek-firebase-adminsdk-fbsvc-d7042fc558.json');
const serviceAccount = require(svcPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

async function scanCollection(collectionName) {
  const { start, end } = monthRange(year, month);
  const startTs = admin.firestore.Timestamp.fromDate(start);
  const endTs = admin.firestore.Timestamp.fromDate(end);

  console.log(`\nCollection: ${collectionName}`);
  console.log(`Range: ${start.toISOString()} -> ${end.toISOString()}`);

  // Query by createdAt Timestamp
  const snap = await db
    .collection(collectionName)
    .where('createdAt', '>=', startTs)
    .where('createdAt', '<', endTs)
    .get();

  let total = 0;
  let totalPlanPrice = 0;
  let missingPlanPrice = 0;

  snap.forEach(doc => {
    const d = doc.data();
    total++;
    const price = Number(d.planPrice || 0);
    totalPlanPrice += price;
    if (!d.planPrice) missingPlanPrice++;
  });

  console.log(`Docs in month (createdAt): ${total}`);
  console.log(`Total planPrice: ₡${Math.round(totalPlanPrice).toLocaleString('es-CR')}`);
  console.log(`Docs missing planPrice: ${missingPlanPrice}`);

  // Diagnostics: check latest 200 docs for missing/invalid createdAt
  const recentSnap = await db
    .collection(collectionName)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  let missingCreatedAt = 0;
  let createdAtNotTimestamp = 0;

  recentSnap.forEach(doc => {
    const d = doc.data();
    if (!d.createdAt) missingCreatedAt++;
    else if (typeof d.createdAt !== 'object' || !d.createdAt.toDate) createdAtNotTimestamp++;
  });

  console.log(`Recent(200) missing createdAt: ${missingCreatedAt}`);
  console.log(`Recent(200) createdAt not Timestamp: ${createdAtNotTimestamp}`);
}

(async () => {
  try {
    console.log(`Checking sales for ${year}-${String(month).padStart(2, '0')}...`);
    await scanCollection('ventas');
    await scanCollection('ventas_hogar');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
