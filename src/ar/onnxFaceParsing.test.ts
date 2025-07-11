import {
	preprocessImage,
	loadFaceParsingModel,
	getLipsMask,
} from "./onnxFaceParsing";

jest.mock("onnxruntime-web", () => {
	class Tensor {
		data: Float32Array;
		constructor(type: string, data: Float32Array, shape: number[]) {
			this.data = data;
		}
	}
	class InferenceSession {
		static async create() {
			return new InferenceSession();
		}
		async run(feeds: any) {
			// Simulate output: (1, 19, 512, 512) with lips at class 12 and 13
			const size = 512 * 512;
			const output = new Float32Array(19 * size);
			// Set class 12 and 13 to high value for a few pixels
			for (let i = 0; i < size; i++) {
				output[12 * size + i] = i % 2 === 0 ? 10 : 0; // upper lip
				output[13 * size + i] = i % 2 === 1 ? 10 : 0; // lower lip
			}
			return { output: { data: output } };
		}
	}
	return { Tensor, InferenceSession };
});

// Mock canvas context for jsdom
global.HTMLCanvasElement.prototype.getContext = function () {
	return {
		fillStyle: "",
		fillRect: jest.fn(),
		getImageData: () => ({
			data: new Uint8ClampedArray(512 * 512 * 4),
		}),
		putImageData: jest.fn(),
		drawImage: jest.fn(),
	} as any;
};

describe("onnxFaceParsing", () => {
	it("preprocessImage returns correct shape", () => {
		// Fake canvas
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 512;
		const arr = preprocessImage(canvas);
		expect(arr.length).toBe(1 * 3 * 512 * 512);
		// Red channel should be 1, others 0
		expect(arr[0]).toBeCloseTo(1);
		expect(arr[512 * 512]).toBeCloseTo(0);
		expect(arr[2 * 512 * 512]).toBeCloseTo(0);
	});

	it("loadFaceParsingModel returns a session", async () => {
		const session = await loadFaceParsingModel();
		expect(session).toBeDefined();
		expect(typeof session.run).toBe("function");
	});

	it("getLipsMask returns a mask with lips detected", async () => {
		// Fake canvas
		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 512;
		const mask = await getLipsMask(canvas);
		expect(mask.length).toBe(512 * 512);
		// Should alternate lips mask (from mock)
		expect(mask[0]).toBe(1);
		expect(mask[1]).toBe(1);
	});
});
