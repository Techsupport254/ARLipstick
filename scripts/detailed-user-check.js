const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function detailedUserCheck() {
	console.log("🔍 Detailed User Check - Firebase Auth and Firestore");
	console.log("=".repeat(60));

	try {
		// Get all users from Firebase Auth
		const authUsers = await auth.listUsers();
		console.log(`📊 Firebase Auth users (${authUsers.users.length}):`);
		authUsers.users.forEach((user, index) => {
			console.log(`   ${index + 1}. ${user.email} (UID: ${user.uid})`);
			console.log(`      Display Name: ${user.displayName || "N/A"}`);
			console.log(`      Created: ${user.metadata.creationTime}`);
			console.log(`      Last Sign In: ${user.metadata.lastSignInTime}`);
			console.log("");
		});

		// Get all users from Firestore
		const firestoreUsers = await db.collection("users").get();
		console.log(`📊 Firestore users (${firestoreUsers.size}):`);
		firestoreUsers.forEach((doc, index) => {
			const userData = doc.data();
			console.log(`   ${index + 1}. ${userData.email} (ID: ${doc.id})`);
			console.log(`      Display Name: ${userData.displayName || "N/A"}`);
			console.log(`      User ID: ${userData.userId || "N/A"}`);
			console.log(`      Role: ${userData.roleId || "N/A"}`);
			console.log(`      Created: ${userData.createdAt || "N/A"}`);
			console.log(`      Last Login: ${userData.lastLoginAt || "N/A"}`);
			console.log("");
		});

		// Check for specific user
		console.log("🔍 Checking for chelimo831@gmail.com specifically:");

		// Check in Auth
		try {
			const authUser = await auth.getUserByEmail("chelimo831@gmail.com");
			console.log(
				`✅ Found in Firebase Auth: ${authUser.email} (UID: ${authUser.uid})`
			);
		} catch (error) {
			console.log(`❌ Not found in Firebase Auth: ${error.message}`);
		}

		// Check in Firestore
		const firestoreQuery = await db
			.collection("users")
			.where("email", "==", "chelimo831@gmail.com")
			.get();

		if (!firestoreQuery.empty) {
			const userData = firestoreQuery.docs[0].data();
			console.log(
				`✅ Found in Firestore: ${userData.email} (ID: ${firestoreQuery.docs[0].id})`
			);
		} else {
			console.log("❌ Not found in Firestore");
		}

		// Check all collections
		console.log("\n📁 All Firestore collections:");
		const collections = await db.listCollections();
		collections.forEach((col) => {
			console.log(`   - ${col.id}`);
		});
	} catch (error) {
		console.error("❌ Error during detailed check:", error);
	} finally {
		process.exit(0);
	}
}

detailedUserCheck();
