"use client";

import React, { useRef, useEffect, useState } from "react";
import { startLipstickAR } from "../../../ar/arUtils";

interface ARLipstickTryOnProps {
	color?: string;
}

export default function ARLipstickTryOn({
	color = "#00FF00",
}: ARLipstickTryOnProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [arError, setArError] = useState<string>("");
	const [isArLoading, setIsArLoading] = useState(true);
	const arRef = useRef<{ stop: () => void } | undefined>();

	// Sync canvas size with video resolution
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
		syncCanvasSize();

		return () => {
			video.removeEventListener("loadedmetadata", syncCanvasSize);
		};
	}, []);

	useEffect(() => {
		let isStarting = false;

		async function startAR() {
			if (videoRef.current && canvasRef.current && !isStarting) {
				try {
					isStarting = true;
					setIsArLoading(true);
					setArError("");

					if (arRef.current) {
						arRef.current.stop();
						arRef.current = undefined;
						await new Promise((resolve) => setTimeout(resolve, 200));
					}

					const arSystem = await startLipstickAR(
						videoRef.current,
						canvasRef.current,
						color
					);

					arRef.current = arSystem;
					setIsArLoading(false);
				} catch (error) {
					console.error("AR Error:", error);
					setArError("Failed to start AR. Please check camera permissions.");
					setIsArLoading(false);
				} finally {
					isStarting = false;
				}
			}
		}

		startAR();

		return () => {
			if (arRef.current) {
				arRef.current.stop();
				arRef.current = undefined;
			}
		};
	}, [color]); // Re-run when color changes

	return (
		<div className="relative w-full max-w-3xl flex items-center justify-center bg-gradient-to-br from-pink-100 via-white to-purple-100 rounded-xl sm:rounded-2xl border border-pink-200 shadow-lg overflow-hidden mb-6 sm:mb-8 min-h-[220px] sm:min-h-[320px]">
			<video
				ref={videoRef}
				className="w-full h-full object-contain bg-black absolute inset-0 opacity-0 pointer-events-none"
				autoPlay
				muted
				playsInline
			/>
			<canvas
				ref={canvasRef}
				className="w-full h-full object-contain bg-black rounded-xl sm:rounded-2xl"
			/>

			{/* Loading Overlay */}
			{isArLoading && (
				<div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl sm:rounded-2xl">
					<div className="text-white text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
						<p className="text-sm">Starting AR...</p>
					</div>
				</div>
			)}

			{/* Color Indicator */}
			{!isArLoading && (
				<div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/80 text-green-600 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold shadow">
					Color: {color}
				</div>
			)}

			{/* Error Overlay */}
			{arError && (
				<div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl sm:rounded-2xl">
					<div className="text-white text-center p-4">
						<p className="text-sm mb-2">{arError}</p>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 bg-pink-500 text-white rounded-full text-sm hover:bg-pink-600 transition"
						>
							Retry
						</button>
					</div>
				</div>
			)}

			<div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/70 text-pink-600 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-semibold shadow">
				Live Camera
			</div>
		</div>
	);
}
