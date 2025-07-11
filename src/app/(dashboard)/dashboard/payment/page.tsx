"use client";
import { Table, Empty } from "antd";
import "antd/dist/reset.css";
import { FaCreditCard } from "react-icons/fa";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

const columns = [
	{
		title: "Payment #",
		dataIndex: "paymentId",
		key: "paymentId",
	},
	{
		title: "Date",
		dataIndex: "createdAt",
		key: "createdAt",
		render: (value: string) => {
			if (!value) return "-";
			const date = new Date(value);
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
		},
	},
	{
		title: "Subtotal",
		dataIndex: "subtotal",
		key: "subtotal",
		render: (value: number) =>
			value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
	},
	{
		title: "VAT",
		dataIndex: "vat",
		key: "vat",
		render: (value: number) =>
			value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
	},
	{
		title: "Delivery Fee",
		dataIndex: "deliveryFee",
		key: "deliveryFee",
		render: (value: number) =>
			value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
	},
	{
		title: "Total",
		dataIndex: "amount",
		key: "amount",
		render: (value: number) =>
			value !== undefined ? `Ksh ${value.toLocaleString()}` : "-",
	},
	{
		title: "Status",
		dataIndex: "status",
		key: "status",
	},
	{
		title: "Transaction Ref",
		dataIndex: "transactionRef",
		key: "transactionRef",
	},
	{
		title: "Phone Number",
		dataIndex: "phoneNumber",
		key: "phoneNumber",
	},
	{
		title: "Paystack Ref",
		dataIndex: "paystackRef",
		key: "paystackRef",
	},
];

interface PaymentItem {
	paymentId: string;
	createdAt: string;
	amount: number;
	status: string;
	transactionRef?: string;
	subtotal?: number;
	vat?: number;
	deliveryFee?: number;
	phoneNumber?: string;
	deliveryLocation?: string;
	paystackRef?: string;
}

export default function PaymentPage() {
	const [data, setData] = useState<PaymentItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		async function fetchPayments() {
			try {
				const auth = getAuth();
				const user = auth.currentUser;
				if (!user) {
					setError("Please login to view your payments.");
					setLoading(false);
					return;
				}
				const idToken = await user.getIdToken();
				const res = await fetch("/api/payments", {
					headers: { Authorization: `Bearer ${idToken}` },
				});
				if (!res.ok) {
					const data = await res.json();
					throw new Error(
						data.error || data.message || "Failed to fetch payments"
					);
				}
				let payments = await res.json();
				// Sort by createdAt descending
				payments.sort(
					(a: any, b: any) =>
						new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				);
				setData(payments);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Error fetching payments"
				);
			} finally {
				setLoading(false);
			}
		}
		fetchPayments();
	}, []);

	return (
		<div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
			<div className="w-full container max-w-8xl mx-auto pt-12 px-4">
				<div className="flex flex-col items-center mb-8">
					<span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-pink-200 via-pink-100 to-rose-100 shadow-lg mb-4">
						<FaCreditCard className="text-pink-400 text-4xl" />
					</span>
					<h2 className="text-3xl font-extrabold text-pink-600 mb-1 tracking-tight">
						Payments
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
								dataSource={data}
								pagination={false}
								loading={loading}
								locale={{
									emptyText: (
										<Empty
											image={Empty.PRESENTED_IMAGE_SIMPLE}
											description={
												<span className="text-gray-500 text-lg">
													No payments yet. Payments will appear here!
												</span>
											}
										/>
									),
								}}
								rowKey="paymentId"
								className="rounded-xl overflow-hidden min-w-[600px]"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
