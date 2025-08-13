// Test color validation and conversion
function isValidHexColor(color) {
	return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

// Test colors
const testColors = [
	"#FF0000", // Red
	"#00FF00", // Green
	"#0000FF", // Blue
	"#FF69B4", // Hot Pink
	"#DC143C", // Crimson
	"#FF1493", // Deep Pink
	"invalid", // Invalid
	"#123", // Short hex
	"#123456", // Valid hex
];

console.log("Testing color validation:");
testColors.forEach((color) => {
	console.log(`${color}: ${isValidHexColor(color) ? "Valid" : "Invalid"}`);
});

console.log("\nDefault fallback color: #dc3753");
