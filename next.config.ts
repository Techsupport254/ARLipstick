import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		// turbo: false, // Removed as per Next.js 15+ requirements
	},
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
	webpack: (config) => {
		return config;
	},
};

export default nextConfig;
