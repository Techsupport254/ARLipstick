const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixAdminRole() {
	const email = "chelimo831@gmail.com";
	const currentUid = "mKhW0Om79NNbaatyBqZVXu9B0ns2"; // The UID from Google sign-in

	console.log(`🔧 Fixing admin role for user: ${email}`);
	console.log(`Current UID: ${currentUid}`);
	console.log("=".repeat(50));

	try {
		// Find the user document by email
		const userQuery = await db
			.collection("users")
			.where("email", "==", email)
			.get();

		if (userQuery.empty) {
			console.log("❌ User not found in Firestore");
			return;
		}

		const userDoc = userQuery.docs[0];
		const userData = userDoc.data();

		console.log(`Found user: ${userData.email}`);
		console.log(`Current role: ${userData.roleId}`);
		console.log(`Document UID: ${userData.userId}`);
		console.log(`Current Auth UID: ${currentUid}`);

		if (userData.roleId === "admin") {
			console.log("✅ User is already an admin!");
		} else {
			// Update the user to admin role
			await userDoc.ref.update({
				roleId: "admin",
				bio: "System Administrator for AR Lipstick",
				profileCompleted: true,
				updatedAt: new Date().toISOString(),
			});

			console.log("✅ User role updated to admin!");
		}

		// Also check if there's a document with the current UID
		const currentUidDoc = await db.collection("users").doc(currentUid).get();

		if (currentUidDoc.exists) {
			const currentData = currentUidDoc.data();
			console.log(`\nFound document with current UID: ${currentUid}`);
			console.log(`Role: ${currentData.roleId}`);

			if (currentData.roleId !== "admin") {
				await currentUidDoc.ref.update({
					roleId: "admin",
					bio: "System Administrator for AR Lipstick",
					profileCompleted: true,
					updatedAt: new Date().toISOString(),
				});
				console.log("✅ Updated current UID document to admin!");
			}
		} else {
			console.log(`\nNo document found with current UID: ${currentUid}`);
		}

		// Verify the fix
		console.log("\n🔍 Verifying admin role...");
		const verifyQuery = await db
			.collection("users")
			.where("email", "==", email)
			.get();

		if (!verifyQuery.empty) {
			const verifyData = verifyQuery.docs[0].data();
			console.log(
				`✅ Verification: ${verifyData.email} - Role: ${verifyData.roleId}`
			);
		}

		console.log("\n🎉 Admin role fix completed!");
		console.log("Please refresh your browser to see the admin features.");
	} catch (error) {
		console.error("❌ Error fixing admin role:", error);
	} finally {
		process.exit(0);
	}
}

fixAdminRole();
