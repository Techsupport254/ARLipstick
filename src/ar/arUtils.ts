// arUtils.ts
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export type Landmark = { x: number; y: number };

export async function setupCamera(
	videoRef: React.RefObject<HTMLVideoElement | null>
): Promise<boolean> {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { width: 320, height: 240 },
		});
		if (videoRef.current) {
			videoRef.current.srcObject = stream;
		}
		return true;
	} catch {
		return false;
	}
}

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
	);
	return await FaceLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath:
				"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
		},
		runningMode: "VIDEO",
	});
}

export function detectLandmarks(
	faceLandmarker: FaceLandmarker,
	videoRef: React.RefObject<HTMLVideoElement | null>
): Landmark[] | null {
	if (!videoRef.current || videoRef.current.readyState !== 4) return null;
	const video = videoRef.current;
	const width = video.videoWidth;
	const height = video.videoHeight;
	const offscreen = document.createElement("canvas");
	offscreen.width = width;
	offscreen.height = height;
	const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
	offCtx!.drawImage(video, 0, 0, width, height);
	const results = faceLandmarker.detectForVideo(offscreen, performance.now());
	if (results.faceLandmarks && results.faceLandmarks.length > 0) {
		return results.faceLandmarks[0].map((kp: { x: number; y: number }) => ({
			x: kp.x * width,
			y: kp.y * height,
		}));
	}
	return null;
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

// --- Add RGB <-> HSV utilities ---
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h: number | undefined;
	const d = max - min;
	const v = max;
	const s = max === 0 ? 0 : d / max;
	if (max === min) {
		h = 0;
	} else {
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h! /= 6;
	}
	return [h ?? 0, s, v];
}
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
	h = h ?? 0;
	h /= 60;
	const c = v * s;
	const x = c * (1 - Math.abs((h % 2) - 1));
	const m = v - c;
	let r = 0,
		g = 0,
		b = 0;
	if (0 <= h && h < 1) {
		r = c;
		g = x;
		b = 0;
	} else if (1 <= h && h < 2) {
		r = x;
		g = c;
		b = 0;
	} else if (2 <= h && h < 3) {
		r = 0;
		g = c;
		b = x;
	} else if (3 <= h && h < 4) {
		r = 0;
		g = x;
		b = c;
	} else if (4 <= h && h < 5) {
		r = x;
		g = 0;
		b = c;
	} else if (5 <= h && h < 6) {
		r = c;
		g = 0;
		b = x;
	}
	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);
	return [r, g, b];
}
// --- End RGB <-> HSV utilities ---

export function hexToHSL(hex: string) {
	hex = hex.replace("#", "");
	let r = 0,
		g = 0,
		b = 0;
	if (hex.length === 3) {
		r = parseInt(hex[0] + hex[0], 16);
		g = parseInt(hex[1] + hex[1], 16);
		b = parseInt(hex[2] + hex[2], 16);
	} else if (hex.length === 6) {
		r = parseInt(hex.substring(0, 2), 16);
		g = parseInt(hex.substring(2, 4), 16);
		b = parseInt(hex.substring(4, 6), 16);
	}
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}
	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

