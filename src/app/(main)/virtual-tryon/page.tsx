"use client";

import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import React, { useRef, useEffect, useState, Suspense } from "react";
import { startLipstickAR } from "../../../ar/arUtils";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

export type LipstickProduct = {
	id: string | number;
	name: string;
	color: string;
	image: string;
};

function ARLipstickTryOn({ color }: { color: string }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Ensure canvas size matches video stream resolution
	useEffect(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return;

		function syncCanvasSize() {
			if (video && canvas && video.videoWidth && video.videoHeight) {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
			}
		}

		video.addEventListener("loadedmetadata", syncCanvasSize);
		// In case metadata is already loaded
		syncCanvasSize();

		return () => {
			if (video) video.removeEventListener("loadedmetadata", syncCanvasSize);
		};
	}, []);

	useEffect(() => {
		let stop: (() => void) | undefined;
		if (videoRef.current && canvasRef.current) {
			startLipstickAR(videoRef.current, canvasRef.current, color).then(
				(cleanup) => {
					stop = cleanup;
				}
			);
		}
		return () => {
			if (stop) stop();
		};
	}, [color]);

	return (
		<div className="relative w-full max-w-3xl flex items-center justify-center bg-gradient-to-br from-pink-100 via-white to-purple-100 rounded-xl sm:rounded-2xl border border-pink-200 shadow-lg overflow-hidden mb-6 sm:mb-8 min-h-[220px] sm:min-h-[320px]">
			<video
				ref={videoRef}
				className="w-full h-full object-contain bg-black absolute inset-0 opacity-0 pointer-events-none"
				autoPlay
				muted
			/>
			<canvas
				ref={canvasRef}
				className="w-full h-full object-contain bg-black rounded-xl sm:rounded-2xl"
			/>
			<div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/70 text-pink-600 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold shadow">
				Live Camera
			</div>
		</div>
	);
}

function VirtualTryOnContent() {
	const [products, setProducts] = useState<LipstickProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const searchParams = useSearchParams();
	const selectedId = searchParams.get("id");
	const [selectedIdx, setSelectedIdx] = useState<number>(0);
	const [cartMessage, setCartMessage] = useState("");

	function handleAddToCart() {
		if (!selected) return;
		// Simulate cart with localStorage
		const cart = JSON.parse(localStorage.getItem("cart") || "[]");
		cart.push(selected);
		localStorage.setItem("cart", JSON.stringify(cart));
		setCartMessage("Added to cart!");
		setTimeout(() => setCartMessage(""), 1500);
	}

	useEffect(() => {
		async function fetchProducts() {
			try {
				const res = await fetch("/api/products");
				if (!res.ok) throw new Error("Failed to fetch products");
				const data: unknown = await res.json();
				const mapped = Array.isArray(data)
					? data.map((p, idx) => {
							const prod = p as {
								id?: string | number;
								name?: string;
								hexColor?: string;
								imageUrl?: string;
							};
							let finalId: string | number;
							if (typeof prod.id === "number") {
								finalId = prod.id;
							} else if (typeof prod.id === "string" && prod.id.trim() !== "") {
								finalId = prod.id;
							} else {
								finalId = idx;
							}
							return {
								id: finalId,
								name: prod.name || `Lipstick ${idx + 1}`,
								color: prod.hexColor || "#dc3753",
								image: prod.imageUrl || "/file.svg",
							};
					  })
					: [];
				setProducts(mapped);
				if (selectedId) {
					const foundIdx = mapped.findIndex((p) => String(p.id) === selectedId);
					if (foundIdx !== -1) {
						setSelectedIdx(foundIdx);
					}
				}
			} catch (err: unknown) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		}
		fetchProducts();
	}, [selectedId]);

	const selected = products[selectedIdx];

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 font-sans">
			<Header />
			<main className="flex-1 w-full max-w-3xl mx-auto px-2 sm:px-4 py-6 sm:py-16 flex flex-col items-center justify-center">
				{loading ? (
					<div className="text-gray-600 text-center py-8">
						Loading products...
					</div>
				) : error ? (
					<div className="text-red-500 text-center py-8">{error}</div>
				) : products.length === 0 ? (
					<div className="text-gray-500 text-center py-12 text-lg sm:text-2xl">
						No products found.
					</div>
				) : (
					<div className="w-full container bg-white/90 rounded-xl sm:rounded-3xl shadow-2xl border border-pink-100 flex flex-col items-center p-4 sm:p-10">
						{selected && <ARLipstickTryOn color={selected.color} />}
						{/* Add to Cart button */}
						{selected && (
							<button
								onClick={handleAddToCart}
								className="mt-4 sm:mt-6 mb-2 w-full sm:w-auto px-6 sm:px-8 py-3 bg-pink-500 text-white rounded-full shadow hover:bg-pink-600 transition font-bold text-base sm:text-lg"
							>
								Add to Cart
							</button>
						)}
						{cartMessage && (
							<div className="text-green-600 font-semibold mb-2 text-center text-base sm:text-lg">
								{cartMessage}
							</div>
						)}
						{/* Carousel */}
						<div className="w-full mt-6 sm:mt-10">
							<div className="overflow-x-auto flex gap-4 sm:gap-6 py-3 sm:py-4 px-1 sm:px-2 scrollbar-thin scrollbar-thumb-pink-200">
								{products.map((product, idx) => (
									<button
										key={product.id}
										onClick={() => setSelectedIdx(idx)}
										className={`flex flex-col items-center min-w-[70px] max-w-[70px] sm:min-w-[90px] sm:max-w-[90px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 ${
											selectedIdx === idx
												? "border-pink-500 bg-pink-50 shadow-lg"
												: "border-transparent bg-white/80 hover:bg-pink-100"
										}`}
									>
										<div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-pink-300 overflow-hidden mb-1 sm:mb-2">
											<Image
												src={product.image}
												alt={product.name}
												width={56}
												height={56}
												className="object-cover w-full h-full"
											/>
										</div>
										<div className="text-xs font-semibold text-gray-700 text-center truncate w-full">
											{product.name}
										</div>
										<div
											className="w-6 h-6 rounded-full border-2 border-pink-400 mt-1"
											style={{ background: product.color }}
										/>
									</button>
								))}
							</div>
						</div>
					</div>
				)}
				<Link
					href="/shop"
					className="mt-6 sm:mt-8 w-full sm:w-auto px-6 sm:px-8 py-3 bg-pink-500 text-white rounded-full shadow hover:bg-pink-600 transition font-bold text-base sm:text-lg text-center"
				>
					Back to Shop
				</Link>
			</main>
			<Footer />
		</div>
	);
}

export default function VirtualTryOnPage() {
	return (
		<Suspense>
			<VirtualTryOnContent />
		</Suspense>
	);
}
