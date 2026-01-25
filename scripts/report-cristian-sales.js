#!/usr/bin/env node
/*
 scripts/report-cristian-sales.js
 Uso: node scripts/report-cristian-sales.js --uid <UID> [--serviceAccount path] [--out path] [--recentDays N]

 Genera un reporte JSON con las ventas del UID y por cada venta indica por qué no entró
 en las reglas (o qué cambios se recomendarían). Ideal para revisión manual.
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const uid = argv.uid;
const svcPath = argv.serviceAccount || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const outPath = argv.out || path.join(__dirname, '..', 'reports', `cristian-sales-report-${new Date().toISOString().slice(0,10)}.json`);
const recentDays = argv.recentDays ? parseInt(argv.recentDays, 10) : 7;

if (!uid) {
  console.error('Usage: node scripts/report-cristian-sales.js --uid <UID> [--serviceAccount path] [--out path] [--recentDays N]');
  process.exit(1);
}
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON not found:', svcPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// load planes
const planesPath = path.join(__dirname, '..', 'public', 'data', 'planes.json');
if (!fs.existsSync(planesPath)) {
  console.error('planes.json not found at', planesPath);
  process.exit(1);
}
const planes = require(planesPath);

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
  if (pm[planId]) {
    const g = pm[planId];
    const p = g.planes && g.planes[0];
    if (p) return { precio: p.precio, nombre: p.nombre || g.grupo, tipo: 'mobile' };
  }
  return null;
}

function loadPrepagoPrices() {
  const prepago = planes && planes.plansMobile && planes.plansMobile.prepago && planes.plansMobile.prepago.planes;
  if (!prepago) return [];
  return prepago.map(p => Number(p.precio));
}

function computeAccessoryImeiTotal(doc) {
  let base = 0;
  const planPrice = Number(doc.planPrice) || 0;
  base = planPrice;
  if (doc.tipoPedido === 'accesorio_contado') {
    const det = getPlanDetails('accesorio_contado');
    const unit = Number(doc.unitPrice || (det && det.precio) || 0) || 0;
    const count = Array.isArray(doc.accesorios) ? doc.accesorios.length : (doc.accesoriosCount || 0);
    base += unit * count;
  }
  if (doc.tipoPedido === 'imei_contado') {
    const det = getPlanDetails('imei_contado');
    const unit = Number(doc.unitPrice || (det && det.precio) || 0) || 0;
    const count = Array.isArray(doc.imeis) ? doc.imeis.length : (doc.imeisCount || 0);
    base += unit * count;
  }
  return Math.round(base);
}

(async () => {
  try {
    const cols = ['ventas', 'ventas_hogar'];
    const prepagoPrices = loadPrepagoPrices();
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - (recentDays * 24 * 60 * 60 * 1000));

    const report = { uid, generatedAt: now.toISOString(), recentDays, totals: {}, sales: [] };

    for (const col of cols) {
      const snap = await db.collection(col).where('uid', '==', uid).get();
      report.totals[col] = snap.size;

      for (const doc of snap.docs) {
        const d = doc.data();
        const created = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
        const isRecent = created ? created >= recentThreshold : false;

        const planPrice = (typeof d.planPrice !== 'undefined' && d.planPrice !== null) ? Number(d.planPrice) : null;
        const hasPlan = !!d.plan;
        const tipoVenta = d.tipoVenta || null;
        const renovBool = d.renovacion === true || d.renovacion === 'true';
        const categories = Array.isArray(d.categories) ? d.categories : [];
        const tipoPedido = d.tipoPedido || null;
        const totalPriceStored = typeof d.totalPrice !== 'undefined' ? Number(d.totalPrice) : null;

        const computedTotal = computeAccessoryImeiTotal(d);
        const totalMismatch = (totalPriceStored !== null) ? (totalPriceStored !== computedTotal) : false;

        const reasons = [];
        // Rule checks
        if (col === 'ventas') {
          if (renovBool && tipoVenta !== 'renovacion') reasons.push('renovacion boolean true but tipoVenta is not "renovacion"');
          if (tipoVenta === 'renovacion' && !categories.includes('renovacion')) reasons.push('tipoVenta=="renovacion" but categories missing "renovacion"');
        }
        if (!tipoVenta) {
          if (planPrice !== null && prepagoPrices.includes(Number(planPrice))) {
            reasons.push('missing tipoVenta but planPrice matches prepago prices -> recommend tipoVenta: prepago');
          } else {
            reasons.push('missing tipoVenta and cannot infer prepago from planPrice');
          }
        }
        if ((planPrice === null || planPrice === 0) && hasPlan) {
          const det = getPlanDetails(d.plan);
          if (det && det.precio) {
            reasons.push(`planPrice missing/zero; can set planPrice=${det.precio} from plan ${d.plan}`);
          } else {
            reasons.push('planPrice missing/zero and plan lookup failed');
          }
        }
        if (tipoPedido === 'accesorio_contado' || tipoPedido === 'imei_contado') {
          if (totalMismatch) reasons.push(`totalPrice mismatch: stored=${totalPriceStored} computed=${computedTotal}`);
          else reasons.push('totalPrice matches computed accessory/imei total');
        }
        if (reasons.length === 0) reasons.push('no rules require changes');

        report.sales.push({
          id: doc.id,
          collection: col,
          createdAt: created ? created.toISOString() : null,
          isRecent,
          plan: d.plan || null,
          planPrice: planPrice,
          tipoVenta: tipoVenta,
          renovacion: d.renovacion || false,
          categories: categories,
          tipoPedido: tipoPedido,
          imeisCount: Array.isArray(d.imeis) ? d.imeis.length : (d.imeisCount || 0),
          accesoriosCount: Array.isArray(d.accesorios) ? d.accesorios.length : (d.accesoriosCount || 0),
          totalPriceStored,
          computedTotal,
          reasons
        });
      }
    }

    // ensure reports dir
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to', outPath);
    process.exit(0);
  } catch (err) {
    console.error('Error generating report:', err);
    process.exit(1);
  }
})();
