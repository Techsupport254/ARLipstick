/**
 * AR Lipstick Utilities
 *
 * This module handles all the core functionality for the AR lipstick try-on feature.
 * It includes camera setup, face landmark detection, color conversion utilities,
 * and the main lipstick rendering logic.
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

// Type definition for 2D landmark points
export type Landmark = { x: number; y: number };

/**
 * Sets up the user's camera for video capture
 *
 * Requests camera permissions and initializes the video stream with
 * a standard resolution of 320x240 pixels for optimal performance.
 *
 * @param videoRef - React ref to the video element
 * @returns Promise that resolves to true if camera setup succeeds, false otherwise
 */
export async function setupCamera(
	videoRef: React.RefObject<HTMLVideoElement | null>
): Promise<boolean> {
	try {
		// Request camera access with specific dimensions
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { width: 320, height: 240 },
		});

		// Attach the stream to the video element
		if (videoRef.current) {
			videoRef.current.srcObject = stream;
		}
		return true;
	} catch (error) {
		// Camera access denied or other error
		console.warn("Camera setup failed:", error);
		return false;
	}
}

/**
 * Loads and initializes the MediaPipe face landmark detection model
 *
 * Downloads the pre-trained face landmark model from Google's CDN and
 * configures it for real-time video processing.
 *
 * @returns Promise that resolves to a configured FaceLandmarker instance
 */
export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
	// Load the MediaPipe vision tasks library
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
	);

	// Create and configure the face landmark detector
	return await FaceLandmarker.createFromOptions(vision, {
		baseOptions: {
			// Use the optimized float16 model for better performance
			modelAssetPath:
				"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
		},
		runningMode: "VIDEO", // Optimized for continuous video processing
	});
}

/**
 * Detects facial landmarks from the current video frame
 *
 * Captures the current video frame, processes it through the face landmark
 * detector, and returns the detected facial keypoints in pixel coordinates.
 *
 * @param faceLandmarker - Initialized MediaPipe face landmark detector
 * @param videoRef - React ref to the video element
 * @returns Array of landmark coordinates or null if no face detected
 */
export function detectLandmarks(
	faceLandmarker: FaceLandmarker,
	videoRef: React.RefObject<HTMLVideoElement | null>
): Landmark[] | null {
	// Check if video is ready and playing
	if (!videoRef.current || videoRef.current.readyState !== 4) return null;

	const video = videoRef.current;
	const width = video.videoWidth;
	const height = video.videoHeight;

	// Create offscreen canvas for processing
	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const offCtx = offscreen.getContext("2d", { willReadFrequently: true });

	// Draw current video frame to canvas
	offCtx!.drawImage(video, 0, 0, width, height);

	// Run face detection on the frame
	const results = faceLandmarker.detectForVideo(offscreen, performance.now());

	// Extract landmarks if face detected
	if (results.faceLandmarks && results.faceLandmarks.length > 0) {
		// Convert normalized coordinates (0-1) to pixel coordinates
		return results.faceLandmarks[0].map((kp: { x: number; y: number }) => ({
			x: kp.x * width,
			y: kp.y * height,
		}));
	}
	return null;
}

/**
 * Linear interpolation between two values
 *
 * Smoothly transitions between value a and b based on interpolation factor t.
 * Used for smoothing landmark movements to reduce jitter.
 *
 * @param a - Starting value
 * @param b - Ending value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/**
 * Color processing utilities for lipstick rendering
 *
 * Simplified color blending that directly applies the target lipstick color
 * to the detected lip area without excessive color space conversions.
 */

/**
 * Renders virtual lipstick on the user's lips in real-time
 *
 * This is the core function that applies lipstick color to the detected lip area.
 * It uses advanced computer vision techniques to:
 * - Detect and track lip contours using facial landmarks
 * - Create smooth, natural-looking lip shapes
 * - Apply realistic color blending that preserves skin texture
 * - Add appropriate lighting and finish effects (matte/gloss)
 *
 * @param canvasRef - React ref to the canvas element for rendering
 * @param prevLandmarks - Previous frame's landmark positions for smoothing
 * @param targetLandmarks - Current frame's detected landmark positions
 * @param lipColor - Hex color string for the lipstick (e.g., "#FF0000")
 * @param SMOOTHING - Interpolation factor for landmark smoothing (0-1)
 * @param finish - Lipstick finish type: "matte" or "gloss"
 */
