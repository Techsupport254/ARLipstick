// User document
export interface User {
	uid: string;
	email: string;
	displayName: string;
	photoURL?: string;
	createdAt: string; // ISO or Firestore timestamp
	role?: string;
	bio?: string; // Add bio field
	phone?: string | null; // Add phone field
}

// Product document
export interface Product {
	id: string;
	name: string;
	description?: string;
	price: number;
	imageUrl: string;
	category?: string;
	stock?: number;
	createdAt?: string;
	updatedAt?: string;
	colorName?: string; // Added for color name support
	hexColor?: string; // Added for hex color support
	oldPrice?: number; // Added for old price support
}

// Cart item (subcollection under user)
export interface CartItem {
	productId: string;
	quantity: number;
	addedAt: string;
	// Optionally cache product info for display
	name?: string;
	price?: number;
	imageUrl?: string;
}

// Order document (subcollection under user)
export interface Order {
	orderId: string;
	items: Array<{
		productId: string;
		quantity: number;
		priceAtPurchase: number;
		name?: string;
		imageUrl?: string;
	}>;
	total: number;
	subtotal?: number;
	vat?: number;
	deliveryFee?: number;
	status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
	createdAt: string;
	shippingAddress?: {
		line1: string;
		line2?: string;
		city: string;
		postalCode: string;
		country: string;
	};
	paymentId?: string;
	deliveryLocation?: string;
	phoneNumber?: string;
	paystackRef?: string;
}

// Payment document (subcollection under user)
export interface Payment {
	paymentId: string;
	orderId: string;
	amount: number;
	status: "pending" | "completed" | "failed";
	method: string;
	transactionRef?: string;
	createdAt: string;
}

// Global Order document (for /orders/{orderId})
export interface GlobalOrder extends Order {
	userId: string;
}

// Global Payment document (for /payments/{paymentId})
export interface GlobalPayment extends Payment {
	userId: string;
}

// Note: Use Order/Payment for subcollections under users, and GlobalOrder/GlobalPayment for global collections.
