const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function forceCreateAdmin() {
	const adminData = {
		email: "chelimo831@gmail.com",
		displayName: "Chelimo",
		phone: "",
		bio: "System Administrator for AR Lipstick",
	};

	console.log(`🚀 Force creating admin: ${adminData.email}`);
	console.log("=".repeat(50));

	try {
		// Step 1: Create user in Firebase Auth
		console.log("1️⃣ Creating user in Firebase Auth...");
		let authUser;

		try {
			// Try to get existing user first
			authUser = await admin.auth().getUserByEmail(adminData.email);
			console.log(`✅ User already exists in Auth: ${authUser.uid}`);
		} catch (error) {
			if (error.code === "auth/user-not-found") {
				// Create new user in Auth
				authUser = await admin.auth().createUser({
					email: adminData.email,
					displayName: adminData.displayName,
					emailVerified: true,
				});
				console.log(`✅ Created new user in Auth: ${authUser.uid}`);
			} else {
				throw error;
			}
		}

		// Step 2: Create/Update user in Firestore
		console.log("2️⃣ Creating/Updating user in Firestore...");

		const userDoc = {
			userId: authUser.uid,
			email: adminData.email,
			displayName: adminData.displayName,
			photoURL: authUser.photoURL || null,
			roleId: "admin", // Force admin role
			phone: adminData.phone || "",
			bio: adminData.bio,
			profileCompleted: true,
			status: "active",
			createdAt: new Date().toISOString(),
			lastLoginAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db
			.collection("users")
			.doc(authUser.uid)
			.set(userDoc, { merge: true });
		console.log("✅ User document created/updated in Firestore");

		// Step 3: Create cart
		console.log("3️⃣ Creating cart...");
		const cartData = {
			userId: authUser.uid,
			items: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		await db
			.collection("carts")
			.doc(authUser.uid)
			.set(cartData, { merge: true });
		console.log("✅ Cart created");

		// Step 4: Verify
		console.log("4️⃣ Verifying admin creation...");

		const verifyUser = await db.collection("users").doc(authUser.uid).get();
		if (verifyUser.exists) {
			const userData = verifyUser.data();
			console.log(`✅ Verification successful:`);
			console.log(`   Email: ${userData.email}`);
			console.log(`   Role: ${userData.roleId}`);
			console.log(`   Status: ${userData.status}`);
			console.log(`   UID: ${userData.userId}`);
		}

		console.log("\n🎉 ADMIN USER CREATED SUCCESSFULLY!");
		console.log("=".repeat(50));
		console.log(`Email: ${adminData.email}`);
		console.log(`UID: ${authUser.uid}`);
		console.log(`Role: admin`);
		console.log(`Status: active`);
		console.log(
			"\n✅ The user can now sign in with Google and will have admin privileges!"
		);
	} catch (error) {
		console.error("❌ Error creating admin:", error);
		console.error("Error details:", error.message);
	} finally {
		process.exit(0);
	}
}

forceCreateAdmin();
