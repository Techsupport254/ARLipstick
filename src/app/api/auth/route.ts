import { NextRequest, NextResponse } from "next/server";
import { ensureUserSync } from "../../utils/authUtils";

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

		// Verify the ID token and get user record
		const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);
		const userRecord = await firebaseApp.auth().getUser(decodedToken.uid);

		// Fallback: use decodedToken.picture if userRecord.photoURL is missing
		const photoURL = userRecord.photoURL || decodedToken.picture || null;

		console.log(
			`Processing authentication for user: ${userRecord.email} (${userRecord.uid})`
		);

		// Ensure user is synchronized between Auth and Firestore
		console.log(`Ensuring user sync for: ${userRecord.email}`);
		const userData = await ensureUserSync(
			userRecord.uid,
			userRecord.email!,
			userRecord.displayName || "",
			photoURL,
			userRecord.phoneNumber
		);
		console.log(`User sync completed for: ${userRecord.email}`);

		// Return the user data
		return NextResponse.json({
			user: {
				userId: userRecord.uid,
				email: userRecord.email,
				displayName: userRecord.displayName,
				photoURL,
				roleId: userData.roleId,
				phone: userData.phone,
				bio: userData.bio,
				profileCompleted: userData.profileCompleted,
				status: userData.status,
				createdAt: userData.createdAt,
				lastLoginAt: userData.lastLoginAt,
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