export function hslToHex(h: number, s: number, l: number) {
	s /= 100;
	l /= 100;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0,
		g = 0,
		b = 0;
	if (0 <= h && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (60 <= h && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (120 <= h && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (180 <= h && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (240 <= h && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else if (300 <= h && h < 360) {
		r = c;
		g = 0;
		b = x;
	}
	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);
	return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function renderLipstick(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	prevLandmarks: { x: number; y: number }[] | null,
	targetLandmarks: { x: number; y: number }[] | null,
	lipColor: string,
	SMOOTHING: number,
	finish: "matte" | "gloss" = "matte"
) {
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
	prevLandmarks.forEach((landmark, idx) => {
		landmark.x = lerp(landmark.x, targetLandmarks[idx].x, SMOOTHING);
		landmark.y = lerp(landmark.y, targetLandmarks[idx].y, SMOOTHING);
	});
	const keypoints = prevLandmarks;

	// 1. Gather all dense outer and inner lip points for MediaPipe 478
	const denseOuterLip = [
		61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
		181, 91, 146, 61,
	];
	const denseInnerLip = [
		78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14,
		87, 178, 88, 95, 78,
	];

	// Helper: Catmull-Rom spline interpolation for smoothness
	function catmullRomSpline(
		points: { x: number; y: number }[],
		numPoints: number = 100
	): { x: number; y: number }[] {
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
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i === 0 ? 0 : i - 1];
			const p1 = points[i];
			const p2 = points[i + 1 < points.length ? i + 1 : i];
			const p3 =
				points[
					i + 2 < points.length ? i + 2 : i + 1 < points.length ? i + 1 : i
				];
			for (let t = 0; t < 1; t += 1 / numPoints) {
				result.push({
					x: interpolate(p0.x, p1.x, p2.x, p3.x, t),
					y: interpolate(p0.y, p1.y, p2.y, p3.y, t),
				});
			}
		}
		return result;
	}

	const maskCanvas = document.createElement("canvas");
	maskCanvas.width = mainCanvas.width;
	maskCanvas.height = mainCanvas.height;
	const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
	maskCtx!.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

	// Before drawing the mask, adjust the lip corners for a sharper, more natural look
	const adjustedKeypoints = keypoints.map((kp) => ({
		x: kp.x, // NO MIRRORING
		y: kp.y,
	}));
	// Reduce the offsets for more natural corners
	const cornerOffset = 1; // was 10
	const upOffset = 0; // was 4
	if (adjustedKeypoints[61]) {
		adjustedKeypoints[61].x -= cornerOffset;
		adjustedKeypoints[61].y -= upOffset;
	}
	if (adjustedKeypoints[291]) {
		adjustedKeypoints[291].x += cornerOffset;
		adjustedKeypoints[291].y -= upOffset;
	}
	// Get dense, smooth outer and inner lip contours
	const outerPoints = denseOuterLip.map((idx) => adjustedKeypoints[idx]);
	const innerPoints = denseInnerLip.map((idx) => adjustedKeypoints[idx]);
	const smoothOuter = catmullRomSpline(outerPoints, 60);
	const smoothInner = catmullRomSpline(innerPoints, 60);
	// Draw outer lip polygon (with true V-shaped corners)
	maskCtx!.save();
	maskCtx!.beginPath();
	// Trace outer contour
	for (let j = 0; j < smoothOuter.length; j++) {
		const kp = smoothOuter[j];
		if (j === 0) {
			maskCtx!.moveTo(kp.x, kp.y);
		} else {
			maskCtx!.lineTo(kp.x, kp.y);
		}
	}
	// At the right corner, jump to the corresponding inner point (sharp V)
	const rightInner = smoothInner[smoothInner.length - 1];
	maskCtx!.lineTo(rightInner.x, rightInner.y);
	// Trace inner contour in reverse
	for (let j = smoothInner.length - 2; j >= 0; j--) {
		const kp = smoothInner[j];
		maskCtx!.lineTo(kp.x, kp.y);
	}
	// At the left corner, close the V
	const leftOuter = smoothOuter[0];
	maskCtx!.lineTo(leftOuter.x, leftOuter.y);
	maskCtx!.closePath();
	maskCtx!.fillStyle = "#fff";
	maskCtx!.shadowColor = "#fff";
	maskCtx!.shadowBlur = 6; // Feather only the edge
	maskCtx!.globalAlpha = 0.85;
	maskCtx!.fill("evenodd");
	maskCtx!.restore();

	const featheredMaskCanvas = document.createElement("canvas");
	featheredMaskCanvas.width = maskCanvas.width;
	featheredMaskCanvas.height = maskCanvas.height;
	const featheredMaskCtx = featheredMaskCanvas.getContext("2d", {
		willReadFrequently: true,
	});
	featheredMaskCtx!.drawImage(maskCanvas, 0, 0);
	featheredMaskCtx!.globalCompositeOperation = "source-in";
	featheredMaskCtx!.filter = "blur(4px)"; // was blur(2px)
	featheredMaskCtx!.drawImage(maskCanvas, 0, 0);
	featheredMaskCtx!.filter = "none";
	featheredMaskCtx!.globalAlpha = 0.85;
	featheredMaskCtx!.globalCompositeOperation = "source-in";
	featheredMaskCtx!.fillStyle = lipColor;
	featheredMaskCtx!.fillRect(
		0,
		0,
		featheredMaskCanvas.width,
		featheredMaskCanvas.height
	);
	featheredMaskCtx!.globalAlpha = 1.0;
	featheredMaskCtx!.globalCompositeOperation = "source-over";

	// Use multiply blend mode for realism
	ctx!.globalAlpha = 1.0;
	ctx!.globalCompositeOperation = "multiply";
	ctx!.drawImage(featheredMaskCanvas, 0, 0);
	// Remove double overlay and mirroring issue
	// (Do not draw mainCanvas back onto itself)
	ctx!.restore(); // Restore after mirroring

	// --- After mask creation, before drawing to main canvas ---
	// Instead of filling with solid color, do texture-preserving HSV blending
	ctx!.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
	ctx!.save();
	// Ensure no canvas mirroring
	// ctx!.setTransform(-1, 0, 0, 1, mainCanvas.width, 0);
	// Draw the current video frame to the canvas (for pixel access)
	const video = document.querySelector("video");
	if (!video) return;
	ctx!.drawImage(video, 0, 0, mainCanvas.width, mainCanvas.height);
	const frame = ctx!.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
	// Prepare mask alpha
	const maskData = maskCtx!.getImageData(
		0,
		0,
		mainCanvas.width,
		mainCanvas.height
	);
	// Parse lipColor to HSV
	const hex = lipColor.replace("#", "");
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	const [targetH, targetS, targetV0] = rgbToHsv(r, g, b);
	let targetV = targetV0;
	// --- Dynamic lighting adaptation ---
	// Estimate average brightness in lip region
	let sumV = 0,
		count = 0;
	for (let j = 0; j < maskData.data.length; j += 4) {
		const alpha = maskData.data[j + 3] / 255;
		if (alpha > 0.1) {
			const [, , v] = rgbToHsv(
				frame.data[j],
				frame.data[j + 1],
				frame.data[j + 2]
			);
			sumV += v;
			count++;
		}
	}
	const avgV = count > 0 ? sumV / count : 0.5;
	// Adjust lipstick V to match lighting (keep it a bit higher for vibrancy)
	targetV = Math.max(0.15, Math.min(1, avgV + 0.15));
	// --- Texture-preserving blending ---
	for (let j = 0; j < maskData.data.length; j += 4) {
		const alpha = maskData.data[j + 3] / 255;
		if (alpha > 0.05) {
			// Get original pixel HSV
			const [origH, origS, v] = rgbToHsv(
				frame.data[j],
				frame.data[j + 1],
				frame.data[j + 2]
			);
			// Blend hue/sat, preserve value (texture)
			const newH = targetH * 0.85 + origH * 0.15; // blend in some original hue
			const newS = Math.max(origS, targetS * 0.85); // keep more natural color
			let newV = v * (1 - alpha) + targetV * alpha;
			// For matte, reduce gloss (lower V slightly)
			if (finish === "matte") newV *= 0.97;
			// For gloss, add highlight
			if (finish === "gloss" && v > 0.85 && origS < 0.3) {
				newV = Math.min(1, newV + 0.1); // slightly stronger highlight
			}
			const [nr, ng, nb] = hsvToRgb(newH, newS, newV);
			// Feathered alpha
			const featherAlpha = Math.min(1, alpha * 1.1);
			frame.data[j] = Math.round(
				nr * featherAlpha + frame.data[j] * (1 - featherAlpha)
			);
			frame.data[j + 1] = Math.round(
				ng * featherAlpha + frame.data[j + 1] * (1 - featherAlpha)
			);
			frame.data[j + 2] = Math.round(
				nb * featherAlpha + frame.data[j + 2] * (1 - featherAlpha)
			);
			// Alpha stays 255
		}
	}
	ctx!.putImageData(frame, 0, 0);
	ctx!.restore();
	// Enhanced gloss highlight for 'gloss' finish
	if (finish === "gloss") {
		ctx!.save();
		ctx!.globalAlpha = 0.22; // slightly stronger
		ctx!.globalCompositeOperation = "lighter";
		ctx!.beginPath();
		// Draw a highlight arc along the upper lip, more pronounced
		const highlight = smoothOuter.slice(10, 30);
		for (let k = 0; k < highlight.length; k++) {
			const kp = highlight[k];
			if (k === 0) ctx!.moveTo(kp.x, kp.y - 5); // higher arc
			else ctx!.lineTo(kp.x, kp.y - 5);
		}
		ctx!.lineWidth = 8; // thicker
		ctx!.strokeStyle = "#fff";
		ctx!.shadowColor = "#fff";
		ctx!.shadowBlur = 12; // more blur
		ctx!.stroke();
		ctx!.restore();
	}
}

export async function startLipstickAR(
	videoEl: HTMLVideoElement,
	canvasEl: HTMLCanvasElement,
	color: string
) {
	// Setup camera
	await setupCamera({ current: videoEl });
	// Load face landmarker
	const faceLandmarker = await loadFaceLandmarker();
	let prevLandmarks: Landmark[] | null = null;
	const SMOOTHING = 0.5;
	let running = true;

	async function render() {
		if (!running) return;
		const landmarks = detectLandmarks(faceLandmarker, { current: videoEl });
		if (landmarks) {
			if (!prevLandmarks) prevLandmarks = landmarks;
			renderLipstick(
				{ current: canvasEl },
				prevLandmarks,
				landmarks,
				color,
				SMOOTHING,
				"matte"
			);
			prevLandmarks = landmarks;
		} else {
			// Clear canvas if no face
			const ctx = canvasEl.getContext("2d");
			if (ctx) {
				ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
			}
		}
		requestAnimationFrame(render);
	}
	render();
	return () => {
		running = false;
	};
}
