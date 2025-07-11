import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import type {
	DocumentReference,
	DocumentSnapshot,
} from "firebase-admin/firestore";

// Helper to ensure private key is loaded and formatted
function getFirebaseAdminConfig() {
	const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
	let privateKey = process.env.FIREBASE_PRIVATE_KEY;

	if (!projectId || !clientEmail || !privateKey) {
		throw new Error(
			"Missing Firebase Admin credentials in environment variables."
		);
	}

	// Fix for Vercel/Next: handle escaped newlines
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

// Use global to prevent re-initialization in dev
if (
	!(globalThis as unknown as { _firebaseAdminInitialized: boolean })
		._firebaseAdminInitialized
) {
	admin.initializeApp(getFirebaseAdminConfig());
	(
		globalThis as unknown as { _firebaseAdminInitialized: boolean }
	)._firebaseAdminInitialized = true;
}

export async function POST(req: NextRequest) {
	try {
		const { idToken } = await req.json();
		if (!idToken) {
			return NextResponse.json({ message: "Missing idToken" }, { status: 400 });
		}
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		const userRecord = await admin.auth().getUser(decodedToken.uid);
		// Fallback: use decodedToken.picture if userRecord.photoURL is missing
		const photoURL = userRecord.photoURL || decodedToken.picture || null;
		const userDocRef: DocumentReference = admin
			.firestore()
			.collection("users")
			.doc(userRecord.uid);
		const userDoc: DocumentSnapshot = await userDocRef.get();
		if (!userDoc.exists) {
			await userDocRef.set(
				{
					uid: userRecord.uid,
					email: userRecord.email,
					displayName: userRecord.displayName,
					photoURL,
					createdAt: new Date().toISOString(),
					role: "user",
					phone: userRecord.phoneNumber || null,
				},
				{ merge: true }
			);
		}
		return NextResponse.json({
			user: {
				uid: userRecord.uid,
				email: userRecord.email,
				displayName: userRecord.displayName,
				photoURL,
			},
		});
	} catch (error: unknown) {
		console.error("/api/auth error:", error);
		const message =
			error instanceof Error && error.message ? error.message : String(error);
		return NextResponse.json(
			{ message: "Login failed", error: message },
			{ status: 500 }
		);
	}
}
