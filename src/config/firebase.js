const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set — Google login will not work');
    // Initialize with empty app so require() doesn't crash
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'placeholder' });
  }
}

module.exports = admin;
