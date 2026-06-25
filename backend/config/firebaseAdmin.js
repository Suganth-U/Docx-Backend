const admin = require('firebase-admin');


let serviceAccount;

try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (error) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
      console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable.");
    }
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin Initialized Successfully');
} else {
  console.warn('Firebase Admin NOT initialized. Please ensure serviceAccountKey.json is placed in backend/config or FIREBASE_SERVICE_ACCOUNT is set in .env.');
}

module.exports = admin;
