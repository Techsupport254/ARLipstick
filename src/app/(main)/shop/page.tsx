"use client";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { getAuth } from "firebase/auth";
import type { Product } from "../../types/models";
import ProductGrid from "../../components/ProductGrid";

export default function Shop() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [cartMessage, setCartMessage] = useState("");

	async function handleAddToCart(product: Product) {
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) {
				setCartMessage("Please login to add to cart.");
				return;
			}
			const idToken = await user.getIdToken();
			const res = await fetch("/api/cart", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({
					productId: product.id,
					quantity: 1,
					name: product.name,
					price: product.price,
					imageUrl: product.imageUrl,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || "Failed to add to cart");
			}
			setCartMessage("Added to cart!");
			setTimeout(() => setCartMessage(""), 1500);
		} catch (err: unknown) {
			if (err instanceof Error) {
				setCartMessage(err.message || "Error adding to cart");
			} else {
				setCartMessage("Error adding to cart");
			}
			setTimeout(() => setCartMessage(""), 2000);
		}
	}

	useEffect(() => {
		async function fetchProducts() {
			try {
				const res = await fetch("/api/products");
				if (!res.ok) throw new Error("Failed to fetch products");
				const data = await res.json();
				setProducts(data);
			} catch (err: unknown) {
				if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("Unknown error");
				}
			} finally {
				setLoading(false);
			}
		}
		fetchProducts();
	}, []);

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 font-sans">
			<Header />
			<main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-8 sm:py-12 md:py-20">
				<h1 className="text-3xl sm:text-5xl font-extrabold text-pink-600 mb-8 sm:mb-12 text-center tracking-tight drop-shadow-xl">
					Shop Lipsticks
				</h1>
				{loading ? (
					<div className="flex justify-center items-center py-24">
						<span className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></span>
					</div>
				) : error ? (
					<div className="text-red-500 text-center py-12 text-xl font-semibold">
						{error}
					</div>
				) : products.length === 0 ? (
					<div className="text-gray-500 text-center py-12 text-2xl">
						No products found.
					</div>
				) : (
					<ProductGrid products={products} />
				)}
				{cartMessage && (
					<div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 border border-pink-200 shadow-xl rounded-full px-4 sm:px-8 py-2 sm:py-4 text-base sm:text-lg font-bold text-green-600 z-50 animate-fade-in">
						{cartMessage}
					</div>
				)}
			</main>
			<Footer />
		</div>
	);
}
