const fs = require('fs');
const admin = require('firebase-admin');
const yargs = require('yargs');

const argv = yargs
  .option('serviceAccount', { type: 'string', default: 'executiveperformancek-firebase-adminsdk-fbsvc-4395ce8060.json' })
  .help()
  .argv;

const saPath = argv.serviceAccount;
if (!fs.existsSync(saPath)) {
  console.error('Service account file not found:', saPath);
  process.exit(1);
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const raw = JSON.parse(fs.readFileSync('remote_raw.json', 'utf8'));
  const ref = db.doc('config/remote_raw');
  await ref.set({ data: raw, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log('Uploaded remote_raw.json to config/remote_raw');
}

main().catch(err => { console.error(err); process.exit(1); });
