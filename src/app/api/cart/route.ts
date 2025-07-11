import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../firebaseAdmin";
import type { CartItem } from "../../types/models";

// Helper to get user from idToken
async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// POST: Add item to cart
export async function POST(req: NextRequest) {
	try {
		let body;
		try {
			body = await req.json();
		} catch (err) {
			return NextResponse.json(
				{
					message: "Invalid JSON body",
					error: err instanceof Error ? err.message : String(err),
				},
				{ status: 400 }
			);
		}
		const uid = await getUserFromRequest(req);
		const { productId, quantity = 1, name, price, imageUrl } = body;
		if (!productId) {
			return NextResponse.json(
				{ message: "Missing productId" },
				{ status: 400 }
			);
		}
		if (!quantity || typeof quantity !== "number" || quantity < 1) {
			return NextResponse.json(
				{ message: "Invalid quantity" },
				{ status: 400 }
			);
		}
		// Add or update cart item
		const cartRef = admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("cart")
			.doc(productId);
		const cartItem: CartItem = {
			productId,
			quantity,
			addedAt: new Date().toISOString(),
			...(name !== undefined ? { name } : {}),
			...(price !== undefined ? { price } : {}),
			...(imageUrl !== undefined ? { imageUrl } : {}),
		};
		await cartRef.set(cartItem, { merge: true });
		return NextResponse.json({ message: "Added to cart" });
	} catch (error: unknown) {
		console.error(
			"API /api/cart error:",
			error,
			error instanceof Error ? error.stack : ""
		);
		return NextResponse.json(
			{
				message: "Failed to add to cart",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// GET: Fetch user's cart
export async function GET(req: NextRequest) {
	try {
		const uid = await getUserFromRequest(req);
		const cartSnap = await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("cart")
			.get();
		const cart = cartSnap.docs.map((doc) => doc.data());
		return NextResponse.json(cart);
	} catch (error: unknown) {
		console.error(
			"API /api/cart error:",
			error,
			error instanceof Error ? error.stack : ""
		);
		return NextResponse.json(
			{
				message: "Failed to fetch cart",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// DELETE: Clear user's cart
export async function DELETE(req: NextRequest) {
	try {
		const uid = await getUserFromRequest(req);
		const cartRef = admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("cart");
		const cartSnap = await cartRef.get();
		const batch = admin.admin.firestore().batch();
		cartSnap.docs.forEach((doc) => batch.delete(doc.ref));
		await batch.commit();
		return NextResponse.json({ message: "Cart cleared" });
	} catch (error: unknown) {
		console.error(
			"API /api/cart DELETE error:",
			error,
			error instanceof Error ? error.stack : ""
		);
		return NextResponse.json(
			{
				message: "Failed to clear cart",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
