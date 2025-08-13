const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function syncUsers() {
	console.log(
		"🔍 Checking user synchronization between Firebase Auth and Firestore..."
	);
	console.log("=".repeat(60));

	try {
		// Get all users from Firebase Auth
		const authUsers = await auth.listUsers();
		console.log(`📊 Found ${authUsers.users.length} users in Firebase Auth`);

		// Get all users from Firestore
		const firestoreUsers = await db.collection("users").get();
		console.log(`📊 Found ${firestoreUsers.size} users in Firestore`);

		const authUserMap = new Map();
		const firestoreUserMap = new Map();

		// Create maps for easy lookup
		authUsers.users.forEach((user) => {
			authUserMap.set(user.email, user);
		});

		firestoreUsers.forEach((doc) => {
			const userData = doc.data();
			firestoreUserMap.set(userData.email, { id: doc.id, ...userData });
		});

		// Check for inconsistencies
		const issues = [];
		const fixed = [];

		// Check Auth users that don't exist in Firestore
		for (const [email, authUser] of authUserMap) {
			if (!firestoreUserMap.has(email)) {
				issues.push({
					type: "missing_firestore",
					email,
					authUid: authUser.uid,
					message: `User exists in Auth but not in Firestore`,
				});
			}
		}

		// Check Firestore users that don't exist in Auth
		for (const [email, firestoreUser] of firestoreUserMap) {
			if (!authUserMap.has(email)) {
				issues.push({
					type: "missing_auth",
					email,
					firestoreId: firestoreUser.id,
					message: `User exists in Firestore but not in Auth`,
				});
			}
		}

		// Check for UID mismatches
		for (const [email, authUser] of authUserMap) {
			const firestoreUser = firestoreUserMap.get(email);
			if (firestoreUser && firestoreUser.userId !== authUser.uid) {
				issues.push({
					type: "uid_mismatch",
					email,
					authUid: authUser.uid,
					firestoreUid: firestoreUser.userId,
					message: `UID mismatch between Auth (${authUser.uid}) and Firestore (${firestoreUser.userId})`,
				});
			}
		}

		// Report issues
		if (issues.length === 0) {
			console.log("✅ All users are properly synchronized!");
		} else {
			console.log(`⚠️  Found ${issues.length} synchronization issues:`);
			issues.forEach((issue, index) => {
				console.log(
					`\n${index + 1}. ${issue.type.toUpperCase()}: ${issue.email}`
				);
				console.log(`   ${issue.message}`);
			});

			// Ask if user wants to fix issues
			console.log("\n" + "=".repeat(60));
			console.log("Would you like to attempt to fix these issues? (y/n)");

			// For now, we'll just report the issues
			// In a real implementation, you'd want to prompt for user input
			console.log(
				"Note: Automatic fixing is disabled for safety. Please fix manually."
			);
		}

		// Show summary
		console.log("\n" + "=".repeat(60));
		console.log("📋 SUMMARY:");
		console.log(`   Firebase Auth users: ${authUsers.users.length}`);
		console.log(`   Firestore users: ${firestoreUsers.size}`);
		console.log(`   Synchronization issues: ${issues.length}`);

		if (issues.length > 0) {
			console.log("\n🔧 RECOMMENDATIONS:");
			console.log(
				"   1. For missing Firestore users: Use the ensureUserSync function"
			);
			console.log("   2. For missing Auth users: Re-authenticate the user");
			console.log("   3. For UID mismatches: Update the Firestore document");
		}
	} catch (error) {
		console.error("❌ Error checking user synchronization:", error);
	} finally {
		process.exit(0);
	}
}

// Run the sync check
syncUsers();
