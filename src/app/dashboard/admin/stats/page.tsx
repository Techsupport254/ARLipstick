"use client";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { app } from "../../../firebaseConfig";
import {
	FaUsers,
	FaBoxOpen,
	FaCreditCard,
	FaChartLine,
	FaTrophy,
	FaExclamationTriangle,
	FaCheckCircle,
	FaTimesCircle,
	FaClock,
	FaCalendarAlt,
	FaDollarSign,
	FaShoppingCart,
	FaUserPlus,
	FaChartBar,
	FaWarehouse,
	FaPercentage,
} from "react-icons/fa";

interface StatsData {
	users: {
		total: number;
		active: number;
		newThisMonth: number;
		roles: {
			admin: number;
			user: number;
		};
	};
	orders: {
		total: number;
		pending: number;
		completed: number;
		cancelled: number;
		thisMonth: number;
		totalRevenue: number;
		averageOrderValue: number;
	};
	products: {
		total: number;
		active: number;
		categories: Record<string, number>;
		lowStock: number;
		outOfStock: number;
	};
	payments: {
		total: number;
		successful: number;
		failed: number;
		pending: number;
		totalAmount: number;
		thisMonth: number;
		thisMonthAmount: number;
	};
	revenue: {
		total: number;
		thisMonth: number;
		thisWeek: number;
		today: number;
	};
	topProducts: Array<{
		id: string;
		name: string;
		totalSold: number;
		revenue: number;
		stock: number;
	}>;
	recentActivity: {
		recentOrders: Array<{
			id: string;
			orderId: string;
			total: number;
			status: string;
			createdAt: string;
			customerName: string;
		}>;
		recentPayments: Array<{
			id: string;
			paymentId: string;
			amount: number;
			status: string;
			createdAt: string;
		}>;
		newUsers: Array<{
			id: string;
			displayName: string;
			email: string;
			createdAt: string;
			role: string;
		}>;
	};
	performance: {
		conversionRate: string;
		averageOrderValue: string;
		paymentSuccessRate: string;
		orderCompletionRate: string;
	};
	inventory: {
		totalProducts: number;
		lowStock: number;
		outOfStock: number;
		wellStocked: number;
		totalStockValue: number;
	};
	analytics: {
		monthlyRevenue: Array<{
			month: string;
			year: number;
			revenue: number;
			orders: number;
		}>;
	};
}

