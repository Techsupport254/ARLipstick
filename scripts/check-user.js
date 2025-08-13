const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkUser() {
	try {
		// Check users collection
		const usersSnapshot = await db.collection("users").get();
		console.log("Users collection has", usersSnapshot.size, "documents");

		// Check if user exists with email
		const userQuery = await db
			.collection("users")
			.where("email", "==", "chelimo831@gmail.com")
			.get();
		console.log(
			"Found",
			userQuery.size,
			"users with email chelimo831@gmail.com"
		);

		if (!userQuery.empty) {
			const user = userQuery.docs[0].data();
			console.log("User data:", JSON.stringify(user, null, 2));
		}

		// List all collections
		const collections = await db.listCollections();
		console.log(
			"Available collections:",
			collections.map((col) => col.id)
		);

		// List all users with their emails
		console.log("\nAll users in database:");
		usersSnapshot.forEach((doc) => {
			const userData = doc.data();
			console.log(`- ${userData.email} (${userData.displayName})`);
		});
	} catch (error) {
		console.error("Error:", error);
	} finally {
		process.exit(0);
	}
}

checkUser();
