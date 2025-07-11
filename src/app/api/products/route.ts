import { NextResponse } from "next/server";
import { admin } from "../../firebaseAdmin";
import type { Product } from "../../types/models";
import cloudinary from "cloudinary";

cloudinary.v2.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
	try {
		const snapshot = await admin.firestore().collection("products").get();
		const products: Product[] = snapshot.docs.map((doc) => ({
			id: doc.id,
			...(doc.data() as Omit<Product, "id">),
		}));
		return NextResponse.json(products);
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to fetch products", error: (error as Error).message },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { name, colorName, hexColor, price, imageUrl, stock } = body;
		if (
			!name ||
			!colorName ||
			!hexColor ||
			!price ||
			!imageUrl ||
			stock === undefined
		) {
			return NextResponse.json(
				{ message: "Missing required fields" },
				{ status: 400 }
			);
		}
		const numericStock = Number(stock);
		const status = numericStock === 0 ? "sold out" : "on sale";
		const docRef = await admin
			.firestore()
			.collection("products")
			.add({
				name,
				colorName,
				hexColor,
				price: Number(price),
				imageUrl,
				category: "Lipstick",
				createdAt: new Date().toISOString(),
				stock: numericStock,
				status,
			});
		const newProduct = {
			id: docRef.id,
			name,
			colorName,
			hexColor,
			price: Number(price),
			imageUrl,
			category: "Lipstick",
			stock: numericStock,
			status,
		};
		return NextResponse.json(newProduct);
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to add product", error: (error as Error).message },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: Request) {
	try {
		const body = await req.json();
		const { id, ...fields } = body;
		if (!id) {
			return NextResponse.json(
				{ message: "Missing product ID" },
				{ status: 400 }
			);
		}
		if (fields.stock !== undefined) {
			const numericStock = Number(fields.stock);
			fields.stock = numericStock;
			fields.status = numericStock === 0 ? "sold out" : "on sale";
		} else {
			delete fields.status; // Don't allow manual status update
		}
		await admin.firestore().collection("products").doc(id).update(fields);
		return NextResponse.json({ message: "Product updated" });
	} catch (error) {
		return NextResponse.json(
			{ message: "Failed to update product", error: (error as Error).message },
			{ status: 500 }
		);
	}
}
