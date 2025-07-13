import * as admin from "firebase-admin";
import serviceAccount from "../secret/firebase-service-account.json";

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
				firebaseApp = admin.initializeApp({
					credential: admin.credential.cert(
						serviceAccount as admin.ServiceAccount
					),
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
