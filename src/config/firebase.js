const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

// Initialize Firebase Admin SDK only once
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null;

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set — Google login will not work');
    // Initialize with empty app so require() doesn't crash
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'placeholder' });
  }
}

module.exports = {
  auth: getAuth,
  messaging: getMessaging,
};
