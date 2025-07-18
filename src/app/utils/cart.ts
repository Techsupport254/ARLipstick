import { getAuth } from "firebase/auth";

export async function addToCart(productId: string): Promise<void> {
	const auth = getAuth();
	const user = auth.currentUser;
	if (!user) throw new Error("Please login to add to cart.");
	const idToken = await user.getIdToken();
	const res = await fetch("/api/cart", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${idToken}`,
		},
		body: JSON.stringify({ productId, quantity: 1 }),
	});
	if (!res.ok) {
		let data;
		try {
			data = await res.json();
		} catch {
			data = {};
		}
		throw new Error(
			data.error || data.message || `Failed to add to cart (${res.status})`
		);
	}
}
