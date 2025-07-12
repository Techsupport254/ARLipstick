const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate new private key
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	projectId: "joannak-try-on",
});

async function addAuthorizedDomain() {
	try {
		const auth = admin.auth();

		// Get current authorized domains
		const domains = await auth.listAuthorizedDomains();
		console.log("Current authorized domains:", domains.authorizedDomains);

		// Add the new domain
		const newDomain = "ar-lipstick.vercel.app";

		if (domains.authorizedDomains.includes(newDomain)) {
			console.log(`Domain ${newDomain} is already authorized.`);
			return;
		}

		// Note: Firebase Admin SDK doesn't have a direct method to add authorized domains
		// This needs to be done through the Firebase Console or REST API
		console.log("Firebase Admin SDK cannot directly add authorized domains.");
		console.log("Please add the domain manually in Firebase Console:");
		console.log(
			"1. Go to https://console.firebase.google.com/project/joannak-try-on/authentication/settings"
		);
		console.log('2. Scroll to "Authorized domains"');
		console.log('3. Click "Add domain"');
		console.log("4. Enter: ar-lipstick.vercel.app");
		console.log('5. Click "Add"');
	} catch (error) {
		console.error("Error:", error);
	}
}

addAuthorizedDomain();
