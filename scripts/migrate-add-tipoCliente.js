#!/usr/bin/env node
/*
 scripts/migrate-add-tipoCliente.js
 Uso:
  - Inicializar campo `tipoCliente` en todos los documentos que no lo tengan (dry-run por defecto):
      node scripts/migrate-add-tipoCliente.js --action init --dryrun true

  - Marcar clientes como `juridico` por lista de cédulas (comando seguro, usa --dryrun true primero):
      node scripts/migrate-add-tipoCliente.js --action set-juridico --cedulas 3101528561,115830447 --dryrun true

 Opciones:
  --action [init|set-juridico]
  --cedulas comma,separated,cedulas  (para set-juridico)
  --dryrun true|false  (por defecto true)
  --serviceAccount path/to/serviceAccount.json

 El script añadirá `tipoCliente: 'fisico'` por defecto en la acción `init` para documentos que no lo tengan.
*/
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const action = argv['action'] || 'init';
const dryrun = (argv['dryrun'] === undefined) ? true : (String(argv['dryrun']) !== 'false' ? true : false);
const svcPath = argv['serviceAccount'] || 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json';

if (!fs.existsSync(svcPath)) {
  console.error('Service account JSON no encontrado en', svcPath);
  process.exit(1);
}

const serviceAccount = require(path.resolve(svcPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function initTipoCliente() {
  const col = 'clients';
  const q = db.collection(col).limit(1000);
  const snap = await q.get();
  console.log(`Found ${snap.size} clients`);
  const toUpdate = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (!d.hasOwnProperty('tipoCliente')) {
      toUpdate.push({ id: doc.id, ref: doc.ref });
    }
  });
  console.log(`Documents missing tipoCliente: ${toUpdate.length}`);
  if (dryrun) {
    toUpdate.forEach(d => console.log('- ' + d.id));
    return;
  }
  // apply in batches
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = toUpdate.slice(i, i + BATCH_SIZE);
    slice.forEach(item => batch.update(item.ref, { tipoCliente: 'fisico', updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
    console.log(`Applied batch: updated ${slice.length} documents`);
  }
  console.log('initTipoCliente completed');
}

async function setJuridicoByCedulas(cedulas) {
  if (!cedulas || cedulas.length === 0) {
    console.error('No cedulas provided');
    process.exit(1);
  }
  const col = 'clients';
  const toUpdate = [];
  for (const ced of cedulas) {
    const safeCed = ced.trim();
    const q = db.collection(col).where('cedula', '==', safeCed).limit(10);
    const snap = await q.get();
    snap.forEach(doc => {
      const d = doc.data();
      if (d.tipoCliente !== 'juridico') toUpdate.push({ id: doc.id, ref: doc.ref });
    });
  }
  console.log(`Will update ${toUpdate.length} documents to tipoCliente='juridico'`);
  if (dryrun) {
    toUpdate.forEach(d => console.log('- ' + d.id));
    return;
  }
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = toUpdate.slice(i, i + BATCH_SIZE);
    slice.forEach(item => batch.update(item.ref, { tipoCliente: 'juridico', fechaNacimiento: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
    console.log(`Applied batch: updated ${slice.length} documents`);
  }
  console.log('setJuridicoByCedulas completed');
}

async function run() {
  try {
    if (action === 'init') {
      await initTipoCliente();
    } else if (action === 'set-juridico') {
      const cedulasArg = argv['cedulas'] || '';
      const cedulas = cedulasArg.split(',').map(s => s.trim()).filter(s => s);
      await setJuridicoByCedulas(cedulas);
    } else {
      console.error('Unknown action:', action);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