export default function StatsPage() {
	const [stats, setStats] = useState<StatsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const router = useRouter();

	useEffect(() => {
		const auth = getAuth(app);
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					const idToken = await firebaseUser.getIdToken();
					const res = await fetch("/api/stats", {
						headers: { Authorization: `Bearer ${idToken}` },
					});
					if (res.ok) {
						const data = await res.json();
						setStats(data);
					} else {
						const errorData = await res.json();
						setError(errorData.message || "Failed to fetch stats");
					}
				} catch (err) {
					setError("Failed to fetch stats");
				} finally {
					setLoading(false);
				}
			} else {
				router.replace("/login");
			}
		});
		return () => unsubscribe();
	}, [router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
				<div className="flex flex-col items-center">
					<div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
					<span className="text-pink-600 font-bold text-lg">
						Loading comprehensive stats...
					</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
				<div className="bg-white rounded-2xl p-8 shadow-2xl border border-pink-200 text-center">
					<FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-red-600 mb-2">
						Error Loading Stats
					</h2>
					<p className="text-gray-600">{error}</p>
				</div>
			</div>
		);
	}

	if (!stats) return null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 p-4">
			<div className="max-w-8xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-extrabold text-pink-800 mb-2">
						Comprehensive Analytics
					</h1>
					<p className="text-gray-600">
						Complete overview of your business performance
					</p>
				</div>

				{/* Key Metrics Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-600 text-sm font-medium">
									Total Revenue
								</p>
								<p className="text-3xl font-bold text-pink-800">
									Ksh {stats.revenue.total.toLocaleString()}
								</p>
							</div>
							<FaDollarSign className="text-pink-600 text-3xl" />
						</div>
						<div className="mt-4 flex justify-between text-sm">
							<span className="text-green-600">
								This Month: Ksh {stats.revenue.thisMonth.toLocaleString()}
							</span>
							<span className="text-blue-600">
								Today: Ksh {stats.revenue.today.toLocaleString()}
							</span>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-600 text-sm font-medium">Total Users</p>
								<p className="text-3xl font-bold text-pink-800">
									{stats.users.total}
								</p>
							</div>
							<FaUsers className="text-pink-600 text-3xl" />
						</div>
						<div className="mt-4 flex justify-between text-sm">
							<span className="text-green-600">
								Active: {stats.users.active}
							</span>
							<span className="text-blue-600">
								New This Month: {stats.users.newThisMonth}
							</span>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-600 text-sm font-medium">
									Total Orders
								</p>
								<p className="text-3xl font-bold text-pink-800">
									{stats.orders.total}
								</p>
							</div>
							<FaShoppingCart className="text-pink-600 text-3xl" />
						</div>
						<div className="mt-4 flex justify-between text-sm">
							<span className="text-yellow-600">
								Pending: {stats.orders.pending}
							</span>
							<span className="text-green-600">
								Completed: {stats.orders.completed}
							</span>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-600 text-sm font-medium">Products</p>
								<p className="text-3xl font-bold text-pink-800">
									{stats.products.total}
								</p>
							</div>
							<FaWarehouse className="text-pink-600 text-3xl" />
						</div>
						<div className="mt-4 flex justify-between text-sm">
							<span className="text-red-600">
								Out of Stock: {stats.products.outOfStock}
							</span>
							<span className="text-yellow-600">
								Low Stock: {stats.products.lowStock}
							</span>
						</div>
					</div>
				</div>

				{/* Performance Metrics */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
							<FaChartBar className="text-pink-600" />
							Performance Metrics
						</h2>
						<div className="grid grid-cols-2 gap-4">
							<div className="text-center p-4 bg-pink-50 rounded-xl">
								<p className="text-gray-600 text-sm">Conversion Rate</p>
								<p className="text-2xl font-bold text-pink-800">
									{stats.performance.conversionRate}%
								</p>
							</div>
							<div className="text-center p-4 bg-pink-50 rounded-xl">
								<p className="text-gray-600 text-sm">Avg Order Value</p>
								<p className="text-2xl font-bold text-pink-800">
									Ksh {stats.performance.averageOrderValue}
								</p>
							</div>
							<div className="text-center p-4 bg-pink-50 rounded-xl">
								<p className="text-gray-600 text-sm">Payment Success</p>
								<p className="text-2xl font-bold text-pink-800">
									{stats.performance.paymentSuccessRate}%
								</p>
							</div>
							<div className="text-center p-4 bg-pink-50 rounded-xl">
								<p className="text-gray-600 text-sm">Order Completion</p>
								<p className="text-2xl font-bold text-pink-800">
									{stats.performance.orderCompletionRate}%
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
							<FaTrophy className="text-pink-600" />
							Top Products
						</h2>
						<div className="space-y-3">
							{stats.topProducts.slice(0, 5).map((product, index) => (
								<div
									key={product.id}
									className="flex items-center justify-between p-3 bg-pink-50 rounded-xl"
								>
									<div className="flex items-center gap-3">
										<span className="text-pink-600 font-bold">
											#{index + 1}
										</span>
										<div>
											<p className="font-semibold text-gray-800">
												{product.name}
											</p>
											<p className="text-sm text-gray-600">
												Sold: {product.totalSold} | Stock: {product.stock}
											</p>
										</div>
									</div>
									<p className="font-bold text-pink-800">
										Ksh {product.revenue.toLocaleString()}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Recent Activity */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
							<FaClock className="text-pink-600" />
							Recent Orders
						</h2>
						<div className="space-y-3">
							{stats.recentActivity.recentOrders.map((order) => (
								<div key={order.id} className="p-3 bg-pink-50 rounded-xl">
									<div className="flex justify-between items-start">
										<div>
											<p className="font-semibold text-gray-800">
												#{order.orderId}
											</p>
											<p className="text-sm text-gray-600">
												{order.customerName}
											</p>
										</div>
										<div className="text-right">
											<p className="font-bold text-pink-800">
												Ksh {order.total}
											</p>
											<span
												className={`px-2 py-1 rounded-full text-xs font-bold ${
													order.status === "completed"
														? "bg-green-100 text-green-700"
														: order.status === "pending"
														? "bg-yellow-100 text-yellow-700"
														: "bg-gray-100 text-gray-700"
												}`}
											>
												{order.status}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
							<FaCreditCard className="text-pink-600" />
							Recent Payments
						</h2>
						<div className="space-y-3">
							{stats.recentActivity.recentPayments.map((payment) => (
								<div key={payment.id} className="p-3 bg-pink-50 rounded-xl">
									<div className="flex justify-between items-start">
										<div>
											<p className="font-semibold text-gray-800">
												#{payment.paymentId}
											</p>
											<p className="text-sm text-gray-600">
												{new Date(payment.createdAt).toLocaleDateString()}
											</p>
										</div>
										<div className="text-right">
											<p className="font-bold text-pink-800">
												Ksh {payment.amount}
											</p>
											<span
												className={`px-2 py-1 rounded-full text-xs font-bold ${
													payment.status === "success"
														? "bg-green-100 text-green-700"
														: payment.status === "pending"
														? "bg-yellow-100 text-yellow-700"
														: "bg-red-100 text-red-700"
												}`}
											>
												{payment.status}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6">
						<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
							<FaUserPlus className="text-pink-600" />
							New Users
						</h2>
						<div className="space-y-3">
							{stats.recentActivity.newUsers.map((user) => (
								<div key={user.id} className="p-3 bg-pink-50 rounded-xl">
									<div className="flex justify-between items-start">
										<div>
											<p className="font-semibold text-gray-800">
												{user.displayName}
											</p>
											<p className="text-sm text-gray-600">{user.email}</p>
										</div>
										<div className="text-right">
											<span
												className={`px-2 py-1 rounded-full text-xs font-bold ${
													user.role === "admin"
														? "bg-yellow-100 text-yellow-700"
														: "bg-pink-100 text-pink-700"
												}`}
											>
												{user.role}
											</span>
											<p className="text-xs text-gray-500 mt-1">
												{new Date(user.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Monthly Revenue Chart */}
				<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-6 mb-8">
					<h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
						<FaChartLine className="text-pink-600" />
						Monthly Revenue Trend
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-4">
						{stats.analytics.monthlyRevenue.map((month, index) => (
							<div key={index} className="text-center">
								<div className="bg-pink-100 rounded-lg p-3">
									<p className="text-sm font-semibold text-pink-800">
										{month.month}
									</p>
									<p className="text-lg font-bold text-pink-800">
										Ksh {month.revenue.toLocaleString()}
									</p>
									<p className="text-xs text-gray-600">{month.orders} orders</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
