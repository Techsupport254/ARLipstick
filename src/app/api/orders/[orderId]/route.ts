import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../../firebaseAdmin";
import type { GlobalOrder, Order } from "../../../types/models";

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { orderId: string } }
) {
	try {
		const { orderId } = params;
		if (!orderId) {
			return NextResponse.json({ message: "Missing orderId" }, { status: 400 });
		}
		const { status } = await req.json();
		if (!status) {
			return NextResponse.json({ message: "Missing status" }, { status: 400 });
		}
		// Update global order
		const orderRef = admin.admin.firestore().collection("orders").doc(orderId);
		const orderSnap = await orderRef.get();
		if (!orderSnap.exists) {
			return NextResponse.json({ message: "Order not found" }, { status: 404 });
		}
		await orderRef.update({ status });
		const updatedOrder = (await orderRef.get()).data() as GlobalOrder;
		// Also update in user subcollection
		if (updatedOrder && updatedOrder.userId) {
			const userOrderRef = admin.admin
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