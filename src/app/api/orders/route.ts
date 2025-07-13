import { NextRequest, NextResponse } from "next/server";
import type { Order, GlobalOrder } from "../../types/models";

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
		return NextResponse.json(
			{ message: "Failed to initialize Firebase Admin" },
			{ status: 500 }
		);
	}
	const decoded = await firebaseApp.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// GET: Fetch all orders (admin)
export async function GET(req: NextRequest) {
	if (!isFirebaseConfigured()) {
		return NextResponse.json(
			{ message: "Firebase credentials not configured" },
			{ status: 500 }
		);
	}

	try {
		const url = new URL(req.url);
		const userOnly = url.searchParams.get("userOnly");

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		if (userOnly) {
			const uid = await getUserFromRequest(req);
			if (uid && typeof uid === "object" && "status" in uid) {
				return uid;
			}
			const snapshot = await firebaseApp
				.firestore()
				.collection("users")
				.doc(uid)
				.collection("orders")
				.get();
			const orders: Order[] = snapshot.docs.map((doc) => doc.data() as Order);
			return NextResponse.json(orders);
		}
		// Default: fetch all orders (admin)
		const snapshot = await firebaseApp.firestore().collection("orders").get();
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
		const order: Order = await req.json();

		const { getFirebaseAdmin } = await import("../../firebaseAdmin");
		const firebaseApp = getFirebaseAdmin();
		if (!firebaseApp) {
			return NextResponse.json(
				{ message: "Failed to initialize Firebase Admin" },
				{ status: 500 }
			);
		}

		const orderId = firebaseApp.firestore().collection("orders").doc().id;
		const paymentId = firebaseApp.firestore().collection("payments").doc().id;
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
		await firebaseApp
			.firestore()
			.collection("orders")
			.doc(orderId)
			.set(globalOrder);
		// Store in user subcollection
		await firebaseApp
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
		await firebaseApp
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
		await firebaseApp
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

		// Loyalty Points: 1 point per 100 KES spent
		const pointsEarned = Math.floor(order.total / 100);
		const userRef = firebaseApp.firestore().collection("users").doc(uid);
		await firebaseApp.firestore().runTransaction(async (transaction) => {
			// First, perform all reads
			const userDoc = await transaction.get(userRef);
			const currentPoints =
				(userDoc.exists && userDoc.data()?.loyaltyPoints) || 0;

			// Read all product documents
			const productRefs = order.items.map((item) =>
				firebaseApp.firestore().collection("products").doc(item.productId)
			);
			const productDocs = await Promise.all(
				productRefs.map((ref) => transaction.get(ref))
			);

			// Then, perform all writes
			transaction.set(
				userRef,
				{ loyaltyPoints: currentPoints + pointsEarned },
				{ merge: true }
			);

			// Update product stock for each item
			order.items.forEach((item, index) => {
				const productDoc = productDocs[index];
				if (productDoc.exists) {
					const currentStock = productDoc.data()?.stock || 0;
					const newStock = Math.max(0, currentStock - (item.quantity || 1));
					transaction.update(productRefs[index], { stock: newStock });
				}
			});
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
