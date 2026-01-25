#!/usr/bin/env node
/*
 scripts/apply-business-rules-cristian.js
 Uso: node scripts/apply-business-rules-cristian.js --uid <UID> [--serviceAccount path/to.json] [--apply true|false]

 Este script inspecciona las ventas (ventas, ventas_hogar) para un UID dado y aplica
 reglas de negocio mínimas:
  - Si `renovacion === true` y `tipoVenta` no es 'renovacion', setear `tipoVenta: 'renovacion'` y añadir 'renovacion' a `categories`.
  - Si no tiene `tipoVenta` y el `planPrice` coincide con precios de prepago, setear `tipoVenta: 'prepago'.`
  - Si `planPrice` está ausente o es 0 y existe `plan`, re-calcular `planPrice` usando `public/data/planes.json`.
  - Calcular `totalPrice` básico para `accesorio_contado` y `imei_contado` cuando aplique.

 Por defecto corre en dry-run (no escribe). Para aplicar cambios use: --apply true
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const uid = argv.uid;
const svcPath = argv.serviceAccount || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const APPLY = argv.apply === 'true' || argv.apply === true;

if (!uid) {
  console.error('Usage: node scripts/apply-business-rules-cristian.js --uid <UID> [--serviceAccount path] [--apply true]');
  process.exit(1);
}
if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON not found:', svcPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

// Load planes.json
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

(async function main() {
  try {
    console.log(`Inspecting ventas for UID: ${uid} (apply=${APPLY})`);

    const cols = ['ventas', 'ventas_hogar'];
    const prepagoPrices = loadPrepagoPrices();

    const updates = [];

    for (const col of cols) {
      const snap = await db.collection(col).where('uid', '==', uid).get();
      console.log(`Collection ${col}: found ${snap.size} docs`);

      for (const doc of snap.docs) {
        const d = doc.data();
        const changes = {};
        let changed = false;

        // Ensure planPrice
        let planPrice = (typeof d.planPrice !== 'undefined' && d.planPrice !== null) ? Number(d.planPrice) : null;
        if ((!planPrice || isNaN(planPrice) || planPrice === 0) && d.plan) {
          const det = getPlanDetails(d.plan);
          if (det && det.precio) {
            changes.planPrice = det.precio;
            planPrice = det.precio;
            changed = true;
          }
        }

        // Renovacion boolean -> tipoVenta + categories (only for 'ventas')
        if (col === 'ventas') {
          const hasRenovBool = d && (d.renovacion === true || d.renovacion === 'true');
          if (hasRenovBool && d.tipoVenta !== 'renovacion') {
            changes.tipoVenta = 'renovacion';
            // ensure categories array contains 'renovacion' via arrayUnion when applying
            changes._addCategory = 'renovacion';
            changed = true;
          }
          // If tipoVenta==='renovacion' but categories missing, add it
          if (d.tipoVenta === 'renovacion') {
            const cats = Array.isArray(d.categories) ? d.categories : [];
            if (!cats.includes('renovacion')) {
              changes._addCategory = 'renovacion';
              changed = true;
            }
          }
        }

        // If no tipoVenta, try to infer prepago from planPrice
        if (!d.tipoVenta && typeof planPrice === 'number' && prepagoPrices.includes(planPrice)) {
          changes.tipoVenta = 'prepago';
          changed = true;
        }

        // Handle accesorio / imei contado totalPrice adjustments
        let computedTotal = null;
        let computed = 0;
        if (typeof planPrice === 'number') computed = Number(planPrice) || 0;

        if (d.tipoPedido === 'accesorio_contado') {
          // try to find accessory unit price from a plan 'accesorio_contado' if exists
          const det = getPlanDetails('accesorio_contado');
          const unit = Number(d.unitPrice || (det && det.precio) || 0) || 0;
          const count = Array.isArray(d.accesorios) ? d.accesorios.length : (d.accesoriosCount || 0);
          computed += unit * count;
          computedTotal = Math.round(computed);
        }

        if (d.tipoPedido === 'imei_contado') {
          const det = getPlanDetails('imei_contado');
          const unit = Number(d.unitPrice || (det && det.precio) || 0) || 0;
          const count = Array.isArray(d.imeis) ? d.imeis.length : (d.imeisCount || 0);
          computed += unit * count;
          computedTotal = Math.round(computed);
        }

        if (computedTotal !== null) {
          const storedTotal = Number(d.totalPrice) || 0;
          if (storedTotal !== computedTotal) {
            changes.totalPrice = computedTotal;
            changed = true;
          }
        }

        if (changed) {
          changes.updatedAt = serverTimestamp();
          updates.push({ col, id: doc.id, ref: doc.ref, changes });
        }
      }
    }

    console.log(`
Planned updates for UID ${uid}: ${updates.length} document(s)`);
    updates.slice(0, 100).forEach(u => {
      console.log(`- ${u.col}/${u.id}:`, JSON.stringify(u.changes));
    });

    if (updates.length === 0) {
      console.log('No changes needed. Exiting.');
      process.exit(0);
    }

    if (!APPLY) {
      console.log('\nDry-run mode: no changes were written. To apply them, re-run with --apply true');
      process.exit(0);
    }

    // Apply updates in batches
    const BATCH_SIZE = 200;
    let idx = 0;
    while (idx < updates.length) {
      const batch = db.batch();
      const slice = updates.slice(idx, idx + BATCH_SIZE);
      slice.forEach(u => {
        const upd = Object.assign({}, u.changes);
        // handle _addCategory special marker
        const addCat = upd._addCategory;
        delete upd._addCategory;
        if (addCat) {
          // use arrayUnion for categories
          batch.update(u.ref, Object.assign({}, upd, { categories: admin.firestore.FieldValue.arrayUnion(addCat), updatedAt: serverTimestamp() }));
        } else {
          batch.update(u.ref, upd);
        }
      });
      await batch.commit();
      console.log(`Applied batch: updated ${slice.length} documents`);
      idx += BATCH_SIZE;
    }

    console.log('All updates applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
