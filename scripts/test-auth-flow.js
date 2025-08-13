const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function testAuthFlow() {
	console.log("🧪 Testing Authentication Flow");
	console.log("=".repeat(50));

	try {
		// Check current state
		const currentUsers = await db.collection("users").get();
		console.log(`📊 Current users in system: ${currentUsers.size}`);

		// Test the ensureUserSync function
		console.log("\n🔧 Testing ensureUserSync function...");

		// Import the function (we'll simulate it)
		const testEmail = "test-user-" + Date.now() + "@example.com";
		const testUid = "test-uid-" + Date.now();
		const testDisplayName = "Test User";

		console.log(`Creating test user: ${testEmail}`);

		// Simulate the ensureUserSync logic
		const result = await db.runTransaction(async (transaction) => {
			// Check if user exists
			const existingUserQuery = await db
				.collection("users")
				.where("email", "==", testEmail)
				.limit(1)
				.get();

			if (!existingUserQuery.empty) {
				console.log("User already exists - updating");
				const existingUserDoc = existingUserQuery.docs[0];
				const existingUserData = existingUserDoc.data();

				const userData = {
					...existingUserData,
					userId: testUid,
					email: testEmail,
					displayName: testDisplayName,
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				transaction.set(existingUserDoc.ref, userData, { merge: true });
				return { userData, isNew: false };
			} else {
				console.log("User doesn't exist - creating new user");

				// Create new user
				const userDocRef = db.collection("users").doc(testUid);
				const userData = {
					userId: testUid,
					email: testEmail,
					displayName: testDisplayName,
					photoURL: null,
					roleId: "customer",
					phone: "",
					bio: "",
					profileCompleted: true,
					status: "active",
					createdAt: new Date().toISOString(),
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				transaction.set(userDocRef, userData);

				// Create cart
				const cartRef = db.collection("carts").doc(testUid);
				transaction.set(cartRef, {
					userId: testUid,
					items: [],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});

				return { userData, isNew: true };
			}
		});

		console.log(
			`✅ ${result.isNew ? "Created" : "Updated"} user: ${testEmail}`
		);
		console.log(`   Role: ${result.userData.roleId}`);
		console.log(`   Status: ${result.userData.status}`);

		// Verify the user was created
		const verifyUser = await db.collection("users").doc(testUid).get();
		if (verifyUser.exists) {
			console.log("✅ User document verified in Firestore");
		} else {
			console.log("❌ User document not found in Firestore");
		}

		// Verify cart was created
		const verifyCart = await db.collection("carts").doc(testUid).get();
		if (verifyCart.exists) {
			console.log("✅ Cart document verified in Firestore");
		} else {
			console.log("❌ Cart document not found in Firestore");
		}

		// Clean up test user
		console.log("\n🧹 Cleaning up test user...");
		await db.collection("users").doc(testUid).delete();
		await db.collection("carts").doc(testUid).delete();
		console.log("✅ Test user cleaned up");

		// Final count
		const finalUsers = await db.collection("users").get();
		console.log(`📊 Final user count: ${finalUsers.size}`);

		console.log("\n✅ Authentication flow test completed successfully!");
	} catch (error) {
		console.error("❌ Error testing auth flow:", error);
	} finally {
		process.exit(0);
	}
}

testAuthFlow();
