import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../../firebaseAdmin";

// Helper to get user from idToken
async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

// DELETE: Remove specific item from cart
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { productId: string } }
) {
	try {
		const uid = await getUserFromRequest(req);
		const { productId } = params;

		if (!productId) {
			return NextResponse.json(
				{ message: "Missing productId" },
				{ status: 400 }
			);
		}

		// Remove the specific cart item
		await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.collection("cart")
			.doc(productId)
			.delete();

		return NextResponse.json({ message: "Item removed from cart" });
	} catch (error: unknown) {
		console.error(
			"API /api/cart/[productId] DELETE error:",
			error,
			error instanceof Error ? error.stack : ""
		);
		return NextResponse.json(
			{
				message: "Failed to remove item from cart",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
