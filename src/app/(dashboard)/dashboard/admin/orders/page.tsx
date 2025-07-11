"use client";
import {
	Table,
	Empty,
	Space,
	Avatar,
	message,
	Modal,
	Card,
	Descriptions,
} from "antd";
import "antd/dist/reset.css";
import { useEffect, useState } from "react";
import type { GlobalOrder, User, Product } from "../../../../types/models";
import { getAuth } from "firebase/auth";
import Image from "next/image";

const getUserColumns = (
	onApprove: (orderId: string) => void,
	approvingOrderId: string | null
) => [
	{
		title: "Order #",
		dataIndex: "orderId",
		key: "orderId",
	},
	{
		title: "User",
		dataIndex: "userId",
		key: "userId",
		render: (
			userId: string,
			_record: GlobalOrder,
			_idx: number,
			users: User[]
		) => {
			const user = users.find((u) => u.uid === userId);
			if (!user) return <span className="text-gray-400">Unknown</span>;
			return (
				<Space>
					<span className="inline-block w-12 h-12 relative">
						<Image
							src={user.photoURL || "/ar-lipstick-logo.svg"}
							alt={user.displayName || user.email}
							width={48}
							height={48}
							className="rounded-full object-cover border border-pink-200 bg-white"
						/>
					</span>
					<div>
						<div className="font-semibold">
							{user.displayName || user.email}
						</div>
						<div className="text-xs text-gray-500">{user.email}</div>
					</div>
				</Space>
			);
		},
	},
	{
		title: "Total",
		dataIndex: "total",
		key: "total",
		render: (v: number) => `Ksh ${v.toLocaleString()}`,
	},
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
		render: (status: string) => (
			<span className="capitalize font-semibold text-pink-600">{status}</span>
		),
	},
	{
		title: "Created At",
		dataIndex: "createdAt",
		key: "createdAt",
		render: (v: string) => formatDate(v),
	},
	{
		title: "Actions",
		key: "actions",
		render: (_: any, record: GlobalOrder) => {
			if (record.status === "approved" || record.status === "delivered") {
				return <span className="text-green-600 font-semibold">Approved</span>;
			}
			return (
				<button
					className={`px-4 py-2 rounded-full font-semibold text-white transition shadow ${
						approvingOrderId === record.orderId
							? "bg-gray-400"
							: "bg-green-500 hover:bg-green-600"
					}`}
					disabled={approvingOrderId === record.orderId}
					onClick={() => onApprove(record.orderId)}
				>
					{approvingOrderId === record.orderId ? "Approving..." : "Approve"}
				</button>
			);
		},
	},
];

function formatDate(dateString: string) {
	const date = new Date(dateString);
	const day = date.getDate();
	const month = date.toLocaleString("default", { month: "long" });
	const year = date.getFullYear();
	// Get ordinal suffix
	const j = day % 10,
		k = day % 100;
	let suffix = "th";
	if (j === 1 && k !== 11) suffix = "st";
	else if (j === 2 && k !== 12) suffix = "nd";
	else if (j === 3 && k !== 13) suffix = "rd";
	return `${day}${suffix} ${month}, ${year}`;
}

const getProductColumns = () => [
	{
		title: "Image",
		dataIndex: "imageUrl",
		key: "imageUrl",
		render: (url: string, record: any) =>
			url ? (
				<Image
					src={url}
					alt={record.name}
					width={32}
					height={32}
					className="rounded-full border border-pink-200"
				/>
			) : null,
	},
	{
		title: "Product Name",
		dataIndex: "name",
		key: "name",
	},
	{
		title: "Quantity",
		dataIndex: "quantity",
		key: "quantity",
	},
	{
		title: "Price",
		dataIndex: "priceAtPurchase",
		key: "priceAtPurchase",
		render: (v: number) => `Ksh ${v}`,
	},
];

