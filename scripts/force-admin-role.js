const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function forceAdminRole() {
	const email = "chelimo831@gmail.com";
	const currentUid = "mKhW0Om79NNbaatyBqZVXu9B0ns2";

	console.log(`🚀 Force updating admin role for: ${email}`);
	console.log(`Current UID: ${currentUid}`);
	console.log("=".repeat(50));

	try {
		// Update the document with the current UID
		const currentUidDocRef = db.collection("users").doc(currentUid);

		const adminUserData = {
			userId: currentUid,
			email: email,
			displayName: "Chelimo",
			photoURL:
				"https://lh3.googleusercontent.com/a/ACg8ocJ6M_EmcWCkghI1-pXDcu9PKhzyab7zIAwvu2VBXRASAV8CVQ=s96-c",
			roleId: "admin", // Force admin role
			phone: "",
			bio: "System Administrator for AR Lipstick",
			profileCompleted: true,
			status: "active",
			createdAt: new Date().toISOString(),
			lastLoginAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await currentUidDocRef.set(adminUserData, { merge: true });
		console.log("✅ Updated current UID document with admin role");

		// Also update any existing document by email
		const emailQuery = await db
			.collection("users")
			.where("email", "==", email)
			.get();

		if (!emailQuery.empty) {
			const emailDoc = emailQuery.docs[0];
			await emailDoc.ref.update({
				roleId: "admin",
				userId: currentUid, // Update to current UID
				bio: "System Administrator for AR Lipstick",
				profileCompleted: true,
				updatedAt: new Date().toISOString(),
			});
			console.log("✅ Updated email-based document with admin role");
		}

		// Verify the update
		console.log("\n🔍 Verifying admin role...");
		const verifyDoc = await currentUidDocRef.get();

		if (verifyDoc.exists) {
			const verifyData = verifyDoc.data();
			console.log(`✅ Verification successful:`);
			console.log(`   Email: ${verifyData.email}`);
			console.log(`   Role: ${verifyData.roleId}`);
			console.log(`   UID: ${verifyData.userId}`);
			console.log(`   Status: ${verifyData.status}`);
		}

		console.log("\n🎉 ADMIN ROLE FORCE UPDATED!");
		console.log("Please refresh your browser to see admin features.");
		console.log("The user should now have admin privileges.");
	} catch (error) {
		console.error("❌ Error force updating admin role:", error);
	} finally {
		process.exit(0);
	}
}

forceAdminRole();
