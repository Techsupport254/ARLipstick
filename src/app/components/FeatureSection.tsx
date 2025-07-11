const features = [
	{
		icon: (
			<svg
				className="w-14 h-14 mb-4 text-pink-500"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 20v-6m0 0V4m0 10l3.5-3.5M12 14l-3.5-3.5"
				/>
			</svg>
		),
		title: "Ultra-Realistic Lipstick AR",
		description:
			"See every lipstick shade on your lips in real time with advanced face tracking and natural blending—no surprises, just true-to-life color.",
	},
	{
		icon: (
			<svg
				className="w-14 h-14 mb-4 text-pink-500"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				viewBox="0 0 24 24"
			>
				<circle cx="12" cy="12" r="10" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M12 8v8" />
			</svg>
		),
		title: "100+ Lipstick Shades",
		description:
			"Browse a huge collection of lipstick colors and finishes—find your perfect match for any mood, skin tone, or occasion.",
	},
	{
		icon: (
			<svg
				className="w-14 h-14 mb-4 text-pink-500"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				viewBox="0 0 24 24"
			>
				<rect x="4" y="4" width="16" height="16" rx="4" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8" />
			</svg>
		),
		title: "No App, Just Lipstick",
		description:
			"Try on lipsticks instantly in your browser—no downloads, no signups, just pure lipstick fun.",
	},
];

export default function FeatureSection() {
	return (
		<section className="w-full flex justify-center">
			<div className="w-full container max-w-8xl py-20 px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
				{features.map((feature, i) => (
					<div key={i} className="flex flex-col items-center">
						{feature.icon}
						<h3 className="text-2xl font-bold mb-2 text-pink-600">
							{feature.title}
						</h3>
						<p className="text-gray-600 text-lg">{feature.description}</p>
					</div>
				))}
			</div>
		</section>
	);
}
