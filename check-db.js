const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
admin.firestore().collection('landing').doc('lea').get().then(doc => {
  console.log('EXISTS:', doc.exists);
  process.exit(0);
}).catch(console.error);
