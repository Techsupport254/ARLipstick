import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		// turbo: false, // Removed as per Next.js 15+ requirements
	},
	serverExternalPackages: ["@tensorflow/tfjs", "onnxruntime-web"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
			},
			{
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "joannakcosmetics.com",
			},
		],
		unoptimized: true,
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				path: false,
			};
		}
		return config;
	},
};

export default nextConfig;
