import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: {
		// turbo: false, // Removed as per Next.js 15+ requirements
	},
	images: {
		domains: [
			"res.cloudinary.com",
			"lh3.googleusercontent.com",
			"joannakcosmetics.com",
			// add other domains as needed
		],
	},
	webpack: (config) => {
		return config;
	},
};

export default nextConfig;
