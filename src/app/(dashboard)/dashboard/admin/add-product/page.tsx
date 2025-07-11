"use client";
import { useState, useRef, useEffect } from "react";
import { FaSpinner, FaTimes, FaTint } from "react-icons/fa";
import { Input, message } from "antd";
import type { Product as BaseProduct } from "@/app/types/models";
type Product = BaseProduct & { hexColor?: string; colorName?: string };
import "antd/dist/reset.css";
import Image from "next/image";

const lipstickIcon = (
	<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
		<rect width="40" height="40" rx="20" fill="#F9E2E7" />
		<path
			d="M20 8c-2 0-3 2-3 4v8h6v-8c0-2-1-4-3-4zm-5 12v8c0 2 1 4 3 4h4c2 0 3-2 3-4v-8h-10z"
			fill="#E11D48"
		/>
	</svg>
);

export default function AddProductPage() {
	const [name, setName] = useState("");
	const [colorName, setColorName] = useState("");
	const [hexColor, setHexColor] = useState("#E11D48");
	const [price, setPrice] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");
	const [products, setProducts] = useState<Product[]>([]);
	const [shake, setShake] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);
	const [stock, setStock] = useState("");

	useEffect(() => {
		fetch("/api/products")
			.then((res) => res.json())
			.then(setProducts)
			.catch(() => setProducts([]));
	}, []);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImageFile(file);
			setImageUrl(URL.createObjectURL(file));
		}
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file) {
			setImageFile(file);
			setImageUrl(URL.createObjectURL(file));
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const handleRemoveImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setImageFile(null);
		setImageUrl("");
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess(false);
		setUploadProgress(null);
		if (
			!name ||
			!colorName ||
			!hexColor ||
			!price ||
			(!imageUrl && !imageFile)
		) {
			setError("Please fill in all fields and upload an image.");
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return;
		}
		setLoading(true);
		try {
			let finalImageUrl = imageUrl;
			if (imageFile) {
				try {
					// Convert file to base64
					const toBase64 = (file: File) =>
						new Promise<string>((resolve, reject) => {
							const reader = new FileReader();
							reader.readAsDataURL(file);
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = (err) => reject(err);
						});
					setUploadProgress(10);
					const base64 = await toBase64(imageFile);
					setUploadProgress(30);
					// Upload to backend API
					const uploadRes = await fetch("/api/products/upload-image", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ image: base64 }),
					});
					setUploadProgress(70);
					if (!uploadRes.ok) {
						const data = await uploadRes.json();
						throw new Error(data.message || "Cloudinary upload failed");
					}
					const { url } = await uploadRes.json();
					finalImageUrl = url;
					setUploadProgress(100);
				} catch {
					setError(
						"Image upload failed. Please check your network and try again."
					);
					setLoading(false);
					setUploadProgress(null);
					return;
				}
			}
			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					colorName,
					hexColor,
					price,
					imageUrl: finalImageUrl,
					stock,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || "Failed to add lipstick");
			}
			const newProduct = await res.json();
			setProducts((prev) => [newProduct, ...prev]);
			setSuccess(true);
			setName("");
			setColorName("");
			setHexColor("#E11D48");
			setPrice("");
			setImageUrl("");
			setImageFile(null);
			setStock("");
			if (fileInputRef.current) fileInputRef.current.value = "";
			message.success("Lipstick added successfully!");
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to add lipstick. Please try again."
			);
			setShake(true);
			setTimeout(() => setShake(false), 500);
		} finally {
			setLoading(false);
			setUploadProgress(null);
		}
	};

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 flex flex-col items-center justify-center py-4 sm:py-8 animate-fade-in">
			<div className="w-full container max-w-8xl mx-auto pt-4 sm:pt-8 px-2 sm:px-4">
				{/* Inspiration Scroll */}
				<div className="mb-4 sm:mb-8">
					<h2 className="text-xl sm:text-2xl font-bold text-pink-600 mb-2 sm:mb-3 font-serif tracking-tight">
						Existing Lipsticks
					</h2>
					<div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 hide-scrollbar">
						{products.map((p) => (
							<div
								key={p.id}
								className="flex flex-col items-center min-w-[90px] sm:min-w-[110px]"
							>
								<div
									className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center"
									style={{ background: p.hexColor || "#F9E2E7" }}
								>
									<Image
										src={p.imageUrl}
										alt={p.name}
										width={48}
										height={48}
										className="w-full h-full object-cover rounded-full"
									/>
								</div>
								<span className="text-xs text-pink-500 font-semibold mt-1 text-center max-w-[70px] sm:max-w-[90px] truncate">
									{p.name}
								</span>
								<span className="text-[10px] text-gray-400">{p.colorName}</span>
							</div>
						))}
					</div>
				</div>
				{/* Add Lipstick Card */}
				<div
					className={`bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-3 sm:p-6 md:p-8 relative overflow-visible transition-all duration-300 ${
						shake ? "animate-shake" : ""
					}`}
				>
					<span className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-pink-200 via-pink-100 to-rose-100 shadow-lg flex items-center justify-center animate-fade-in-down z-10 border-4 border-white">
						{lipstickIcon}
					</span>
					<h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-pink-700 mb-4 sm:mb-8 text-center mt-20 sm:mt-12 tracking-tight drop-shadow-lg">
						Add New Lipstick
					</h1>
					<div className="flex flex-col md:flex-row gap-4 sm:gap-8 items-start w-full">
						<form
							className="flex flex-col gap-4 sm:gap-6 w-full md:w-1/2"
							onSubmit={handleSubmit}
							autoComplete="off"
						>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500">
									Lipstick Name
								</label>
								<Input
									placeholder="e.g. Velvet Matte Lipstick"
									value={name}
									onChange={(e) => setName(e.target.value)}
									size="large"
									className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white/80"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500">
									Color Name
								</label>
								<Input
									placeholder="e.g. Limuru Pink"
									value={colorName}
									onChange={(e) => setColorName(e.target.value)}
									size="large"
									className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white/80"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500 flex items-center gap-2">
									Hex Color <FaTint className="text-pink-400" />
								</label>
								<div className="flex items-center gap-3">
									<Input
										type="color"
										value={hexColor}
										onChange={(e) => setHexColor(e.target.value)}
										className="w-12 h-12 p-0 border-none bg-transparent cursor-pointer"
										style={{ background: "none" }}
										aria-label="Pick lipstick color"
									/>
									<Input
										placeholder="#E11D48"
										value={hexColor}
										onChange={(e) => setHexColor(e.target.value)}
										size="large"
										className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white/80 w-32"
										required
									/>
								</div>
							</div>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500">Price</label>
								<Input
									prefix={<span className="text-pink-400 font-bold">Ksh</span>}
									placeholder="e.g. 1200"
									value={price}
									onChange={(e) =>
										setPrice(e.target.value.replace(/[^0-9.]/g, ""))
									}
									size="large"
									type="number"
									min="0"
									step="0.01"
									className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white/80"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500">Stock</label>
								<Input
									placeholder="e.g. 100"
									value={stock}
									onChange={(e) =>
										setStock(e.target.value.replace(/[^0-9]/g, ""))
									}
									size="large"
									type="number"
									min="0"
									className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white/80"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="font-semibold text-pink-500">
									Product Image
								</label>
								<div
									className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-200 bg-white/70 border-pink-200 hover:border-pink-400 relative ${
										imageUrl ? "border-green-300" : ""
									}`}
									onClick={() => fileInputRef.current?.click()}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									tabIndex={0}
									role="button"
									aria-label="Upload product image"
								>
									{imageUrl ? (
										<div className="relative">
											<Image
												src={imageUrl}
												alt="Preview"
												width={128}
												height={128}
												className="w-32 h-32 object-cover rounded-xl mb-2 border border-pink-200 shadow"
											/>
											<button
												type="button"
												onClick={handleRemoveImage}
												className="absolute -top-2 -right-2 bg-white border border-pink-200 rounded-full p-1 shadow hover:bg-pink-100 transition"
												aria-label="Remove image"
											>
												<FaTimes className="text-pink-400 text-lg" />
											</button>
										</div>
									) : (
										<div className="flex flex-col items-center">
											<span className="mb-2">{lipstickIcon}</span>
											<span className="text-pink-300 text-lg mb-2">
												Drag & drop or click to upload
											</span>
										</div>
									)}
									{uploadProgress !== null && (
										<div className="text-pink-500 text-center font-semibold animate-fade-in mt-2">
											Uploading image: {uploadProgress}%
										</div>
									)}
									<input
										type="file"
										accept="image/*"
										ref={fileInputRef}
										className="hidden"
										onChange={handleImageChange}
									/>
								</div>
							</div>
							{error && (
								<div className="text-red-500 text-center font-semibold animate-fade-in mt-2">
									{error}
								</div>
							)}
							{success && (
								<div className="text-green-600 text-center font-semibold animate-fade-in mt-2">
									Lipstick added successfully!
								</div>
							)}
							<button
								type="submit"
								disabled={loading}
								className={`w-full mt-2 px-8 py-4 rounded-full shadow-2xl font-bold text-lg transition-all duration-150 ${
									loading
										? "bg-gray-300 text-gray-500 cursor-not-allowed"
										: "bg-gradient-to-r from-pink-500 to-pink-400 text-white hover:from-pink-600 hover:to-pink-500 border-2 border-pink-200 hover:border-pink-400"
								}`}
							>
								{loading ? (
									<span className="flex items-center justify-center gap-2">
										<FaSpinner className="animate-spin" /> Adding Lipstick...
									</span>
								) : (
									"Add Lipstick"
								)}
							</button>
						</form>
						{/* Live Preview Card - now on the right on desktop */}
						<div className="w-full md:w-1/2 flex flex-col items-center justify-start mt-8 md:mt-0 md:ml-8">
							<h3 className="text-lg font-bold text-pink-500 mb-2 font-serif">
								Live Preview
							</h3>
							<div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-4 flex flex-col items-center w-full max-w-xs mx-auto animate-fade-in">
								<div
									className="w-20 h-20 rounded-full border-4 border-pink-200 overflow-hidden shadow-lg bg-white flex items-center justify-center mb-3"
									style={{ background: hexColor }}
								>
									{imageUrl ? (
										<Image
											src={imageUrl}
											alt="Preview"
											width={80}
											height={80}
											className="object-cover w-full h-full"
										/>
									) : (
										lipstickIcon
									)}
								</div>
								<div className="text-xl font-bold text-gray-800 mb-1 text-center font-serif">
									{name || "Lipstick Name"}
								</div>
								<div className="text-pink-500 font-semibold mb-1 text-center">
									{colorName || "Color Name"}
								</div>
								<div className="text-gray-500 text-sm mb-1">{hexColor}</div>
								<div className="text-pink-600 font-bold text-lg">
									{price ? `Ksh ${parseInt(price).toLocaleString()}` : "Ksh 0"}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<style>{`.hide-scrollbar::-webkit-scrollbar{display:none}.animate-shake{animation:shake 0.3s}@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}`}</style>
		</div>
	);
}
