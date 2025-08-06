import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder",
	authDomain:
		process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
		"placeholder.firebaseapp.com",
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder",
	storageBucket:
		process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
		"placeholder.appspot.com",
	messagingSenderId:
		process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder",
};

// Only initialize Firebase if we're in the browser and have valid config
let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

if (typeof window !== "undefined") {
	try {
		app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
		db = getFirestore(app);
		auth = getAuth(app);
		storage = getStorage(app);
	} catch (error) {
		console.warn("Firebase initialization failed:", error);
	}
}

export { app, db, auth, storage };
