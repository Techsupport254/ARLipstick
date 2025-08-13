const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function promoteByUid(uid) {
	if (!uid) {
		console.error("Please provide a UID");
		console.log("Usage: node scripts/promote-by-uid.js <uid>");
		process.exit(1);
	}

	console.log(`Promoting user with UID: ${uid} to admin...`);

	try {
		// Find user by UID in Firestore
		const userDoc = await db.collection("users").doc(uid).get();

		if (!userDoc.exists) {
			console.error(`No user found with UID: ${uid}`);

			// Check if user exists in Auth
			try {
				const authUser = await admin.auth().getUser(uid);
				console.log(`User exists in Auth: ${authUser.email}`);
				console.log("Creating user document in Firestore...");

				// Create user document
				const userData = {
					userId: uid,
					email: authUser.email,
					displayName: authUser.displayName,
					photoURL: authUser.photoURL,
					roleId: "admin",
					phone: authUser.phoneNumber || "",
					bio: "System Administrator",
					profileCompleted: true,
					status: "active",
					createdAt: new Date().toISOString(),
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				await db.collection("users").doc(uid).set(userData);
				console.log(
					`✅ Successfully created and promoted ${authUser.email} to admin!`
				);
			} catch (authError) {
				console.error(`User not found in Auth either: ${authError.message}`);
			}
			process.exit(1);
		}

		const userData = userDoc.data();

		console.log(`Found user: ${userData.displayName} (${userData.email})`);
		console.log(`Current role: ${userData.roleId}`);

		if (userData.roleId === "admin") {
			console.log("User is already an admin!");
			process.exit(0);
		}

		// Update user to admin
		await userDoc.ref.update({
			roleId: "admin",
			bio: userData.bio || "System Administrator",
			updatedAt: new Date().toISOString(),
		});

		console.log(`✅ Successfully promoted ${userData.displayName} to admin!`);
	} catch (error) {
		console.error("Error promoting user:", error);
	} finally {
		process.exit(0);
	}
}

// Get UID from command line arguments
const uid = process.argv[2];
promoteByUid(uid);
