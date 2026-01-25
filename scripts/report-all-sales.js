#!/usr/bin/env node
/*
 scripts/report-all-sales.js
 Uso: node scripts/report-all-sales.js [--serviceAccount path] [--out path]

 Escanea ambas colecciones `ventas` y `ventas_hogar` y genera un reporte JSON
 con documentos que presentan inconsistencias:
  - planPrice missing or zero when plan present
  - missing tipoVenta
  - renovacion boolean inconsistencies
  - totalPrice mismatches for accesorio/imei contado
  - createdAt missing or non-Timestamp
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const svcPath = argv.serviceAccount || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const outPath = argv.out || path.join(__dirname, '..', 'reports', `all-sales-report-${new Date().toISOString().slice(0,10)}.json`);

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
    const report = { generatedAt: new Date().toISOString(), totals: {}, problems: [] };

    for (const col of cols) {
      const snap = await db.collection(col).get();
      report.totals[col] = snap.size;
      console.log(`Scanning ${col}: found ${snap.size} docs`);

      snap.forEach(doc => {
        const d = doc.data();
        const problems = [];

        // createdAt check
        if (!d.createdAt) problems.push('missing createdAt');
        else if (d.createdAt && typeof d.createdAt.toDate !== 'function') problems.push('createdAt not a Timestamp');

        // planPrice
        const planPrice = (typeof d.planPrice !== 'undefined' && d.planPrice !== null) ? Number(d.planPrice) : null;
        if ((planPrice === null || planPrice === 0) && d.plan) {
          const det = getPlanDetails(d.plan);
          if (det && det.precio) problems.push(`planPrice missing/zero; plan suggests ${det.precio}`);
          else problems.push('planPrice missing/zero and plan lookup failed');
        }

        // tipoVenta
        if (!d.tipoVenta) problems.push('missing tipoVenta');

        // renovacion boolean inconsistencies (only ventas)
        if (col === 'ventas') {
          const hasRenovBool = d.renovacion === true || d.renovacion === 'true';
          if (hasRenovBool && d.tipoVenta !== 'renovacion') problems.push('renovacion boolean true but tipoVenta not renovacion');
          if (d.tipoVenta === 'renovacion') {
            const cats = Array.isArray(d.categories) ? d.categories : [];
            if (!cats.includes('renovacion')) problems.push('tipoVenta renovacion but categories missing renovacion');
          }
        }

        // accessory / imei totalPrice mismatch
        if (d.tipoPedido === 'accesorio_contado' || d.tipoPedido === 'imei_contado') {
          const computed = computeAccessoryImeiTotal(d);
          const stored = typeof d.totalPrice !== 'undefined' ? Number(d.totalPrice) : null;
          if (stored === null) problems.push(`totalPrice missing; computed ${computed}`);
          else if (stored !== computed) problems.push(`totalPrice mismatch: stored=${stored} computed=${computed}`);
        }

        if (problems.length) {
          report.problems.push({ id: doc.id, collection: col, reasons: problems });
        }
      });
    }

    // ensure dir
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to', outPath);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
