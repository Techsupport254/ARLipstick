const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function createAdminManually() {
	const adminData = {
		email: "chelimo831@gmail.com",
		displayName: "Chelimo",
		phone: "",
		bio: "System Administrator for AR Lipstick",
	};

	console.log(`🔧 Creating admin user: ${adminData.email}`);
	console.log("=".repeat(50));

	try {
		// Check if user already exists
		console.log("🔍 Checking if user already exists...");

		try {
			const existingAuthUser = await admin
				.auth()
				.getUserByEmail(adminData.email);
			console.log(`✅ User exists in Auth: ${existingAuthUser.uid}`);

			// Check if user exists in Firestore
			const firestoreQuery = await db
				.collection("users")
				.where("email", "==", adminData.email)
				.get();

			if (!firestoreQuery.empty) {
				const userData = firestoreQuery.docs[0].data();
				console.log(
					`✅ User exists in Firestore with role: ${userData.roleId}`
				);

				if (userData.roleId === "admin") {
					console.log("✅ User is already an admin!");
					return;
				} else {
					console.log("🔄 Updating user to admin role...");
					await firestoreQuery.docs[0].ref.update({
						roleId: "admin",
						bio: adminData.bio,
						updatedAt: new Date().toISOString(),
					});
					console.log("✅ User promoted to admin!");
					return;
				}
			} else {
				console.log("📄 Creating Firestore document for existing Auth user...");

				// Create user document in Firestore
				const userDoc = {
					userId: existingAuthUser.uid,
					email: existingAuthUser.email,
					displayName: existingAuthUser.displayName || adminData.displayName,
					photoURL: existingAuthUser.photoURL || null,
					roleId: "admin",
					phone: adminData.phone || "",
					bio: adminData.bio,
					profileCompleted: true,
					status: "active",
					createdAt: new Date().toISOString(),
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				await db.collection("users").doc(existingAuthUser.uid).set(userDoc);
				console.log("✅ User document created in Firestore");

				// Create cart
				const cartData = {
					userId: existingAuthUser.uid,
					items: [],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				await db.collection("carts").doc(existingAuthUser.uid).set(cartData);
				console.log("✅ Cart created for user");

				console.log("✅ Admin user setup completed!");
				return;
			}
		} catch (error) {
			if (error.code === "auth/user-not-found") {
				console.log("❌ User doesn't exist in Auth");
				console.log(
					"💡 The user needs to sign in with Google first to create their Auth account"
				);
				console.log("   Then run this script again to promote them to admin");
				return;
			}
			throw error;
		}
	} catch (error) {
		console.error("❌ Error creating admin:", error);
	} finally {
		process.exit(0);
	}
}

createAdminManually();