export function renderLipstick(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	prevLandmarks: { x: number; y: number }[] | null,
	targetLandmarks: { x: number; y: number }[] | null,
	lipColor: string,
	SMOOTHING: number,
	finish: "matte" | "gloss" = "matte"
) {
	// Validate inputs and get canvas context
	if (
		!canvasRef.current ||
		!prevLandmarks ||
		!targetLandmarks ||
		prevLandmarks.length !== targetLandmarks.length
	) {
		return;
	}

	const mainCanvas = canvasRef.current;
	const ctx = mainCanvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return;

	// Apply smoothing to reduce jitter in landmark tracking
	prevLandmarks.forEach((landmark, idx) => {
		landmark.x = lerp(landmark.x, targetLandmarks[idx].x, SMOOTHING);
		landmark.y = lerp(landmark.y, targetLandmarks[idx].y, SMOOTHING);
	});
	const keypoints = prevLandmarks;

	// Define lip contour landmark indices for MediaPipe face mesh
	// These indices correspond to specific points around the outer and inner lip edges
	const denseOuterLip = [
		61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
		181, 91, 146, 61,
	];
	const denseInnerLip = [
		78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14,
		87, 178, 88, 95, 78,
	];

	/**
	 * Catmull-Rom spline interpolation for creating smooth lip contours
	 *
	 * This function creates smooth curves between discrete landmark points
	 * by interpolating additional points using cubic spline mathematics.
	 * This results in natural-looking lip shapes instead of jagged polygons.
	 *
	 * @param points - Array of landmark points to interpolate
	 * @param numPoints - Number of interpolated points to generate per segment
	 * @returns Array of smooth interpolated points
	 */
	function catmullRomSpline(
		points: { x: number; y: number }[],
		numPoints: number = 100
	): { x: number; y: number }[] {
		// Cubic interpolation function using Catmull-Rom formula
		function interpolate(
			p0: number,
			p1: number,
			p2: number,
			p3: number,
			t: number
		): number {
			return (
				0.5 *
				(2 * p1 +
					(-p0 + p2) * t +
					(2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
					(-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
			);
		}

		const result: { x: number; y: number }[] = [];

		// Interpolate between each pair of points
		for (let i = 0; i < points.length - 1; i++) {
			// Get control points for smooth interpolation
			const p0 = points[i === 0 ? 0 : i - 1];
			const p1 = points[i];
			const p2 = points[i + 1 < points.length ? i + 1 : i];
			const p3 =
				points[
					i + 2 < points.length ? i + 2 : i + 1 < points.length ? i + 1 : i
				];

			// Generate interpolated points along this segment
			for (let t = 0; t < 1; t += 1 / numPoints) {
				result.push({
					x: interpolate(p0.x, p1.x, p2.x, p3.x, t),
					y: interpolate(p0.y, p1.y, p2.y, p3.y, t),
				});
			}
		}
		return result;
	}

	// Create a separate canvas for the lip mask
	// This allows us to create complex shapes and apply effects independently
	const maskCanvas = document.createElement("canvas");
	maskCanvas.width = mainCanvas.width;
	maskCanvas.height = mainCanvas.height;
	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
	if (!maskCtx) return;

	// Clear the mask canvas
	maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

	// Create a copy of keypoints for adjustments
	const adjustedKeypoints = keypoints.map((kp) => ({
		x: kp.x,
		y: kp.y,
	}));

	// Fine-tune corner positions for more natural lip shapes
	// These small adjustments help create better-looking lip contours
	const cornerOffset = 1;
	const upOffset = 0;
	if (adjustedKeypoints[61]) {
		adjustedKeypoints[61].x -= cornerOffset;
		adjustedKeypoints[61].y -= upOffset;
	}
	if (adjustedKeypoints[291]) {
		adjustedKeypoints[291].x += cornerOffset;
		adjustedKeypoints[291].y -= upOffset;
	}

	// Extract lip contour points and create smooth curves
	const outerPoints = denseOuterLip.map((idx) => adjustedKeypoints[idx]);
	const innerPoints = denseInnerLip.map((idx) => adjustedKeypoints[idx]);
	const smoothOuter = catmullRomSpline(outerPoints, 60);
	const smoothInner = catmullRomSpline(innerPoints, 60);

	// Draw lip mask
	maskCtx.save();
	maskCtx.beginPath();

	// Trace outer contour
	for (let j = 0; j < smoothOuter.length; j++) {
		const kp = smoothOuter[j];
		if (j === 0) {
			maskCtx.moveTo(kp.x, kp.y);
		} else {
			maskCtx.lineTo(kp.x, kp.y);
		}
	}

	// At the right corner, jump to the corresponding inner point (sharp V)
	const rightInner = smoothInner[smoothInner.length - 1];
	maskCtx.lineTo(rightInner.x, rightInner.y);

	// Trace inner contour in reverse
	for (let j = smoothInner.length - 2; j >= 0; j--) {
		const kp = smoothInner[j];
		maskCtx.lineTo(kp.x, kp.y);
	}

	// At the left corner, close the V
	const leftOuter = smoothOuter[0];
	maskCtx.lineTo(leftOuter.x, leftOuter.y);
	maskCtx.closePath();

	maskCtx.fillStyle = "#fff";
	maskCtx.shadowColor = "#fff";
	maskCtx.shadowBlur = 6;
	maskCtx.globalAlpha = 0.85;
	maskCtx.fill("evenodd");
	maskCtx.restore();

	// Create feathered mask
	const featheredMaskCanvas = document.createElement("canvas");
	featheredMaskCanvas.width = maskCanvas.width;
	featheredMaskCanvas.height = maskCanvas.height;
	const featheredMaskCtx = featheredMaskCanvas.getContext("2d", {
		willReadFrequently: true,
	});
	if (!featheredMaskCtx) return;

	featheredMaskCtx.drawImage(maskCanvas, 0, 0);
	featheredMaskCtx.globalCompositeOperation = "source-in";
	featheredMaskCtx.filter = "blur(4px)";
	featheredMaskCtx.drawImage(maskCanvas, 0, 0);
	featheredMaskCtx.filter = "none";
	featheredMaskCtx.globalAlpha = 0.85;
	featheredMaskCtx.globalCompositeOperation = "source-in";
	featheredMaskCtx.fillStyle = lipColor;
	featheredMaskCtx.fillRect(
		0,
		0,
		featheredMaskCanvas.width,
		featheredMaskCanvas.height
	);
	featheredMaskCtx.globalAlpha = 1.0;
	featheredMaskCtx.globalCompositeOperation = "source-over";

	// Clear main canvas and draw video frame
	ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

	// Draw the current video frame to the canvas
	const video = document.querySelector("video") as HTMLVideoElement;
	if (!video || video.readyState !== 4) {
		// If video is not ready, just return without rendering
		return;
	}

	ctx.drawImage(video, 0, 0, mainCanvas.width, mainCanvas.height);

	// Get frame data for pixel manipulation
	const frame = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
	const maskData = maskCtx.getImageData(
		0,
		0,
		mainCanvas.width,
		mainCanvas.height
	);

	// Parse lipColor to RGB
	const hex = lipColor.replace("#", "");
	const targetR = parseInt(hex.substring(0, 2), 16);
	const targetG = parseInt(hex.substring(2, 4), 16);
	const targetB = parseInt(hex.substring(4, 6), 16);

	// Simple color blending without excessive processing
	for (let j = 0; j < maskData.data.length; j += 4) {
		const alpha = maskData.data[j + 3] / 255;
		if (alpha > 0.05) {
			// Simple alpha blending with the target color
			const blendFactor = Math.min(1, alpha * 0.9);

			frame.data[j] = Math.round(
				targetR * blendFactor + frame.data[j] * (1 - blendFactor)
			);
			frame.data[j + 1] = Math.round(
				targetG * blendFactor + frame.data[j + 1] * (1 - blendFactor)
			);
			frame.data[j + 2] = Math.round(
				targetB * blendFactor + frame.data[j + 2] * (1 - blendFactor)
			);
		}
	}

	ctx.putImageData(frame, 0, 0);

	// Enhanced gloss highlight for 'gloss' finish
	if (finish === "gloss") {
		ctx.save();
		ctx.globalAlpha = 0.22;
		ctx.globalCompositeOperation = "lighter";
		ctx.beginPath();

		// Draw a highlight arc along the upper lip
		const highlight = smoothOuter.slice(10, 30);
		for (let k = 0; k < highlight.length; k++) {
			const kp = highlight[k];
			if (k === 0) ctx.moveTo(kp.x, kp.y - 5);
			else ctx.lineTo(kp.x, kp.y - 5);
		}

		ctx.lineWidth = 8;
		ctx.strokeStyle = "#fff";
		ctx.shadowColor = "#fff";
		ctx.shadowBlur = 12;
		ctx.stroke();
		ctx.restore();
	}
}

/**
 * Starts the AR lipstick try-on experience
 *
 * This function initializes the complete AR pipeline:
 * 1. Sets up camera access and video stream
 * 2. Loads the face landmark detection model
 * 3. Starts a continuous rendering loop that:
 *    - Detects facial landmarks in real-time
 *    - Applies lipstick color to detected lips
 *    - Handles face tracking and smoothing
 *
 * @param videoEl - Video element for camera input
 * @param canvasEl - Canvas element for AR rendering
 * @param color - Hex color string for the lipstick
 * @returns Cleanup function to stop the AR experience
 */
export async function startLipstickAR(
	videoEl: HTMLVideoElement,
	canvasEl: HTMLCanvasElement,
	color: string
) {
	console.log("AR: Starting with color:", color);

	// Initialize camera and face detection
	await setupCamera({ current: videoEl });
	const faceLandmarker = await loadFaceLandmarker();

	// State variables for tracking and smoothing
	let prevLandmarks: Landmark[] | null = null;
	const SMOOTHING = 0.5; // Controls how much smoothing is applied
	let running = true;
	let currentColor = color;

	// Function to update color dynamically
	const updateColor = (newColor: string) => {
		console.log("AR: Updating color from", currentColor, "to", newColor);
		currentColor = newColor;
	};

	/**
	 * Main rendering loop - runs continuously at 60fps
	 *
	 * This function handles the real-time AR rendering:
	 * - Detects facial landmarks in each frame
	 * - Applies lipstick color to detected lips
	 * - Clears canvas when no face is detected
	 * - Maintains smooth tracking between frames
	 */
	async function render() {
		if (!running) return;

		// Detect landmarks in current frame
		const landmarks = detectLandmarks(faceLandmarker, { current: videoEl });

		if (landmarks) {
			// Initialize previous landmarks if this is the first detection
			if (!prevLandmarks) prevLandmarks = landmarks;

			// Render lipstick on detected lips
			renderLipstick(
				{ current: canvasEl },
				prevLandmarks,
				landmarks,
				currentColor,
				SMOOTHING,
				"matte"
			);

			// Store current landmarks for next frame smoothing
			prevLandmarks = landmarks;
		} else {
			// No face detected - clear the canvas
			const ctx = canvasEl.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
			}
		}

		// Schedule next frame
		requestAnimationFrame(render);
	}

	// Start the rendering loop
	render();

	// Return cleanup function and color update function
	return {
		stop: () => {
			running = false;
		},
		updateColor: updateColor,
	};
}
