import { NextRequest, NextResponse } from "next/server";
import type {
	DocumentReference,
	DocumentSnapshot,
} from "firebase-admin/firestore";

// Prevent static generation of this API route
export const dynamic = "force-dynamic";

function isFirebaseConfigured() {
	return !!(
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
		process.env.FIREBASE_CLIENT_EMAIL &&
		process.env.FIREBASE_PRIVATE_KEY
	);
}

export async function POST(req: NextRequest) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const { idToken } = await req.json();
		if (!idToken) {
			return NextResponse.json({ message: "Missing idToken" }, { status: 400 });
		}

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}
		const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);
		const userRecord = await firebaseApp.auth().getUser(decodedToken.uid);
		// Fallback: use decodedToken.picture if userRecord.photoURL is missing
		const photoURL = userRecord.photoURL || decodedToken.picture || null;
		const userDocRef: DocumentReference = firebaseApp
			.firestore()
			.collection("users")
			.doc(userRecord.uid);
		const userDoc: DocumentSnapshot = await userDocRef.get();
		let userData;
		if (!userDoc.exists) {
			userData = {
				uid: userRecord.uid,
				email: userRecord.email,
				displayName: userRecord.displayName,
				photoURL,
				createdAt: new Date().toISOString(),
				role: "user",
				phone: userRecord.phoneNumber || null,
			};
			await userDocRef.set(userData, { merge: true });
		} else {
			userData = userDoc.data();
		}
		return NextResponse.json({
			user: {
				uid: userRecord.uid,
				email: userRecord.email,
				displayName: userRecord.displayName,
				photoURL,
				role: userData?.role || "user",
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
