import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../firebaseAdmin";
import type { User } from "../../types/models";

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

export async function GET(req: NextRequest) {
	try {
		const uid = await getUserFromRequest(req);
		const userDoc = await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.get();
		const user = userDoc.data() as User | undefined;
		if (!user) {
			return NextResponse.json({ message: "User not found" }, { status: 404 });
		}
		// If admin, return all users; otherwise, return only the current user's profile
		if (user.role === "admin") {
			const snapshot = await admin.admin.firestore().collection("users").get();
			const users: User[] = snapshot.docs.map((doc) => doc.data() as User);
			return NextResponse.json(users);
		} else {
			return NextResponse.json(user);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: "Failed to fetch user", error: message },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: NextRequest) {
	try {
		const uid = await getUserFromRequest(req);
		const body = await req.json();
		const updateData: Partial<User> = {};
		if (body.displayName) updateData.displayName = body.displayName;
		if (body.bio !== undefined) updateData.bio = body.bio;
		if (body.phone !== undefined) updateData.phone = body.phone;
		await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.set(updateData, { merge: true });
		const userDoc = await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.get();
		const user = userDoc.data() as User;
		return NextResponse.json(user);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: "Failed to update user", error: message },
			{ status: 500 }
		);
	}
}
