import { NextRequest, NextResponse } from "next/server";
import * as admin from "../../firebaseAdmin";

async function getUserFromRequest(req: NextRequest) {
	const authHeader = req.headers.get("authorization");
	if (!authHeader) throw new Error("Missing Authorization header");
	const idToken = authHeader.replace("Bearer ", "");
	const decoded = await admin.admin.auth().verifyIdToken(idToken);
	return decoded.uid;
}

export async function GET(req: NextRequest) {
	console.log("STATS: /api/stats route called");
	const authHeader = req.headers.get("authorization");
	console.log("STATS: Authorization header:", authHeader);
	try {
		const uid = await getUserFromRequest(req);
		console.log("STATS: User UID:", uid);
		// Fetch user profile
		const userDoc = await admin.admin
			.firestore()
			.collection("users")
			.doc(uid)
			.get();
		const user = userDoc.data();
		console.log("STATS: User profile:", user);
		const isAdmin = user && user.role === "admin";
		console.log("STATS: isAdmin:", isAdmin);

		if (isAdmin) {
			// Fetch all data
			const [
				usersSnapshot,
				ordersSnapshot,
				productsSnapshot,
				paymentsSnapshot,
			] = await Promise.all([
				admin.admin.firestore().collection("users").get(),
				admin.admin.firestore().collection("orders").get(),
				admin.admin.firestore().collection("products").get(),
				admin.admin.firestore().collection("payments").get(),
			]);

			const users: any[] = usersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			const orders = ordersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			const products = productsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			const payments = paymentsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			console.log("STATS: Admin orders:", orders);
			console.log("STATS: Admin payments:", payments);

			// Calculate comprehensive stats
			const stats = {
				// User Statistics
				users: {
					total: users.length,
					active: users.filter(
						(user: any) =>
							user.lastLoginAt &&
							new Date(user.lastLoginAt) >
								new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
					).length,
					newThisMonth: users.filter(
						(user: any) =>
							user.createdAt &&
							new Date(user.createdAt) >
								new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					).length,
					roles: {
						admin: users.filter((user: any) => user.role === "admin").length,
						user: users.filter((user: any) => user.role === "user").length,
					},
				},

				// Order Statistics
				orders: {
					total: orders.length,
					pending: orders.filter((order: any) => order.status === "pending")
						.length,
					completed: orders.filter((order: any) => order.status === "completed")
						.length,
					cancelled: orders.filter((order: any) => order.status === "cancelled")
						.length,
					approved: orders.filter((order: any) => order.status === "approved")
						.length,
					paid: orders.filter((order: any) => order.status === "paid").length,
					thisMonth: orders.filter(
						(order: any) =>
							order.createdAt &&
							new Date(order.createdAt) >
								new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					).length,
					totalRevenue: orders.reduce(
						(sum: number, order: any) => sum + (order.total || 0),
						0
					),
					averageOrderValue:
						orders.length > 0
							? orders.reduce(
									(sum: number, order: any) => sum + (order.total || 0),
									0
							  ) / orders.length
							: 0,
				},

				// Product Statistics
				products: {
					total: products.length,
					active: products.filter(
						(product: any) => product.status !== "inactive"
					).length,
					categories: products.reduce((acc: any, product: any) => {
						const category = product.category || "Uncategorized";
						acc[category] = (acc[category] || 0) + 1;
						return acc;
					}, {}),
					lowStock: products.filter((product: any) => (product.stock || 0) < 10)
						.length,
					outOfStock: products.filter(
						(product: any) => (product.stock || 0) === 0
					).length,
				},

				// Payment Statistics
				payments: {
					total: payments.length,
					successful: payments.filter(
						(payment: any) => payment.status === "success"
					).length,
					failed: payments.filter((payment: any) => payment.status === "failed")
						.length,
					pending: payments.filter(
						(payment: any) => payment.status === "pending"
					).length,
					totalAmount: payments.reduce(
						(sum: number, payment: any) => sum + (payment.amount || 0),
						0
					),
					thisMonth: payments.filter(
						(payment: any) =>
							payment.createdAt &&
							new Date(payment.createdAt) >
								new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					).length,
					thisMonthAmount: payments
						.filter(
							(payment: any) =>
								payment.createdAt &&
								new Date(payment.createdAt) >
									new Date(new Date().getFullYear(), new Date().getMonth(), 1)
						)
						.reduce(
							(sum: number, payment: any) => sum + (payment.amount || 0),
							0
						),
				},

				// Revenue Analytics
				revenue: {
					total: payments.reduce(
						(sum: number, payment: any) => sum + (payment.amount || 0),
						0
					),
					thisMonth: payments
						.filter(
							(payment: any) =>
								payment.createdAt &&
								new Date(payment.createdAt) >
									new Date(new Date().getFullYear(), new Date().getMonth(), 1)
						)
						.reduce(
							(sum: number, payment: any) => sum + (payment.amount || 0),
							0
						),
					thisWeek: payments
						.filter(
							(payment: any) =>
								payment.createdAt &&
								new Date(payment.createdAt) >
									new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
						)
						.reduce(
							(sum: number, payment: any) => sum + (payment.amount || 0),
							0
						),
					today: payments
						.filter(
							(payment: any) =>
								payment.createdAt &&
								new Date(payment.createdAt).toDateString() ===
									new Date().toDateString()
						)
						.reduce(
							(sum: number, payment: any) => sum + (payment.amount || 0),
							0
						),
				},

				// Top Performing Items
				topProducts: (() => {
					const productSales = products
						.map((product: any) => {
							const productOrders = orders.filter(
								(order: any) =>
									order.items &&
									order.items.some((item: any) => item.productId === product.id)
							);
							const totalSold = productOrders.reduce(
								(sum: number, order: any) => {
									const item = order.items.find(
										(item: any) => item.productId === product.id
									);
									return sum + (item?.quantity || 0);
								},
								0
							);
							const revenue = productOrders.reduce(
								(sum: number, order: any) => {
									const item = order.items.find(
										(item: any) => item.productId === product.id
									);
									return sum + (item?.price * item?.quantity || 0);
								},
								0
							);
							return {
								id: product.id,
								name: product.name,
								totalSold,
								revenue,
								stock: product.stock || 0,
								imageUrl: product.imageUrl || null,
								price: product.price || 0,
								oldPrice: product.oldPrice || null,
							};
						})
						.sort((a, b) => b.revenue - a.revenue)
						.slice(0, 10);
					return productSales;
				})(),

				// Recent Activity
				recentActivity: {
					recentOrders: orders
						.sort(
							(a: any, b: any) =>
								new Date(b.createdAt || 0).getTime() -
								new Date(a.createdAt || 0).getTime()
						)
						.slice(0, 5)
						.map((order: any) => {
							// Find user for this order
							const user = users.find((u: any) => u.id === order.userId);
							const photoURL = user?.photoURL || null;
							console.log(
								"Order:",
								order.orderId,
								"User:",
								user,
								"photoURL:",
								photoURL
							);
							return {
								id: order.id,
								orderId: order.orderId,
								total: order.total,
								status: order.status,
								createdAt: order.createdAt,
								customerName:
									order.customerName ||
									user?.displayName ||
									user?.name ||
									user?.email ||
									"Unknown",
								customerEmail: user?.email || "-",
								customerPhotoURL: photoURL,
							};
						}),
					recentPayments: payments
						.sort(
							(a: any, b: any) =>
								new Date(b.createdAt || 0).getTime() -
								new Date(a.createdAt || 0).getTime()
						)
						.slice(0, 5)
						.map((payment: any) => ({
							id: payment.id,
							paymentId: payment.paymentId,
							amount: payment.amount,
							status: payment.status,
							createdAt: payment.createdAt,
						})),
					newUsers: (users as any[])
						.sort(
							(a, b) =>
								new Date(b.createdAt || 0).getTime() -
								new Date(a.createdAt || 0).getTime()
						)
						.slice(0, 5)
						.map((user) => ({
							id: user.id,
							displayName: user.displayName,
							email: user.email,
							createdAt: user.createdAt,
							role: user.role,
							photoURL: user.photoURL,
						})),
				},

				// Performance Metrics
				performance: {
					conversionRate:
						users.length > 0
							? ((orders.length / users.length) * 100).toFixed(2)
							: "0",
					averageOrderValue:
						orders.length > 0
							? (
									orders.reduce(
										(sum: number, order: any) => sum + (order.total || 0),
										0
									) / orders.length
							  ).toFixed(2)
							: "0",
					paymentSuccessRate:
						payments.length > 0
							? (
									(payments.filter((p: any) => p.status === "success").length /
										payments.length) *
									100
							  ).toFixed(2)
							: "0",
					orderCompletionRate:
						orders.length > 0
							? (
									(orders.filter((o: any) => o.status === "completed").length /
										orders.length) *
									100
							  ).toFixed(2)
							: "0",
				},

				// Inventory Status
				inventory: {
					totalProducts: products.length,
					lowStock: products.filter(
						(product: any) =>
							(product.stock || 0) < 10 && (product.stock || 0) > 0
					).length,
					outOfStock: products.filter(
						(product: any) => (product.stock || 0) === 0
					).length,
					wellStocked: products.filter(
						(product: any) => (product.stock || 0) >= 10
					).length,
					totalStockValue: products.reduce(
						(sum: number, product: any) =>
							sum + (product.stock || 0) * (product.price || 0),
						0
					),
				},

				// Time-based Analytics
				analytics: {
					monthlyRevenue: (() => {
						const months = [];
						for (let i = 11; i >= 0; i--) {
							const date = new Date();
							date.setMonth(date.getMonth() - i);
							const monthStart = new Date(
								date.getFullYear(),
								date.getMonth(),
								1
							);
							const monthEnd = new Date(
								date.getFullYear(),
								date.getMonth() + 1,
								0
							);

							const monthPayments = payments.filter((payment: any) => {
								const paymentDate = new Date(payment.createdAt);
								return paymentDate >= monthStart && paymentDate <= monthEnd;
							});

							months.push({
								month: date.toLocaleString("default", { month: "short" }),
								year: date.getFullYear(),
								revenue: monthPayments.reduce(
									(sum: number, payment: any) => sum + (payment.amount || 0),
									0
								),
								orders: monthPayments.length,
							});
						}
						return months;
					})(),
				},
			};
			console.log("STATS: Admin stats object:", stats);
			console.log("STATS API RESPONSE", JSON.stringify(stats, null, 2));
			return NextResponse.json(stats);
		} else {
			// User-specific stats
			// Fetch only this user's orders and payments
			const [ordersSnapshot, paymentsSnapshot] = await Promise.all([
				admin.admin
					.firestore()
					.collection("orders")
					.where("userId", "==", uid)
					.get(),
				admin.admin
					.firestore()
					.collection("payments")
					.where("userId", "==", uid)
					.get(),
			]);
			const orders = ordersSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			const payments = paymentsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));
			console.log("STATS: User orders:", orders);
			console.log("STATS: User payments:", payments);
			// User stats
			const stats = {
				orders: {
					total: orders.length,
					completed: orders.filter((order: any) => order.status === "completed")
						.length,
					pending: orders.filter((order: any) => order.status === "pending")
						.length,
					cancelled: orders.filter((order: any) => order.status === "cancelled")
						.length,
					approved: orders.filter((order: any) => order.status === "approved")
						.length,
					paid: orders.filter((order: any) => order.status === "paid").length,
					thisMonth: orders.filter(
						(order: any) =>
							order.createdAt &&
							new Date(order.createdAt) >
								new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					).length,
					totalSpent: orders.reduce(
						(sum: number, order: any) => sum + (order.total || 0),
						0
					),
				},
				payments: {
					total: payments.length,
					successful: payments.filter(
						(payment: any) => payment.status === "success"
					).length,
					failed: payments.filter((payment: any) => payment.status === "failed")
						.length,
					pending: payments.filter(
						(payment: any) => payment.status === "pending"
					).length,
					totalAmount: payments.reduce(
						(sum: number, payment: any) => sum + (payment.amount || 0),
						0
					),
				},
				recentOrders: orders
					.sort(
						(a: any, b: any) =>
							new Date(b.createdAt || 0).getTime() -
							new Date(a.createdAt || 0).getTime()
					)
					.slice(0, 5),
				recentPayments: payments
					.sort(
						(a: any, b: any) =>
							new Date(b.createdAt || 0).getTime() -
							new Date(a.createdAt || 0).getTime()
					)
					.slice(0, 5),
				monthlySpending: (() => {
					const months = [];
					for (let i = 11; i >= 0; i--) {
						const date = new Date();
						date.setMonth(date.getMonth() - i);
						const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
						const monthEnd = new Date(
							date.getFullYear(),
							date.getMonth() + 1,
							0
						);
						const monthPayments = payments.filter((payment: any) => {
							const paymentDate = new Date(payment.createdAt);
							return paymentDate >= monthStart && paymentDate <= monthEnd;
						});
						months.push({
							month: date.toLocaleString("default", { month: "short" }),
							year: date.getFullYear(),
							amount: monthPayments.reduce(
								(sum: number, payment: any) => sum + (payment.amount || 0),
								0
							),
						});
					}
					return months;
				})(),
			};
			console.log("STATS: User stats object:", stats);
			return NextResponse.json(stats);
		}
	} catch (error: unknown) {
		console.error("STATS: Error in /api/stats:", error);
		const message = error instanceof Error ? error.message : String(error);
		return NextResponse.json(
			{ message: "Failed to fetch stats", error: message },
			{ status: 500 }
		);
	}
}
