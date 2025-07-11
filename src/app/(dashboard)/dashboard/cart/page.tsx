"use client";
import { Table, Empty, Input, Tooltip, Button } from "antd";
import "antd/dist/reset.css";
import { FaShoppingCart } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import { getAuth } from "firebase/auth";
import type { CartItem, Product } from "../../../types/models";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { handlePaystackPayment } from "@/app/paystackHandler";
import {
	FaMapMarkerAlt,
	FaLocationArrow,
	FaSpinner,
	FaPhoneAlt,
} from "react-icons/fa";

function formatDate(dateString: string) {
	const date = new Date(dateString);
	const day = date.getDate();
	const month = date.toLocaleString("default", { month: "long" });
	const year = date.getFullYear();
	// Get ordinal suffix
	const j = day % 10,
		k = day % 100;
	let suffix = "th";
	if (j === 1 && k !== 11) suffix = "st";
	else if (j === 2 && k !== 12) suffix = "nd";
	else if (j === 3 && k !== 13) suffix = "rd";
	return `${day}${suffix} ${month}, ${year}`;
}

export default function CartPage() {
	const [cart, setCart] = useState<(CartItem & Partial<Product>)[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [checkoutMessage, setCheckoutMessage] = useState("");
	const [deliveryLocation, setDeliveryLocation] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [locating, setLocating] = useState(false);
	const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
	const router = useRouter();

	// Refresh cart from backend and merge product info
	async function refreshCart() {
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) return;
			const idToken = await user.getIdToken();
			const cartRes = await fetch("/api/cart", {
				headers: { Authorization: `Bearer ${idToken}` },
			});
			if (cartRes.ok) {
				const cartData: CartItem[] = await cartRes.json();
				const productsRes = await fetch("/api/products");
				if (productsRes.ok) {
					const products: Product[] = await productsRes.json();
					const merged = cartData.map((item) => {
						const prod = products.find((p) => p.id === item.productId);
						return {
							...item,
							name: prod?.name,
							imageUrl: prod?.imageUrl,
							price: prod?.price,
						};
					});
					setCart(merged);
				}
			}
		} catch {}
	}

	// Update quantity handler (now inside component)
	async function handleUpdateQuantity(productId: string, newQuantity: number) {
		if (newQuantity < 1) return;
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) return;
			const idToken = await user.getIdToken();
			await fetch("/api/cart", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify({ productId, quantity: newQuantity }),
			});
			await refreshCart();
		} catch {}
	}

	const columns = [
		{
			title: "Product",
			dataIndex: "name",
			key: "name",
			render: (value: string, record: CartItem & Partial<Product>) => (
				<div className="flex items-center gap-3">
					{record.imageUrl && (
						<Image
							src={record.imageUrl}
							alt={value}
							width={40}
							height={40}
							className="w-10 h-10 rounded-full border border-pink-200 object-cover"
						/>
					)}
					<span>{value || record.productId}</span>
				</div>
			),
		},
		{
			title: "Price",
			dataIndex: "price",
			key: "price",
			render: (value: number) =>
				value ? `Ksh ${value.toLocaleString()}` : "-",
		},
		{
			title: "Quantity",
			dataIndex: "quantity",
			key: "quantity",
			render: (value: number, record: CartItem & Partial<Product>) => (
				<div className="flex items-center gap-2">
					<Button
						size="small"
						onClick={() =>
							handleUpdateQuantity(record.productId, record.quantity - 1)
						}
						disabled={record.quantity <= 1}
					>
						-
					</Button>
					<span>{value}</span>
					<Button
						size="small"
						onClick={() =>
							handleUpdateQuantity(record.productId, record.quantity + 1)
						}
					>
						+
					</Button>
				</div>
			),
		},
		{
			title: "Added At",
			dataIndex: "addedAt",
			key: "addedAt",
			render: (value: string) => formatDate(value),
		},
	];

	useEffect(() => {
		async function fetchCartAndProducts() {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) {
					setError("Please login to view your cart.");
					setLoading(false);
					return;
				}
				const idToken = await user.getIdToken();
				const cartRes = await fetch("/api/cart", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (!cartRes.ok) {
					const data = await cartRes.json();
					throw new Error(data.error || data.message || "Failed to fetch cart");
				}
				const cartData: CartItem[] = await cartRes.json();
				if (cartData.length === 0) {
					setCart([]);
					setLoading(false);
					return;
				}
				// Fetch all products
				const productsRes = await fetch("/api/products");
				if (!productsRes.ok) {
					const data = await productsRes.json();
					throw new Error(
						data.error || data.message || "Failed to fetch products"
					);
				}
				const products: Product[] = await productsRes.json();
				// Merge product info into cart
				const merged = cartData.map((item) => {
					const prod = products.find((p) => p.id === item.productId);
					return {
						...item,
						name: prod?.name,
						imageUrl: prod?.imageUrl,
						price: prod?.price,
					};
				});
				setCart(merged);
			} catch (err: unknown) {
				if (err instanceof Error) setError(err.message);
				else setError("Error fetching cart");
			} finally {
				setLoading(false);
			}
		}
		fetchCartAndProducts();
	}, []);

	async function handleCheckout() {
		setCheckoutLoading(true);
		setCheckoutMessage("");
		try {
			const auth = getAuth();
			const user = auth.currentUser;
			if (!user) {
				setCheckoutMessage("Please login to checkout.");
				setCheckoutLoading(false);
				return;
			}
			if (!deliveryLocation || !phoneNumber) {
				setCheckoutMessage(
					"Please provide delivery location and phone number."
				);
				setCheckoutLoading(false);
				return;
			}
			if (!user.email) {
				setCheckoutMessage("User email is required for payment.");
				setCheckoutLoading(false);
				return;
			}
			const idToken = await user.getIdToken();
			const orderItems = cart.map((item) => ({
				productId: item.productId,
				quantity: item.quantity,
				priceAtPurchase: item.price || 0,
				name: item.name,
				imageUrl: item.imageUrl,
			}));
			const subtotal = orderItems.reduce(
				(sum, item) => sum + item.priceAtPurchase * item.quantity,
				0
			);
			const vat = Math.round(subtotal * 0.16);
			const deliveryFee = cart.length > 0 ? 250 : 0;
			const total = subtotal + vat + deliveryFee;
			// Call Paystack handler (to be implemented)
			await handlePaystackPayment({
				amount: total,
				phoneNumber,
				deliveryLocation,
				orderItems,
				user: { email: user.email! },
				idToken,
				// Include all metadata for order/payment
				subtotal,
				vat,
				deliveryFee,
			});
			// Clear cart in backend after successful order
			await fetch("/api/cart", {
				method: "DELETE",
				headers: { Authorization: `Bearer ${idToken}` },
			});
			// Success message and reset
			setCheckoutMessage("Order placed successfully!");
			setCart([]);
			setDeliveryLocation("");
			setPhoneNumber("");
			setTimeout(() => {
				setCheckoutMessage("");
				router.push("/dashboard/orders");
			}, 1500);
		} catch (err: unknown) {
			if (err instanceof Error) setCheckoutMessage(err.message);
			else setCheckoutMessage("Checkout failed");
		} finally {
			setCheckoutLoading(false);
		}
	}

	async function handleUseMyLocation() {
		if (!navigator.geolocation) {
			setCheckoutMessage("Geolocation is not supported by your browser.");
			return;
		}
		setLocating(true);
		setCheckoutMessage("");
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const { latitude, longitude } = position.coords;
				try {
					const res = await fetch(
						`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
					);
					const data = await res.json();
					if (data && data.display_name) {
						setDeliveryLocation(data.display_name);
					} else {
						setCheckoutMessage("Could not determine address from location.");
					}
				} catch {
					setCheckoutMessage("Failed to fetch address from location.");
				} finally {
					setLocating(false);
				}
			},
			() => {
				setCheckoutMessage("Unable to retrieve your location.");
				setLocating(false);
			}
		);
	}

	async function fetchLocationSuggestions(query: string) {
		if (!query || query.length < 3) {
			setLocationSuggestions([]);
			return;
		}
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
					query
				)}&addressdetails=1&limit=5`
			);
			const data = await res.json();
			if (Array.isArray(data)) {
				setLocationSuggestions(
					data.map((item: { display_name: string }) => item.display_name)
				);
			} else {
				setLocationSuggestions([]);
			}
		} catch {
			setLocationSuggestions([]);
		}
	}

	function handleLocationInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value;
		setDeliveryLocation(value);
		setShowSuggestions(true);
		if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		debounceTimeout.current = setTimeout(() => {
			fetchLocationSuggestions(value);
		}, 350);
	}

	function handleSuggestionClick(suggestion: string) {
		setDeliveryLocation(suggestion);
		setShowSuggestions(false);
		setLocationSuggestions([]);
	}

	function handleLocationBlur() {
		setTimeout(() => setShowSuggestions(false), 150); // allow click
	}

	// Calculate summary values
	const subtotal = cart.reduce(
		(sum, item) => sum + (item.price || 0) * item.quantity,
		0
	);
	const vat = Math.round(subtotal * 0.16);
	// DST is only for non-resident digital providers. Uncomment if needed.
	// const dst = Math.round(subtotal * 0.015);
	const deliveryFee = cart.length > 0 ? 250 : 0;
	const total = subtotal + vat + deliveryFee; // + dst if DST applies

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 flex items-start justify-center py-8">
			<div className="w-full container max-w-8xl mx-auto pt-12 px-4">
				<div className="flex flex-col items-center mb-8">
					<span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-pink-200 via-pink-100 to-rose-100 shadow-lg mb-4">
						<FaShoppingCart className="text-pink-400 text-4xl" />
					</span>
					<h2 className="text-3xl font-extrabold text-pink-600 mb-1 tracking-tight">
						Your Cart
					</h2>
				</div>
				<div className="w-full bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-6">
					{loading ? (
						<div className="text-center py-8 text-lg text-pink-500 font-semibold">
							Loading cart...
						</div>
					) : error ? (
						<div className="text-center py-8 text-lg text-red-500 font-semibold">
							{error}
						</div>
					) : cart.length === 0 ? (
						<Empty
							image={Empty.PRESENTED_IMAGE_SIMPLE}
							description={
								<span className="text-gray-500 text-lg">
									Your cart is empty. Add some lipstick to your cart!
								</span>
							}
						/>
					) : (
						<div className="flex flex-col md:flex-row gap-8 items-start justify-center">
							{/* Left: Cart Table */}
							<div className="w-full md:w-2/3">
								<div className="w-full overflow-x-auto">
									<Table
										columns={columns}
										dataSource={cart}
										pagination={false}
										rowKey="productId"
										className="rounded-xl overflow-hidden min-w-[600px]"
									/>
								</div>
							</div>
							{/* Right: Premium Checkout Card */}
							<div
								className="w-full md:w-1/3 max-w-md mx-auto bg-white/60 backdrop-blur-lg border border-pink-200 rounded-3xl shadow-2xl p-8 flex flex-col gap-8 relative"
								style={{ boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)" }}
							>
								<h3 className="text-2xl font-bold text-pink-600 flex items-center gap-2 mb-2">
									<FaMapMarkerAlt className="text-pink-400" /> Checkout
								</h3>
								{/* Summary Section */}
								<div className="mb-4 bg-white/80 rounded-2xl p-4 border border-pink-100 shadow flex flex-col gap-2">
									<div className="flex justify-between text-base font-medium text-gray-700">
										<span>Subtotal</span>
										<span>Ksh {subtotal.toLocaleString()}</span>
									</div>
									<div className="flex justify-between text-base text-gray-700">
										<span>VAT (16%)</span>
										<span>Ksh {vat.toLocaleString()}</span>
									</div>
									{/* DST is for non-resident digital providers only. Uncomment if needed. */}
									{/*
									<div className="flex justify-between text-base text-gray-700">
										<span>Digital Service Tax (DST) 1.5%</span>
										<span>Ksh {dst.toLocaleString()}</span>
									</div>
									*/}
									<div className="flex justify-between text-base text-gray-700">
										<span>Delivery Fee</span>
										<span>Ksh {deliveryFee.toLocaleString()}</span>
									</div>
									<hr className="my-1 border-pink-100" />
									<div className="flex justify-between text-lg font-bold text-pink-600">
										<span>Total</span>
										<span>Ksh {total.toLocaleString()}</span>
									</div>
								</div>
								{/* End Summary Section */}
								<div className="flex flex-col gap-3">
									<label className="font-semibold text-pink-500">
										Delivery Location
									</label>
									<div className="flex gap-2 items-center relative">
										<span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none">
											<FaMapMarkerAlt />
										</span>
										<Input
											placeholder="Enter delivery location"
											value={deliveryLocation}
											onChange={handleLocationInputChange}
											onFocus={() =>
												deliveryLocation.length > 2 && setShowSuggestions(true)
											}
											onBlur={handleLocationBlur}
											className="flex-1 pl-12 py-3 rounded-2xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 text-base transition shadow-sm bg-white/80"
										/>
										{showSuggestions && locationSuggestions.length > 0 && (
											<ul className="absolute z-50 left-0 right-0 top-full mt-2 bg-white/90 backdrop-blur-md border border-pink-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto text-base animate-fade-in transition-all duration-200">
												{locationSuggestions.map((suggestion, idx) => (
													<li
														key={idx}
														onMouseDown={() =>
															handleSuggestionClick(suggestion)
														}
														className="px-5 py-3 cursor-pointer hover:bg-pink-100 hover:font-bold rounded-xl mb-1 last:mb-0 transition-all duration-150 text-gray-700"
													>
														{suggestion}
													</li>
												))}
											</ul>
										)}
										<Tooltip title="Use My Location" placement="top">
											<button
												type="button"
												disabled={locating}
												onClick={handleUseMyLocation}
												className={`flex items-center justify-center w-12 h-12 rounded-full bg-pink-200 text-pink-700 font-bold shadow transition-all duration-150 border border-pink-100 hover:bg-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-60 disabled:cursor-not-allowed ml-2`}
											>
												{locating ? (
													<FaSpinner className="animate-spin text-lg" />
												) : (
													<FaLocationArrow className="text-lg" />
												)}
											</button>
										</Tooltip>
									</div>
								</div>
								<hr className="my-2 border-pink-100" />
								<div className="flex flex-col gap-3">
									<label className="font-semibold text-pink-500">
										Phone Number
									</label>
									<div className="relative">
										<span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none">
											<FaPhoneAlt />
										</span>
										<Input
											placeholder="Enter phone number"
											value={phoneNumber}
											onChange={(e) => setPhoneNumber(e.target.value)}
											className="pl-12 py-3 rounded-2xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 text-base transition shadow-sm bg-white/80"
										/>
									</div>
								</div>
								<button
									disabled={checkoutLoading}
									onClick={handleCheckout}
									className={`w-full mt-6 px-8 py-5 rounded-full shadow-2xl font-bold text-xl transition-all duration-150 ${
										checkoutLoading
											? "bg-gray-300 text-gray-500 cursor-not-allowed"
											: "bg-gradient-to-r from-pink-500 to-pink-400 text-white hover:from-pink-600 hover:to-pink-500"
									}`}
								>
									{checkoutLoading ? (
										<span className="flex items-center justify-center gap-2">
											<FaSpinner className="animate-spin" /> Processing...
										</span>
									) : (
										"Checkout"
									)}
								</button>
								{checkoutMessage && (
									<div
										className={`mt-2 text-center font-semibold ${
											checkoutMessage.includes("success")
												? "text-green-600"
												: "text-red-500"
										}`}
									>
										{checkoutMessage}
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
