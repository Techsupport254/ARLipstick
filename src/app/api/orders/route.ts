import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../firebaseAdmin";
import type { Order, GlobalOrder } from "../../types/models";

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// GET: Fetch all orders (admin)
export async function GET(req: NextRequest) {
	try {
		const url = new URL(req.url);
		const userOnly = url.searchParams.get("userOnly");
		if (userOnly) {
			const uid = await getUserFromRequest(req);
			const snapshot = await admin.admin
				.firestore()
				.collection("users")
				.doc(uid)
				.collection("orders")
				.get();
			const orders: Order[] = snapshot.docs.map((doc) => doc.data() as Order);
			return NextResponse.json(orders);
		}
		// Default: fetch all orders (admin)
		const snapshot = await admin.admin.firestore().collection("orders").get();
		const orders: GlobalOrder[] = snapshot.docs.map(
			(doc) => doc.data() as GlobalOrder
		);
		return NextResponse.json(orders);
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to fetch orders", error: (error as Error).message },
			{ status: 500 }
		);
	}
}

// POST: Create a new order (user)
export async function POST(req: NextRequest) {
	try {
		const uid = await getUserFromRequest(req);
		const order: Order = await req.json();
		const orderId = admin.admin.firestore().collection("orders").doc().id;
		const paymentId = admin.admin.firestore().collection("payments").doc().id;
		// Create payment record
		const payment = {
			paymentId,
			orderId,
			amount: order.total,
			status: "completed",
			method: "paystack",
			transactionRef: order.paystackRef,
			createdAt: order.createdAt,
			phoneNumber: order.phoneNumber, // Added
			paystackRef: order.paystackRef, // Added
		};
		const globalOrder: GlobalOrder = {
			...order,
			orderId,
			userId: uid,
			paymentId: paymentId,
			subtotal: order.subtotal,
			vat: order.vat,
			deliveryFee: order.deliveryFee,
		};
		// Store in global orders
		await admin.admin
			.firestore()
			.collection("orders")
			.doc(orderId)
			.set(globalOrder);
		// Store in user subcollection
		await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("orders")
			.doc(orderId)
			.set({
				...order,
				orderId,
				paymentId,
				subtotal: order.subtotal,
				vat: order.vat,
				deliveryFee: order.deliveryFee,
			});
		// Store payment in global payments
		await admin.admin
			.firestore()
			.collection("payments")
			.doc(paymentId)
			.set({
				...payment,
				userId: uid,
				subtotal: order.subtotal,
				vat: order.vat,
				deliveryFee: order.deliveryFee,
			});
		// Store payment in user subcollection
		await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("payments")
			.doc(paymentId)
			.set({
				...payment,
				subtotal: order.subtotal,
				vat: order.vat,
				deliveryFee: order.deliveryFee,
			});
		return NextResponse.json({
			message: "Order and payment created",
			orderId,
			paymentId,
			subtotal: order.subtotal,
			vat: order.vat,
			deliveryFee: order.deliveryFee,
		});
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to create order", error: (error as Error).message },
			{ status: 500 }
		);
	}
}
