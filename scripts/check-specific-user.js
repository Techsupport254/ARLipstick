const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkSpecificUser() {
	const email = "chelimo831@gmail.com";

	console.log(`🔍 Checking for user: ${email}`);
	console.log("=".repeat(50));

	try {
		// Check in Firebase Auth
		try {
			const authUser = await admin.auth().getUserByEmail(email);
			console.log(`✅ Found in Firebase Auth:`);
			console.log(`   Email: ${authUser.email}`);
			console.log(`   UID: ${authUser.uid}`);
			console.log(`   Display Name: ${authUser.displayName || "N/A"}`);
			console.log(`   Created: ${authUser.metadata.creationTime}`);
			console.log(`   Last Sign In: ${authUser.metadata.lastSignInTime}`);
		} catch (error) {
			console.log(`❌ Not found in Firebase Auth: ${error.message}`);
		}

		// Check in Firestore
		const userQuery = await db
			.collection("users")
			.where("email", "==", email)
			.get();

		if (!userQuery.empty) {
			const userData = userQuery.docs[0].data();
			console.log(`\n✅ Found in Firestore:`);
			console.log(`   Email: ${userData.email}`);
			console.log(`   Document ID: ${userQuery.docs[0].id}`);
			console.log(`   User ID: ${userData.userId}`);
			console.log(`   Display Name: ${userData.displayName || "N/A"}`);
			console.log(`   Role: ${userData.roleId}`);
			console.log(`   Status: ${userData.status}`);
			console.log(`   Created: ${userData.createdAt}`);
			console.log(`   Last Login: ${userData.lastLoginAt}`);
		} else {
			console.log(`\n❌ Not found in Firestore`);
		}

		// Check all users in Firestore
		console.log(`\n📊 All users in Firestore:`);
		const allUsers = await db.collection("users").get();
		allUsers.forEach((doc, index) => {
			const userData = doc.data();
			console.log(
				`   ${index + 1}. ${userData.email} (${userData.displayName}) - Role: ${
					userData.roleId
				}`
			);
		});
	} catch (error) {
		console.error("❌ Error checking user:", error);
	} finally {
		process.exit(0);
	}
}

checkSpecificUser();
