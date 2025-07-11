"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";
import FeatureSection from "./components/FeatureSection";
import ProductGrid, { Product } from "./components/ProductGrid";
import { useEffect, useState } from "react";

export default function Home() {
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

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
		<div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 to-white font-sans">
			<Header />
			<main className="flex-1 flex flex-col items-center justify-center px-4 w-full">
				{/* HERO SECTION START */}
				<section
					className="relative w-full flex flex-col items-center justify-center py-28 bg-gradient-to-br from-pink-100 via-white to-pink-50 overflow-hidden"
					style={{ minHeight: "90vh" }}
				>
					<div className="absolute -top-16 -left-16 w-64 h-64 bg-pink-200 rounded-full opacity-30 blur-3xl z-0" />
					<div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-300 rounded-full opacity-20 blur-3xl z-0" />
					<div className="relative z-10 flex flex-col items-center text-center max-w-8xl mx-auto">
						<div className="mb-6 flex flex-col items-center">
							{/* Lipstick SVG Icon */}
							<svg
								width="72"
								height="72"
								viewBox="0 0 36 36"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="mb-2"
							>
								<rect
									x="15"
									y="8"
									width="6"
									height="14"
									rx="3"
									fill="#dc3753"
								/>
								<rect
									x="13"
									y="22"
									width="10"
									height="6"
									rx="2"
									fill="#fbb6ce"
								/>
								<rect
									x="15"
									y="28"
									width="6"
									height="3"
									rx="1.5"
									fill="#e11d48"
								/>
								<rect
									x="16.5"
									y="5"
									width="3"
									height="5"
									rx="1.5"
									fill="#f472b6"
								/>
							</svg>
							<span className="inline-block bg-pink-100 text-pink-600 font-semibold rounded-full px-4 py-1 text-sm shadow">
								#1 Virtual Lipstick Try-On
							</span>
						</div>
						<h1 className="text-5xl md:text-7xl font-extrabold text-pink-600 mb-4 tracking-tight drop-shadow-sm">
							Try On Lipstick Instantly
						</h1>
						<p className="text-lg md:text-2xl text-gray-700 mb-8 font-medium max-w-2xl mx-auto">
							Welcome to{" "}
							<span className="font-bold text-pink-500">LushLips</span> —
							discover your perfect shade with our cutting-edge virtual try-on.
							No downloads, no mess, just your camera and a smile. Find your new
							favorite look in seconds!
						</p>
						<a
							href="#products"
							className="inline-block px-12 py-4 bg-pink-500 text-white rounded-full shadow-xl hover:bg-pink-600 transition font-semibold text-2xl mb-6"
						>
							Shop Now
						</a>
						<div className="flex flex-col items-center gap-2">
							<span className="flex items-center gap-2 text-gray-500 text-sm">
								<svg
									className="w-5 h-5 text-pink-400"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Trusted by 10,000+ beauty lovers
							</span>
							<span className="italic text-gray-400 text-xs">
								“The easiest way to try lipstick online!”
							</span>
						</div>
					</div>
				</section>
				{/* HERO SECTION END */}
				{/* FEATURE SECTION START */}
				<FeatureSection />
				{/* FEATURE SECTION END */}
				<section
					id="products"
					className="w-full flex flex-col items-center mt-12"
				>
					<h2 className="text-4xl md:text-5xl font-extrabold text-pink-600 mb-8 text-center drop-shadow-sm">
						Our Lipstick Collection
					</h2>
					<div className="container max-w-8xl mx-auto bg-white/80 rounded-3xl shadow-2xl border border-pink-100 p-6 md:p-12 mb-16 backdrop-blur-md">
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
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
