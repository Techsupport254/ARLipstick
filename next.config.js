const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ["@tensorflow/tfjs", "onnxruntime-web"],
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
		domains: [
			"res.cloudinary.com",
			"lh3.googleusercontent.com",
			"joannakcosmetics.com",
		],
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

module.exports = nextConfig;
