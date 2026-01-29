/**
 * scripts/assign-sales-to-uid.js
 *
 * Uso:
 *  node assign-sales-to-uid.js --email cnajera@ice.go.cr --serviceAccount path/to/serviceAccount.json [--dry-run] [--collections ventas,ventas_hogar] [--batchSize 200]
 *
 * Busca ventas antiguas que tengan `agenteId` igual al email o distinto al UID objetivo
 * y reasigna `uid` y `agenteId` al UID del usuario objetivo.
 *
 * Precaución: ejecutar con --dry-run primero.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const email = argv.email || argv.e;
const svcPath = argv.serviceAccount || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';
const collectionsArg = argv.collections || 'ventas,ventas_hogar';
const collections = collectionsArg.split(',').map(s => s.trim()).filter(Boolean);
const dryRun = !!argv['dry-run'] || !!argv['dryrun'];
const batchSize = parseInt(argv.batchSize || 200, 10);

if (!email) {
  console.error('Debe indicar --email <user email>');
  process.exit(1);
}

if (!fs.existsSync(svcPath)) {
  console.error(`Service account not found at ${svcPath}`);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

async function findUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return { uid: userRecord.uid, email: userRecord.email, displayName: userRecord.displayName };
  } catch (err) {
    // Try to find in `users` collection as fallback
    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      return { uid: doc.id, email: data.email || email, displayName: data.name || data.displayName };
    }
    throw err;
  }
}

function toDateObj(raw) {
  if (!raw) return null;
  if (raw.toDate && typeof raw.toDate === 'function') return raw.toDate();
  try { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; } catch (e) { return null; }
}

async function run() {
  console.log(`Starting assign-sales-to-uid for ${email} (dryRun=${dryRun})`);
  const user = await findUserByEmail(email);
  console.log('Target user:', user);

  let totalCandidates = 0;
  const candidates = [];

  for (const col of collections) {
    console.log(`\nScanning collection: ${col}`);

    // We'll search for documents where agenteId == email OR agenteId == uid OR uid == uid
    // But we want documents that are not already assigned to the target uid.
    const snaps = [];

    // Query 1: agenteId == email
    try {
      const q1 = db.collection(col).where('agenteId', '==', email).limit(1000);
      const s1 = await q1.get();
      snaps.push(...s1.docs);
    } catch (e) {
      console.warn('Query agenteId==email failed for', col, e.message || e);
    }

    // Query 2: agenteId == target uid (might be already assigned)
    try {
      const q2 = db.collection(col).where('agenteId', '==', user.uid).limit(1000);
      const s2 = await q2.get();
      snaps.push(...s2.docs);
    } catch (e) {
      console.warn('Query agenteId==uid failed for', col, e.message || e);
    }

    // Query 3: uid == target uid
    try {
      const q3 = db.collection(col).where('uid', '==', user.uid).limit(1000);
      const s3 = await q3.get();
      snaps.push(...s3.docs);
    } catch (e) {
      console.warn('Query uid==uid failed for', col, e.message || e);
    }

    // Deduplicate
    const seen = new Set();
    for (const docSnap of snaps) {
      if (seen.has(docSnap.id)) continue;
      seen.add(docSnap.id);
      const data = docSnap.data();

      const currentUid = data.uid || null;
      const currentAgente = data.agenteId || null;

      // candidate if currentUid != target uid OR agenteId equals the email
      if (currentUid !== user.uid || currentAgente === email) {
        candidates.push({ id: docSnap.id, collection: col, currentUid, currentAgente });
      }
    }
  }

  totalCandidates = candidates.length;
  console.log(`\nFound ${totalCandidates} candidate documents.`);
  candidates.slice(0, 200).forEach(c => console.log(`[${c.collection}] ${c.id} uid=${c.currentUid} agenteId=${c.currentAgente}`));
  if (candidates.length > 200) console.log(`... and ${candidates.length - 200} more`);

  if (dryRun) {
    console.log('\nDry-run finished. No changes applied.');
    return;
  }

  // Apply updates in batches
  console.log('\nApplying updates...');
  let batch = db.batch();
  let applied = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const ref = db.collection(c.collection).doc(c.id);
    batch.update(ref, { uid: user.uid, agenteId: user.uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    applied++;
    if (applied % batchSize === 0) {
      console.log(`Committing batch of ${batchSize}...`);
      await batch.commit();
      batch = db.batch();
    }
  }
  // commit remaining
  await batch.commit();
  console.log(`Applied updates to ${applied} documents.`);
}

run().then(() => process.exit(0)).catch(err => { console.error('Failed:', err); process.exit(1); });
