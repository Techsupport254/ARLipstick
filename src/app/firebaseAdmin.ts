import * as admin from "firebase-admin";

function getFirebaseAdminConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin credentials in environment variables.");
  }

  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  return {
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  };
}

if (!(globalThis as any)._firebaseAdminInitialized) {
  admin.initializeApp(getFirebaseAdminConfig());
  (globalThis as any)._firebaseAdminInitialized = true;
}

export { admin }; 