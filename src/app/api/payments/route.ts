import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../firebaseAdmin";
import type { Payment, GlobalPayment } from "../../types/models";

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// GET: Fetch all payments (admin)
export async function GET(req: NextRequest) {
	try {
		const snapshot = await admin.admin.firestore().collection("payments").get();
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
	try {
		const uid = await getUserFromRequest(req);
		const payment: Payment = await req.json();
		const paymentId = admin.admin.firestore().collection("payments").doc().id;
		const globalPayment: GlobalPayment = { ...payment, paymentId, userId: uid };
		// Store in global payments
		await admin.admin
			.firestore()
			.collection("payments")
			.doc(paymentId)
			.set(globalPayment);
		// Store in user subcollection
		await admin.admin
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
