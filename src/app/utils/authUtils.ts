import { getFirebaseAdmin } from "../firebaseAdmin";
import type { DocumentReference } from "firebase-admin/firestore";

export interface UserData {
	userId: string;
	email: string;
	displayName: string;
	photoURL: string | null;
	roleId: string;
	phone: string;
	bio: string;
	profileCompleted: boolean;
	status: string;
	createdAt: string;
	lastLoginAt: string;
	updatedAt: string;
}

/**
 * Ensures a user exists in both Firebase Auth and Firestore
 * Creates missing records and updates existing ones
 */
export async function ensureUserSync(
	authUid: string,
	email: string,
	displayName: string,
	photoURL: string | null,
	phoneNumber?: string
): Promise<UserData> {
	const firebaseApp = getFirebaseAdmin();
	if (!firebaseApp) {
		throw new Error("Failed to initialize Firebase Admin");
	}

	// Use a transaction to ensure atomic operations
	const result = await firebaseApp
		.firestore()
		.runTransaction(async (transaction) => {
			// Check if user exists in Firestore by email
			const existingUserQuery = await firebaseApp
				.firestore()
				.collection("users")
				.where("email", "==", email)
				.limit(1)
				.get();

			let userData: UserData;
			let userDocRef: DocumentReference;

			if (!existingUserQuery.empty) {
				// User exists - update with latest info
				const existingUserDoc = existingUserQuery.docs[0];
				const existingUserData = existingUserDoc.data();

				userDocRef = existingUserDoc.ref;
				userData = {
					...existingUserData,
					userId: authUid, // Ensure Firebase Auth UID is linked
					email: email, // Ensure email is current
					displayName: displayName || existingUserData.displayName,
					photoURL: photoURL || existingUserData.photoURL,
					phone: phoneNumber || existingUserData.phone || "",
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				} as UserData;

				transaction.set(userDocRef, userData, { merge: true });
				console.log(
					`Updated existing user: ${email} with role: ${existingUserData.roleId}`
				);

				// Also update the document with the current UID to maintain consistency
				const currentUidDocRef = firebaseApp
					.firestore()
					.collection("users")
					.doc(authUid);
				transaction.set(currentUidDocRef, userData, { merge: true });
				console.log(`Also updated document with current UID: ${authUid}`);
			} else {
				// User doesn't exist - create new user
				userDocRef = firebaseApp.firestore().collection("users").doc(authUid);

				// Create new user document
				userData = {
					userId: authUid,
					email: email,
					displayName: displayName,
					photoURL: photoURL,
					roleId: "customer",
					phone: phoneNumber || "",
					bio: "",
					profileCompleted: true, // Google users are considered profile completed
					status: "active",
					createdAt: new Date().toISOString(),
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				transaction.set(userDocRef, userData);
				console.log(`Created new user: ${email} with UID: ${authUid}`);

				// Create a cart for the new user
				const cartRef = firebaseApp
					.firestore()
					.collection("carts")
					.doc(authUid);

				transaction.set(cartRef, {
					userId: authUid,
					items: [],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});

				console.log(`Created cart for new user: ${authUid}`);
			}

			return { userData, userDocRef };
		});

	return result.userData;
}

/**
 * Verifies that a user exists in both Auth and Firestore
 * Returns true if both exist, false otherwise
 */
export async function verifyUserSync(email: string): Promise<{
	authExists: boolean;
	firestoreExists: boolean;
	userData?: UserData;
}> {
	const firebaseApp = getFirebaseAdmin();
	if (!firebaseApp) {
		throw new Error("Failed to initialize Firebase Admin");
	}

	// Check if user exists in Firebase Auth
	let authExists = false;
	try {
		await firebaseApp.auth().getUserByEmail(email);
		authExists = true;
	} catch (error) {
		authExists = false;
	}

	// Check if user exists in Firestore
	const firestoreQuery = await firebaseApp
		.firestore()
		.collection("users")
		.where("email", "==", email)
		.limit(1)
		.get();

	const firestoreExists = !firestoreQuery.empty;
	const userData = firestoreExists
		? (firestoreQuery.docs[0].data() as UserData)
		: undefined;

	return {
		authExists,
		firestoreExists,
		userData,
	};
}
