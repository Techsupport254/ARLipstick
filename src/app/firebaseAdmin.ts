import * as admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
	if (!firebaseApp) {
		try {
			// Check if Firebase app is already initialized
			const existingApps = admin.apps;
			if (existingApps.length > 0) {
				firebaseApp = existingApps[0];
				console.log("Using existing Firebase Admin app");
			} else {
				console.log("Initializing Firebase Admin...");
				
				// Use environment variables instead of JSON file
				const serviceAccount = {
					projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
					clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
					privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
				};

				// Validate required environment variables
				if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
					throw new Error("Missing required Firebase Admin environment variables");
				}

				firebaseApp = admin.initializeApp({
					credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
				});
				console.log("Firebase Admin initialized successfully");
			}
		} catch (error) {
			console.error("Failed to initialize Firebase Admin:", error);
			throw error;
		}
	}
	return firebaseApp;
}

export { admin };
