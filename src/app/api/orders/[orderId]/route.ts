import { NextRequest, NextResponse } from "next/server";
import type { GlobalOrder } from "../../../types/models";

// Prevent static generation of this API route
export const dynamic = "force-dynamic";

function isFirebaseConfigured() {
	return !!(
		process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
		process.env.FIREBASE_CLIENT_EMAIL &&
		process.env.FIREBASE_PRIVATE_KEY
	);
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ orderId: string }> }
) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	const { orderId } = await params;
	try {
		if (!orderId) {
			return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
		}
		const { status } = await req.json();
		if (!status) {
			return NextResponse.json({ message: "Missing status" }, { status: 400 });
		}

		const { getFirebaseAdmin } = await import("../../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		// Update global order
		const orderRef = firebaseApp.firestore().collection("orders").doc(orderId);
		const orderSnap = await orderRef.get();
		if (!orderSnap.exists) {
			return NextResponse.json({ message: "Order not found" }, { status: 404 });
		}
		await orderRef.update({ status });
		const updatedOrder = (await orderRef.get()).data() as GlobalOrder;
		// Also update in user subcollection
		if (updatedOrder && updatedOrder.userId) {
			const userOrderRef = firebaseApp
				.firestore()
				.collection("users")
				.doc(updatedOrder.userId)
				.collection("orders")
				.doc(orderId);
			await userOrderRef.update({ status });
		}
		return NextResponse.json(updatedOrder);
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to update order", error: (error as Error).message },
			{ status: 500 }
		);
	}
}

// Add similar isFirebaseConfigured check to any other handlers here if present
