"use client";
import { Table, Modal, Card, Descriptions, Badge } from "antd";
import "antd/dist/reset.css";
import { FaBoxOpen } from "react-icons/fa";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import Image from "next/image";
import type { GlobalOrder, Product } from "@/app/types/models";

function formatDate(dateString: string) {
	const date = new Date(dateString);
	const day = date.getDate();
	const month = date.toLocaleString("default", { month: "long" });
	const year = date.getFullYear();
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
		render: (url: string, record: { name?: string }) =>
			url ? (
				<Image
					src={url}
					alt={record.name as string}
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

const columns = [
	{
		title: "Order #",
		dataIndex: "orderId",
		key: "orderId",
	},
	{
		title: "Date",
		dataIndex: "createdAt",
		key: "createdAt",
		render: (value: string) => formatDate(value),
	},
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
		render: (status: string) => (
			<Badge
				status={status === "paid" ? "success" : "default"}
				text={
					status === "paid"
						? "Paid"
						: status.charAt(0).toUpperCase() + status.slice(1)
				}
			/>
		),
	},
	{
		title: "Total",
		dataIndex: "total",
		key: "total",
		render: (value: number) => `Ksh ${value.toLocaleString()}`,
	},
	{
		title: "Paystack Ref",
		dataIndex: "paystackRef",
		key: "paystackRef",
	},
];

function getOrderItemsWithProductInfo(order: GlobalOrder, products: Product[]) {
	return order.items.map((item) => {
		const prod = products.find((p) => p.id === item.productId);
		return {
			...item,
			name: prod?.name || item.name || item.productId,
			imageUrl: prod?.imageUrl || item.imageUrl,
		};
	});
}

export default function OrdersPage() {
	const [orders, setOrders] = useState<GlobalOrder[]>([]);
	const [error, setError] = useState("");
	const [products, setProducts] = useState<Product[]>([]);
	const [viewModalOpen, setViewModalOpen] = useState(false);

	useEffect(() => {
		async function fetchOrders() {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) {
					setError("Please login to view your orders.");
					return;
				}
				const idToken = await user.getIdToken();
				const res = await fetch("/api/orders?userOnly=1", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(
						data.error || data.message || "Failed to fetch orders"
					);
				}
				const orders = await res.json();
				// Sort by createdAt descending
				orders.sort(
					(a: GlobalOrder, b: GlobalOrder) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				setOrders(orders);
				// Fetch products for item info
				const prodRes = await fetch("/api/products");
				if (prodRes.ok) {
					setProducts(await prodRes.json());
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error fetching orders");
			}
		}
		fetchOrders();
	}, []);

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
							<Badge
								status={order.status === "paid" ? "success" : "default"}
								text={
									order.status === "paid"
										? "Paid"
										: order.status.charAt(0).toUpperCase() +
										  order.status.slice(1)
								}
							/>
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
					dataSource={getOrderItemsWithProductInfo(order, products)}
					pagination={false}
					rowKey="productId"
					size="small"
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full max-w-7xl mx-auto pt-12 px-4">
				<div className="flex flex-col items-center mb-8">
					<span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-pink-200 via-pink-100 to-rose-100 shadow-lg mb-4">
						<FaBoxOpen className="text-pink-400 text-4xl" />
					</span>
					<h2 className="text-3xl font-extrabold text-pink-600 mb-1 tracking-tight">
						Your Order History
					</h2>
				</div>
				<div className="w-full bg-white/90 rounded-3xl shadow-2xl border border-pink-100 p-6">
					{error ? (
						<div className="text-center py-8 text-lg text-red-500 font-semibold">
							{error}
						</div>
					) : (
						<div className="w-full overflow-x-auto">
							<Table
								columns={columns}
								dataSource={orders}
								pagination={false}
								rowKey="orderId"
								className="rounded-xl overflow-hidden min-w-[700px]"
								scroll={{ x: true }}
							/>
						</div>
					)}
					<Modal
						open={viewModalOpen}
						onCancel={() => setViewModalOpen(false)}
						footer={null}
						title="Order Details"
						width={700}
					>
						{viewModalOpen &&
							renderOrderDetails(viewModalOpen as unknown as GlobalOrder)}
					</Modal>
				</div>
			</div>
		</div>
	);
}
