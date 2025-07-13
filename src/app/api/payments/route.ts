import { NextRequest, NextResponse } from "next/server";
import type { Payment, GlobalPayment } from "../../types/models";

// Prevent static generation of this API route
export const dynamic = "force-dynamic";

function isFirebaseConfigured() {
	return !!(
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
		process.env.FIREBASE_CLIENT_EMAIL &&
		process.env.FIREBASE_PRIVATE_KEY
	);
}

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");

	const { getFirebaseAdmin } = await import("../../firebaseAdmin");
	const firebaseApp = getFirebaseAdmin();
	if (!firebaseApp) {
		throw new Error("Failed to initialize Firebase Admin");
	}
	const decoded = await firebaseApp.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// GET: Fetch all payments (admin)
export async function GET() {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		const snapshot = await firebaseApp.firestore().collection("payments").get();
		const payments: GlobalPayment[] = snapshot.docs.map(
			(doc) => doc.data() as GlobalPayment
		);
		return NextResponse.json(payments);
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to fetch payments", error: (error as Error).message },
			{ status: 500 }
		);
	}
}

// POST: Create a new payment (user)
export async function POST(req: NextRequest) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const uid = await getUserFromRequest(req);
		if (uid && typeof uid === "object" && "status" in uid) {
			return uid;
		}
		const payment: Payment = await req.json();

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		const paymentId = firebaseApp.firestore().collection("payments").doc().id;
		const globalPayment: GlobalPayment = { ...payment, paymentId, userId: uid };
		// Store in global payments
		await firebaseApp
			.firestore()
			.collection("payments")
			.doc(paymentId)
			.set(globalPayment);
		// Store in user subcollection
		await firebaseApp
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("payments")
			.doc(paymentId)
			.set(payment);
		return NextResponse.json({ message: "Payment created", paymentId });
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to create payment", error: (error as Error).message },
			{ status: 500 }
		);
	}
}
