/**
 * Create a new user using Cristian Najera as permissions model.
 *
 * Usage:
 *  node scripts/create-user-like-cristian.js --name "Maria Gonzalez Hidalgo" --email marigonzalez@ice.go.cr --password "Ventaskolbi" [--uid <UID>]
 *  Optional source override:
 *    --sourceUid <UID>  (default: Cristian UID)
 *    --sourceEmail <email> (used if sourceUid not found)
 */

const admin = require('firebase-admin');
const path = require('path');

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return null;
  return process.argv[index + 1];
}

const name = getArg('--name');
const email = getArg('--email');
const password = getArg('--password');
const uid = getArg('--uid');
const sourceUidArg = getArg('--sourceUid') || 'T8OdsUAbGNfGT4PouAMb6HGePxH2';
const sourceEmailArg = getArg('--sourceEmail') || 'cnajera@ice.go.cr';

if (!name || !email || !password) {
  console.log('Usage: node scripts/create-user-like-cristian.js --name "Full Name" --email user@domain.com --password "TempPass" [--uid <UID>]');
  console.log('Optional: --sourceUid <UID> --sourceEmail <email>');
  process.exit(1);
}

const serviceAccountPath = path.join(
  __dirname,
  '../executiveperformancek-firebase-adminsdk-fbsvc-d7042fc558.json'
);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://executiveperformancek.firebaseio.com'
});

const auth = admin.auth();
const db = admin.firestore();

async function findSourceUser() {
  const doc = await db.collection('users').doc(sourceUidArg).get();
  if (doc.exists) {
    return { uid: doc.id, data: doc.data() };
  }

  const snap = await db.collection('users').where('email', '==', sourceEmailArg).limit(1).get();
  if (!snap.empty) {
    const found = snap.docs[0];
    return { uid: found.id, data: found.data() };
  }

  return null;
}

async function createUserLikeCristian() {
  try {
    const source = await findSourceUser();
    if (!source) {
      throw new Error('Source user not found in Firestore. Check --sourceUid or --sourceEmail.');
    }

    const sourceData = source.data || {};
    const role = sourceData.role || 'ejecutivo_standard';
    const permissions = Array.isArray(sourceData.permissions) && sourceData.permissions.length
      ? sourceData.permissions
      : ['read_clients', 'write_clients'];

    const isActive = sourceData.isActive !== undefined ? sourceData.isActive : true;
    const active = sourceData.active !== undefined ? sourceData.active : true;
    const region = sourceData.region;

    // Ensure email does not already exist
    try {
      const existing = await auth.getUserByEmail(email);
      if (existing) {
        throw new Error(`Auth user already exists for ${email} (uid: ${existing.uid}).`);
      }
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    // Create Auth user
    const userRecord = await auth.createUser({
      uid: uid || undefined,
      email: email,
      password: password,
      displayName: name
    });

    // Create Firestore user doc
    const userData = {
      uid: userRecord.uid,
      name: name,
      displayName: name,
      email: email,
      role: role,
      permissions: permissions,
      isActive: isActive,
      active: active,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'create-user-like-cristian',
      sourceUid: source.uid,
      sourceEmail: sourceData.email || sourceEmailArg
    };

    if (region) {
      userData.region = region;
    }

    await db.collection('users').doc(userRecord.uid).set(userData);

    console.log('User created successfully.');
    console.log(`UID: ${userRecord.uid}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Permissions: ${permissions.join(', ')}`);
  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createUserLikeCristian();
