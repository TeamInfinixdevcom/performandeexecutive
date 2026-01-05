const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../executiveperformancek-firebase-adminsdk-fbsvc-ca7f6a9ab0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportUsers() {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data() || {};
      users.push({ id: doc.id, ...data });
    });

    const outDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'users.json');
    fs.writeFileSync(outPath, JSON.stringify(users, null, 2), 'utf8');
    console.log('Exported', users.length, 'users to', outPath);
  } catch (err) {
    console.error('Error exporting users:', err);
    process.exit(1);
  }
}

exportUsers();
