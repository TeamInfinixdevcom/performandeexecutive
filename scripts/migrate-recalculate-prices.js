// Script: migrate-recalculate-prices.js
// Recalcula `totalPrice` de ventas usando los precios actuales en public/data/planes.json
// Uso: node migrate-recalculate-prices.js --dry-run [--limit N] [--apply]

const admin = require('firebase-admin');
const path = require('path');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2));
const DRY_RUN = argv['dry-run'] !== undefined || !argv['apply'];
const LIMIT = argv.limit ? parseInt(argv.limit, 10) : 1000;

// Ajusta el nombre del service account si tu archivo difiere
const fs = require('fs');
const svcPath = argv.serviceAccount || argv.s || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON no encontrado:', svcPath);
  process.exit(1);
}
const serviceAccount = require(require('path').resolve(svcPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'executiveperformancek'
});

const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Cargar precios actuales
const planes = require(path.join(__dirname, '..', 'public', 'data', 'planes.json'));

function getPlanDetails(planId) {
  if (!planId) return null;
  const pm = planes.plansMobile || {};
  const ph = planes.plansHome || {};

  for (const grupo of Object.values(pm)) {
    if (grupo.planes) {
      const p = grupo.planes.find(x => x.id === planId);
      if (p) return { precio: p.precio, nombre: p.nombre, tipo: 'mobile' };
    }
  }
  for (const grupo of Object.values(ph)) {
    if (grupo.planes) {
      const p = grupo.planes.find(x => x.id === planId);
      if (p) return { precio: p.precio, nombre: p.nombre, tipo: 'home' };
    }
  }
  // buscar por grupo id (por ejemplo accessory groups)
  if (pm[planId]) {
    const g = pm[planId];
    const p = g.planes && g.planes[0];
    if (p) return { precio: p.precio, nombre: p.nombre || g.grupo, tipo: 'mobile' };
  }
  return null;
}

async function processCollection(collectionName) {
  console.log(`\nProcessing collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).limit(LIMIT).get();
  console.log(`  Found ${snapshot.size} docs (limit ${LIMIT})`);

  let updates = 0;
  let diffs = [];

  for (const doc of snapshot.docs) {
    const v = doc.data();

    // determine tipo (mobile/home)
    const tipo = v.tipo || (collectionName === 'ventas' ? 'mobile' : 'home');

    // plan price: prefer stored planPrice, else lookup
    let planPrice = typeof v.planPrice !== 'undefined' ? Number(v.planPrice) : null;
    if ((planPrice === null || isNaN(planPrice)) && v.plan) {
      const det = getPlanDetails(v.plan);
      planPrice = det?.precio || 0;
    }
    planPrice = Number(planPrice) || 0;

    let computed = planPrice;

    // accesorios
    if (v.tipoPedido === 'accesorio_contado') {
      const det = getPlanDetails('accesorio_contado');
      const unit = Number(v.unitPrice || det?.precio || 0) || 0;
      const count = Array.isArray(v.accesorios) ? v.accesorios.length : (v.accesoriosCount || 0);
      computed += unit * count;
    }

    // imeis
    if (v.tipoPedido === 'imei_contado') {
      const det = getPlanDetails('imei_contado');
      const unit = Number(v.unitPrice || det?.precio || 0) || 0;
      const count = Array.isArray(v.imeis) ? v.imeis.length : (v.imeisCount || 0);
      computed += unit * count;
    }

    // round to integer
    computed = Math.round(computed);

    const stored = Number(v.totalPrice) || 0;

    if (Math.abs(stored - computed) > 0) {
      diffs.push({ id: doc.id, collection: collectionName, stored, computed });
      if (!DRY_RUN) {
        await db.collection(collectionName).doc(doc.id).update({ totalPrice: computed, updatedAt: serverTimestamp() });
        updates++;
      }
    }
  }

  console.log(`  Diffs found: ${diffs.length}`);
  if (!DRY_RUN) console.log(`  Updates applied: ${updates}`);
  // print sample diffs (first 20)
  diffs.slice(0, 20).forEach(d => {
    console.log(`   - ${d.collection}/${d.id}: stored=${d.stored} computed=${d.computed}`);
  });

  return { diffsCount: diffs.length, updates };
}

(async () => {
  try {
    console.log('DRY RUN:', DRY_RUN);
    const c1 = await processCollection('ventas');
    const c2 = await processCollection('ventas_hogar');

    console.log('\nSummary:');
    console.log(`  ventas diffs: ${c1.diffsCount} updates: ${c1.updates}`);
    console.log(`  ventas_hogar diffs: ${c2.diffsCount} updates: ${c2.updates}`);

    if (DRY_RUN) console.log('\nNo writes performed (dry-run). To apply changes run with --apply');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(1);
  }
})();
