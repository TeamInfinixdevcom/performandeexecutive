#!/usr/bin/env node
/**
 * report-legacy-ventas.js
 * Lista documentos en `ventas` y `ventas_hogar` que contienen `executiveId`
 * pero no tienen `uid` o cuyo `uid` no coincide con `executiveId`.
 *
 * Uso:
 *  node scripts/report-legacy-ventas.js --serviceAccount=/path/to/sa.json --out=report.json --limit=2000
 * Opciones:
 *  --serviceAccount : (opcional) ruta al JSON de la cuenta de servicio. Si no se provee, el script intentará usar credenciales por defecto.
 *  --out            : (opcional) archivo de salida JSON (por defecto: legacy-ventas-report.json)
 *  --collections    : (opcional) colecciones separadas por coma (por defecto: ventas,ventas_hogar)
 *  --limit          : (opcional) límite total por colección (por defecto: 5000)
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    }
  });
  return args;
}

async function main() {
  const args = parseArgs();
  const serviceAccount = args.serviceAccount || args.s;
  const outFile = args.out || 'legacy-ventas-report.json';
  const collections = (args.collections || 'ventas,ventas_hogar').split(',').map(s => s.trim()).filter(Boolean);
  const limit = parseInt(args.limit || '5000', 10);

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('ERROR: firebase-admin no está instalado. Ejecuta `npm install firebase-admin` en este entorno.');
    process.exit(1);
  }

  if (serviceAccount) {
    const saPath = path.resolve(serviceAccount);
    if (!fs.existsSync(saPath)) {
      console.error('ERROR: serviceAccount file not found:', saPath);
      process.exit(1);
    }
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  } else if (!admin.apps.length) {
    // intentamos inicializar con credenciales por defecto
    admin.initializeApp();
  }

  const db = admin.firestore();

  const report = [];

  for (const coll of collections) {
    console.log(`Scanning collection: ${coll} (limit ${limit})`);

    // Buscamos documentos donde exista executiveId y luego filtramos por uid
    let q = db.collection(coll).where('executiveId', '!=', null).limit(limit);
    try {
      const snap = await q.get();
      console.log(`  Found ${snap.size} docs with executiveId in ${coll}`);
      snap.forEach(doc => {
        const data = doc.data();
        const executiveId = data.executiveId;
        const uid = data.uid || null;
        const agenteId = data.agenteId || null;

        if (!executiveId) return; // safety

        if (!uid || uid !== executiveId) {
          report.push({
            id: doc.id,
            collection: coll,
            executiveId: executiveId,
            uid: uid,
            agenteId: agenteId,
            createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null
          });
        }
      });
    } catch (err) {
      console.error('  Error querying', coll, err.message || err);
    }
  }

  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: report.length, rows: report }, null, 2));
  console.log(`Report written to ${outFile} (${report.length} items)`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
