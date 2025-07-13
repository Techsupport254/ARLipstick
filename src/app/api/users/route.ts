import { NextRequest, NextResponse } from "next/server";
import type { User } from "../../types/models";

// Prevent static generation of this API route
export const dynamic = "force-dynamic";

function isFirebaseConfigured() {
	return !!(
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
		process.env.FIREBASE_CLIENT_EMAIL &&
		process.env.FIREBASE_PRIVATE_KEY
	);
}

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");

	const { getFirebaseAdmin } = await import("../../firebaseAdmin");
	const firebaseApp = getFirebaseAdmin();
	if (!firebaseApp) {
		return NextResponse.json(
			{ message: "Failed to initialize Firebase Admin" },
			{ status: 500 }
		);
	}
	const decoded = await firebaseApp.auth().verifyIdToken(idToken);
	return decoded.uid;
}

export async function GET(req: NextRequest) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const uid = await getUserFromRequest(req);
		if (uid && typeof uid === "object" && "status" in uid) {
			return uid;
		}

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		const userDoc = await firebaseApp
			.firestore()
			.collection("users")
			.doc(uid)
			.get();
		const user = userDoc.data() as User | undefined;
		if (!user) {
			return NextResponse.json({ message: "User not found" }, { status: 404 });
		}
		// If admin, return all users; otherwise, return only the current user's profile
		if (user.role === "admin") {
			const snapshot = await firebaseApp.firestore().collection("users").get();
			const users: User[] = snapshot.docs.map((doc) => doc.data() as User);
			return NextResponse.json(users);
		} else {
			return NextResponse.json(user);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: "Failed to fetch user", error: message },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: NextRequest) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const uid = await getUserFromRequest(req);
		if (uid && typeof uid === "object" && "status" in uid) {
			return uid;
		}
		const body = await req.json();
		const updateData: Partial<User> = {};
		if (body.displayName) updateData.displayName = body.displayName;
		if (body.bio !== undefined) updateData.bio = body.bio;
		if (body.phone !== undefined) updateData.phone = body.phone;

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		const userRef = firebaseApp.firestore().collection("users").doc(uid);
		let awardedPoints = false;
		await firebaseApp.firestore().runTransaction(async (transaction) => {
			const userDoc = await transaction.get(userRef);
			const user = userDoc.data() as User | undefined;
			// Merge new data with existing
			const merged = { ...user, ...updateData };
			const hasCompletedProfile = !!(
				merged.displayName &&
				merged.bio &&
				merged.phone
			);
			const alreadyAwarded = user?.profileCompleted;
			transaction.set(userRef, updateData, { merge: true });
			if (hasCompletedProfile && !alreadyAwarded) {
				const currentPoints = user?.loyaltyPoints || 0;
				transaction.set(
					userRef,
					{ loyaltyPoints: currentPoints + 20, profileCompleted: true },
					{ merge: true }
				);
				awardedPoints = true;
			}
		});
		const userDoc = await userRef.get();
		const user = userDoc.data() as User;
		return NextResponse.json({ ...user, awardedProfilePoints: awardedPoints });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: "Failed to update user", error: message },
			{ status: 500 }
		);
	}
}