export default function AdminOrdersPage() {
	const [orders, setOrders] = useState<GlobalOrder[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
	const [viewOrder, setViewOrder] = useState<GlobalOrder | null>(null);
	const [viewModalOpen, setViewModalOpen] = useState(false);
	const [modalWidth, setModalWidth] = useState(600);

	useEffect(() => {
		setModalWidth(Math.min(window.innerWidth - 32, 600));
	}, []);

	useEffect(() => {
		async function fetchAll() {
			setLoading(true);
			try {
				// Fetch orders
				const ordersRes = await fetch("/api/orders");
				if (!ordersRes.ok) throw new Error("Failed to fetch orders");
				const ordersData = await ordersRes.json();
				// Sort by createdAt descending
				ordersData.sort(
					(a: any, b: any) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				setOrders(ordersData);
				// Fetch users with idToken
				const auth = getAuth();
				const user = auth.currentUser;
				let usersData: User[] = [];
				if (user) {
					const idToken = await user.getIdToken();
					const userRes = await fetch("/api/users", {
						headers: { Authorization: `Bearer ${idToken}` },
					});
					if (userRes.ok) {
						usersData = await userRes.json();
						setUsers(usersData);
					}
				}
				// Fetch products
				const prodRes = await fetch("/api/products");
				if (prodRes.ok) {
					const prodData = await prodRes.json();
					setProducts(prodData);
				}
			} catch (err: unknown) {
				if (err instanceof Error) setError(err.message);
				else setError("Error fetching data");
			} finally {
				setLoading(false);
			}
		}
		fetchAll();
	}, []);

	// Helper to merge product info into order items
	function getOrderItemsWithProductInfo(order: GlobalOrder) {
		return order.items.map((item) => {
			const prod = products.find((p) => p.id === item.productId);
			return {
				...item,
				name: prod?.name || item.name || item.productId,
				imageUrl: prod?.imageUrl || item.imageUrl,
			};
		});
	}

	async function handleApprove(orderId: string) {
		setApprovingOrderId(orderId);
		try {
			const res = await fetch(`/api/orders/${orderId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "approved" }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(
					data.error || data.message || "Failed to approve order"
				);
			}
			message.success("Order approved!");
			// Refresh orders
			const ordersRes = await fetch("/api/orders");
			if (ordersRes.ok) {
				const ordersData = await ordersRes.json();
				// Sort by createdAt descending
				ordersData.sort(
					(a: any, b: any) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				setOrders(ordersData);
			}
		} catch (err: unknown) {
			message.error(
				err instanceof Error ? err.message : "Failed to approve order"
			);
		} finally {
			setApprovingOrderId(null);
		}
	}

	function handleViewOrder(order: GlobalOrder) {
		setViewOrder(order);
		setViewModalOpen(true);
	}

	function renderOrderDetails(order: GlobalOrder) {
		return (
			<div>
				<h2 className="text-2xl font-bold text-pink-600 mb-4">Order Details</h2>
				<Card bordered={false} className="mb-6 bg-pink-50/50">
					<Descriptions
						column={1}
						labelStyle={{ fontWeight: 600, color: "#be185d" }}
					>
						<Descriptions.Item label="Order #">
							{order.orderId}
						</Descriptions.Item>
						<Descriptions.Item label="Date">
							{formatDate(order.createdAt)}
						</Descriptions.Item>
						<Descriptions.Item label="Status">
							<span className="capitalize font-semibold text-pink-600">
								{order.status}
							</span>
						</Descriptions.Item>
						<Descriptions.Item label="Subtotal">
							Ksh {order.subtotal?.toLocaleString()}
						</Descriptions.Item>
						<Descriptions.Item label="VAT">
							Ksh {order.vat?.toLocaleString()}
						</Descriptions.Item>
						<Descriptions.Item label="Delivery Fee">
							Ksh {order.deliveryFee?.toLocaleString()}
						</Descriptions.Item>
						<Descriptions.Item label="Total">
							<span className="font-bold text-lg">
								Ksh {order.total?.toLocaleString()}
							</span>
						</Descriptions.Item>
						<Descriptions.Item label="Delivery">
							{order.deliveryLocation}
						</Descriptions.Item>
						<Descriptions.Item label="Phone">
							{order.phoneNumber}
						</Descriptions.Item>
						<Descriptions.Item label="Paystack Ref">
							{order.paystackRef}
						</Descriptions.Item>
					</Descriptions>
				</Card>
				<h3 className="text-lg font-semibold text-pink-500 mb-2">Items:</h3>
				<Table
					columns={getProductColumns()}
					dataSource={getOrderItemsWithProductInfo(order)}
					pagination={false}
					rowKey="productId"
					size="small"
				/>
			</div>
		);
	}

	// Custom render for user column to pass users array
	const columns = getUserColumns(handleApprove, approvingOrderId).map((col) =>
		col.key === "userId"
			? {
					...col,
					render: (userId: string, record: GlobalOrder) => {
						const user = users?.find((u) => u.uid === userId);
						if (!user) return <span className="text-gray-400">Unknown</span>;
						return (
							<Space>
								<span className="inline-block w-12 h-12 relative">
									<Image
										src={user.photoURL || "/ar-lipstick-logo.svg"}
										alt={user.displayName || user.email}
										width={48}
										height={48}
										className="rounded-full object-cover border border-pink-200 bg-white"
									/>
								</span>
								<div>
									<div className="font-semibold">
										{user.displayName || user.email}
									</div>
									<div className="text-xs text-gray-500">{user.email}</div>
								</div>
							</Space>
						);
					},
			  }
			: col
	);

	// Add View button column
	const columnsWithView = [
		...columns,
		{
			title: "",
			key: "view",
			render: (_: any, record: GlobalOrder) => (
				<button
					className="px-4 py-2 rounded-full font-semibold text-white bg-pink-500 hover:bg-pink-600 transition"
					onClick={() => handleViewOrder(record)}
				>
					View
				</button>
			),
		},
	];

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full max-w-7xl mx-auto pt-4 sm:pt-8 px-2 sm:px-4 md:px-6">
				<h1 className="text-2xl sm:text-3xl font-extrabold text-pink-700 mb-4 sm:mb-6 md:mb-8">
					Manage Orders
				</h1>
				<div className="w-full bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-3 sm:p-4 md:p-6">
					{loading ? (
						<div className="flex justify-center items-center py-8 sm:py-12">
							<span className="text-pink-600 text-lg">Loading...</span>
						</div>
					) : error ? (
						<div className="text-red-500 text-center py-6 sm:py-8">{error}</div>
					) : (
						<Table
							columns={columnsWithView}
							dataSource={orders}
							pagination={false}
							rowKey="orderId"
							locale={{
								emptyText: (
									<Empty
										image={Empty.PRESENTED_IMAGE_SIMPLE}
										description={
											<span className="text-gray-500 text-base sm:text-lg">
												No orders found.
											</span>
										}
									/>
								),
							}}
							className="rounded-xl overflow-hidden"
							scroll={{ x: true }}
						/>
					)}
				</div>
				{/* Order Details Modal */}
				<Modal
					open={viewModalOpen}
					onCancel={() => setViewModalOpen(false)}
					footer={null}
					width={modalWidth}
					bodyStyle={{ padding: "1rem" }}
				>
					{viewOrder && (
						<Card className="rounded-2xl shadow border border-pink-100 p-2 sm:p-4">
							<h2 className="text-lg sm:text-xl font-bold text-pink-700 mb-2">
								Order Details
							</h2>
							<Descriptions
								column={1}
								labelStyle={{ fontWeight: 600, color: "#be185d" }}
								contentStyle={{ color: "#333" }}
								className="mb-2"
							>
								<Descriptions.Item label="Order #">
									{viewOrder.orderId}
								</Descriptions.Item>
								<Descriptions.Item label="User">
									{users?.find((u) => u.uid === viewOrder.userId)
										?.displayName || viewOrder.userId}
								</Descriptions.Item>
								<Descriptions.Item label="Total">
									Ksh {viewOrder.total.toLocaleString()}
								</Descriptions.Item>
								<Descriptions.Item label="Status">
									<span className="capitalize font-semibold text-pink-600">
										{viewOrder.status}
									</span>
								</Descriptions.Item>
								<Descriptions.Item label="Created At">
									{formatDate(viewOrder.createdAt)}
								</Descriptions.Item>
							</Descriptions>
							<Table
								columns={getProductColumns()}
								dataSource={getOrderItemsWithProductInfo(viewOrder)}
								pagination={false}
								rowKey={(r) => r.productId}
								className="rounded-xl overflow-hidden mt-2"
								scroll={{ x: true }}
							/>
						</Card>
					)}
				</Modal>
			</div>
		</div>
	);
}
