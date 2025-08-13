const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../src/secret/firebase-service-account.json");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkUserRoles() {
	console.log("🔍 Checking User Roles and System Users");
	console.log("=".repeat(60));

	try {
		// Check user roles collection
		console.log("📋 User Roles Defined:");
		const rolesSnapshot = await db.collection("userRoles").get();

		if (rolesSnapshot.empty) {
			console.log("   No roles defined in the system");
		} else {
			rolesSnapshot.forEach((doc) => {
				const roleData = doc.data();
				console.log(`   ${roleData.roleId}: ${roleData.roleName}`);
				console.log(`      Description: ${roleData.description}`);
				console.log(
					`      Permissions: ${roleData.permissions?.length || 0} permissions`
				);
				console.log("");
			});
		}

		// Check all users and their roles
		console.log("👥 All Users in System:");
		const usersSnapshot = await db.collection("users").get();

		if (usersSnapshot.empty) {
			console.log("   No users found in the system");
		} else {
			usersSnapshot.forEach((doc, index) => {
				const userData = doc.data();
				console.log(
					`   ${index + 1}. ${userData.displayName} (${userData.email})`
				);
				console.log(`      Role: ${userData.roleId}`);
				console.log(`      Status: ${userData.status}`);
				console.log(`      UID: ${userData.userId}`);
				console.log(`      Created: ${userData.createdAt}`);
				console.log(`      Last Login: ${userData.lastLoginAt}`);
				console.log("");
			});
		}

		// Summary
		console.log("📊 Summary:");
		console.log(`   Total Users: ${usersSnapshot.size}`);
		console.log(`   Total Roles: ${rolesSnapshot.size}`);

		// Count by role
		const roleCounts = {};
		usersSnapshot.forEach((doc) => {
			const userData = doc.data();
			roleCounts[userData.roleId] = (roleCounts[userData.roleId] || 0) + 1;
		});

		console.log("   Users by Role:");
		Object.entries(roleCounts).forEach(([role, count]) => {
			console.log(`      ${role}: ${count} user(s)`);
		});
	} catch (error) {
		console.error("❌ Error checking user roles:", error);
	} finally {
		process.exit(0);
	}
}

checkUserRoles();
