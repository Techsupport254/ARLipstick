"use client";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { app } from "../firebaseConfig";
import {
	FaBoxOpen,
	FaCreditCard,
	FaUsers,
	FaBoxes,
	FaPlus,
	FaCheckCircle,
} from "react-icons/fa";
import { Table } from "antd";
import "antd/dist/reset.css";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
	.split(",")
	.map((e) => e.trim())
	.filter(Boolean);

export default function DashboardClient() {
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	// Add state for profile, orders, payments, cart, stats
	const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
	const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
	const [stats, setStats] = useState<{
		totalUsers?: number;
		totalOrders?: number;
		totalSales?: number;
		pendingOrders?: number;
	}>({});

	useEffect(() => {
		const auth = getAuth(app);
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				const idToken = await firebaseUser.getIdToken();
				// Fetch profile
				const resProfile = await fetch("/api/users", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				let dataProfile = await resProfile.json();
				if (Array.isArray(dataProfile)) {
					dataProfile =
						(dataProfile as Array<Record<string, unknown>>).find(
							(u) => u.uid === firebaseUser.uid
						) || dataProfile[0];
				}
				// Fetch orders
				const resOrders = await fetch("/api/orders?userOnly=1", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				let userOrders = [];
				if (resOrders.ok) userOrders = await resOrders.json();
				// If admin, fetch stats and all orders
				if (ADMIN_EMAILS.includes(dataProfile.email as string)) {
					const resAllUsers = await fetch("/api/users", {
						headers: { Authorization: `Bearer ${idToken}` },
					});
					const allUsers = await resAllUsers.json();
					const resAllOrders = await fetch("/api/orders", {
						headers: { Authorization: `Bearer ${idToken}` },
					});
					const allOrders = await resAllOrders.json();
					const resAllPayments = await fetch("/api/payments", {
						headers: { Authorization: `Bearer ${idToken}` },
					});
					const allPayments = await resAllPayments.json();
					setStats({
						totalUsers: allUsers.length,
						totalOrders: allOrders.length,
						totalSales: (allPayments as Array<Record<string, unknown>>).reduce(
							(sum, p) => sum + (typeof p.amount === "number" ? p.amount : 0),
							0
						),
						pendingOrders: (allOrders as Array<Record<string, unknown>>).filter(
							(o) => o.status === "pending"
						).length,
					});
					setOrders(allOrders);
				} else {
					setOrders(userOrders);
				}
				// Fetch payments
				const resPayments = await fetch("/api/payments", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (resPayments.ok) setPayments(await resPayments.json());
				setLoading(false);
			} else {
				router.replace("/login");
			}
		});
		return () => unsubscribe();
	}, [router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				Loading dashboard...
			</div>
		);
	}
	return (
		<main className="flex-1 min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<section className="flex-1 p-2 sm:p-4 md:p-6 w-full container max-w-8xl mx-auto">
				{/* Dashboard Title */}
				<h1 className="text-3xl sm:text-4xl font-extrabold text-pink-800 mb-4 sm:mb-6 md:mb-8 text-center">
					Admin Dashboard
				</h1>
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-3 sm:p-4 md:p-6 flex flex-col items-center">
						<FaUsers className="text-pink-600 text-2xl sm:text-3xl mb-1 sm:mb-2" />
						<span className="text-base sm:text-lg font-bold text-pink-800">
							Total Users
						</span>
						<span className="text-lg sm:text-2xl text-pink-800 font-extrabold">
							{stats.totalUsers ?? "-"}
						</span>
					</div>
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-3 sm:p-4 md:p-6 flex flex-col items-center">
						<FaBoxOpen className="text-pink-600 text-2xl sm:text-3xl mb-1 sm:mb-2" />
						<span className="text-base sm:text-lg font-bold text-pink-800">
							Total Orders
						</span>
						<span className="text-lg sm:text-2xl text-pink-800 font-extrabold">
							{stats.totalOrders ?? "-"}
						</span>
					</div>
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-3 sm:p-4 md:p-6 flex flex-col items-center">
						<FaCreditCard className="text-pink-600 text-2xl sm:text-3xl mb-1 sm:mb-2" />
						<span className="text-base sm:text-lg font-bold text-pink-800">
							Total Sales
						</span>
						<span className="text-lg sm:text-2xl text-pink-800 font-extrabold">
							Ksh{" "}
							{typeof stats.totalSales === "number"
								? stats.totalSales.toLocaleString()
								: "-"}
						</span>
					</div>
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-3 sm:p-4 md:p-6 flex flex-col items-center">
						<FaCheckCircle className="text-pink-600 text-2xl sm:text-3xl mb-1 sm:mb-2" />
						<span className="text-base sm:text-lg font-bold text-pink-800">
							Pending Orders
						</span>
						<span className="text-lg sm:text-2xl text-pink-800 font-extrabold">
							{stats.pendingOrders ?? "-"}
						</span>
					</div>
				</div>
				{/* Quick Actions */}
				<h2 className="text-xl sm:text-2xl font-bold text-pink-700 mb-2 sm:mb-4">
					Quick Actions
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
					<a
						href="/dashboard/admin/add-product"
						className="bg-pink-100 rounded-2xl shadow-xl border-2 border-pink-300 p-4 sm:p-6 md:p-8 flex flex-col items-center hover:shadow-2xl transition"
					>
						<FaPlus className="text-pink-600 text-2xl sm:text-4xl mb-2 sm:mb-4" />
						<span className="text-lg sm:text-xl font-bold text-pink-700 mb-1 sm:mb-2">
							Add Product
						</span>
						<span className="text-gray-700 text-center text-xs sm:text-sm">
							Add new lipstick or beauty products to the shop.
						</span>
					</a>
					<a
						href="/dashboard/admin/approve-orders"
						className="bg-pink-100 rounded-2xl shadow-xl border-2 border-pink-300 p-4 sm:p-6 md:p-8 flex flex-col items-center hover:shadow-2xl transition"
					>
						<FaCheckCircle className="text-pink-600 text-2xl sm:text-4xl mb-2 sm:mb-4" />
						<span className="text-lg sm:text-xl font-bold text-pink-700 mb-1 sm:mb-2">
							Approve Orders
						</span>
						<span className="text-gray-700 text-center text-xs sm:text-sm">
							Review and approve pending customer orders.
						</span>
					</a>
					<a
						href="/dashboard/admin/products"
						className="bg-pink-100 rounded-2xl shadow-xl border-2 border-pink-300 p-4 sm:p-6 md:p-8 flex flex-col items-center hover:shadow-2xl transition"
					>
						<FaBoxes className="text-pink-600 text-2xl sm:text-4xl mb-2 sm:mb-4" />
						<span className="text-lg sm:text-xl font-bold text-pink-700 mb-1 sm:mb-2">
							Manage Products
						</span>
						<span className="text-gray-700 text-center text-xs sm:text-sm">
							Edit or remove existing products from the shop.
						</span>
					</a>
					<a
						href="/dashboard/admin/users"
						className="bg-pink-100 rounded-2xl shadow-xl border-2 border-pink-300 p-4 sm:p-6 md:p-8 flex flex-col items-center hover:shadow-2xl transition"
					>
						<FaUsers className="text-pink-600 text-2xl sm:text-4xl mb-2 sm:mb-4" />
						<span className="text-lg sm:text-xl font-bold text-pink-700 mb-1 sm:mb-2">
							User Management
						</span>
						<span className="text-gray-700 text-center text-xs sm:text-sm">
							View and manage all users and their roles.
						</span>
					</a>
					<a
						href="/dashboard/admin/payments"
						className="bg-pink-100 rounded-2xl shadow-xl border-2 border-pink-300 p-4 sm:p-6 md:p-8 flex flex-col items-center hover:shadow-2xl transition"
					>
						<FaCreditCard className="text-pink-600 text-2xl sm:text-4xl mb-2 sm:mb-4" />
						<span className="text-lg sm:text-xl font-bold text-pink-700 mb-1 sm:mb-2">
							Payments
						</span>
						<span className="text-gray-700 text-center text-xs sm:text-sm">
							View and manage all payments made on the platform.
						</span>
					</a>
				</div>
				{/* Tables Row: Recent Orders & Recent Payments */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
					{/* Recent Orders Table */}
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-4 sm:p-6 md:p-8 flex flex-col">
						<h2 className="text-2xl font-bold text-pink-700 mb-4">
							Recent Orders
						</h2>
						<Table
							columns={[
								{
									title: (
										<span className="text-pink-700 font-bold">Order #</span>
									),
									dataIndex: "orderId",
									key: "orderId",
									render: (v: string | number | undefined) => (
										<span className="font-semibold text-black">
											{v ? v : "-"}
										</span>
									),
								},
								{
									title: <span className="text-pink-700 font-bold">Total</span>,
									dataIndex: "total",
									key: "total",
									render: (v: string | number | undefined) => (
										<span className="font-bold text-black">
											Ksh {typeof v === "number" ? v.toLocaleString() : "-"}
										</span>
									),
								},
								{
									title: (
										<span className="text-pink-700 font-bold">Status</span>
									),
									dataIndex: "status",
									key: "status",
									render: (v: string | number | undefined) => (
										<span
											className={
												v === "approved"
													? "text-green-600 font-semibold"
													: "text-black font-semibold"
											}
										>
											{v}
										</span>
									),
								},
								{
									title: "",
									key: "view",
									render: (record: Record<string, unknown>) => (
										<a
											href={`/dashboard/admin/orders/${record.orderId}`}
											className="text-pink-600 font-bold underline hover:text-pink-800 transition"
										>
											View
										</a>
									),
								},
							]}
							dataSource={Array.isArray(orders) ? orders.slice(0, 5) : []}
							pagination={false}
							rowKey="orderId"
							className="rounded-xl overflow-hidden border border-pink-100"
						/>
					</div>
					{/* Recent Payments Table */}
					<div className="bg-white rounded-2xl shadow-2xl border-2 border-pink-200 p-4 sm:p-6 md:p-8 flex flex-col">
						<h2 className="text-2xl font-bold text-pink-700 mb-4">
							Recent Payments
						</h2>
						<Table
							columns={[
								{
									title: (
										<span className="text-pink-700 font-bold">Payment #</span>
									),
									dataIndex: "paymentId",
									key: "paymentId",
									render: (v: string | number | undefined) => (
										<span className="font-semibold text-black">{v}</span>
									),
								},
								{
									title: (
										<span className="text-pink-700 font-bold">Amount</span>
									),
									dataIndex: "amount",
									key: "amount",
									render: (v: string | number | undefined) => (
										<span className="font-bold text-black">
											Ksh {typeof v === "number" ? v.toLocaleString() : "-"}
										</span>
									),
								},
								{
									title: (
										<span className="text-pink-700 font-bold">Status</span>
									),
									dataIndex: "status",
									key: "status",
									render: (v: string | number | undefined) => (
										<span
											className={
												v === "completed"
													? "text-green-600 font-semibold"
													: "text-black font-semibold"
											}
										>
											{v}
										</span>
									),
								},
								{
									title: "",
									key: "view",
									render: (record: Record<string, unknown>) => (
										<a
											href={`/dashboard/payment/${record.paymentId}`}
											className="text-pink-600 font-bold underline hover:text-pink-800 transition"
										>
											View
										</a>
									),
								},
							]}
							dataSource={Array.isArray(payments) ? payments.slice(0, 5) : []}
							pagination={false}
							rowKey="paymentId"
							className="rounded-xl overflow-hidden border border-pink-100"
						/>
					</div>
				</div>
			</section>
		</main>
	);
}
